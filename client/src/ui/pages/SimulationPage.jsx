import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Zap, Lock, BarChart3, Layers, Clock, Eye, AlertTriangle,
  TrendingUp, Shield, Star, ChevronRight
} from 'lucide-react';
import { WeightRing, ConfidenceGauge, Sparkline, SkeletonCard } from '../components/SharedComponents.jsx';
import { ReportDownloader } from '../components/ReportDownloader.jsx';

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

const MARKET_BIAS = ['Neutral', 'Bullish', 'Bearish', 'High Volatility', 'Crisis/War Premium'];
const SECTOR_FOCUS = ['All Sectors', 'Banking', 'Telecom', 'Real Estate', 'Energy / Oil', 'Logistics', 'Consumer'];
const TIME_HORIZONS = ['Short-term (1-4 weeks)', 'Medium-term (3-6 months)', 'Long-term (1-3 years)'];
const COUNTRY_FOCUS = ['GCC (All)', 'Kuwait', 'Saudi Arabia', 'UAE', 'Qatar', 'Bahrain', 'Oman'];

export default function SimulationPage({ me }) {
  const [marketBias, setMarketBias] = useState('Crisis/War Premium');
  const [sectorFocus, setSectorFocus] = useState('All Sectors');
  const [timeHorizon, setTimeHorizon] = useState('Short-term (1-4 weeks)');
  const [countryFocus, setCountryFocus] = useState('GCC (All)');
  const [sources, setSources] = useState('Boursa Kuwait, CBK, NBK Research, Kuwait Times');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState('');
  const [typingSummary, setTypingSummary] = useState('');

  // Weight rings state — only visible to admin/publisher (Expert Mode)
  const [weights, setWeights] = useState({ political: 25, economic: 25, institutional: 25, risk: 25 });
  const canEditWeights = me?.role === 'admin' || me?.role === 'publisher';

  function updateWeight(key, val) {
    const next = Math.max(0, Math.min(100, val));
    const keys = Object.keys(weights).filter(k => k !== key);
    const othersSum = keys.reduce((a, k) => a + weights[k], 0);
    const remaining = 100 - next;
    const updated = { [key]: next };
    for (const k of keys) {
      updated[k] = othersSum > 0 ? Math.round((weights[k] / othersSum) * remaining) : Math.round(remaining / keys.length);
    }
    setWeights(updated);
  }

  async function run() {
    setErr(''); setRunning(true); setReport(null); setTypingSummary('');
    try {
      const d = await api('/api/analysis/weekly-consensus', {
        method: 'POST',
        body: JSON.stringify({
          marketBias, sectorFocus, timeHorizon, countryFocus,
          kuwaitSources: sources.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      setReport(d);
    } catch {
      setErr('Market Data Interrupted — Please retry the simulation.');
    } finally { setRunning(false); }
  }

  // Typing animation
  useEffect(() => {
    if (!report?.report?.executiveConclusion) return;
    const txt = report.report.executiveConclusion;
    let idx = 0;
    const iv = setInterval(() => {
      idx += 2;
      setTypingSummary(txt.slice(0, idx));
      if (idx >= txt.length) clearInterval(iv);
    }, 12);
    return () => clearInterval(iv);
  }, [report]);

  const confidence = report?.report?.investmentView?.confidence;
  const confPct = confidence === 'High' ? 86 : confidence === 'Medium' ? 62 : 35;
  const overallSignal = report?.report?.investmentView?.overallSignal;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="glass-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-smoke flex items-center gap-2"><Target size={20} className="text-emerald-400" />Simulation Engine</h2>
            <p className="text-xs text-white/40 mt-0.5">Multi-agent AI consensus on latest regional news</p>
          </div>
          <button onClick={run} disabled={!me || running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {running ? (
              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
            ) : <><Zap size={14} />Run Simulation</>}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Market Bias', value: marketBias, set: setMarketBias, options: MARKET_BIAS, icon: BarChart3 },
            { label: 'Sector Focus', value: sectorFocus, set: setSectorFocus, options: SECTOR_FOCUS, icon: Layers },
            { label: 'Time Horizon', value: timeHorizon, set: setTimeHorizon, options: TIME_HORIZONS, icon: Clock },
            { label: 'Country', value: countryFocus, set: setCountryFocus, options: COUNTRY_FOCUS, icon: Target },
          ].map(f => (
            <div key={f.label}>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
                <f.icon size={10} />{f.label}
              </label>
              <select value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 outline-none focus:border-cyan-400/40">
                {f.options.map(o => <option key={o} value={o} className="bg-midnight">{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {!me && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/70 bg-amber-400/5 rounded-lg px-3 py-2">
            <Lock size={12} />Sign in required for simulation
          </div>
        )}
      </div>

      {/* Weightage Rings — Expert Mode (RBAC: admin/publisher only) */}
      {canEditWeights ? (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Agent Weightage Allocation</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/15 text-violet-400">Expert Mode</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { key: 'political', label: 'Political', color: '#34d399' },
              { key: 'economic', label: 'Economic', color: '#3b82f6' },
              { key: 'institutional', label: 'Institutional', color: '#a78bfa' },
              { key: 'risk', label: 'Risk', color: '#f87171' },
            ].map(w => (
              <WeightRing key={w.key} value={weights[w.key]} onChange={v => updateWeight(w.key, v)}
                label={w.label} color={w.color} />
            ))}
          </div>
        </div>
      ) : me ? (
        <div className="glass-card !p-4 flex items-center gap-3">
          <Lock size={14} className="text-white/30" />
          <div>
            <p className="text-xs text-white/50">Agent Weights locked — Expert Mode requires admin or publisher role</p>
            <p className="text-[10px] text-white/30 mt-0.5">Default equal-weight allocation applied</p>
          </div>
        </div>
      ) : null}

      {/* Running State */}
      {running && (
        <div className="glass-card !p-8 text-center">
          <div className="inline-block mb-4">
            <div className="w-12 h-12 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          </div>
          <p className="text-sm text-white/60">Dual-AI processing political, economic, and risk transmission paths...</p>
          <div className="typing-dots mt-3 text-cyan-400"><span /><span /><span /></div>
        </div>
      )}

      {err && (
        <div className="error-card flex items-center gap-3">
          <AlertTriangle size={16} className="text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Market Data Interrupted</p>
            <p className="text-xs text-rose-400/60">{err}</p>
          </div>
        </div>
      )}

      {/* Report Output */}
      {report && !running && (
        <motion.div className="report-briefing"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Report Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Strategy Briefing</p>
              <h3 className="text-lg font-bold text-smoke">Institutional Consensus Report</h3>
              <p className="text-xs text-white/40 mt-1 font-mono">
                {report.filters?.marketBias} · {report.filters?.sectorFocus} · {report.filters?.timeHorizon}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ConfidenceGauge value={confPct} size={80} label="Confidence" />
              </div>
              <ReportDownloader type="simulation" data={report} />
            </div>
          </div>

          {/* Signal Badge */}
          {overallSignal && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 ${
              overallSignal === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              overallSignal === 'Bearish' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-white/5 text-white/60 border border-white/10'
            }`}>
              <Target size={12} />
              <span className="text-xs font-bold uppercase tracking-wider">{overallSignal} Signal</span>
            </div>
          )}

          {/* Executive Summary */}
          <div className="mb-6">
            <h4 className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider mb-2">Executive Conclusion</h4>
            <p className="text-sm text-white/80 leading-relaxed">{typingSummary}<span className="animate-pulse text-cyan-400">|</span></p>
          </div>

          {/* Two-column insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye size={10} />Consensus View
              </h5>
              <p className="text-xs text-white/60 leading-relaxed">{report.report?.consensusView}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <h5 className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={10} />Key Disagreements
              </h5>
              <p className="text-xs text-white/60 leading-relaxed">{report.report?.keyDisagreements}</p>
            </div>
          </div>

          {/* Market Drivers & Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h5 className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp size={10} />Primary Market Drivers
              </h5>
              <ul className="space-y-1.5">
                {(report.report?.primaryMarketDrivers ?? []).map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <ChevronRight size={11} className="text-emerald-400 shrink-0 mt-0.5" />{x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-rose-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield size={10} />Major Risks
              </h5>
              <ul className="space-y-1.5">
                {(report.report?.majorRisks ?? []).map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <AlertTriangle size={11} className="text-rose-400 shrink-0 mt-0.5" />{x}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Opportunity Areas */}
          {report.report?.keyPoints?.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 mb-4">
              <h5 className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Star size={10} />Opportunity Areas
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {report.report.keyPoints.slice(0, 8).map((x, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <Sparkline data={[]} color="#22d3ee" width={40} height={16} />
                    <span className="flex-1">{x}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/20 text-center italic mt-4">
            {report.report?.disclaimer || 'Simulation-based analytical output, not financial advice.'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
