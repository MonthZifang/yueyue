import { useEffect, useState } from 'react';
import { api } from '../../api';

type MediaItem = {
  id: number;
  filename: string;
  displayName?: string | null;
  mime: string;
  size: number;
  createdAt: string;
};

export default function AdminMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<string>('');

  function load() {
    api.adminMedia().then((d) => setItems(d as MediaItem[]));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((m) => {
    const kw = q.trim().toLowerCase();
    if (!kw) return true;
    return (
      String(m.id).includes(kw) ||
      m.filename.toLowerCase().includes(kw) ||
      (m.displayName || '').toLowerCase().includes(kw)
    );
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const up = await api.adminUpload(f);
    setMsg(`已上传 #${up.id} ${up.filename}`);
    load();
  }

  async function saveName() {
    if (!editing) return;
    await api.updateMedia(editing.id, { displayName: name, filename: file || undefined });
    setMsg('已保存');
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">图片库</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input !w-56"
            placeholder="搜 ID / 文件名 / 名称"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="btn cursor-pointer">
            上传图片
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        </div>
      </div>
      {msg && <div className="card px-4 py-2 text-sm text-teal">{msg}</div>}

      <p className="text-xs text-ink/50">
        封面可填：图片 ID（如 3）或路径（/api/media/3 或 /uploads/文件名）
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            <img
              src={`/api/media/${m.id}`}
              alt={m.displayName || m.filename}
              className="h-40 w-full bg-teal-soft/30 object-cover"
            />
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-soft/70 px-2 py-0.5 text-xs">
                  ID {m.id}
                </span>
                <span className="text-xs text-ink/50">
                  {(m.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <div className="truncate text-sm font-medium">
                {m.displayName || m.filename}
              </div>
              <div className="truncate text-xs text-ink/50">{m.filename}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost !py-1"
                  onClick={() => {
                    navigator.clipboard.writeText(String(m.id));
                    setMsg(`已复制 ID ${m.id}`);
                  }}
                >
                  复制 ID
                </button>
                <button
                  type="button"
                  className="btn-ghost !py-1"
                  onClick={() => {
                    navigator.clipboard.writeText(`/api/media/${m.id}`);
                    setMsg('已复制路径');
                  }}
                >
                  复制路径
                </button>
                <button
                  type="button"
                  className="btn-ghost !py-1"
                  onClick={() => {
                    setEditing(m);
                    setName(m.displayName || '');
                    setFile(m.filename);
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="btn-ghost !py-1 text-red-600"
                  onClick={() => {
                    if (confirm(`删除图片 #${m.id}？`)) {
                      api.deleteMedia(m.id).then(load);
                    }
                  }}
                >
                  删除
                </button>
              </div>
              {editing?.id === m.id && (
                <div className="space-y-2 border-t border-teal-soft/40 pt-2">
                  <input
                    className="input"
                    placeholder="显示名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="文件名"
                    value={file}
                    onChange={(e) => setFile(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn !py-1" onClick={saveName}>
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !py-1"
                      onClick={() => setEditing(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="card p-8 text-center text-ink/60 sm:col-span-2 lg:col-span-3">
            没有图片
          </div>
        )}
      </div>
    </div>
  );
}
