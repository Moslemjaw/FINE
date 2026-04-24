import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { News } from '../models/News.js';
import { DebateSession } from '../models/DebateSession.js';
import { runDeepSeekJsonPrompt } from '../services/llm/deepseek.js';
import { fetchAlphaVantageData } from '../services/market/alphavantage.js';

export const debateRouter = express.Router();

/*
  AGENT DEFINITIONS — 6 Agents
  Agents 1,3,5 → DeepSeek (rapid sentiment, macro)
  Agents 2,4,6 → Gemini 1.5-Pro (structural analysis, risk)
*/
const AGENTS = [
  { id: 1, name: 'Retail Sentiment', provider: 'deepseek', role: 'retail',
    brief: 'Retail investor sentiment analyst. Focus on crowd psychology, social media pulse, and short-term momentum in Kuwait/GCC markets. Use colloquial yet data-driven language.',
    temperature: 0.7 },
  { id: 2, name: 'Institutional PM', provider: 'deepseek', role: 'institutional',
    brief: 'Institutional portfolio manager. Focus on deep structural analysis, earnings quality, valuation multiples, and large-cap positioning in Kuwait/GCC. Use formal, measured language.',
    temperature: 0.3 },
  { id: 3, name: 'Dividend Strategist', provider: 'deepseek', role: 'dividend',
    brief: 'Dividend yield-focused strategist. Analyze payout ratios, free cash flow sustainability, and yield relative to regional sovereign bonds in Kuwait/GCC. Be precise and income-focused.',
    temperature: 0.4 },
  { id: 4, name: 'Real Estate Analyst', provider: 'deepseek', role: 'realestate',
    brief: 'GCC real estate and infrastructure analyst. Focus on construction pipelines, REIT valuations, urbanization trends, and mega-project timelines. Be data-heavy and structural.',
    temperature: 0.3 },
  { id: 5, name: 'GCC Macro Strategist', provider: 'deepseek', role: 'macro',
    brief: 'GCC macro strategist. Cover oil price transmission, fiscal balances, FX peg implications, monetary policy (CBK, SAMA), and regional capital flows. Be bold and forward-looking.',
    temperature: 0.6 },
  { id: 6, name: 'Risk Manager', provider: 'deepseek', role: 'risk',
    brief: 'Chief Risk Officer. Your job is to CHALLENGE the consensus. Find tail risks, fragility, contagion paths, and scenarios where the bullish case fails. Be contrarian and rigorous.',
    temperature: 0.25 },
];

// Max tokens per agent response — increased for depth
const AGENT_MAX_TOKENS = 1800;
const CONSENSUS_MAX_TOKENS = 2200;

function buildAgentPrompt(agent, newsContext, priorMessages, debatePhase, countryFocus) {
  const history = priorMessages.map(m =>
    `[${m.agentName}]: ${m.content}`
  ).join('\n\n');

  const phaseInstruction = {
    catalyst: `You are the ${agent.name} agent. Evaluate the latest data for ${countryFocus !== 'GCC (All)' ? countryFocus : 'the GCC market'}. You are STARTING the debate. Set the tone based on the latest news. Be provocative and clear about your thesis.`,
    challenge: 'You must CHALLENGE the emerging consensus. Find flaws, risks, and counter-arguments. Do NOT agree with previous speakers.',
    verdict: 'You are delivering the FINAL VERDICT. Synthesize all viewpoints, weigh the evidence, and provide a stabilizing institutional outlook.',
    discuss: 'Respond to the ongoing debate. Build on or challenge previous arguments with new evidence.',
  }[debatePhase] || 'Contribute your expert perspective to the market debate.';

  return `
${agent.brief}

${phaseInstruction}

MARKET NEWS CONTEXT:
${newsContext}

${history ? `PRIOR DEBATE MESSAGES:\n${history}` : '(You are the first to speak.)'}

=== RESPONSE REQUIREMENTS ===

**DETAILED LOGIC (MANDATORY):** You MUST include a "detailedLogic" section that:
1. Cites AT LEAST 2 specific news articles by number (e.g. "Article #3 states...")
2. References exact figures, dates, or data points from the MARKET NEWS CONTEXT
3. Explains the transmission mechanism: how does this specific data point connect to your market conclusion?
4. If macro data (oil price, commodity data) is available, reference it with the exact value

Do NOT make generic statements without evidence. Every claim must trace back to a specific article or data point.

Respond with ONLY valid JSON in this exact shape:
{
  "analysis": "Your 5-10 sentence market analysis. Must reference specific news items by number and cite actual data points. Be thorough and institutional in tone.",
  "detailedLogic": "3-5 sentences explaining your reasoning chain: which specific facts (with article numbers and exact figures) from the news context led to your conclusion, and what transmission mechanism connects them to market impact.",
  "sentiment": "Bullish" or "Bearish" or "Neutral",
  "confidence": 50 (number 0-100 reflecting your conviction level),
  "keyPoint": "One-sentence thesis statement backed by a specific data point",
  "catalysts": ["2-3 near-term catalysts that could validate or invalidate your thesis"],
  "riskFactors": ["1-2 key risks to your position"]
}
`.trim();
}

