import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Group } from '../../types';

const KINDS = [
  ['steam', 'Steam'],
  ['qq', 'QQ 群'],
  ['git', 'Git 组织'],
  ['discord', 'Discord'],
  ['other', '其他'],
] as const;

export default function AdminGroups() {
  const [items, setItems] = useState<Group[]>([]);
  const [msg, setMsg] = useState('');

  function load() {
    api.adminGroups().then(setItems);
  }

  useEffect(() => {
    load();
  }, []);

  async function addGroup() {
    await api.createGroup({ title: '新组', kind: 'qq', summary: '', content: '' });
    load();
  }

  async function save(g: Group) {
    await api.updateGroup(g.id, {
      title: g.title,
      kind: g.kind,
      summary: g.summary,
      content: g.content,
      url: g.url,
      qrImage: g.qrImage,
      cover: g.cover,
      hidden: g.hidden,
      sort: g.sort ?? 0,
    });
    setMsg('已保存');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">组 / 社群管理</h1>
        <button type="button" className="btn" onClick={addGroup}>
          新建组
        </button>
      </div>
      {msg && <div className="card px-4 py-2 text-sm text-teal">{msg}</div>}

      <div className="space-y-4">
        {items.map((g) => (
          <div key={g.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input !w-56"
                value={g.title}
                onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, title: e.target.value } : x)))}
              />
              <select
                className="input !w-36"
                value={g.kind}
                onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, kind: e.target.value } : x)))}
              >
                {KINDS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(g.hidden)}
                  onChange={(e) =>
                    setItems((list) => list.map((x) => (x.id === g.id ? { ...x, hidden: e.target.checked } : x)))
                  }
                />
                隐藏
              </label>
            </div>
            <input
              className="input"
              placeholder="简介"
              value={g.summary}
              onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, summary: e.target.value } : x)))}
            />
            <input
              className="input"
              placeholder="链接（Steam/QQ/Git 等）"
              value={g.url ?? ''}
              onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, url: e.target.value } : x)))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input !w-64"
                placeholder="二维码/图标 URL"
                value={g.qrImage ?? ''}
                onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, qrImage: e.target.value } : x)))}
              />
              <label className="btn-ghost cursor-pointer">
                上传图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const up = await api.adminUpload(file);
                    setItems((list) => list.map((x) => (x.id === g.id ? { ...x, qrImage: up.url } : x)));
                  }}
                />
              </label>
            </div>
            <textarea
              className="input min-h-[120px] font-mono text-sm"
              placeholder="Markdown 介绍"
              value={g.content}
              onChange={(e) => setItems((list) => list.map((x) => (x.id === g.id ? { ...x, content: e.target.value } : x)))}
            />
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => save(g)}>
                保存
              </button>
              <button
                type="button"
                className="btn-ghost text-red-600"
                onClick={() => {
                  if (confirm('删除该组？')) api.deleteGroup(g.id).then(load);
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-ink/50">还没有组，点「新建组」开始</p>}
      </div>
    </div>
  );
}
