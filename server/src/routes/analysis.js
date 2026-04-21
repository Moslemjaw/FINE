import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { analyzeWithDeepSeek } from '../services/llm/deepseek.js';
import { analyzeWithGemini } from '../services/llm/gemini.js';
import { News } from '../models/News.js';

export const analysisRouter = express.Router();

const AnalyzeSchema = z.object({
  provider: z.enum(['deepseek', 'gemini']),
  role: z.enum(['political', 'risk']),
  input: z.string().min(20).max(30000),
  kuwaitSources: z.array(z.string().min(2).max(200)).default([]),
});

analysisRouter.post('/', requireAuth, async (req, res) => {
  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { provider, role, input, kuwaitSources } = parsed.data;

  try {
    const output =
      provider === 'deepseek'
        ? await analyzeWithDeepSeek({ role, input, kuwaitSources })
        : await analyzeWithGemini({ role, input, kuwaitSources });

    return res.json({ provider, role, output });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'analysis_failed' });
  }
});

const PastWeekSchema = z.object({
  provider: z.enum(['deepseek', 'gemini']),
  role: z.enum(['political', 'risk']),
  kuwaitSources: z.array(z.string().min(2).max(200)).default([]),
});

analysisRouter.post('/past-week', requireAuth, async (req, res) => {
  const parsed = PastWeekSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { provider, role, kuwaitSources } = parsed.data;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const items = await News.find({ publishedAt: { $gte: since } })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(80)
    .select('tag source headline body url publishedAt');

  const input = [
    'PAST WEEK KUWAIT/GCC NEWSSET (use as evidence, extract drivers, and synthesize):',
    ...items.map((n, idx) => {
      const when = n.publishedAt ? new Date(n.publishedAt).toISOString().slice(0, 10) : '';
      return `(${idx + 1}) [${when}] [${n.tag ?? 'KUWAIT'} · ${n.source}] ${n.headline}${n.url ? ` (${n.url})` : ''}\n${(n.body ?? '').slice(0, 600)}`;
    }),
  ].join('\n\n');

  try {
    const output =
      provider === 'deepseek'
        ? await analyzeWithDeepSeek({ role, input, kuwaitSources })
        : await analyzeWithGemini({ role, input, kuwaitSources });

    return res.json({ provider, role, windowDays: 7, itemsAnalyzed: items.length, output });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'analysis_failed' });
  }
});

