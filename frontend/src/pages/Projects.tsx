import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Project } from '../types';

export default function Projects() {
  const [items, setItems] = useState<Project[]>([]);

  useEffect(() => {
    api.projects().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">项目</h1>
      <div className="grid gap-5 sm:grid-cols-2">
        {items.map((p) => (
          <article key={p.id} className="card p-6">
            <h2 className="font-display text-xl font-bold">{p.title}</h2>
            <p className="mt-2 text-sm text-ink/75 dark:text-white/70">{p.description}</p>
            {p.techStack && (
              <p className="mt-3 text-xs text-teal">{p.techStack}</p>
            )}
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="btn-ghost mt-4">
                查看项目
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
