'use client';
import { useEffect, useRef, useState } from 'react';

/** Rises its content in once it scrolls into view (instantly under prefers-reduced-motion, see .reveal). */
export function Reveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} id={id} className={`reveal ${seen ? 'in' : ''} ${className}`}>
      {children}
    </section>
  );
}
