import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { analyzeWithDeepSeek, runDeepSeekJsonPrompt } from '../services/llm/deepseek.js';
import { News } from '../models/News.js';
import { buildInvestorSynthesisPrompt } from '../services/llm/prompts.js';
import { setAiLatency } from '../lib/metrics.js';
import { SimulationRun } from '../models/SimulationRun.js';

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
        : await analyzeWithDeepSeek({ role, input, kuwaitSources });

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
        : await analyzeWithDeepSeek({ role, input, kuwaitSources });

    return res.json({ provider, role, windowDays: 7, itemsAnalyzed: items.length, output });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'analysis_failed' });
  }
});

const WeeklyConsensusSchema = z.object({
  marketBias: z.enum(['Neutral', 'Bullish', 'Bearish', 'High Volatility', 'Crisis/War Premium']).default('Neutral'),
  sectorFocus: z
    .enum(['All Sectors', 'Banking', 'Telecom', 'Real Estate', 'Energy / Oil', 'Logistics', 'Consumer'])
    .default('All Sectors'),
  timeHorizon: z
    .enum(['Short-term (1-4 weeks)', 'Medium-term (3-6 months)', 'Long-term (1-3 years)'])
    .default('Short-term (1-4 weeks)'),
  countryFocus: z.string().default('GCC (All)'),
  kuwaitSources: z.array(z.string().min(2).max(200)).default([]),
});

analysisRouter.post('/weekly-consensus', requireAuth, async (req, res) => {
  const parsed = WeeklyConsensusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { marketBias, sectorFocus, timeHorizon, countryFocus, kuwaitSources } = parsed.data;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const query = { publishedAt: { $gte: since } };
  if (countryFocus !== 'GCC (All)') {
    const regex = new RegExp(countryFocus, 'i');
    query.$or = [{ tag: regex }, { headline: regex }, { body: regex }];
  }

  const items = await News.find(query)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(100)
    .select('tag source headline body url publishedAt sentimentScore sentimentLabel aiAnalysis aiSectors analyzed');

  if (!items.length) return res.status(400).json({ error: 'no_weekly_news_in_db' });

  const weekNewsInput = [
    `FOCUS REGION: ${countryFocus !== 'GCC (All)' ? countryFocus : 'GCC Market'}`,
    `FILTERS => Market Bias: ${marketBias} | Sector Focus: ${sectorFocus} | Time Horizon: ${timeHorizon}`,
    ...items.map((n, idx) => {
      const when = n.publishedAt ? new Date(n.publishedAt).toISOString().slice(0, 10) : '';
      const aiNote = n.analyzed && n.aiAnalysis
        ? `\n   [AI Pre-Analysis: ${n.sentimentLabel} (${n.sentimentScore}) — ${n.aiAnalysis}${n.aiSectors?.length ? ` | Sectors: ${n.aiSectors.join(', ')}` : ''}]`
        : '';
      return `(${idx + 1}) [${when}] [${n.tag ?? 'KUWAIT'} · ${n.source}] ${n.headline}${n.url ? ` (${n.url})` : ''}\n${(n.body ?? '').slice(0, 700)}${aiNote}`;
    }),
  ].join('\n\n');

  try {
    const dsStart = Date.now();
    const deepseekPromise = analyzeWithDeepSeek({ role: 'risk', input: weekNewsInput, kuwaitSources });
    const gmStart = Date.now();
    const politicalPromise = analyzeWithDeepSeek({ role: 'political', input: weekNewsInput, kuwaitSources });

    // Use DeepSeek for both expert first-pass analyses.
    const [deepseekView, geminiView] = await Promise.all([deepseekPromise, politicalPromise]);
    setAiLatency('deepseek', Date.now() - dsStart);
    setAiLatency('gemini', Date.now() - gmStart);

    const synthesisPrompt = buildInvestorSynthesisPrompt({
      weekNewsInput,
      deepseekView,
      geminiView,
      filters: { marketBias, sectorFocus, timeHorizon },
    });
    // Always use both AI providers + one synthesis pass.
    const synStart = Date.now();
    const synthesis = await runDeepSeekJsonPrompt(synthesisPrompt, 1900);
    setAiLatency('synthesis', Date.now() - synStart);

    await SimulationRun.create({
      userId: req.auth?.sub || 'test-user-id',
      filters: { marketBias, sectorFocus, timeHorizon },
      itemsAnalyzed: items.length,
      report: synthesis,
    });

    return res.json({
      windowDays: 7,
      itemsAnalyzed: items.length,
      filters: { marketBias, sectorFocus, timeHorizon },
      experts: {
        deepseekRisk: deepseekView,
        deepseekPolitical: geminiView,
      },
      synthesisProvider: 'deepseek',
      report: synthesis,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'weekly_consensus_failed', details: e.message, stack: e.stack });
  }
});

analysisRouter.get('/history', requireAuth, async (req, res) => {
  const runs = await SimulationRun.find({ userId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('filters itemsAnalyzed report createdAt');
  return res.json({ items: runs });
});

