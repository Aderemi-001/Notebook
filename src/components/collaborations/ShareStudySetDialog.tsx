import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Lock, Copy, Check, Mail, Share, MessageCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studySetService } from '@/services/studySetService';
import { showError, showSuccess } from '@/utils/toast';

interface ShareStudySetDialogProps {
    studySetId: string;
    studySetTitle: string;
    isPublic: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ShareStudySetDialog: React.FC<ShareStudySetDialogProps> = ({
    studySetId,
    studySetTitle,
    isPublic,
    open,
    onOpenChange,
}) => {
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);
    const [localIsPublic, setLocalIsPublic] = useState(isPublic); // Optimistic state
    const shareUrl = `${window.location.origin}/sets/${studySetId}`;

    // Sync local state with prop when prop changes (e.g., initially or after external update)
    useEffect(() => {
        setLocalIsPublic(isPublic);
    }, [isPublic]);

    const mutation = useMutation({
        mutationFn: async (newIsPublic: boolean) => {
            await studySetService.updateStudySet(studySetId, { is_public: newIsPublic });
            return newIsPublic;
        },
        onSuccess: () => {
            // showSuccess(newIsPublic ? "Study set is now public!" : "Study set is now private.");
            // Invalidate but don't force loading state that jitters UI
            queryClient.invalidateQueries({ queryKey: ['studySet', studySetId] });
            queryClient.invalidateQueries({ queryKey: ['studySets'] });
        },
        onError: (err: any) => {
            showError(err.message || "Failed to update visibility.");
            setLocalIsPublic(!localIsPublic); // Revert optimistic update on error
        },
    });

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        showSuccess("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggle = (checked: boolean) => {
        setLocalIsPublic(checked); // Optimistic update
        mutation.mutate(checked);
    };

    const handleWhatsAppShare = () => {
        const text = `Check out this study set "${studySetTitle}" on Notebook: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleEmailShare = () => {
        const subject = `Study Set: ${studySetTitle}`;
        const body = `I thought you might find this study set useful:\n\n${studySetTitle}\n${shareUrl}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleNativeShare = async () => {
        if (typeof navigator.share !== 'undefined') {
            try {
                await navigator.share({
                    title: studySetTitle,
                    text: `Check out this study set "${studySetTitle}"`,
                    url: shareUrl,
                });
            } catch (err) {
                console.error("Error sharing:", err);
            }
        } else {
            handleCopyLink(); // Fallback
        }
    };

    const showNativeShare = typeof navigator.share !== 'undefined';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share "{studySetTitle}"</DialogTitle>
                    <DialogDescription>
                        Manage visibility and share your study set with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                {localIsPublic ? <Globe className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                                <span className="font-medium">{localIsPublic ? 'Public' : 'Private'}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {localIsPublic
                                    ? "Anyone with the link can view this set."
                                    : "Only you (and invited collaborators) can see this."}
                            </span>
                        </div>
                        <Switch
                            checked={localIsPublic}
                            onCheckedChange={handleToggle}
                            disabled={mutation.isPending}
                        />
                    </div>

                    {/* Share Options */}
                    {localIsPublic && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>Share via</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 gap-2" onClick={handleWhatsAppShare}>
                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                        WhatsApp
                                    </Button>
                                    <Button variant="outline" className="flex-1 gap-2" onClick={handleEmailShare}>
                                        <Mail className="h-4 w-4" />
                                        Email
                                    </Button>
                                    {showNativeShare && (
                                        <Button variant="outline" className="flex-1 gap-2" onClick={handleNativeShare}>
                                            <Share className="h-4 w-4" />
                                            More
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="link">Copy Link</Label>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 relative">
                                        <Input
                                            id="link"
                                            value={shareUrl}
                                            readOnly
                                            className="pr-10"
                                        />
                                    </div>
                                    <Button size="icon" onClick={handleCopyLink} className="shrink-0">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareStudySetDialog;
