import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as pdfjsLib from 'pdfjs-dist';
import StudySetFormFields from "@/components/StudySetFormFields";
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
  group_id: z.string().nullable().optional(),
  cards: z.array(z.object({
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

const CreateSet = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceTextContent, setSourceTextContent] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: (location.state as { groupId?: string })?.groupId || null,
      cards: [{ term: "", definition: "" }],
    },
  });

  const { append } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const toastId = showLoading("Saving your study set...");

    try {
      if (!currentUser) {
        throw new Error("You must be logged in to create a set.");
      }

      const { data: set, error: setError } = await supabase
        .from('study_sets')
        .insert({
          title: values.title,
          description: values.description,
          user_id: currentUser.id,
          source_text: sourceTextContent,
          is_public: values.is_public,
          group_id: values.group_id,
        })
        .select()
        .single();

      if (setError) throw setError;

      const cardsToInsert = values.cards.map(card => ({
        set_id: set.id,
        term: card.term,
        definition: card.definition,
      }));

      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      dismissToast(toastId);
      showSuccess("Set created successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      queryClient.invalidateQueries({ queryKey: ['studySetsInGroup'] });
      navigate('/');

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to create set.");
      console.error(error);
    }
  }

  function onError(errors: any) {
    console.error(errors);
    showError("Please fix the errors before submitting.");
  }

  const handleFileImport = async () => {
    if (!file) {
      showError("Please select a file first.");
      return;
    }

    if (!currentUser) {
      showError("You must be logged in to import a file.");
      return;
    }

    const toastId = showLoading("AI is generating your flashcards, concepts, and relationships...");
    let extractedFileContent = "";

    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        await new Promise<void>((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
              const loadingTask = pdfjsLib.getDocument({ data: pdfData });
              const pdf = await loadingTask.promise;
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                extractedFileContent += textContent.items.map((item: any) => item.str).join(' ') + '\n';
              }
              resolve();
            } catch (pdfError) {
              console.error("Error parsing PDF:", pdfError);
              reject(new Error("Failed to parse PDF file. It might be corrupted or unsupported."));
            }
          };
          reader.onerror = (err) => reject(err);
        });
      } else if (file.type.startsWith("text/") || 
                 file.name.endsWith('.md') || 
                 file.name.endsWith('.csv') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.xml') ||
                 file.name.endsWith('.html') ||
                 file.name.endsWith('.js') ||
                 file.name.endsWith('.ts') ||
                 file.name.endsWith('.css')
      ) {
          extractedFileContent = await file.text();
      } else {
          throw new Error(`Unsupported file type: ${file.type}. Please use .txt, .csv, .md, .json, .xml, .html, .js, .ts, .css, or .pdf.`);
      }

      if (!extractedFileContent.trim()) {
          throw new Error("Could not extract any text from the file.");
      }

      setSourceTextContent(extractedFileContent);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please try logging in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/process-file`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
          },
          body: JSON.stringify({ content: extractedFileContent }),
        }
      );
      
      const data = await response.json();
      
      dismissToast(toastId);

      if (!response.ok || data.error) {
        throw new Error(data?.error || "Failed to process file.");
      }
      
      const newCards = data.cards;
      const newConcepts = data.concepts;
      const newRelationships = data.relationships;

      if (!newCards || newCards.length === 0) {
        showError("The AI couldn't find any terms and definitions in the file.");
        return;
      }

      form.setValue('cards', newCards, { shouldValidate: true });
      showSuccess(`${newCards.length} cards imported successfully!`);

      if (newConcepts && newConcepts.length > 0) {
        const conceptNameToIdMap = new Map<string, string>();

        for (const concept of newConcepts) {
          const { data: existingConcept, error: fetchConceptError } = await supabase
            .from('concepts')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('name', concept.name)
            .single();

          if (fetchConceptError && fetchConceptError.code !== 'PGRST116') {
            console.error("Error fetching existing concept:", fetchConceptError);
            continue;
          }

          let conceptId: string;
          if (existingConcept) { // Corrected variable name
            conceptId = existingConcept.id;
          } else {
            const { data: insertedConcept, error: insertConceptError } = await supabase
              .from('concepts')
              .insert({ user_id: currentUser.id, name: concept.name, description: concept.description })
              .select('id')
              .single();
            if (insertConceptError) {
              console.error("Error inserting concept:", insertConceptError);
              continue;
            }
            conceptId = insertedConcept.id;
          }
          conceptNameToIdMap.set(concept.name, conceptId);
        }

        if (newRelationships && newRelationships.length > 0) {
          const relationshipsToInsert = [];
          for (const rel of newRelationships) {
            const sourceId = conceptNameToIdMap.get(rel.source_name);
            const targetId = conceptNameToIdMap.get(rel.target_name);
            if (sourceId && targetId) {
              relationshipsToInsert.push({
                user_id: currentUser.id,
                source_concept_id: sourceId,
                target_concept_id: targetId,
                type: rel.type,
                strength: rel.strength || 0.5,
              });
            }
          }

          if (relationshipsToInsert.length > 0) {
            const { error: insertRelError } = await supabase
              .from('concept_relationships')
              .upsert(relationshipsToInsert, { onConflict: 'user_id,source_concept_id,target_concept_id,type' });
            if (insertRelError) {
              console.error("Error inserting relationships:", insertRelError);
            } else {
              showSuccess(`${relationshipsToInsert.length} relationships processed.`);
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
      }

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "An unexpected error occurred.");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create a new study set</h1>
        <Button asChild variant="outline">
          <Link to="/">Back to My Sets</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <StudySetFormFields form={form} userGroups={userGroups} isLoadingGroups={isLoadingGroups} />

          <NotebookCard>
            <CardHeader>
              <CardTitle>Import from file with AI</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Input 
                type="file" 
                accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full sm:w-auto flex-grow"
              />
              <Button 
                type="button" 
                onClick={handleFileImport} 
                disabled={!file || isLoadingUser || !currentUser} 
                className="w-full sm:w-auto"
              >
                {isLoadingUser ? "Loading user..." : "Import with AI"}
              </Button>
            </CardContent>
          </NotebookCard>

          <FlashcardEditor form={form} />

          <div className="flex justify-end">
            <Button type="submit">Create Set</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateSet;