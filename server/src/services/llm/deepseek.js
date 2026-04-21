import { buildKuwaitRiskPrompt, safeJsonParseLoose } from './prompts.js';

function deepseekHeaders() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('Missing DEEPSEEK_API_KEY');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

export async function analyzeWithDeepSeek({ role, input, kuwaitSources }) {
  // DeepSeek is OpenAI-chat compatible for most deployments.
  const url = 'https://api.deepseek.com/v1/chat/completions';
  const prompt = buildKuwaitRiskPrompt({ role, input, kuwaitSources });

  const res = await fetch(url, {
    method: 'POST',
    headers: deepseekHeaders(),
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 1300,
      messages: [
        { role: 'system', content: 'You output only strict JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message ?? data?.message ?? `DeepSeek error (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content ?? '';
  const parsed = safeJsonParseLoose(text);
  if (!parsed) {
    throw new Error('DeepSeek returned non-JSON output');
  }

  parsed.kuwaitSourcesUsed = Array.isArray(parsed.kuwaitSourcesUsed) ? parsed.kuwaitSourcesUsed : [];
  return parsed;
}

