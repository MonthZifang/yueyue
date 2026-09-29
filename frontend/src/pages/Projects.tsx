import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Project } from '../types';

function displayTitle(p: Project) {
  return p.customTitle || p.title;
}

function displaySummary(p: Project) {
  return p.customSummary || p.description;
}

export default function Projects() {
  const [all, setAll] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    api
      .searchProjects(q || undefined)
      .then(setAll)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">项目</h1>
        <div className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="搜索项目 / 技术栈"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button type="button" className="btn" onClick={load}>
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink/60">加载中…</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {all.map((p) => (
            <article
              key={p.id}
              className="card cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <img
                src={p.bgImage || p.cover || '/assets/hero.png'}
                alt=""
                className="h-36 w-full object-cover"
              />
              <div className="p-5">
                <h2 className="font-display text-xl font-bold">{displayTitle(p)}</h2>
                <p className="mt-2 text-sm text-ink/75 dark:text-white/70">{displaySummary(p)}</p>
                {p.techStack && <p className="mt-3 text-xs text-teal">{p.techStack}</p>}
                <p className="mt-3 text-xs text-ink/50">详情页 #{p.id} →</p>
              </div>
            </article>
          ))}
          {!all.length && (
            <div className="card p-8 text-center text-ink/60 sm:col-span-2">没有匹配的项目</div>
          )}
        </div>
      )}
    </div>
  );
}
