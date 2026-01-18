import { Intent } from '@/components/chatbot/types';

export const CHATBOT_INTENTS: Intent[] = [
    // --- Greetings & Identity ---
    {
        id: 'GREETING',
        keywords: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'yo', 'start', 'sup'],
        response: "Hello! I'm Nova, your AI Study Notebook Assistant. 🌟 I can help you navigate, explain features like **Essay Grading**, or search your notes. What are we learning today?"
    },
    {
        id: 'IDENTITY',
        keywords: ['who are you', 'your name', 'what are you', 'bot', 'assistant', 'nova', 'ai name'],
        response: "I'm **Nova**! 🧠 I'm an advanced AI integrated into your Notebook. I help you study smarter by grading essays, organizing notes, and answering questions about your study sets."
    },
    {
        id: 'HELP',
        keywords: ['help', 'what can you do', 'features', 'support', 'guide', 'assist', 'capabilities', 'manual'],
        response: "I'm fully trained on the app! Here's what I can do:\n\n1. **Navigation**: 'How do I create a set?' or 'Go to my profile'.\n2. **Smart Features**: Ask about **Essay Grading**, **File Import**, or the **Constellation**.\n3. **Search**: 'Search for photosynthesis' to find cards."
    },

    // --- Core Navigation ---
    {
        id: 'NAV_DASHBOARD',
        keywords: ['dashboard', 'home', 'main menu', 'start page', 'landing'],
        response: "Your **Dashboard** is the command center! 🚀 It shows your recent study sets, quick actions, and study streaks. Click **Dashboard** in the sidebar to return there any time."
    },
    {
        id: 'NAV_CREATE_SET',
        keywords: ['create set', 'new set', 'make set', 'add set', 'build set', 'generate set', 'flashcards'],
        response: "To create a Study Set:\n1. Click **+ Create Set** in the sidebar.\n2. You can enter terms manually OR use **Nova Link** to import from a file (PDF, PPT, etc.) and generate cards automatically! ✨"
    },
    {
        id: 'INFO_FILE_IMPORT',
        keywords: ['import', 'upload', 'pdf', 'file', 'generate from file', 'scan', 'read file'],
        response: "I can read your files! 📂 When creating a set, look for the **Import from file with Nova** section. Upload a PDF, Word doc, or slide deck, and I'll extract key terms/definitions for you."
    },
    {
        id: 'NAV_MY_SETS',
        keywords: ['my sets', 'my flashcards', 'view sets', 'list sets', 'library', 'collection'],
        response: "You can find all your created and saved collections in **My Sets** in the sidebar. It's your personal library! 📚"
    },
    {
        id: 'NAV_EXPLORE',
        keywords: ['explore', 'public sets', 'search sets', 'find sets', 'community', 'other users'],
        response: "Check out **Public Study Sets** to find public study materials created by the community. You can search by topic and save them to your library!"
    },

    // --- Study & Practice ---
    {
        id: 'NAV_PRACTICE_QUIZ',
        keywords: ['quiz', 'test', 'exam', 'multiple choice', 'assess', 'start quiz', 'take quiz'],
        response: "Ready to test yourself? 📝 Go to **Practice Quiz**. I'll generate multiple-choice questions based on your study sets to help you verify your knowledge."
    },
    {
        id: 'NAV_ESSAY',
        keywords: ['essay', 'writing', 'paper', 'grade', 'feedback', 'mark', 'score', 'composition', 'practice essay'],
        response: "I can grade your essays instantly! ✍️\n1. Go to **Essay Practice**.\n2. Choose a prompt or write your own.\n3. I'll analyze your **Content**, **Structure**, and **Readability** and give you a letter grade!"
    },
    {
        id: 'DELETE_ESSAY',
        keywords: ['delete essay', 'remove essay', 'delete practice essay', 'erase essay', 'clear essay'],
        response: "To delete a practice essay:\n1. Go to **Essay Practice**.\n2. Find the essay in your history.\n3. Click the **trash icon** or **Delete** button next to it.\n\nNote: Deleting is permanent and cannot be undone! 🗑️"
    },
    {
        id: 'INFO_ESSAY_GRADING',
        keywords: ['how do you grade', 'grading rubric', 'grading criteria', 'essay score'],
        response: "I analyze your essay for:\n- **Key Concepts**: Did you cover the topic?\n- **Structure**: Flow, transition words, and paragraph organization.\n- **Readability**: Passive voice, repetition, and vocabulary richness."
    },

    // --- Advanced Features ---
    {
        id: 'INFO_CONSTELLATION',
        keywords: ['constellation', 'graph', 'dots', 'visualization', 'stars', 'galaxy', 'brain map', 'cognitive'],
        response: "The **Cognitive Constellation** is currently being upgraded! 🚧 It will soon visualize your notes as a universe of connected stars, helping you see how concepts link across different study sets. Stay tuned!"
    },
    {
        id: 'NAV_NOTEBOOK',
        keywords: ['notebook', 'notes', 'scratchpad', 'journal', 'jot'],
        response: "Your **Notebook** (My Notes) is for free-form thinking. 📝 You can type normally or use the **Handwriting** mode to draw diagrams and equations."
    },
    {
        id: 'INFO_LINKING',
        keywords: ['link notes', 'connect notes', 'associate', 'attach note'],
        response: "You can now link specific notes to Study Sets! 🔗 While editing a note, look for the **Link Study Set** dropdown to associate it with a topic."
    },

    // --- Settings & Account ---
    {
        id: 'NAV_PROFILE',
        keywords: ['profile', 'avatar', 'user', 'account', 'stats', 'streak', 'progress'],
        response: "Click **Profile** in the sidebar to see your study stats, current streak 🔥, and manage your account details."
    },
    {
        id: 'NAV_SETTINGS',
        keywords: ['settings', 'preferences', 'config', 'setup', 'options'],
        response: "In **Settings**, you can change your password, update email preferences, or manage your subscription."
    },
    {
        id: 'INFO_THEME',
        keywords: ['theme', 'dark mode', 'light mode', 'brightness', 'appearance', 'color'],
        response: "To switch themes:\n1. Go to **Settings** (via Profile).\n2. Toggle **Appearance** between Light and Dark mode. 🌗"
    },
    {
        id: 'NAV_LOGOUT',
        keywords: ['logout', 'sign out', 'log out', 'exit', 'leave'],
        response: "To sign out, click your **Profile** icon (or 'Account' in sidebar) and select **Logout** at the bottom."
    },
    {
        id: 'INFO_TERMS',
        keywords: ['terms', 'legal', 'privacy policy', 'rules', 'agreement'],
        response: "You can view our **Terms** and **Privacy Policy** links in the footer of the landing page or in your Settings."
    },

    // --- Set Management ---
    {
        id: 'NAV_VISIBILITY',
        keywords: ['public', 'private', 'visibility', 'share set', 'hide set', 'make public'],
        response: "To change visibility:\n1. Open the Set.\n2. Click **Edit** (pencil).\n3. Toggle **Public** on/off.\n\nPublic sets are visible to everyone in Explore!"
    },
    {
        id: 'NAV_DELETE_SET',
        keywords: ['delete set', 'remove set', 'erase set', 'destroy set'],
        response: "To delete a set, find it on your Dashboard or My Sets list, and click the **Trash Can** icon. 🗑️ Careful, this cannot be undone!"
    },
    {
        id: 'NAV_DELETE_NOTE',
        keywords: ['delete note', 'remove note', 'erase note', 'trash note', 'delete page', 'remove page'],
        response: "To delete a note:\n1. Go to **My Notes**.\n2. Select the note from the sidebar list.\n3. Click the **Delete** (trash can) icon in the top header. 🗑️"
    },

    // --- Chit Chat ---
    {
        id: 'SMALLTALK_STATUS',
        keywords: ['how are you', 'how is used', 'status', 'awake'],
        response: "I'm online and ready to learn! ⚡ Systems are functioning at 100%."
    },
    {
        id: 'SMALLTALK_JOKE',
        keywords: ['joke', 'funny', 'laugh', 'humor'],
        response: [
            "Why did the neuron get sent to the principal? It had strict potential! ⚡",
            "Why do plants hate math? It gives them square roots. 🌱",
            "What happened to the plant in math class? It grew into a square tree! 🌲"
        ]
    },

    // --- Catch-All Search ---
    {
        id: 'SEARCH_EXPLICIT',
        keywords: ['search', 'find', 'lookup', 'where is', 'show me', 'what is', 'define'],
        action: 'search_notes'
    }
];
