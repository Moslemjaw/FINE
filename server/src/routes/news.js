import express from 'express';
import { z } from 'zod';
import { News } from '../models/News.js';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { fetchNewsDataLatest } from '../services/news/newsdata.js';
import { fetchGNewsLatest } from '../services/news/gnews.js';
import { fetchMubasherRSS } from '../services/news/mubasher.js';
import { syncNewsDataToDb } from '../services/news/syncNewsData.js';
import { scoreArticles, scoreSentiment } from '../services/news/sentiment.js';
import { analyzeAndSaveById, analyzeUnanalyzedNews } from '../services/news/aiAnalyzer.js';

export const newsRouter = express.Router();

newsRouter.get('/weekly', async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.max(1, Math.min(20, Number(req.query.pageSize ?? 8) || 8));
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const autoSync = String(req.query.autoSync ?? '1') !== '0';

  try {
    const count = await News.countDocuments({ publishedAt: { $gte: since } });

    // Keep live-week DB populated — sync when below threshold
    if (autoSync && count < pageSize * 2 && process.env.NEWSDATA_API_KEY) {
      await syncNewsDataToDb({ q: 'kuwait', days: 7 });
    }

    const total = await News.countDocuments({ publishedAt: { $gte: since } });
    const items = await News.find({ publishedAt: { $gte: since } })
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Use AI analysis if available, fall back to keyword scorer
    const scoredItems = items.map(item => {
      const doc = item.toObject();
      if (doc.analyzed && doc.sentimentScore !== null) {
        // Use stored AI analysis
      } else {
        doc.sentimentScore = scoreSentiment(`${doc.headline} ${doc.body || ''}`);
        doc.sentimentLabel = doc.sentimentScore > 0.15 ? 'Bullish' : doc.sentimentScore < -0.15 ? 'Bearish' : 'Neutral';
      }
      return doc;
    });

    // Compute overall sentiment
    const { average, label } = scoreArticles(items);

    return res.json({
      windowDays: 7,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      sentiment: { average, label },
      items: scoredItems,
    });
  } catch (e) {
    console.error('[news/weekly]', e.message);
    return res.status(500).json({ error: 'weekly_news_failed' });
  }
});

// Aggregate stats for ALL weekly articles — used by the dashboard overview
newsRouter.get('/stats', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const items = await News.find({ publishedAt: { $gte: since } })
      .sort({ publishedAt: -1 })
      .select('headline body source tag sentimentScore sentimentLabel aiAnalysis aiSectors analyzed')
      .lean();

    let bull = 0, bear = 0, neutral = 0, totalScore = 0, scoredCount = 0;
    const sourceSet = new Set();
    const sectorMap = {};

    for (const n of items) {
      const score = n.sentimentScore ?? scoreSentiment(`${n.headline} ${n.body || ''}`);
      if (score > 0.15) bull++;
      else if (score < -0.15) bear++;
      else neutral++;
      totalScore += score;
      scoredCount++;
      if (n.source) sourceSet.add(n.source);
      if (n.aiSectors?.length) {
        for (const sec of n.aiSectors) {
          sectorMap[sec] = (sectorMap[sec] || 0) + 1;
        }
      }
    }

    const avgScore = scoredCount > 0 ? totalScore / scoredCount : 0;
    const topSectors = Object.entries(sectorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return res.json({
      total: items.length,
      bull,
      bear,
      neutral,
      sources: sourceSet.size,
      avgScore: Math.round(avgScore * 100) / 100,
      topSectors,
      analyzedCount: items.filter(n => n.analyzed).length,
    });
  } catch (e) {
    console.error('[news/stats]', e.message);
    return res.status(500).json({ error: 'stats_failed' });
  }
});

// Live sentiment endpoint — polled by dashboard gauge
newsRouter.get('/sentiment', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const items = await News.find({ publishedAt: { $gte: since } })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50)
      .select('headline body source tag publishedAt sentimentScore sentimentLabel aiAnalysis aiSectors analyzed');

    // Use AI scores where available, keyword fallback otherwise
    const scores = items.map(n => {
      if (n.analyzed && n.sentimentScore !== null) return n.sentimentScore;
      return scoreSentiment(`${n.headline} ${n.body || ''}`);
    });
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const label = average > 0.15 ? 'Bullish' : average < -0.15 ? 'Bearish' : 'Neutral';

    // Convert average from [-1, 1] to [0, 100] scale for the gauge
    const gaugeScore = Math.round((average + 1) * 50);
    const isRedAlert = average < -0.4;

    const scoredItems = items.map((n, i) => ({
      _id: n._id,
      headline: n.headline,
      source: n.source,
      tag: n.tag,
      publishedAt: n.publishedAt,
      sentimentScore: scores[i],
      sentimentLabel: n.sentimentLabel || (scores[i] > 0.15 ? 'Bullish' : scores[i] < -0.15 ? 'Bearish' : 'Neutral'),
      aiAnalysis: n.aiAnalysis || '',
      aiSectors: n.aiSectors || [],
      analyzed: n.analyzed || false,
    }));

    return res.json({
      average,
      gaugeScore,
      label,
      isRedAlert,
      total: items.length,
      items: scoredItems,
    });
  } catch (e) {
    console.error('[news/sentiment]', e.message);
    return res.status(500).json({ error: 'sentiment_failed' });
  }
});

newsRouter.get('/external/newsdata', async (req, res) => {
  const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : 'kuwait';
  const days = Math.max(1, Math.min(14, Number(req.query.days ?? 7) || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [newsDataItems, gnewsItems, mubasherItems] = await Promise.allSettled([
      fetchNewsDataLatest({ q }),
      fetchGNewsLatest(q, 15),
      fetchMubasherRSS(10),
    ]);
    const items = [
      ...(newsDataItems.status === 'fulfilled' ? newsDataItems.value : []),
      ...(gnewsItems.status === 'fulfilled' ? gnewsItems.value : []),
      ...(mubasherItems.status === 'fulfilled' ? mubasherItems.value : []),
    ];
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
        sentimentScore: scoreSentiment(`${i.headline} ${i.body || ''}`),
        external: true,
      }));

    return res.json({ items: filtered });
  } catch (e) {
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

// Admin or Publisher can create news
function requirePublisherOrAdmin(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'unauthorized' });
  if (req.auth.role !== 'admin' && req.auth.role !== 'publisher') {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

newsRouter.post('/', requireAuth, requirePublisherOrAdmin, async (req, res) => {
  const parsed = CreateNewsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const created = await News.create({
    ...parsed.data,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
    createdByUserId: req.auth.sub,
  });

  // Auto-analyze published article in background
  analyzeAndSaveById(created._id).catch(err => {
    console.warn('[news/publish] AI analysis failed:', err.message);
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
  const sync = await syncNewsDataToDb({ q: parsed.data.q, days: 7, createdByUserId: req.auth.sub });
  const latest = await News.find().sort({ publishedAt: -1, createdAt: -1 }).limit(50);
  res.json({
    imported: sync.upserted,
    totalFetched: sync.fetched,
    totalLastWeek: sync.inWindow,
    sync,
    items: latest,
  });
});

// Admin: Trigger AI analysis on all unanalyzed articles
newsRouter.post('/analyze-all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const batchSize = Math.min(50, Number(req.body?.batchSize) || 20);
    const result = await analyzeUnanalyzedNews(batchSize);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[news/analyze-all]', e.message);
    res.status(500).json({ error: 'analysis_batch_failed', details: e.message });
  }
});
