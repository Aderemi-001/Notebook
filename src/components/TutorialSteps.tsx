import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Lightbulb, BookOpen, Brain, NotebookText, Globe, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStepProps {
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}

const TutorialStep: React.FC<TutorialStepProps> = ({ title, description, icon, className }) => (
  <NotebookCard className={cn("h-full flex flex-col", className)}>
    <CardHeader className="flex flex-row items-center gap-4 pb-4 pl-10">
      <div className="p-3 rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <CardTitle className="text-2xl">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow pl-10">
      <CardDescription className="text-base leading-relaxed">
        {description}
      </CardDescription>
    </CardContent>
  </NotebookCard>
);

interface TutorialStepsCarouselProps {
  onCompleteTutorial: () => void;
}

const TutorialSteps: React.FC<TutorialStepsCarouselProps> = ({ onCompleteTutorial }) => {
  const steps = [
    {
      title: "Welcome to My Notebook!",
      description: (
        <>
          This app helps you master new concepts through flashcards, notes, and AI-powered tools.
          Let's take a quick tour to get you started!
        </>
      ),
      icon: <Lightbulb className="h-6 w-6" />,
    },
    {
      title: "Create Study Sets",
      description: (
        <>
          Organize your learning by creating study sets. You can manually add flashcards
          (terms and definitions) or use our **AI Import** feature to generate cards,
          concepts, and relationships directly from your text or PDF files.
        </>
      ),
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Study Flashcards",
      description: (
        <>
          Dive into **Study Mode** for any set to practice your flashcards.
          The app uses a spaced repetition system (SM-2 algorithm) to optimize your learning,
          showing you cards when they're due for review. Don't forget your **Daily Review**!
        </>
      ),
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "AI-Powered Learning",
      description: (
        <>
          Beyond flashcards, leverage AI to enhance your studies:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>**Cognitive Constellation:** Visualize interconnected concepts from your imported materials.</li>
            <li>**Generate Exams:** Create custom quizzes (multiple choice, short answer, true/false) from your sets.</li>
            <li>**Generate Essay Questions:** Practice essay writing based on your concepts, with AI feedback.</li>
            <li>**Summarize Notes:** Get quick summaries of your notes.</li>
          </ul>
        </>
      ),
      icon: <Brain className="h-6 w-6" />,
    },
    {
      title: "Manage Your Notes",
      description: (
        <>
          The **My Notes** section is your digital notebook. Create rich-text notes,
          link them to study sets, and even get AI summaries to quickly grasp key information.
        </>
      ),
      icon: <NotebookText className="h-6 w-6" />,
    },
    {
      title: "Explore & Connect",
      description: (
        <>
          Discover public study sets created by other users in the **Explore Public Sets** section.
          You can add these sets to your own collection to expand your learning.
          Manage your **Profile** and **Settings** to personalize your experience.
        </>
      ),
      icon: <Globe className="h-6 w-6" />,
    },
    {
      title: "You're All Set!",
      description: (
        <>
          You're now ready to start your learning journey with My Notebook.
          Click the button below to begin creating your first study set or exploring existing features!
        </>
      ),
      icon: <CheckCircle2 className="h-6 w-6" />,
    },
  ];

  return (
    <Carousel className="w-full max-w-2xl mx-auto">
      <CarouselContent>
        {steps.map((step, index) => (
          <CarouselItem key={index} className="p-4">
            <TutorialStep
              title={step.title}
              description={step.description}
              icon={step.icon}
              className="min-h-[400px]"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      <div className="flex justify-center mt-6">
        <Button onClick={onCompleteTutorial} className="w-full max-w-xs">
          Start Learning!
        </Button>
      </div>
    </Carousel>
  );
};

export default TutorialSteps;