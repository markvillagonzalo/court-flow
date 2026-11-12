import type { FormEventHandler } from 'react';
import { ArrowRight, Check, LoaderCircle, LogOut } from 'lucide-react';
import type { PlayerTicketView } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import queueStyles from '../queue.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type MyTurnCardProps = {
  ticket: PlayerTicketView | null;
  name: string;
  joining: boolean;
  onNameChange: (name: string) => void;
  onJoin: FormEventHandler<HTMLFormElement>;
  onLeave: () => void;
};

export function MyTurnCard({ ticket, name, joining, onNameChange, onJoin, onLeave }: MyTurnCardProps) {
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
        </> : <>
          <h2><span className={cx('position-text', queueStyles, sharedStyles)}>Ready to play?</span></h2>
          <p>Join the line and we’ll show your exact place.</p>
        </>}
      </div>
      <div className={cx('turn-action', queueStyles, sharedStyles)}>
        {ticket && ticket.status !== 'left' && ticket.status !== 'skipped' ? (
          <Button variant="quiet" className={cx('leave-button', queueStyles, sharedStyles)} onClick={onLeave} disabled={joining || ticket.leaveAfterMatch}>
            <LogOut size={16} />{ticket.status === 'playing' ? ticket.leaveAfterMatch ? 'Leaving after game' : 'Leave after game' : 'Leave queue'}
          </Button>
        ) : (
          <form className={cx('inline-join-form', queueStyles, sharedStyles)} onSubmit={onJoin}>
            <label htmlFor="player-name">Your name</label>
            <div className={cx('inline-join-control', queueStyles, sharedStyles)}>
              <input id="player-name" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={28} placeholder="e.g. Alex" required />
              <Button disabled={joining || !name.trim()}>
                {joining ? <LoaderCircle className={cx('spin', queueStyles, sharedStyles)} size={17} /> : <>Join line <ArrowRight size={16} /></>}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
