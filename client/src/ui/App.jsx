import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

import { MarketSentimentProvider } from './contexts/MarketSentimentContext.jsx';
import FloatingNav from './components/FloatingNav.jsx';
import AuthPage from './components/AuthPage.jsx';
import PublisherPanel from './components/PublisherPanel.jsx';
import NewsPage from './pages/NewsPage.jsx';
import WarRoomPage from './pages/WarRoomPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// ═══════════════════════════════════════
// API Helper
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// Page Transition Wrapper
// ═══════════════════════════════════════
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3,
};

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════

// Pre-compute particle positions so they stay stable across renders
const PARTICLE_SEED = Array.from({ length: 20 }, (_, i) => ({
  size: 1 + (((i * 7 + 3) % 5) / 5) * 2,
  x: ((i * 17 + 11) % 100),
  y: ((i * 23 + 7) % 100),
  drift: 80 + ((i * 13 + 5) % 120),
  xDrift: ((i * 11 + 3) % 60) - 30,
  maxOpacity: 0.3 + ((i * 7 + 2) % 4) / 10,
  duration: 6 + ((i * 9 + 1) % 8),
  delay: ((i * 5 + 2) % 10),
}));

export default function App() {
  const [tab, setTab] = useState('news');
  const [me, setMe] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    api('/api/auth/me')
      .then(d => setMe(d.user))
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setMe(null);
    setTab('news');
  }

  function handleAuth(user) {
    setMe(user);
    setShowAuth(false);
  }

  const page = useMemo(() => {
    switch (tab) {
      case 'news': return <NewsPage me={me} />;
      case 'debate': return <WarRoomPage me={me} />;
      case 'simulation': return <SimulationPage me={me} />;
      case 'history': return <HistoryPage me={me} />;
      default: return <NewsPage me={me} />;
    }
  }, [tab, me]);

  // Loading state — Premium animated loader
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated orbs background */}
        <div className="fixed inset-0 pointer-events-none">
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.12), transparent 70%)', top: '20%', left: '30%' }}
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1), transparent 70%)', bottom: '20%', right: '25%' }}
            animate={{ x: [0, -30, 20, 0], y: [0, 20, -30, 0], scale: [1, 0.9, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', top: '50%', left: '60%' }}
            animate={{ x: [0, 25, -15, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="text-center relative z-10">
          {/* Animated rings */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-violet-400/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border-2 border-emerald-400/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            />
            {/* Core spinner */}
            <motion.div
              className="absolute inset-6 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-emerald-400 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center">
                <Activity size={16} className="text-cyan-400" />
              </div>
            </motion.div>
          </div>
          
          <motion.p
            className="text-sm text-white/50 font-medium tracking-wider"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Initializing Vantage...
          </motion.p>
          <div className="mt-3 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
                animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MarketSentimentProvider>
      <div className="min-h-screen relative">
        {/* Floating particles layer */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {PARTICLE_SEED.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: 0,
              }}
              animate={{
                y: [0, -p.drift, -200],
                x: [0, p.xDrift],
                opacity: [0, p.maxOpacity, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <FloatingNav
          me={me} tab={tab} setTab={setTab}
          onLogout={logout}
          setShowAuth={setShowAuth}
          setShowAdmin={setShowAdmin}
          setShowPublisher={setShowPublisher}
        />

        {/* Main content with page transitions */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {page}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Auth overlay */}
        {showAuth && <AuthPage onAuth={handleAuth} onClose={() => setShowAuth(false)} />}

        {/* Admin overlay */}
        {showAdmin && me?.role === 'admin' && <AdminDashboard me={me} onClose={() => setShowAdmin(false)} />}

        {/* Publisher overlay */}
        {showPublisher && (me?.role === 'publisher' || me?.role === 'admin') && (
          <PublisherPanel me={me} onClose={() => setShowPublisher(false)} />
        )}
      </div>
    </MarketSentimentProvider>
  );
}
