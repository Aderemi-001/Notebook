import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudySetGroup, useCreateStudySetGroup } from '@/hooks/use-study-set-groups';
import { Plus } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface StudySetFormFieldsProps {
  form: UseFormReturn<any>;
  userGroups: StudySetGroup[] | undefined;
  isLoadingGroups: boolean;
}

const StudySetFormFields: React.FC<StudySetFormFieldsProps> = ({ form, userGroups, isLoadingGroups }) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const createGroup = useCreateStudySetGroup();

  const handleGroupChange = (value: string) => {
    if (value === "create-new") {
      setIsDialogOpen(true);
      return;
    }
    form.setValue("group_id", value === "null" ? null : value);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      showError("Group name cannot be empty");
      return;
    }
    createGroup.mutate(newGroupName, {
      onSuccess: (data) => {
        showSuccess(`Group "${data.name}" created!`);
        setIsDialogOpen(false);
        setNewGroupName("");
        // Auto-select the new group
        form.setValue("group_id", data.id);
      },
      onError: (error) => {
        showError(error.message || "Failed to create group");
      }
    });
  };

  return (
    <>
      <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20">
        <CardHeader>
          <CardTitle>Set Details</CardTitle>
          <CardDescription>Give your study set a title, description, and configure its visibility.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Biology Chapter 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of your study set." {...field} className="min-h-[120px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4">
            <FormField
              control={form.control}
              name="group_id"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Group (Optional)</FormLabel>
                  <Select onValueChange={handleGroupChange} value={field.value || "null"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">No Group</SelectItem>
                      {isLoadingGroups ? (
                        <SelectItem disabled value="loading">Loading groups...</SelectItem>
                      ) : (
                        <>
                          {userGroups?.length === 0 && <SelectItem disabled value="no-groups">No groups available</SelectItem>}
                          {userGroups?.map((group: StudySetGroup) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="create-new" className="text-indigo-600 font-medium cursor-pointer">
                            <div className="flex items-center">
                              <Plus className="w-4 h-4 mr-2" /> Create New Group
                            </div>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Organize this study set into a group.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <FormField
              control={form.control}
              name="is_public"
              render={({ field }: { field: any }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Make Public</FormLabel>
                    <FormDescription>
                      Allow other users to view and study this set.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize your study sets.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateGroup();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} disabled={createGroup.isPending}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudySetFormFields;