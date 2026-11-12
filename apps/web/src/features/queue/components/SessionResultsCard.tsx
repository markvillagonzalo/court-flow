import type { CompletedMatchView, PlayerStanding } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { formatTime } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import { Card } from '../../../shared/components/Ui';
import queueStyles from '../queue.module.css';

type Props = {
  standings: PlayerStanding[];
  recentResults: CompletedMatchView[];
};

export function SessionResultsCard({ standings, recentResults }: Props) {
  return (
    <Card className={cx('session-results-card', queueStyles, sharedStyles)}>
      <div className={cx('session-results-heading', queueStyles, sharedStyles)}>
        <div><div className={cx('eyebrow', queueStyles, sharedStyles)}>SESSION RECORD</div><h2>Standings &amp; results</h2></div>
      </div>
      <section className={cx('standings-section', queueStyles, sharedStyles)} aria-label="Session standings">
        <div className={cx('results-section-heading', queueStyles, sharedStyles)}><h3>Standings</h3><span>Wins · losses</span></div>
        {standings.length ? (
          <div className={cx('standings-list', queueStyles, sharedStyles)}>
            {standings.map((player, index) => (
              <div className={cx('standing-row', queueStyles, sharedStyles)} key={`${player.displayName}-${index}`}>
                <span className={cx('standing-rank', queueStyles, sharedStyles)}>{index + 1}</span>
                <strong className={cx('standing-name', queueStyles, sharedStyles)}>{player.displayName}</strong>
                <span className={cx('standing-played', queueStyles, sharedStyles)}>{player.played} played</span>
                <span className={cx('standing-record', queueStyles, sharedStyles)}><b>{player.wins}W</b><i>–</i><b>{player.losses}L</b></span>
              </div>
            ))}
          </div>
        ) : (
          <p className={cx('results-empty', queueStyles, sharedStyles)}>Completed games will appear here.</p>
        )}
      </section>
      <section className={cx('recent-results-section', queueStyles, sharedStyles)} aria-label="Recent game results">
        <div className={cx('results-section-heading', queueStyles, sharedStyles)}><h3>Recent results</h3><span>Last 10 games</span></div>
        {recentResults.length ? (
          <div className={cx('recent-results-list', queueStyles, sharedStyles)}>
            {recentResults.map((match) => (
              <article className={cx('result-row', queueStyles, sharedStyles)} key={match.id}>
                <div className={cx('result-row-heading', queueStyles, sharedStyles)}>
                  <strong>{match.courtLabel}</strong><time>{formatTime(match.finishedAt)}</time>
                </div>
                <div className={cx('result-sides', queueStyles, sharedStyles)}>
                  {match.sides.map((side) => (
                    <div className={cx(`result-side ${match.winningSide === side.side ? 'is-winner' : ''}`, queueStyles, sharedStyles)} key={side.side}>
                      <b>{match.winningSide === side.side ? 'WINNER' : 'SIDE ' + side.side}</b>
                      <span>{side.players.join(' & ')}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={cx('results-empty', queueStyles, sharedStyles)}>No results recorded yet.</p>
        )}
      </section>
    </Card>
  );
}
