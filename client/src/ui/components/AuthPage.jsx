import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lock, Shield, Globe, ArrowLeft } from 'lucide-react';
import logoSvg from '../public/logo.svg';

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

// Pre-computed particles for stable rendering
const AUTH_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  size: 1 + (((i * 7 + 3) % 5) / 5) * 2,
  x: ((i * 17 + 11) % 100),
  y: ((i * 23 + 7) % 100),
  drift: 60 + ((i * 13 + 5) % 80),
  xDrift: ((i * 11 + 3) % 40) - 20,
  maxOpacity: 0.2 + ((i * 7 + 2) % 3) / 10,
  duration: 8 + ((i * 9 + 1) % 6),
  delay: ((i * 5 + 2) % 8),
}));

export default function AuthPage({ onAuth, onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    setErr(''); setLoading(true);
    try {
      const payload = mode === 'register' ? { email, name, password } : { email, password };
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
      onAuth(data.user);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[200] min-h-screen flex items-center justify-center overflow-hidden" style={{ background: '#020617' }}>
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)',
          top: '10%', left: '20%',
        }} />
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)',
          bottom: '10%', right: '15%',
        }} />
        <div className="absolute w-[400px] h-[400px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)',
          top: '50%', left: '60%',
        }} />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {AUTH_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, opacity: 0 }}
            animate={{
              y: [0, -p.drift, -150],
              x: [0, p.xDrift],
              opacity: [0, p.maxOpacity, 0],
            }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Back button */}
      {onClose && (
        <button onClick={onClose}
          className="fixed top-6 left-6 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all">
          <ArrowLeft size={14} />Back to Terminal
        </button>
      )}

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-5 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex justify-center mb-5"
            >
              <img src={logoSvg} alt="Vantage Logo" className="w-20 h-20 object-contain logo-glow" />
            </motion.div>
            <h2 className="text-2xl font-bold text-smoke">Welcome to Vantage</h2>
            <p className="text-sm text-white/40 mt-2">AI-Powered Financial Intelligence Terminal</p>
          </div>

          {/* Toggle */}
          <div className="mx-6 flex rounded-xl bg-white/5 p-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  mode === m ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white border border-white/10' : 'text-white/40 hover:text-white/60'
                }`}>{m === 'login' ? 'Sign In' : 'Create Account'}</button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none transition-all"
                placeholder="you@company.com" required />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none transition-all"
                  placeholder="Full name" required />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none transition-all"
                placeholder="Min 8 characters" required />
            </div>

            {err && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                <span className="text-rose-300">{err}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
              {loading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Trust badges */}
          <div className="px-6 pb-5 flex items-center justify-center gap-4 text-[10px] text-white/25">
            <span className="flex items-center gap-1"><Lock size={9} />Encrypted</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Shield size={9} />Secure Gateway</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Globe size={9} />Kuwait/GCC</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
