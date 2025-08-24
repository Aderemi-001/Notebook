import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from "lowlight";
import { RichTextEditorToolbar } from './RichTextEditorToolbar';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  editorRef: React.MutableRefObject<Editor | null>;
  // Removed: editable?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editorRef }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // Disable default codeBlock to use CodeBlockLowlight
      }),
      Image.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    editable: true, // Always editable in basic mode
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      // Explicitly focus the editor when it's ready and mounted
      editor.commands.focus();
    }
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  // This useEffect handles external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);


  return (
    <div className="border rounded-md flex flex-col h-full">
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
    </div>
  );
};