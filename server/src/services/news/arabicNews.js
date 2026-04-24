/**
 * Arabic News API — RapidAPI
 * Fetches from Al Jazeera Arabic, BBC Arabic, Sky News Arabic
 * Requires RAPIDAPI_KEY in .env
 * 
 * Response formats:
 * Al Jazeera: { headline, underHeadline, content, date, image, url }
 * Sky News:   { source, title, image, url, content }
 * BBC Arabic: [] (sometimes empty)
 */

const SOURCES = [
  { path: '/aljazeera', name: 'Al Jazeera Arabic' },
  { path: '/bbcarabic', name: 'BBC Arabic' },
  { path: '/skynewsarabic', name: 'Sky News Arabic' },
];

const BASE = 'https://arabic-news-api.p.rapidapi.com';

/**
 * Fetch news from a single Arabic source.
 */
async function fetchSource(sourcePath, sourceName, apiKey) {
  try {
    const res = await fetch(`${BASE}${sourcePath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'arabic-news-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[arabic-news] ${sourceName} returned ${res.status}: ${errText.slice(0, 100)}`);
      return [];
    }

    const data = await res.json();
    let articles = [];
    if (Array.isArray(data)) {
      articles = data;
    } else if (data && typeof data === 'object') {
      articles = data.results || data.articles || data.data || data.news || [];
      if (!Array.isArray(articles)) articles = [];
    }

    console.log(`[arabic-news] ${sourceName}: ${articles.length} articles`);

    return articles.map((item, idx) => {
      // Normalize across different source formats
      const headline = item.headline || item.title || item.name || '';
      const body = item.content || item.underHeadline || item.description || item.summary || '';
      const url = item.url || item.link || '';

      // Generate stable ID from URL or headline
      const idBase = url || headline;
      const externalId = `arabic-${sourcePath.replace('/', '')}-${Buffer.from(idBase).toString('base64').slice(0, 80)}`;

      return {
        externalProvider: 'arabic-news-api',
        externalId,
        tag: 'GCC',
        source: sourceName,
        headline,
        body,
        url,
        // Arabic News API doesn't always have dates — use current date
        publishedAt: item.date ? new Date(item.date) : new Date(),
      };
    }).filter(a => a.headline && a.headline.length > 3);
  } catch (err) {
    console.warn(`[arabic-news] ${sourceName} error: ${err.message}`);
    return [];
  }
}

/**
 * Fetch from all 3 Arabic news sources in parallel.
 */
export async function fetchArabicNews(maxPerSource = 20) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.warn('[arabic-news] RAPIDAPI_KEY not set, skipping');
    return [];
  }

  const results = await Promise.allSettled(
    SOURCES.map(s => fetchSource(s.path, s.name, apiKey))
  );

  const all = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      all.push(...r.value.slice(0, maxPerSource));
    }
  }

  console.log(`[arabic-news] Total: ${all.length} articles from Arabic sources`);
  return all;
}
