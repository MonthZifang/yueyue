import { useEffect, useState } from 'react';
import { api } from '../api';
import type { FriendLink } from '../types';

export default function Friends() {
  const [items, setItems] = useState<FriendLink[]>([]);

  useEffect(() => {
    api.friends().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">友链</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="card block p-5 hover:-translate-y-0.5">
            <div className="font-display text-lg font-bold text-teal">{f.name}</div>
            {f.description && <p className="mt-1 text-sm text-ink/70 dark:text-white/70">{f.description}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}
