import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Comment, Post } from '../types';
import { renderMarkdown } from '../md';
import { getFingerprint } from '../store';
import ReadingProgress from '../components/ReadingProgress';

export default function PostDetail() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const html = useMemo(() => (post ? renderMarkdown(post.content) : ''), [post]);

  useEffect(() => {
    if (!slug) return;
    const fingerprint = getFingerprint();
    api.getPost(slug, fingerprint).then((p) => {
      setPost(p);
      setLikeCount(p.likeCount ?? 0);
      setLiked(Boolean(p.liked));
      setComments(p.comments ?? []);
    });
  }, [slug]);

  async function onLike() {
    const res = await api.like(slug, getFingerprint());
    setLiked(res.liked);
    setLikeCount(res.likeCount);
  }

  async function onComment(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const c = await api.addComment(slug, nickname, content);
      setComments((list) => [c, ...list]);
      setContent('');
    } catch {
      setError('评论失败，请检查昵称与内容');
    }
  }

  if (!post) return <div className="card p-8 text-center text-ink/60">加载中…</div>;

  return (
    <article className="relative mx-auto max-w-3xl space-y-8">
      <ReadingProgress />
      {post.cover && (
        <img src={post.cover} alt="" className="h-56 w-full rounded-[2rem] object-cover shadow-soft sm:h-72" />
      )}
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <Link key={t.id} to={`/tags/${t.slug}`} className="rounded-full bg-teal-soft px-2.5 py-0.5 text-xs text-teal-deep dark:bg-white/10 dark:text-teal-soft">
              #{t.name}
            </Link>
          ))}
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{post.title}</h1>
        <p className="text-sm text-ink/60 dark:text-white/50">
          {post.publishedAt ? new Date(post.publishedAt).toLocaleString('zh-CN') : ''}
        </p>
      </header>

      <div className="prose-yue" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="flex items-center gap-3">
        <button type="button" className="btn" onClick={onLike}>
          {liked ? '已赞' : '点赞'} · {likeCount}
        </button>
        <Link to="/posts" className="btn-ghost">
          返回列表
        </Link>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">评论</h2>
        <form onSubmit={onComment} className="space-y-3">
          <input
            className="input"
            placeholder="昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            required
          />
          <textarea
            className="input min-h-[100px]"
            placeholder="说点什么吧～"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn">
            发表评论
          </button>
        </form>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-2xl bg-teal-soft/40 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-teal-deep dark:text-teal-soft">{c.nickname}</span>
                <span className="text-xs text-ink/50">{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="mt-2 text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-ink/60">还没有评论</p>}
        </div>
      </section>
    </article>
  );
}
