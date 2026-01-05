import * as React from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_KEYWORDS, ROUTE_SPECIFIC_SUGGESTIONS, DEFAULT_SUGGESTED_QUESTIONS } from './types';

export const parseAndRenderLinks = (text: string): React.ReactNode => {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        // Handle Headers
        if (trimmed.startsWith('### ')) {
          return <h3 key={lineIndex} className="text-sm font-bold text-foreground mt-1 mb-0.5">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={lineIndex} className="text-base font-bold text-foreground mt-2 mb-1">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('# ')) {
          return <h1 key={lineIndex} className="text-lg font-bold text-foreground mt-3 mb-1.5">{trimmed.slice(2)}</h1>;
        }

        // Handle Empty Lines
        if (trimmed === '') return <div key={lineIndex} className="h-1" />;

        // Handle bold patterns: **bold text**
        const segments = line.split(/(\*\*.*?\*\*)/g);

        return (
          <div key={lineIndex} className="leading-relaxed">
            {segments.map((segment, segmentIndex) => {
              // Handle Bold Text
              if (segment.startsWith('**') && segment.length >= 4) {
                return (
                  <strong key={`bold-${segmentIndex}`} className="font-bold text-foreground">
                    {segment.slice(2, -2)}
                  </strong>
                );
              }

              // Handle Links (Existing Logic applied to non-bold segments)
              const sortedKeywords = Object.keys(ROUTE_KEYWORDS).sort((a, b) => b.length - a.length);
              const parts: React.ReactNode[] = [];
              let currentText = segment;
              let lastLinkIndex = 0;

              while (currentText.length > 0) {
                let bestMatch: { keyword: string; route: string; index: number; length: number } | null = null;

                for (const keyword of sortedKeywords) {
                  const index = currentText.toLowerCase().indexOf(keyword.toLowerCase());
                  if (index !== -1) {
                    if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && keyword.length > bestMatch.length)) {
                      bestMatch = { keyword, route: ROUTE_KEYWORDS[keyword], index, length: keyword.length };
                    }
                  }
                }

                if (bestMatch) {
                  if (bestMatch.index > 0) {
                    parts.push(currentText.substring(0, bestMatch.index));
                  }
                  parts.push(
                    <Link
                      key={`link-${segmentIndex}-${lastLinkIndex++}`}
                      to={bestMatch.route}
                      className="text-primary hover:underline font-medium"
                    >
                      {currentText.substring(bestMatch.index, bestMatch.index + bestMatch.length)}
                    </Link>
                  );
                  currentText = currentText.substring(bestMatch.index + bestMatch.length);
                } else {
                  parts.push(currentText);
                  break;
                }
              }

              return <React.Fragment key={`seg-${segmentIndex}`}>{parts}</React.Fragment>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export const getDynamicSuggestions = (locationPath: string): string[] => {
  let suggestions = DEFAULT_SUGGESTED_QUESTIONS;

  // Check for direct path matches first
  if (ROUTE_SPECIFIC_SUGGESTIONS[locationPath]) {
    suggestions = ROUTE_SPECIFIC_SUGGESTIONS[locationPath];
  } else {
    // Check for dynamic path matches (e.g., /sets/:setId)
    for (const routePattern in ROUTE_SPECIFIC_SUGGESTIONS) {
      if (routePattern.includes(':')) {
        const regex = new RegExp(`^${routePattern.replace(/:\w+/g, '[^/]+')}$`);
        if (regex.test(locationPath)) {
          suggestions = ROUTE_SPECIFIC_SUGGESTIONS[routePattern];
          break;
        }
      }
    }
  }
  return suggestions;
};

import { Intent } from './types';
import { CHATBOT_INTENTS } from '@/data/chatbot-knowledge';

// --- NLP Helper Functions ---

// 1. Levenshtein Distance for Typos
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// 2. Word Similarity (0 to 1)
const getWordSimilarity = (word1: string, word2: string): number => {
  const maxLength = Math.max(word1.length, word2.length);
  if (maxLength === 0) return 1.0;
  const distance = levenshteinDistance(word1, word2);
  return (maxLength - distance) / maxLength;
};

// 3. Stop Words Removal
const STOP_WORDS = new Set(['how', 'do', 'i', 'to', 'the', 'a', 'an', 'is', 'are', 'can', 'you', 'please', 'me', 'my', 'in', 'on', 'at', 'what', 'where']);

const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
};

export const findIntent = (query: string, lastIntentId: string | null = null): Intent | null => {
  const queryTokens = tokenize(query);
  const rawLower = query.toLowerCase().trim();

  if (queryTokens.length === 0) return null;

  let bestIntent: Intent | null = null;
  let maxScore = 0;

  // 0. Context Re-trigger
  const REPEAT_KEYWORDS = ['another', 'more', 'again', 'one more', 'tell me more'];
  if (REPEAT_KEYWORDS.some(k => rawLower.includes(k)) && lastIntentId) {
    return CHATBOT_INTENTS.find(i => i.id === lastIntentId) || null;
  }

  // 1. EXACT PHRASE MATCHING FIRST (Priority!)
  for (const intent of CHATBOT_INTENTS) {
    for (const keywordPhrase of intent.keywords) {
      const phraseLower = keywordPhrase.toLowerCase();

      // Check for exact phrase match in query
      if (rawLower.includes(phraseLower)) {
        // Boost score based on phrase length (longer = more specific)
        const phraseBoost = phraseLower.split(' ').length * 10;
        const exactMatchScore = 100 + phraseBoost;

        if (exactMatchScore > maxScore) {
          maxScore = exactMatchScore;
          bestIntent = intent;
        }
      }
    }
  }

  // If we found an exact phrase match, return it immediately
  if (maxScore >= 100) {
    return bestIntent;
  }

  // 2. FUZZY TOKEN MATCHING (Fallback)
  for (const intent of CHATBOT_INTENTS) {
    // Check required context
    if (intent.requiredContext && (!lastIntentId || !intent.requiredContext.includes(lastIntentId))) {
      continue;
    }

    let intentScore = 0;

    // Evaluate against each keyword phrase in the intent
    for (const keywordPhrase of intent.keywords) {
      const keywordTokens = tokenize(keywordPhrase);
      let phraseMatchScore = 0;

      // Match query tokens against keyword tokens
      let matchedTokenCount = 0;

      for (const kToken of keywordTokens) {
        let bestTokenMatch = 0;
        for (const qToken of queryTokens) {
          const sim = getWordSimilarity(kToken, qToken);
          if (sim > bestTokenMatch) bestTokenMatch = sim;
        }

        // Threshold for a "match"
        if (bestTokenMatch > 0.8) {
          phraseMatchScore += bestTokenMatch;
          matchedTokenCount++;
        }
      }

      // If we matched a significant portion of the keyword phrase
      if (matchedTokenCount > 0) {
        // Boost for complete phrase match
        const completeness = matchedTokenCount / keywordTokens.length;
        const currentScore = phraseMatchScore * completeness;

        if (currentScore > intentScore) {
          intentScore = currentScore;
        }
      }
    }

    if (intentScore > maxScore) {
      maxScore = intentScore;
      bestIntent = intent;
    }
  }

  // Threshold: decent match required
  // score is roughly number of matched words. 0.8 means at least one strong word match.
  return maxScore >= 0.8 ? bestIntent : null;
};

// --- Query Classification for Smart Fallback ---
export enum QueryType {
  QUESTION_HOW_TO,  // "How do I..."
  QUESTION_WHAT_IS, // "What is..." (could be search)
  STATEMENT,        // "I am happy"
  UNKNOWN
}

export const detectQueryType = (query: string): QueryType => {
  const lower = query.toLowerCase().trim();

  if (lower.startsWith('how to') || lower.startsWith('how do i') || lower.startsWith('can i') || lower.startsWith('where is')) {
    return QueryType.QUESTION_HOW_TO;
  }

  if (lower.startsWith('what is') || lower.startsWith('define')) {
    return QueryType.QUESTION_WHAT_IS; // Likely search candidate
  }


  return QueryType.UNKNOWN;
};

// --- Domain Relevance Check ---
// Heuristic: If a query has NO study/app related words, and NO content search intent, 
// we might assume it's out of scope if it's long enough.
// However, specific content search (e.g. "mitochondria") might not have app keywords.
// So we mainly use this to filter out obvious non-sequiturs if we want to be strict,
// OR we just use it to flavor the fallback response.

const APP_DOMAIN_KEYWORDS = [
  'study', 'set', 'flashcard', 'quiz', 'exam', 'note', 'notebook', 'app', 'settings',
  'mode', 'theme', 'account', 'user', 'dashboard', 'login', 'signup', 'review', 'learn',
  'practice', 'card', 'term', 'definition', 'search', 'find', 'navigate', 'help'
];

export const isQueryRelavant = (query: string): boolean => {
  // If it's very short, might be a keyword Search
  if (query.split(/\s+/).length < 2) return true;

  // Check if it matches any app keywords
  const lower = query.toLowerCase();
  return APP_DOMAIN_KEYWORDS.some(k => lower.includes(k));
};