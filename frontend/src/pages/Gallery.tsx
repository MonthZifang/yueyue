import { useEffect, useState } from 'react';
import { api } from '../api';
import type { GalleryItem } from '../types';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  useEffect(() => {
    api.gallery().then(setItems);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">画廊</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <figure
            key={g.id}
            className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <button
              type="button"
              className="block w-full cursor-zoom-in"
              onClick={() => setPreview(g)}
              title="点击查看全图"
            >
              <img src={g.imageUrl} alt={g.title} className="h-52 w-full object-cover" />
            </button>
            <figcaption className="p-4">
              <div className="font-medium">{g.title}</div>
              {g.description && (
                <p className="mt-1 text-sm text-ink/65 dark:text-white/60">{g.description}</p>
              )}
              <button
                type="button"
                className="mt-2 text-sm text-teal underline-offset-2 hover:underline"
                onClick={() => setPreview(g)}
              >
                查看全图 →
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* 全图灯箱 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-full w-full max-w-5xl overflow-auto rounded-2xl bg-white p-3 shadow-2xl dark:bg-[#122220]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold">{preview.title}</div>
                {preview.description && (
                  <p className="text-sm text-ink/60 dark:text-white/60">{preview.description}</p>
                )}
              </div>
              <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
                关闭
              </button>
            </div>
            <img
              src={preview.imageUrl}
              alt={preview.title}
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
            />
            <div className="mt-3 text-center">
              <a
                href={preview.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-teal underline-offset-2 hover:underline"
              >
                在新窗口打开原图
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
