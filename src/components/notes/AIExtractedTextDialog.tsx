import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AIExtractedTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textToReplace: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const AIExtractedTextDialog: React.FC<AIExtractedTextDialogProps> = ({
  open,
  onOpenChange,
  textToReplace,
  onConfirm,
  onCancel,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>AI Extracted Text</AlertDialogTitle>
          <AlertDialogDescription>
            The AI extracted the following text from your drawing. Would you like to insert it into your note?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-[200px] overflow-y-auto p-4 border rounded-md bg-muted/50 text-sm">
          <p className="whitespace-pre-wrap">{textToReplace}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Insert Text</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AIExtractedTextDialog;