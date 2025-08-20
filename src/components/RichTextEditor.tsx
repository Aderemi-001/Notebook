import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Minus, Highlighter, Undo, Redo, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#facc15', dataColor: 'yellow' },
  { name: 'Green', hex: '#4ade80', dataColor: 'green' },
  { name: 'Blue', hex: '#60a5fa', dataColor: 'blue' },
  { name: 'Red', hex: '#ef4444', dataColor: 'red' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editable = true, className }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 pl-4 italic text-muted-foreground',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            1: { class: 'text-3xl font-bold mb-4 mt-6' },
            2: { class: 'text-2xl font-semibold mb-3 mt-5' },
            3: { class: 'text-xl font-semibold mb-2 mt-4' },
            4: { class: 'text-lg font-semibold mb-1 mt-3' },
            5: { class: 'text-base font-semibold mb-1 mt-2' },
            6: { class: 'text-sm font-semibold mb-1 mt-1' },
          },
        },
      }),
      Highlight.configure({
        multicolor: true,
        // HTMLAttributes are removed here as styling is handled by globals.css based on data-color
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editable: editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4 border rounded-md',
          !editable && 'bg-muted/50 cursor-not-allowed',
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            aria-label="Toggle bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            aria-label="Toggle italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('strike')}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            aria-label="Toggle strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('code')}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            aria-label="Toggle code"
          >
            <Code className="h-4 w-4" />
          </Toggle>
          
          {/* Highlight color options */}
          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <span className="text-sm text-muted-foreground mr-1">Highlight:</span>
            {HIGHLIGHT_COLORS.map((colorOption) => (
              <TooltipProvider key={colorOption.dataColor}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editor.isActive('highlight', { color: colorOption.hex })}
                      onPressedChange={() => editor.chain().focus().toggleHighlight({ color: colorOption.hex }).run()}
                      disabled={!editor.can().chain().focus().toggleHighlight({ color: colorOption.hex }).run()}
                      aria-label={`Highlight ${colorOption.name}`}
                      className="relative"
                    >
                      <Highlighter className="h-4 w-4" />
                      <div
                        className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                        style={{ backgroundColor: colorOption.hex }}
                      ></div>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    {colorOption.name} Highlight
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {/* Option to remove highlight */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    onPressedChange={() => editor.chain().focus().unsetHighlight().run()}
                    disabled={!editor.can().chain().focus().unsetHighlight().run()}
                    aria-label="Remove Highlight"
                  >
                    <Highlighter className="h-4 w-4 text-gray-500" />
                    <X className="absolute top-0 right-0 h-3 w-3 text-red-500" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  Remove Highlight
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            aria-label="Toggle bullet list"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
            aria-label="Toggle ordered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('blockquote')}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editor.can().chain().focus().toggleBlockquote().run()}
            aria-label="Toggle blockquote"
          >
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={!editor.can().chain().focus().setHorizontalRule().run()}
            aria-label="Insert horizontal rule"
          >
            <Minus className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Toggle>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;