import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { NovaFileProcessor } from "@/utils/NovaFileProcessor";
import { NovaPDF } from "@/utils/NovaPDF";
import { NovaOffice } from "@/utils/NovaOffice";
import { NovaImage } from "@/utils/NovaImage";
import { useSubscription } from "@/hooks/useSubscription";

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

export type ProgressState = 'idle' | 'extracting' | 'processing' | 'complete' | 'error';

export const useFileImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceTextContent, setSourceTextContent] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Subscription check for file limits
  const { isPremium } = useSubscription();

  // Progress State
  const [progressState, setProgressState] = useState<ProgressState>('idle');
  const [progressMessage, setProgressMessage] = useState<string>("");

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

    // Calculate limit dynamically to ensure we use the latest isPremium value
    const MAX_FILE_SIZE_MB = isPremium ? 100 : 10;

    // Dynamic Size Check
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const upgradeMsg = !isPremium ? " Upgrade to Pro for 100MB uploads." : "";
      throw new Error(`File too large. Limit is ${MAX_FILE_SIZE_MB}MB.${upgradeMsg}`);
    }

    if (selectedFile.type === "application/pdf") {
      try {
        setProgressMessage("Extracting text from PDF...");
        extractedFileContent = await NovaPDF.extractText(selectedFile, setProgressMessage);
      } catch (pdfError) {
        console.error("Error parsing PDF:", pdfError);
        throw new Error("Failed to parse PDF file. It might be corrupted or unsupported.");
      }
    } else if (
      selectedFile.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      selectedFile.name.endsWith('.pptx')
    ) {
      try {
        setProgressMessage("Extracting content from Slides (PPTX)...");
        extractedFileContent = await NovaOffice.extractTextFromPptx(selectedFile);
      } catch (error) {
        console.error("Error parsing PPTX:", error);
        throw new Error("Failed to parse PowerPoint file.");
      }
    } else if (
      selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      selectedFile.name.endsWith('.docx')
    ) {
      try {
        setProgressMessage("Extracting text from Document (DOCX)...");
        extractedFileContent = await NovaOffice.extractTextFromDocx(selectedFile);
      } catch (error) {
        console.error("Error parsing DOCX:", error);
        throw new Error("Failed to parse Word document.");
      }
    } else if (selectedFile.type.startsWith("image/")) {
      try {
        setProgressMessage("Nova is reading the image (OCR)...");
        extractedFileContent = await NovaImage.extractText(selectedFile);
      } catch (error) {
        console.error("Error performing OCR:", error);
        throw new Error("Failed to read text from image. Make sure the text is clear.");
      }
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
      throw new Error(`Unsupported file type: ${selectedFile.type}. Please use .pdf, .pptx, .docx, images, or code files.`);
    }

    if (!extractedFileContent.trim()) {
      throw new Error("Could not extract any meaningful text from the file. Please ensure the file contains readable content.");
    }
    return { extractedFileContent };
  }, [isPremium]);

  const callAIProcessFile = useCallback(async (
    textContent: string,
    mode: 'estimate' | 'generate'
  ): Promise<ProcessedAIData | EstimationResult | null> => {
    if (!currentUser) {
      throw new Error("You must be logged in to use AI features.");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Session not found. Please try logging in again.");
    }

    let result;

    if (mode === 'estimate') {
      const count = NovaFileProcessor.estimateCardCount(textContent);
      result = { optimal_max_cards: count };
    } else {
      const processed = await NovaFileProcessor.processWithAI(textContent);

      result = {
        cards: processed.cards,
        concepts: processed.concepts,
        optimal_max_cards: processed.cards.length
      };
    }

    return result;
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

    setProgressState('extracting');
    setProgressMessage("Reading file...");

    try {
      const { extractedFileContent } = await extractFileContent(file);
      setSourceTextContent(extractedFileContent);

      setProgressState('processing');
      setProgressMessage("Estimating content size...");

      const result = await callAIProcessFile(extractedFileContent, 'estimate') as EstimationResult;

      setProgressState('idle');
      setProgressMessage("");
      return result.optimal_max_cards;
    } catch (error: any) {
      setProgressState('error');
      setProgressMessage(error.message || "Error during estimation");
      showError(error.message || "An unexpected error occurred during estimation.");
      console.error(error);
      return null;
    }
  }, [file, currentUser, extractFileContent, callAIProcessFile, isPremium]);

  const generateCardsAndConcepts = useCallback(async (): Promise<ProcessedAIData | null> => {
    if (!file) {
      showError("Please select a file first.");
      return null;
    }
    if (!currentUser) {
      showError("You must be logged in to use AI features.");
      return null;
    }

    setProgressState('extracting');
    setProgressMessage("Extracting text from file...");

    try {
      let textToProcess = sourceTextContent;

      if (!textToProcess) {
        console.log("📝 Auto-extracting text from file...");
        const { extractedFileContent } = await extractFileContent(file);
        textToProcess = extractedFileContent;
        setSourceTextContent(extractedFileContent);
      }

      setProgressState('processing');
      setProgressMessage("Nova AI is analyzing content & generating flashcards...");

      const isLargeFile = file && file.size > 10 * 1024 * 1024; // > 10MB
      let data: ProcessedAIData;

      if (isLargeFile && isPremium) {
        // Large File Strategy: Storage Upload -> Server-Side Processing
        console.log("📂 Large file detected. Switching to Server-Side Processing...");
        setProgressMessage("Uploading large file for enhanced processing...");

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from('temp-uploads')
          .upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        setProgressMessage("Nova AI is analyzing large document in the cloud...");

        // 2. Trigger Edge Function with File Path
        const { data: funcData, error: funcError } = await supabase.functions.invoke('process-file', {
          body: {
            filePath: fileName,
            bucketName: 'temp-uploads',
            mode: 'generate'
          }
        });

        if (funcError) throw new Error(`Processing failed: ${funcError.message}`);

        // 3. Cleanup (Delete file) - Optional, can be done by Edge Function or Bucket Policy
        await supabase.storage.from('temp-uploads').remove([fileName]);

        data = funcData;
      } else {
        // Standard Strategy: Client-Side Extraction -> AI
        const dataResponse = await callAIProcessFile(textToProcess, 'generate');
        if (!dataResponse) throw new Error("AI returned no data"); // Should be handled inside callAIProcessFile but adding check here
        data = dataResponse as ProcessedAIData;
      }

      const newCards = data.cards;
      const newConcepts = data.concepts;

      if (!newCards || newCards.length === 0) {
        showError("The AI couldn't find any terms and definitions in the file.");
        setProgressState('error');
        return null;
      }

      // Process concepts (upserting existing, inserting new)
      if (newConcepts && newConcepts.length > 0) {
        try {
          const { data: savedConcepts, error: conceptError } = await supabase.from('concepts').upsert(
            newConcepts.map(c => ({
              user_id: currentUser.id,
              name: c.name,
              description: c.description
            })),
            { onConflict: 'name,user_id', ignoreDuplicates: true }
          ).select('id, name');

          if (conceptError) {
            console.warn("Concept storage warning:", conceptError);
          } else {
            console.log("✅ Concepts saved successfully");

            // 2. Save Relationships (If available)
            if (data.relationships && data.relationships.length > 0 && savedConcepts) {
              // Fetch all concepts to ensure we have IDs for everyone (in case upsert didn't return duplicates)
              const { data: allConcepts } = await supabase
                .from('concepts')
                .select('id, name')
                .eq('user_id', currentUser.id);

              if (allConcepts) {
                const conceptMap = new Map(allConcepts.map(c => [c.name, c.id]));

                const validRelationships = data.relationships
                  .map(rel => ({
                    user_id: currentUser.id,
                    source_concept_id: conceptMap.get(rel.source_name),
                    target_concept_id: conceptMap.get(rel.target_name),
                    type: rel.type,
                    strength: rel.strength
                  }))
                  .filter(rel => rel.source_concept_id && rel.target_concept_id); // Only allow complete links

                if (validRelationships.length > 0) {
                  const { error: relError } = await supabase
                    .from('concept_relationships')
                    .insert(validRelationships);

                  if (relError) console.warn("Relationship storage error:", relError);
                  else console.log(`✅ Saved ${validRelationships.length} relationships`);
                }
              }
            }
          }
        } catch (conceptError) {
          console.warn("Concept processing skipped.", conceptError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });

      setProgressState('complete');
      setProgressMessage("Generation complete!");

      // Reset after a moment
      setTimeout(() => {
        setProgressState('idle');
        setProgressMessage("");
      }, 2000);

      return data;

    } catch (error: any) {
      setProgressState('error');

      // Check if this is a file size error
      if (error.message && error.message.includes('File too large')) {
        setProgressMessage(error.message);
        showError(error.message);
      } else {
        setProgressMessage("Error generating content.");
        showError(error.message || "An unexpected error occurred.");
      }

      console.error(error);
      return null;
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
    progressState,
    progressMessage
  };
};