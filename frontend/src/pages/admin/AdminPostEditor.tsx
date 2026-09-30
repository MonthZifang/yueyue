import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import type { Tag } from '../../types';

function resolveCover(v: string): string {
  const t = (v || '').trim();
  if (!t) return '';
  if (/^https?:/i.test(t) || t.startsWith('/')) return t;
  if (/^\d+$/.test(t)) return `/api/media/${t}`;
  return t;
}

export default function AdminPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.tags().then(setTags);
    if (id) {
      api.adminListPosts().then((list) => {
        const p = list.find((x) => x.id === Number(id));
        if (!p) return;
        setTitle(p.title);
        setSlug(p.slug);
        setSummary(p.summary);
        setContent(p.content);
        setCover(p.cover ?? '');
        setStatus(p.status);
        setTagIds(p.tags.map((t) => t.id));
      });
    }
  }, [id]);

  async function onUpload(file: File) {
    const res = await api.adminUpload(file);
    setCover(res.url);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const body = {
      title,
      slug,
      summary,
      content,
      cover,
      status,
      tagIds,
    };
    try {
      if (id) await api.adminUpdatePost(Number(id), body);
      else await api.adminCreatePost(body);
      navigate('/admin/posts');
    } catch {
      setError('保存失败，请检查字段');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h1 className="font-display text-2xl font-bold">{id ? '编辑文章' : '新建文章'}</h1>
      <input className="input" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="slug（可留空自动编号 1000+）" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <textarea className="input" placeholder="摘要" value={summary} onChange={(e) => setSummary(e.target.value)} required />
      <textarea
        className="input min-h-[240px] font-mono text-sm"
        placeholder="Markdown 正文"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          封面
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
        </label>
        <label className="block text-sm">
          状态
          <select className="input mt-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
        </label>
      </div>
      {cover && (
        <>
          <img
            src={resolveCover(cover)}
            alt="封面预览"
            className="h-40 w-full rounded-2xl object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="text-xs text-ink/50">支持：图片 ID、/api/media/ID、/uploads/文件名、完整 URL</p>
        </>
      )}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span>标签</span>
          <input
            className="input !w-36 !py-1"
            placeholder="新标签名"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost !py-1"
            onClick={async () => {
              if (!newTag.trim()) return;
              const t = await api.createTag(newTag.trim());
              setTags((list) => [...list, t]);
              setTagIds((ids) => [...ids, t.id]);
              setNewTag('');
            }}
          >
            + 创建标签
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const active = tagIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={active ? 'btn' : 'btn-ghost'}
                onClick={() =>
                  setTagIds((ids) => (active ? ids.filter((x) => x !== t.id) : [...ids, t.id]))
                }
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn">
          保存
        </button>
        <button type="button" className="btn-ghost" onClick={() => navigate('/admin/posts')}>
          返回
        </button>
      </div>
    </form>
  );
}
