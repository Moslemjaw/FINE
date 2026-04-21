export function buildKuwaitRiskPrompt({ role, input, kuwaitSources }) {
  const sourcesLine = (kuwaitSources ?? []).length
    ? `Kuwait sources to prioritize (for grounding/citation): ${kuwaitSources.join(', ')}`
    : 'Kuwait sources to prioritize: (none provided)';

  const roleBrief =
    role === 'political'
      ? [
          'You are a political & policy risk analyst for Kuwait/GCC markets.',
          'You focus on politics, regulation, government actions, geopolitics, sanctions, security posture, and second-order effects on markets.',
        ].join('\n')
      : [
          'You are a financial risk manager for Kuwait/GCC markets.',
          'You focus on liquidity, credit, operational risk, tail risks, contagion, and downside scenarios.',
        ].join('\n');

  return `
${roleBrief}

Task:
- Analyze the INPUT text for Kuwait-market relevant risk.
- Be specific to Kuwait/GCC transmission mechanisms (cause → effect).
- Be critical, not polite. Call out weak/unsupported claims in the INPUT.
- If data is missing, state what is missing and what you would check.

${sourcesLine}

Output MUST be ONLY valid JSON (no markdown), exactly this shape:
{
  "summary": "2-4 sentences",
  "riskSignals": [
    { "label": "Geopolitical", "score": 0.0, "why": "1 sentence" },
    { "label": "Policy/Regulatory", "score": 0.0, "why": "1 sentence" },
    { "label": "Market/Liquidity", "score": 0.0, "why": "1 sentence" },
    { "label": "Company/Operational", "score": 0.0, "why": "1 sentence" }
  ],
  "baseCase": "2-3 sentences",
  "bearCase": "2-3 sentences",
  "watchlist": ["3-7 bullets max"],
  "recommendedChecks": ["3-7 bullets max"],
  "kuwaitSourcesUsed": ["subset of provided sources you relied on (can be empty)"]
}

Rules:
- scores are 0.0 to 1.0
- keep it Kuwait/GCC specific

INPUT:
${input}
`.trim();
}

export function safeJsonParseLoose(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

