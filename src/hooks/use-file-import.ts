import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showLoading, dismissToast } from "@/utils/toast";
import * as pdfjsLib from 'pdfjs-dist';
import { useQueryClient } from "@tanstack/react-query";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ProcessedAIData {
  cards: { term: string; definition: string }[];
  concepts: { name: string; description?: string }[];
  relationships: { source_name: string; target_name: string; type: string; strength?: number }[];
  card_concept_links: { card_term: string; concept_name: string }[];
  optimal_max_cards?: number;
}

interface EstimationResult {
  optimal_max_cards: number;
}

const MAX_FILE_SIZE_MB = 10; // Define a max file size

export const useFileImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceTextContent, setSourceTextContent] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  const extractFileContent = useCallback(async (selectedFile: File) => {
    let extractedFileContent = "";

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
    }

    if (selectedFile.type === "application/pdf") {
      const reader = new FileReader();
      reader.readAsArrayBuffer(selectedFile);
      await new Promise<void>((resolve, reject) => {
        reader.onload = async (e: ProgressEvent<FileReader>) => {
          try {
            const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdf = await loadingTask.promise;

            let pageTextPromises: Promise<string>[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              pageTextPromises.push(
                pdf.getPage(i).then((page: any) => page.getTextContent()).then((textContent: any) =>
                  textContent.items.map((item: any) => item.str).join(' ')
                )
              );
            }
            extractedFileContent = (await Promise.all(pageTextPromises)).join('\n');

            resolve();
          } catch (pdfError) {
            console.error("Error parsing PDF:", pdfError);
            reject(new Error("Failed to parse PDF file. It might be corrupted or unsupported."));
          }
        };
        reader.onerror = (err) => reject(err);
      });
    } else if (selectedFile.type.startsWith("text/") || 
               selectedFile.name.endsWith('.md') || 
               selectedFile.name.endsWith('.csv') ||
               selectedFile.name.endsWith('.json') ||
               selectedFile.name.endsWith('.xml') ||
               selectedFile.name.endsWith('.html') ||
               selectedFile.name.endsWith('.js') ||
               selectedFile.name.endsWith('.ts') ||
               selectedFile.name.endsWith('.css')
    ) {
        extractedFileContent = await selectedFile.text();
    } else {
        throw new Error(`Unsupported file type: ${selectedFile.type}. Please use .txt, .csv, .md, .json, .xml, .html, .js, .ts, .css, or .pdf.`);
    }

    if (!extractedFileContent.trim()) {
        throw new Error("Could not extract any meaningful text from the file. Please ensure the file contains readable content.");
    }
    return { extractedFileContent };
  }, []);

  const callAIProcessFile = useCallback(async (
    textContent: string,
    mode: 'estimate' | 'generate',
    numCards?: number
  ): Promise<ProcessedAIData | EstimationResult | null> => {
    if (!currentUser) {
      throw new Error("You must be logged in to use AI features.");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Session not found. Please try logging in again.");
    }

    const response = await fetch(
      `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/process-file`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          // Removed redundant 'apikey' header
        },
        body: JSON.stringify({ 
          textContent: textContent,
          numCards: numCards,
          mode: mode,
        }),
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || (data as any).error) {
      throw new Error((data as any)?.error || "Failed to process file with AI.");
    }
    return data;
  }, [currentUser]);

  const estimateOptimalCards = useCallback(async (): Promise<number | null> => {
    if (!file) {
      showError("Please select a file first to get an estimate.");
      return null;
    }
    if (!currentUser) {
      showError("You must be logged in to use AI features.");
      return null;
    }

    const toastId = showLoading("AI is estimating optimal card count...");
    try {
      const { extractedFileContent } = await extractFileContent(file);
      setSourceTextContent(extractedFileContent);

      const result = await callAIProcessFile(extractedFileContent, 'estimate') as EstimationResult;
      dismissToast(toastId);
      return result.optimal_max_cards;
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "An unexpected error occurred during estimation.");
      console.error(error);
      return null;
    }
  }, [file, currentUser, extractFileContent, callAIProcessFile]);

  const generateCardsAndConcepts = useCallback(async (numCardsToGenerate?: number): Promise<ProcessedAIData | null> => {
    if (!file || !sourceTextContent) {
      showError("No file or source content available for generation. Please select a file first.");
      return null;
    }
    if (!currentUser) {
      showError("You must be logged in to use AI features.");
      return null;
    }

    const toastId = showLoading("AI is generating your flashcards, concepts, and relationships...");
    try {
      const data = await callAIProcessFile(sourceTextContent, 'generate', numCardsToGenerate) as ProcessedAIData;

      const newCards = data.cards;
      const newConcepts = data.concepts;
      const newRelationships = data.relationships;

      if (!newCards || newCards.length === 0) {
        showError("The AI couldn't find any terms and definitions in the file.");
        return null;
      }

      // Process concepts (upserting existing, inserting new)
      if (newConcepts && newConcepts.length > 0) {
        const conceptNameToIdMap = new Map<string, string>();
        for (const concept of newConcepts) {
          const { data: existingConcept, error: fetchConceptError } = await supabase
            .from('concepts')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('name', concept.name)
            .single();

          if (fetchConceptError && fetchConceptError.code !== 'PGRST116') {
            console.error("Error fetching existing concept:", fetchConceptError);
            continue;
          }

          let conceptId: string;
          if (existingConcept) {
            conceptId = existingConcept.id;
          } else {
            const { data: insertedConcept, error: insertConceptError } = await supabase
              .from('concepts')
              .insert({ user_id: currentUser.id, name: concept.name, description: concept.description })
              .select('id')
              .single();
            if (insertConceptError) {
              console.error("Error inserting concept:", insertConceptError);
              continue;
            }
            conceptId = insertedConcept.id;
          }
          conceptNameToIdMap.set(concept.name, conceptId);
        }

        // Process relationships (upserting)
        if (newRelationships && newRelationships.length > 0) {
          const relationshipsToUpsert = [];
          for (const rel of newRelationships) {
            const sourceId = conceptNameToIdMap.get(rel.source_name);
            const targetId = conceptNameToIdMap.get(rel.target_name);
            if (sourceId && targetId) {
              relationshipsToUpsert.push({
                user_id: currentUser.id,
                source_concept_id: sourceId,
                target_concept_id: targetId,
                type: rel.type,
                strength: rel.strength || 0.5,
              });
            }
          }

          if (relationshipsToUpsert.length > 0) {
            const { error: insertRelError } = await supabase
              .from('concept_relationships')
              .upsert(relationshipsToUpsert, { onConflict: 'user_id,source_concept_id,target_concept_id,type' });
            if (insertRelError) {
              console.error("Error inserting relationships:", insertRelError);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
      return data;

    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
      console.error(error);
      return null;
    } finally {
      dismissToast(toastId);
    }
  }, [file, sourceTextContent, currentUser, queryClient, extractFileContent, callAIProcessFile]);

  return {
    file,
    setFile,
    sourceTextContent,
    setSourceTextContent,
    estimateOptimalCards,
    generateCardsAndConcepts,
    currentUser,
    isLoadingUser,
  };
};