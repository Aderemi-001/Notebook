import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Formats text by:
 * 1. Converting markdown bold (**text**) to <strong> tags
 * 2. Converting markdown italic (*text*) to <em> tags
 * 3. Converting route patterns (/path) to clickable links
 */
export function formatText(text: string): React.ReactNode {
    if (!text) return null;

    // Split by markdown patterns and route patterns
    const parts: React.ReactNode[] = [];
    let key = 0;

    // Regex patterns
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const italicPattern = /\*([^*]+)\*/g;
    const routePattern = /\/([a-z-]+)/g;

    // Process the text
    let lastIndex = 0;
    const allMatches: Array<{ index: number; length: number; type: 'bold' | 'italic' | 'route'; content: string; route?: string }> = [];

    // Find all bold matches
    let match: RegExpExecArray | null;
    while ((match = boldPattern.exec(text)) !== null) {
        allMatches.push({
            index: match.index,
            length: match[0].length,
            type: 'bold',
            content: match[1]
        });
    }

    // Find all italic matches (that aren't part of bold)
    italicPattern.lastIndex = 0;
    while ((match = italicPattern.exec(text)) !== null) {
        // Check if this is not part of a bold pattern
        const isBold = allMatches.some(m =>
            m.type === 'bold' &&
            match!.index >= m.index &&
            match!.index < m.index + m.length
        );
        if (!isBold) {
            allMatches.push({
                index: match.index,
                length: match[0].length,
                type: 'italic',
                content: match[1]
            });
        }
    }

    // Find all route matches
    routePattern.lastIndex = 0;
    while ((match = routePattern.exec(text)) !== null) {
        allMatches.push({
            index: match.index,
            length: match[0].length,
            type: 'route',
            content: match[1],
            route: match[0]
        });
    }

    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build the result
    allMatches.forEach((m) => {
        // Add text before this match
        if (m.index > lastIndex) {
            parts.push(text.substring(lastIndex, m.index));
        }

        // Add the formatted match
        if (m.type === 'bold') {
            parts.push(<strong key={`bold-${key++}`}>{m.content}</strong>);
        } else if (m.type === 'italic') {
            parts.push(<em key={`italic-${key++}`}>{m.content}</em>);
        } else if (m.type === 'route' && m.route) {
            parts.push(
                <Link
                    key={`link-${key++}`}
                    to={m.route}
                    className="text-primary hover:underline font-semibold"
                >
                    {m.content}
                </Link>
            );
        }

        lastIndex = m.index + m.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
}
