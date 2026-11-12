import { ArrowDownToLine, ArrowUpToLine, DoorOpen, UsersRound } from 'lucide-react';
import type { StaffQueueEntry } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { formatTime, initials } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type QueueAction = 'skip' | 'front' | 'back';

type Props = {
  queue: StaffQueueEntry[];
  version: number;
  busy: boolean;
  onAction: (action: QueueAction, ticket: StaffQueueEntry) => void;
};

export function StaffQueuePanel({ queue, version, busy, onAction }: Props) {
  return (
    <Card className={cx('staff-queue-card', staffStyles, sharedStyles)}>
      <div className={cx('staff-section-head', staffStyles, sharedStyles)}>
        <div>
          <div className={cx('eyebrow', staffStyles, sharedStyles)}>FIFO · FIRST IN, FIRST UP</div>
          <h2>Waiting line <span className={cx('count-bubble', staffStyles, sharedStyles)}>{queue.length}</span></h2>
        </div>
        <span className={cx('queue-version', staffStyles, sharedStyles)}>v{version}</span>
      </div>
      {queue.length ? (
        <div className={cx('staff-queue-list', staffStyles, sharedStyles)}>
          {queue.map((entry, index) => (
            <div className={cx('staff-queue-row', staffStyles, sharedStyles)} key={entry.id}>
              <span className={cx(`staff-position ${index === 0 ? 'staff-position-next' : ''}`, staffStyles, sharedStyles)}>{String(index + 1).padStart(2, '0')}</span>
              <span className={cx(`player-avatar avatar-${(index % 5) + 1}`, staffStyles, sharedStyles)}>{initials(entry.displayName)}</span>
              <div className={cx('staff-player-name', staffStyles, sharedStyles)}>
                <strong>{entry.displayName}</strong><span>Joined {formatTime(entry.joinedAt)}</span>
              </div>
              <div className={cx('staff-row-actions', staffStyles, sharedStyles)}>
                <Button variant="quiet" size="sm" className={cx('queue-action', staffStyles, sharedStyles)} onClick={() => onAction('front', entry)} disabled={busy || index === 0} title="Move to front" aria-label={`Move ${entry.displayName} to the front of the queue`}><ArrowUpToLine size={16} aria-hidden="true" /><span>Move up</span></Button>
                <Button variant="quiet" size="sm" className={cx('queue-action', staffStyles, sharedStyles)} onClick={() => onAction('back', entry)} disabled={busy || index === queue.length - 1} title="Move to back" aria-label={`Move ${entry.displayName} to the back of the queue`}><ArrowDownToLine size={16} aria-hidden="true" /><span>Move back</span></Button>
                <Button variant="danger" size="sm" className={cx('queue-action staff-skip-action', staffStyles, sharedStyles)} onClick={() => onAction('skip', entry)} disabled={busy} title="Mark no-show or skip" aria-label={`Skip ${entry.displayName}`}><DoorOpen size={16} aria-hidden="true" /><span>Skip</span></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cx('staff-empty-queue', staffStyles, sharedStyles)}>
          <UsersRound size={21} /><strong>No one is waiting right now</strong><span>Players can scan the session QR to join.</span>
        </div>
      )}
    </Card>
  );
}
