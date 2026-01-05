/**
 * NovaSpellCheck.ts
 * 
 * Spell Checking & Auto-Correction
 * Detects and suggests corrections for typos
 */

// Note: nspell requires a dictionary. For now, we'll use a simpler approach
// with common medical/academic term corrections
import { NovaAI } from './NovaAI';

export interface SpellSuggestion {
    original: string;
    suggestion: string;
    confidence: number; // 0-1
}

export class NovaSpellCheck {

    // Common typo corrections for academic/medical terms
    private static corrections = new Map<string, string>([
        // Biology
        ['mitocondria', 'mitochondria'],
        ['mitochondrion', 'mitochondria'],
        ['photosinthesis', 'photosynthesis'],
        ['photosynthisis', 'photosynthesis'],
        ['dna', 'DNA'],
        ['rna', 'RNA'],

        // Chemistry
        ['oxigen', 'oxygen'],
        ['hidrogen', 'hydrogen'],
        ['carbondioxid', 'carbon dioxide'],

        // General
        ['occured', 'occurred'],
        ['recieve', 'receive'],
        ['seperate', 'separate'],
        ['definately', 'definitely'],
        ['wierd', 'weird'],
        ['acheive', 'achieve'],
        ['beleive', 'believe'],
        ['concious', 'conscious'],
    ]);

    /**
     * Check text for common typos
     */
    static checkText(text: string): SpellSuggestion[] {
        const suggestions: SpellSuggestion[] = [];
        const words = text.toLowerCase().split(/\s+/);

        words.forEach(word => {
            const cleaned = word.replace(/[.,!?;:]/g, '');
            if (this.corrections.has(cleaned)) {
                suggestions.push({
                    original: word,
                    suggestion: this.corrections.get(cleaned)!,
                    confidence: 0.9
                });
            }
        });

        return suggestions;
    }

    /**
     * Auto-correct text
     */
    static autoCorrect(text: string): string {
        let corrected = text;

        this.corrections.forEach((correction, typo) => {
            const regex = new RegExp(`\\b${typo}\\b`, 'gi');
            corrected = corrected.replace(regex, correction);
        });

        return corrected;
    }

    /**
     * Check if a word is likely misspelled (basic heuristic)
     */
    static isLikelyTypo(word: string): boolean {
        const cleaned = word.toLowerCase().replace(/[.,!?;:]/g, '');

        // Check against known typos
        if (this.corrections.has(cleaned)) return true;

        // Heuristic: repeated letters (e.g., "mitttochondria")
        if (/(.)\1{2,}/.test(cleaned)) return true;

        // Heuristic: unusual consonant clusters
        if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(cleaned)) return true;

        return false;
    }

    /**
     * Add custom correction to dictionary
     */
    static addCorrection(typo: string, correction: string): void {
        this.corrections.set(typo.toLowerCase(), correction);
    }

    /**
     * Context-aware AI correction (Groq)
     */
    static async correctWithAI(text: string): Promise<string> {
        // Fast local correction first
        const basicCorrected = this.autoCorrect(text);

        try {
            // Deep AI correction for context
            return await NovaAI.correctSpelling(basicCorrected);
        } catch (error) {
            return basicCorrected;
        }
    }
}
