/**
 * NovaFileProcessor.ts
 * 
 * "Nova Native" Local File Processing Engine.
 * Replaces external AI APIs with local heuristic algorithms for extracting
 * study concepts and flashcards from text.
 */
import nlp from 'compromise';
import { NovaKeywords } from './NovaKeywords';
import { NovaSpellCheck } from './NovaSpellCheck';
import { NovaMath } from './NovaMath';
import { NovaAI } from './NovaAI';

export interface ExtractedCard {
    term: string;
    definition: string;
}

export class NovaFileProcessor {

    private static cleanText(text: string): string {
        let clean = text;

        // 1. Fix "Broken Words" - Aggressive Merging for PDF artifacts
        // Merge isolated single letters: "T h e" -> "The", "r e s u l t" -> "result"
        clean = clean.replace(/\b([a-zA-Z]) (?=([a-zA-Z] )+[a-zA-Z])/g, '$1');
        clean = clean.replace(/\b([a-zA-Z]) ([a-zA-Z])\b/g, '$1$2'); // Merge "T h" -> "Th"

        // Fix specific prefixes/suffixes seen in medical PDFs
        const prefixes = / (in|re|de|un|en|pro|con|ex|mis|sub|sup|trans|inter|micro|macro|anti|non|multi|bi|tri|antit|chemo|radio|immuno) ([a-z]{2,}) /gi;
        clean = clean.replace(prefixes, (_, p1, p2) => ` ${p1}${p2} `);

        // Fix suffix detachments
        clean = clean.replace(/ ([a-z]{3,}) (ment|tion|sion|ing|ity|ance|ence|ism|ist|able|ible|ous|tious|s|ed|al|ic|ive) /gi, ' $1$2 ');

        // 2. Fix Broken Capitalized Words
        clean = clean.replace(/ ([A-Z]) ([a-z]{3,}) /g, ' $1$2 ');

        // 3. Fix weird PDF spacing
        clean = clean.replace(/\( /g, '(').replace(/ \)/g, ')');

        // 4. Merge Page Breaks
        clean = clean.replace(/(\w+)-\s+(\w+)/g, '$1$2');

        return clean;
    }

    private static isValidTerm(term: string): boolean {
        const t = term.trim();
        if (t.length < 2 || t.length > 60) return false;

        // Reject sentence starters or linking words
        if (/^(due to|because|however|although|therefore|example|note|remember|the|a|an|and|or|but)$/i.test(t)) return false;

        // Reject terms that look like full sentences
        if (t.includes('.')) return false;
        if (t.split(' ').length > 8) return false;
        if (/^[^a-zA-Z0-9]+$/.test(t)) return false;

        // Reject very short terms unless they are acronyms (All Caps)
        if (t.length < 3 && t !== t.toUpperCase()) return false;

        return true;
    }

