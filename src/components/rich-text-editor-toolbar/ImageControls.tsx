import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Image as ImageIcon } from 'lucide-react'; // Removed Upload
import { Separator } from '@/components/ui/separator';
import { showError } from '@/utils/toast';

interface ImageControlsProps {
  editor: Editor;
}

const ImageControls: React.FC<ImageControlsProps> = ({ editor }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const addImageFromUrl = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setIsPopoverOpen(false);
    } else {
      showError("Please enter an image URL.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
        setIsPopoverOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                aria-label="Insert image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Insert Image</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="image-url">Image URL</Label>
            <Input
              id="image-url"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addImageFromUrl()}
            />
            <Button size="sm" onClick={addImageFromUrl} className="w-full">
              Insert from URL
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="image-upload">Upload Image</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">Supports PNG, JPG, GIF, etc.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ImageControls;