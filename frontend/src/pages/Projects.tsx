import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Project } from '../types';
import { renderMarkdown } from '../md';

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
  const [openId, setOpenId] = useState<number | null>(null);

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
          {all.map((p) => {
            const href = p.url || p.homepage;
            const isOpen = openId === p.id;
            return (
              <article key={p.id} className="card flex flex-col p-6">
                {/* 点击卡片本身 = 展开/收起 MD 内容；不跳外链 */}
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                >
                  <h2 className="font-display text-xl font-bold">
                    {displayTitle(p)}
                  </h2>
                  <p className="mt-2 text-sm text-ink/75 dark:text-white/70">
                    {displaySummary(p)}
                  </p>
                  {p.techStack && <p className="mt-3 text-xs text-teal">{p.techStack}</p>}
                </button>

                {isOpen && p.customHtml && (
                  <div
                    className="prose-yue mt-4 border-t border-teal-soft/40 pt-4 dark:border-white/10"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(p.customHtml) }}
                  />
                )}

                {isOpen && !p.customHtml && (
                  <p className="mt-4 border-t border-teal-soft/40 pt-4 text-sm text-ink/50">
                    暂无自定义介绍
                  </p>
                )}

                {/* 卡片下方链接：点击才跳转项目 */}
                {href && (
                  <div className="mt-4 pt-2">
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-teal underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      打开项目 →
                    </a>
                  </div>
                )}
              </article>
            );
          })}
          {!all.length && (
            <div className="card p-8 text-center text-ink/60 sm:col-span-2">没有匹配的项目</div>
          )}
        </div>
      )}
    </div>
  );
}
