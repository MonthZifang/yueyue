import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Post, Tag } from '../types';
import PostCard from '../components/PostCard';

export default function PostList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag') || '';
  const [items, setItems] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [q, setQ] = useState('');
  const pageSize = 6;

  useEffect(() => {
    api.tags().then(setTags);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tag]);

  useEffect(() => {
    setLoading(true);
    api
      .listPosts({ page, pageSize, tag: tag || undefined, q: q || undefined })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [page, tag, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function selectTag(next: string) {
    if (next) setSearchParams({ tag: next });
    else setSearchParams({});
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">文章</h1>
        <div className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="搜索标题 / 内容"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setQ(searchQ.trim());
              }
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => { setPage(1); setQ(searchQ.trim()); }}
          >
            搜索
          </button>
        </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tag === '' ? 'btn' : 'btn-ghost'} onClick={() => selectTag('')}>
          全部
        </button>
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tag === t.slug ? 'btn' : 'btn-ghost'}
            onClick={() => selectTag(t.slug)}
          >
            #{t.name}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="card p-8 text-center text-ink/60">加载中…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">还没有公开文章</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span className="text-sm text-ink/70">
            {page} / {pages}
          </span>
          <button type="button" className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
