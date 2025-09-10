import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle2, XCircle, Clock, UserPlus, BookOpen, Trash2, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCollaborationInvitations, CollaborationInvitation } from '@/hooks/use-collaborations';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Separator } from '@/components/ui/separator';

const CollaborationInvitations: React.FC = () => {
  const { user } = useAuth();
  const { invitations, isLoading, isError, error, updateStatusMutation, deleteMutation } = useCollaborationInvitations();

  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);
  const [dialogAction, setDialogAction] = React.useState<'accept' | 'reject' | 'revoke' | 'delete' | null>(null);
  const [selectedInvitation, setSelectedInvitation] = React.useState<CollaborationInvitation | null>(null);

  const handleActionClick = (action: 'accept' | 'reject' | 'revoke' | 'delete', invitation: CollaborationInvitation) => {
    setDialogAction(action);
    setSelectedInvitation(invitation);
    setIsAlertDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedInvitation || !dialogAction) return;

    const { id } = selectedInvitation; // Removed 'status' as it's not directly used here

    if (dialogAction === 'accept') {
      updateStatusMutation.mutate({ id, status: 'accepted' });
    } else if (dialogAction === 'reject') {
      updateStatusMutation.mutate({ id, status: 'rejected' });
    } else if (dialogAction === 'revoke') {
      updateStatusMutation.mutate({ id, status: 'revoked' });
    } else if (dialogAction === 'delete') {
      deleteMutation.mutate(id);
    }
    setIsAlertDialogOpen(false);
    setSelectedInvitation(null);
    setDialogAction(null);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <NotebookCard key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </NotebookCard>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">
        Error loading collaborations: {error?.message || "Unknown error"}
      </div>
    );
  }

  const sentInvitations = invitations?.filter(inv => inv.inviter_id === user?.id);
  const receivedInvitations = invitations?.filter(inv => inv.invitee_id === user?.id);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <UserPlus className="mr-2 h-6 w-6" /> Received Invitations ({receivedInvitations?.length || 0})
        </h2>
        {receivedInvitations && receivedInvitations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {receivedInvitations.map(inv => (
              <NotebookCard key={inv.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    <span>{inv.study_sets?.[0]?.title || 'Unknown Study Set'}</span> {/* Access first item in array */}
                    <Badge variant={inv.status === 'pending' ? 'default' : inv.status === 'accepted' ? 'default' : 'destructive'}> {/* Changed 'success' to 'default' */}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Invited by: {inv.inviter_profile?.[0]?.display_name || 'Unknown User'} {/* Access first item in array */}
                  </CardDescription>
                  <CardDescription className="text-sm text-muted-foreground">
                    Permission: {inv.permission_level.charAt(0).toUpperCase() + inv.permission_level.slice(1)}
                  </CardDescription>
                  <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" /> Received {formatDistanceToNowStrict(new Date(inv.created_at), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end gap-2 pt-0">
                  {inv.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        onClick={() => handleActionClick('accept', inv)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleActionClick('reject', inv)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </>
                  )}
                  {(inv.status === 'accepted' || inv.status === 'rejected') && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleActionClick('delete', inv)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {inv.study_sets?.[0]?.id && (
                    <Button asChild variant="secondary">
                      <Link to={`/sets/${inv.study_sets[0].id}`}>
                        <BookOpen className="mr-2 h-4 w-4" /> View Set
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </NotebookCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No pending or past invitations received.</p>
          </div>
        )}
      </div>

      <Separator className="my-8" />

      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <Send className="mr-2 h-6 w-6" /> Sent Invitations ({sentInvitations?.length || 0})
        </h2>
        {sentInvitations && sentInvitations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {sentInvitations.map(inv => (
              <NotebookCard key={inv.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    <span>{inv.study_sets?.[0]?.title || 'Unknown Study Set'}</span> {/* Access first item in array */}
                    <Badge variant={inv.status === 'pending' ? 'default' : inv.status === 'accepted' ? 'default' : 'destructive'}> {/* Changed 'success' to 'default' */}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Invitee: {inv.invitee_profile?.[0]?.display_name || 'Unknown User'} {/* Access first item in array */}
                  </CardDescription>
                  <CardDescription className="text-sm text-muted-foreground">
                    Permission: {inv.permission_level.charAt(0).toUpperCase() + inv.permission_level.slice(1)}
                  </CardDescription>
                  <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" /> Sent {formatDistanceToNowStrict(new Date(inv.created_at), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end gap-2 pt-0">
                  {inv.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleActionClick('revoke', inv)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  )}
                  {(inv.status === 'accepted' || inv.status === 'rejected' || inv.status === 'revoked') && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleActionClick('delete', inv)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {inv.study_sets?.[0]?.id && (
                    <Button asChild variant="secondary">
                      <Link to={`/sets/${inv.study_sets[0].id}`}>
                        <BookOpen className="mr-2 h-4 w-4" /> View Set
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </NotebookCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No invitations sent yet.</p>
            <p className="text-muted-foreground mt-2">
              You can send invitations from a study set's detail page.
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'accept' && `Accept Invitation for "${selectedInvitation?.study_sets?.[0]?.title}"?`}
              {dialogAction === 'reject' && `Reject Invitation for "${selectedInvitation?.study_sets?.[0]?.title}"?`}
              {dialogAction === 'revoke' && `Revoke Invitation for "${selectedInvitation?.study_sets?.[0]?.title}"?`}
              {dialogAction === 'delete' && `Delete Invitation for "${selectedInvitation?.study_sets?.[0]?.title}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'accept' && `By accepting, you will gain ${selectedInvitation?.permission_level} access to "${selectedInvitation?.study_sets?.[0]?.title}".`}
              {dialogAction === 'reject' && `This will decline the invitation from ${selectedInvitation?.inviter_profile?.[0]?.display_name}.`}
              {dialogAction === 'revoke' && `This will cancel the pending invitation sent to ${selectedInvitation?.invitee_profile?.[0]?.display_name}.`}
              {dialogAction === 'delete' && `This action cannot be undone. This will permanently remove the invitation record.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending || deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={updateStatusMutation.isPending || deleteMutation.isPending}
              className={dialogAction === 'delete' || dialogAction === 'reject' || dialogAction === 'revoke' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {(updateStatusMutation.isPending || deleteMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogAction === 'accept' && 'Accept'}
              {dialogAction === 'reject' && 'Reject'}
              {dialogAction === 'revoke' && 'Revoke'}
              {dialogAction === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollaborationInvitations;