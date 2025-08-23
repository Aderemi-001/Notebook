"use client";

import * as React from "react"; // Explicitly import React
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { RichTextEditor } from '@/components/RichTextEditor'; // Corrected import to named import
import { Editor } from "@tiptap/react"; // Import Editor type

export default function CreateNote() {
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

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.data.user.id,
          title,
          content: content || JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
          study_set_id: selectedStudySet,
          extracted_content_ai: drawingData ? "AI analysis of drawing: " + drawingData : null, // Placeholder for actual AI analysis
        })
        .select();

      if (error) {
        throw error;
      }

      showSuccess("Note saved successfully!");
      navigate(`/notes/${data[0].id}`);
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
          Save Note
        </Button>
      </div>
    </div>
  );
}