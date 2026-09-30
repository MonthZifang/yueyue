import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Group, SiteSetting } from '../types';
import { renderMarkdown } from '../md';

type Kind = { value: string; label: string };

const DEFAULT_KINDS: Kind[] = [
  { value: 'steam', label: 'Steam' },
  { value: 'qq', label: 'QQ 群' },
  { value: 'git', label: 'Git 组织' },
  { value: 'discord', label: 'Discord' },
  { value: 'other', label: '社群' },
];

function parseKinds(json?: string): Kind[] {
  try {
    const arr = JSON.parse(json || '[]');
    if (Array.isArray(arr) && arr.length) {
      return arr.map((x) => ({ value: String(x.value), label: String(x.label) }));
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_KINDS;
}

export default function Groups() {
  const [items, setItems] = useState<Group[]>([]);
  const [site, setSite] = useState<SiteSetting | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const kinds = useMemo(() => parseKinds(site?.groupKindsJson), [site?.groupKindsJson]);

  useEffect(() => {
    api.groups().then(setItems);
    api.site().then(setSite).catch(() => undefined);
  }, []);

  const kindLabel = (k: string) => kinds.find((x) => x.value === k)?.label || k;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{site?.groupsTitle || '组 / 社群'}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {site?.groupsSubtitle || 'Steam 组、QQ 群、Git 组织等，欢迎加入'}
        </p>
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
                    {kindLabel(g.kind)}
                  </span>
                  <h2 className="font-display text-xl font-bold">{g.title}</h2>
                </div>
                {g.summary && <p className="mt-2 text-sm text-ink/75 dark:text-white/70">{g.summary}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {g.qrImage && (
                    <img
                      src={g.qrImage}
                      alt={`${g.title}`}
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