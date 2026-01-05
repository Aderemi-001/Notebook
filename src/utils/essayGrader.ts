
/**
 * Local Essay Grading Engine - Advanced Heuristics v2
 *
 * This utility provides "smart" analysis of essay content without external AI.
 * It uses advanced heuristics to assess:
 * 1. Readability (Flesch-Kincaid)
 * 2. Coherence (Transition words usage)
 * 3. Vocabulary Strength (Variety + Penalizing weak words)
 * 4. Structure (Intro/Conclusion detection, paragraph balance)
 * 5. Content Coverage (Concept clustering)
 * 6. Style Check (Passive voice, Repetition, Sentence Variety)
 */

import { NovaAI } from './NovaAI';

export interface EssayMetrics {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgSentenceLength: number; // words per sentence
    readabilityScore: number; // 0-100 (Flesch Reading Ease)
    gradeLevel: number; // Flesch-Kincaid Grade Level
    complexWordCount: number;
    uniqueWordPercentage: number;
    transitionWordCount: number;
    weakWordCount: number;
    passiveVoiceCount: number;
    repetitiveWords: string[]; // Top 3 overused non-stop words
    sentenceVarietyScore: number; // 0-100 based on start variance
}

export interface DetailedGrade {
    score: number; // 0-100
    letterGrade: string;
    feedback: string;
    metrics: EssayMetrics;
    structureFeedback: string[];
    contentFeedback: string[];
    coherenceFeedback: string[];
    styleFeedback: string[]; // New: Passive voice, repetition, variety
    pointsCovered: string[];
    pointsMissed: string[];
}

// --- CONSTANTS ---

const WEAK_WORDS = [
    "very", "really", "good", "bad", "stuff", "thing", "things", "nice",
    "lot", "lots", "kind of", "sort of", "basically", "actually", "literally",
    "totally", "huge", "big", "small", "happy", "sad", "mad"
];

const TRANSITION_WORDS = [
    "however", "therefore", "furthermore", "moreover", "consequently", "nevertheless",
    "meanwhile", "subsequently", "contrary", "conversely", "specifically", "additionally",
    "comparison", "contrast", "despite", "although", "instance", "example",
    "conclusion", "summarize", "overall", "firstly", "secondly", "finally", "outcome"
];

const STOP_WORDS = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "person", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
]);

// --- HELPERS ---

const countSyllables = (word: string): number => {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
};

const countOccurrences = (text: string, wordList: string[]): number => {
    let count = 0;
    const lowerText = text.toLowerCase();
    wordList.forEach(word => {
        // Simple word boundary match
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowerText.match(regex);
        if (matches) count += matches.length;
    });
    return count;
};

const identifyRepetitiveWords = (words: string[]): string[] => {
    const counts: { [key: string]: number } = {};
    words.forEach(w => {
        const lower = w.toLowerCase().replace(/[^a-z]/g, '');
        if (lower.length > 3 && !STOP_WORDS.has(lower)) {
            counts[lower] = (counts[lower] || 0) + 1;
        }
    });

    // Sort by count desc
    return Object.entries(counts)
        .filter(([, count]) => count > 2) // Must appear at least 3 times
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([word]) => word);
};

const detectPassiveVoice = (text: string): number => {
    // Basic heuristic: form of "to be" + "past participle" (ed)
    // Very simplified, misses irregular verbs, but catches obvious ones like "was considered", "is played"
    const passiveRegex = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
    const matches = text.match(passiveRegex);
    return matches ? matches.length : 0;
};

const analyzeSentenceVariety = (sentences: string[]): number => {
    if (sentences.length < 3) return 100;

    // Check first words
    const firstWords = sentences.map(s => {
        const match = s.trim().match(/^\w+/);
        return match ? match[0].toLowerCase() : "";
    }).filter(w => w);

    let repetitions = 0;
    for (let i = 1; i < firstWords.length; i++) {
        if (firstWords[i] === firstWords[i - 1]) repetitions++;
    }

    // Score deduction
    // 0 reps = 100
    // Every rep deducts 15
    return Math.max(0, 100 - (repetitions * 15));
};

