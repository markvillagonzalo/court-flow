import type { PublicMatchView } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import { formatTime, initials } from '../../../shared/lib/formatters';
import queueStyles from '../queue.module.css';

export function PublicMatchCard({ match }: { match: PublicMatchView }) {
  return (
    <div className={cx('active-court-card', queueStyles, sharedStyles)}>
      <div className={cx('active-court-top', queueStyles, sharedStyles)}>
        <span><span className={cx('court-dot', queueStyles, sharedStyles)} /><span className={cx('match-court-label', queueStyles, sharedStyles)}>{match.courtLabel}</span></span>
        <time>{formatTime(match.startedAt)}</time>
      </div>
      <div className={cx('match-name-grid', queueStyles, sharedStyles)}>
        {match.players.map((player) => (
          <span className={cx('match-player', queueStyles, sharedStyles)} key={player}>
            <span className={cx('match-avatar', queueStyles, sharedStyles)}>{initials(player)}</span>
            <span className={cx('match-player-name', queueStyles, sharedStyles)}>{player}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
