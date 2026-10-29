'use client';
import { useEffect, useState } from 'react';

/** Docs table of contents: follows the section in view. */
export function DocToc({ sections }: { sections: readonly (readonly [id: string, label: string])[] }) {
  const [active, setActive] = useState<string>(sections[0][0]);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = sections.find(([id]) => seen.get(id));
        if (first) setActive(first[0]);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    sections.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav className="doc-toc" aria-label="On this page">
      <span className="label">On this page</span>
      <ol>
        {sections.map(([id, label], i) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={active === id ? 'location' : undefined}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
