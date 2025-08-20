import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const Settings: React.FC = () => {
  // State for new settings (these would typically be managed via user preferences in Supabase)
  const [defaultFlashcardSide, setDefaultFlashcardSide] = useState<'term' | 'definition'>('term');
  const [confirmDeletion, setConfirmDeletion] = useState<boolean>(true);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <SettingsIcon className="mr-3 h-7 w-7" /> Settings
        </h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Adjust your application preferences here.
      </p>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </NotebookCard>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Study Preferences</CardTitle>
          <CardDescription>Configure how you prefer to study flashcards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">Default Flashcard Side</Label>
            <CardDescription className="mb-2">Choose which side of the flashcard appears first during study sessions.</CardDescription>
            <RadioGroup
              value={defaultFlashcardSide}
              onValueChange={(value: 'term' | 'definition') => setDefaultFlashcardSide(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="term" id="term-first" />
                <Label htmlFor="term-first">Term First</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="definition" id="definition-first" />
                <Label htmlFor="definition-first">Definition First</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </NotebookCard>

      <NotebookCard>
        <CardHeader>
          <CardTitle>Safety & Confirmation</CardTitle>
          <CardDescription>Manage confirmation prompts for sensitive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Require Deletion Confirmation</Label>
              <CardDescription>
                Prompt for confirmation before permanently deleting study sets or cards.
              </CardDescription>
            </div>
            <Switch
              checked={confirmDeletion}
              onCheckedChange={setConfirmDeletion}
              id="confirm-deletion"
            />
          </div>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Settings;