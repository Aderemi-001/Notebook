
import { getDocumentProxy, extractText as unpdfExtractText } from 'unpdf';
import { createWorker } from 'tesseract.js';


export class NovaPDF {

    /**
     * EXTRACTS text from a PDF file using unpdf + layout analysis.
     * Reconstructs paragraphs and handles columns better than simple joins.
     * Falls back to OCR if no text is found (for scanned/image-only PDFs).
     */
    static async extractText(file: File, onProgress?: (message: string) => void): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();

        // Copy to Uint8Array (BinaryData for unpdf 1.4.0)
        const pdfData = new Uint8Array(arrayBuffer);

        onProgress?.("Extracting text from PDF...");

        // Load PDF into a PDFDocumentProxy using unpdf's getDocumentProxy
        const pdf = await getDocumentProxy(pdfData);

        // Extract text with mergePages option (pass the proxy directly)
        const { text: fullText } = await unpdfExtractText(pdf, { mergePages: true });

        const extractedText = fullText.trim();

        // If no meaningful text was extracted, try OCR
        if (extractedText.length < 50) {
            onProgress?.("No text found. Attempting OCR on scanned pages...");
            return await this.extractTextWithOCR(pdf, onProgress);
        }

        return extractedText;
    }

    /**
     * Extracts text from image-only PDFs using OCR (Tesseract.js)
     * Renders each page as a canvas and performs OCR
     */
    private static async extractTextWithOCR(pdf: any, onProgress?: (message: string) => void): Promise<string> {
        const worker = await createWorker('eng');
        let fullText = "";

        try {
            for (let i = 1; i <= pdf.numPages; i++) {
                onProgress?.(`Processing page ${i} of ${pdf.numPages} with OCR...`);

                const page = await pdf.getPage(i);

                // Render page to canvas
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) {
                    console.warn(`Could not get canvas context for page ${i}`);
                    continue;
                }

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert canvas to blob
                const blob = await new Promise<Blob>((resolve) =>
                    canvas.toBlob((blob) => resolve(blob!), 'image/png')
                );

                // Perform OCR
                const imageUrl = URL.createObjectURL(blob);
                try {
                    const { data: { text } } = await worker.recognize(imageUrl);
                    fullText += text + "\n\n";
                } finally {
                    URL.revokeObjectURL(imageUrl);
                }
            }

            return fullText.trim();
        } finally {
            await worker.terminate();
        }
    }
}
