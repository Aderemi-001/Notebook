import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import StudySetFormFields from "@/components/StudySetFormFields";
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";
import { useFileImport } from "@/hooks/use-file-import";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { studySetService } from "@/services/studySetService";
import { useSubscription } from "@/hooks/useSubscription";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
  group_id: z.string().nullable().optional(),
  cards: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })).min(1, "You must have at least one card."),
});

const CreateSet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { file, setFile, sourceTextContent, setSourceTextContent, generateCardsAndConcepts, currentUser, isLoadingUser, progressState, progressMessage } = useFileImport();
  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();
  const { isPremium } = useSubscription();

  const [showSuccessToastAfterRender, setShowSuccessToastAfterRender] = useState(false);
  const [generatedCardConceptLinks, setGeneratedCardConceptLinks] = useState<{ card_term: string; concept_name: string }[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: (location.state as { groupId?: string })?.groupId || null,
      cards: [],
    },
  });

  useEffect(() => {
    if (showSuccessToastAfterRender && form.getValues('cards').length > 0) {
      showSuccess(`${form.getValues('cards').length} cards imported successfully!`);
      setShowSuccessToastAfterRender(false);
    }
  }, [form.watch('cards'), showSuccessToastAfterRender]);

  // Convenience: Auto-Title from File
  useEffect(() => {
    if (file && !form.getValues('title')) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      // Capitalize first letter and replace hyphens/underscores with spaces for convenience
      const formattedTitle = fileName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());

      form.setValue('title', formattedTitle);
    }
  }, [file]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) {
      showError("Please sign up or log in first to save your study set.");
      navigate('/login');
      return;
    }

    const toastId = showLoading("Saving your study set...");

    try {
      // Filter out completely empty rows (both term and definition are empty)
      const nonEmptyCards = values.cards.filter(card => card.term.trim() !== "" || card.definition.trim() !== "");

      if (nonEmptyCards.length === 0) {
        dismissToast(toastId);
        showError("You must have at least one card with content.");
        return;
      }

      // Check for partially filled rows
      const invalidCards = nonEmptyCards.filter(card => !card.term.trim() || !card.definition.trim());
      if (invalidCards.length > 0) {
        dismissToast(toastId);
        showError("All cards must have both a term and a definition. Please check your entries.");
        return;
      }

      const newSet = await studySetService.createSetWithCards(
        {
          title: values.title,
          description: values.description,
          is_public: values.is_public,
          group_id: values.group_id,
          source_text: sourceTextContent
        },
        nonEmptyCards,
        generatedCardConceptLinks
      );

      dismissToast(); // Dismiss all toasts to be safe
      showSuccess("Set created successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      queryClient.invalidateQueries({ queryKey: ['studySetsInGroup'] });
      // Invalidate cognitiveConstellation as well since we might have added links
      queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });

      navigate(`/sets/${newSet.id}`);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to create set.");
      console.error(error);
    }
  }

  function onError(errors: any) {
    console.error('Form validation errors:', errors);

    // Check if it's a cards validation error
    if (errors.cards) {
      if (errors.cards.message) {
        showError(errors.cards.message);
      } else if (Array.isArray(errors.cards)) {
        // Show first card error
        const firstError = errors.cards.find((e: any) => e);
        if (firstError?.term) {
          showError(`Card error: ${firstError.term.message}`);
        } else if (firstError?.definition) {
          showError(`Card error: ${firstError.definition.message}`);
        } else {
          showError("Please check your flashcards for empty fields.");
        }
      } else {
        showError("Please check your flashcards for empty fields.");
      }
    } else {
      showError("Please fix the errors before submitting.");
    }
  }

  const handleGenerateCards = async () => {
    if (!file) {
      showError("Please select a file first.");
      return;
    }
    if (!currentUser) {
      showError("Please sign up or log in first to use AI features.");
      navigate('/login');
      return;
    }

    console.log('DEBUG: CLICK generate. File:', file?.name, 'User:', currentUser?.id);
    const result = await generateCardsAndConcepts();
    console.log('DEBUG: Generator Result:', result);

    if (result && result.cards.length > 0) {
      // Filter out cards with empty terms or definitions
      const validCards = result.cards.filter((card: { term: string; definition: string }) =>
        card.term?.trim() && card.definition?.trim()
      );

      if (validCards.length > 0) {
        form.setValue('cards', validCards.map((card: { term: string; definition: string }) => ({
          term: card.term.trim(),
          definition: card.definition.trim()
        })));
        setGeneratedCardConceptLinks(result.card_concept_links || []);
        setShowSuccessToastAfterRender(true);

        // Show upgrade prompt for free users
        if (!isPremium && validCards.length >= 10) {
          setTimeout(() => {
            showError("Free tier: 10 cards generated. Upgrade to Pro for up to 50 cards per generation!");
          }, 1500);
        }
      } else {
        showError("The AI generated cards, but they all had empty fields. Please try again or add cards manually.");
        form.setValue('cards', [{ term: "", definition: "" }]);
      }
    } else if (result && result.cards.length === 0) {
      // Only show this error if we got a result but no cards (AI processing issue)
      if (progressState !== 'error') {
        const currentCards = form.getValues('cards');
        if (currentCards.length === 0 || (currentCards.length === 1 && !currentCards[0].term)) {
          form.setValue('cards', [{ term: "", definition: "" }]);
        }
        showError("The AI couldn't find any terms and definitions in the file.");
      }
    }
    // If result is null, the hook already showed the appropriate error (limit, auth, etc.)
  };

  const getProgressValue = () => {
    switch (progressState) {
      case 'idle': return 0;
      case 'extracting': return 30;
      case 'processing': return 70;
      case 'complete': return 100;
      case 'error': return 100;
      default: return 0;
    }
  };

  if (isLoadingUser || isLoadingGroups) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen loading overlay for large file processing */}
      {(progressState === 'extracting' || progressState === 'processing') && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 h-16 w-16 animate-ping opacity-20 bg-primary rounded-full" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Processing Your File</h3>
                <p className="text-sm text-muted-foreground animate-pulse">{progressMessage}</p>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${getProgressValue()}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Large files may take a minute. Please don't close this tab.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 border-b pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold">Create a new study set</h1>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/sets" className="flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Link>
                </Button>
                <Button type="submit" disabled={isLoadingUser || !currentUser} className="shadow-premium">
                  {isLoadingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !currentUser ? (
                    "Sign In"
                  ) : (
                    "Create Set"
                  )}
                </Button>
              </div>
            </div>
            <StudySetFormFields form={form} userGroups={userGroups} isLoadingGroups={isLoadingGroups} />

            <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-bold">
                    Import from file with Nova
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf,.pptx,.docx,image/*"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFile(e.target.files ? e.target.files[0] : null);
                        setSourceTextContent(null); // Clear previous text to force re-extraction
                        setGeneratedCardConceptLinks([]);
                      }}
                      className="w-full bg-background border-dashed border-2 hover:border-primary/50 transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-2 px-1">
                      Supported: PDF, PPTX (Slides), DOCX, Images (OCR), MD, TXT, CSV, JSON, Code
                    </p>
                  </div>

                  {progressState !== 'idle' && (
                    <div className="space-y-2 animate-fade-in relative overflow-hidden rounded-full h-2 bg-secondary">
                      {/* Indeterminate Scanning Bar for AI feel */}
                      <div
                        className={cn(
                          "absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full",
                          (progressState === 'extracting' || progressState === 'processing') ? "animate-indeterminate-progress" : "",
                          progressState === 'complete' ? "w-full transition-all duration-500" : "",
                          progressState === 'error' ? "bg-red-500 w-full" : ""
                        )}
                        style={progressState === 'complete' ? { width: '100%' } : {}}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground pt-3 px-1">
                        <span className="animate-pulse">{progressMessage}</span>
                        <span>{getProgressValue()}%</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleGenerateCards}
                    disabled={!file || isLoadingUser || progressState === 'extracting' || progressState === 'processing' || !currentUser}
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-all duration-300 shadow-md"
                  >
                    {progressState === 'extracting' || progressState === 'processing' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate Flashcards with Nova
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <FlashcardEditor form={form} />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoadingUser || !currentUser}>
                {isLoadingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading User...
                  </>
                ) : !currentUser ? (
                  "Sign In to Create Set"
                ) : (
                  "Create Set"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};

export default CreateSet;