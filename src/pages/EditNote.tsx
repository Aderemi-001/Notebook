import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom"; // Added Link
import DrawingCanvas from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotebookCard, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/NotebookCard"; // Import NotebookCard and its sub-components
import { ArrowLeft } from "lucide-react"; // Import ArrowLeft

const EditNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>(); // Changed id to noteId for clarity
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", noteId)
          .single();

        if (error) throw error;

        if (data) {
          setTitle(data.title);
          if (data.content && data.content.content && Array.isArray(data.content.content)) {
            const extractedText = data.content.content
              .map((block: any) => {
                if (block.type === 'paragraph' && block.content) {
                  return block.content.map((textBlock: any) => textBlock.text).join('');
                }
                return '';
              })
              .join('\n');
            setContent(extractedText);
          } else {
            setContent("");
          }
          setDrawingUrl(data.drawing_url || undefined);
        }
      } catch (error: any) {
        console.error("Error fetching note:", error);
        showError(`Failed to fetch note: ${error.message}`);
        navigate("/notes");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId, navigate]);

  const handleSaveDrawing = (dataUrl: string) => {
    setDrawingUrl(dataUrl);
    showSuccess("Drawing saved temporarily!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !noteId) {
      showError("You must be logged in to edit a note.");
      return;
    }

    const toastId = showLoading("Updating note...");

    try {
      const { error } = await supabase
        .from("notes")
        .update({ title, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] }, drawing_url: drawingUrl, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      showSuccess("Note updated successfully!");
      navigate(`/notes/${noteId}`);
    } catch (error: any) {
      console.error("Error updating note:", error);
      showError(`Failed to update note: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center">Loading note...</div>;
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Update the title and content of your note.</CardDescription>
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
              <DrawingCanvas initialImage={drawingUrl} onSave={handleSaveDrawing} />
              {drawingUrl && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Current Drawing:</h3>
                  <img src={drawingUrl} alt="Current Drawing" className="max-w-full h-auto border rounded-md" />
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Button type="submit" className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/notes/${noteId}`)} className="flex-1">Cancel</Button>
            </div>
          </form>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default EditNote;