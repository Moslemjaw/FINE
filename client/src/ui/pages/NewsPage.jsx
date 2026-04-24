import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, RefreshCw, BookmarkPlus, Star, ExternalLink,
  CheckCircle2, TrendingUp, TrendingDown, Minus, BarChart3, Globe,
  FileText, Layers, Activity, X, MessageSquare, ArrowRight
} from 'lucide-react';
import { SentimentPill, SkeletonCard } from '../components/SharedComponents.jsx';
import { useMarketSentiment } from '../contexts/MarketSentimentContext.jsx';
import { generateNewsReportPDF } from '../utils/pdfGenerator.js';

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

function formatAgo(iso) {
  if (!iso) return 'just now';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function sentimentFromText(t) {
  const low = (t || '').toLowerCase();
  if (/(risk|war|attack|decline|drop|downgrade|inflation|crisis|disruption|volatility|loss|weak|fall|crash)/.test(low))
    return 'Bearish';
  if (/(growth|gain|surge|upgrade|strong|profit|recovery|expansion|optimism|rally|boost|rise)/.test(low))
    return 'Bullish';
  return 'Neutral';
}

// Sector colors
const SECTOR_COLORS = {
  'Energy': 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  'Banking': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  'Government': 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
  'Logistics': 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  'Consumer': 'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400',
  'Real Estate': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  'Insurance': 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
  'Healthcare': 'from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400',
};
function getSectorStyle(name) {
  return SECTOR_COLORS[name] || 'from-white/10 to-white/5 border-white/10 text-white/60';
}

// ─── Article Detail Modal ───────────────────────────────────

function ArticleDetailModal({ article, onClose }) {
  if (!article) return null;
  const s = article.sentimentLabel || (article.sentimentScore > 0.15 ? 'Bullish' : article.sentimentScore < -0.15 ? 'Bearish' : 'Neutral');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-midnight border border-white/10 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-5 pb-3 bg-midnight/95 backdrop-blur-md border-b border-white/5">
          <div className="flex-1 mr-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                {article.tag || 'GCC'}
              </span>
              {article.analyzed && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/10 text-[9px] font-bold text-cyan-400">
                  <CheckCircle2 size={8} />AI Analyzed
                </span>
              )}
              <SentimentPill sentiment={s} />
            </div>
            <h2 className="text-lg font-bold text-smoke leading-snug">{article.headline}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>{article.source}</span>
            <span>•</span>
            <span>{formatAgo(article.publishedAt || article.createdAt)}</span>
            {article.sentimentScore != null && (
              <>
                <span>•</span>
                <span className={`font-mono font-bold ${article.sentimentScore > 0 ? 'text-emerald-400' : article.sentimentScore < 0 ? 'text-rose-400' : 'text-white/50'}`}>
                  Score: {article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore.toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* Body */}
          {article.body && (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{article.body}</p>
            </div>
          )}

          {/* AI Analysis */}
          {article.aiAnalysis && (
            <div className="bg-gradient-to-r from-cyan-500/[0.06] to-violet-500/[0.06] rounded-xl p-4 border border-cyan-500/10">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare size={12} />AI Market Impact Analysis
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">{article.aiAnalysis}</p>
            </div>
          )}

          {/* Sectors */}
          {article.aiSectors?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Affected Sectors</h4>
              <div className="flex flex-wrap gap-2">
                {article.aiSectors.map((sec, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-xl bg-gradient-to-r border text-xs font-bold ${getSectorStyle(sec)}`}>
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Original Arabic */}
          {article.originalHeadline && (
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
              <h4 className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Original (Arabic)</h4>
              <p className="text-sm text-white/40 leading-relaxed" dir="rtl">{article.originalHeadline}</p>
              {article.originalBody && (
                <p className="text-xs text-white/25 leading-relaxed mt-2 line-clamp-4" dir="rtl">{article.originalBody}</p>
              )}
            </div>
          )}

          {/* External link */}
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <ExternalLink size={12} />Read Full Article
              <ArrowRight size={12} />
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main NewsPage ──────────────────────────────────────────

export default function NewsPage({ me }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, bull: 0, bear: 0, neutral: 0, sources: 0, topSectors: [], avgScore: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);
  const { isRedAlert, gaugeScore, label: sentimentLabel } = useMarketSentiment();

  const loadStats = useCallback(async () => {
    try {
      const d = await api('/api/news/stats');
      setStats(d);
    } catch {}
  }, []);

  const loadPage = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const d = await api(`/api/news/weekly?page=${p}&pageSize=12&autoSync=${p === 1 ? '1' : '0'}`);
      setItems(d.items ?? []);
      setPage(d.page ?? 1);
      setTotalPages(d.totalPages ?? 1);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadStats();
    loadPage(1);
  }, []);

  function getItemSentiment(n) {
    return n.sentimentLabel
      || (n.sentimentScore !== undefined
        ? (n.sentimentScore > 0.15 ? 'Bullish' : n.sentimentScore < -0.15 ? 'Bearish' : 'Neutral')
        : sentimentFromText(`${n.headline} ${n.body}`));
  }

  async function saveItem(e, n) {
    e.stopPropagation();
    try {
      const created = await api('/api/articles', {
        method: 'POST',
        body: JSON.stringify({
          title: n.headline, excerpt: n.body, source: n.source,
          url: n.url || '', tags: [n.tag ?? 'KUWAIT'],
          publishedAt: n.publishedAt ? new Date(n.publishedAt).toISOString() : undefined,
        }),
      });
      await api(`/api/articles/${created.item._id}/save`, { method: 'POST' });
      setSavedIds(prev => ({ ...prev, [n._id]: true }));
    } catch {}
  }

  const bullPct = stats.total ? Math.round(stats.bull / stats.total * 100) : 0;
  const bearPct = stats.total ? Math.round(stats.bear / stats.total * 100) : 0;
  const neutralPct = stats.total ? 100 - bullPct - bearPct : 0;
  const gaugeColor = gaugeScore > 60 ? 'text-emerald-400' : gaugeScore < 40 ? 'text-rose-400' : 'text-amber-400';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ═══ Unified Market Intelligence Panel ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card !p-0 overflow-hidden"
      >
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-smoke flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-cyan-500/10">
                <BarChart3 size={16} className="text-cyan-400" />
              </div>
              Market Intelligence
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => generateNewsReportPDF(stats, items)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-[11px] text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20 hover:text-white transition-all">
                <FileText size={11} />Export PDF
              </button>
              <button onClick={() => { loadStats(); loadPage(page); }} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />Refresh
              </button>
            </div>
          </div>

          {/* ── Row 1: 4 Equal KPI Boxes ── */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center">
              <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Articles</p>
              <p className="text-3xl font-mono font-black text-cyan-400">{stats.total}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center">
              <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Bullish</p>
              <p className="text-3xl font-mono font-black text-emerald-400">{stats.bull}</p>
              <p className="text-[10px] text-emerald-400/50 font-mono mt-0.5">{bullPct}%</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center">
              <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Bearish</p>
              <p className="text-3xl font-mono font-black text-rose-400">{stats.bear}</p>
              <p className="text-[10px] text-rose-400/50 font-mono mt-0.5">{bearPct}%</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center">
              <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Sources</p>
              <p className="text-3xl font-mono font-black text-violet-400">{stats.sources}</p>
            </div>
          </div>

          {/* ── Row 2: Sentiment Gauge + Average Score ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Sentiment Gauge — Premium visual */}
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-xl p-5 border border-white/[0.08] relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20" style={{
                background: `radial-gradient(circle, ${gaugeScore > 60 ? 'rgba(16,185,129,0.4)' : gaugeScore < 40 ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}, transparent 70%)`
              }} />
              <div className="flex items-center gap-5 relative z-10">
                {/* Score circle */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg width="80" height="80" className="-rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={gaugeScore > 60 ? '#10b981' : gaugeScore < 40 ? '#f43e5e' : '#f59e0b'}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - gaugeScore / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className={`text-2xl font-mono font-black ${gaugeColor}`}
                      key={gaugeScore}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {gaugeScore}
                    </motion.span>
                    <span className="text-[8px] text-white/25 font-mono uppercase">/ 100</span>
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1">
                  <p className={`text-lg font-bold ${gaugeColor}`}>{sentimentLabel}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 mb-3">Market Sentiment Index</p>
                  {/* Distribution bar */}
                  <div className="flex rounded-full overflow-hidden h-2.5 bg-white/[0.03]">
                    {stats.bull > 0 && <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" style={{ width: `${bullPct}%` }} />}
                    {(stats.neutral || 0) > 0 && <div className="bg-slate-600 transition-all duration-700" style={{ width: `${neutralPct}%` }} />}
                    {stats.bear > 0 && <div className="bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700" style={{ width: `${bearPct}%` }} />}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-emerald-400/60 font-mono font-bold">{bullPct}% bull</span>
                    <span className="text-[9px] text-white/20 font-mono">{neutralPct}%</span>
                    <span className="text-[9px] text-rose-400/60 font-mono font-bold">{bearPct}% bear</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Score — Premium visual */}
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-xl p-5 border border-white/[0.08] relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full opacity-20" style={{
                background: `radial-gradient(circle, ${stats.avgScore > 0.1 ? 'rgba(16,185,129,0.4)' : stats.avgScore < -0.1 ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}, transparent 70%)`
              }} />
              <div className="relative z-10">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-3">Average Sentiment Score</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className={`text-4xl font-mono font-black ${stats.avgScore > 0.1 ? 'text-emerald-400' : stats.avgScore < -0.1 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {stats.avgScore > 0 ? '+' : ''}{(stats.avgScore || 0).toFixed(2)}
                  </p>
                  <span className="text-xs text-white/20 font-mono">
                    {stats.avgScore > 0.1 ? 'Bullish' : stats.avgScore < -0.1 ? 'Bearish' : 'Neutral'}
                  </span>
                </div>
                {/* Visual scale */}
                <div className="relative h-3 bg-white/[0.03] rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-gradient-to-r from-rose-500/20 to-transparent" />
                    <div className="flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
                  </div>
                  {/* Needle */}
                  <div className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-700"
                    style={{ left: `${Math.max(2, Math.min(98, ((stats.avgScore || 0) + 1) / 2 * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[8px] text-rose-400/40 font-mono">-1.0 BEAR</span>
                  <span className="text-[8px] text-white/15 font-mono">0</span>
                  <span className="text-[8px] text-emerald-400/40 font-mono">+1.0 BULL</span>
                </div>
                {/* Alert */}
                {isRedAlert && (
                  <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Market Alert Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 3: Sector Distribution ── */}
          {stats.topSectors?.length > 0 && (
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                <Layers size={9} />Sector Distribution
              </p>
              <div className="grid grid-cols-4 gap-2">
                {stats.topSectors.map((sec) => (
                  <div key={sec.name}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r border ${getSectorStyle(sec.name)}`}>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <Globe size={10} />{sec.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold opacity-60">{sec.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ Feed Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-smoke flex items-center gap-2">
            <Newspaper size={18} className="text-cyan-400" />Market Intelligence Feed
          </h2>
          <p className="text-xs text-white/40 mt-0.5">7-day rolling window · Page {page}/{totalPages}</p>
        </div>
      </div>

      {/* ═══ News Grid ═══ */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {items.map((n, idx) => {
              const s = getItemSentiment(n);
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedArticle(n)}
                  className={`glass-card group cursor-pointer hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all ${isRedAlert ? 'red-alert-glow' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      {n.tag || 'GCC'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {n.analyzed && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/10 text-[9px] font-bold text-cyan-400">
                          <CheckCircle2 size={8} />AI
                        </span>
                      )}
                      <SentimentPill sentiment={s} />
                    </div>
                  </div>
                  <h3 className="font-bold text-smoke leading-snug mb-2 text-sm line-clamp-2">
                    {n.headline}
                  </h3>
                  <p className="text-[11px] text-white/40 mb-2">
                    {n.source} · {formatAgo(n.publishedAt || n.createdAt)}
                    {n.sentimentScore != null && (
                      <span className={`ml-1.5 font-mono ${n.sentimentScore > 0 ? 'text-emerald-400/60' : n.sentimentScore < 0 ? 'text-rose-400/60' : 'text-white/30'}`}>
                        ({n.sentimentScore > 0 ? '+' : ''}{n.sentimentScore.toFixed(1)})
                      </span>
                    )}
                  </p>
                  {n.body && (
                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{n.body}</p>
                  )}

                  {/* AI comment preview */}
                  {n.aiAnalysis && (
                    <div className="mt-2 px-2 py-1.5 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/[0.08]">
                      <p className="text-[10px] text-cyan-400/60 line-clamp-1 flex items-center gap-1">
                        <MessageSquare size={9} />{n.aiAnalysis}
                      </p>
                    </div>
                  )}

                  {n.aiSectors?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {n.aiSectors.slice(0, 3).map((sec, si) => (
                        <span key={si} className="px-1.5 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-400 uppercase">{sec}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/20 group-hover:text-cyan-400/50 transition-colors flex items-center gap-1">
                      Click for details <ArrowRight size={10} />
                    </span>
                    <div className="flex-1" />
                    <button onClick={(e) => saveItem(e, n)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-cyan-400 transition-colors">
                      {savedIds[n._id] ? <Star size={14} className="fill-current text-amber-400" /> : <BookmarkPlus size={14} />}
                    </button>
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-cyan-400 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <button onClick={() => loadPage(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-all">
              ← Prev
            </button>
          )}
          <span className="text-xs text-white/40 font-mono px-3">{page} / {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => loadPage(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-all">
              Next →
            </button>
          )}
        </div>
      )}

      {/* ═══ Article Detail Modal ═══ */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
