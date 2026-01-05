
import { getResolvedPDFJS } from 'unpdf';

// Types for detailed text items (re-defined or imported if available)
interface TextItem {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
    fontName: string;
    hasEOL: boolean;
}

export class NovaPDF {

    /**
     * EXTRACTS text from a PDF file using unpdf + layout analysis.
     * Reconstructs paragraphs and handles columns better than simple joins.
     */
    static async extractText(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();

        // Use unpdf to resolve the PDF.js engine and getDocument function
        const { getDocument } = await getResolvedPDFJS();

        const pdf = await getDocument(arrayBuffer).promise;

        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // 1. Get raw items with coordinates
            // textContent.items comes from PDF.js
            const items: TextItem[] = textContent.items as any[];

            if (items.length === 0) continue;

            // 2. Sort items by Y (descending - top to bottom) then X (ascending - left to right)
            // PDF coordinates: (0,0) is usually bottom-left. So higher Y is higher on page.
            items.sort((a, b) => {
                const yDiff = b.transform[5] - a.transform[5];
                if (Math.abs(yDiff) > 5) { // Tolerance for same line
                    return yDiff;
                }
                return a.transform[4] - b.transform[4];
            });

            // 3. Reconstruct Lines
            let currentLineY = items[0].transform[5];
            let currentLineText = "";
            let pageText = "";

            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                const y = item.transform[5];
                const x = item.transform[4];
                const text = item.str;

                // Check if new line (significant Y change)
                if (Math.abs(y - currentLineY) > 8) { // Threshold for new line (roughly 8-10pt)
                    pageText += currentLineText + "\n";
                    currentLineText = "";
                    currentLineY = y;
                }

                // Add spacing based on X gap? simpler: just add space
                // Can be improved by checking (x - prevX - prevWidth)
                currentLineText += (currentLineText ? " " : "") + text;
            }
            pageText += currentLineText + "\n"; // Add last line

            // 4. Clean Page artifacts (Headers/Footers could be filtered if we tracked them across pages)
            // For now, just append
            fullText += pageText + "\n\n";
        }

        return fullText.trim();
    }
}
