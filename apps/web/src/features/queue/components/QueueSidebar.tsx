import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, QrCode } from 'lucide-react';
import type { PublicSnapshot } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import queueStyles from '../queue.module.css';
import { PublicMatchCard } from './PublicMatchCard';

export function QueueSidebar({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <aside className={cx('queue-side-column', queueStyles, sharedStyles)}>
      <div className={cx('now-playing-card', queueStyles, sharedStyles)}>
        <div className={cx('side-card-heading', queueStyles, sharedStyles)}>
          <div><div className={cx('eyebrow', queueStyles, sharedStyles)}>ON COURT</div><h2>Games in play</h2></div>
          <span className={cx('live-label', queueStyles, sharedStyles)}><i /> LIVE</span>
        </div>
        {snapshot.activeMatches.length ? (
          <div className={cx('active-court-list', queueStyles, sharedStyles)}>{snapshot.activeMatches.map((match) => <PublicMatchCard key={match.id} match={match} />)}</div>
        ) : (
          <div className={cx('courts-empty', queueStyles, sharedStyles)}>
            <div className={cx('court-mini-mark', queueStyles, sharedStyles)}><span /></div>
            <strong>No games on court yet</strong><span>Players will appear once staff calls the next group.</span>
          </div>
        )}
        <div className={cx('court-count-line', queueStyles, sharedStyles)}>
          <span>{snapshot.courts.length} courts in this session</span>
          <span>{snapshot.courts.filter((court) => court.state === 'available').length} open</span>
        </div>
      </div>
      <div className={cx('explain-card', queueStyles, sharedStyles)}>
        <div className={cx('explain-icon', queueStyles, sharedStyles)}><CircleHelp size={18} /></div>
        <div><strong>Why this order?</strong><p>Players join individually, and the longest-waiting players are called first. If a staff member changes the line, you’ll see why in the activity record.</p></div>
      </div>
      <div className={cx('session-code-card', queueStyles, sharedStyles)}>
        <div className={cx('code-mark', queueStyles, sharedStyles)}><QrCode size={17} /></div>
        <div><span>SESSION CODE</span><strong>{snapshot.session.publicCode}</strong></div>
        <Link to="/staff" aria-label="Open staff tools"><ArrowRight size={17} /></Link>
      </div>
    </aside>
  );
}
