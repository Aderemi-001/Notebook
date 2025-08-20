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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const Settings: React.FC = () => {
  // State for existing settings
  const [defaultFlashcardSide, setDefaultFlashcardSide] = useState<'term' | 'definition'>('term');
  const [confirmDeletion, setConfirmDeletion] = useState<boolean>(true);

  // State for new settings
  const [defaultNumExamQuestions, setDefaultNumExamQuestions] = useState<number>(10);
  const [defaultExamQuestionTypes, setDefaultExamQuestionTypes] = useState<string[]>(['multiple_choice', 'short_answer']);
  const [dailyCardsGoal, setDailyCardsGoal] = useState<number>(20);
  const [enableReviewReminders, setEnableReviewReminders] = useState<boolean>(true);

  const handleQuestionTypeChange = (type: string, checked: boolean) => {
    setDefaultExamQuestionTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

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

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Exam Generation Preferences</CardTitle>
          <CardDescription>Set default options for generating new exams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-num-questions">Default Number of Questions</Label>
            <Input
              id="default-num-questions"
              type="number"
              min="1"
              value={defaultNumExamQuestions}
              onChange={(e) => setDefaultNumExamQuestions(parseInt(e.target.value) || 0)}
              placeholder="e.g., 10"
            />
          </div>
          <div>
            <Label>Default Question Types</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-mcq"
                  checked={defaultExamQuestionTypes.includes('multiple_choice')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('multiple_choice', checked)}
                />
                <Label htmlFor="default-mcq">Multiple Choice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-sa"
                  checked={defaultExamQuestionTypes.includes('short_answer')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('short_answer', checked)}
                />
                <Label htmlFor="default-sa">Short Answer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-tf"
                  checked={defaultExamQuestionTypes.includes('true_false')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('true_false', checked)}
                />
                <Label htmlFor="default-tf">True/False</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </NotebookCard>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Study Goals</CardTitle>
          <CardDescription>Set your daily learning targets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="daily-cards-goal">Daily Cards to Review</Label>
            <Input
              id="daily-cards-goal"
              type="number"
              min="1"
              value={dailyCardsGoal}
              onChange={(e) => setDailyCardsGoal(parseInt(e.target.value) || 0)}
              placeholder="e.g., 20"
            />
          </div>
        </CardContent>
      </NotebookCard>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage your notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Review Reminders</Label>
              <CardDescription>
                Receive notifications when cards are due for review.
              </CardDescription>
            </div>
            <Switch
              checked={enableReviewReminders}
              onCheckedChange={setEnableReviewReminders}
              id="enable-reminders"
            />
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