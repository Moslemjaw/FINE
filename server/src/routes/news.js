import express from 'express';
import { z } from 'zod';
import { News } from '../models/News.js';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { fetchNewsDataLatest } from '../services/news/newsdata.js';
import { syncNewsDataToDb } from '../services/news/syncNewsData.js';

export const newsRouter = express.Router();

newsRouter.get('/external/newsdata', async (req, res) => {
  // Public endpoint used by the home page so it can show news
  // even before an admin imports anything into MongoDB.
  const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : 'kuwait';
  const days = Math.max(1, Math.min(14, Number(req.query.days ?? 7) || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const items = await fetchNewsDataLatest({ q });
    const filtered = items
      .filter((i) => i.publishedAt && i.publishedAt >= since)
      .sort((a, b) => (b.publishedAt?.getTime?.() ?? 0) - (a.publishedAt?.getTime?.() ?? 0))
      .slice(0, 50)
      .map((i) => ({
        _id: i.externalId,
        tag: i.tag,
        source: i.source,
        headline: i.headline,
        body: i.body,
        url: i.url,
        publishedAt: i.publishedAt,
        external: true,
      }));

    return res.json({ items: filtered });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'newsdata_failed' });
  }
});

newsRouter.get('/', async (_req, res) => {
  const items = await News.find().sort({ publishedAt: -1, createdAt: -1 }).limit(50);
  res.json({ items });
});

const CreateNewsSchema = z.object({
  tag: z.string().min(1).max(40).optional(),
  source: z.string().min(2).max(120),
  headline: z.string().min(5).max(240),
  body: z.string().max(8000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  publishedAt: z.string().datetime().optional(),
});

newsRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = CreateNewsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const created = await News.create({
    ...parsed.data,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
    createdByUserId: req.auth.sub,
  });
  res.json({ item: created });
});

const ImportSchema = z.object({
  q: z.string().min(1).max(80).default('kuwait'),
});

newsRouter.post('/import/newsdata', requireAuth, requireAdmin, async (req, res) => {
  const parsed = ImportSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const items = await fetchNewsDataLatest({ q: parsed.data.q });
  const filtered = items.filter((i) => i.publishedAt && i.publishedAt >= weekAgo);

  const sync = await syncNewsDataToDb({ q: parsed.data.q, days: 7, createdByUserId: req.auth.sub });
  const latest = await News.find().sort({ publishedAt: -1, createdAt: -1 }).limit(50);
  res.json({
    imported: sync.upserted,
    totalFetched: items.length,
    totalLastWeek: filtered.length,
    sync,
    items: latest,
  });
});

