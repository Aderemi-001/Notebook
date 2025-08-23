import React from 'react';
import { Editor } from '@tiptap/react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface AlignmentControlsProps {
  editor: Editor;
}

const AlignmentControls: React.FC<AlignmentControlsProps> = ({ editor }) => {
  const getActiveAlignment = () => {
    if (editor.isActive({ textAlign: 'left' })) return 'left';
    if (editor.isActive({ textAlign: 'center' })) return 'center';
    if (editor.isActive({ textAlign: 'right' })) return 'right';
    if (editor.isActive({ textAlign: 'justify' })) return 'justify';
    return 'left'; // Default
  };

  const handleAlignmentChange = (value: string) => {
    if (value) {
      editor.chain().focus().setTextAlign(value as 'left' | 'center' | 'right' | 'justify').run();
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={getActiveAlignment()}
      onValueChange={handleAlignmentChange}
      aria-label="Text alignment"
      className="flex gap-1"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="left" aria-label="Align left" size="sm" className="px-2">
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="center" aria-label="Align center" size="sm" className="px-2">
              <AlignCenter className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>Align Center</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="right" aria-label="Align right" size="sm" className="px-2">
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="justify" aria-label="Justify" size="sm" className="px-2">
              <AlignJustify className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>Justify</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </ToggleGroup>
  );
};

export default AlignmentControls;