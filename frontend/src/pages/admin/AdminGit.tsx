import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api';
import type { GitSource, Project } from '../../types';

export default function AdminGit() {
  const [sources, setSources] = useState<GitSource[]>([]);
  const [kind, setKind] = useState('user');
  const [name, setName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);

  function load() {
    api.listGitSources().then(setSources);
    api.searchProjects(q || undefined).then(setProjects);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSource(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.addGitSource(kind, name);
      setName('');
      setMsg('监控源已添加');
      load();
    } catch {
      setMsg('添加失败，请检查 login');
    }
  }

  async function syncOne(id: number) {
    setMsg('同步中…');
    try {
      await api.syncGitSource(id);
      setMsg('同步完成');
      load();
    } catch {
      setMsg('同步失败（可配置 GITHUB_TOKEN 后重试）');
    }
  }

  async function saveNav(p: Project) {
    await api.patchProjectNav(p.id, {
      showInNav: p.showInNav,
      navOrder: p.navOrder ?? 0,
      customHtml: custom,
      title: p.title,
      description: p.description,
    });
    setMsg('已保存导航/自定义内容');
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Git 监控与项目索引</h1>
      {msg && <div className="card px-4 py-2 text-sm text-teal">{msg}</div>}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">监控源（用户 / 组织）</h2>
        <form onSubmit={addSource} className="flex flex-wrap gap-2">
          <select className="input !w-32" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="user">用户</option>
            <option value="org">组织</option>
          </select>
          <input
            className="input !w-64"
            placeholder="GitHub login，如 yueyuedao"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn">
            添加监控
          </button>
          <button type="button" className="btn-ghost" onClick={() => api.syncAllGit().then(load)}>
            全部同步
          </button>
        </form>
        <div className="divide-y divide-teal-soft/40 dark:divide-white/10">
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium">
                  {s.kind}/{s.name}{' '}
                  <span className="text-xs text-ink/50">{s._count?.projects ?? 0} 仓库</span>
                </div>
                <div className="text-xs text-ink/50">
                  上次同步：{s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString('zh-CN') : '从未'}
                  {s.lastError ? ` · ${s.lastError}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => syncOne(s.id)}>
                  同步
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => api.removeGitSource(s.id).then(load)}
                >
                  移除
                </button>
              </div>
            </div>
          ))}
          {!sources.length && <p className="py-3 text-sm text-ink/50">还没有监控源</p>}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">项目列表 · 导航与自定义内容</h2>
          <input
            className="input !w-56"
            placeholder="过滤项目"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-teal-soft/50 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-ink/50">
                    {p.source} {p.fullName ? `· ${p.fullName}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(p.showInNav)}
                      onChange={(e) =>
                        setProjects((list) =>
                          list.map((x) =>
                            x.id === p.id ? { ...x, showInNav: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    出现在导航
                  </label>
                  <input
                    type="number"
                    className="input !w-20"
                    value={p.navOrder ?? 0}
                    onChange={(e) =>
                      setProjects((list) =>
                        list.map((x) =>
                          x.id === p.id ? { ...x, navOrder: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setSelected(p);
                      setCustom(p.customHtml ?? '');
                    }}
                  >
                    编辑自定义内容
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => saveNav(p)}
                  >
                    保存
                  </button>
                </div>
              </div>
              {selected?.id === p.id && (
                <textarea
                  className="input mt-3 min-h-[120px] font-mono text-sm"
                  placeholder="Markdown 自定义内容（显示在项目详情/导航项下方）"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
