import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Post, SiteSetting } from '../types';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [site, setSite] = useState<SiteSetting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.site().then(setSite).catch(() => setSite(null));
    api
      .listPosts({ pageSize: 6 })
      .then((d) => setPosts(d.items))
      .finally(() => setLoading(false));
  }, []);

  const titleLines = (site?.heroTitle ?? '在清透的风与\n墨绿的电路之间').split('\n');

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] shadow-soft">
        <img
          src={site?.heroImage || '/assets/hero.png'}
          alt="月月岛主视觉"
          className="h-[320px] w-full object-cover object-top sm:h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent dark:from-[#0F1A19]/90 dark:via-[#0F1A19]/40">
          <div className="flex h-full max-w-xl flex-col justify-center gap-4 px-6 sm:px-10">
            <p className="text-sm font-medium tracking-[0.25em] text-teal">
              {site?.heroKicker || 'YUEYUEDAO TECH'}
            </p>
            <h1 className="font-display text-3xl font-bold leading-snug text-teal-deep sm:text-5xl dark:text-teal-soft">
              {titleLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < titleLines.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="max-w-md text-sm text-ink/80 sm:text-base dark:text-white/80">
              {site?.heroSubtitle || '记录代码、二次元与生活的小站。'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/posts" className="btn">
                浏览文章
              </Link>
              <Link to="/guestbook" className="btn-ghost">
                写留言
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">最新文章</h2>
          <Link to="/posts" className="text-sm text-teal hover:underline">
            查看全部 →
          </Link>
        </div>
        {loading ? (
          <div className="card p-8 text-center text-ink/60">加载中…</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { to: '/projects', title: '项目', desc: '做过的东西与进行中的实验' },
          { to: '/gallery', title: '画廊', desc: '插画、主视觉与品牌形象' },
          { to: '/friends', title: '友链', desc: '互相走动的邻居们' },
        ].map((c) => (
          <Link key={c.to} to={c.to} className="card block p-5 transition hover:-translate-y-0.5">
            <div className="font-display text-lg font-bold text-teal">{c.title}</div>
            <p className="mt-1 text-sm text-ink/70 dark:text-white/70">{c.desc}</p>
          </Link>
        ))}
      </section>

      <section className="card flex flex-col items-center gap-4 p-6 sm:flex-row">
        <img src="/assets/mascot.png" alt="吉祥物" className="h-24 w-24 object-contain" />
        <div>
          <h3 className="font-display text-lg font-bold">来自月月岛的便签</h3>
          <p className="text-sm text-ink/75 dark:text-white/70">
            站点使用 React + NestJS 构建。
          </p>
        </div>
      </section>
    </div>
  );
}
