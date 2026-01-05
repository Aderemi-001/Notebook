declare module 'sentiment' {
    export interface AnalysisResult {
        score: number;
        comparative: number;
        tokens: string[];
        words: string[];
        positive: string[];
        negative: string[];
    }

    export default class Sentiment {
        analyze(text: string): AnalysisResult;
    }
}