// --- MAIN ENGINE ---

// --- CONFIG INTERFACE ---
export interface GradingConfig {
    target_grade_level: number;
    target_sentence_length: number;
    target_transition_density: number;
    // Add more adaptable metrics here
}

export const analyzeEssay = (text: string, suggestedPoints: string[] = [], config?: GradingConfig | null): DetailedGrade => {
    const cleanText = text.trim();
    if (!cleanText) {
        return {
            score: 0,
            letterGrade: 'F',
            feedback: 'No content provided.',
            metrics: {
                wordCount: 0, sentenceCount: 0, paragraphCount: 0,
                avgSentenceLength: 0, readabilityScore: 0, gradeLevel: 0,
                complexWordCount: 0, uniqueWordPercentage: 0,
                transitionWordCount: 0, weakWordCount: 0,
                passiveVoiceCount: 0, repetitiveWords: [], sentenceVarietyScore: 0
            },
            structureFeedback: ['Essay is empty.'],
            contentFeedback: [],
            coherenceFeedback: [],
            styleFeedback: [],
            pointsCovered: [],
            pointsMissed: suggestedPoints
        };
    }

    // --- 1. Basic Stats ---
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = cleanText.match(/\b\w+\b/g) || [];
    const wordCount = words.length;

    // --- 2. Advanced Metrics ---
    const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const complexWords = words.filter(w => countSyllables(w) >= 3);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));

    // Avoid division by zero
    const sCount = Math.max(1, sentences.length);
    const wCount = Math.max(1, wordCount);

    // Readability
    const readingEase = 206.835 - (1.015 * (wCount / sCount)) - (84.6 * (syllables / wCount));
    const gradeLevel = (0.39 * (wCount / sCount)) + (11.8 * (syllables / wCount)) - 15.59;

    // Linguistic Analysis
    const transitionCount = countOccurrences(cleanText, TRANSITION_WORDS);
    const weakWordCount = countOccurrences(cleanText, WEAK_WORDS);
    const passiveVoiceCount = detectPassiveVoice(cleanText);
    const repetitiveWords = identifyRepetitiveWords(words);
    const sentenceVarietyScore = analyzeSentenceVariety(sentences);

    const metrics: EssayMetrics = {
        wordCount,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgSentenceLength: parseFloat((wCount / sCount).toFixed(1)),
        readabilityScore: Math.max(0, Math.min(100, Math.round(readingEase))),
        gradeLevel: Math.max(0, parseFloat(gradeLevel.toFixed(1))),
        complexWordCount: complexWords.length,
        uniqueWordPercentage: Math.round((uniqueWords.size / wCount) * 100),
        transitionWordCount: transitionCount,
        weakWordCount,
        passiveVoiceCount,
        repetitiveWords,
        sentenceVarietyScore
    };

    // --- 3. CRITICAL SCORING LOGIC ---

    // A. Content Score (40%) - Concept Coverage
    // Refined: Broader matching with basic stemming
    let contentScore = 0;
    const pointsCovered: string[] = [];
    const pointsMissed: string[] = [];

    // Simple helper to stem words (remove s, es, ed, ing) for better matching
    const getStem = (word: string) => {
        return word.replace(/(?:s|es|ed|ing)$/, '');
    };

    if (suggestedPoints.length > 0) {
        const pointValue = 100 / suggestedPoints.length;
        suggestedPoints.forEach(point => {
            // Extract meaningful keywords (>3 chars, not in stop words)
            const rawWords = point.toLowerCase().match(/\b\w{3,}\b/g) || [];
            const keywords = rawWords.filter(w => !STOP_WORDS.has(w));

            // If no valid keywords found (e.g. point is "Do it"), fall back to raw words
            const targetKeywords = keywords.length > 0 ? keywords : rawWords;

            // Check for matches using stems
            const textWords = cleanText.toLowerCase().match(/\b\w{3,}\b/g) || [];
            const textStems = new Set(textWords.map(getStem));

            // Require at least 1 strong keyword match
            let matchCount = 0;
            targetKeywords.forEach(k => {
                if (textStems.has(getStem(k))) matchCount++;
            });

            // If the point is short (1-3 keywords), 1 match is enough.
            const requiredMatches = 1;

            if (matchCount >= requiredMatches) {
                contentScore += pointValue;
                pointsCovered.push(point);
            } else {
                pointsMissed.push(point);
            }
        });
    } else {
        // If no points, rely on length + complexity. 
        // 500 words = 100%. 
        contentScore = Math.min(100, (wordCount / 500) * 100);
    }


    // B. Structure Score (30%) - The "Critical" Eye
    let structureScore = 100;
    const structureIssues: string[] = [];

    // ADAPTIVE TARGETS
    const TARGET_SENTENCE_LENGTH = config?.target_sentence_length || 15;
    const TARGET_TRANSITION_DENSITY = config?.target_transition_density || 1.0;

    // 1. Paragraphing
    if (wordCount > 200 && paragraphs.length < 3) {
        structureScore -= 15;
        structureIssues.push("Poor paragraph structure. An essay of this length should have at least 3 paragraphs.");
    } else if (wordCount > 100 && paragraphs.length < 2) {
        structureScore -= 10;
        structureIssues.push("Split your text into paragraphs to organize ideas.");
    }

    // 2. Intro/Conclusion Detection (Heuristic)
    if (paragraphs.length >= 3) {
        const lastPara = paragraphs[paragraphs.length - 1].toLowerCase();
        // Check Conclusion indicators
        const conclusionSignals = ["conclusion", "summarize", "overall", "finally", "end", "result"];
        if (!conclusionSignals.some(s => lastPara.includes(s))) {
            // structureIssues.push("Your conclusion could be stronger. Try starting the final paragraph with 'In conclusion' or 'To summarize'.");
        }
    }

    // 3. Sentence Variety (Adaptive)
    // If the user's calibration text has long sentences (e.g. 25 words), we shouldn't penalize them for 20 words.
    // We penalize if they deviate significantly (> 1.5x) from their own target or the default.
    if (metrics.avgSentenceLength > (TARGET_SENTENCE_LENGTH * 1.5)) {
        structureScore -= 15;
        structureIssues.push(`Sentences are very long (${metrics.avgSentenceLength} words). Your target average is ~${Math.round(TARGET_SENTENCE_LENGTH)}.`);
    } else if (metrics.avgSentenceLength < (TARGET_SENTENCE_LENGTH * 0.5) && wordCount > 100) {
        structureScore -= 10;
        structureIssues.push(`Sentences are too choppy. Your target average is ~${Math.round(TARGET_SENTENCE_LENGTH)}.`);
    }

    // C. Coherence & Vocabulary Score (30%) - The "Intelligence"
    let vocabScore = 100;
    const coherenceIssues: string[] = [];
    const styleIssues: string[] = [];

    // 1. Transition Words (Adaptive Flow)
    const transitionDensity = (transitionCount / paragraphs.length);
    // Be lenient if the target density is low, strict if high
    if (paragraphs.length > 1 && transitionDensity < (TARGET_TRANSITION_DENSITY * 0.5)) {
        vocabScore -= 15;
        coherenceIssues.push(`Low use of transition words (${transitionDensity.toFixed(1)}/para). Target: ${TARGET_TRANSITION_DENSITY.toFixed(1)}.`);
    }

    // 2. Weak Words (Precision)
    if (metrics.weakWordCount > 5) {
        const penalty = Math.min(20, metrics.weakWordCount * 2);
        vocabScore -= penalty;
        coherenceIssues.push(`Avoid weak words like "very", "good", or "bad". Found ${metrics.weakWordCount} instances. Be more specific.`);
    }

    // 3. Repetition & Style (New!)
    if (repetitiveWords.length > 0) {
        vocabScore -= (repetitiveWords.length * 3);
        styleIssues.push(`Overused words: "${repetitiveWords.join('", "')}". Try synonyms.`);
    }

    if (metrics.passiveVoiceCount > 3) {
        vocabScore -= 10;
        styleIssues.push(`Frequent passive voice detected (${metrics.passiveVoiceCount}x). Use active voice for stronger writing.`);
    }

    if (metrics.sentenceVarietyScore < 80) {
        vocabScore -= 10;
        styleIssues.push("Repetitive sentence beginnings detected. Vary how you start your sentences.");
    }


    // Final Calculation
    structureScore = Math.max(0, structureScore);
    vocabScore = Math.max(0, vocabScore);
    contentScore = Math.max(0, contentScore);

    let finalScore = 0;
    // Weighted Average
    if (suggestedPoints.length > 0) {
        finalScore = (contentScore * 0.45) + (structureScore * 0.25) + (vocabScore * 0.30);
    } else {
        finalScore = (structureScore * 0.4) + (vocabScore * 0.4) + (Math.min(100, wordCount / 5) * 0.2);
    }

    finalScore = Math.round(finalScore);

    // Grading Scale (Stricter)
    let letterGrade = 'F';
    if (finalScore >= 98) letterGrade = 'A+'; // Perfection required
    else if (finalScore >= 94) letterGrade = 'A';
    else if (finalScore >= 90) letterGrade = 'A-';
    else if (finalScore >= 87) letterGrade = 'B+';
    else if (finalScore >= 83) letterGrade = 'B';
    else if (finalScore >= 80) letterGrade = 'B-';
    else if (finalScore >= 77) letterGrade = 'C+';
    else if (finalScore >= 73) letterGrade = 'C';
    else if (finalScore >= 70) letterGrade = 'C-';
    else if (finalScore >= 60) letterGrade = 'D';

    // Critical Feedback Logic
    let feedback = "Needs Improvement";
    if (finalScore >= 90) feedback = "Outstanding analysis. Your writing is clear, structured, and insightful.";
    else if (finalScore >= 80) feedback = "Strong essay, but lacks some polish in vocabulary or structure.";
    else if (finalScore >= 70) feedback = "Competent, but misses key nuances. Review the structure tips.";
    else if (finalScore >= 60) feedback = "Basic understanding shown, but significant issues with flow/content.";
    else feedback = "Does not meet the academic standard. Please revise thoroughly.";

    return {
        score: finalScore,
        letterGrade,
        feedback,
        metrics,
        structureFeedback: structureIssues.length ? structureIssues : ["Structure looks solid."],
        contentFeedback: pointsMissed.length ? ["Missed key concepts."] : ["Excellent coverage."],
        coherenceFeedback: coherenceIssues.length ? coherenceIssues : ["Good flow and vocabulary."],
        styleFeedback: styleIssues.length ? styleIssues : ["Style is engaging and varied."],
        pointsCovered,
        pointsMissed
    };
};

