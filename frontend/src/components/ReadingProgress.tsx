import { useEffect, useState } from 'react';

export default function ReadingProgress() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setValue(max > 0 ? (el.scrollTop / max) * 100 : 0);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-transparent">
      <div
        className="h-full bg-teal transition-[width] duration-150"
        style={{ width: `${value}%` }}
        aria-hidden
      />
    </div>
  );
}
