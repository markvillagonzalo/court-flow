import { Link } from 'react-router-dom';
import { CircleHelp, LoaderCircle, RefreshCw } from 'lucide-react';
import { cx } from '../lib/classNames';
import sharedStyles from '../styles/components.module.css';
import { Button, Card } from './Ui';

export function LoadingCard({ label }: { label: string }) {
  return <div className={cx("loading-card", sharedStyles)}><LoaderCircle className={cx("spin", sharedStyles)} size={19} /><span>{label}</span></div>;
}

export function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <Card as="section" tone="raised" className={cx("error-panel", sharedStyles)}><div className={cx("error-icon", sharedStyles)}><CircleHelp size={22} /></div><h2>We couldn’t open that queue.</h2><p>{error}</p><Button onClick={onRetry}><RefreshCw size={16} /> Try again</Button><Link to="/" className={cx("error-back", sharedStyles)}>Back to home</Link></Card>;
}
