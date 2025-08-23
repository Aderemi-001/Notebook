import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Type } from 'lucide-react';

interface HeadingControlsProps {
  editor: Editor;
}

const HeadingControls: React.FC<HeadingControlsProps> = ({ editor }) => {
  const getActiveHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    if (editor.isActive('heading', { level: 5 })) return 'h5';
    if (editor.isActive('heading', { level: 6 })) return 'h6';
    return 'paragraph';
  };

  const handleValueChange = (value: string) => {
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(value.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Select onValueChange={handleValueChange} value={getActiveHeading()}>
            <SelectTrigger className="w-[130px] h-8 px-2">
              <Type className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Text Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
              <SelectItem value="h4">Heading 4</SelectItem>
              <SelectItem value="h5">Heading 5</SelectItem>
              <SelectItem value="h6">Heading 6</SelectItem>
            </SelectContent>
          </Select>
        </TooltipTrigger>
        <TooltipContent>Text Style</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HeadingControls;