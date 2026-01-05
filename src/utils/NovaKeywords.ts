/**
 * NovaKeywords.ts
 * 
 * Keyword Extraction using TF-IDF
 * Identifies the most important topics in documents
 * Browser-compatible implementation (no Node.js dependencies)
 */

export interface KeywordResult {
    term: string;
    score: number;
}

export class NovaKeywords {

    /**
     * Simple browser-compatible TF-IDF implementation
     * @param text - Input text
     * @param topN - Number of keywords to return (default 5)
     */
    static extractKeywords(text: string, topN: number = 5): KeywordResult[] {
        // Tokenize
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);

        // Calculate term frequency
        const termFreq = new Map<string, number>();
        words.forEach(word => {
            if (!this.isStopWord(word)) {
                termFreq.set(word, (termFreq.get(word) || 0) + 1);
            }
        });

        // Simple TF-IDF scoring (TF only, since we have single document)
        const results: KeywordResult[] = [];
        const maxFreq = Math.max(...Array.from(termFreq.values()));

        termFreq.forEach((freq, term) => {
            const tf = freq / maxFreq; // Normalized term frequency
            results.push({ term, score: tf });
        });

        // Sort by score and return top N
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);
    }

    /**
     * Extract key topics from document (capitalized phrases)
     */
    static extractTopics(text: string, topN: number = 3): string[] {
        // Find capitalized phrases (likely topics)
        const topicRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
        const topics = text.match(topicRegex) || [];

        // Count frequency
        const frequency = new Map<string, number>();
        topics.forEach(topic => {
            if (topic.length > 3 && !this.isCommonNoun(topic)) {
                frequency.set(topic, (frequency.get(topic) || 0) + 1);
            }
        });

        // Sort by frequency and return top N
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([topic]) => topic);
    }

    /**
     * Generate summary of document topics
     */
    static generateTopicSummary(text: string): string {
        const keywords = this.extractKeywords(text, 5);
        const topics = this.extractTopics(text, 3);

        if (topics.length > 0) {
            return `Key topics: ${topics.join(', ')}. Main concepts: ${keywords.map(k => k.term).join(', ')}.`;
        } else if (keywords.length > 0) {
            return `Main concepts: ${keywords.map(k => k.term).join(', ')}.`;
        }

        return "Document analyzed.";
    }

    private static isStopWord(word: string): boolean {
        const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'from', 'have', 'this', 'that', 'will', 'your', 'what', 'been', 'more', 'when', 'there', 'their'];
        return stopWords.includes(word.toLowerCase());
    }

    private static isCommonNoun(word: string): boolean {
        const commonNouns = ['The', 'This', 'That', 'These', 'Those', 'Table', 'Figure', 'Chapter', 'Section', 'Page', 'Example', 'Note'];
        return commonNouns.includes(word);
    }
}
