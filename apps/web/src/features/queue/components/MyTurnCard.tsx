import type { FormEventHandler } from 'react';
import { ArrowRight, Check, LoaderCircle, LogOut, LockKeyhole, UserRound } from 'lucide-react';
import type { PlayerTicketView } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import queueStyles from '../queue.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type MyTurnCardProps = {
  ticket: PlayerTicketView | null;
  sessionOpen: boolean;
  name: string;
  joining: boolean;
  onNameChange: (name: string) => void;
  onJoin: FormEventHandler<HTMLFormElement>;
  onLeave: () => void;
};

export function MyTurnCard({ ticket, sessionOpen, name, joining, onNameChange, onJoin, onLeave }: MyTurnCardProps) {
  return (
    <Card tone="inverse" className={cx(`my-turn-card ${ticket?.status === 'playing' ? 'my-turn-playing' : ''}`, queueStyles, sharedStyles)}>
      <div className={cx('my-turn-copy', queueStyles, sharedStyles)}>
        <span className={cx('card-overline', queueStyles, sharedStyles)}>YOUR TURN STATUS</span>
        {ticket?.status === 'waiting' ? <>
          <h2><span className={cx('position-number', queueStyles, sharedStyles)}>{String(ticket.position ?? '—').padStart(2, '0')}</span><span className={cx('position-text', queueStyles, sharedStyles)}>in line</span></h2>
          <p><b>{ticket.displayName}</b>, you’re in the queue. We’ll keep your place up to date.</p>
        </> : ticket?.status === 'playing' ? <>
          <h2><span className={cx('playing-icon', queueStyles, sharedStyles)}><Check size={22} /></span><span className={cx('position-text', queueStyles, sharedStyles)}>You’re on court</span></h2>
          <p>You’re in a game now. Leave after it ends if you don’t want another turn.</p>
        </> : ticket?.status === 'skipped' ? <>
          <h2><span className={cx('position-text', queueStyles, sharedStyles)}>Missed your call?</span></h2>
          <p>Your previous spot was skipped. {sessionOpen ? 'Rejoin the line when you’re ready for another game.' : 'This session is closed, so the line can’t be rejoined.'}</p>
        </> : ticket?.status === 'left' ? <>
          <h2><span className={cx('position-text', queueStyles, sharedStyles)}>You left the line</span></h2>
          <p>{sessionOpen ? 'You can join again any time while this session is open.' : 'This session is closed, so new players can’t join.'}</p>
        </> : <>
          <h2><span className={cx('position-text', queueStyles, sharedStyles)}>{sessionOpen ? 'Ready to play?' : 'Session closed'}</span></h2>
          <p>{sessionOpen ? 'Join the line and we’ll show your exact place.' : 'This queue is closed. Check with venue staff about the next session.'}</p>
        </>}
      </div>
      <div className={cx('turn-action', queueStyles, sharedStyles)}>
        {ticket && ticket.status !== 'left' && ticket.status !== 'skipped' ? (
          <Button variant="quiet" className={cx('leave-button', queueStyles, sharedStyles)} onClick={onLeave} disabled={joining || ticket.leaveAfterMatch}>
            <LogOut size={16} />{ticket.status === 'playing' ? ticket.leaveAfterMatch ? 'Leaving after game' : 'Leave after game' : 'Leave queue'}
          </Button>
        ) : sessionOpen ? (
          <form className={cx('inline-join-form', queueStyles, sharedStyles)} onSubmit={onJoin}>
            <label htmlFor="player-name">Your name</label>
            <div className={cx('inline-join-control', queueStyles, sharedStyles)}>
              <div className={cx('join-name-field', queueStyles, sharedStyles)}>
                <UserRound size={18} aria-hidden="true" />
                <input id="player-name" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={28} placeholder="Enter your name" required />
              </div>
              <Button disabled={joining || !name.trim()}>
                {joining ? <LoaderCircle className={cx('spin', queueStyles, sharedStyles)} size={17} /> : <>Join line <ArrowRight size={16} /></>}
              </Button>
            </div>
            <small className={cx('join-name-hint', queueStyles, sharedStyles)}>Your name is shown on the public queue.</small>
          </form>
        ) : (
          <div className={cx('queue-closed-action', queueStyles, sharedStyles)}>
            <span aria-hidden="true"><LockKeyhole size={15} /></span>
            <div><strong>Joining is closed</strong><small>Ask staff about the next session.</small></div>
          </div>
        )}
      </div>
    </Card>
  );
}
