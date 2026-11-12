import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowRight, ChevronDown, Crown, Flag, LoaderCircle, LockKeyhole, LogOut, Plus, Radio, RefreshCw, ShieldCheck, UsersRound, X } from 'lucide-react';
import { getStaffToken } from '../../shared/api/client';
import { staffApi as api } from './api';
import type { StaffMatchView, StaffQueueEntry, StaffSessionListItem, StaffSnapshot } from '@court-flow/contracts';
import { cx } from '../../shared/lib/classNames';
import sharedStyles from '../../shared/styles/components.module.css';
import staffStyles from './staff.module.css';
import { Brand, SiteHeader } from '../../shared/components/Navigation';
import { ErrorPanel, LoadingCard } from '../../shared/components/Feedback';
import { MetricCard } from './components/MetricCard';
import { StaffActionModals, type QueueReasonAction } from './components/StaffActionModals';
import { StaffCourtCard } from './components/StaffCourtCard';
import { StaffQueuePanel } from './components/StaffQueuePanel';
import { useSessionRealtime } from '../../shared/hooks/useSessionRealtime';
import { SessionCheckInCard } from './components/SessionCheckInCard';
import { ActivityRecord } from './components/ActivityRecord';

export function StaffPage() {
  const [token, setToken] = useState(getStaffToken());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<StaffSessionListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [snapshot, setSnapshot] = useState<StaffSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sessionName, setSessionName] = useState('Evening Open Play');
  const [sport, setSport] = useState('Pickleball');
  const [courtCount, setCourtCount] = useState(3);
  const [gameSize, setGameSize] = useState<2 | 4>(4);
  const [qrData, setQrData] = useState('');
  const [reasonAction, setReasonAction] = useState<QueueReasonAction | null>(null);
  const [reason, setReason] = useState('');
  const [activeMatch, setActiveMatch] = useState<StaffMatchView | null>(null);
  const [returning, setReturning] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function loadSessions(currentToken: string) {
    try {
      const next = await api.listSessions(currentToken);
      setSessions(next);
      setSelectedId((current) => current && next.some((session) => session.id === current) ? current : next[0]?.id ?? '');
      setError('');
    } catch (err) {
      localStorage.removeItem('courtflow:staff-token');
      setToken(undefined);
      setError(err instanceof Error ? err.message : 'Could not load staff sessions.');
    }
  }

  async function loadSnapshot(currentToken = token, id = selectedId) {
    if (!currentToken || !id) return;
    setLoading(true);
    try {
      const next = await api.snapshot(currentToken, id);
      setSnapshot(next);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this session.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadSessions(token);
    // Initial auth state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && selectedId) void loadSnapshot(token, selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedId]);

  useSessionRealtime(snapshot?.session.publicCode, () => { void loadSnapshot(); });

  useEffect(() => {
    if (!snapshot?.session.publicCode) return;
    const url = `${window.location.origin}/join/${snapshot.session.publicCode}`;
    void QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#183b35', light: '#ffffff' } })
      .then(setQrData)
      .catch(() => setQrData(''));
  }, [snapshot?.session.publicCode]);

  async function login(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      const result = await api.login(pin);
      localStorage.setItem('courtflow:staff-token', result.token);
      setToken(result.token);
      setPin('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      const created = await api.createSession(token, { name: sessionName, sport, courtCount, playersPerGame: gameSize });
      const next = await api.listSessions(token);
      setSessions(next);
      setSelectedId(created.id);
      setShowCreate(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the session.');
    } finally {
      setBusy(false);
    }
  }

  async function perform(action: () => Promise<StaffSnapshot>) {
    setBusy(true);
    setError('');
    try {
      const next = await action();
      setSnapshot(next);
      await loadSessions(token!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action could not be completed.');
      await loadSnapshot();
    } finally {
      setBusy(false);
    }
  }

  async function submitReason(event: FormEvent) {
    event.preventDefault();
    if (!reasonAction || !token || !snapshot) return;
    if (reason.trim().length < 3) return;
    const action = reasonAction;
    const cleanReason = reason.trim();
    setReasonAction(null);
    setReason('');
    if (action.type === 'skip') {
      await perform(() => api.skipTicket(token, snapshot.session.id, action.ticket.id, { reason: cleanReason }));
    } else {
      const target = action.type === 'front' ? 'front' : 'back';
      await perform(() => api.reorderTicket(token, snapshot.session.id, action.ticket.id, { target, reason: cleanReason }));
    }
  }

  function startCompleting(match: StaffMatchView) {
    const players = match.players;
    setActiveMatch(match);
    setReturning(players.filter((player) => !player.leaveAfterMatch).map((player) => player.id));
  }

  async function finishMatch() {
    if (!activeMatch || !token) return;
    const match = activeMatch;
    const returnIds = [...returning];
    setActiveMatch(null);
    await perform(() => api.completeMatch(token, match.id, { returningPlayerIds: returnIds }));
  }

  async function copyJoinLink() {
    if (!snapshot) return;
    const url = `${window.location.origin}/join/${snapshot.session.publicCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this local queue link', url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!token) {
    return <main className={cx("staff-page", staffStyles, sharedStyles)}><SiteHeader subtle /><div className={cx("staff-login-wrap", staffStyles, sharedStyles)}><Link to="/" className={cx("back-link", staffStyles, sharedStyles)}><ArrowLeft size={16} /> Back to CourtFlow</Link><section className={cx("staff-login-card", staffStyles, sharedStyles)}><div className={cx("login-icon", staffStyles, sharedStyles)}><LockKeyhole size={22} /></div><div className={cx("eyebrow", staffStyles, sharedStyles)}>LOCAL VENUE ACCESS</div><h1>Welcome back,<br />court captain.</h1><p>Sign in to open the queue, manage courts, and call the next game.</p><form onSubmit={login}><label htmlFor="staff-pin">Staff PIN</label><input id="staff-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter your PIN" required /><button className={cx("button button-primary button-full", staffStyles, sharedStyles)} disabled={busy || pin.length < 4}>{busy ? <LoaderCircle className={cx("spin", staffStyles, sharedStyles)} size={17} /> : <>Open dashboard <ArrowRight size={17} /></>}</button></form>{error && <div className={cx("inline-error", staffStyles, sharedStyles)} role="alert">{error}</div>}<div className={cx("login-local-note", staffStyles, sharedStyles)}><ShieldCheck size={15} /> Local development access. Your PIN stays on this computer.</div></section></div></main>;
  }

  const queue = (snapshot?.queue ?? []) as StaffQueueEntry[];
  const activeMatches = snapshot?.activeMatches ?? [];
  const availableCourts = snapshot?.courts.filter((court) => court.state === 'available') ?? [];
  return (
    <main className={cx("staff-page", staffStyles, sharedStyles)}>
      <SiteHeader subtle />
      <div className={cx("staff-shell", staffStyles, sharedStyles)}>
        <div className={cx("staff-topline", staffStyles, sharedStyles)}><div><Link to="/" className={cx("back-link", staffStyles, sharedStyles)}><ArrowLeft size={15} /> Home</Link><div className={cx("staff-page-heading", staffStyles, sharedStyles)}><div><div className={cx("eyebrow", staffStyles, sharedStyles)}><span className={cx("live-label", staffStyles, sharedStyles)}><i /> VENUE CONTROL</span></div><h1>Staff dashboard</h1><p>Keep every court moving and every turn easy to explain.</p></div><button className={cx("button button-outline signout-button", staffStyles, sharedStyles)} onClick={() => { localStorage.removeItem('courtflow:staff-token'); setToken(undefined); }}><LogOut size={16} /> Sign out</button></div></div></div>
        {error && <div className={cx("inline-error", staffStyles, sharedStyles)} role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        <div className={cx("staff-toolbar", staffStyles, sharedStyles)}><div className={cx("session-picker", staffStyles, sharedStyles)}><label htmlFor="session-select">ACTIVE SESSION</label><div className={cx("select-wrap", staffStyles, sharedStyles)}><select id="session-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name} · {session.publicCode}</option>)}</select><ChevronDown size={16} /></div></div><button className={cx("button button-primary", staffStyles, sharedStyles)} onClick={() => setShowCreate((value) => !value)}><Plus size={17} /> New session</button></div>
        {showCreate && <form className={cx("create-session-card", staffStyles, sharedStyles)} onSubmit={createSession}><div className={cx("create-session-heading", staffStyles, sharedStyles)}><div><div className={cx("eyebrow", staffStyles, sharedStyles)}>SET UP OPEN PLAY</div><h2>Start a session</h2></div><button type="button" className={cx("icon-button", staffStyles, sharedStyles)} aria-label="Close" onClick={() => setShowCreate(false)}><X size={18} /></button></div><div className={cx("create-fields", staffStyles, sharedStyles)}><label>Session name<input value={sessionName} onChange={(event) => setSessionName(event.target.value)} maxLength={60} required /></label><label>Sport<input value={sport} onChange={(event) => setSport(event.target.value)} maxLength={30} required /></label><label>Courts<input type="number" min={1} max={16} value={courtCount} onChange={(event) => setCourtCount(Number(event.target.value))} /></label><label>Players per game<select value={gameSize} onChange={(event) => setGameSize(Number(event.target.value) as 2 | 4)}><option value={2}>2 players</option><option value={4}>4 players</option></select></label></div><div className={cx("create-session-actions", staffStyles, sharedStyles)}><span>Creates a fresh, shareable queue code.</span><button className={cx("button button-primary", staffStyles, sharedStyles)} disabled={busy}>Create session <ArrowRight size={16} /></button></div></form>}
        {loading && !snapshot ? <LoadingCard label="Loading venue controls…" /> : snapshot ? <>
          <div className={cx("staff-metrics-grid", staffStyles, sharedStyles)}><MetricCard label="WAITING" value={snapshot.waitingCount} detail="players in line" icon={<UsersRound size={18} />} color="lime" /><MetricCard label="COURTS OPEN" value={availableCourts.length} detail={`of ${snapshot.courts.length} courts`} icon={<Flag size={18} />} color="blue" /><MetricCard label="GAME SIZE" value={snapshot.session.playersPerGame} detail="players per game" icon={<Crown size={18} />} color="peach" /><MetricCard label="SESSION STATUS" value={snapshot.session.state === 'open' ? 'LIVE' : 'CLOSED'} detail={snapshot.session.sport} icon={<Radio size={18} />} color="green" /></div>
          <div className={cx("staff-dashboard-grid", staffStyles, sharedStyles)}>
            <section className={cx("staff-main-column", staffStyles, sharedStyles)}>
              <div className={cx("staff-section-head", staffStyles, sharedStyles)}><div><div className={cx("eyebrow", staffStyles, sharedStyles)}>THE COURTS</div><h2>Court rotation</h2></div><span className={cx("staff-live-pill", staffStyles, sharedStyles)}><i /> UPDATING LIVE</span></div>
              <div className={cx('staff-courts-grid', staffStyles, sharedStyles)}>
                {snapshot.courts.map((court) => (
                  <StaffCourtCard
                    key={court.id}
                    court={court}
                    match={activeMatches.find((item) => item.courtId === court.id)}
                    waitingCount={queue.length}
                    playersPerGame={snapshot.session.playersPerGame}
                    busy={busy}
                    onRemove={() => void perform(() => api.removeCourt(token, court.id))}
                    onCallNext={() => void perform(() => api.callNext(token, snapshot.session.id, court.id))}
                    onFinish={startCompleting}
                  />
                ))}
                <button className={cx('add-court-card', staffStyles, sharedStyles)} onClick={() => {
                  const next = snapshot.courts.length + 1;
                  void (async () => {
                    setBusy(true);
                    try {
                      setSnapshot(await api.addCourt(token, snapshot.session.id, { label: 'Court ' + next }));
                      await loadSessions(token);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not add a court.');
                    } finally {
                      setBusy(false);
                    }
                  })();
                }} disabled={busy}><span><Plus size={18} /></span>Add a court</button>
              </div>
              <StaffQueuePanel
                queue={queue}
                version={snapshot.session.version}
                busy={busy}
                onAction={(type, ticket) => {
                  setReasonAction({ type, ticket });
                  setReason('');
                }}
              />
            </section>
            <aside className={cx("staff-side-column", staffStyles, sharedStyles)}>
              <SessionCheckInCard publicCode={snapshot.session.publicCode} qrData={qrData} copied={copied} onCopy={() => void copyJoinLink()} />
              <ActivityRecord items={snapshot.recentActivity} />
              <div className={cx("fairness-reminder", staffStyles, sharedStyles)}><div><ShieldCheck size={19} /></div><p><strong>Keep it fair.</strong><br />When you skip or move a player, include a clear reason. Everyone can see the record.</p></div>
            </aside>
          </div>
        </> : <ErrorPanel error="No session selected yet." onRetry={() => token && void loadSessions(token)} />}
        <footer className={cx("queue-footer staff-footer", staffStyles, sharedStyles)}><Brand /><span>Venue controls · Local preview</span><button onClick={() => void loadSnapshot()}><RefreshCw size={14} /> Refresh</button></footer>
      </div>
      <StaffActionModals
        reasonAction={reasonAction}
        reason={reason}
        busy={busy}
        onReasonChange={setReason}
        onReasonSubmit={submitReason}
        onReasonClose={() => setReasonAction(null)}
        activeMatch={activeMatch}
        returningPlayerIds={returning}
        onReturningChange={(playerId, checked) => setReturning((current) => checked
          ? [...current, playerId]
          : current.filter((id) => id !== playerId))}
        onMatchClose={() => setActiveMatch(null)}
        onMatchComplete={() => void finishMatch()}
      />
    </main>
  );
}
