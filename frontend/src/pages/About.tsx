import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { About } from '../types';
import { renderMarkdown } from '../md';

export default function AboutPage() {
  const [about, setAbout] = useState<About | null>(null);
  const html = useMemo(() => (about ? renderMarkdown(about.content) : ''), [about]);

  useEffect(() => {
    api.about().then(setAbout);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{about?.title ?? '关于'}</h1>
      <div className="card p-6">
        <div className="prose-yue" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <div className="card flex items-center gap-4 p-5">
        <img src="/assets/mascot.png" alt="" className="h-20 w-20 object-contain" />
        <p className="text-sm text-ink/75 dark:text-white/70">
          品牌形象：月月岛科技 / YUEYUEDAO TECH，清透明亮的二次元美学。
        </p>
      </div>
    </div>
  );
}
