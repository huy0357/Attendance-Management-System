import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  onBackdropClick?: () => void;
}

/**
 * ModalPortal — Renders children directly into document.body via createPortal.
 *
 * WHY: Elements with position:fixed are constrained by ancestor stacking contexts
 * created by transform/filter/perspective. By portaling to <body>, the Modal
 * escapes all layout containers and covers the FULL viewport including Header & Sidebar.
 */
const ModalPortal: React.FC<ModalPortalProps> = ({ children, onBackdropClick }) => {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement('div');
    elRef.current.setAttribute('data-modal-portal', 'true');
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    // Prevent body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.removeChild(el);
      document.body.style.overflow = prev;
    };
  }, []);

  const backdrop = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 'var(--nm-z-modal)' as any,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        padding: '24px',
        animation: 'nm-backdrop-in 180ms ease',
      }}
      onClick={onBackdropClick}
    >
      {children}
    </div>
  );

  return ReactDOM.createPortal(backdrop, elRef.current);
};

export default ModalPortal;