/**
 * AI-powered Essay Grading (Groq)
 * Integrates high-intelligence feedback with local linguistic metrics
 */
export const analyzeEssayWithAI = async (
    text: string,
    prompt: string,
    suggestedPoints: string[] = [],
    config?: GradingConfig | null
): Promise<DetailedGrade> => {
    // 1. Get local metrics (Fast & Precise)
    const localGrade = analyzeEssay(text, suggestedPoints, config);

    try {
        // 2. Get AI feedback (Intelligent & Nuanced)
        const rubric = suggestedPoints.length > 0
            ? `Must cover these points: ${suggestedPoints.join(', ')}`
            : "General Academic Standard";

        const aiResult = await NovaAI.gradeEssay(text, prompt, rubric);

        if (aiResult) {
            // Merge AI feedback with local metrics
            return {
                ...localGrade,
                score: aiResult.score,
                letterGrade: aiResult.letterGrade,
                feedback: aiResult.feedback,
                contentFeedback: aiResult.contentFeedback,
                structureFeedback: aiResult.structureFeedback,
                // Keep local metrics as they are more "clinical" and accurate for raw counts
            };
        }
    } catch (error) {
        console.error("Nova AI Grading Error:", error);
    }

    // Fallback to local grade if AI fails
    return localGrade;
};
