import { ArrowRight, Check, Clock3, X } from 'lucide-react';
import type { Court, StaffMatchView } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { formatTime } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';

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
    <article className={cx(`staff-court-card ${court.state === 'playing' ? 'court-playing' : ''}`, staffStyles, sharedStyles)}>
      <div className={cx('staff-court-top', staffStyles, sharedStyles)}>
        <div className={cx('court-title', staffStyles, sharedStyles)}>
          <span className={cx(`court-status-mark ${court.state === 'playing' ? 'is-playing' : ''}`, staffStyles, sharedStyles)} />
          <div>
            <h3>{court.label}</h3>
            <span>{court.state === 'playing' ? 'GAME IN PROGRESS' : 'READY FOR A GAME'}</span>
          </div>
        </div>
        {court.state === 'available' && (
          <button className={cx('icon-button court-remove-button', staffStyles, sharedStyles)} title="Remove court" aria-label={`Remove ${court.label}`} onClick={onRemove}>
            <X size={16} />
          </button>
        )}
      </div>
      {match ? (
        <>
          <div className={cx('staff-match-players', staffStyles, sharedStyles)}>
            {match.players.map((player) => <span key={player.id}><i />{player.displayName}</span>)}
          </div>
          <div className={cx('court-match-footer', staffStyles, sharedStyles)}>
            <span><Clock3 size={14} /> Started {formatTime(match.startedAt)}</span>
            <button className={cx('button button-dark button-small', staffStyles, sharedStyles)} onClick={() => onFinish(match)} disabled={busy}>
              Finish game <Check size={15} />
            </button>
          </div>
        </>
      ) : (
        <div className={cx('court-available-body', staffStyles, sharedStyles)}>
          <div className={cx('court-outline', staffStyles, sharedStyles)}><span /><i /><b /></div>
          <div>
            <strong>{canStart ? `${playersPerGame} players are ready` : 'Waiting for players'}</strong>
            <span>{canStart ? 'The next group follows FIFO order.' : `Need ${playersPerGame - waitingCount} more to fill a game.`}</span>
          </div>
          <button className={cx('button button-primary button-small', staffStyles, sharedStyles)} onClick={onCallNext} disabled={!canStart || busy}>
            Call next <ArrowRight size={15} />
          </button>
        </div>
      )}
    </article>
  );
}
