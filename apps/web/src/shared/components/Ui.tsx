import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { cx } from '../lib/classNames';
import sharedStyles from '../styles/components.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(`ui-button ui-button-${variant} ui-button-${size} button ${className}`, sharedStyles)}
      {...props}
    />
  );
}

export type CardTone = 'default' | 'raised' | 'inverse';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article';
  tone?: CardTone;
};

export function Card({ as: Component = 'div', tone = 'default', className = '', ...props }: CardProps) {
  return (
    <Component
      className={cx(`ui-card ui-card-${tone} ${className}`, sharedStyles)}
      {...props}
    />
  );
}

export type ContainerWidth = 'narrow' | 'standard' | 'wide';

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  width?: ContainerWidth;
  as?: 'div' | 'main' | 'section';
};

export function PageContainer({ as: Component = 'div', width = 'standard', className = '', ...props }: PageContainerProps) {
  return (
    <Component
      className={cx(`page-container page-container-${width} ${className}`, sharedStyles)}
      {...props}
    />
  );
}

export type StatusTone = 'live' | 'info' | 'warning';

export function StatusPill({ tone = 'info', children, className = '' }: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx(`status-pill status-pill-${tone} ${className}`, sharedStyles)}>
      {tone === 'live' && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Dialog({
  title,
  size = 'md',
  onClose,
  className = '',
  children,
}: {
  title: string;
  size?: 'sm' | 'md';
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    ));

    const initialFocus = dialog.querySelector<HTMLElement>(
      `input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled):not(.${sharedStyles['modal-close']})`,
    );
    const frame = window.requestAnimationFrame(() => (initialFocus ?? dialog).focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className={cx('ui-dialog-backdrop', sharedStyles)}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        className={cx(`ui-dialog ui-dialog-${size} ${className}`, sharedStyles)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
