import { News } from '../../models/News.js';
import { User } from '../../models/User.js';
import { fetchNewsDataLatest } from './newsdata.js';
import { fetchGNewsLatest } from './gnews.js';
import { fetchMubasherRSS } from './mubasher.js';
import { fetchArabicNews } from './arabicNews.js';
import { markNewsFetchNow } from '../../lib/metrics.js';
import { analyzeUnanalyzedNews } from './aiAnalyzer.js';

export async function syncNewsDataToDb({ q = 'kuwait', days = 7, createdByUserId }) {
  let actorUserId = createdByUserId;
  if (!actorUserId) {
    const anyUser = await User.findOne().select('_id');
    if (anyUser) {
      actorUserId = anyUser._id;
    } else {
      // Bootstraps a system actor so weekly sync works before first manual signup.
      const systemEmail = 'system-news-bot@fine.local';
      let systemUser = await User.findOne({ email: systemEmail }).select('_id');
      if (!systemUser) {
        systemUser = await User.create({
          email: systemEmail,
          name: 'System News Bot',
          passwordHash: 'SYSTEM_MANAGED_NO_LOGIN',
          role: 'admin',
        });
      }
      actorUserId = systemUser._id;
    }
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Aggregate from all sources in parallel — multi-country NewsData calls
  const [
    fetchedKuwait,
    fetchedSaudi,
    fetchedUAE,
    fetchedGNews,
    fetchedMubasher,
    fetchedArabic,
  ] = await Promise.allSettled([
    fetchNewsDataLatest({ q: 'kuwait', countries: ['kw'] }),
    fetchNewsDataLatest({ q: 'saudi', countries: ['sa'] }),
    fetchNewsDataLatest({ q: 'uae', countries: ['ae'] }),
    fetchGNewsLatest(q, 15),
    fetchMubasherRSS(10),
    fetchArabicNews(15),
  ]);

  const rawFetched = [
    ...(fetchedKuwait.status === 'fulfilled' ? fetchedKuwait.value : []).map(i => ({...i, provider: 'newsdata'})),
    ...(fetchedSaudi.status === 'fulfilled' ? fetchedSaudi.value : []).map(i => ({...i, provider: 'newsdata'})),
    ...(fetchedUAE.status === 'fulfilled' ? fetchedUAE.value : []).map(i => ({...i, provider: 'newsdata'})),
    ...(fetchedGNews.status === 'fulfilled' ? fetchedGNews.value : []).map(i => ({...i, provider: 'gnews'})),
    ...(fetchedMubasher.status === 'fulfilled' ? fetchedMubasher.value : []).map(i => ({...i, provider: 'mubasher'})),
    ...(fetchedArabic.status === 'fulfilled' ? fetchedArabic.value : []).map(i => ({...i, provider: i.externalProvider || 'arabic-news-api'})),
  ];

  // Deduplicate by externalId
  const seen = new Set();
  const fetched = rawFetched.filter(item => {
    const id = String(item.externalId ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  markNewsFetchNow();
  const items = fetched.filter((i) => i.publishedAt && i.publishedAt >= since && i.headline);

  let upserted = 0;
  let skipped = 0;

  for (const it of items) {
    const externalId = String(it.externalId ?? '').slice(0, 500);
    if (!externalId) {
      skipped += 1;
      continue;
    }

    const setFields = {
      tag: it.tag || 'KUWAIT',
      source: it.source || 'NewsData',
      headline: (it.headline || '').slice(0, 240),
      body: (it.body || '').slice(0, 8000),
      url: it.url || '',
      publishedAt: it.publishedAt ?? new Date(),
      createdByUserId: actorUserId,
    };

    const res = await News.updateOne(
      { externalProvider: it.provider || 'newsdata', externalId },
      {
        $set: setFields,
        $setOnInsert: {
          externalProvider: it.provider || 'newsdata',
          externalId,
        },
      },
      { upsert: true }
    );

    if (res.upsertedCount || res.modifiedCount) upserted += 1;
  }

  console.log(`[sync] Fetched ${fetched.length} total, ${items.length} in window, ${upserted} upserted, ${skipped} skipped`);

  // Auto-analyze new articles with AI (non-blocking, runs in background)
  if (upserted > 0) {
    analyzeUnanalyzedNews(upserted).catch(err => {
      console.warn('[sync] AI analysis batch error:', err.message);
    });
  }

  return { fetched: fetched.length, inWindow: items.length, upserted, skipped };
}
