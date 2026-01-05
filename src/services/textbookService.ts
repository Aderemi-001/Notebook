
export interface TextbookResult {
    title: string;
    author: string;
    description: string;
    publishedDate: string;
    thumbnail?: string;
    previewLink: string;
    infoLink: string;
    pageCount?: number;
    isbn?: string;
}

export const textbookService = {
    /**
     * Search for books using Google Books API
     */
    async searchBooks(query: string, filterFree: boolean = false): Promise<TextbookResult[]> {
        if (!query.trim()) return [];

        try {
            let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
            if (filterFree) {
                url += '&filter=free-ebooks';
            }
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch from Google Books API');
            }

            const data = await response.json();

            if (!data.items) return [];

            return data.items.map((item: any) => {
                const info = item.volumeInfo;
                const isbn = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ||
                    info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;

                return {
                    title: info.title || 'Unknown Title',
                    author: info.authors ? info.authors.join(', ') : 'Unknown Author',
                    description: info.description ? info.description.substring(0, 200) + (info.description.length > 200 ? '...' : '') : 'No description available.',
                    publishedDate: info.publishedDate || 'Unknown Date',
                    thumbnail: info.imageLinks?.thumbnail,
                    previewLink: info.previewLink,
                    infoLink: info.infoLink,
                    pageCount: info.pageCount,
                    isbn: isbn
                };
            });
        } catch (error) {
            console.error('Textbook search error:', error);
            throw error;
        }
    }
};
