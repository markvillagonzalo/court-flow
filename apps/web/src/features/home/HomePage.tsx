import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, Clock3, QrCode, ShieldCheck } from 'lucide-react';
import { cx } from '../../shared/lib/classNames';
import sharedStyles from '../../shared/styles/components.module.css';
import homeStyles from './home.module.css';
import { SiteFooter, SiteHeader } from '../../shared/components/Navigation';
import { Button, Card, PageContainer } from '../../shared/components/Ui';

export function HomePage() {
  const [code, setCode] = useState('demo');
  const [codeError, setCodeError] = useState('');
  const navigate = useNavigate();

  return (
    <main className={cx('landing-page', homeStyles, sharedStyles)}>
      <SiteHeader />
      <PageContainer as="section" width="wide" className={cx('hero-wrap', homeStyles, sharedStyles)}>
        <div className={cx('hero-copy', homeStyles, sharedStyles)}>
          <div className={cx('eyebrow', homeStyles, sharedStyles)}><span className={cx('eyebrow-line', homeStyles, sharedStyles)} /> OPEN PLAY, IN GOOD ORDER</div>
          <h1>Fair turns.<br /><span>Better games.</span></h1>
          <p className={cx('hero-lede', homeStyles, sharedStyles)}>One live queue for the whole court. See who’s next, take your turn, and keep the games moving.</p>
          <form
            className={cx('join-code-form', homeStyles, sharedStyles)}
            onSubmit={(event) => {
              event.preventDefault();
              const cleanCode = code.trim();
              if (!cleanCode) {
                setCodeError('Enter a queue code to continue.');
                return;
              }
              setCodeError('');
              navigate(`/join/${encodeURIComponent(cleanCode.toLowerCase())}`);
            }}
          >
            <label htmlFor="queue-code">Have a queue code?</label>
            <div className={cx('join-code-row', homeStyles, sharedStyles)}>
              <div className={cx(`code-input-wrap ${codeError ? 'has-error' : ''}`, homeStyles, sharedStyles)}><QrCode size={18} aria-hidden="true" /><input id="queue-code" value={code} onChange={(event) => { setCode(event.target.value); if (event.target.value.trim()) setCodeError(''); }} placeholder="Enter code" aria-required="true" aria-invalid={Boolean(codeError)} aria-describedby={codeError ? 'queue-code-error' : undefined} /></div>
              <Button className={cx('join-submit', homeStyles, sharedStyles)} type="submit">Join queue <ArrowRight size={17} /></Button>
            </div>
            {codeError && <p id="queue-code-error" className={cx('join-code-error', homeStyles, sharedStyles)} role="alert">{codeError}</p>}
          </form>
          <div className={cx('hero-note', homeStyles, sharedStyles)}><ShieldCheck size={16} aria-hidden="true" /> No app install. No account. Just scan and play.</div>
        </div>
        <div className={cx('hero-visual', homeStyles, sharedStyles)} role="group" aria-label="Illustration of a live court queue">
          <Card tone="raised" className={cx('court-card', homeStyles, sharedStyles)}>
            <div className={cx('court-card-top', homeStyles, sharedStyles)}>
              <div><span className={cx('live-label', homeStyles, sharedStyles)}><i /> LIVE SESSION</span><h2>Open Play</h2><p>Pickleball · 3 courts</p></div>
              <div className={cx('court-badge', homeStyles, sharedStyles)}>01<span>UP NEXT</span></div>
            </div>
            <div className={cx('mini-court', homeStyles, sharedStyles)} aria-hidden="true">
              <div className={cx('mini-court-net', homeStyles, sharedStyles)} />
              <div className={cx('mini-court-center', homeStyles, sharedStyles)} />
              <div className={cx('mini-player mini-player-a', homeStyles, sharedStyles)}>M</div>
              <div className={cx('mini-player mini-player-b', homeStyles, sharedStyles)}>J</div>
              <div className={cx('mini-ball', homeStyles, sharedStyles)} />
            </div>
            <div className={cx('court-card-bottom', homeStyles, sharedStyles)}>
              <div className={cx('avatar-stack', homeStyles, sharedStyles)}><span>AL</span><span>JO</span><span>MI</span><span>+8</span></div>
              <div><strong>11 players waiting</strong><small>Every place, accounted for</small></div>
              <span className={cx('arrow-circle', homeStyles, sharedStyles)}><ArrowRight size={17} aria-hidden="true" /></span>
            </div>
          </Card>
          <div className={cx('side-note', homeStyles, sharedStyles)}><span>01</span><div><b>Your place is clear.</b><small>And so is the reason.</small></div></div>
        </div>
      </PageContainer>

      <section className={cx('how-section', homeStyles, sharedStyles)}>
        <PageContainer width="wide">
          <div className={cx('section-heading', homeStyles, sharedStyles)}>
            <div><div className={cx('eyebrow', homeStyles, sharedStyles)}><span className={cx('eyebrow-line', homeStyles, sharedStyles)} /> LESS WAITING AROUND</div><h2>Good flow, from<br />scan to serve.</h2></div>
            <p>Made for the busy hour when everyone’s ready to play and no one should have to wonder whose turn it is.</p>
          </div>
          <div className={cx('how-grid', homeStyles, sharedStyles)}>
            <Card as="article" className={cx('how-card', homeStyles, sharedStyles)}><span className={cx('how-index', homeStyles, sharedStyles)}>01</span><div className={cx('how-icon how-icon-lime', homeStyles, sharedStyles)}><QrCode size={21} /></div><h3>Scan to join</h3><p>A quick check-in with a name. No account, no app download, no clipboard.</p><span className={cx('how-decoration deco-qr', homeStyles, sharedStyles)}><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></Card>
            <Card as="article" className={cx('how-card', homeStyles, sharedStyles)}><span className={cx('how-index', homeStyles, sharedStyles)}>02</span><div className={cx('how-icon how-icon-peach', homeStyles, sharedStyles)}><Clock3 size={21} /></div><h3>See your place</h3><p>Watch the line change live and know exactly who’s playing on every court.</p><span className={cx('how-decoration deco-number', homeStyles, sharedStyles)}>04</span></Card>
            <Card as="article" className={cx('how-card', homeStyles, sharedStyles)}><span className={cx('how-index', homeStyles, sharedStyles)}>03</span><div className={cx('how-icon how-icon-blue', homeStyles, sharedStyles)}><BadgeCheck size={21} /></div><h3>Trust the turn</h3><p>Every move is visible. If staff steps in, the reason is part of the record.</p><span className={cx('how-decoration deco-check', homeStyles, sharedStyles)}><Check size={92} strokeWidth={1.2} /></span></Card>
          </div>
        </PageContainer>
      </section>

      <Card as="section" tone="inverse" className={cx('bottom-cta', homeStyles, sharedStyles)}>
        <div className={cx('bottom-cta-mark', homeStyles, sharedStyles)}><span /></div>
        <div><div className={cx('eyebrow', homeStyles, sharedStyles)}>YOUR COURT. YOUR FLOW.</div><h2>Make room for one more game.</h2></div>
        <Link to="/staff" className={cx('ui-button ui-button-secondary button', homeStyles, sharedStyles)}>Open staff dashboard <ArrowRight size={17} /></Link>
      </Card>
      <SiteFooter />
    </main>
  );
}
