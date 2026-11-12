import type { FormEvent } from 'react';
import { ArrowRight, Check, Flag, X } from 'lucide-react';
import type { StaffMatchView, StaffQueueEntry } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { initials } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';

export type QueueReasonAction = {
  type: 'skip' | 'front' | 'back';
  ticket: StaffQueueEntry;
};

type Props = {
  reasonAction: QueueReasonAction | null;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onReasonSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReasonClose: () => void;
  activeMatch: StaffMatchView | null;
  returningPlayerIds: string[];
  onReturningChange: (playerId: string, checked: boolean) => void;
  onMatchClose: () => void;
  onMatchComplete: () => void;
};

export function StaffActionModals({
  reasonAction,
  reason,
  busy,
  onReasonChange,
  onReasonSubmit,
  onReasonClose,
  activeMatch,
  returningPlayerIds,
  onReturningChange,
  onMatchClose,
  onMatchComplete,
}: Props) {
  return (
    <>
      {reasonAction && (
        <div className={cx('modal-backdrop', staffStyles, sharedStyles)} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) onReasonClose();
        }}>
          <form className={cx('reason-modal', staffStyles, sharedStyles)} onSubmit={onReasonSubmit}>
            <div className={cx('modal-icon', staffStyles, sharedStyles)}><Flag size={19} /></div>
            <button type="button" className={cx('modal-close', staffStyles, sharedStyles)} aria-label="Close" onClick={onReasonClose}><X size={18} /></button>
            <div className={cx('eyebrow', staffStyles, sharedStyles)}>TRANSPARENT QUEUE</div>
            <h2>{reasonAction.type === 'skip' ? 'Skip this player?' : reasonAction.type === 'front' ? 'Move to the front?' : 'Move to the back?'}</h2>
            <p>{reasonAction.ticket.displayName} will see this change in the queue activity record.</p>
            <label htmlFor="change-reason">Reason for this change</label>
            <textarea
              id="change-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              minLength={3}
              maxLength={240}
              placeholder={reasonAction.type === 'skip' ? 'e.g. Not present when called' : 'e.g. Venue accommodation'}
              required
            />
            <span className={cx('reason-count', staffStyles, sharedStyles)}>{reason.length}/240</span>
            <button className={cx('button button-primary button-full', staffStyles, sharedStyles)} disabled={busy || reason.trim().length < 3}>
              Confirm change <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}
      {activeMatch && (
        <div className={cx('modal-backdrop', staffStyles, sharedStyles)} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) onMatchClose();
        }}>
          <div className={cx('reason-modal finish-modal', staffStyles, sharedStyles)}>
            <div className={cx('modal-icon modal-icon-green', staffStyles, sharedStyles)}><Check size={19} /></div>
            <button type="button" className={cx('modal-close', staffStyles, sharedStyles)} aria-label="Close" onClick={onMatchClose}><X size={18} /></button>
            <div className={cx('eyebrow', staffStyles, sharedStyles)}>GAME COMPLETE · {activeMatch.courtLabel}</div>
            <h2>Who wants another turn?</h2>
            <p>Players who stay return to the back of the line.</p>
            <div className={cx('return-player-list', staffStyles, sharedStyles)}>
              {activeMatch.players.map((player) => (
                <label key={player.id} className={cx('return-player', staffStyles, sharedStyles)}>
                  <input
                    type="checkbox"
                    checked={returningPlayerIds.includes(player.id)}
                    onChange={(event) => onReturningChange(player.id, event.target.checked)}
                  />
                  <span className={cx('player-avatar avatar-2', staffStyles, sharedStyles)}>{initials(player.displayName)}</span>
                  <span><b>{player.displayName}</b><small>{player.leaveAfterMatch ? 'Asked to leave after this game' : 'Rejoin at the back'}</small></span>
                  <span className={cx('check-box', staffStyles, sharedStyles)}><Check size={13} /></span>
                </label>
              ))}
            </div>
            <button className={cx('button button-primary button-full', staffStyles, sharedStyles)} onClick={onMatchComplete} disabled={busy}>
              Close game &amp; open court <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
