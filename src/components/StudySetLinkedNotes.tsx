import * as React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ChevronRight, PenTool } from 'lucide-react';
import { format } from 'date-fns';

interface LinkedNote {
  id: string;
  title: string;
  updated_at: string | null;
}

interface StudySetLinkedNotesProps {
  linkedNotes: LinkedNote[] | undefined;
  isLoadingLinkedNotes: boolean;
}

const StudySetLinkedNotes: React.FC<StudySetLinkedNotesProps> = ({ linkedNotes, isLoadingLinkedNotes }) => {
  return (
    <div className="space-y-6 mt-16 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <span className="p-2 bg-indigo-100 rounded-xl">
            <FileText className="h-6 w-6 text-indigo-600" />
          </span>
          Linked Intelligence ({linkedNotes?.length || 0})
        </h2>
        {linkedNotes && linkedNotes.length > 0 && (
          <Button asChild variant="ghost" className="rounded-xl font-black text-xs uppercase tracking-widest text-primary hover:bg-primary/10">
            <Link to="/notebook">
              Manage All Notes <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {isLoadingLinkedNotes ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-44 w-full rounded-[2rem] bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (linkedNotes?.length === 0 || !linkedNotes) ? (
        <div className="p-12 text-center glass-card rounded-[2.5rem] border-dashed border-border/60 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <PenTool className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-black mb-2">No Linked Intelligence</h3>
          <p className="text-muted-foreground max-w-xs mx-auto font-medium mb-8 leading-relaxed">
            Synthesis is key to mastery. Link a note to this set to bridge your study materials.
          </p>
          <Button asChild className="rounded-2xl px-8 py-6 shadow-premium hover:shadow-premium-hover font-bold">
            <Link to="/notebook" className="flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Open Notebook
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {linkedNotes.map((note: LinkedNote) => (
            <Link to={`/notebook/${note.id}`} key={note.id} className="group">
              <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20 hover:border-primary/30 hover:shadow-premium-hover hover:translate-y-[-4px] active:scale-[0.98] transition-all duration-300 h-full border-indigo-100/50">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  <h4 className="text-lg font-black tracking-tight mb-2 group-hover:text-primary transition-colors">
                    {note.title}
                  </h4>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Last Revised
                    </span>
                    <span className="text-xs font-bold text-foreground/70">
                      {note.updated_at ? format(new Date(note.updated_at), 'MMM d, yyyy') : 'No date'}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudySetLinkedNotes;