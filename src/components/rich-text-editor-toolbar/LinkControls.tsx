import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, Link2Off } from 'lucide-react';

interface LinkControlsProps {
  editor: Editor;
}

const LinkControls: React.FC<LinkControlsProps> = ({ editor }) => {
  const [url, setUrl] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (editor.isActive('link')) {
      setUrl(editor.getAttributes('link').href || '');
    } else {
      setUrl('');
    }
  }, [editor, editor.isActive('link'), isPopoverOpen]);

  const setLink = () => {
    if (url) {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setIsPopoverOpen(false);
  };

  const unsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setIsPopoverOpen(false);
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
                aria-label={editor.isActive('link') ? "Edit or remove link" : "Add link"}
              >
                <Link className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {editor.isActive('link') ? "Edit/Remove Link" : "Add Link"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setLink()}
            />
          </div>
          <div className="flex justify-end gap-2">
            {editor.isActive('link') && (
              <Button variant="outline" size="sm" onClick={unsetLink}>
                <Link2Off className="h-4 w-4 mr-2" /> Remove
              </Button>
            )}
            <Button size="sm" onClick={setLink}>
              {editor.isActive('link') ? "Update" : "Add"} Link
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LinkControls;