/**
 * Mubasher.info RSS Feed Aggregator
 * Fetches financial news from Mubasher MENA market feeds.
 * Uses native fetch + lightweight XML parsing (no extra deps).
 */

const MUBASHER_FEEDS = [
  { url: 'https://www.mubasher.info/rss/category/market-news', tag: 'MARKET' },
  { url: 'https://www.mubasher.info/rss/category/economy', tag: 'ECONOMY' },
  { url: 'https://www.mubasher.info/rss/country/kw', tag: 'KUWAIT' },
  { url: 'https://www.mubasher.info/rss/country/sa', tag: 'KSA' },
  { url: 'https://www.mubasher.info/rss/country/ae', tag: 'UAE' },
];

// Lightweight RSS XML item extractor (no external dependency)
function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\\[CDATA\\\[)?(.*?)(?:\\\]\\\]>)?<\\/${tag}>`, 's'));
      return m ? m[1].trim() : '';
    };
    const title = get('title');
    const link = get('link');
    const description = get('description');
    const pubDate = get('pubDate');

    if (title) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

/**
 * Fetch a single RSS feed with timeout.
 */
async function fetchSingleFeed(feed, maxPerFeed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'VantageBot/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[mubasher] ${feed.url} → ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRssItems(xml).slice(0, maxPerFeed);

    return items.map(it => {
      const pubDate = it.pubDate ? new Date(it.pubDate) : null;
      return {
        externalId: `mubasher-${it.link || it.title}`,
        headline: it.title,
        body: (it.description || '').replace(/<[^>]*>/g, '').slice(0, 2000),
        source: 'Mubasher',
        url: it.link || '',
        publishedAt: pubDate && !isNaN(pubDate.getTime()) ? pubDate : new Date(),
        tag: feed.tag,
      };
    });
  } catch (err) {
    console.warn(`[mubasher] Feed error (${feed.url}):`, err.message);
    return [];
  }
}

export async function fetchMubasherRSS(maxPerFeed = 10) {
  // Fetch all feeds in parallel for speed
  const results = await Promise.allSettled(
    MUBASHER_FEEDS.map(feed => fetchSingleFeed(feed, maxPerFeed))
  );

  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`[mubasher] Fetched ${all.length} items from ${MUBASHER_FEEDS.length} feeds.`);
  return all;
}
