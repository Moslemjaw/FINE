import React, { useEffect, useMemo, useState } from 'react';

const ADMIN_TABS = ['home', 'analysis', 'console', 'saved', 'admin'];
const USER_TABS = ['home', 'saved'];
const GUEST_TABS = ['home'];

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

function TabButton({ tab, active, onClick }) {
  return (
    <button className={`tabBtn ${active ? 'tabBtnActive' : ''}`} onClick={onClick}>
      {tab}
    </button>
  );
}

function AuthPanel({ me, setMe }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    try {
      const payload = mode === 'register' ? { email, name, password } : { email, password };
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
      setMe(data.user);
    } catch (e) {
      setErr(String(e?.message ?? e));
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setMe(null);
  }

  if (me) {
    return (
      <div className="card">
        <div className="label">Session</div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800 }}>{me.name}</div>
            <div className="muted">
              {me.email} · <span className="pill">{me.role}</span>
            </div>
          </div>
          <button className="btn btnGhost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="label">Login</div>
        <div className="row">
          <button className="btn btnGhost" onClick={() => setMode('login')}>
            Login
          </button>
          <button className="btn btnGhost" onClick={() => setMode('register')}>
            Register
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        {mode === 'register' && (
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        )}
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          type="password"
        />
        {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
        <button className="btn btnPrimary" onClick={submit}>
          {mode === 'register' ? 'Create account' : 'Login'}
        </button>
      </div>
    </div>
  );
}

