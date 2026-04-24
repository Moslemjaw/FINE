import React, { useState, useEffect } from 'react';
import {
  Shield, X, Users, Newspaper, Clock, Target, Brain, RefreshCw, Activity, BarChart3
} from 'lucide-react';
import { GeoAvatar, SkeletonCard } from '../components/SharedComponents.jsx';

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
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminDashboard({ me, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [d, h] = await Promise.all([
          api('/api/admin/dashboard').catch(err => { console.error('Admin API err:', err.message); return null; }),
          api('/api/system/health').catch(err => { console.error('Health API err:', err.message); return null; }),
        ]);
        if (!cancelled) {
          if (!d && !h) setErrMsg('Unable to load admin data. Check server connection.');
          setData(d);
          setHealth(h);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setLoading(false); setErrMsg('Failed to load dashboard.'); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function syncNow() {
    setSyncBusy(true); setSyncProgress(5); setSyncMsg('');
    const iv = setInterval(() => setSyncProgress(p => p >= 92 ? p : p + 8), 220);
    try {
      const d = await api('/api/news/import/newsdata', { method: 'POST', body: JSON.stringify({ q: 'kuwait' }) });
      setSyncMsg(`✓ Sync complete — ${d.sync?.upserted ?? 0} articles updated.`);
      setSyncProgress(100);
    } catch (e) { setSyncMsg(`Error: ${e.message}`); setSyncProgress(0); }
    finally { clearInterval(iv); setSyncBusy(false); setTimeout(() => setSyncProgress(0), 900); }
  }

  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');

  async function analyzeAll() {
    setAnalyzeBusy(true); setAnalyzeMsg('Running AI analysis on unanalyzed articles...');
    try {
      const d = await api('/api/news/analyze-all', { method: 'POST', body: JSON.stringify({ batchSize: 30 }) });
      setAnalyzeMsg(`✓ ${d.analyzed ?? 0} articles analyzed by AI.`);
    } catch (e) { setAnalyzeMsg(`Error: ${e.message}`); }
    finally { setAnalyzeBusy(false); }
  }

  // Map latency keys from backend (deepseek, gemini, synthesis)
  const latencyData = data?.aiLatency || health?.aiLatencyMs || {};
  const latencyItems = [
    { key: 'Analysis', value: latencyData.deepseek },
    { key: 'Agents', value: latencyData.gemini },
    { key: 'Synthesis', value: latencyData.synthesis },
  ];

  // News analysis stats
  const analyzedCount = data?.stats?.analyzedNews ?? health?.analyzedCount ?? 0;
  const totalNewsCount = data?.stats?.totalNews ?? 0;
  const unanalyzedCount = Math.max(0, totalNewsCount - analyzedCount);

  return (
    <div className="fixed inset-0 z-50 bg-midnight/95 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-smoke flex items-center gap-2">
              <Shield size={20} className="text-violet-400" />Admin Dashboard
            </h2>
            <p className="text-xs text-white/40 mt-1">System monitoring, data sync & user management</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : errMsg && !data ? (
          <div className="error-card">
            <p className="text-sm text-rose-300">{errMsg}</p>
          </div>
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Users', value: data.stats?.totalUsers, icon: Users },
                { label: 'News', value: data.stats?.totalNews, icon: Newspaper },
                { label: 'Weekly', value: data.stats?.weeklyNews, icon: Clock },
                { label: 'Simulations', value: data.stats?.totalSimulations, icon: Target },
                { label: 'Debates', value: data.stats?.totalDebates, icon: Brain },
              ].map(s => (
                <div key={s.label} className="glass-card admin-stat">
                  <s.icon size={16} className="text-white/20 mx-auto mb-2" />
                  <div className="stat-value">{s.value ?? 0}</div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* AI Latency + System Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="glass-card">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity size={12} />AI Provider Latency
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {latencyItems.map(k => (
                    <div key={k.key} className="text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">{k.key}</p>
                      <p className="text-lg font-mono font-bold text-cyan-400">
                        {k.value != null ? k.value : '—'}
                        <span className="text-xs text-white/30">ms</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw size={12} />Data Sync
                  </h3>
                  <button onClick={syncNow} disabled={syncBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30">
                    <RefreshCw size={12} className={syncBusy ? 'animate-spin' : ''} />{syncBusy ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
                {syncProgress > 0 && (
                  <div className="progress-track mb-2">
                    <div className="progress-fill" style={{ width: `${syncProgress}%` }} />
                  </div>
                )}
                {syncMsg && <p className="text-xs text-emerald-400/80 mb-2">{syncMsg}</p>}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-white/30">Latest Article</p>
                    <p className="text-xs font-mono text-white/60">{formatAgo(health?.latestNewsTimestamp)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Weekly Articles</p>
                    <p className="text-xs font-mono text-white/60">{health?.weeklyNewsCount ?? data.stats?.weeklyNews ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="glass-card mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain size={12} />AI News Analysis
                  </h3>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    AI analyzes each article for sentiment, market impact, and sectors
                  </p>
                </div>
                <button onClick={analyzeAll} disabled={analyzeBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-30">
                  <Brain size={12} className={analyzeBusy ? 'animate-spin' : ''} />{analyzeBusy ? 'Analyzing...' : 'Analyze All'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-white/30 uppercase">Total</p>
                  <p className="text-lg font-mono font-bold text-white/70">{totalNewsCount}</p>
                </div>
                <div className="bg-emerald-500/5 rounded-lg p-3 text-center border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400/60 uppercase">Analyzed</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">{analyzedCount}</p>
                </div>
                <div className="bg-amber-500/5 rounded-lg p-3 text-center border border-amber-500/10">
                  <p className="text-[10px] text-amber-400/60 uppercase">Pending</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{unanalyzedCount}</p>
                </div>
              </div>
              {analyzeMsg && <p className="text-xs text-emerald-400/80">{analyzeMsg}</p>}
            </div>

            {/* Recent Users */}
            <div className="glass-card mb-6">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users size={12} />Recent Users
              </h3>
              <div className="space-y-2">
                {(data.recentUsers ?? []).map(u => (
                  <div key={u._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <GeoAvatar name={u.name} size={24} />
                      <div>
                        <p className="text-xs font-semibold text-white/70">{u.name}</p>
                        <p className="text-[10px] text-white/30">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      u.role === 'admin' ? 'bg-violet-500/15 text-violet-400' :
                      u.role === 'publisher' ? 'bg-emerald-500/15 text-emerald-400' :
                      'bg-white/5 text-white/40'
                    }`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="error-card">
            <p className="text-sm text-rose-300">Unable to load admin data</p>
          </div>
        )}
      </div>
    </div>
  );
}
