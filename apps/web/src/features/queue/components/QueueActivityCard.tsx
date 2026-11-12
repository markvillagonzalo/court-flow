import { ShieldCheck } from 'lucide-react';
import type { ActivityItem } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import { activityTitle, formatTime } from '../../../shared/lib/formatters';
import queueStyles from '../queue.module.css';
import { Card } from '../../../shared/components/Ui';

export function QueueActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className={cx('activity-card', queueStyles, sharedStyles)}>
      <div className={cx('activity-heading', queueStyles, sharedStyles)}>
        <div><div className={cx('eyebrow', queueStyles, sharedStyles)}>THE RECORD</div><h3>Queue activity</h3></div>
        <span className={cx('activity-lock', queueStyles, sharedStyles)}><ShieldCheck size={14} /> Transparent by design</span>
      </div>
      {items.length ? (
        <div className={cx('activity-list', queueStyles, sharedStyles)}>
          {items.slice(0, 4).map((item, index) => (
            <div className={cx('activity-row', queueStyles, sharedStyles)} key={`${item.eventType}-${item.createdAt}-${index}`}>
              <span className={cx('activity-dot', queueStyles, sharedStyles)} />
              <div><strong>{activityTitle(item.eventType, item.target)}</strong>{item.reason && <span className={cx('activity-reason', queueStyles, sharedStyles)}>Reason: {item.reason}</span>}</div>
              <time>{formatTime(item.createdAt)}</time>
            </div>
          ))}
        </div>
      ) : <p className={cx('activity-empty', queueStyles, sharedStyles)}>Player check-ins and court calls will appear here.</p>}
    </Card>
  );
}