const StartDebateSchema = z.object({
  marketBias: z.string().default('Neutral'),
  sectorFocus: z.string().default('All Sectors'),
  timeHorizon: z.string().default('Short-term (1-4 weeks)'),
  countryFocus: z.string().default('GCC (All)'),
});

debateRouter.post('/start', requireAuth, async (req, res) => {
  const parsed = StartDebateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { marketBias, sectorFocus, timeHorizon, countryFocus } = parsed.data;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const query = { publishedAt: { $gte: since } };
  if (countryFocus !== 'GCC (All)') {
    const regex = new RegExp(countryFocus, 'i');
    query.$or = [{ tag: regex }, { headline: regex }, { body: regex }];
  }

  const [newsItems, macroData] = await Promise.all([
    News.find(query)
      .sort({ publishedAt: -1 })
      .limit(50)
      .select('tag source headline body publishedAt sentimentScore sentimentLabel aiAnalysis aiSectors analyzed'),
    fetchAlphaVantageData()
  ]);

  if (!newsItems.length) {
    return res.status(400).json({ error: 'no_news_available' });
  }

  let newsContext = newsItems.map((n, i) => {
    const when = n.publishedAt ? new Date(n.publishedAt).toISOString().slice(0, 10) : '';
    const aiNote = n.analyzed && n.aiAnalysis
      ? `\n   [AI: ${n.sentimentLabel} (${n.sentimentScore}) — ${n.aiAnalysis}${n.aiSectors?.length ? ` | Sectors: ${n.aiSectors.join(', ')}` : ''}]`
      : '';
    return `(${i + 1}) [${when}] [${n.source}] ${n.headline}\n${(n.body || '').slice(0, 400)}${aiNote}`;
  }).join('\n\n');

  if (macroData) {
    newsContext = `=== LATEST COMMODITY DATA (ALPHA VANTAGE) ===\nIndicator: ${macroData.indicator}\nDate: ${macroData.date}\nValue: ${macroData.value} ${macroData.unit}\n\n=== MARKET NEWS ===\n` + newsContext;
  }

  // Add simulation context
  newsContext = `=== DEBATE PARAMETERS ===\nMarket Bias: ${marketBias}\nSector Focus: ${sectorFocus}\nTime Horizon: ${timeHorizon}\nCountry Focus: ${countryFocus}\n\n` + newsContext;

  const session = await DebateSession.create({
    userId: req.auth.sub,
    trigger: newsItems[0]?.headline || 'Market Analysis',
    filters: { marketBias, sectorFocus },
    messages: [],
  });

  /* ── Turn-Based Debate Protocol ── */
  /*
    Phase 1 - THE CATALYST: Agent 5 (GCC Macro) or Agent 1 (Retail) starts based on news
    Phase 2 - DISCUSSION: Agents 3, 4, 2 each respond
    Phase 3 - THE CHALLENGE: Agent 6 (Risk Manager) counter-argues
    Phase 4 - THE VERDICT: Agent 2 (Institutional) provides final outlook
  */
  const debateOrder = [
    { agent: AGENTS[4], phase: 'catalyst' },   // Agent 5 - GCC Macro starts
    { agent: AGENTS[0], phase: 'discuss' },     // Agent 1 - Retail responds
    { agent: AGENTS[2], phase: 'discuss' },     // Agent 3 - Dividend weighs in
    { agent: AGENTS[3], phase: 'discuss' },     // Agent 4 - Real Estate adds context
    { agent: AGENTS[5], phase: 'challenge' },   // Agent 6 - Risk Manager challenges
    { agent: AGENTS[1], phase: 'verdict' },     // Agent 2 - Institutional final verdict
  ];

  const messages = [];

  for (const turn of debateOrder) {
    const prompt = buildAgentPrompt(turn.agent, newsContext, messages, turn.phase, countryFocus);
    try {
      let result;
      result = await runDeepSeekJsonPrompt(prompt, AGENT_MAX_TOKENS);

      const analysisText = result.analysis || result.keyPoint || JSON.stringify(result);
      const detailedLogic = result.detailedLogic || '';
      const fullContent = detailedLogic
        ? `${analysisText}\n\n📋 Logic: ${detailedLogic}`
        : analysisText;

      const msg = {
        agentId: turn.agent.id,
        agentName: turn.agent.name,
        provider: turn.agent.provider,
        role: turn.agent.role,
        content: fullContent,
        sentiment: ['Bullish', 'Bearish', 'Neutral'].includes(result.sentiment) ? result.sentiment : 'Neutral',
        confidence: Math.min(100, Math.max(0, Number(result.confidence) || 50)),
        catalysts: Array.isArray(result.catalysts) ? result.catalysts : [],
        riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors : [],
        keyPoint: result.keyPoint || '',
        timestamp: new Date(),
      };
      messages.push(msg);
    } catch (err) {
      console.error(`[debate] Agent ${turn.agent.name} (${turn.agent.provider}) error:`, err.message);
      messages.push({
        agentId: turn.agent.id,
        agentName: turn.agent.name,
        provider: turn.agent.provider,
        role: turn.agent.role,
        content: `[Analysis temporarily unavailable — ${turn.agent.name} is recalibrating models]`,
        sentiment: 'Neutral',
        confidence: 0,
        catalysts: [],
        riskFactors: [],
        keyPoint: '',
        timestamp: new Date(),
      });
    }
  }

  // Generate consensus report
  let consensusReport = null;
  let marketImpactRating = 5;
  try {
    const consensusPrompt = `
You are a senior CIO synthesizing a multi-agent market debate on Kuwait/GCC.

DEBATE PARAMETERS:
Market Bias: ${marketBias} | Sector Focus: ${sectorFocus} | Time Horizon: ${timeHorizon}

DEBATE TRANSCRIPT:
${messages.map(m => `[${m.agentName} (${m.sentiment}, ${m.confidence}% confidence)]: ${m.content}`).join('\n\n')}

Generate a consensus report as ONLY valid JSON:
{
  "title": "Brief market outlook title",
  "summary": "4-6 sentence executive summary synthesizing all viewpoints with specific data citations",
  "overallSentiment": "Bullish" or "Bearish" or "Neutral" or "Mixed",
  "marketImpactRating": 5 (number 1-10, how significant is this for markets),
  "keyTakeaways": ["4-6 bullet points with specific data references"],
  "actionableInsights": "3-4 sentences of actionable guidance with specific sectors/stocks to watch",
  "riskWarnings": "2-3 key risk warnings with transmission mechanisms",
  "sectorOutlook": {
    "overweight": ["sectors to overweight with reasoning"],
    "underweight": ["sectors to underweight with reasoning"],
    "watch": ["sectors to watch for catalysts"]
  },
  "timelineEvents": ["3-5 upcoming events/catalysts with approximate dates"]
}
`.trim();

    const consensus = await runDeepSeekJsonPrompt(consensusPrompt, CONSENSUS_MAX_TOKENS);
    consensusReport = consensus;
    marketImpactRating = Math.min(10, Math.max(1, Number(consensus.marketImpactRating) || 5));
  } catch {
    consensusReport = {
      title: 'Debate Concluded',
      summary: 'Multi-agent analysis complete. Review individual perspectives for detailed insights.',
      overallSentiment: 'Mixed',
      marketImpactRating: 5,
      keyTakeaways: messages.filter(m => m.confidence > 60).map(m => m.content.slice(0, 120)),
      actionableInsights: 'Monitor the debate themes and verify with independent research.',
      riskWarnings: 'Simulation-based analysis. Not financial advice.',
      sectorOutlook: { overweight: [], underweight: [], watch: [] },
      timelineEvents: [],
    };
  }

  session.messages = messages;
  session.consensusReport = consensusReport;
  session.marketImpactRating = marketImpactRating;
  session.status = 'completed';
  await session.save();

  return res.json({
    sessionId: session._id,
    trigger: session.trigger,
    messages,
    consensusReport,
    marketImpactRating,
  });
});

