'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { cn } from './cn';

/**
 * Image with graceful degradation.
 *
 * The wrapper always renders a soft gradient "photo placeholder"; the real
 * image fades in on load and is removed entirely if it fails, so a missing
 * or broken image never breaks the layout or shows a broken-image icon.
 *
 * `onLoad` alone is not enough: server-rendered images can finish loading
 * before hydration, in which case React never fires the event — so we also
 * check `complete` on mount.
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackClassName,
  eager = false,
  ...rest
}: {
  src?: string;
  alt: string;
  /** Wrapper classes (size, radius, aspect ratio). */
  className?: string;
  imgClassName?: string;
  /** Extra classes for the placeholder gradient. */
  fallbackClassName?: string;
  eager?: boolean;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className'>) {
  const ref = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const showImage = Boolean(src) && status !== 'failed';

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete) {
      setStatus(el.naturalWidth > 0 ? 'ready' : 'failed');
    }
  }, []);

  // Callers may position the wrapper themselves (e.g. absolute inset-0 heroes).
  const positioned = /\b(absolute|fixed|relative|sticky)\b/.test(className ?? '');

  return (
    <div className={cn(!positioned && 'relative', 'overflow-hidden', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
          fallbackClassName,
        )}
      />
      {showImage && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('failed')}
          className={cn(
            'relative h-full w-full object-cover transition-opacity duration-500',
            status === 'ready' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
          {...rest}
        />
      )}
      {status === 'failed' && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
            className="h-8 w-8 text-white/70" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
            <circle cx="9" cy="9.5" r="1.4" />
          </svg>
        </span>
      )}
    </div>
  );
}
