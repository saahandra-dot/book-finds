export type BookSummary = {
    workId: string;
    title: string;
    authors: string[];
    firstPublishYear: number | null;
    coverUrl: string | null;
};

export type BookDetails = BookSummary & {
    description: string | null;
    categories: string[];
    publisher: string | null;
    isbn: string | null;
    editionId: string | null;
};