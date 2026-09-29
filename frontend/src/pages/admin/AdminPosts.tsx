import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { Post } from '../../types';
import { useAuth } from '../../store';

export default function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const token = useAuth((s) => s.token);

  function load() {
    api.adminListPosts().then(setPosts);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onDelete(id: number) {
    if (!confirm('确认删除这篇文章？')) return;
    await api.adminDeletePost(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">文章管理</h1>
        <Link to="/admin/posts/new" className="btn">
          新建文章
        </Link>
      </div>
      <div className="card divide-y divide-teal-soft/50 dark:divide-white/10">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">
                {p.title}{' '}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${p.status === 'published' ? 'bg-teal-soft text-teal-deep' : 'bg-amber-100 text-amber-800'}`}>
                  {p.status === 'published' ? '已发布' : '草稿'}
                </span>
              </div>
              <div className="text-xs text-ink/50">/{p.slug}</div>
            </div>
            <div className="flex gap-2">
              <Link to={`/admin/posts/${p.id}/edit`} className="btn-ghost">
                编辑
              </Link>
              <button type="button" className="btn-ghost text-red-600" onClick={() => onDelete(p.id)}>
                删除
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="p-8 text-center text-ink/60">暂无文章</div>}
      </div>
    </div>
  );
}
