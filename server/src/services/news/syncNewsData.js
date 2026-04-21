import { News } from '../../models/News.js';
import { fetchNewsDataLatest } from './newsdata.js';

export async function syncNewsDataToDb({ q = 'kuwait', days = 7, createdByUserId }) {
  if (!createdByUserId) throw new Error('createdByUserId required');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fetched = await fetchNewsDataLatest({ q });
  const items = fetched.filter((i) => i.publishedAt && i.publishedAt >= since && i.headline);

  let upserted = 0;
  let skipped = 0;

  for (const it of items) {
    const externalId = String(it.externalId ?? '').slice(0, 500);
    if (!externalId) {
      skipped += 1;
      continue;
    }

    const update = {
      externalProvider: 'newsdata',
      externalId,
      tag: it.tag || 'KUWAIT',
      source: it.source || 'NewsData',
      headline: (it.headline || '').slice(0, 240),
      body: (it.body || '').slice(0, 8000),
      url: it.url || '',
      publishedAt: it.publishedAt ?? new Date(),
      createdByUserId,
    };

    const res = await News.updateOne(
      { externalProvider: 'newsdata', externalId },
      { $set: update, $setOnInsert: update },
      { upsert: true }
    );

    if (res.upsertedCount || res.modifiedCount) upserted += 1;
  }

  return { fetched: fetched.length, inWindow: items.length, upserted, skipped };
}