function ConsolePage({ me }) {
  const [provider, setProvider] = useState('deepseek');
  const [role, setRole] = useState('risk');
  const [input, setInput] = useState('');
  const [sources, setSources] = useState('Boursa Kuwait, CBK, NBK Research, Kuwait Times');
  const [out, setOut] = useState(null);
  const [err, setErr] = useState('');
  const canRun = !!me && input.trim().length >= 20;

  async function run() {
    setErr('');
    setOut(null);
    try {
      const data = await api('/api/analysis', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          role,
          input,
          kuwaitSources: sources
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setOut(data);
    } catch (e) {
      setErr(String(e?.message ?? e));
    }
  }

  return (
    <div className="grid2">
      <div className="card">
        <div className="label">Risk console input</div>
        <div className="row">
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
          </select>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="risk">Risk analyst</option>
            <option value="political">Political analyst</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <textarea
            className="textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a Kuwait/GCC article, announcement, earnings note, or any text to analyze for risk."
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="label">Kuwait sources to prioritize (comma-separated)</div>
          <input className="input" value={sources} onChange={(e) => setSources(e.target.value)} />
        </div>
        {err && <div className="muted" style={{ marginTop: 10, color: 'var(--red)' }}>{err}</div>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className={`btn ${canRun ? 'btnPrimary' : 'btnGhost'}`} onClick={run} disabled={!canRun}>
            Run analysis
          </button>
          {!me && <div className="muted">Login required to run analysis.</div>}
        </div>
      </div>

      <div className="consolePanel">
        <div className="consoleHeader">
          <div className="consoleTitle">Console output</div>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill">{provider}</span>
            <span className="pill">{role}</span>
          </div>
        </div>

        {!out ? (
          <div className="consoleBody">
            <div className="consoleBlock" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {err ? `error: ${err}` : 'ready: paste an input and run analysis'}
            </div>
          </div>
        ) : (
          <div className="consoleBody" style={{ display: 'grid', gap: 12 }}>
            <div className="consoleBlock">
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>summary</div>
              <div style={{ marginTop: 6 }}>{out.output.summary}</div>
            </div>

            <div className="consoleBlock">
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>signals</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {(out.output.riskSignals ?? []).map((s) => (
                  <div key={s.label} style={{ display: 'grid', gap: 6 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 900 }}>{s.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)' }}>{Math.round((s.score ?? 0) * 100)}%</div>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${Math.round((s.score ?? 0) * 100)}%` }} />
                    </div>
                    {s.why ? <div style={{ color: 'rgba(255,255,255,0.7)' }}>{s.why}</div> : null}
                  </div>
                ))}
              </div>
            </div>

            {out.output.baseCase ? (
              <div className="consoleBlock">
                <div style={{ color: 'rgba(255,255,255,0.65)' }}>base_case</div>
                <div style={{ marginTop: 6 }}>{out.output.baseCase}</div>
              </div>
            ) : null}

            {out.output.bearCase ? (
              <div className="consoleBlock">
                <div style={{ color: 'rgba(255,255,255,0.65)' }}>bear_case</div>
                <div style={{ marginTop: 6 }}>{out.output.bearCase}</div>
              </div>
            ) : null}

            <div className="consoleBlock">
              <div style={{ color: 'rgba(255,255,255,0.65)' }}>sources_used</div>
              <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)' }}>
                {(out.output.kuwaitSourcesUsed ?? []).join(', ') || '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisPage({ me }) {
  const [provider, setProvider] = useState('deepseek');
  const [role, setRole] = useState('risk');
  const [sources, setSources] = useState('Boursa Kuwait, CBK, NBK Research, Kuwait Times');
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [out, setOut] = useState(null);

  async function syncNow() {
    setErr('');
    setMsg('');
    setSyncing(true);
    try {
      const data = await api('/api/news/import/newsdata', { method: 'POST', body: JSON.stringify({ q: 'kuwait' }) });
      setMsg(`Synced. Upserted ${data.sync?.upserted ?? data.imported ?? 0} items.`);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally {
      setSyncing(false);
    }
  }

  async function runPastWeek() {
    setErr('');
    setMsg('');
    setOut(null);
    setRunning(true);
    try {
      const data = await api('/api/analysis/past-week', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          role,
          kuwaitSources: sources
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setOut(data);
      setMsg(`Analyzed ${data.itemsAnalyzed} items from last 7 days.`);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally {
      setRunning(false);
    }
  }

  if (!me || me.role !== 'admin') return <div className="card"><div className="muted">Admin only.</div></div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Past-week AI analysis</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Sync NewsData into MongoDB, then run DeepSeek/Gemini to analyze Kuwait/GCC risks for the past 7 days.
            </div>
          </div>
          <div className="row">
            <button className="btn btnGhost" onClick={syncNow} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync last 7 days'}
            </button>
            <button className="btn btnPrimary" onClick={runPastWeek} disabled={running}>
              {running ? 'Running…' : 'Run analysis'}
            </button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
          </select>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="risk">Risk analyst</option>
            <option value="political">Political analyst</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="label">Kuwait sources to prioritize (comma-separated)</div>
          <input className="input" value={sources} onChange={(e) => setSources(e.target.value)} />
        </div>
        {err && <div className="muted" style={{ marginTop: 10, color: 'var(--red)' }}>{err}</div>}
        {msg && <div className="muted" style={{ marginTop: 10, color: 'var(--green)' }}>{msg}</div>}
      </div>

      <div className="consolePanel">
        <div className="consoleHeader">
          <div className="consoleTitle">weekly_report.json</div>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill">{provider}</span>
            <span className="pill">{role}</span>
          </div>
        </div>

        <div className="consoleBody">
          {!out ? (
            <div className="consoleBlock" style={{ color: 'rgba(255,255,255,0.7)' }}>
              ready: click “Sync last 7 days”, then “Run analysis”
            </div>
          ) : (
            <pre className="consoleBlock" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(out.output, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer live external feed for the home page.
        const ext = await api('/api/news/external/newsdata?days=7&q=kuwait');
        if (!cancelled && Array.isArray(ext.items) && ext.items.length) {
          setItems(ext.items);
          return;
        }
      } catch (e) {
        if (!cancelled) setErr(String(e?.message ?? e));
      }

      try {
        const local = await api('/api/news');
        if (!cancelled) setItems(local.items ?? []);
      } catch (e) {
        if (!cancelled) setErr(String(e?.message ?? e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card">
      <div className="label">Latest Kuwait & GCC news</div>
      {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((n) => (
          <div key={n._id} className="card" style={{ background: 'var(--gray1)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="pill">{n.tag}</span>
              <span className="muted">{new Date(n.publishedAt ?? n.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 8, fontWeight: 900 }}>{n.headline}</div>
            <div className="muted" style={{ marginTop: 6 }}>{n.source}</div>
            {n.body ? <div style={{ marginTop: 8, lineHeight: 1.7 }}>{n.body}</div> : null}
            {n.url ? (
              <div style={{ marginTop: 8 }}>
                <a href={n.url} target="_blank" rel="noreferrer" className="muted">
                  Open source
                </a>
              </div>
            ) : null}
          </div>
        ))}
        {!items.length && (
          <div className="muted">
            No news yet. If this is unexpected, set <strong>NEWSDATA_API_KEY</strong> in <code>server/.env</code> or import via Admin.
          </div>
        )}
      </div>
    </div>
  );
}

function HomePage({ me }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Kuwait market briefing</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Latest curated Kuwait/GCC headlines for the last week, with admin-only risk console (DeepSeek/Gemini).
            </div>
          </div>
          {me?.role === 'admin' ? (
            <span className="pill">admin tools enabled</span>
          ) : (
            <span className="pill">news dashboard</span>
          )}
        </div>
      </div>

      <NewsPage />
    </div>
  );
}

function SavedPage({ me }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!me) return;
    api('/api/articles/saved/mine')
      .then((d) => setItems(d.items ?? []))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [me]);

  if (!me) return <div className="card"><div className="muted">Login to view saved articles.</div></div>;

  return (
    <div className="card">
      <div className="label">Saved articles</div>
      {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((a) => (
          <div key={a._id} className="card" style={{ background: 'white' }}>
            <div style={{ fontWeight: 900 }}>{a.title}</div>
            {a.excerpt ? <div className="muted" style={{ marginTop: 6 }}>{a.excerpt}</div> : null}
          </div>
        ))}
        {!items.length && <div className="muted">Nothing saved yet.</div>}
      </div>
    </div>
  );
}

function AdminPage({ me }) {
  const isAdmin = me?.role === 'admin';
  const [source, setSource] = useState('Kuwait Times');
  const [tag, setTag] = useState('KUWAIT');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [importing, setImporting] = useState(false);

  async function publish() {
    setErr('');
    setOk('');
    try {
      await api('/api/news', {
        method: 'POST',
        body: JSON.stringify({ source, tag, headline, body, url }),
      });
      setOk('Published.');
      setHeadline('');
      setBody('');
      setUrl('');
    } catch (e) {
      setErr(String(e?.message ?? e));
    }
  }

  async function importLastWeek() {
    setErr('');
    setOk('');
    setImporting(true);
    try {
      const data = await api('/api/news/import/newsdata', {
        method: 'POST',
        body: JSON.stringify({ q: 'kuwait' }),
      });
      setOk(`Imported ${data.imported} items from last 7 days.`);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally {
      setImporting(false);
    }
  }

  if (!me) return <div className="card"><div className="muted">Login required.</div></div>;
  if (!isAdmin) return <div className="card"><div className="muted">Admin only.</div></div>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="label">Admin · news</div>
        <button className="btn btnGhost" onClick={importLastWeek} disabled={importing}>
          {importing ? 'Importing…' : 'Import last 7 days (Kuwait)'}
        </button>
      </div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Imports Kuwait/GCC business/politics/tech/top/domestic stories (EN+AR) and keeps the most recent week.
      </div>

      <div className="label">Publish manually</div>
      <div className="row">
        <input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source" />
        <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" />
      </div>
      <div style={{ marginTop: 10 }}>
        <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" />
      </div>
      <div style={{ marginTop: 10 }}>
        <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" />
      </div>
      <div style={{ marginTop: 10 }}>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" />
      </div>
      {err && <div className="muted" style={{ marginTop: 10, color: 'var(--red)' }}>{err}</div>}
      {ok && <div className="muted" style={{ marginTop: 10, color: 'var(--green)' }}>{ok}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btnPrimary" onClick={publish} disabled={!headline.trim()}>
          Publish
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [me, setMe] = useState(null);

  useEffect(() => {
    api('/api/auth/me').then((d) => setMe(d.user)).catch(() => setMe(null));
  }, []);

  const visibleTabs = useMemo(() => {
    if (me?.role === 'admin') return ADMIN_TABS;
    if (me) return USER_TABS;
    return GUEST_TABS;
  }, [me]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0] ?? 'news');
  }, [tab, visibleTabs]);

  return (
    <div>
      <div className="shellTop">
        <div className="container">
          <div className="topbar">
            <div>
              <div className="brandKicker">Kuwait market · risk intelligence</div>
              <h1 className="brandTitle">FINE — Kuwait Risk Console</h1>
              <div className="brandSub">MERN + Vite · Admin news · Saved articles · DeepSeek/Gemini analysis</div>
            </div>
            <div style={{ minWidth: 320, flex: '0 0 auto' }}>
              <AuthPanel me={me} setMe={setMe} />
            </div>
          </div>
          <div className="tabs">
            {visibleTabs.map((t) => (
              <TabButton key={t} tab={t} active={tab === t} onClick={() => setTab(t)} />
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="page">
          {tab === 'console' && me?.role === 'admin' && <ConsolePage me={me} />}
          {tab === 'analysis' && <AnalysisPage me={me} />}
          {tab === 'home' && <HomePage me={me} />}
          {tab === 'saved' && <SavedPage me={me} />}
          {tab === 'admin' && <AdminPage me={me} />}
        </div>
      </div>
    </div>
  );
}

