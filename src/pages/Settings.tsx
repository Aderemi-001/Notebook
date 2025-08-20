import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Settings: React.FC = () => {
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

      {/* Placeholder for future settings */}
      <NotebookCard>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Future general settings will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No additional settings available yet.</p>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Settings;