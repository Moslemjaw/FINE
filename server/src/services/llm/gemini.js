import { buildKuwaitRiskPrompt, safeJsonParseLoose } from './prompts.js';

function getGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');
  return key;
}

export async function analyzeWithGemini({ role, input, kuwaitSources }) {
  const prompt = buildKuwaitRiskPrompt({ role, input, kuwaitSources });
  return runGeminiJsonPrompt(prompt, 1400);
}

/**
 * @param {string} prompt
 * @param {number} maxOutputTokens
 * @param {string} model - Gemini model to use (default: gemini-2.5-flash)
 * @param {number} temperature - Temperature for generation (default: 0.2)
 */
export async function runGeminiJsonPrompt(prompt, maxOutputTokens = 1400, model = 'gemini-2.5-flash', temperature = 0.2) {
  const key = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data?.error?.message ??
      data?.message ??
      `Gemini error (${res.status})`;
    throw new Error(msg);
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text ?? '')
      .join('') ?? '';
  const parsed = safeJsonParseLoose(text);
  if (!parsed) {
    throw new Error('Gemini returned non-JSON output');
  }

  parsed.kuwaitSourcesUsed = Array.isArray(parsed.kuwaitSourcesUsed) ? parsed.kuwaitSourcesUsed : [];
  return parsed;
}