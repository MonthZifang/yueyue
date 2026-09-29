import { Link } from 'react-router-dom';
import type { Post } from '../types';

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      {post.cover && (
        <Link to={`/posts/${post.slug}`} className="block h-40 overflow-hidden">
          <img src={post.cover} alt="" className="h-full w-full object-cover" />
        </Link>
      )}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <Link
              key={t.id}
              to={`/tags/${t.slug}`}
              className="rounded-full bg-teal-soft px-2.5 py-0.5 text-xs text-teal-deep dark:bg-white/10 dark:text-teal-soft"
            >
              #{t.name}
            </Link>
          ))}
        </div>
        <h2 className="font-display text-xl font-bold">
          <Link to={`/posts/${post.slug}`} className="hover:text-teal">
            {post.title}
          </Link>
        </h2>
        <p className="text-sm text-ink/75 dark:text-white/70">{post.summary}</p>
        <div className="flex items-center justify-between text-xs text-ink/60 dark:text-white/50">
          <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : ''}</span>
          <span>
            {post.commentCount ?? 0} 评论 · {post.likeCount ?? 0} 赞
          </span>
        </div>
      </div>
    </article>
  );
}
