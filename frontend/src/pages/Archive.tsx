import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ArchiveGroup } from '../types';

export default function Archive() {
  const [groups, setGroups] = useState<ArchiveGroup[]>([]);

  useEffect(() => {
    api.archive().then(setGroups);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">归档</h1>
      {groups.map((g) => (
        <section key={g.month}>
          <h2 className="mb-3 font-display text-xl font-bold text-teal">{g.month}</h2>
          <div className="space-y-3 border-l-2 border-teal-soft pl-4">
            {g.items.map((p) => (
              <div key={p.id} className="card p-4">
                <Link to={`/posts/${p.slug}`} className="font-medium hover:text-teal">
                  {p.title}
                </Link>
                <p className="mt-1 text-sm text-ink/65 dark:text-white/60">{p.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
