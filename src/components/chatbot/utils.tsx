import React from 'react';
import { Link } from 'react-router-dom'; // Removed useLocation
import { ROUTE_KEYWORDS, ROUTE_SPECIFIC_SUGGESTIONS, DEFAULT_SUGGESTED_QUESTIONS } from './types';

export const parseAndRenderLinks = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort keywords by length descending to match longer phrases first
  const sortedKeywords = Object.keys(ROUTE_KEYWORDS).sort((a, b) => b.length - a.length);

  let currentText = text;
  let matchFound = true;

  while (matchFound) {
    matchFound = false;
    let bestMatch: { keyword: string; route: string; index: number; length: number } | null = null;

    for (const keyword of sortedKeywords) {
      const index = currentText.toLowerCase().indexOf(keyword.toLowerCase());
      if (index !== -1) {
        if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && keyword.length > bestMatch.length)) {
          bestMatch = { keyword, route: ROUTE_KEYWORDS[keyword], index, length: keyword.length };
          matchFound = true;
        }
      }
    }

    if (bestMatch) {
      const beforeMatch = currentText.substring(0, bestMatch.index);
      if (beforeMatch.length > 0) {
        parts.push(beforeMatch);
      }
      parts.push(
        <Link key={`link-${lastIndex++}`} to={bestMatch.route} className="text-blue-500 hover:underline font-medium">
          {currentText.substring(bestMatch.index, bestMatch.index + bestMatch.length)}
        </Link>
      );
      currentText = currentText.substring(bestMatch.index + bestMatch.length);
    }
  }

  if (currentText.length > 0) {
    parts.push(currentText);
  }

  return <>{parts}</>;
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