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
} from "@/components/ui/alert-dialog";
import { ArrowLeft, PlayCircle, Pencil, Trash2, RotateCcw, Globe, Plus, MoreVertical, Folder, ShieldCheck, Share2, UserPlus, Library, PanelLeftOpen } from 'lucide-react';
import { UserPreferences } from '@/hooks/use-user-preferences';
import ShareStudySetDialog from '@/components/collaborations/ShareStudySetDialog';
import SendCollaborationInvitationDialog from '@/components/collaborations/SendCollaborationInvitationDialog';

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
  isLoggedIn: boolean;
  isAdmin: boolean; // New prop for admin status
  preferences: UserPreferences | null | undefined;
  handleDeleteSet: () => void;
  handleResetProgress: () => void;
  handleAddToMySets: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const StudySetHeader: React.FC<StudySetHeaderProps> = ({
  studySet,
  isOwner,
  isLoggedIn,
  isAdmin, // Use isAdmin
  preferences,
  handleDeleteSet,
  handleResetProgress,
  handleAddToMySets,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  // State to control the open state of the AlertDialogs
  const [isResetProgressDialogOpen, setIsResetProgressDialogOpen] = React.useState(false);
  const [isDeleteSetDialogOpen, setIsDeleteSetDialogOpen] = React.useState(false);
  const [isSendInvitationDialogOpen, setIsSendInvitationDialogOpen] = React.useState(false); // New state for invitation dialog
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false); // State for Share Dialog

  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        {onToggleSidebar && !isSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:flex hidden text-muted-foreground hover:text-foreground"
            title="Expand View"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <Library className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{studySet.title}</h1>
        </div>
        <Badge variant={studySet.is_public ? "default" : "secondary"} className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {studySet.is_public ? "Public" : "Private"}
        </Badge>
        {isAdmin && !isOwner && ( // Show admin badge if admin but not owner
          <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-600">
            <ShieldCheck className="h-3 w-3" /> Admin View
          </Badge>
        )}
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
          {isLoggedIn && studySet.cards.length > 0 && ( // Only show "Start Study" if logged in and has cards
            <DropdownMenuItem asChild>
              <Link to={`/sets/${studySet.id}/study`} className="flex items-center">
                <PlayCircle className="mr-2 h-4 w-4" /> Start Study
              </Link>
            </DropdownMenuItem>
          )}
          {(isOwner || isAdmin) && ( // Allow edit if owner OR admin
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/sets/${studySet.id}/edit`} className="flex items-center">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Set
                </Link>
              </DropdownMenuItem>
              {isOwner && ( // Only owner can send invitations
                <DropdownMenuItem onSelect={() => setIsSendInvitationDialogOpen(true)} className="flex items-center">
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Collaborator
                </DropdownMenuItem>
              )}

              {/* Reset Progress Trigger - only for owner */}
              {isOwner && (
                <DropdownMenuItem onSelect={() => setIsResetProgressDialogOpen(true)} className="flex items-center text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
                </DropdownMenuItem>
              )}
            </>
          )}
          {(isOwner || isAdmin) && ( // Allow delete if owner OR admin
            <>
              <DropdownMenuSeparator />
              {preferences?.confirm_deletion ? (
                // Delete Set Trigger (conditional based on preferences)
                <DropdownMenuItem onSelect={() => setIsDeleteSetDialogOpen(true)} className="flex items-center text-sm text-destructive outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <Trash2 className="h-4 w-4" /> Delete Set
                </DropdownMenuItem>
              ) : (
                // Direct delete if no confirmation needed
                <DropdownMenuItem onClick={handleDeleteSet} className="flex items-center text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete Set
                </DropdownMenuItem>
              )}
            </>
          )}
          {studySet.is_public && !isOwner && (
            <DropdownMenuItem
              onClick={handleAddToMySets}
              disabled={!isLoggedIn} // Disable if not logged in
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" /> Add to My Sets
            </DropdownMenuItem>
          )}

          {/* Share Option - Visible to Owner, Admin, or if Public */}
          {(isOwner || isAdmin || studySet.is_public) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)} className="flex items-center">
                <Share2 className="mr-2 h-4 w-4" /> Share Set
              </DropdownMenuItem>
            </>
          )}

        </DropdownMenuContent>
      </DropdownMenu>

      {/* AlertDialogs rendered outside DropdownMenuContent */}
      <AlertDialog open={isResetProgressDialogOpen} onOpenChange={setIsResetProgressDialogOpen}>
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

      {preferences?.confirm_deletion && (
        <AlertDialog open={isDeleteSetDialogOpen} onOpenChange={setIsDeleteSetDialogOpen}>
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
      )}

      {/* Send Collaboration Invitation Dialog */}
      {isOwner && (
        <SendCollaborationInvitationDialog
          studySetId={studySet.id}
          studySetTitle={studySet.title}
          open={isSendInvitationDialogOpen}
          onOpenChange={setIsSendInvitationDialogOpen}
        />
      )}

      <ShareStudySetDialog
        studySetId={studySet.id}
        studySetTitle={studySet.title}
        isPublic={studySet.is_public}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  );
};

export default StudySetHeader;