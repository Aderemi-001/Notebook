import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { RichTextEditorToolbar } from '@/components/RichTextEditorToolbar';
import { ArrowLeft, Save } from 'lucide-react';

const CreateNote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [noteContent, setNoteContent] = useState<any>({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  });
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
    ],
    content: noteContent,
    onUpdate: ({ editor }) => {
      setNoteContent(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.focus();
    }
  }, [editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a note.');
      return;
    }
    if (!title.trim()) {
      toast.error('Note title cannot be empty.');
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content: noteContent,
      })
      .select();

    if (error) {
      toast.error('Failed to create note: ' + error.message);
      console.error('Error creating note:', error);
    } else {
      toast.success('Note created successfully!');
      navigate(`/notes/${data[0].id}/edit`);
    }
    setIsSaving(false);
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Note</h1>
        <Button variant="outline" asChild>
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
          </Link>
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Enter the title and content for your new note.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="My Awesome Note"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <div className="border rounded-md">
                <RichTextEditorToolbar editor={editor} />
                <EditorContent editor={editor} className="min-h-[200px] p-4 prose max-w-none dark:prose-invert" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Create Note
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateNote;