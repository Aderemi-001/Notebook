/**
 * NovaMath.ts
 * 
 * Math Expression Parser & Equation Detection
 * Creates equation-based flashcards from formulas
 */

import { create, all } from 'mathjs';

const math = create(all);

export interface MathEquation {
    original: string;
    variables: string[];
    formula: string;
    description?: string;
}

export class NovaMath {

    /**
     * Detect mathematical equations in text
     */
    static detectEquations(text: string): MathEquation[] {
        const equations: MathEquation[] = [];

        // Pattern 1: "F = ma" style
        const simpleEqRegex = /([A-Z][a-z]?)\s*=\s*([^.\n]+)/g;
        let match;

        while ((match = simpleEqRegex.exec(text)) !== null) {
            const formula = match[0].trim();
            const variables = this.extractVariables(formula);

            equations.push({
                original: formula,
                variables,
                formula
            });
        }

        // Pattern 2: "E = mc²" or "a² + b² = c²"
        const complexEqRegex = /([A-Za-z]\w*)\s*=\s*([^.\n]+[²³⁴⁵⁶⁷⁸⁹⁰]+[^.\n]*)/g;

        while ((match = complexEqRegex.exec(text)) !== null) {
            const formula = match[0].trim();
            const variables = this.extractVariables(formula);

            if (!equations.some(eq => eq.formula === formula)) {
                equations.push({
                    original: formula,
                    variables,
                    formula
                });
            }
        }

        return equations;
    }

    /**
     * Generate flashcards from equations
     */
    static generateEquationCards(equations: MathEquation[]): Array<{ term: string, definition: string }> {
        const cards: Array<{ term: string, definition: string }> = [];

        equations.forEach(eq => {
            // Card 1: What is the formula?
            cards.push({
                term: `Formula involving ${eq.variables.join(', ')}`,
                definition: eq.formula
            });

            // Card 2: Solve for each variable
            eq.variables.forEach(variable => {
                if (eq.formula.includes('=')) {
                    cards.push({
                        term: `Solve for ${variable} in: ${eq.formula}`,
                        definition: `Rearrange the equation to isolate ${variable}`
                    });
                }
            });
        });

        return cards;
    }

    /**
     * Evaluate a mathematical expression
     */
    static evaluate(expression: string): number | string {
        try {
            const result = math.evaluate(expression);
            return typeof result === 'number' ? Math.round(result * 1000) / 1000 : result.toString();
        } catch (error) {
            return 'Invalid expression';
        }
    }

    /**
     * Extract variables from equation
     */
    private static extractVariables(equation: string): string[] {
        const variables = new Set<string>();

        // Match single letters (common variables)
        const varRegex = /\b[A-Za-z]\b/g;
        let match;

        while ((match = varRegex.exec(equation)) !== null) {
            variables.add(match[0]);
        }

        return Array.from(variables);
    }

    /**
     * Check if text contains mathematical content
     */
    static hasMathContent(text: string): boolean {
        // Check for equations
        if (/[A-Z][a-z]?\s*=\s*[^.\n]+/.test(text)) return true;

        // Check for mathematical symbols
        if (/[+\-*/=²³⁴⁵⁶⁷⁸⁹⁰∫∑√π]/.test(text)) return true;

        // Check for numbers with units
        if (/\d+\s*(kg|m|s|N|J|W|V|A|Ω|Hz|Pa|mol|K|°C|°F)/.test(text)) return true;

        return false;
    }
}
