import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Group } from '../types';
import { renderMarkdown } from '../md';

const KIND_LABEL: Record<string, string> = {
  steam: 'Steam',
  qq: 'QQ 群',
  git: 'Git 组织',
  discord: 'Discord',
  other: '社群',
};

export default function Groups() {
  const [items, setItems] = useState<Group[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api.groups().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">组 / 社群</h1>
        <p className="mt-1 text-sm text-ink/60">Steam 组、QQ 群、Git 组织等，欢迎加入</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {items.map((g) => {
          const open = openId === g.id;
          return (
            <article key={g.id} className="card overflow-hidden">
              {g.cover && <img src={g.cover} alt="" className="h-36 w-full object-cover" />}
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-soft/70 px-2.5 py-0.5 text-xs text-teal-deep dark:bg-white/10 dark:text-teal-soft">
                    {KIND_LABEL[g.kind] || g.kind}
                  </span>
                  <h2 className="font-display text-xl font-bold">{g.title}</h2>
                </div>
                {g.summary && <p className="mt-2 text-sm text-ink/75 dark:text-white/70">{g.summary}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {g.qrImage && (
                    <img
                      src={g.qrImage}
                      alt={`${g.title} 二维码`}
                      className="h-24 w-24 rounded-xl object-cover ring-1 ring-teal-soft"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {g.url && (
                      <a href={g.url} target="_blank" rel="noreferrer" className="btn">
                        加入 / 打开
                      </a>
                    )}
                    {g.content && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setOpenId(open ? null : g.id)}
                      >
                        {open ? '收起介绍' : '查看介绍'}
                      </button>
                    )}
                  </div>
                </div>

                {open && g.content && (
                  <div
                    className="prose-yue mt-4 border-t border-teal-soft/40 pt-4 dark:border-white/10"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(g.content) }}
                  />
                )}
              </div>
            </article>
          );
        })}
        {!items.length && (
          <div className="card p-8 text-center text-ink/60 sm:col-span-2">还没有公开的组</div>
        )}
      </div>
    </div>
  );
}
