import { ArrowRight, Check, Clock3, X } from 'lucide-react';
import type { Court, StaffMatchView } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { formatTime } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type Props = {
  court: Court;
  match?: StaffMatchView;
  waitingCount: number;
  playersPerGame: number;
  busy: boolean;
  onRemove: () => void;
  onCallNext: () => void;
  onFinish: (match: StaffMatchView) => void;
};

export function StaffCourtCard({
  court,
  match,
  waitingCount,
  playersPerGame,
  busy,
  onRemove,
  onCallNext,
  onFinish,
}: Props) {
  const canStart = waitingCount >= playersPerGame;

  return (
    <Card as="article" className={cx(`staff-court-card ${court.state === 'playing' ? 'court-playing' : ''}`, staffStyles, sharedStyles)}>
      <div className={cx('staff-court-top', staffStyles, sharedStyles)}>
        <div className={cx('court-title', staffStyles, sharedStyles)}>
          <span className={cx(`court-status-mark ${court.state === 'playing' ? 'is-playing' : ''}`, staffStyles, sharedStyles)} />
          <div>
            <h3>{court.label}</h3>
            <span className={cx(`court-state-label ${court.state === 'playing' ? 'court-state-playing' : 'court-state-available'}`, staffStyles, sharedStyles)}>
              {court.state === 'playing' ? 'Now playing' : 'Court available'}
            </span>
          </div>
        </div>
        {court.state === 'available' && (
          <Button type="button" variant="quiet" size="sm" className={cx('icon-button court-remove-button', staffStyles, sharedStyles)} title="Remove court" aria-label={`Remove ${court.label}`} onClick={onRemove}>
            <X size={16} />
          </Button>
        )}
      </div>
      {match ? (
        <>
          <div className={cx('staff-match-players', staffStyles, sharedStyles)}>
            {([1, 2] as const).map((side) => (
              <span key={side}><i /><b>Side {side}:</b> {match.players.filter((player) => player.side === side).map((player) => player.displayName).join(' & ')}</span>
            ))}
          </div>
          <div className={cx('court-match-footer', staffStyles, sharedStyles)}>
            <span><Clock3 size={14} /> Started {formatTime(match.startedAt)}</span>
            <Button variant="secondary" size="sm" className={cx('button-small', staffStyles, sharedStyles)} onClick={() => onFinish(match)} disabled={busy}>
              Finish game <Check size={15} />
            </Button>
          </div>
        </>
      ) : (
        <div className={cx('court-available-body', staffStyles, sharedStyles)}>
          <div className={cx('court-outline', staffStyles, sharedStyles)}><span /><i /><b /></div>
          <div className={cx('court-readiness-copy', staffStyles, sharedStyles)}>
            <strong>{canStart ? `${playersPerGame} players are ready` : 'Waiting for players'}</strong>
            {canStart ? (
              <span className={cx('court-readiness-detail', staffStyles, sharedStyles)}>The next group follows FIFO order.</span>
            ) : (
              <div className={cx('court-readiness-need', staffStyles, sharedStyles)}>
                <b>{playersPerGame - waitingCount} more needed</b>
                <span>to fill this game</span>
              </div>
            )}
          </div>
          <Button size="sm" className={cx('button-small court-call-next-button', staffStyles, sharedStyles)} onClick={onCallNext} disabled={!canStart || busy}>
            Call next <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </Card>
  );
}
