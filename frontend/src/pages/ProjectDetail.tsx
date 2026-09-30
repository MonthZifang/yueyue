import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Comment, Project } from '../types';
import { renderMarkdown } from '../md';
import { getFingerprint, useAuth } from '../store';
import { UserAvatar } from '../components/UserAvatar';
import ReadingProgress from '../components/ReadingProgress';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');
  const token = useAuth((s) => s.token);
  const displayName = useAuth((s) => s.displayName) || useAuth((s) => s.username);
  const avatarUrl = useAuth((s) => s.avatarUrl);

  useEffect(() => {
    if (!id) return;
    const fp = getFingerprint();
    const key = `pview:${id}`;
    const shouldCount = !sessionStorage.getItem(key);
    if (shouldCount) sessionStorage.setItem(key, '1');
    api
      .getProject(Number(id), fp, shouldCount)
      .then((p) => {
        setProject(p);
        setLikeCount(p.likeCount ?? 0);
        setLiked(Boolean((p as Project & { liked?: boolean }).liked));
        setComments((p as Project & { comments?: Comment[] }).comments ?? []);
      })
      .catch(() => setError('项目不存在或已隐藏'));
  }, [id]);

  async function onLike() {
    if (!id) return;
    const res = await api.likeProject(Number(id), getFingerprint());
    setLiked(res.liked);
    setLikeCount(res.likeCount);
  }

  async function onComment(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!token) {
      setMsg('请你进行登录');
      return;
    }
    try {
      const c = await api.addProjectComment(Number(id), content);
      setComments((list) => [c, ...list]);
      setContent('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMsg(status === 401 ? '请你进行登录' : '评论失败，请稍后重试');
    }
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink/60">{error}</p>
        <Link to="/projects" className="btn mt-4">
          返回项目列表
        </Link>
      </div>
    );
  }

  if (!project) return <div className="card p-8 text-center text-ink/60">加载中…</div>;

  const href = project.url || project.homepage;
  const title = project.customTitle || project.title;
  const summary = project.customSummary || project.description;

  return (
    <div className="space-y-6">
      <ReadingProgress />
      <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
        <img
          src={project.bgImage || project.cover || '/assets/hero.png'}
          alt=""
          className="h-56 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-[#0F1A19]/90 dark:via-[#0F1A19]/40">
          <div className="flex h-full max-w-2xl flex-col justify-end gap-2 p-6 sm:p-10">
            <p className="text-xs tracking-[0.2em] text-teal">PROJECT · #{project.id}</p>
            <h1 className="font-display text-3xl font-bold text-teal-deep dark:text-teal-soft sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-ink/80 dark:text-white/80">{summary}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="btn">
            打开项目链接 →
          </a>
        )}
        <button type="button" className="btn" onClick={onLike}>
          {liked ? '已赞' : '点赞'} · {likeCount}
        </button>
        <span className="text-sm text-ink/60">阅读 {project.viewCount ?? 0}</span>
        <button type="button" className="btn-ghost" onClick={() => navigate('/projects')}>
          返回列表
        </button>
        {project.techStack && (
          <span className="rounded-full bg-teal-soft/60 px-3 py-1 text-xs text-teal-deep dark:bg-white/10 dark:text-teal-soft">
            {project.techStack}
          </span>
        )}
      </div>

      {(project.customHtml || project.fullName) && (
        <div className="card p-6 sm:p-8">
          {project.fullName && <p className="mb-4 text-xs text-ink/50">GitHub: {project.fullName}</p>}
          {project.customHtml ? (
            <div className="prose-yue" dangerouslySetInnerHTML={{ __html: renderMarkdown(project.customHtml) }} />
          ) : (
            <p className="text-sm text-ink/60">{project.description}</p>
          )}
        </div>
      )}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold">评论</h2>
        {!token ? (
          <div className="rounded-2xl bg-teal-soft/40 p-4 dark:bg-white/5">
            <p className="text-sm text-ink/75 dark:text-white/75">发送评论需要统一登录。</p>
            <button
              type="button"
              className="btn mt-3"
              onClick={() => api.ssoLogin(`/projects/${id}`).then((s) => (window.location.href = s.url))}
            >
              请你进行登录
            </button>
            {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
          </div>
        ) : (
          <form onSubmit={onComment} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <UserAvatar src={avatarUrl} name={displayName} />
              <span className="font-medium text-teal">{displayName || '旅人'}</span>
            </div>
            <textarea
              className="input min-h-[100px]"
              placeholder="说点什么吧～"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              required
            />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <button type="submit" className="btn">
              发表评论
            </button>
          </form>
        )}

        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-2xl bg-teal-soft/40 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <UserAvatar src={c.avatarUrl} name={c.nickname} size={28} />
                  <span className="font-medium text-teal-deep dark:text-teal-soft">{c.nickname}</span>
                </div>
                <span className="text-xs text-ink/50">{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="mt-2 text-sm">{c.content}</p>
            </div>
          ))}
          {!comments.length && <p className="text-sm text-ink/60">还没有评论</p>}
        </div>
      </section>
    </div>
  );
}