debateRouter.get('/history', requireAuth, async (req, res) => {
  const sessions = await DebateSession.find({ userId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('trigger status messages consensusReport marketImpactRating filters createdAt');
  return res.json({ items: sessions });
});

debateRouter.get('/session/:id', requireAuth, async (req, res) => {
  const session = await DebateSession.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'not_found' });
  return res.json({ session });
});

// Export debate report as structured JSON
debateRouter.get('/export/:id', requireAuth, async (req, res) => {
  const session = await DebateSession.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'not_found' });

  const report = {
    title: session.consensusReport?.title || 'War Room Debate Report',
    generatedAt: new Date().toISOString(),
    trigger: session.trigger,
    filters: session.filters,
    marketImpactRating: session.marketImpactRating,
    agents: session.messages.map(m => ({
      name: m.agentName,
      provider: m.provider,
      role: m.role,
      sentiment: m.sentiment,
      confidence: m.confidence,
      analysis: m.content,
      keyPoint: m.keyPoint || '',
    })),
    consensus: session.consensusReport,
    disclaimer: 'Simulation-based analytical output. Not financial advice. Generated by Vantage AI Terminal.',
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="vantage-warroom-${session._id}.json"`);
  return res.json(report);
});

// Admin: view all debate sessions
debateRouter.get('/admin/all', requireAuth, async (req, res) => {
  if (req.auth.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const sessions = await DebateSession.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .select('userId trigger status marketImpactRating createdAt');
  return res.json({ items: sessions });
});
