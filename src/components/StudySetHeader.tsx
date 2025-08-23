import * as React from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, PlayCircle, Pencil, Trash2, RotateCcw, Globe, Plus, MoreVertical, Folder } from 'lucide-react';
import { UserPreferences } from '@/hooks/use-user-preferences';

interface StudySetHeaderProps {
  studySet: {
    id: string;
    title: string;
    is_public: boolean;
    user_id: string;
    group_id: string | null;
    study_set_groups: { name: string }[] | null; // Changed to array
    cards: any[]; // Simplified for now, actual type is in StudySetDetail
  };
  isOwner: boolean;
  preferences: UserPreferences | null | undefined;
  handleDeleteSet: () => void;
  handleResetProgress: () => void;
  handleAddToMySets: () => void;
}

const StudySetHeader: React.FC<StudySetHeaderProps> = ({
  studySet,
  isOwner,
  preferences,
  handleDeleteSet,
  handleResetProgress,
  handleAddToMySets,
}) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{studySet.title}</h1>
        <Badge variant={studySet.is_public ? "default" : "secondary"} className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {studySet.is_public ? "Public" : "Private"}
        </Badge>
        {studySet.group_id && studySet.study_set_groups?.[0]?.name && (
          <Link to={`/groups/${studySet.group_id}`}>
            <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-accent">
              <Folder className="h-3 w-3" />
              {studySet.study_set_groups[0].name}
            </Badge>
          </Link>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
            </Link>
          </DropdownMenuItem>
          {studySet.cards.length > 0 && (
            <DropdownMenuItem asChild>
              <Link to={`/sets/${studySet.id}/study`} className="flex items-center">
                <PlayCircle className="mr-2 h-4 w-4" /> Start Study
              </Link>
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/sets/${studySet.id}/edit`} className="flex items-center">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Set
                </Link>
              </DropdownMenuItem>
              {/* Reset Progress */}
              <AlertDialog>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center w-full justify-start px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
                    </Button>
                  </AlertDialogTrigger>
                </DropdownMenuItem>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to reset progress?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all your learning progress for this study set. You will start learning all cards from scratch.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetProgress}>
                      Reset Progress
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              {preferences?.confirm_deletion ? (
                <AlertDialog>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center w-full justify-start px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Set
                      </Button>
                    </AlertDialogTrigger>
                  </DropdownMenuItem>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        "{studySet.title}" study set and all its associated cards.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSet}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <DropdownMenuItem onClick={handleDeleteSet} className="flex items-center text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete Set
                </DropdownMenuItem>
              )}
            </>
          )}
          {studySet.is_public && !isOwner && (
            <DropdownMenuItem onClick={handleAddToMySets} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> Add to My Sets
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default StudySetHeader;