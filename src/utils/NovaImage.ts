
import { createWorker } from 'tesseract.js';

export class NovaImage {
    /**
     * Extracts text from an image file using Tesseract.js
     */
    static async extractText(file: File): Promise<string> {
        const worker = await createWorker('eng');
        const imageUrl = URL.createObjectURL(file);

        try {
            const { data: { text } } = await worker.recognize(imageUrl);
            return text;
        } finally {
            await worker.terminate();
            URL.revokeObjectURL(imageUrl);
        }
    }

    /**
     * Checks if a file is an image
     */
    static isImage(file: File): boolean {
        return file.type.startsWith('image/');
    }
}
