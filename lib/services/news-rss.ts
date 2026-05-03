export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

export async function getGoogleNewsRSS(query: string, maxResults: number = 10): Promise<NewsArticle[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const xml = await res.text();

    // Simple XML parsing for RSS items
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxResults) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const source = extractTag(itemXml, 'source');

      if (title) {
        items.push({
          title,
          link: link || '',
          pubDate: pubDate || new Date().toISOString(),
          source: source || 'Google News',
          snippet: title.substring(0, 150),
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

export async function getZipCodeNews(zip: string): Promise<NewsArticle[]> {
  const queries = [
    `${zip} real estate`,
    `${zip} development`,
    `${zip} property market`,
  ];

  const allArticles: NewsArticle[] = [];
  for (const q of queries) {
    const articles = await getGoogleNewsRSS(q, 3);
    allArticles.push(...articles);
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return allArticles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
  return match?.[1]?.trim() || '';
}
