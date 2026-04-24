import React, { useState, useEffect, useRef } from 'react';
import {
  Newspaper, Brain, Target, History, Shield, Plus,
  ChevronDown, LogOut, Menu, Settings, User, Lock, Edit3,
  Check, X, AlertTriangle
} from 'lucide-react';
import { GeoAvatar } from './SharedComponents.jsx';
import logoSvg from '../public/logo.svg';
import vantageTextUrl from '../public/darkBlue.png';

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

function sentimentFromText(t) {
  const low = (t || '').toLowerCase();
  if (/(risk|war|attack|decline|drop|downgrade|inflation|crisis|disruption|volatility|loss|weak|fall|crash)/.test(low))
    return 'Bearish';
  if (/(growth|gain|surge|upgrade|strong|profit|recovery|expansion|optimism|rally|boost|rise)/.test(low))
    return 'Bullish';
  return 'Neutral';
}

// TABS — Settings removed from global nav
const TABS = [
  { id: 'news', label: 'Market Intel', icon: Newspaper },
  { id: 'debate', label: 'War Room', icon: Brain },
  { id: 'simulation', label: 'Simulation', icon: Target },
  { id: 'history', label: 'History', icon: History },
];

export default function FloatingNav({ me, tab, setTab, onLogout, setShowAuth, setShowAdmin, setShowPublisher }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickerItems, setTickerItems] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPwd, setEditPwd] = useState('');
  const [editCurrPwd, setEditCurrPwd] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    api('/api/news/weekly?page=1&pageSize=10&autoSync=1')
      .then(d => setTickerItems(d.items ?? []))
      .catch(() => setTickerItems([]));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function saveProfile() {
    setEditLoading(true); setEditErr(''); setEditMsg('');
    try {
      const body = {};
      if (editName.trim() && editName.trim() !== me?.name) body.name = editName.trim();
      if (editPwd) {
        body.currentPassword = editCurrPwd;
        body.newPassword = editPwd;
      }
      if (Object.keys(body).length === 0) { setEditMsg('No changes'); setEditLoading(false); return; }
      await api('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) });
      setEditMsg('Updated successfully');
      setEditPwd(''); setEditCurrPwd('');
    } catch (e) { setEditErr(String(e?.message ?? e)); }
    finally { setEditLoading(false); }
  }

  return (
    <header className="floating-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main nav row */}
        <div className="flex items-center justify-between h-14">
          {/* Brand — SVG logo with glow */}
          <div className="flex items-center gap-2">
            <img src={logoSvg} alt="Vantage Logo" className="w-10 h-10 object-contain logo-glow" />
            <div className="flex flex-col justify-center translate-y-0.5">
              <img src={vantageTextUrl} alt="VANTAGE" className="h-3 ml-0.5 object-contain" />
              <p className="text-[9px] text-white/40 font-medium tracking-widest uppercase pl-1 mt-0.5">AI Terminal</p>
            </div>
          </div>

          {/* Tabs — No settings */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                    ${tab === t.id
                      ? 'bg-white/10 text-white shadow-lg shadow-cyan-500/5'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}>
                  <Icon size={13} />{t.label}
                </button>
              );
            })}
          </nav>

          {/* Profile Dock */}
          <div className="flex items-center gap-2">
            {me?.role === 'admin' && (
              <button onClick={() => setShowAdmin(true)}
                className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                title="Admin Dashboard">
                <Shield size={14} />
              </button>
            )}
            {(me?.role === 'publisher' || me?.role === 'admin') && (
              <button onClick={() => setShowPublisher(true)}
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Publish News">
                <Plus size={14} />
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => me ? setMenuOpen(p => !p) : setShowAuth(true)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <GeoAvatar name={me?.name || '?'} status={me ? 'live' : 'offline'} size={28} />
                <span className="text-xs font-medium text-white/80 hidden sm:block">
                  {me ? me.name : 'Sign In'}
                </span>
                {me && <ChevronDown size={12} className="text-white/40" />}
              </button>

              {menuOpen && me && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-midnight-light/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-fade-in">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-white/80">{me.name}</p>
                    <p className="text-[10px] text-white/40">{me.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">
                      {me.role}
                    </span>
                  </div>

                  {/* Profile Edit Section */}
                  {showProfile ? (
                    <div className="px-4 py-3 space-y-2 border-b border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Edit Profile</span>
                        <button onClick={() => setShowProfile(false)} className="text-white/30 hover:text-white/60">
                          <X size={12} />
                        </button>
                      </div>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        placeholder="New name"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-cyan-400/40" />
                      <input type="password" value={editCurrPwd} onChange={e => setEditCurrPwd(e.target.value)}
                        placeholder="Current password"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-cyan-400/40" />
                      <input type="password" value={editPwd} onChange={e => setEditPwd(e.target.value)}
                        placeholder="New password (optional)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-cyan-400/40" />
                      {editErr && <p className="text-[10px] text-rose-400">{editErr}</p>}
                      {editMsg && <p className="text-[10px] text-emerald-400">{editMsg}</p>}
                      <button onClick={saveProfile} disabled={editLoading}
                        className="w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-[11px] font-bold disabled:opacity-40">
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditName(me.name); setShowProfile(true); setEditMsg(''); setEditErr(''); }}
                      className="w-full text-left px-4 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/5">
                      <Edit3 size={12} />Change Info
                    </button>
                  )}

                  {/* Admin Dashboard Option */}
                  {me.role === 'admin' && !showProfile && (
                    <button onClick={() => { setShowAdmin(true); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-violet-400/80 hover:text-violet-400 hover:bg-violet-500/5 transition-colors flex items-center gap-2 border-b border-white/5">
                      <Shield size={12} />Admin Dashboard
                    </button>
                  )}

                  {/* Nav Links */}
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                      <t.icon size={12} />{t.label}
                    </button>
                  ))}

                  <button onClick={() => { onLogout(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/5 transition-colors flex items-center gap-2 border-t border-white/5">
                    <LogOut size={12} />Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu */}
            <button className="md:hidden p-1.5 text-white/50" onClick={() => setMenuOpen(p => !p)}>
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Ticker tape */}
        <div className="ticker-wrap py-1.5">
          <div className="ticker-track gap-6">
            {[...tickerItems, ...tickerItems].map((it, i) => {
              const s = sentimentFromText(it.headline);
              return (
                <span key={`${it._id}-${i}`} className="inline-flex items-center gap-2 text-[11px] font-mono text-white/60 whitespace-nowrap mr-8">
                  <span className={`w-1.5 h-1.5 rounded-full ${s === 'Bullish' ? 'bg-emerald-400' : s === 'Bearish' ? 'bg-rose-400' : 'bg-slate-500'}`} />
                  {it.headline?.slice(0, 80)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
