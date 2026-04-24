import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History, RefreshCw, Lock, Clock, Brain, Target, Gauge, FileText
} from 'lucide-react';
import { SkeletonCard } from '../components/SharedComponents.jsx';
import { generateSimulationPDF, generateWarRoomPDF } from '../utils/pdfGenerator.js';

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

export default function HistoryPage({ me }) {
  const [simItems, setSimItems] = useState([]);
  const [debateItems, setDebateItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('simulations');
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    if (!me) return;
    setLoading(true);
    try {
      const [sims, debates] = await Promise.all([
        api('/api/analysis/history'),
        api('/api/debate/history'),
      ]);
      setSimItems(sims.items ?? []);
      setDebateItems(debates.items ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [me]);

  if (!me) return (
    <div className="glass-card text-center py-12 animate-fade-in">
      <Lock size={24} className="text-white/20 mx-auto mb-3" />
      <p className="text-sm text-white/40">Sign in to view your analysis history</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-smoke flex items-center gap-2">
          <History size={18} className="text-amber-400" />Analysis History
        </h2>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white transition-all">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-xl bg-white/5 p-1">
        {[
          { id: 'simulations', label: 'Simulations', count: simItems.length, icon: Target },
          { id: 'debates', label: 'War Room', count: debateItems.length, icon: Brain },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}>
            <t.icon size={12} />
            {t.label}
            <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : activeTab === 'simulations' ? (
        <div className="space-y-3">
          {simItems.map((it, idx) => (
            <motion.div key={it._id} className="glass-card"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-white/30">
                  <Clock size={10} className="inline mr-1" />
                  {new Date(it.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">{it.itemsAnalyzed} items</span>
                  <button onClick={() => generateSimulationPDF(it)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20 transition-all">
                    <FileText size={10} />PDF
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[10px] font-bold text-cyan-400">{it.filters?.marketBias}</span>
                <span className="px-2 py-0.5 rounded bg-violet-500/10 text-[10px] font-bold text-violet-400">{it.filters?.sectorFocus}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-400">{it.filters?.timeHorizon}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{it.report?.executiveConclusion}</p>
              {expandedId === it._id && it.report?.keyPoints?.length > 0 && (
                <motion.div className="mt-3 pt-3 border-t border-white/5"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <ul className="space-y-1">
                    {it.report.keyPoints.slice(0, 5).map((p, i) => (
                      <li key={i} className="text-[11px] text-white/40">• {p}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
              <button onClick={() => setExpandedId(expandedId === it._id ? null : it._id)}
                className="mt-2 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">
                {expandedId === it._id ? 'Show less' : 'Show more →'}
              </button>
            </motion.div>
          ))}
          {!simItems.length && <p className="text-center text-sm text-white/30 py-8">No simulation history yet</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {debateItems.map((it, idx) => (
            <motion.div key={it._id} className="glass-card"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-white/30">
                  <Clock size={10} className="inline mr-1" />
                  {new Date(it.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    it.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>{it.status}</span>
                  <button onClick={() => generateWarRoomPDF(it)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20 transition-all">
                    <FileText size={10} />PDF
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-white/70 mb-1">{it.trigger}</p>
              {it.consensusReport?.summary && (
                <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{it.consensusReport.summary}</p>
              )}
              {it.marketImpactRating && (
                <div className="flex items-center gap-2 mt-2">
                  <Gauge size={12} className="text-white/30" />
                  <span className="text-[10px] font-mono text-white/40">Impact: {it.marketImpactRating}/10</span>
                  <span className="text-[10px] font-mono text-white/30">· {it.messages?.length || 0} agents</span>
                </div>
              )}
            </motion.div>
          ))}
          {!debateItems.length && <p className="text-center text-sm text-white/30 py-8">No debate history yet</p>}
        </div>
      )}
    </div>
  );
}
