import * as React from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { NovaAI } from '@/utils/NovaAI';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FlashcardEditorProps {
  form: UseFormReturn<any>;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

  const adjustHeight = () => {
    const textarea = combinedRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [props.value]);

  return (
    <Textarea
      {...props}
      ref={combinedRef}
      onInput={(e) => {
        adjustHeight();
        if (props.onInput) props.onInput(e);
      }}
      className={cn("min-h-[80px] overflow-hidden resize-none transition-all duration-200", props.className)}
    />
  );
});
AutoResizeTextarea.displayName = "AutoResizeTextarea";

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  // Track loading state per card index
  const [loadingCardIndex, setLoadingCardIndex] = useState<number | null>(null);

  const handleMagicDefinition = async (index: number) => {
    const term = form.getValues(`cards.${index}.term`);
    if (!term) return;

    setLoadingCardIndex(index);
    try {
      const definition = await NovaAI.generateDefinition(term);
      form.setValue(`cards.${index}.definition`, definition);
    } catch (error) {
      console.error("Magic Def Error", error);
    } finally {
      setLoadingCardIndex(null);
    }
  };

  return (
    <NotebookCard>
      <CardHeader>
        <CardTitle>Flashcards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 border rounded-md">
            <div className="font-bold text-gray-500 mt-2 text-xs sm:text-base">{index + 1}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
              <FormField
                control={form.control}
                name={`cards.${index}.term`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`card-${index}-term`}>Term</FormLabel>
                    <FormControl>
                      <AutoResizeTextarea
                        id={`card-${index}-term`}
                        placeholder="Term"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`cards.${index}.definition`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`card-${index}-definition`} className="flex justify-between items-center">
                      <span>Definition</span>
                      <div
                        role="button"
                        onClick={() => handleMagicDefinition(index)}
                        className="text-xs flex items-center gap-1 text-indigo-500 cursor-pointer hover:text-indigo-700 transition-colors"
                        title="Auto-generate definition with Nova"
                      >
                        {loadingCardIndex === index ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Magic Define
                      </div>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AutoResizeTextarea
                          id={`card-${index}-definition`}
                          placeholder="Definition"
                          {...field}
                          className="pr-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={fields.length <= 1}
              className="mt-7"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {form.formState.errors.cards && !form.formState.errors.cards.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.cards.message as string}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ term: "", definition: "" })}
        >
          Add Card
        </Button>
      </CardContent>
    </NotebookCard>
  );
};

export default FlashcardEditor;