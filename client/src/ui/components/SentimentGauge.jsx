import React from 'react';
import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { useMarketSentiment } from '../contexts/MarketSentimentContext.jsx';

export default function SentimentGauge() {
  const { gaugeScore, label, isRedAlert } = useMarketSentiment();

  const labelColor = label === 'Bullish' ? 'text-emerald-400' : label === 'Bearish' ? 'text-rose-400' : 'text-slate-400';
  const needlePosition = `${Math.max(2, Math.min(98, gaugeScore))}%`;

  return (
    <div className={`glass-card ${isRedAlert ? 'red-alert-glow red-alert-border' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-white/40" />
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Market Sentiment</span>
        </div>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs font-bold font-mono ${labelColor}`}
        >
          {label}
        </motion.span>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center mb-4">
        <motion.span
          className="text-4xl font-mono font-bold"
          style={{ color: gaugeScore > 60 ? '#10b981' : gaugeScore < 40 ? '#ef4444' : '#f59e0b' }}
          key={gaugeScore}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {gaugeScore}
        </motion.span>
        <span className="text-sm text-white/30 ml-1 mt-2 font-mono">/100</span>
      </div>

      {/* Linear Bar */}
      <div className="sentiment-meter">
        <motion.div
          className="meter-needle"
          initial={{ left: '50%' }}
          animate={{ left: needlePosition }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-[9px] text-white/30 font-mono">
        <span>BEARISH</span>
        <span>NEUTRAL</span>
        <span>BULLISH</span>
      </div>

      {/* Red Alert indicator */}
      {isRedAlert && (
        <motion.div
          className="mt-3 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Market Alert Active</span>
        </motion.div>
      )}
    </div>
  );
}
