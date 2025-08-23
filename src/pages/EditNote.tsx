import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Removed Link
import DrawingCanvas from "@/components/DrawingCanvas";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const EditNote: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", id)
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
  }, [id, navigate]);

  const handleSaveDrawing = (dataUrl: string) => {
    setDrawingUrl(dataUrl);
    showSuccess("Drawing saved temporarily!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !id) {
      showError("You must be logged in to edit a note.");
      return;
    }

    const toastId = showLoading("Updating note...");

    try {
      const { error } = await supabase
        .from("notes")
        .update({ title, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] }, drawing_url: drawingUrl, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      showSuccess("Note updated successfully!");
      navigate(`/notes/${id}`);
    } catch (error: any) {
      console.error("Error updating note:", error);
      showError(`Failed to update note: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading note...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Edit Note</h1>
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
        <div className="flex space-x-4">
          <Button type="submit" className="flex-1">Save Changes</Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/notes/${id}`)} className="flex-1">Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default EditNote;