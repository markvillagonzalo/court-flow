import type { FormEvent } from 'react';
import { ArrowRight, Check, Flag, X } from 'lucide-react';
import type { MatchSide, StaffMatchView, StaffQueueEntry } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { initials } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';
import { Button, Dialog } from '../../../shared/components/Ui';

export type QueueReasonAction = {
  type: 'skip' | 'front' | 'back';
  ticket: StaffQueueEntry;
};

type Props = {
  reasonAction: QueueReasonAction | null;
  reason: string;
  reasonError: string;
  matchError: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onReasonSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReasonClose: () => void;
  activeMatch: StaffMatchView | null;
  returningPlayerIds: string[];
  winningSide: MatchSide | null;
  onReturningChange: (playerId: string, checked: boolean) => void;
  onWinningSideChange: (side: MatchSide) => void;
  onMatchClose: () => void;
  onMatchComplete: () => void;
};

export function StaffActionModals({
  reasonAction,
  reason,
  reasonError,
  matchError,
  busy,
  onReasonChange,
  onReasonSubmit,
  onReasonClose,
  activeMatch,
  returningPlayerIds,
  winningSide,
  onReturningChange,
  onWinningSideChange,
  onMatchClose,
  onMatchComplete,
}: Props) {
  return (
    <>
      {reasonAction && (
        <Dialog
          title={reasonAction.type === 'skip' ? 'Skip this player?' : reasonAction.type === 'front' ? 'Move to the front?' : 'Move to the back?'}
          size="sm"
          onClose={onReasonClose}
          className={cx('reason-modal reason-modal-responsive', staffStyles, sharedStyles)}
        >
          <form className={cx('reason-form', staffStyles, sharedStyles)} onSubmit={onReasonSubmit}>
            <div className={cx('reason-modal-heading', staffStyles, sharedStyles)}>
              <div className={cx('modal-icon', staffStyles, sharedStyles)}><Flag size={19} /></div>
              <div className={cx('reason-modal-heading-copy', staffStyles, sharedStyles)}>
                <div className={cx('eyebrow', staffStyles, sharedStyles)}>QUEUE CHANGE</div>
                <h2>{reasonAction.type === 'skip' ? 'Skip this player?' : reasonAction.type === 'front' ? 'Move to the front?' : 'Move to the back?'}</h2>
                <p><strong>{reasonAction.ticket.displayName}</strong> will see this change in the queue activity record.</p>
              </div>
              <Button type="button" variant="quiet" size="sm" className={cx('modal-close', staffStyles, sharedStyles)} aria-label="Close" onClick={onReasonClose} disabled={busy}><X size={18} /></Button>
            </div>
            <label className={cx('reason-field-label', staffStyles, sharedStyles)} htmlFor="change-reason">Reason for this change</label>
            <textarea
              id="change-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              minLength={3}
              maxLength={240}
              placeholder={reasonAction.type === 'skip' ? 'e.g. Not present when called' : 'e.g. Venue accommodation'}
              required
            />
            {reasonError && <div className={cx('inline-error', staffStyles, sharedStyles)} role="alert">{reasonError}</div>}
            <div className={cx('reason-form-footer', staffStyles, sharedStyles)}>
              <span className={cx('reason-count', staffStyles, sharedStyles)}>{reason.length}/240</span>
              <Button className={cx('button-full', staffStyles, sharedStyles)} disabled={busy || reason.trim().length < 3}>
                Confirm change <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {activeMatch && (
        <Dialog
          title="Record the result"
          size="sm"
          onClose={onMatchClose}
          className={cx('reason-modal reason-modal-responsive finish-modal', staffStyles, sharedStyles)}
        >
          <div className={cx('reason-modal-heading finish-modal-heading', staffStyles, sharedStyles)}>
            <div className={cx('modal-icon modal-icon-green', staffStyles, sharedStyles)}><Check size={19} /></div>
            <div className={cx('reason-modal-heading-copy', staffStyles, sharedStyles)}>
              <div className={cx('eyebrow', staffStyles, sharedStyles)}>GAME COMPLETE · {activeMatch.courtLabel}</div>
              <h2>Record the result</h2>
              <p>Choose the winning side. Players who stay return to the back of the line.</p>
            </div>
            <Button type="button" variant="quiet" size="sm" className={cx('modal-close', staffStyles, sharedStyles)} aria-label="Close" onClick={onMatchClose} disabled={busy}><X size={18} /></Button>
          </div>
          <div className={cx('winner-side-options', staffStyles, sharedStyles)} role="radiogroup" aria-label="Winning side">
            {([1, 2] as const).map((side) => (
              <label
                key={side}
                className={cx(`winner-side-option ${winningSide === side ? 'is-selected' : ''}`, staffStyles, sharedStyles)}
              >
                <input
                  type="radio"
                  name="winning-side"
                  value={side}
                  checked={winningSide === side}
                  onChange={() => onWinningSideChange(side)}
                />
                <span className={cx('winner-side-heading', staffStyles, sharedStyles)}>
                  <b>Side {side}</b><small>{winningSide === side ? 'WINNER' : 'Choose winner'}</small>
                </span>
                <span className={cx('winner-side-names', staffStyles, sharedStyles)}>
                  {activeMatch.players.filter((player) => player.side === side).map((player) => player.displayName).join(' & ') || 'No players'}
                </span>
              </label>
            ))}
          </div>
          <div className={cx('return-player-section-label', staffStyles, sharedStyles)}>WHO WANTS ANOTHER TURN?</div>
          <div className={cx('return-player-list', staffStyles, sharedStyles)}>
            {activeMatch.players.map((player) => (
              <label key={player.id} className={cx('return-player', staffStyles, sharedStyles)}>
                <input
                  type="checkbox"
                  checked={returningPlayerIds.includes(player.id)}
                  onChange={(event) => onReturningChange(player.id, event.target.checked)}
                />
                <span className={cx('player-avatar avatar-2', staffStyles, sharedStyles)}>{initials(player.displayName)}</span>
                <span><b>{player.displayName}</b><small>Side {player.side} · {player.leaveAfterMatch ? 'Asked to leave after this game' : 'Rejoin at the back'}</small></span>
                <span className={cx('check-box', staffStyles, sharedStyles)}><Check size={13} /></span>
              </label>
            ))}
          </div>
          {matchError && <div className={cx('inline-error', staffStyles, sharedStyles)} role="alert">{matchError}</div>}
          <Button className={cx('button-full', staffStyles, sharedStyles)} onClick={onMatchComplete} disabled={busy || winningSide === null}>
            Close game &amp; open court <ArrowRight size={16} />
          </Button>
        </Dialog>
      )}
    </>
  );
}
