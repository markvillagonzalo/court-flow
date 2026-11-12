import { LoaderCircle, RefreshCw, ShieldCheck, Star, UsersRound } from 'lucide-react';
import type { PublicQueueEntry } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import { formatSince, initials } from '../../../shared/lib/formatters';
import queueStyles from '../queue.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type WaitingQueueCardProps = {
  entries: PublicQueueEntry[];
  waitingCount: number;
  refreshing: boolean;
  onRefresh: () => void;
};

export function WaitingQueueCard({ entries, waitingCount, refreshing, onRefresh }: WaitingQueueCardProps) {
  return (
    <>
      <div className={cx('queue-section-head', queueStyles, sharedStyles)}>
        <div className={cx('queue-section-title', queueStyles, sharedStyles)}><div className={cx('eyebrow', queueStyles, sharedStyles)}>THE LINE</div><h2>Waiting players <span className={cx('count-bubble', queueStyles, sharedStyles)} aria-label={`${waitingCount} players waiting`} aria-live="polite">{waitingCount}</span></h2></div>
        <Button variant="quiet" size="sm" className={cx('refresh-button', queueStyles, sharedStyles)} onClick={onRefresh} disabled={refreshing} aria-label={refreshing ? 'Refreshing queue' : 'Refresh queue'} title="Refresh queue">
          {refreshing ? <LoaderCircle size={18} className={cx('spin', queueStyles, sharedStyles)} /> : <RefreshCw size={17} />}
        </Button>
      </div>
      <Card className={cx('queue-list-card', queueStyles, sharedStyles)}>
        {entries.length ? entries.map((entry) => (
          <div className={cx(`public-queue-row ${entry.position === 1 ? 'public-next-row' : ''}`, queueStyles, sharedStyles)} key={`${entry.position}-${entry.displayName}`}>
            <div className={cx('queue-position', queueStyles, sharedStyles)}>{entry.position === 1 ? <Star className={cx('next-star-icon', queueStyles, sharedStyles)} size={17} fill="currentColor" aria-hidden="true" /> : String(entry.position).padStart(2, '0')}</div>
            <div className={cx(`player-avatar avatar-${((entry.position - 1) % 5) + 1}`, queueStyles, sharedStyles)}>{initials(entry.displayName)}</div>
            <div className={cx('public-player-name', queueStyles, sharedStyles)}><strong>{entry.displayName}</strong><span>{entry.position === 1 ? 'Next up' : `Waiting · ${formatSince(entry.joinedAt)}`}</span></div>
            {entry.position === 1 && <span className={cx('next-chip', queueStyles, sharedStyles)}>UP NEXT</span>}
          </div>
        )) : (
          <div className={cx('empty-queue', queueStyles, sharedStyles)}>
            <div className={cx('empty-queue-icon', queueStyles, sharedStyles)}><UsersRound size={21} /></div>
            <strong>The line is clear</strong><span>Be the first to get a game going.</span>
          </div>
        )}
        <div className={cx('fifo-note', queueStyles, sharedStyles)}><ShieldCheck size={15} /><span><b>First in, first up.</b> Queue positions follow check-in time. Staff changes are always explained.</span></div>
      </Card>
    </>
  );
}
