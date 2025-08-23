"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading1, // Keep Heading1 for the icon in the SelectTrigger
  Quote,
  Code,
  Redo,
  Undo,
  Image,
  Link,
  Unlink,
  Highlighter,
  Eraser,
  CodeXml,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  editor: Editor | null;
};

export const RichTextEditorToolbar = ({ editor }: Props) => {
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!editor) {
    return null;
  }

  const handleAddImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageInput(false);
      toast.success("Image added successfully!");
    } else {
      toast.error("Please enter a valid image URL.");
    }
  };

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run();
      setLinkUrl("");
      setShowLinkInput(false);
      toast.success("Link added successfully!");
    } else {
      toast.error("Please enter a valid URL for the link.");
    }
  };

  const handleHeadingChange = (value: string) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value.replace("h", ""));
      editor.chain().focus().toggleHeading({ level: level as any }).run();
    }
  };

  const getActiveHeading = () => {
    if (editor.isActive("paragraph")) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  };

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap items-center gap-2">
      <Select onValueChange={handleHeadingChange} value={getActiveHeading()}>
        <SelectTrigger className="w-[130px] h-8 px-2 rounded-lg">
          <Heading1 className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Text Style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
        </SelectContent>
      </Select>

      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("highlight")}
        onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="Toggle highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Toggle code"
      >
        <Code className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("codeBlock")}
        onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
        aria-label="Toggle code block"
      >
        <CodeXml className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Toggle bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Toggle blockquote"
      >
        <Quote className="h-4 w-4" />
      </Toggle>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowImageInput(!showImageInput)}
        aria-label="Add image"
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowLinkInput(!showLinkInput)}
        aria-label="Add link"
      >
        <Link className="h-4 w-4" />
      </Button>
      {editor.isActive("link") && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label="Unlink"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        aria-label="Clear formatting"
      >
        <Eraser className="h-4 w-4" />
      </Button>

      {showImageInput && (
        <div className="flex items-center gap-2 mt-2 w-full">
          <Input
            type="text"
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleAddImage}>Add Image</Button>
        </div>
      )}

      {showLinkInput && (
        <div className="flex items-center gap-2 mt-2 w-full">
          <Input
            type="text"
            placeholder="Link URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSetLink}>Add Link</Button>
        </div>
      )}
    </div>
  );
};