import { type ReactNode } from 'react';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';
import { Card } from '../../../shared/components/Ui';

export function MetricCard({ label, value, detail, icon, color }: { label: string; value: string | number; detail: string; icon: ReactNode; color: string }) {
  return <Card as="article" className={cx("metric-card", staffStyles, sharedStyles)}><span className={cx(`metric-icon metric-${color}`, staffStyles, sharedStyles)}>{icon}</span><div><span className={cx("metric-label", staffStyles, sharedStyles)}>{label}</span><strong>{value}</strong><small>{detail}</small></div></Card>;
}
