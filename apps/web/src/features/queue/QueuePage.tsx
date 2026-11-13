import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { PublicSnapshot } from '@court-flow/contracts';
import { getPlayerToken } from '../../shared/api/client';
import { SiteFooter, SiteHeader } from '../../shared/components/Navigation';
import { ErrorPanel, LoadingCard } from '../../shared/components/Feedback';
import { useToast } from '../../shared/components/ToastProvider';
import { useSessionRealtime } from '../../shared/hooks/useSessionRealtime';
import { cx } from '../../shared/lib/classNames';
import sharedStyles from '../../shared/styles/components.module.css';
import queueStyles from './queue.module.css';
import { queueApi as api } from './api';
import { RealtimeStatus } from '../../shared/components/RealtimeStatus';
import { MyTurnCard } from './components/MyTurnCard';
import { QueueActivityCard } from './components/QueueActivityCard';
import { QueueSidebar } from './components/QueueSidebar';
import { SessionResultsCard } from './components/SessionResultsCard';
import { WaitingQueueCard } from './components/WaitingQueueCard';
import { PageContainer, StatusPill } from '../../shared/components/Ui';

export function QueuePage() {
  const { code = 'demo' } = useParams();
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const token = getPlayerToken(code);

  const refresh = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const next = await api.publicSnapshot(code, getPlayerToken(code));
      setSnapshot(next);
      setError('');
    } catch (err) {
      if (err instanceof Error && err.message === 'Queue session not found') setSnapshot(null);
      setError(err instanceof Error ? err.message : 'Could not load this queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void refresh(); }, [code]);
  const connected = useSessionRealtime(code, () => { void refresh(true); });

  async function joinQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setJoining(true);
    setError('');
    try {
      await api.join(code, name);
      toast.success('You joined the queue.');
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the queue.');
    } finally {
      setJoining(false);
    }
  }

  async function leaveQueue() {
    if (!token) return;
    setJoining(true);
    try {
      const result = await api.withdraw(token);
      if (result.status === 'left') {
        sessionStorage.removeItem(`courtflow:player:${code}`);
        toast.success('You left the queue.');
      } else {
        toast.success('You will leave after this game.');
      }
      await refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your ticket.');
    } finally {
      setJoining(false);
    }
  }

  const myTicket = snapshot?.myTicket ?? null;
  return (
    <main className={cx('queue-page', queueStyles, sharedStyles)}>
      <SiteHeader subtle />
      <PageContainer width="standard" className={cx('queue-page-shell', queueStyles, sharedStyles)}>
        <Link to="/" className={cx('back-link', queueStyles, sharedStyles)}><ArrowLeft size={16} /> Back to CourtFlow</Link>
        {loading ? <LoadingCard label="Opening the live queue…" /> : error && !snapshot ? <ErrorPanel error={error} onRetry={() => void refresh()} /> : snapshot ? (
          <>
            <div className={cx('queue-title-row', queueStyles, sharedStyles)}>
              <div>
                <div className={cx('eyebrow', queueStyles, sharedStyles)}>
                  <StatusPill
                    tone={snapshot.session.state === 'open' ? 'live' : 'warning'}
                    className={cx('connection-pill', queueStyles, sharedStyles)}
                  >
                    {snapshot.session.state === 'open' ? 'LIVE QUEUE' : 'SESSION CLOSED'}
                  </StatusPill>
                  <span className={cx('eyebrow-spacer', queueStyles, sharedStyles)}>·</span>{snapshot.session.sport.toUpperCase()}
                </div>
                <h1>{snapshot.session.name}</h1>
                <p>Every turn is visible. Every player gets a fair place.</p>
              </div>
              <RealtimeStatus connected={connected} className={cx('queue-realtime-status', queueStyles)} />
            </div>
            <div className={cx('queue-layout', queueStyles, sharedStyles)}>
              <section className={cx('queue-main-column', queueStyles, sharedStyles)}>
                <MyTurnCard
                  ticket={myTicket}
                  sessionOpen={snapshot.session.state === 'open'}
                  name={name}
                  joining={joining}
                  onNameChange={setName}
                  onJoin={joinQueue}
                  onLeave={() => void leaveQueue()}
                />
                {error && <div className={cx('inline-error', queueStyles, sharedStyles)} role="alert">{error}</div>}
                <WaitingQueueCard
                  entries={snapshot.queue}
                  waitingCount={snapshot.waitingCount}
                  refreshing={refreshing}
                  onRefresh={() => void refresh(true)}
                />
                <SessionResultsCard standings={snapshot.standings} recentResults={snapshot.recentResults} />
                <QueueActivityCard items={snapshot.recentActivity} />
              </section>
              <QueueSidebar snapshot={snapshot} />
            </div>
          </>
        ) : <ErrorPanel error={error || 'Queue not found.'} onRetry={() => void refresh()} />}
      </PageContainer>
      <SiteFooter rightContent={snapshot ? `Session ${snapshot.session.publicCode}` : undefined} />
    </main>
  );
}
