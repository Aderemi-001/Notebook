"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Editor } from "@tiptap/react";
import { useAIDrawingAnalysis } from "@/hooks/use-ai-drawing-analysis"; // Import the AI drawing analysis hook
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names

export default function CreateNote() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // HTML content for RichTextEditor
  const [studySets, setStudySets] = useState<any[]>([]);
  const [selectedStudySet, setSelectedStudySet] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null); // Stores the data URL of the drawing
  const [extractedDrawingText, setExtractedDrawingText] = useState<string | null>(null); // Stores AI extracted text
  const navigate = useNavigate();

  const editorRef = useRef<Editor | null>(null); // Ref for the RichTextEditor instance

  const insertTextIntoEditor = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(text).run();
      setContent(editorRef.current.getHTML()); // Update parent state
    }
  }, []);

  const {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    analyzeDrawing,
    handleConfirmReplace,
    handleCancelReplace,
    isAnalyzing,
  } = useAIDrawingAnalysis({ editor: editorRef.current, insertTextIntoEditor });

  useEffect(() => {
    async function fetchStudySets() {
      const { data, error } = await supabase.from("study_sets").select("id, title");
      if (error) {
        console.error("Error fetching study sets:", error);
      } else {
        setStudySets(data);
      }
    }
    fetchStudySets();
  }, []);

  const handleSaveNote = async () => {
    const toastId = showLoading("Saving note...");
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        showError("You must be logged in to create a note.");
        return;
      }

      // If in drawing mode and there's drawing data, upload it
      let drawingUrl: string | null = null;
      if (isDrawingMode && drawingDataUrl) {
        const base64Data = drawingDataUrl.split(',')[1];
        const mimeType = 'image/png'; // Assuming PNG for canvas output
        const fileName = `drawings/${user.data.user.id}/${uuidv4()}.png`;

        const { error: uploadError } = await supabase.storage
          .from('notes_drawings')
          .upload(fileName, decode(base64Data), {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload drawing: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('notes_drawings')
          .getPublicUrl(fileName);
        
        drawingUrl = publicUrlData?.publicUrl || null;
      }

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.data.user.id,
          title,
          content: content || React.Fragment,
          study_set_id: selectedStudySet,
          drawing_url: drawingUrl, // Save the URL of the drawing
          extracted_content_ai: extractedDrawingText, // Save the AI extracted text
        })
        .select();

      if (error) {
        throw error;
      }

      showSuccess("Note saved successfully!");
      navigate(`/notes/${data[0].id}/edit`); // Navigate to edit page after creation
    } catch (error: any) {
      console.error("Error saving note:", error);
      showError(`Error saving note: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDrawingChange = (dataUrl: string | null) => {
    setDrawingDataUrl(dataUrl);
  };

  const handleAnalyzeDrawingCallback = async (base64Image: string, mimeType: string) => {
    const extractedText = await analyzeDrawing(base64Image, mimeType);
    setExtractedDrawingText(extractedText); // Store the extracted text
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Create New Note</h1>

      <div className="grid gap-4 max-w-2xl mx-auto">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="studySet">Link to Study Set (Optional)</Label>
          <Select onValueChange={setSelectedStudySet} value={selectedStudySet || ""}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select a study set" />
            </SelectTrigger>
            <SelectContent>
              {studySets.map((set: { id: string; title: string }) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Content</Label>
          <DrawingCanvas
            initialDrawing={drawingDataUrl || undefined}
            onDrawingChange={handleDrawingChange}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            onAnalyzeDrawing={handleAnalyzeDrawingCallback}
            isAnalyzing={isAnalyzing}
          />
          {!isDrawingMode && (
            <RichTextEditor
              content={content}
              onContentChange={setContent}
              placeholder="Start writing your note here..."
              editorRef={editorRef}
            />
          )}
        </div>

        <Button onClick={handleSaveNote} className="w-full">
          Save Note
        </Button>
      </div>

      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Transcription Available</AlertDialogTitle>
            <AlertDialogDescription>
              The AI has transcribed the following text from your drawing:
              <p className="mt-2 p-2 border rounded-md bg-muted text-foreground max-h-40 overflow-y-auto">
                {textToReplace}
              </p>
              Would you like to insert this text into your note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>Insert Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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