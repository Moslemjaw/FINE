/**
 * AI News Analyzer
 * Sends each news article to DeepSeek for:
 * 1. Translation (Arabic → English) if needed
 * 2. Sentiment classification (Bullish / Bearish / Neutral)
 * 3. Brief market impact analysis
 * 4. Sector tagging
 * Results are persisted in the News document.
 */

import { News } from '../../models/News.js';
import { runDeepSeekJsonPrompt } from '../llm/deepseek.js';
import { scoreSentiment } from './sentiment.js';

function isArabic(text) {
  // Check if text contains Arabic characters
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

const ANALYSIS_PROMPT = `You are a Kuwait/GCC financial market analyst. Analyze this news article and classify its market impact.

ARTICLE:
Title: {TITLE}
Source: {SOURCE}
Content: {BODY}

{TRANSLATE_INSTRUCTION}

Return ONLY valid JSON:
{
  "sentimentScore": 0.0,
  "sentimentLabel": "Neutral",
  "analysis": "1-2 sentence market impact analysis specific to Kuwait/GCC markets",
  "sectors": ["affected sectors"],
  "translatedTitle": "",
  "translatedBody": ""
}

Rules:
- sentimentScore: -1.0 (very bearish) to +1.0 (very bullish)
- sentimentLabel: exactly one of "Bullish", "Bearish", "Neutral"
- analysis: be specific about HOW this impacts Kuwait/GCC markets. Mention transmission mechanisms (oil price, capital flows, sentiment, regulation, trade).
- sectors: list affected sectors from: "Banking", "Energy", "Real Estate", "Telecom", "Consumer", "Government", "Logistics", "Healthcare", "Insurance"
- translatedTitle: English translation of the title (leave empty if already English)
- translatedBody: English translation of the content (leave empty if already English, max 300 words)`;

/**
 * Analyze a single news article with AI.
 * Handles Arabic translation automatically.
 */
export async function analyzeNewsArticle(newsDoc) {
  const text = `${newsDoc.headline} ${newsDoc.body || ''}`;
  const needsTranslation = isArabic(text);
  
  try {
    const translateInstruction = needsTranslation
      ? 'IMPORTANT: This article is in Arabic. You MUST translate the title and body to English in translatedTitle and translatedBody fields. The analysis must be in English.'
      : 'The article is in English. Leave translatedTitle and translatedBody empty.';

    const prompt = ANALYSIS_PROMPT
      .replace('{TITLE}', newsDoc.headline || '')
      .replace('{SOURCE}', newsDoc.source || '')
      .replace('{BODY}', (newsDoc.body || '').slice(0, 2000))
      .replace('{TRANSLATE_INSTRUCTION}', translateInstruction);

    const result = await runDeepSeekJsonPrompt(prompt, 800);

    const score = Math.max(-1, Math.min(1, Number(result.sentimentScore) || 0));
    const label = ['Bullish', 'Bearish', 'Neutral'].includes(result.sentimentLabel)
      ? result.sentimentLabel
      : (score > 0.15 ? 'Bullish' : score < -0.15 ? 'Bearish' : 'Neutral');

    const update = {
      sentimentScore: Math.round(score * 1000) / 1000,
      sentimentLabel: label,
      aiAnalysis: (result.analysis || '').slice(0, 500),
      aiSectors: Array.isArray(result.sectors) ? result.sectors.slice(0, 6) : [],
      analyzed: true,
    };

    // If Arabic, store originals and overwrite with English translation
    if (needsTranslation && result.translatedTitle) {
      update.originalHeadline = newsDoc.headline;
      update.originalBody = (newsDoc.body || '').slice(0, 4000);
      update.headline = result.translatedTitle;
      if (result.translatedBody) {
        update.body = result.translatedBody.slice(0, 4000);
      }
    }

    return update;
  } catch (err) {
    console.warn(`[ai-analyzer] AI failed for "${newsDoc.headline?.slice(0, 60)}": ${err.message}. Using keyword fallback.`);
    // Fallback to keyword-based scorer
    const kwScore = scoreSentiment(text);
    return {
      sentimentScore: kwScore,
      sentimentLabel: kwScore > 0.15 ? 'Bullish' : kwScore < -0.15 ? 'Bearish' : 'Neutral',
      aiAnalysis: '',
      aiSectors: [],
      analyzed: true,
    };
  }
}

/**
 * Analyze all unanalyzed news articles in the database.
 * Processes in batches with a small delay to avoid rate limits.
 */
export async function analyzeUnanalyzedNews(batchSize = 10) {
  const unanalyzed = await News.find({ analyzed: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(batchSize)
    .select('headline body source tag');

  if (!unanalyzed.length) {
    console.log('[ai-analyzer] No unanalyzed articles found.');
    return { analyzed: 0 };
  }

  console.log(`[ai-analyzer] Analyzing ${unanalyzed.length} articles...`);
  let count = 0;

  for (const doc of unanalyzed) {
    try {
      const result = await analyzeNewsArticle(doc);
      await News.updateOne({ _id: doc._id }, { $set: result });
      count++;
      console.log(`[ai-analyzer] ✓ "${(result.headline || doc.headline)?.slice(0, 50)}" → ${result.sentimentLabel} (${result.sentimentScore})`);
      // Small delay between calls to be nice to DeepSeek API
      if (count < unanalyzed.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.warn(`[ai-analyzer] Failed to update ${doc._id}: ${err.message}`);
    }
  }

  console.log(`[ai-analyzer] Batch complete: ${count}/${unanalyzed.length} analyzed.`);
  return { analyzed: count, total: unanalyzed.length };
}

/**
 * Analyze a single news document by ID and save results.
 */
export async function analyzeAndSaveById(newsId) {
  const doc = await News.findById(newsId);
  if (!doc) return null;
  
  const result = await analyzeNewsArticle(doc);
  await News.updateOne({ _id: newsId }, { $set: result });
  return result;
}
