import * as React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Settings as SettingsIcon, Volume2, Headphones, Sparkles, ShieldCheck, Download, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings: React.FC = () => {
  const { preferences, isLoading, isError, error, updatePreferences } = useUserPreferences();
  const { t, setLanguage } = useLanguage();

  // Initialize local state with fetched preferences or defaults
  const [defaultFlashcardSide, setDefaultFlashcardSide] = React.useState<'term' | 'definition'>('term');
  const [confirmDeletion, setConfirmDeletion] = React.useState<boolean>(true);
  const [defaultNumExamQuestions, setDefaultNumExamQuestions] = React.useState<number>(10);
  const [defaultExamQuestionTypes, setDefaultExamQuestionTypes] = React.useState<string[]>(['multiple_choice', 'short_answer']);
  const [dailyCardsGoal, setDailyCardsGoal] = React.useState<number>(20);
  const [enableReviewReminders, setEnableReviewReminders] = React.useState<boolean>(true);
  const [defaultStudySessionCardsCount, setDefaultStudySessionCardsCount] = React.useState<number>(20);
  const [defaultCardSortOrder, setDefaultCardSortOrder] = React.useState<'next_review_at_asc' | 'alphabetical_term_asc' | 'random' | 'created_at_asc'>('next_review_at_asc');
  const [hideMasteredFromDailyReview, setHideMasteredFromDailyReview] = React.useState<boolean>(false);
  const [fontSizePreference, setFontSizePreference] = React.useState<'small' | 'medium' | 'large'>('medium');
  const [enableSoundEffects, setEnableSoundEffects] = React.useState<boolean>(true); // New state
  const [enableTTS, setEnableTTS] = React.useState<boolean>(false); // New state
  const [enableAnimations, setEnableAnimations] = React.useState<boolean>(true); // New state
  const [preferredLanguage, setPreferredLanguage] = React.useState<string>('en'); // New state

  useEffect(() => {
    if (preferences) {
      setDefaultFlashcardSide(preferences.default_flashcard_side);
      setConfirmDeletion(preferences.confirm_deletion);
      setDefaultNumExamQuestions(preferences.default_num_exam_questions);
      setDefaultExamQuestionTypes(preferences.default_exam_question_types || []);
      setDailyCardsGoal(preferences.daily_cards_goal);
      setEnableReviewReminders(preferences.enable_review_reminders);
      setDefaultStudySessionCardsCount(preferences.default_study_session_cards_count);
      setDefaultCardSortOrder(preferences.default_card_sort_order); // Set new state
      setHideMasteredFromDailyReview(preferences.hide_mastered_from_daily_review);
      setFontSizePreference(preferences.font_size_preference);
      setEnableSoundEffects(preferences.enable_sound_effects ?? true); // Set new state
      setEnableTTS(preferences.enable_tts ?? false); // Set new state
      setEnableAnimations(preferences.enable_animations ?? true); // Set new state
      setPreferredLanguage(preferences.preferred_language ?? 'en'); // Set new state
    }
  }, [preferences]);

  // Apply font size class to HTML element
  useEffect(() => {
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${fontSizePreference}`);
  }, [fontSizePreference]);

  const handleFlashcardSideChange = (value: 'term' | 'definition') => {
    setDefaultFlashcardSide(value);
    updatePreferences({ default_flashcard_side: value });
  };

  const handleConfirmDeletionChange = (checked: boolean) => {
    setConfirmDeletion(checked);
    updatePreferences({ confirm_deletion: checked });
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setDefaultNumExamQuestions(value);
    updatePreferences({ default_num_exam_questions: value });
  };

  const handleQuestionTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...defaultExamQuestionTypes, type]
      : defaultExamQuestionTypes.filter((t: string) => t !== type);
    setDefaultExamQuestionTypes(newTypes);
    updatePreferences({ default_exam_question_types: newTypes });
  };

  const handleDailyCardsGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setDailyCardsGoal(value);
    updatePreferences({ daily_cards_goal: value });
  };

  const handleEnableReviewRemindersChange = (checked: boolean) => {
    setEnableReviewReminders(checked);
    updatePreferences({ enable_review_reminders: checked });
  };

  const handleDefaultStudySessionCardsCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setDefaultStudySessionCardsCount(value);
    updatePreferences({ default_study_session_cards_count: value });
  };

  const handleDefaultCardSortOrderChange = (value: 'next_review_at_asc' | 'alphabetical_term_asc' | 'random' | 'created_at_asc') => {
    setDefaultCardSortOrder(value);
    updatePreferences({ default_card_sort_order: value });
  };

  const handleHideMasteredFromDailyReviewChange = (checked: boolean) => {
    setHideMasteredFromDailyReview(checked);
    updatePreferences({ hide_mastered_from_daily_review: checked });
  };

  const handleFontSizePreferenceChange = (value: 'small' | 'medium' | 'large') => {
    setFontSizePreference(value);
    updatePreferences({ font_size_preference: value });
  };

  const handleSoundEffectsChange = (checked: boolean) => {
    setEnableSoundEffects(checked);
    updatePreferences({ enable_sound_effects: checked });
  };

  const handleTTSChange = (checked: boolean) => {
    setEnableTTS(checked);
    updatePreferences({ enable_tts: checked });
  };

  const handleAnimationsChange = (checked: boolean) => {
    setEnableAnimations(checked);
    updatePreferences({ enable_animations: checked });
  };

  const handleLanguageChange = (value: string) => {
    setPreferredLanguage(value);
    // updatePreferences({ preferred_language: value }); // Removed: Handled by setLanguage in context
    setLanguage(value as any);
  };

  const handleExportData = async () => {
    const toastId = showLoading("Preparing your data for export...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all study sets and cards
      const { data: sets, error: setsError } = await supabase
        .from('study_sets')
        .select(`
          id, title, description, is_public, created_at,
          cards (id, term, definition, is_flagged)
        `)
        .eq('user_id', user.id);

      if (setsError) throw setsError;

      const exportData = {
        app: "Notebook AI",
        version: "3.0",
        exportDate: new Date().toISOString(),
        user_id: user.id,
        study_sets: sets || []
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notebook-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dismissToast(toastId);
      showSuccess("Data exported successfully!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Export failed: ${err.message}`);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("No user email found");

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      showSuccess("Password reset email sent!");
    } catch (err: any) {
      showError(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <div className="space-y-6">
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-32 w-full" /></Card>
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-32 w-full" /></Card>
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-48 w-full" /></Card>
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-24 w-full" /></Card>
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-24 w-full" /></Card>
          <Card className="glass-card shadow-premium rounded-[2.5rem]"><Skeleton className="h-24 w-full" /></Card>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading settings: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <SettingsIcon className="mr-3 h-7 w-7" /> {t('settings.title')}
        </h1>
        <Button asChild variant="outline">
          <Link to="/profile" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('settings.backToProfile')}
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        {t('settings.description')}
      </p>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.appearance.title')}</CardTitle>
          <CardDescription>{t('settings.appearance.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemeToggle />
          <div>
            <Label htmlFor="font-size-preference">{t('settings.appearance.fontSize')}</Label>
            <Select onValueChange={handleFontSizePreferenceChange} value={fontSizePreference}>
              <SelectTrigger id="font-size-preference" className="w-full">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('settings.appearance.sizes.small')}</SelectItem>
                <SelectItem value="medium">{t('settings.appearance.sizes.medium')}</SelectItem>
                <SelectItem value="large">{t('settings.appearance.sizes.large')}</SelectItem>
              </SelectContent>
            </Select>
            <CardDescription className="mt-2">
              {t('settings.appearance.fontSizeDesc')}
            </CardDescription>
          </div>
          <div className="pt-2">
            <Label htmlFor="preferred-language" className="flex items-center gap-2">
              {t('settings.appearance.language')}
            </Label>
            <Select onValueChange={handleLanguageChange} value={preferredLanguage}>
              <SelectTrigger id="preferred-language" className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (US)</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
            <CardDescription className="mt-2">
              {t('settings.appearance.languageDesc')}
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.study.title')}</CardTitle>
          <CardDescription>{t('settings.study.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">{t('settings.study.flashcardSide')}</Label>
            <CardDescription className="mb-2">{t('settings.study.flashcardSideDesc')}</CardDescription>
            <RadioGroup
              value={defaultFlashcardSide}
              onValueChange={handleFlashcardSideChange}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="term" id="term-first" />
                <Label htmlFor="term-first">{t('settings.study.termFirst')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="definition" id="definition-first" />
                <Label htmlFor="definition-first">{t('settings.study.defFirst')}</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="default-study-session-cards-count">{t('settings.study.cardsPerSession')}</Label>
            <Input
              id="default-study-session-cards-count"
              type="number"
              min="1"
              value={defaultStudySessionCardsCount}
              onChange={handleDefaultStudySessionCardsCountChange}
              placeholder="e.g., 20"
            />
            <CardDescription className="mt-2">
              {t('settings.study.cardsPerSessionDesc')}
            </CardDescription>
          </div>
          <div>
            <Label htmlFor="default-card-sort-order">{t('settings.study.sortOrder')}</Label>
            <Select onValueChange={handleDefaultCardSortOrderChange} value={defaultCardSortOrder}>
              <SelectTrigger id="default-card-sort-order" className="w-full">
                <SelectValue placeholder="Select sorting order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_review_at_asc">{t('settings.study.sortOptions.nextReview')}</SelectItem>
                <SelectItem value="alphabetical_term_asc">{t('settings.study.sortOptions.alphabetical')}</SelectItem>
                <SelectItem value="random">{t('settings.study.sortOptions.random')}</SelectItem>
                <SelectItem value="created_at_asc">{t('settings.study.sortOptions.created')}</SelectItem>
              </SelectContent>
            </Select>
            <CardDescription className="mt-2">
              {t('settings.study.sortOrderDesc')}
            </CardDescription>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{t('settings.study.hideMastered')}</Label>
              <CardDescription>
                {t('settings.study.hideMasteredDesc')}
              </CardDescription>
            </div>
            <Switch
              checked={hideMasteredFromDailyReview}
              onCheckedChange={handleHideMasteredFromDailyReviewChange}
              id="hide-mastered"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.feedback.title')}</CardTitle>
          <CardDescription>{t('settings.feedback.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4" /> {t('settings.feedback.soundEffects')}
              </Label>
              <CardDescription>{t('settings.feedback.soundEffectsDesc')}</CardDescription>
            </div>
            <Switch
              checked={enableSoundEffects}
              onCheckedChange={handleSoundEffectsChange}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Headphones className="h-4 w-4" /> {t('settings.feedback.tts')}
              </Label>
              <CardDescription>{t('settings.feedback.ttsDesc')}</CardDescription>
            </div>
            <Switch
              checked={enableTTS}
              onCheckedChange={handleTTSChange}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> {t('settings.feedback.animations')}
              </Label>
              <CardDescription>{t('settings.feedback.animationsDesc')}</CardDescription>
            </div>
            <Switch
              checked={enableAnimations}
              onCheckedChange={handleAnimationsChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.exam.title')}</CardTitle>
          <CardDescription>{t('settings.exam.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-num-questions">{t('settings.exam.numQuestions')}</Label>
            <Input
              id="default-num-questions"
              type="number"
              min="1"
              value={defaultNumExamQuestions}
              onChange={handleNumQuestionsChange}
              placeholder="e.g., 10"
            />
          </div>
          <div>
            <Label>{t('settings.exam.questionTypes')}</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-mcq"
                  checked={defaultExamQuestionTypes.includes('multiple_choice')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('multiple_choice', checked)}
                />
                <Label htmlFor="default-mcq">{t('settings.exam.types.mcq')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-sa"
                  checked={defaultExamQuestionTypes.includes('short_answer')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('short_answer', checked)}
                />
                <Label htmlFor="default-sa">{t('settings.exam.types.sa')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default-tf"
                  checked={defaultExamQuestionTypes.includes('true_false')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('true_false', checked)}
                />
                <Label htmlFor="default-tf">{t('settings.exam.types.tf')}</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.goals.title')}</CardTitle>
          <CardDescription>{t('settings.goals.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="daily-cards-goal">{t('settings.goals.dailyCards')}</Label>
            <Input
              id="daily-cards-goal"
              type="number"
              min="1"
              value={dailyCardsGoal}
              onChange={handleDailyCardsGoalChange}
              placeholder="e.g., 20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.notifications.title')}</CardTitle>
          <CardDescription>{t('settings.notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{t('settings.notifications.enableReminders')}</Label>
              <CardDescription>
                {t('settings.notifications.enableRemindersDesc')}
              </CardDescription>
            </div>
            <Switch
              checked={enableReviewReminders}
              onCheckedChange={handleEnableReviewRemindersChange}
              id="enable-reminders"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.security.title')}</CardTitle>
          <CardDescription>{t('settings.security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handlePasswordReset}>
            <Lock className="h-4 w-4" /> {t('settings.security.resetPassword')}
          </Button>
          <p className="text-[10px] text-muted-foreground px-1">
            {t('settings.security.resetPasswordDesc')}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6">
        <CardHeader>
          <CardTitle>{t('settings.data.title')}</CardTitle>
          <CardDescription>{t('settings.data.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExportData}>
            <Download className="h-4 w-4" /> {t('settings.data.export')}
          </Button>
          <CardDescription className="px-1 text-xs">
            {t('settings.data.exportDesc')}
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem]">
        <CardHeader>
          <CardTitle>{t('settings.safety.title')}</CardTitle>
          <CardDescription>{t('settings.safety.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t('settings.safety.confirmDeletion')}
              </Label>
              <CardDescription>
                {t('settings.safety.confirmDeletionDesc')}
              </CardDescription>
            </div>
            <Switch
              checked={confirmDeletion}
              onCheckedChange={handleConfirmDeletionChange}
              id="confirm-deletion"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-premium rounded-[2.5rem]">
        <CardHeader>
          <CardTitle>{t('settings.legal.title')}</CardTitle>
          <CardDescription>{t('settings.legal.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/terms">
              {t('settings.legal.terms')}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/privacy">
              {t('settings.legal.privacy')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;