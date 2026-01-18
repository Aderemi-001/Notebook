export type DemoActionType =
    | 'navigate'
    | 'wait'
    | 'type'
    | 'click'
    | 'setValue'
    | 'custom'; // For things like scrolling or specific component state updates

export interface DemoStep {
    id: string;
    action: DemoActionType;
    target?: string; // Selector or path
    value?: string;
    duration?: number; // Time to wait AFTER action
    description?: string;
}

export const demoSteps: DemoStep[] = [
    // ============================================
    // SCENE 1: THE HOOK (Focus Timer)
    // ============================================
    {
        id: 'start-timer-page',
        action: 'navigate',
        target: '/focus-timer?demo=1',
        duration: 1000,
        description: 'Start at Focus Timer'
    },
    {
        id: 'zoom-timer',
        action: 'custom',
        value: 'zoom:1.1:.pomo-wrapper',
        duration: 1000,
        description: 'Camera Zoom In'
    },
    {
        id: 'ensure-sound-on',
        action: 'custom',
        value: 'set-sound-on',
        duration: 500,
        description: 'Ensure Sound is On'
    },
    {
        id: 'setup-timer-5s',
        action: 'custom',
        value: 'set-timer-5s',
        duration: 500,
        description: 'Set Timer to 5s'
    },
    {
        id: 'click-start-timer',
        action: 'click',
        target: '.pomo-controls button:first-child',
        duration: 5500,
        description: 'Click Start Timer'
    },
    {
        id: 'logout-immediately',
        action: 'custom',
        value: 'logout',
        duration: 500,
        description: 'Log out immediately after timer'
    },

    // ============================================
    // SCENE 2: THE ENTRY (Login)
    // ============================================
    {
        id: 'reset-zoom-login',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset Camera'
    },
    {
        id: 'go-to-login',
        action: 'navigate',
        target: '/login',
        duration: 1000,
        description: 'Navigate to login'
    },
    {
        id: 'zoom-login-form',
        action: 'custom',
        value: 'zoom:1.1:form',
        duration: 800,
        description: 'Focus on Login Form'
    },
    {
        id: 'type-email',
        action: 'type',
        target: 'input[name="email"]',
        value: 'my.notebook.by.remi@gmail.com',
        duration: 800,
        description: 'Type Email'
    },
    {
        id: 'type-password',
        action: 'type',
        target: 'input[type="password"]',
        value: '20051204Aa',
        duration: 800,
        description: 'Type Password'
    },
    {
        id: 'click-login',
        action: 'click',
        target: 'button[type="submit"]',
        duration: 3500,
        description: 'Submit Login'
    },

    // ============================================
    // SCENE 3: DASHBOARD & CREATION
    // ============================================
    {
        id: 'dashboard-reset',
        action: 'custom',
        value: 'zoom:1',
        duration: 1000,
        description: 'Full Dashboard View'
    },
    {
        id: 'dashboard-zoom-stats',
        action: 'custom',
        value: 'zoom:1.15:.grid.gap-4',
        duration: 2500,
        description: 'Admire Stats'
    },
    {
        id: 'go-to-create',
        action: 'navigate',
        target: '/create',
        duration: 1500,
        description: 'Go to Create page'
    },
    {
        id: 'reset-zoom-create',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset'
    },
    {
        id: 'zoom-title-input',
        action: 'custom',
        value: 'zoom:1.2:input[name="title"]',
        duration: 800,
        description: 'Focus on Title'
    },
    {
        id: 'type-set-title',
        action: 'type',
        target: 'input[name="title"]',
        value: 'Week 4: Antiepileptics',
        duration: 1000,
        description: 'Name the set'
    },
    {
        id: 'zoom-ai-section',
        action: 'custom',
        value: 'zoom:1.1:.glass-card',
        duration: 1000,
        description: 'Focus on AI'
    },
    {
        id: 'upload-file',
        action: 'custom',
        value: 'simulate-file-upload',
        duration: 2000,
        description: 'Simulate uploading Notebook App User Guide.pdf'
    },
    {
        id: 'reset-zoom-submit',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset for submit'
    },
    {
        id: 'submit-create',
        action: 'click',
        target: 'button[type="submit"]',
        duration: 3000,
        description: 'Create the set'
    },

    // ============================================
    // SCENE 4: STUDY (Flashcards)
    // ============================================
    {
        id: 'open-first-set',
        action: 'custom',
        value: 'click-text:Week 4: Antiepileptics',
        duration: 2500,
        description: 'Open the new set'
    },
    {
        id: 'zoom-flashcard',
        action: 'custom',
        value: 'zoom:1.1:.flashcard',
        duration: 1000,
        description: 'Zoom to Card'
    },
    {
        id: 'flip-card',
        action: 'click',
        target: '.flashcard-inner',
        duration: 2000,
        description: 'Flip card'
    },
    {
        id: 'rate-recall',
        action: 'click',
        target: 'button:has(.lucide-check)',
        duration: 1500,
        description: 'Rate card'
    },

    // ============================================
    // SCENE 5: NOTEBOOK (Rich Text + Handwriting)
    // ============================================
    {
        id: 'reset-zoom-notebook',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset'
    },
    {
        id: 'go-to-notebook',
        action: 'navigate',
        target: '/notebook',
        duration: 2000,
        description: 'Go to Notebook'
    },
    {
        id: 'zoom-editor',
        action: 'custom',
        value: 'zoom:1.1:.ProseMirror',
        duration: 1000,
        description: 'Focus on writing'
    },
    {
        id: 'type-welcome',
        action: 'type',
        target: '.ProseMirror',
        value: 'Pharmacology: Mechanism of Action. ',
        duration: 2500,
        description: 'Type header'
    },
    {
        id: 'switch-to-canvas',
        action: 'click',
        target: 'button[title="Switch to Canvas"]',
        duration: 1500,
        description: 'Switch to Canvas'
    },
    {
        id: 'select-pen',
        action: 'click',
        target: 'button[title*="Pen"]',
        duration: 1000,
        description: 'Select Pen'
    },
    {
        id: 'zoom-canvas',
        action: 'custom',
        value: 'zoom:1.2:canvas',
        duration: 1000,
        description: 'Zoom to Canvas'
    },
    {
        id: 'draw-doodle',
        action: 'custom',
        value: 'draw-doodle',
        duration: 3500,
        description: 'Draw shapes and lines'
    },
    {
        id: 'pause-admire-doodle',
        action: 'wait',
        duration: 1500,
        description: 'Admire drawing'
    },
    {
        id: 'handwrite-confirmation',
        action: 'custom',
        value: 'handwrite-text:Yea i can do this too',
        duration: 3000,
        description: 'Handwrite "Yea i can do this too"'
    },
    {
        id: 'reset-zoom-link',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset zoom'
    },
    {
        id: 'open-link-dialog',
        action: 'click',
        target: 'button[role="combobox"]',
        duration: 1000,
        description: 'Open Link to Set dialog'
    },
    {
        id: 'select-antiepileptics-set',
        action: 'custom',
        value: 'click-text:Week 4: Antiepileptics',
        duration: 1500,
        description: 'Select Week 4: Antiepileptics set'
    },

    // ============================================
    // SCENE 6: EXAMS & ESSAYS (Essay Flow)
    // ============================================
    {
        id: 'go-to-exams',
        action: 'navigate',
        target: '/exams',
        duration: 2000,
        description: 'Go to Practice Quizzes'
    },
    {
        id: 'pause-on-exams',
        action: 'wait',
        duration: 2000,
        description: 'Show exam generator interface'
    },
    {
        id: 'go-to-essays',
        action: 'navigate',
        target: '/essays',
        duration: 2000,
        description: 'Go to Essays page'
    },
    {
        id: 'zoom-essay-section',
        action: 'custom',
        value: 'zoom:1.1:.prose',
        duration: 1000,
        description: 'Focus on essay section'
    },
    {
        id: 'generate-essay-questions',
        action: 'custom',
        value: 'click-text:Generate with Nova AI',
        duration: 3000,
        description: 'Generate essay questions from set'
    },
    {
        id: 'pause-on-generated-questions',
        action: 'wait',
        duration: 2000,
        description: 'Show generated questions'
    },
    {
        id: 'click-first-essay-question',
        action: 'click',
        target: 'button.hover\\:border-primary',
        duration: 1500,
        description: 'Click first essay question'
    },
    {
        id: 'zoom-essay-editor',
        action: 'custom',
        value: 'zoom:1.15:textarea',
        duration: 1000,
        description: 'Focus on essay editor'
    },
    {
        id: 'type-essay-response',
        action: 'type',
        target: 'textarea',
        value: 'Antiepileptic drugs work by modulating neuronal excitability through various mechanisms. They can suppress seizure initiation and propagation by affecting ion channels, GABA receptors, or glutamate signaling pathways. Understanding their mechanisms is crucial for clinical practice.',
        duration: 3500,
        description: 'Write essay response'
    },
    {
        id: 'reset-zoom-submit',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset zoom for submit'
    },
    {
        id: 'submit-essay',
        action: 'custom',
        value: 'click-text:Check My Essay',
        duration: 4000,
        description: 'Submit essay for grading'
    },
    {
        id: 'pause-on-feedback',
        action: 'wait',
        duration: 3000,
        description: 'Show AI feedback and grade'
    },

    // ============================================
    // SCENE 7: PROFILE & FINAL HERO POSE
    // ============================================
    {
        id: 'reset-zoom-final',
        action: 'custom',
        value: 'zoom:1',
        duration: 500,
        description: 'Reset'
    },
    // ============================================
    // THE FINAL HERO POSE
    // ============================================
    {
        id: 'hero-pose-dashboard',
        action: 'navigate',
        target: '/dashboard',
        duration: 1500,
        description: 'Return to Dashboard for final frame'
    },
    {
        id: 'hero-zoom-final',
        action: 'custom',
        value: 'zoom:1.05',
        duration: 8000,
        description: 'Slow subtle zoom on hero - fade to black'
    }
];
