import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api';
import type { GitSource, Project } from '../../types';

export default function AdminGit() {
  const [sources, setSources] = useState<GitSource[]>([]);
  const [kind, setKind] = useState('user');
  const [name, setName] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [hiddenNew, setHiddenNew] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [filter, setFilter] = useState<'all' | 'hidden' | 'visible' | 'github' | 'manual'>('all');

  function load() {
    api.listGitSources().then(setSources);
    api.adminListProjects(q || undefined).then(setProjects);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSource(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.addGitSource(kind, name, { autoSync, hiddenNew });
      setName('');
      setMsg('监控源已添加');
      load();
    } catch {
      setMsg('添加失败，请检查 login');
    }
  }

  async function toggleSource(s: GitSource, key: 'enabled' | 'autoSync' | 'hiddenNew') {
    await api.patchGitSource(s.id, { [key]: !s[key] });
    load();
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

  async function toggleProject(p: Project, key: 'hidden' | 'indexed' | 'showInNav') {
    await api.patchProjectNav(p.id, { [key]: !p[key] });
    load();
  }

  async function saveNav(p: Project) {
    await api.patchProjectNav(p.id, {
      showInNav: p.showInNav,
      hidden: p.hidden,
      indexed: p.indexed,
      navOrder: p.navOrder ?? 0,
      customHtml: custom,
      customTitle: customTitle || null,
      customSummary: customSummary || null,
      bgImage: bgImage || null,
      title: p.title,
      description: p.description,
    });
    setMsg('已保存');
    setSelected(null);
    load();
  }

  async function removeProject(id: number) {
    if (!confirm('确认删除该项目？')) return;
    await api.deleteProject(id);
    setMsg('已删除');
    load();
  }

  const filtered = projects.filter((p) => {
    if (filter === 'hidden') return p.hidden;
    if (filter === 'visible') return !p.hidden;
    if (filter === 'github') return p.source === 'github';
    if (filter === 'manual') return p.source === 'manual';
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Git 监控与项目索引</h1>
      {msg && <div className="card px-4 py-2 text-sm text-teal">{msg}</div>}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">监控源（用户 / 组织）</h2>
        <form onSubmit={addSource} className="flex flex-wrap items-center gap-2">
          <select className="input !w-28" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="user">用户</option>
            <option value="org">组织</option>
          </select>
          <input
            className="input !w-56"
            placeholder="GitHub login"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            自动索引
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={hiddenNew} onChange={(e) => setHiddenNew(e.target.checked)} />
            新项目默认隐藏
          </label>
          <button type="submit" className="btn">
            添加监控
          </button>
          <button type="button" className="btn-ghost" onClick={() => api.syncAllGit().then(load)}>
            全部同步
          </button>
        </form>

        <div className="divide-y divide-teal-soft/40 dark:divide-white/10">
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {s.kind}/{s.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.enabled ? 'bg-teal-soft text-teal-deep' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s.enabled ? '监控中' : '已停用'}
                  </span>
                  {s.autoSync && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">自动索引</span>
                  )}
                  {s.hiddenNew && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">新项目隐藏</span>
                  )}
                  <span className="text-xs text-ink/50">{s._count?.projects ?? 0} 仓库</span>
                </div>
                <div className="text-xs text-ink/50">
                  上次同步：{s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString('zh-CN') : '从未'}
                  {s.lastError ? ` · ${s.lastError}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => toggleSource(s, 'enabled')}>
                  {s.enabled ? '停用' : '启用'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => toggleSource(s, 'autoSync')}>
                  {s.autoSync ? '关自动索引' : '开自动索引'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => toggleSource(s, 'hiddenNew')}>
                  {s.hiddenNew ? '新项目可见' : '新项目隐藏'}
                </button>
                <button type="button" className="btn" onClick={() => syncOne(s.id)}>
                  同步
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => {
                    if (confirm('删除监控源？其项目会保留（取消关联）')) {
                      api.removeGitSource(s.id).then(load);
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {!sources.length && <p className="py-3 text-sm text-ink/50">还没有监控源</p>}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">项目列表</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', '全部'],
                ['visible', '显示中'],
                ['hidden', '已隐藏'],
                ['github', 'GitHub'],
                ['manual', '手动'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={filter === k ? 'btn !py-1' : 'btn-ghost !py-1'}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
            <input
              className="input !w-48"
              placeholder="搜索"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-teal-soft/50 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    <span className="rounded-full bg-teal-soft/60 px-2 py-0.5 text-xs">
                      {p.source || 'manual'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.hidden ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.hidden ? '已隐藏' : '显示中'}
                    </span>
                    {p.indexed && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">已索引</span>
                    )}
                    {p.showInNav && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">导航</span>
                    )}
                    {typeof p.stars === 'number' && p.stars > 0 && (
                      <span className="text-xs text-amber-600">★ {p.stars}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink/50">
                    {p.fullName || p.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-ghost !py-1" onClick={() => toggleProject(p, 'hidden')}>
                    {p.hidden ? '取消隐藏' : '隐藏'}
                  </button>
                  <button type="button" className="btn-ghost !py-1" onClick={() => toggleProject(p, 'indexed')}>
                    {p.indexed ? '取消索引' : '加入索引'}
                  </button>
                  <button type="button" className="btn-ghost !py-1" onClick={() => toggleProject(p, 'showInNav')}>
                    {p.showInNav ? '移出导航' : '加入导航'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !py-1"
                    onClick={() => {
                      setSelected(p);
                      setCustom(p.customHtml ?? '');
                    }}
                  >
                    自定义内容
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !py-1 text-red-600"
                    onClick={() => removeProject(p.id)}
                  >
                    删除
                  </button>
                </div>
              </div>

              {selected?.id === p.id && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="input" placeholder="替换显示名称（可选）" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                    <input className="input" placeholder="替换简介（可选）" value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <input className="input" placeholder="背景图 URL" value={bgImage} onChange={(e) => setBgImage(e.target.value)} />
                      <label className="btn-ghost cursor-pointer whitespace-nowrap">
                        上传背景
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const up = await api.adminUpload(file);
                          setBgImage(up.url);
                        }} />
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="input min-h-[120px] font-mono text-sm"
                    placeholder="Markdown 自定义内容"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn" onClick={() => saveNav(p)}>
                      保存
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!filtered.length && <p className="text-sm text-ink/50">没有项目</p>}
        </div>
      </section>
    </div>
  );
}
