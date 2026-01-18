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

    // SERVER-SIDE VALIDATION (prevents bypassing client checks)
    if (currentUser) {
      const { data: validation, error: validationError } = await supabase.rpc('validate_file_upload', {
        p_user_id: currentUser.id,
        p_file_type: selectedFile.type || selectedFile.name,
        p_file_size: selectedFile.size
      });

      if (validationError) {
        console.error("Validation error:", validationError);
        throw new Error("Failed to validate file upload. Please try again.");
      }

      if (!validation.allowed) {
        throw new Error(validation.error);
      }
    }

    // CLIENT-SIDE CHECK (for immediate feedback, but server validates above)
    const MAX_FILE_SIZE_MB = isPremium ? 45 : 10;

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const upgradeMsg = !isPremium ? " Upgrade to Pro for 45MB uploads." : "";
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
      if (!isPremium) throw new Error("PowerPoint (`.pptx`) support is a Pro feature. Upgrade to unlock.");
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
      if (!isPremium) throw new Error("Word Document (`.docx`) support is a Pro feature. Upgrade to unlock.");
      try {
        setProgressMessage("Extracting text from Document (DOCX)...");
        extractedFileContent = await NovaOffice.extractTextFromDocx(selectedFile);
      } catch (error) {
        console.error("Error parsing DOCX:", error);
        throw new Error("Failed to parse Word document.");
      }
    } else if (selectedFile.type.startsWith("image/")) {
      if (!isPremium) throw new Error("Image-to-Flashcards is a Pro feature. Upgrade to unlock.");
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
      console.error("DEBUG: Extracted content is empty/whitespace.");
      throw new Error("Could not extract any meaningful text from the file. Please ensure the file contains readable content.");
    }
    console.log("DEBUG: Extraction successful. Content length:", extractedFileContent.length);
    return { extractedFileContent };
  }, [isPremium, currentUser, isPremium]);

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
      // Limit AI generation based on subscription tier
      const maxCards = isPremium ? 50 : 10;
      const processed = await NovaFileProcessor.processWithAI(textContent, maxCards);

      result = {
        cards: processed.cards,
        concepts: processed.concepts,
        relationships: processed.relationships || [],
        optimal_max_cards: processed.cards.length
      };
    }

    return result;
  }, [currentUser, isPremium]);

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
  }, [file, currentUser, extractFileContent, callAIProcessFile]);

  const generateCardsAndConcepts = useCallback(async (): Promise<ProcessedAIData | null> => {
    if (!file) {
      showError("Please select a file first.");
      return null;
    }
    if (!currentUser) {
      showError("You must be logged in to use AI features.");
      return null;
    }

    // IMMEDIATE SIZE CHECK FOR FREE USERS
    const MAX_FREE_SIZE = 10 * 1024 * 1024; // 10MB
    if (!isPremium && file.size > MAX_FREE_SIZE) {
      showError("File too large. Free tier limit is 10MB. Upgrade to Pro for 45MB uploads!");
      return null;
    }

    // Check AI Generation Limit (Database-backed)
    try {
      console.log("DEBUG: Checking AI usage limit...");
      const { data: usageStatus, error: usageError } = await supabase.rpc('get_ai_usage_status', {
        p_user_id: currentUser.id
      });

      console.log("DEBUG: Usage status:", usageStatus, "Error:", usageError);

      if (usageError) throw usageError;

      if (usageStatus && usageStatus.remaining <= 0) {
        const limit = usageStatus.limit;
        const upgradeMsg = !isPremium ? " Upgrade to Pro for 200 AI generations per day." : "";
        console.error("DEBUG: AI limit reached. Remaining:", usageStatus.remaining);
        showError(`Daily AI generation limit reached (${limit}/${limit}).${upgradeMsg}`);
        return null;
      }
      console.log("DEBUG: Usage check passed. Remaining:", usageStatus?.remaining);
    } catch (error: any) {
      console.error("DEBUG: Error checking AI usage:", error);
      // Continue anyway to avoid blocking users if DB check fails
    }

    setProgressState('extracting');
    setProgressMessage("Extracting text from file...");

    try {
      console.log("DEBUG: Starting generation. Source text length:", sourceTextContent?.length || 0);
      let textToProcess = sourceTextContent;

      if (!textToProcess) {
        console.log("📝 Auto-extracting text from file...");
        const { extractedFileContent } = await extractFileContent(file);
        textToProcess = extractedFileContent;
        setSourceTextContent(extractedFileContent);
      }

      setProgressState('processing');

      // guardrail for very large textbooks
      const isVeryLarge = textToProcess.length > 150000; // ~60 pages
      if (isVeryLarge && isPremium) {
        setProgressMessage("This document is very large. Nova will process the most relevant sections for optimal results.");
      } else if (isVeryLarge && !isPremium) {
        showError("This document is too large for the free tier. Try uploading a specific chapter or upgrading to Nova Pro.");
        setProgressState('idle');
        return null;
      }

      setProgressMessage("Nova AI is analyzing content & generating flashcards...");

      const isLargeFile = file && file.size > 10 * 1024 * 1024; // > 10MB
      let data: ProcessedAIData;

      // New Strategy: If we have extracted text, always use text-based processing (more stable for books)
      // Only use the Storage/File API path if text extraction failed (image-only PDFs)
      const hasExtractedText = textToProcess && textToProcess.trim().length > 0;

      if (isLargeFile && isPremium && !hasExtractedText) {
        // Large File Strategy (OCR Fallback): Storage Upload -> Server-Side Processing
        console.log("📂 Large image-based file detected (no text). Using Storage path for Gemini OCR...");
        setProgressMessage("Uploading large file for enhanced storage-side processing...");

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
            file_path: fileName,
            bucketName: 'temp-uploads',
            bucket_name: 'temp-uploads',
            bucket: 'temp-uploads',
            mode: 'generate',
            operation: 'generate'
          }
        });

        if (funcError) throw new Error(`Processing failed: ${funcError.message}`);

        // 3. Cleanup (Delete file)
        await supabase.storage.from('temp-uploads').remove([fileName]);

        data = funcData;
      } else if (isLargeFile && isPremium && hasExtractedText) {
        // Multi-Pass Chunking Strategy: Process the file in segments to cover more content
        console.log("📚 Large textbook detected. Starting multi-pass chunked processing...");

        const CHUNK_SIZE = 60000;
        const totalChars = textToProcess.length;
        const totalChunks = Math.min(Math.ceil(totalChars / CHUNK_SIZE), 8); // Max 8 chunks (~500k chars)

        const cumulativeData: ProcessedAIData = {
          cards: [],
          concepts: [],
          relationships: [],
          card_concept_links: []
        };

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, totalChars);
          const chunkText = textToProcess.substring(start, end);

          setProgressMessage(`Nova is analyzing section ${i + 1} of ${totalChunks}...`);
          console.log(`DEBUG: Processing Chunk ${i + 1}/${totalChunks} (${start}-${end})`);

          try {
            const { data: funcData, error: funcError } = await supabase.functions.invoke('process-file', {
              body: {
                textContent: chunkText,
                mode: 'generate',
                operation: 'generate'
              }
            });

            if (funcError) throw funcError;

            // Merge Data
            if (funcData) {
              // 1. Merge Cards (Avoid duplicates by term)
              const existingTerms = new Set(cumulativeData.cards.map(c => c.term.toLowerCase()));
              const newCards = funcData.cards || [];
              for (const card of newCards) {
                if (!existingTerms.has(card.term.toLowerCase())) {
                  cumulativeData.cards.push(card);
                  existingTerms.add(card.term.toLowerCase());
                }
              }

              // 2. Merge Concepts
              const existingConcepts = new Set(cumulativeData.concepts.map(c => c.name.toLowerCase()));
              const newConcepts = funcData.concepts || [];
              for (const concept of newConcepts) {
                if (!existingConcepts.has(concept.name.toLowerCase())) {
                  cumulativeData.concepts.push(concept);
                  existingConcepts.add(concept.name.toLowerCase());
                }
              }

              // 3. Merge Relationships
              if (funcData.relationships) {
                cumulativeData.relationships = [...(cumulativeData.relationships || []), ...funcData.relationships];
              }
            }

            // Stop early if we have enough cards
            if (cumulativeData.cards.length >= 60) break;

          } catch (chunkErr) {
            console.error(`❌ Error in chunk ${i + 1}:`, chunkErr);
            if (i === 0) throw chunkErr;
          }
        }
        data = cumulativeData;
      } else {
        // Standard Strategy: Client-Side Extraction -> AI (Direct)
        const dataResponse = await callAIProcessFile(textToProcess, 'generate');
        if (!dataResponse) throw new Error("AI returned no data");
        data = dataResponse as ProcessedAIData;
      }

      const newCards = data.cards;
      const newConcepts = data.concepts;

      if (!newCards || newCards.length === 0) {
        console.error("DEBUG: Zero cards generated.");
        console.error("DEBUG: Extracted text preview (first 200 chars):", textToProcess?.substring(0, 200) || "NULL");
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
                  .filter((rel): rel is { user_id: string; source_concept_id: string; target_concept_id: string; type: string; strength: number | undefined } =>
                    !!rel.source_concept_id && !!rel.target_concept_id
                  );

                if (validRelationships.length > 0) {
                  const { error: relError } = await supabase
                    .from('concept_relationships')
                    .upsert(validRelationships, {
                      onConflict: 'user_id,source_concept_id,target_concept_id'
                    });

                  if (relError) console.warn("Relationship storage error:", relError);
                  else console.log(`✅ Saved/Updated ${validRelationships.length} relationships`);
                }
              }
            }
          }
        } catch (conceptError) {
          console.warn("Concept processing skipped.", conceptError);
        }
      }

      // Track AI Usage in Database
      try {
        const { error: trackingError } = await supabase.rpc('check_and_increment_ai_usage', {
          p_user_id: currentUser.id,
          p_cards_generated: newCards.length
        });

        if (trackingError) {
          console.error("Error tracking AI usage:", trackingError);
        }
      } catch (error) {
        console.error("Failed to track AI usage:", error);
      }

      queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });

      setProgressState('complete');
      setProgressMessage("Generation complete!");

      setTimeout(() => {
        setProgressState('idle');
        setProgressMessage("");
      }, 2000);

      return data;

    } catch (error: any) {
      setProgressState('error');
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
  }, [file, sourceTextContent, currentUser, queryClient, extractFileContent, callAIProcessFile, isPremium]);

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