import * as React from 'react';

export interface ChatMessage {
  id: number;
  sender: 'user' | 'bot' | 'system'; // Added 'system' to the sender types
  text: string | React.ReactNode;
  timestamp: Date;
  feedbackGiven?: 'up' | 'down' | null;
}

export const DEFAULT_SUGGESTED_QUESTIONS = [
  "How do I create a new study set?",
  "How do I generate an exam?",
  "What is the Cognitive Constellation?",
  "How do I reset my study progress?",
  "Can I share my study sets?",
  // Removed: "How do I use the drawing tool in notes?",
];

export const ROUTE_SPECIFIC_SUGGESTIONS: { [key: string]: string[] } = {
  '/create': [
    "How do I import a file to create cards?",
    "What file types can I import?",
    "How does AI generate cards?",
  ],
  '/sets/:setId': [
    "How do I start studying this set?",
    "How do I edit this study set?",
    "How do I delete this study set?",
    "How do I add this set to my collection?",
  ],
  '/daily-review': [
    "How does the spaced repetition system work?",
    "What do 'Again', 'Hard', and 'Good' mean?",
    "How can I change my daily cards goal?",
  ],
  '/notes': [
    "How do I create a new note?",
    "How do I summarize a note with AI?",
    // Removed: "How do I use the drawing tool in notes?",
  ],
  '/generate-exam': [
    "What types of questions can AI generate?",
    "How do I take a generated exam?",
    "Where can I see my past exams?",
  ],
  '/profile': [
    "How do I change my display name?",
    "How do I sign out?",
    "Where are the app settings?",
  ],
  '/settings': [
    "How do I change the theme?",
    "How do I change default flashcard side?",
    "How do I enable review reminders?",
  ],
  '/dashboard': [
    "What statistics can I see here?",
    "How is my study streak calculated?",
    "What are 'mastered cards'?",
  ],
  '/groups': [
    "How do I create a new group?",
    "How do I add sets to a group?",
    "How do I edit a group?",
  ],
  '/constellation': [
    "How are concepts generated?",
    "How do I refresh the constellation?",
    "What are concept relationships?",
  ],
};

export const ROUTE_KEYWORDS: { [key: string]: string } = {
  "home page": "/",
  "my study sets": "/",
  "/": "/",
  "create set page": "/create",
  "new study set": "/create",
  "/create": "/create",
  "profile page": "/profile",
  "user profile": "/profile",
  "/profile": "/profile",
  "cognitive constellation page": "/constellation",
  "cognitive constellation": "/constellation",
  "/constellation": "/constellation",
  "explore public sets page": "/explore-public-sets",
  "explore public sets": "/explore-public-sets",
  "/explore-public-sets": "/explore-public-sets",
  "generate exam page": "/generate-exam",
  "generate exam": "/generate-exam",
  "/generate-exam": "/generate-exam",
  "generate essay questions page": "/generate-essay-questions",
  "generate essay questions": "/generate-essay-questions",
  "past essay questions page": "/past-essay-questions",
  "past essay questions": "/past-essay-questions",
  "/past-essay-questions": "/past-essay-questions",
  "past exams page": "/past-exams",
  "past exams": "/past-exams",
  "/past-exams": "/past-exams",
  "settings page": "/settings",
  "app settings": "/settings",
  "/settings": "/settings",
  "my notes page": "/notes",
  "my notes": "/notes",
  "/notes": "/notes",
  "create note page": "/create-note",
  "new note": "/create-note",
  "/create-note": "/create-note",
  "statistics page": "/dashboard",
  "statistics": "/dashboard",
  "/dashboard": "/dashboard", // Keep this for the route path
  "daily review page": "/daily-review",
  "daily review": "/daily-review",
  "/daily-review": "/daily-review",
  "my groups page": "/groups",
  "my groups": "/groups",
  "/groups": "/groups",
  "create group page": "/groups/create",
  "new group": "/groups/create",
  "/groups/create": "/groups/create",
  "collaborations page": "/collaborations",
  "collaborations": "/collaborations",
  "/collaborations": "/collaborations",
};