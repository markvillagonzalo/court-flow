import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CircleUserRound } from 'lucide-react';
import { cx } from '../lib/classNames';
import sharedStyles from '../styles/components.module.css';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={cx(`brand ${light ? 'brand-light' : ''}`, sharedStyles)} aria-label="CourtFlow home">
      <span className={cx("brand-mark", sharedStyles)}><span /></span>
      <span className={cx("brand-name", sharedStyles)}>court<span>flow</span></span>
    </Link>
  );
}

export function SiteHeader({ subtle = false }: { subtle?: boolean }) {
  return (
    <header className={cx(`site-header ${subtle ? 'site-header-subtle' : ''}`, sharedStyles)}>
      <Brand />
      <nav className={cx("site-nav", sharedStyles)} aria-label="Main navigation">
        <Link to="/join/demo">Live queue <span className={cx("nav-live-dot", sharedStyles)} /></Link>
        <Link to="/staff" className={cx("nav-staff", sharedStyles)}><CircleUserRound size={16} /> Venue staff</Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ rightContent = '© CourtFlow' }: { rightContent?: ReactNode }) {
  return (
    <footer className={cx('site-footer', sharedStyles)}>
      <Brand />
      <span className={cx('footer-tagline', sharedStyles)}>Good flow, better play.</span>
      <span className={cx('footer-meta', sharedStyles)}>{rightContent}</span>
    </footer>
  );
}
