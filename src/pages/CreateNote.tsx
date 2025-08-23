import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DrawingCanvas from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotebookCard, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/NotebookCard";
import { ArrowLeft } from "lucide-react";

const CreateNote: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSaveDrawing = (dataUrl: string) => {
    setDrawingUrl(dataUrl);
    showSuccess("Drawing saved temporarily!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showError("You must be logged in to create a note.");
      return;
    }

    const toastId = showLoading("Creating note...");

    try {
      const { data, error } = await supabase
        .from("notes")
        .insert([{ user_id: user.id, title, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] }, drawing_url: drawingUrl }])
        .select();

      if (error) throw error;

      showSuccess("Note created successfully!");
      navigate(`/notes/${data[0].id}`);
    } catch (error: any) {
      console.error("Error creating note:", error);
      showError(`Failed to create note: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Enter the title and content for your new note.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-lg">Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="content" className="text-lg">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note content here..."
                rows={8}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-lg mb-2 block">Drawing Canvas</Label>
              <DrawingCanvas onSave={handleSaveDrawing} />
              {drawingUrl && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Preview Drawing:</h3>
                  <img src={drawingUrl} alt="Saved Drawing" className="max-w-full h-auto border rounded-md" />
                </div>
              )}
            </div>
            <Button type="submit" className="w-full">Create Note</Button>
          </form>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default CreateNote;