import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ArchiveYear, Post } from '../types';

type Item = Pick<Post, 'id' | 'title' | 'slug' | 'summary' | 'publishedAt' | 'tags'>;

function normalize(raw: unknown): ArchiveYear[] {
  if (!Array.isArray(raw)) return [];
  // 新格式：{ year, months: [{ month, days: [{ day, items }] }] }
  const first = raw[0] as Record<string, unknown> | undefined;
  if (first && Array.isArray((first as { months?: unknown }).months)) {
    return raw as ArchiveYear[];
  }
  // 旧格式兼容：{ month: '2026-09', items: [...] }
  const map = new Map<string, Map<string, Map<string, Item[]>>>();
  for (const g of raw as { month?: string; items?: Item[] }[]) {
    const key = g.month || '未分类';
    const [y, m, d] = key.includes('-') ? key.split('-') : [key, '--', '--'];
    const year = y || '未分类';
    const month = m || '--';
    const day = d && d !== '--' ? d : '01';
    if (!map.has(year)) map.set(year, new Map());
    const months = map.get(year)!;
    if (!months.has(month)) months.set(month, new Map());
    const days = months.get(month)!;
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(...(g.items || []));
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, days]) => ({
          month,
          days: [...days.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([day, items]) => ({ day, items })),
        })),
    }));
}

export default function Archive() {
  const [years, setYears] = useState<ArchiveYear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .archive()
      .then((data) => setYears(normalize(data)))
      .catch(() => setYears([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">归档</h1>

      {loading && <div className="card p-8 text-center text-ink/60">加载中…</div>}

      {!loading && !years.length && (
        <div className="card p-8 text-center text-ink/60">还没有公开文章</div>
      )}

      {years.map((y) => (
        <section key={y.year}>
          <h2 className="mb-4 font-display text-2xl font-bold text-teal-deep dark:text-teal-soft">
            {y.year} 年
          </h2>
          <div className="space-y-6">
            {(y.months || []).map((m) => (
              <div key={`${y.year}-${m.month}`} className="border-l-2 border-teal-soft pl-4">
                <h3 className="mb-3 font-display text-lg font-bold text-teal">
                  {Number(m.month) || m.month} 月
                </h3>
                <div className="space-y-4">
                  {(m.days || []).map((d) => (
                    <div key={`${y.year}-${m.month}-${d.day}`}>
                      <div className="mb-2 text-sm font-medium text-ink/60 dark:text-white/50">
                        {Number(m.month) || m.month} 月 {Number(d.day) || d.day} 日
                      </div>
                      <div className="space-y-2">
                        {(d.items || []).map((p) => (
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
    </div>
  );
}
