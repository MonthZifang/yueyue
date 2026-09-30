import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Post, Tag } from '../types';
import PostCard from '../components/PostCard';

/** 标签页：未选中标签时默认显示全部文章；支持搜索 */
export default function Tags() {
  const { slug } = useParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.tags().then(setTags);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listPosts({ tag: slug || undefined, pageSize: 50, q: q || undefined })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [slug, q]);

  const active = slug || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">
          标签{slug ? ` · #${tags.find((t) => t.slug === slug)?.name ?? slug}` : ' · 全部'}
        </h1>
        <div className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="搜索文章 / 标签名"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setQ(searchQ.trim());
            }}
          />
          <button type="button" className="btn" onClick={() => setQ(searchQ.trim())}>
            搜索
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/tags" className={active === '' ? 'btn' : 'btn-ghost'}>
          全部
        </Link>
        {tags
          .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.slug.includes(q.toLowerCase()))
          .map((t) => (
            <Link key={t.id} to={`/tags/${t.slug}`} className={active === t.slug ? 'btn' : 'btn-ghost'}>
              #{t.name}
              <span className="ml-1 opacity-70">{t.count ?? 0}</span>
            </Link>
          ))}
      </div>

      <p className="text-sm text-ink/60">
        {loading ? '加载中…' : `共 ${total} 篇${active ? '' : '（默认全部）'}${q ? ` · 搜索「${q}」` : ''}`}
      </p>

      {loading ? (
        <div className="card p-8 text-center text-ink/60">加载中…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">没有匹配的文章</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}