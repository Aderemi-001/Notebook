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
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-fade-in">
      <div className="space-y-4">
        {/* Navigation Context */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && !isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95"
              title="Expand View"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Library className="h-3 w-3" />
            Knowledge Portfolio
          </div>
        </div>

        {/* Title & Metadata */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              {studySet.title}
            </h1>

            <div className="flex items-center gap-2">
              <Badge variant={studySet.is_public ? "default" : "secondary"} className={cn(
                "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider border-0 shadow-sm",
                studySet.is_public ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-indigo-500 text-white shadow-indigo-500/20"
              )}>
                {studySet.is_public ? <Globe className="h-3 w-3 mr-1.5" /> : <ShieldCheck className="h-3 w-3 mr-1.5" />}
                {studySet.is_public ? "Public" : "Private"}
              </Badge>

              {isAdmin && !isOwner && (
                <Badge variant="outline" className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-500 border-indigo-500/30 bg-indigo-500/5">
                  Admin Oversight
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <span className="h-2 w-2 rounded-full bg-primary/40" />
              {studySet.cards.length} Flashcards
            </div>

            {studySet.group_id && studySet.study_set_groups && studySet.study_set_groups[0]?.name && (
              <Link to={`/groups/${studySet.group_id}`} className="hover:text-primary transition-colors flex items-center gap-1.5 font-bold text-sm border-l border-border/60 pl-4">
                <Folder className="h-4 w-4" />
                {studySet.study_set_groups[0].name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Primary Actions Grid */}
      <div className="flex items-center gap-3">
        {isLoggedIn && studySet.cards.length > 0 && (
          <Button
            asChild
            size="lg"
            className="rounded-2xl px-8 py-7 bg-primary hover:bg-primary/90 shadow-premium hover:shadow-premium-hover font-black text-lg transition-all active:scale-95 group"
          >
            <Link to={`/sets/${studySet.id}/study`}>
              <PlayCircle className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" />
              Start Study Session
            </Link>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-border/60 hover:bg-secondary transition-all active:scale-90">
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-premium border-border/40 backdrop-blur-xl bg-background/80">
            <DropdownMenuItem asChild className="rounded-xl p-3">
              <Link to="/" className="flex items-center font-bold">
                <ArrowLeft className="mr-3 h-4 w-4" /> Back to Sets
              </Link>
            </DropdownMenuItem>

            {(isOwner || isAdmin) && (
              <>
                <DropdownMenuSeparator className="my-2 opacity-40" />
                <DropdownMenuItem asChild className="rounded-xl p-3">
                  <Link to={`/sets/${studySet.id}/edit`} className="flex items-center font-bold">
                    <Pencil className="mr-3 h-4 w-4" /> Edit Set Content
                  </Link>
                </DropdownMenuItem>

                {isOwner && (
                  <DropdownMenuItem onSelect={() => setIsSendInvitationDialogOpen(true)} className="rounded-xl p-3 flex items-center font-bold">
                    <UserPlus className="mr-3 h-4 w-4 text-indigo-500" /> Share with Team
                  </DropdownMenuItem>
                )}

                {isOwner && (
                  <DropdownMenuItem onSelect={() => setIsResetProgressDialogOpen(true)} className="rounded-xl p-3 flex items-center font-bold">
                    <RotateCcw className="mr-3 h-4 w-4 text-orange-500" /> Reset All Progress
                  </DropdownMenuItem>
                )}
              </>
            )}

            {(isOwner || isAdmin || studySet.is_public) && (
              <>
                <DropdownMenuSeparator className="my-2 opacity-40" />
                <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)} className="rounded-xl p-3 flex items-center font-bold">
                  <Share2 className="mr-3 h-4 w-4 text-emerald-500" /> Export & Share
                </DropdownMenuItem>
              </>
            )}

            {studySet.is_public && !isOwner && (
              <DropdownMenuItem
                onClick={handleAddToMySets}
                disabled={!isLoggedIn}
                className="rounded-xl p-3 flex items-center font-bold text-primary"
              >
                <Plus className="mr-3 h-4 w-4" /> Clone to Library
              </DropdownMenuItem>
            )}

            {(isOwner || isAdmin) && (
              <>
                <DropdownMenuSeparator className="my-2 opacity-40" />
                <DropdownMenuItem
                  onSelect={preferences?.confirm_deletion ? () => setIsDeleteSetDialogOpen(true) : handleDeleteSet}
                  className="rounded-xl p-3 flex items-center font-bold text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <Trash2 className="mr-3 h-4 w-4" /> Permanent Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AlertDialogs */}
      <AlertDialog open={isResetProgressDialogOpen} onOpenChange={setIsResetProgressDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-orange-500/20 shadow-2xl overflow-hidden glass-card">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Reset Study Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium leading-relaxed pt-2">
              This will erase your learning memory for this set. You'll be back at square one, but sometimes a fresh start is what's needed for mastery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl font-bold py-6">Maintain Progress</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress} className="rounded-xl font-bold py-6 bg-orange-500 hover:bg-orange-600">
              Wipe Data & Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteSetDialogOpen} onOpenChange={setIsDeleteSetDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-red-500/20 shadow-2xl overflow-hidden glass-card">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-red-500">Delete Knowledge Set?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium leading-relaxed pt-2">
              This action is absolute. Your collection "{studySet.title}" and all its data will be permanently removed from the neural network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl font-bold py-6">Keep Set</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSet} className="rounded-xl font-bold py-6 bg-red-500 hover:bg-red-600">
              Confirm Destruction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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