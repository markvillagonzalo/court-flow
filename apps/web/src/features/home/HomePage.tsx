import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, Clock3, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { cx } from '../../shared/lib/classNames';
import sharedStyles from '../../shared/styles/components.module.css';
import homeStyles from './home.module.css';
import { Brand, SiteHeader } from '../../shared/components/Navigation';

export function HomePage() {
  const [code, setCode] = useState('demo');
  const navigate = useNavigate();
  return (
    <main className={cx("landing-page", homeStyles, sharedStyles)}>
      <SiteHeader />
      <section className={cx("hero-wrap", homeStyles, sharedStyles)}>
        <div className={cx("hero-copy", homeStyles, sharedStyles)}>
          <div className={cx("eyebrow", homeStyles, sharedStyles)}><span className={cx("eyebrow-line", homeStyles, sharedStyles)} /> OPEN PLAY, IN GOOD ORDER</div>
          <h1>Fair turns.<br /><span>Better games.</span></h1>
          <p className={cx("hero-lede", homeStyles, sharedStyles)}>One live queue for the whole court. See who’s next, take your turn, and keep the games moving.</p>
          <form
            className={cx("join-code-form", homeStyles, sharedStyles)}
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim()) navigate(`/join/${encodeURIComponent(code.trim().toLowerCase())}`);
            }}
          >
            <label htmlFor="queue-code">Have a queue code?</label>
            <div className={cx("join-code-row", homeStyles, sharedStyles)}>
              <div className={cx("code-input-wrap", homeStyles, sharedStyles)}><QrCode size={18} /><input id="queue-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter code" /></div>
              <button className={cx("button button-primary", homeStyles, sharedStyles)} type="submit">Join queue <ArrowRight size={17} /></button>
            </div>
          </form>
          <div className={cx("hero-note", homeStyles, sharedStyles)}><ShieldCheck size={16} /> No app install. No account. Just scan and play.</div>
        </div>
        <div className={cx("hero-visual", homeStyles, sharedStyles)} aria-label="Illustration of a live court queue">
          <div className={cx("hero-sticker", homeStyles, sharedStyles)}><Sparkles size={16} /> FAIR BY DESIGN</div>
          <div className={cx("court-card", homeStyles, sharedStyles)}>
            <div className={cx("court-card-top", homeStyles, sharedStyles)}><div><span className={cx("live-label", homeStyles, sharedStyles)}><i /> LIVE SESSION</span><h2>Open Play</h2><p>Pickleball · 3 courts</p></div><div className={cx("court-badge", homeStyles, sharedStyles)}>01<span>UP NEXT</span></div></div>
            <div className={cx("mini-court", homeStyles, sharedStyles)}><div className={cx("mini-court-net", homeStyles, sharedStyles)} /><div className={cx("mini-court-center", homeStyles, sharedStyles)} /><div className={cx("mini-player mini-player-a", homeStyles, sharedStyles)}>M</div><div className={cx("mini-player mini-player-b", homeStyles, sharedStyles)}>J</div><div className={cx("mini-ball", homeStyles, sharedStyles)} /></div>
            <div className={cx("court-card-bottom", homeStyles, sharedStyles)}><div className={cx("avatar-stack", homeStyles, sharedStyles)}><span>AL</span><span>JO</span><span>MI</span><span>+8</span></div><div><strong>11 players waiting</strong><small>Every place, accounted for</small></div><span className={cx("arrow-circle", homeStyles, sharedStyles)}><ArrowRight size={17} /></span></div>
          </div>
          <div className={cx("hero-orbit orbit-one", homeStyles, sharedStyles)} /><div className={cx("hero-orbit orbit-two", homeStyles, sharedStyles)} />
          <div className={cx("side-note", homeStyles, sharedStyles)}><span>01</span><div><b>Your place is clear.</b><small>And so is the reason.</small></div></div>
        </div>
      </section>
      <section className={cx("how-section", homeStyles, sharedStyles)}>
        <div className={cx("section-heading", homeStyles, sharedStyles)}><div><div className={cx("eyebrow", homeStyles, sharedStyles)}><span className={cx("eyebrow-line", homeStyles, sharedStyles)} /> LESS WAITING AROUND</div><h2>Good flow, from<br />scan to serve.</h2></div><p>Made for the busy hour when everyone’s ready to play and no one should have to wonder whose turn it is.</p></div>
        <div className={cx("how-grid", homeStyles, sharedStyles)}>
          <article className={cx("how-card", homeStyles, sharedStyles)}><span className={cx("how-index", homeStyles, sharedStyles)}>01</span><div className={cx("how-icon how-icon-lime", homeStyles, sharedStyles)}><QrCode size={21} /></div><h3>Scan to join</h3><p>A quick check-in with a name. No account, no app download, no clipboard.</p><span className={cx("how-decoration deco-qr", homeStyles, sharedStyles)}><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></article>
          <article className={cx("how-card", homeStyles, sharedStyles)}><span className={cx("how-index", homeStyles, sharedStyles)}>02</span><div className={cx("how-icon how-icon-peach", homeStyles, sharedStyles)}><Clock3 size={21} /></div><h3>See your place</h3><p>Watch the line change live and know exactly who’s playing on every court.</p><span className={cx("how-decoration deco-number", homeStyles, sharedStyles)}>04</span></article>
          <article className={cx("how-card", homeStyles, sharedStyles)}><span className={cx("how-index", homeStyles, sharedStyles)}>03</span><div className={cx("how-icon how-icon-blue", homeStyles, sharedStyles)}><BadgeCheck size={21} /></div><h3>Trust the turn</h3><p>Every move is visible. If staff steps in, the reason is part of the record.</p><span className={cx("how-decoration deco-check", homeStyles, sharedStyles)}><Check size={92} strokeWidth={1.2} /></span></article>
        </div>
      </section>
      <section className={cx("bottom-cta", homeStyles, sharedStyles)}><div className={cx("bottom-cta-mark", homeStyles, sharedStyles)}><span /></div><div><div className={cx("eyebrow", homeStyles, sharedStyles)}>YOUR COURT. YOUR FLOW.</div><h2>Make room for one more game.</h2></div><Link to="/staff" className={cx("button button-dark", homeStyles, sharedStyles)}>Open staff dashboard <ArrowRight size={17} /></Link></section>
      <footer className={cx("site-footer", homeStyles, sharedStyles)}><Brand /><span>Built for the next game.</span><span>© CourtFlow · Local preview</span></footer>
    </main>
  );
}
