import { useEffect, useState } from 'react';
import { api } from '../api';
import type { GalleryItem } from '../types';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    api.gallery().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">画廊</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <figure key={g.id} className="card overflow-hidden">
            <img src={g.imageUrl} alt={g.title} className="h-52 w-full object-cover" />
            <figcaption className="p-4">
              <div className="font-medium">{g.title}</div>
              {g.description && <p className="mt-1 text-sm text-ink/65 dark:text-white/60">{g.description}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
