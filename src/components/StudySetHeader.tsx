import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, PlayCircle, Pencil, Trash2, RotateCcw, Globe, Plus, MoreVertical } from 'lucide-react';
import DeleteSetConfirmationDialog from './DeleteSetConfirmationDialog';
import ResetProgressConfirmationDialog from './ResetProgressConfirmationDialog';
import { UserPreferences } from '@/hooks/use-user-preferences';

interface StudySetHeaderProps {
  setId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  isOwner: boolean;
  totalCards: number;
  preferences: UserPreferences | null;
  onDeleteSet: () => void;
  onResetProgress: () => void;
  onAddToMySets: () => void;
}

const StudySetHeader: React.FC<StudySetHeaderProps> = ({
  setId,
  title,
  description,
  isPublic,
  isOwner,
  totalCards,
  preferences,
  onDeleteSet,
  onResetProgress,
  onAddToMySets,
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{title}</h1>
          <Badge variant={isPublic ? "default" : "secondary"} className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
            </Link>
          </Button>
          {totalCards > 0 && (
            <Button asChild>
              <Link to={`/sets/${setId}/study`} className="flex items-center">
                <PlayCircle className="mr-2 h-4 w-4" /> Start Study
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={`/sets/${setId}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" /> Edit Set
                    </Link>
                  </DropdownMenuItem>
                  <ResetProgressConfirmationDialog onConfirm={onResetProgress}>
                    <span className="flex items-center w-full text-left px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
                    </span>
                  </ResetProgressConfirmationDialog>
                  <DropdownMenuSeparator />
                  {preferences?.confirm_deletion ? (
                    <DeleteSetConfirmationDialog setTitle={title} onConfirm={onDeleteSet}>
                      <span className="flex items-center w-full text-left px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Set
                      </span>
                    </DeleteSetConfirmationDialog>
                  ) : (
                    <DropdownMenuItem onClick={onDeleteSet} className="flex items-center text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Set
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {isPublic && !isOwner && (
                <DropdownMenuItem onClick={onAddToMySets} className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" /> Add to My Sets
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground mb-6">{description}</p>
      )}
    </>
  );
};

export default StudySetHeader;