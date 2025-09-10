import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface SendCollaborationInvitationDialogProps {
  studySetId: string;
  studySetTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sendInvitation = async ({ studySetId, inviteeEmail, permissionLevel }: {
  studySetId: string;
  inviteeEmail: string;
  permissionLevel: 'viewer' | 'editor';
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Session not found. Please log in again.");
  }

  const response = await fetch(
    `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/send-collaboration-invitation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        studySetId,
        inviteeEmail,
        permissionLevel,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result?.error || "Failed to send invitation.");
  }

  return result.invitation;
};

const SendCollaborationInvitationDialog: React.FC<SendCollaborationInvitationDialogProps> = ({
  studySetId,
  studySetTitle,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'viewer' | 'editor'>('viewer');

  const mutation = useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      showSuccess("Invitation sent successfully!");
      queryClient.invalidateQueries({ queryKey: ['collaborationInvitations'] });
      setInviteeEmail('');
      setPermissionLevel('viewer');
      onOpenChange(false);
    },
    onError: (err: any) => {
      showError(err.message || "Failed to send invitation.");
      console.error("Send invitation error:", err);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeEmail.trim()) {
      showError("Please enter an invitee's email.");
      return;
    }
    mutation.mutate({ studySetId, inviteeEmail, permissionLevel });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Invite Collaborator to "{studySetTitle}"</DialogTitle>
          <DialogDescription>
            Enter the email of the user you want to invite and set their permission level.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invitee-email" className="text-right">
              Email
            </Label>
            <Input
              id="invitee-email"
              type="email"
              placeholder="collaborator@example.com"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              className="col-span-3"
              disabled={mutation.isPending}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="permission-level" className="text-right">
              Permission
            </Label>
            <Select
              value={permissionLevel}
              onValueChange={(value: 'viewer' | 'editor') => setPermissionLevel(value)}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="permission-level" className="col-span-3">
                <SelectValue placeholder="Select permission level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (Can only view cards)</SelectItem>
                <SelectItem value="editor">Editor (Can view and edit cards)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !inviteeEmail.trim()}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendCollaborationInvitationDialog;