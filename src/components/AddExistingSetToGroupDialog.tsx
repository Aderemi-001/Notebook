import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  group_id: string | null;
}

interface AddExistingSetToGroupDialogProps {
  groupId: string;
  trigger: React.ReactNode;
  onSetAdded?: () => void;
}

const fetchAllUserStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select('id, title, description, group_id')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  if (error) {
    console.error("Error fetching all user study sets:", error);
    throw new Error("Failed to fetch your study sets.");
  }
  return data || [];
};

const AddExistingSetToGroupDialog: React.FC<AddExistingSetToGroupDialogProps> = ({ groupId, trigger, onSetAdded }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: allUserSets, isLoading, isError, error } = useQuery<StudySet[], Error>({
    queryKey: ['allUserStudySets'],
    queryFn: fetchAllUserStudySets,
    enabled: open, // Only fetch when dialog is open
  });

  const filteredSets = allUserSets?.filter((set: StudySet) =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCheckboxChange = (setId: string, checked: boolean) => {
    setSelectedSetIds((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(setId);
      } else {
        newSet.delete(setId);
      }
      return newSet;
    });
  };

  const handleAddSelectedSets = async () => {
    if (selectedSetIds.size === 0) {
      showError("Please select at least one set to add.");
      return;
    }

    setIsUpdating(true);
    const toastId = showLoading(`Adding ${selectedSetIds.size} set(s) to group...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const updates = Array.from(selectedSetIds).map(setId => {
        const selectedSet = allUserSets?.find((set: StudySet) => set.id === setId);
        if (!selectedSet) {
          throw new Error(`Selected set with ID ${setId} not found in fetched data.`);
        }
        return {
          id: selectedSet.id,
          title: selectedSet.title, // Include existing title
          description: selectedSet.description, // Include existing description
          group_id: groupId,
          user_id: user.id,
        };
      });

      const { error: updateError } = await supabase
        .from('study_sets')
        .upsert(updates, { onConflict: 'id' }); // Upsert to update existing rows

      if (updateError) throw updateError;

      dismissToast(toastId);
      showSuccess(`${selectedSetIds.size} set(s) added to group successfully!`);
      queryClient.invalidateQueries({ queryKey: ['studySetsInGroup', groupId] }); // Invalidate sets in this specific group
      queryClient.invalidateQueries({ queryKey: ['studySets'] }); // Invalidate all study sets (for Index page)
      queryClient.invalidateQueries({ queryKey: ['allUserStudySets'] }); // Invalidate this dialog's data
      setSelectedSetIds(new Set()); // Clear selection
      setOpen(false); // Close dialog
      onSetAdded?.(); // Callback if provided
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to add sets to group.");
      console.error("Add sets to group error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Existing Sets to Group</DialogTitle>
          <DialogDescription>
            Select study sets from your collection to add to this group.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="mb-4">
            <Label htmlFor="add-set-search" className="sr-only">Search sets</Label>
            <Input
              id="add-set-search"
              type="text"
              placeholder="Search sets..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <ScrollArea className="flex-grow pr-4 -mr-4"> {/* Added negative margin to counteract padding */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="text-center text-red-500">
                Error loading sets: {error?.message || "Unknown error"}
              </div>
            ) : filteredSets?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No sets found matching your search.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSets?.map((set: StudySet) => (
                  <div
                    key={set.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-md",
                      selectedSetIds.has(set.id) ? "bg-primary/10 border-primary" : "bg-background"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`set-${set.id}`}
                        checked={selectedSetIds.has(set.id)}
                        onCheckedChange={(checked: boolean) => handleCheckboxChange(set.id, checked)}
                      />
                      <Label htmlFor={`set-${set.id}`} className="cursor-pointer">
                        <span className="font-medium">{set.title}</span>
                        {set.group_id && set.group_id !== groupId && (
                          <span className="text-sm text-muted-foreground ml-2">(Currently in another group)</span>
                        )}
                        {!set.group_id && (
                          <span className="text-sm text-muted-foreground ml-2">(No group)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSelectedSets} disabled={selectedSetIds.size === 0 || isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Selected ({selectedSetIds.size})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExistingSetToGroupDialog;