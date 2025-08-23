import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const colors = [
  '#FFFF00', // Yellow
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#000000', // Black
  '#FFFFFF', // White
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", className)}
          style={{ backgroundColor: color }}
          aria-label="Select highlight color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1 flex flex-wrap gap-1">
        {colors.map((c) => (
          <Button
            key={c}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-full border-2",
              c === color ? "border-primary" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
            onClick={() => {
              onChange(c);
              setIsOpen(false);
            }}
            aria-label={`Set highlight color to ${c}`}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
};