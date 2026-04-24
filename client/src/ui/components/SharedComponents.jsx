import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function Sparkline({ data = [], color = '#22d3ee', width = 100, height = 28 }) {
  if (data.length < 2) {
    data = Array.from({ length: 12 }, () => Math.random() * 0.6 + 0.2);
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sg-${color.replace('#','')})`} />
    </svg>
  );
}

export function ConfidenceGauge({ value = 50, size = 72, label }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="font-mono font-bold text-sm" style={{ color }}>{value}%</span>
      </div>
      {label && <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{label}</span>}
    </div>
  );
}

export function GeoAvatar({ name = '', status = 'live', size = 36 }) {
  const initial = (name || '?')[0].toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="status-ring relative" data-status={status}
      style={{ width: size, height: size }}>
      <div className="rounded-xl flex items-center justify-center font-bold text-white text-sm w-full h-full"
        style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${(hue + 40) % 360}, 60%, 35%))` }}>
        {initial}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-midnight ${
        status === 'live' ? 'bg-green-400' : status === 'processing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
      }`} />
    </div>
  );
}

export function SentimentPill({ sentiment }) {
  const cls = sentiment === 'Bullish' ? 'sentiment-bullish' : sentiment === 'Bearish' ? 'sentiment-bearish' : 'sentiment-neutral';
  const Icon = sentiment === 'Bullish' ? TrendingUp : sentiment === 'Bearish' ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}`}>
      <Icon size={11} />{sentiment}
    </span>
  );
}

export function WeightRing({ value, onChange, label, color = '#22d3ee', max = 100 }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 cursor-pointer" onClick={() => {
        const next = ((value + 10) % (max + 10));
        onChange(Math.min(max, next));
      }}>
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-bold text-lg text-white">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-card animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 mb-3 ${i === 0 ? 'w-2/5' : i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function KPICard({ label, value, delta, trend = 'up', icon: Icon, color = 'cyan' }) {
  const colorMap = {
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className={`kpi-card border ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className={c.text} />}
      </div>
      <p className={`text-2xl font-bold font-mono ${c.text}`}>{value}</p>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-rose-400" />}
          <span className={`text-[10px] font-mono ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>{delta}</span>
        </div>
      )}
    </div>
  );
}
