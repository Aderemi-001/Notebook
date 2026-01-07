
import JSZip from 'jszip';
import mammoth from 'mammoth';

export class NovaOffice {
    /**
     * Extracts text from a DOCX file using mammoth.
     */
    static async extractTextFromDocx(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    /**
     * Extracts text from a PPTX file using JSZip and XML parsing.
     */
    static async extractTextFromPptx(file: File): Promise<string> {
        const zip = await JSZip.loadAsync(file);
        const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));

        // Sort slides numerically
        slideFiles.sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
            const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
            return numA - numB;
        });

        let fullText = "";
        const parser = new DOMParser();

        for (const slideFile of slideFiles) {
            const content = await zip.file(slideFile)?.async('string');
            if (content) {
                const xmlDoc = parser.parseFromString(content, "text/xml");
                // Powerpoint text is inside <a:t> tags
                const textNodes = xmlDoc.getElementsByTagName('a:t');
                let slideText = "";
                for (let i = 0; i < textNodes.length; i++) {
                    slideText += (textNodes[i].textContent || "") + " ";
                }
                fullText += `[Slide ${slideFile.match(/slide(\d+)\.xml/)?.[1]}]\n${slideText.trim()}\n\n`;
            }
        }

        // Also check for slide notes if needed (ppt/notesSlides/notesSlide*.xml)
        const notesFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/notesSlides/notesSlide') && name.endsWith('.xml'));
        if (notesFiles.length > 0) {
            fullText += "\n--- Speaker Notes ---\n";
            notesFiles.sort();
            for (const notesFile of notesFiles) {
                const content = await zip.file(notesFile)?.async('string');
                if (content) {
                    const xmlDoc = parser.parseFromString(content, "text/xml");
                    const textNodes = xmlDoc.getElementsByTagName('a:t');
                    let notesText = "";
                    for (let i = 0; i < textNodes.length; i++) {
                        notesText += (textNodes[i].textContent || "") + " ";
                    }
                    if (notesText.trim()) {
                        fullText += `[Notes for Slide ${notesFile.match(/notesSlide(\d+)\.xml/)?.[1]}]\n${notesText.trim()}\n\n`;
                    }
                }
            }
        }

        return fullText.trim();
    }
}
