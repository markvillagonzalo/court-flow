import { ShieldCheck } from 'lucide-react';
import type { ActivityItem } from '@court-flow/contracts';
import { cx } from '../../../shared/lib/classNames';
import { activityTitle, formatTime } from '../../../shared/lib/formatters';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';

export function ActivityRecord({ items }: { items: ActivityItem[] }) {
  return (
    <div className={cx('staff-audit-card', staffStyles, sharedStyles)}>
      <div className={cx('audit-card-heading', staffStyles, sharedStyles)}>
        <div><div className={cx('eyebrow', staffStyles, sharedStyles)}>WHY THE LINE MOVED</div><h3>Activity record</h3></div>
        <span><ShieldCheck size={15} /></span>
      </div>
      {items.length ? items.slice(0, 6).map((item, index) => (
        <div className={cx('audit-item', staffStyles, sharedStyles)} key={`${item.eventType}-${item.createdAt}-${index}`}>
          <span className={cx('audit-rail', staffStyles, sharedStyles)}><i /></span>
          <div><strong>{activityTitle(item.eventType, item.target)}</strong>{item.reason && <p>“{item.reason}”</p>}<time>{formatTime(item.createdAt)}</time></div>
        </div>
      )) : <p className={cx('activity-empty', staffStyles, sharedStyles)}>Queue changes will appear as they happen.</p>}
    </div>
  );
}
