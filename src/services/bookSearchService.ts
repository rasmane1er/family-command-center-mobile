// Open Library's public search API — no API key, no auth, no rate-limit
// registration required. Used to auto-fill title/author/pages/genre/cover
// when adding a book instead of typing everything by hand.
// Docs: https://openlibrary.org/dev/docs/api/search
export interface BookSearchResult {
  title: string;
  author: string;
  totalPages?: number;
  genre?: string;
  coverUrl?: string;
  firstPublishYear?: number;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
  subject?: string[];
}

const SEARCH_TIMEOUT_MS = 10_000;

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=12&fields=title,author_name,cover_i,number_of_pages_median,first_publish_year,subject`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Book search failed: ${res.status}`);
    const data: { docs?: OpenLibraryDoc[] } = await res.json();
    return (data.docs ?? [])
      .filter((d) => !!d.title)
      .map((d) => ({
        title: d.title,
        author: d.author_name?.[0] ?? '',
        totalPages: d.number_of_pages_median,
        genre: d.subject?.[0],
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
        firstPublishYear: d.first_publish_year,
      }));
  } finally {
    clearTimeout(timeout);
  }
}
