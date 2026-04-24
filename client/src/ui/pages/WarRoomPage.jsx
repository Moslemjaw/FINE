import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Lock, Shield, Globe, Users, Landmark, Building2,
  BarChart3, AlertTriangle, ChevronRight, FileText, Clock, Layers,
  Download, Target
} from 'lucide-react';
import { SentimentPill, ConfidenceGauge, SkeletonCard } from '../components/SharedComponents.jsx';
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
const AGENT_AVATARS = ['◆', '◇', '▲', '▽', '⬡', '⬢'];

const AGENTS_META = [
  { name: 'Retail', provider: 'Agent', icon: Users },
  { name: 'Institutional', provider: 'Agent', icon: Landmark },
  { name: 'Dividend', provider: 'Agent', icon: BarChart3 },
  { name: 'Real Estate', provider: 'Agent', icon: Building2 },
  { name: 'GCC Macro', provider: 'Agent', icon: Globe },
  { name: 'Risk Mgr', provider: 'Agent', icon: Shield },
];

export default function WarRoomPage({ me }) {
  const [messages, setMessages] = useState([]);
  const [consensus, setConsensus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [marketBias, setMarketBias] = useState('Neutral');
  const [sectorFocus, setSectorFocus] = useState('All Sectors');
  const [timeHorizon, setTimeHorizon] = useState('Short-term (1-4 weeks)');
  const [countryFocus, setCountryFocus] = useState('GCC (All)');
  const [err, setErr] = useState('');
  const scrollRef = useRef(null);

  async function startDebate() {
    if (!me) return;
    setRunning(true);
    setMessages([]);
    setConsensus(null);
    setSessionId(null);
    setErr('');
    setActiveAgent('Initializing agents...');

    try {
      const d = await api('/api/debate/start', {
        method: 'POST',
        body: JSON.stringify({ marketBias, sectorFocus, timeHorizon, countryFocus }),
      });
      setMessages(d.messages || []);
      setConsensus(d.consensusReport);
      setSessionId(d.sessionId);
    } catch (e) {
      setErr('Market Data Interrupted — Unable to initialize debate session. Please retry.');
    } finally {
      setRunning(false);
      setActiveAgent(null);
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Compute aggregate stats
  const avgConfidence = messages.length
    ? Math.round(messages.reduce((s, m) => s + m.confidence, 0) / messages.length)
    : 0;
  const bullCount = messages.filter(m => m.sentiment === 'Bullish').length;
  const bearCount = messages.filter(m => m.sentiment === 'Bearish').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Panel */}
      <div className="glass-card !p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-smoke flex items-center gap-2"><Brain size={20} className="text-cyan-400" />War Room</h2>
            <p className="text-xs text-white/40 mt-0.5">
              6 specialized AI agents debate market trends. Turn-based protocol with consensus synthesis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={startDebate} disabled={!me || running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {running ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agents Thinking...
                </>
              ) : (
                <><Zap size={13} />Launch Debate</>
              )}
            </button>
          </div>
        </div>

        {!me && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/70 bg-amber-400/5 rounded-lg px-3 py-2">
            <Lock size={12} />Sign in required to launch debates
          </div>
        )}

        {/* Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Market Bias', value: marketBias, set: setMarketBias, options: MARKET_BIAS, icon: BarChart3 },
            { label: 'Sector Focus', value: sectorFocus, set: setSectorFocus, options: SECTOR_FOCUS, icon: Layers },
            { label: 'Time Horizon', value: timeHorizon, set: setTimeHorizon, options: TIME_HORIZONS, icon: Clock },
            { label: 'Country', value: countryFocus, set: setCountryFocus, options: COUNTRY_FOCUS, icon: Globe },
          ].map(f => (
            <div key={f.label}>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
                <f.icon size={10} />{f.label}
              </label>
              <select value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 outline-none focus:border-violet-400/40">
                {f.options.map(o => <option key={o} value={o} className="bg-midnight">{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {AGENTS_META.map((a, i) => {
          const isActive = messages.some(m => m.agentName?.includes(a.name));
          return (
            <motion.div key={a.name} className="glass-card !p-3 flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-violet-500/15 text-violet-400">
                <a.icon size={13} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/70">{a.name}</p>
                <p className="text-[9px] text-white/30 font-mono uppercase">{a.provider}</p>
              </div>
              {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />}
            </motion.div>
          );
        })}
      </div>

      {/* Debate Messages — Timeline Style */}
      <div ref={scrollRef} className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
        {running && messages.length === 0 && (
          <div className="glass-card !p-6 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              <span className="text-sm text-white/60">Agents entering the War Room...</span>
            </div>
            <div className="typing-dots mt-3 text-violet-400"><span /><span /><span /></div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
            >
              <div className="chat-bubble chat-bubble-gemini">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-violet-500/15 text-violet-400">
                    {AGENT_AVATARS[msg.agentId - 1] || '◆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold text-smoke">{msg.agentName}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">Agent</span>
                      <SentimentPill sentiment={msg.sentiment} />
                      <span className="text-[10px] font-mono text-white/30 ml-auto">{msg.confidence}% conf.</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{msg.content}</p>

                    {/* Key Point highlight */}
                    {msg.keyPoint && (
                      <div className="mt-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Key Thesis</p>
                        <p className="text-xs text-white/60">{msg.keyPoint}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error */}
      {err && (
        <div className="error-card flex items-center gap-3">
          <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Market Data Interrupted</p>
            <p className="text-xs text-rose-400/60 mt-0.5">{err}</p>
          </div>
        </div>
      )}

      {/* Consensus Report */}
      {consensus && (
        <motion.div className="report-briefing"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                <FileText size={18} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-smoke">Final Consensus Briefing</h3>
                <p className="text-[10px] text-white/40 font-mono uppercase">
                  Impact: {consensus.marketImpactRating || '—'}/10 · Agents: {messages.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConfidenceGauge value={Math.round((consensus.marketImpactRating || 5) * 10)} size={56} label="Impact" />
              <ReportDownloader type="warroom" data={{
                _id: sessionId,
                trigger: `${marketBias} · ${sectorFocus} · ${timeHorizon} · ${countryFocus}`,
                status: 'completed',
                marketImpactRating: consensus?.marketImpactRating,
                consensusReport: consensus,
                messages,
                createdAt: new Date().toISOString(),
              }} sessionId={sessionId} />
            </div>
          </div>

          {consensus.title && (
            <h4 className="text-base font-bold text-smoke mb-2">{consensus.title}</h4>
          )}

          <p className="text-sm text-white/70 leading-relaxed mb-4">{consensus.summary}</p>

          {/* Agent Consensus Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="kpi-card border border-cyan-500/20 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg Confidence</p>
              <p className="text-xl font-bold font-mono text-cyan-400">{avgConfidence}%</p>
            </div>
            <div className="kpi-card border border-emerald-500/20 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Bullish Votes</p>
              <p className="text-xl font-bold font-mono text-emerald-400">{bullCount}/{messages.length}</p>
            </div>
            <div className="kpi-card border border-rose-500/20 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Bearish Votes</p>
              <p className="text-xl font-bold font-mono text-rose-400">{bearCount}/{messages.length}</p>
            </div>
          </div>

          {consensus.keyTakeaways?.length > 0 && (
            <div className="mb-4">
              <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Key Takeaways</h5>
              <ul className="space-y-1.5">
                {consensus.keyTakeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <ChevronRight size={12} className="text-cyan-400 shrink-0 mt-0.5" />{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sector Outlook */}
          {consensus.sectorOutlook && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { key: 'overweight', label: 'Overweight', color: 'emerald' },
                { key: 'underweight', label: 'Underweight', color: 'rose' },
                { key: 'watch', label: 'Watch', color: 'amber' },
              ].map(s => (
                <div key={s.key} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                  <h6 className={`text-[10px] font-bold text-${s.color}-400/70 uppercase tracking-wider mb-1.5`}>{s.label}</h6>
                  <ul className="space-y-1">
                    {(consensus.sectorOutlook[s.key] ?? []).map((item, i) => (
                      <li key={i} className="text-[11px] text-white/50">• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {consensus.actionableInsights && (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <h5 className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1.5">Actionable Insights</h5>
              <p className="text-xs text-white/60 leading-relaxed">{consensus.actionableInsights}</p>
            </div>
          )}

          {consensus.riskWarnings && (
            <div className="mt-3 bg-rose-500/5 rounded-xl p-4 border border-rose-500/10">
              <h5 className="text-[10px] font-bold text-rose-400/70 uppercase tracking-wider mb-1.5">⚠ Risk Warnings</h5>
              <p className="text-xs text-white/50 leading-relaxed">{consensus.riskWarnings}</p>
            </div>
          )}

          <p className="text-[10px] text-white/20 mt-4 text-center italic">
            Simulation-based analytical output. Not financial advice.
          </p>
        </motion.div>
      )}
    </div>
  );
}
