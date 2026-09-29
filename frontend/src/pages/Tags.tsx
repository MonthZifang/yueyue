import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Tag } from '../types';

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    api.tags().then(setTags);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">标签</h1>
      <div className="flex flex-wrap gap-3">
        {tags.map((t) => (
          <Link
            key={t.id}
            to={`/tags/${t.slug}`}
            className="card px-5 py-3 text-sm hover:-translate-y-0.5"
          >
            <span className="font-medium text-teal">#{t.name}</span>
            <span className="ml-2 text-ink/50">{t.count ?? 0}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
