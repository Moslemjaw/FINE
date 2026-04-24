import React, { useState } from 'react';
import { Newspaper, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? 'request_failed');
  return data;
}

export default function PublisherPanel({ me, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function publish(e) {
    e?.preventDefault();
    setLoading(true); setErr(''); setMsg('');
    try {
      await api('/api/news', {
        method: 'POST',
        body: JSON.stringify({
          headline: title, body: content,
          source: sourceName || me?.name || 'Publisher',
          url: sourceLink || '', tag: 'VERIFIED',
        }),
      });
      setMsg('Published successfully');
      setTitle(''); setContent(''); setSourceName(''); setSourceLink('');
    } catch (e) { setErr(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-midnight/95 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-smoke flex items-center gap-2">
              <Newspaper size={20} className="text-emerald-400" />News Ingestion
            </h2>
            <p className="text-xs text-white/40 mt-1">Publish verified market intelligence</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={publish} className="space-y-4">
          <div className="glass-card space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-emerald-400/50 outline-none transition-all"
                placeholder="News headline..." />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-emerald-400/50 outline-none transition-all resize-y"
                placeholder="Full article content..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Source Name</label>
                <input value={sourceName} onChange={e => setSourceName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-emerald-400/50 outline-none transition-all"
                  placeholder="e.g. Kuwait Times" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Source Link</label>
                <input value={sourceLink} onChange={e => setSourceLink(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-emerald-400/50 outline-none transition-all"
                  placeholder="https://..." />
              </div>
            </div>
          </div>

          {err && (
            <div className="error-card !p-3 flex items-center gap-2 text-xs">
              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
              <span className="text-rose-300">{err}</span>
            </div>
          )}
          {msg && (
            <div className="glass-card !p-3 flex items-center gap-2 text-xs border-emerald-500/20">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-300">{msg}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !title}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Publishing...' : 'Publish Article'}
          </button>

          <p className="text-[10px] text-white/20 text-center">
            Published by @{me?.name} · Verified Source badge applied automatically
          </p>
        </form>
      </div>
    </div>
  );
}
