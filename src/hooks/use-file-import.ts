import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import * as pdfjsLib from 'pdfjs-dist';
import { useQueryClient } from "@tanstack/react-query";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ProcessedAIData {
  cards: { term: string; definition: string }[];
  concepts: { name: string; description?: string }[];
  relationships: { source_name: string; target_name: string; type: string; strength?: number }[];
  optimal_max_cards?: number; // New field for AI's optimal card count
}

const MAX_FILE_SIZE_MB = 10; // Define a max file size
const MIN_MEANINGFUL_TEXT_LENGTH = 50; // Heuristic for "meaningful text"

export const useFileImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceTextContent, setSourceTextContent] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [optimalMaxCards, setOptimalMaxCards] = useState<number | null>(null); // State to store AI's optimal max cards
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  const handleFileImport = useCallback(async (numCardsToGenerate?: number): Promise<ProcessedAIData | null> => {
    if (!file) {
      showError("Please select a file first.");
      return null;
    }

    if (!currentUser) {
      showError("You must be logged in to import a file.");
      return null;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      return null;
    }

    const toastId = showLoading("AI is generating your flashcards, concepts, and relationships...");
    let extractedFileContent = "";
    let imageParts: { data: string; mimeType: string }[] = [];

    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        await new Promise<void>((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
              const loadingTask = pdfjsLib.getDocument({ data: pdfData });
              const pdf = await loadingTask.promise;

              // Attempt to extract text content directly
              let pageTextPromises: Promise<string>[] = [];
              for (let i = 1; i <= pdf.numPages; i++) {
                pageTextPromises.push(
                  pdf.getPage(i).then(page => page.getTextContent()).then(textContent =>
                    textContent.items.map((item: any) => item.str).join(' ')
                  )
                );
              }
              extractedFileContent = (await Promise.all(pageTextPromises)).join('\n');

              // If text extraction is poor, try image extraction (OCR)
              if (!extractedFileContent.trim() || extractedFileContent.trim().length < MIN_MEANINGFUL_TEXT_LENGTH) {
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const viewport = page.getViewport({ scale: 2 }); // Render at higher scale for better OCR
                  const canvas = document.createElement('canvas');
                  const canvasContext = canvas.getContext('2d');
                  
                  if (!canvasContext) { // Add null check here
                    console.error("Could not get 2D rendering context for canvas.");
                    continue; // Skip this page if context is not available
                  }

                  canvas.height = viewport.height;
                  canvas.width = viewport.width;

                  await page.render({ canvasContext, viewport }).promise;
                  imageParts.push({
                    data: canvas.toDataURL('image/png').split(',')[1], // Base64 data
                    mimeType: 'image/png',
                  });
                  canvas.remove(); // Clean up
                }
              }
              resolve();
            } catch (pdfError) {
              console.error("Error parsing PDF:", pdfError);
              reject(new Error("Failed to parse PDF file. It might be corrupted or unsupported."));
            }
          };
          reader.onerror = (err) => reject(err);
        });
      } else if (file.type.startsWith("text/") || 
                 file.name.endsWith('.md') || 
                 file.name.endsWith('.csv') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.xml') ||
                 file.name.endsWith('.html') ||
                 file.name.endsWith('.js') ||
                 file.name.endsWith('.ts') ||
                 file.name.endsWith('.css')
      ) {
          extractedFileContent = await file.text();
      } else {
          throw new Error(`Unsupported file type: ${file.type}. Please use .txt, .csv, .md, .json, .xml, .html, .js, .ts, .css, or .pdf.`);
      }

      if (!extractedFileContent.trim() && imageParts.length === 0) {
          throw new Error("Could not extract any meaningful text or images from the file. Please ensure the file contains readable content.");
      }

      setSourceTextContent(extractedFileContent); // Store original text content if any

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
            'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
          },
          body: JSON.stringify({ 
            textContent: extractedFileContent, // Send text content
            imageParts: imageParts, // Send image parts if any
            numCards: numCardsToGenerate, // Send desired number of cards
          }),
        }
      );
      
      const data: ProcessedAIData = await response.json();
      
      dismissToast(toastId);

      if (!response.ok || (data as any).error) { // Cast to any to check for error property
        throw new Error((data as any)?.error || "Failed to process file.");
      }
      
      const newCards = data.cards;
      const newConcepts = data.concepts;
      const newRelationships = data.relationships;
      setOptimalMaxCards(data.optimal_max_cards || null); // Store optimal max cards

      if (!newCards || newCards.length === 0) {
        showError("The AI couldn't find any terms and definitions in the file.");
        return null;
      }

      showSuccess(`${newCards.length} cards imported successfully!`);

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
          if (existingConcept) { // Corrected variable name
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

        if (newRelationships && newRelationships.length > 0) {
          const relationshipsToInsert = [];
          for (const rel of newRelationships) {
            const sourceId = conceptNameToIdMap.get(rel.source_name);
            const targetId = conceptNameToIdMap.get(rel.target_name);
            if (sourceId && targetId) {
              relationshipsToInsert.push({
                user_id: currentUser.id,
                source_concept_id: sourceId,
                target_concept_id: targetId,
                type: rel.type,
                strength: rel.strength || 0.5,
              });
            }
          }

          if (relationshipsToInsert.length > 0) {
            const { error: insertRelError } = await supabase
              .from('concept_relationships')
              .upsert(relationshipsToInsert, { onConflict: 'user_id,source_concept_id,target_concept_id,type' });
            if (insertRelError) {
              console.error("Error inserting relationships:", insertRelError);
            } else {
              showSuccess(`${relationshipsToInsert.length} relationships processed.`);
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
      }
      return data;

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "An unexpected error occurred.");
      console.error(error);
      return null;
    }
  }, [file, currentUser, queryClient]);

  return {
    file,
    setFile,
    sourceTextContent,
    setSourceTextContent,
    handleFileImport,
    currentUser,
    isLoadingUser,
    optimalMaxCards,
    setOptimalMaxCards,
  };
};