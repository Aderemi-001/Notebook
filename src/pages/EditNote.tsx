"use client";

import * as React from "react"; // Explicitly import React
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams, Link } from "react-router-dom";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { RichTextEditor } from '@/components/RichTextEditor'; // Corrected import to named import
import { Editor } from "@tiptap/react"; // Import Editor type

export default function EditNote() {
  const { noteId } = useParams<{ noteId: string }>(); // Changed 'id' to 'noteId' for clarity
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [studySets, setStudySets] = useState<any[]>([]);
  const [selectedStudySet, setSelectedStudySet] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const navigate = useNavigate();

  const editorRef = useRef<Editor | null>(null); // Use Editor type
  const analyzeDrawingRef = useRef<((image: string) => Promise<string>) | null>(null);
  const insertTextIntoEditorRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    async function fetchNoteAndStudySets() {
      const toastId = showLoading("Loading note...");
      try {
        const { data: noteData, error: noteError } = await supabase
          .from("notes")
          .select("*")
          .eq("id", noteId) // Use noteId here
          .single();

        if (noteError) {
          throw noteError;
        }

        setTitle(noteData.title);
        setContent(noteData.content || "");
        setSelectedStudySet(noteData.study_set_id);
        setDrawingData(noteData.extracted_content_ai); // Assuming this stores drawing data

        const { data: studySetsData, error: studySetsError } = await supabase
          .from("study_sets")
          .select("id, title");

        if (studySetsError) {
          throw studySetsError;
        }
        setStudySets(studySetsData);
        showSuccess("Note loaded successfully!");
      } catch (error: any) {
        console.error("Error fetching note or study sets:", error);
        showError(`Error loading note: ${error.message}`);
      } finally {
        dismissToast(toastId);
      }
    }

    if (noteId) { // Only fetch if noteId is defined
      fetchNoteAndStudySets();
    } else {
      // If noteId is undefined, an error message will be displayed by the conditional render below
      console.error("No note ID provided for editing.");
    }
  }, [noteId]);

  const handleSaveNote = async () => {
    if (!noteId) { // Also check noteId before saving
      showError("Cannot save: No note ID available.");
      return;
    }
    const toastId = showLoading("Saving changes...");
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        showError("You must be logged in to edit a note.");
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content: content || JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          study_set_id: selectedStudySet,
          extracted_content_ai: drawingData ? "AI analysis of drawing: " + drawingData : null, // Placeholder for actual AI analysis
        })
        .eq("id", noteId); // Use noteId here

      if (error) {
        throw error;
      }

      showSuccess("Note updated successfully!");
      navigate(`/notes/${noteId}`);
    } catch (error: any) {
      console.error("Error saving note:", error);
      showError(`Error saving note: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDrawingChange = (data: string) => {
    setDrawingData(data);
  };

  if (!noteId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        No note ID provided for editing. Please navigate from the <Link to="/notes" className="underline">My Notes</Link> page.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Edit Note</h1>

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
            initialDrawing={drawingData || undefined}
            onDrawingChange={handleDrawingChange}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            onEditorReady={(instance: Editor, analyzeFn, insertFn) => { // Explicitly type instance
              editorRef.current = instance;
              analyzeDrawingRef.current = analyzeFn;
              insertTextIntoEditorRef.current = insertFn;
            }}
          />
          {!isDrawingMode && (
            <RichTextEditor
              content={content}
              onContentChange={setContent}
              placeholder="Start writing your note here..."
              editorRef={editorRef} // Pass the ref to RichTextEditor
            />
          )}
        </div>

        <Button onClick={handleSaveNote} className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
}