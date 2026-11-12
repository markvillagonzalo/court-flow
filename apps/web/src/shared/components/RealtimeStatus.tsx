import { cx } from '../lib/classNames';
import sharedStyles from '../styles/components.module.css';

export function RealtimeStatus({ connected, className = '' }: { connected: boolean; className?: string }) {
  return (
    <span
      className={cx(`realtime-status ${connected ? 'is-connected' : 'is-reconnecting'} ${className}`, sharedStyles)}
      role="status"
      aria-live="polite"
    >
      <i aria-hidden="true" />
      {connected ? 'Live updates on' : 'Reconnecting'}
    </span>
  );
}
