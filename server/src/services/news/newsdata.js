function getNewsDataKey() {
  const k = process.env.NEWSDATA_API_KEY;
  if (!k) throw new Error('Missing NEWSDATA_API_KEY');
  return k;
}

function toDateMaybe(x) {
  if (!x) return null;
  const d = new Date(x);
  // eslint-disable-next-line no-restricted-globals
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Fetch with retry logic for transient failures.
 */
async function fetchWithRetry(url, options = {}, retries = 1, delayMs = 2000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok || attempt === retries) return res;
      // Retry on 5xx errors
      if (res.status >= 500) {
        console.warn(`[newsdata] Retry ${attempt + 1}/${retries} after ${res.status}`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[newsdata] Retry ${attempt + 1}/${retries} after error: ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function fetchNewsDataLatest({
  q = 'kuwait',
  countries = ['kw', 'sa', 'ae'],
  languages = ['ar', 'en'],
  categories = ['business', 'politics', 'technology', 'top', 'domestic'],
  timezone = 'asia/kuwait',
  removeDuplicate = true,
  image = 0,
  prioritydomain = 'low',
}) {
  const apiKey = getNewsDataKey();
  const url = new URL('https://newsdata.io/api/1/latest');

  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('q', q);
  url.searchParams.set('country', countries.join(','));
  url.searchParams.set('language', languages.join(','));
  url.searchParams.set('category', categories.join(','));
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('prioritydomain', prioritydomain);
  url.searchParams.set('image', String(image));
  url.searchParams.set('removeduplicate', removeDuplicate ? '1' : '0');

  const res = await fetchWithRetry(url.toString(), { method: 'GET' });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.results?.message ?? data?.message ?? data?.error ?? `NewsData error (${res.status})`;
    throw new Error(msg);
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  console.log(`[newsdata] Fetched ${results.length} articles for q="${q}" countries=[${countries}]`);

  return results.map((r) => {
    const publishedAt =
      toDateMaybe(r.pubDate) ??
      toDateMaybe(r.pubDateTZ) ??
      toDateMaybe(r.publishedAt) ??
      null;

    return {
      externalId: r.article_id ?? r.link ?? r.title,
      source: r.source_id ?? r.source_name ?? 'NewsData',
      headline: r.title ?? '',
      body: r.description ?? r.content ?? '',
      url: r.link ?? '',
      tag: Array.isArray(r.category) && r.category.length ? String(r.category[0]).toUpperCase() : 'KUWAIT',
      publishedAt,
      raw: r,
    };
  });
}
