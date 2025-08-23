"use client";

import { EditorContent, useEditor, Editor } from "@tiptap/react"; // Import Editor type
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { RichTextEditorToolbar } from "./RichTextEditorToolbar";
import * as React from "react"; // Explicitly import React
import { useEffect } from "react"; // Explicitly import useEffect

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  editorRef?: React.MutableRefObject<Editor | null>; // Add editorRef prop
}

export function RichTextEditor({
  content,
  onContentChange,
  placeholder = "Start writing...",
  editable = true,
  editorRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3], // Only allow H1, H2, H3
        },
        codeBlock: false, // Disable default codeBlock to use CodeBlockLowlight
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none min-h-[150px] p-4 border rounded-md focus:outline-none",
      },
    },
    editable: editable,
  });

  // Assign the editor instance to the ref if provided
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  return (
    <div className="border rounded-md">
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}