import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
  closeOnOutsideClick?: boolean;
  /** Set to false for short forms that render a floating dropdown/popover
   * (e.g. a patient autocomplete) — `overflow-y-auto` on the body clips any
   * absolutely-positioned content that extends past its natural height. */
  scrollBody?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  className,
  closeOnOutsideClick = true,
  scrollBody = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return createPortal(
    <div
      // No backdrop-blur here: it forces the GPU to re-rasterize the entire
      // viewport on every paint underneath the modal (Topbar, charts, etc.),
      // which makes mouse and click feel laggy on lower-end machines. A solid
      // dark scrim gives equivalent visual separation for free.
      className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gradient-to-br from-surface-900/60 to-primary-950/70 dark:from-black/75 dark:to-primary-950/85 animate-fade-in", className)}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-h-[95vh] flex flex-col animate-slide-up ring-1 ring-surface-900/5 dark:ring-white/10",
          scrollBody ? 'overflow-hidden' : 'overflow-visible',
          sizeClasses[maxWidth]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 sticky top-0 z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className={cn('p-6 custom-scrollbar rounded-b-2xl', scrollBody ? 'overflow-y-auto' : 'overflow-visible')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};