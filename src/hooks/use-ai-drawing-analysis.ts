import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names

interface UseAIDrawingAnalysisProps {
  editor: Editor | null;
  insertTextIntoEditor: (text: string) => void; // Callback to insert text into editor
}

export const useAIDrawingAnalysis = ({ editor, insertTextIntoEditor }: UseAIDrawingAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [textToReplace, setTextToReplace] = useState('');

  const handleConfirmReplace = useCallback(() => {
    insertTextIntoEditor(textToReplace);
    setShowReplaceDialog(false);
    setTextToReplace('');
    showSuccess("AI transcription added to note content!");
  }, [insertTextIntoEditor, textToReplace]);

  const handleCancelReplace = useCallback(() => {
    setShowReplaceDialog(false);
    setTextToReplace('');
    showError("AI transcription discarded.");
  }, []);

  const analyzeDrawing = useCallback(async (base64Image: string, mimeType: string): Promise<string | null> => {
    setIsAnalyzing(true);
    const toastId = showLoading("AI is analyzing your drawing...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      // 1. Upload image to Supabase Storage
      const fileName = `drawings/${session.user.id}/${uuidv4()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('notes_drawings') // Assuming a bucket named 'notes_drawings'
        .upload(fileName, decode(base64Image), {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload drawing: ${uploadError.message}`);
      }

      // Get public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('notes_drawings')
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to get public URL for the uploaded drawing.");
      }

      // 2. Call the AI edge function with the base64 image
      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/analyze-drawing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ base64Image: base64Image, mimeType }), // Still sending base64 to edge function
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to analyze drawing.");
      }

      if (result.extracted_content && result.extracted_content.trim() !== "") {
        setTextToReplace(result.extracted_content);
        setShowReplaceDialog(true);
        return result.extracted_content; // Return the extracted content
      } else {
        showError("AI could not extract meaningful content from the drawing.");
        return null;
      }
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during drawing analysis.");
      console.error("AI drawing analysis error:", err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [editor]);

  return {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    analyzeDrawing,
    handleConfirmReplace,
    handleCancelReplace,
    isAnalyzing,
  };
};

// Helper function to decode base64 to Uint8Array for Supabase Storage
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}