    /**
     * Main entry point to process text content into study material.
     */
    static processContent(text: string): { cards: ExtractedCard[], concepts: any[] } {
        // Phase 1: Heavy Cleaning
        const fullText = this.cleanText(text.replace(/\r/g, ' '));
        const cards: ExtractedCard[] = [];
        const concepts: any[] = [];
        const generatedTerms = new Set<string>();

        // Phase 2: Pattern Matching (Regex-based)
        const rawLines = fullText.split(/\n+/);
        const delimiterRegex = /^([^:\-\u2013\u2014]+?)[:\-\u2013\u2014](.+)$/;

        // 1. Regex Pass (High Confidence)
        for (let i = 0; i < rawLines.length; i++) {
            const line = rawLines[i].trim();
            const match = line.match(delimiterRegex);

            if (match) {
                let term = match[1].trim();
                let def = match[2].trim();

                // Clean Term using NLP - Strip determiners "The", "A", "An"
                const termDoc = nlp(term);
                termDoc.match('^(the|a|an)').remove();
                term = termDoc.text().trim();
                if (term) term = term.charAt(0).toUpperCase() + term.slice(1);

                if (this.isValidTerm(term) && def.length > 10) {
                    // Merge multi-line definitions
                    let nextIdx = i + 1;
                    while (nextIdx < rawLines.length && nextIdx < i + 4) {
                        const nextLine = rawLines[nextIdx].trim();
                        if (!nextLine || nextLine.match(delimiterRegex)) break;
                        def += " " + nextLine;
                        i++; nextIdx++;
                    }

                    if (!generatedTerms.has(term.toLowerCase())) {
                        cards.push({ term, definition: def });
                        generatedTerms.add(term.toLowerCase());
                    }
                }
            }
        }

        // 2. Sentence-based fallback
        if (cards.length < 10) {
            const sentences = fullText.match(/[^.!?\n]+[.!?]+/g) || [];
            for (const sentence of sentences) {
                const sentenceText = sentence.trim();

                // Pattern: "Term is Definition"
                if (sentenceText.match(/\b(is|are|refers to|means)\b/)) {
                    const parts = sentenceText.split(/\b(is|are|refers to|means)\b/);
                    if (parts.length >= 3) {
                        let term = parts[0].trim();
                        const def = parts.slice(1).join('').trim();

                        // Strip determiners
                        term = term.replace(/^(The|A|An)\s+/i, '');

                        if (term.split(' ').length < 6 && this.isValidTerm(term)) {
                            if (def.length > 15 && !generatedTerms.has(term.toLowerCase())) {
                                cards.push({ term: term.charAt(0).toUpperCase() + term.slice(1), definition: def });
                                generatedTerms.add(term.toLowerCase());
                            }
                        }
                    }
                }
            }
        }

        // Phase 3: Concept Extraction (Frequency Analysis + TF-IDF)
        const conceptMap = new Map<string, number>();
        const potentialConcepts = fullText.match(/\b[A-Z][a-zA-Z-]{3,}(?:\s+[A-Z][a-zA-Z-]{3,})*\b/g) || [];

        for (const concept of potentialConcepts) {
            if (/^(The|This|That|These|Those|Table|Figure|Chapter|Section|Page)$/i.test(concept)) continue;
            conceptMap.set(concept, (conceptMap.get(concept) || 0) + 1);
        }

        // Use TF-IDF for better keyword extraction
        const keywords = NovaKeywords.extractKeywords(fullText, 5);
        keywords.forEach(kw => {
            if (!generatedTerms.has(kw.term.toLowerCase())) {
                concepts.push({
                    name: kw.term.charAt(0).toUpperCase() + kw.term.slice(1),
                    description: `Key concept (relevance: ${Math.round(kw.score * 100)}%)`
                });
            }
        });

        // Add frequency-based concepts
        for (const [name, count] of conceptMap.entries()) {
            const isCardTerm = generatedTerms.has(name.toLowerCase());
            if (count > 2 || (count > 1 && name.split(' ').length > 1) || isCardTerm) {
                if (!concepts.some(c => c.name === name)) {
                    concepts.push({
                        name,
                        description: isCardTerm ? "Key Term defined in flashcards" : "Recurring concept in text"
                    });
                }
            }
            if (concepts.length >= 10) break;
        }

        // Phase 4: Math Detection & Card Generation
        if (NovaMath.hasMathContent(fullText)) {
            const equations = NovaMath.detectEquations(fullText);
            const mathCards = NovaMath.generateEquationCards(equations);

            mathCards.forEach(mathCard => {
                if (!generatedTerms.has(mathCard.term.toLowerCase())) {
                    cards.push(mathCard);
                    generatedTerms.add(mathCard.term.toLowerCase());
                }
            });
        }

        // Phase 5: Spell Check & Auto-Correction
        const allText = cards.map(c => `${c.term} ${c.definition}`).join(' ');
        const spellSuggestions = NovaSpellCheck.checkText(allText);

        // Apply corrections to cards
        cards.forEach(card => {
            spellSuggestions.forEach(suggestion => {
                if (card.term.toLowerCase().includes(suggestion.original.toLowerCase())) {
                    card.term = card.term.replace(new RegExp(suggestion.original, 'gi'), suggestion.suggestion);
                }
                if (card.definition.toLowerCase().includes(suggestion.original.toLowerCase())) {
                    card.definition = card.definition.replace(new RegExp(suggestion.original, 'gi'), suggestion.suggestion);
                }
            });
        });

        return {
            cards: cards.sort((a, b) => a.term.localeCompare(b.term)),
            concepts: concepts.slice(0, 10)
        };
    }

    static estimateCardCount(text: string): number {
        const result = this.processContent(text);
        return result.cards.length;
    }

    /**
     * Advanced AI processing (Groq)
     * Combines the speed of local heuristics with the intelligence of LLMs
     */
    static async processWithAI(text: string): Promise<{ cards: ExtractedCard[], concepts: any[], relationships?: any[] }> {
        // 1. Get local results (Fast baseline)
        const localResults = this.processContent(text);

        try {
            // 2. Supplement with AI (Intelligence)
            const aiContent = await NovaAI.generateStudyContent(text);

            if (aiContent && aiContent.cards.length > 0) {
                // PRIMARILY use AI cards (Higher Quality)
                // If AI returns good results, we trust it completely and ignore local regex artifacts.

                return {
                    cards: aiContent.cards.sort((a: any, b: any) => a.term.localeCompare(b.term)),
                    concepts: aiContent.concepts.length > 0 ? aiContent.concepts : localResults.concepts, // Use AI concepts if available
                    relationships: aiContent.relationships // Return relationships for Constellation
                };
            }
        } catch (error) {
            console.error("Nova AI Processing Error:", error);
        }

        return localResults;
    }
}
