import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ArchiveYear } from '../types';

export default function Archive() {
  const [years, setYears] = useState<ArchiveYear[]>([]);

  useEffect(() => {
    api.archive().then(setYears);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">归档</h1>
      {years.map((y) => (
        <section key={y.year}>
          <h2 className="mb-4 font-display text-2xl font-bold text-teal-deep dark:text-teal-soft">
            {y.year} 年
          </h2>
          <div className="space-y-6">
            {y.months.map((m) => (
              <div key={`${y.year}-${m.month}`} className="border-l-2 border-teal-soft pl-4">
                <h3 className="mb-3 font-display text-lg font-bold text-teal">
                  {Number(m.month)} 月
                </h3>
                <div className="space-y-4">
                  {m.days.map((d) => (
                    <div key={`${y.year}-${m.month}-${d.day}`}>
                      <div className="mb-2 text-sm font-medium text-ink/60 dark:text-white/50">
                        {Number(m.month)} 月 {Number(d.day)} 日
                      </div>
                      <div className="space-y-2">
                        {d.items.map((p) => (
                          <div key={p.id} className="card p-4">
                            <Link to={`/posts/${p.slug}`} className="font-medium hover:text-teal">
                              {p.title}
                            </Link>
                            <p className="mt-1 text-sm text-ink/65 dark:text-white/60">
                              {p.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!years.length && (
        <div className="card p-8 text-center text-ink/60">还没有公开文章</div>
      )}
    </div>
  );
}
