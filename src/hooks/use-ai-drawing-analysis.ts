import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UseAIDrawingAnalysisProps {
  editor: Editor | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  setIsDrawingMode: (mode: boolean) => void;
  clearCanvas: () => void;
}

export const useAIDrawingAnalysis = ({ editor, canvasRef, setIsDrawingMode, clearCanvas }: UseAIDrawingAnalysisProps) => {
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [textToReplace, setTextToReplace] = useState('');

  const insertDrawing = useCallback(() => {
    if (editor && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      editor.chain().focus().setImage({ src: dataUrl }).run();
      clearCanvas();
      setIsDrawingMode(false);
    }
  }, [editor, canvasRef, clearCanvas, setIsDrawingMode]);

  const analyzeDrawing = useCallback(async () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/png';

      const toastId = showLoading("AI is analyzing your drawing...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session not found. Please log in again.");
        }

        const response = await fetch(
          `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/analyze-drawing`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ base64Image: base64Data, mimeType }),
          }
        );

        const result = await response.json();
        

        if (!response.ok || result.error) {
          throw new Error(result?.error || "Failed to analyze drawing.");
        }

        if (result.extracted_content && result.extracted_content.trim() !== "") {
          setTextToReplace(result.extracted_content);
          setShowReplaceDialog(true);
        } else {
          showError("AI could not extract meaningful content from the drawing.");
        }
        
      } catch (err: any) {
        showError(err.message || "An unexpected error occurred during drawing analysis.");
        console.error("AI drawing analysis error:", err);
      } finally {
        dismissToast(toastId);
      }
    }
  }, [canvasRef, editor]);

  const handleConfirmReplace = useCallback(() => {
    if (editor && textToReplace) {
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, '<p>' + textToReplace + '</p>').run();
      showSuccess("AI transcription added to note content!");
    }
    setShowReplaceDialog(false);
    setTextToReplace('');
  }, [editor, textToReplace]);

  const handleCancelReplace = useCallback(() => {
    setShowReplaceDialog(false);
    setTextToReplace('');
    showSuccess("AI transcription not applied.");
  }, []);

  return {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    insertDrawing,
    analyzeDrawing,
    handleConfirmReplace,
    handleCancelReplace,
  };
};