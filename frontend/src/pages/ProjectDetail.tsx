import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Project } from '../types';
import { renderMarkdown } from '../md';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .getProject(Number(id))
      .then(setProject)
      .catch(() => setError('项目不存在或已隐藏'));
  }, [id]);

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

  if (!project) {
    return <div className="card p-8 text-center text-ink/60">加载中…</div>;
  }

  const href = project.url || project.homepage;
  const title = project.customTitle || project.title;
  const summary = project.customSummary || project.description;

  return (
    <div className="space-y-6">
      {/* 背景 Hero */}
      <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
        <img
          src={project.bgImage || project.cover || '/assets/hero.png'}
          alt=""
          className="h-56 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-[#0F1A19]/90 dark:via-[#0F1A19]/40">
          <div className="flex h-full max-w-2xl flex-col justify-end gap-2 p-6 sm:p-10">
            <p className="text-xs tracking-[0.2em] text-teal">
              PROJECT · #{project.id}
            </p>
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
        <button type="button" className="btn-ghost" onClick={() => navigate('/projects')}>
          返回列表
        </button>
        {project.techStack && (
          <span className="rounded-full bg-teal-soft/60 px-3 py-1 text-xs text-teal-deep dark:bg-white/10 dark:text-teal-soft">
            {project.techStack}
          </span>
        )}
        {typeof project.stars === 'number' && project.stars > 0 && (
          <span className="text-sm text-amber-600">★ {project.stars}</span>
        )}
      </div>

      {(project.customHtml || project.fullName) && (
        <div className="card p-6 sm:p-8">
          {project.fullName && (
            <p className="mb-4 text-xs text-ink/50">GitHub: {project.fullName}</p>
          )}
          {project.customHtml ? (
            <div
              className="prose-yue"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(project.customHtml) }}
            />
          ) : (
            <p className="text-sm text-ink/60">{project.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
