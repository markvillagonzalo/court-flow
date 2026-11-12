import { Check, Copy, QrCode, ShieldCheck } from 'lucide-react';
import { cx } from '../../../shared/lib/classNames';
import sharedStyles from '../../../shared/styles/components.module.css';
import staffStyles from '../staff.module.css';
import { Button, Card } from '../../../shared/components/Ui';

type Props = {
  publicCode: string;
  qrData: string;
  copied: boolean;
  onCopy: () => void;
};

export function SessionCheckInCard({ publicCode, qrData, copied, onCopy }: Props) {
  return (
    <Card className={cx('share-card', staffStyles, sharedStyles)}>
      <div className={cx('share-card-heading', staffStyles, sharedStyles)}>
        <div><div className={cx('eyebrow', staffStyles, sharedStyles)}>LET PLAYERS IN</div><h2>Queue check-in</h2></div>
        <span className={cx('share-icon', staffStyles, sharedStyles)}><QrCode size={19} /></span>
      </div>
      <p>Scan to see the live queue and join with a name.</p>
      <div className={cx('qr-frame', staffStyles, sharedStyles)}>
        {qrData ? <img src={qrData} alt={`Join queue ${publicCode}`} /> : <span><QrCode size={40} /></span>}
        <span className={cx('qr-corner qr-corner-tl', staffStyles, sharedStyles)} />
        <span className={cx('qr-corner qr-corner-tr', staffStyles, sharedStyles)} />
        <span className={cx('qr-corner qr-corner-bl', staffStyles, sharedStyles)} />
        <span className={cx('qr-corner qr-corner-br', staffStyles, sharedStyles)} />
      </div>
      <div className={cx('session-code-display', staffStyles, sharedStyles)}><span>SESSION CODE</span><b>{publicCode}</b></div>
      <Button variant="quiet" className={cx('button-full', staffStyles, sharedStyles)} onClick={onCopy}>
        {copied ? <><Check size={16} /> Link copied</> : <><Copy size={16} /> Copy join link</>}
      </Button>
      <div className={cx('share-footnote', staffStyles, sharedStyles)}><ShieldCheck size={14} /> Guest names only. No account needed.</div>
    </Card>
  );
}
