import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { api, setToken } from '../api';
import type { SiteSetting } from '../types';
import { useAuth } from '../store';
import { UserAvatar } from './UserAvatar';

const links = [
  { to: '/', label: '首页' },
  { to: '/posts', label: '文章' },
  { to: '/archive', label: '归档' },
  { to: '/tags', label: '标签' },
  { to: '/projects', label: '项目' },
  { to: '/gallery', label: '画廊' },
  { to: '/friends', label: '友链' },
  { to: '/groups', label: '组' },
  { to: '/guestbook', label: '留言板' },
  { to: '/about', label: '关于' },
];

async function startSsoLogin(returnTo: string) {
  try {
    const { url } = await api.ssoLogin(returnTo);
    window.location.href = url;
  } catch {
    window.location.href = '/admin/login';
  }
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState<SiteSetting | null>(null);
  const token = useAuth((s) => s.token);
  const isRoot = useAuth((s) => s.isRoot);
  const displayName = useAuth((s) => s.displayName) || useAuth((s) => s.username);
  const avatarUrl = useAuth((s) => s.avatarUrl);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    api.site().then(setSite).catch(() => setSite(null));
  }, []);

  const showAdmin = Boolean(token && isRoot);

  function onLogout() {
    logout();
    setToken(null);
    navigate('/');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-teal-soft/50 bg-mist/85 backdrop-blur dark:border-white/10 dark:bg-[#0F1A19]/85">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/mascot.png" alt={site?.siteName || '月月岛'} className="h-10 w-10 rounded-full object-cover dark:opacity-90" />
            <span className="hidden font-display text-lg font-bold text-teal-deep sm:block dark:text-teal-soft">
              {site?.siteName || '月月岛'}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-teal text-white'
                      : 'text-ink/80 hover:bg-teal-soft/60 dark:text-white/80 dark:hover:bg-white/10'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <ThemeToggle />
            {token ? (
              <div className="ml-2 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-teal-soft/50 px-2 py-1 dark:bg-white/10">
                  <UserAvatar src={avatarUrl} name={displayName} size={28} />
                  <span className="max-w-[8rem] truncate text-sm text-ink/80 dark:text-white/80">
                    {displayName || '用户'}
                  </span>
                </div>
                <button type="button" className="btn-ghost" onClick={onLogout}>
                  退出
                </button>
                {showAdmin && (
                  <Link to="/admin/posts" className="btn-ghost">
                    后台
                  </Link>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn ml-2"
                onClick={() => startSsoLogin(window.location.pathname + window.location.search)}
              >
                登录
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            {token ? (
              <button type="button" className="btn-ghost" onClick={onLogout}>
                退出
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => startSsoLogin(window.location.pathname + window.location.search)}
              >
                登录
              </button>
            )}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen((v) => !v)}
              aria-label="菜单"
            >
              菜单
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-teal-soft/50 bg-white/90 px-4 py-3 dark:bg-[#122220] lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-2 text-sm hover:bg-teal-soft/60 dark:hover:bg-white/10"
                >
                  {l.label}
                </NavLink>
              ))}
              {showAdmin && (
                <Link
                  to="/admin/posts"
                  className="rounded-2xl px-3 py-2 text-sm hover:bg-teal-soft/60"
                  onClick={() => setOpen(false)}
                >
                  后台
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-8">
        <Outlet />
      </main>

      <footer className="border-t border-teal-soft/50 py-8 text-center text-sm text-ink/70 dark:border-white/10 dark:text-white/60">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-2 font-display text-teal dark:text-teal-soft">
            月月岛科技 · YUEYUEDAO TECH
          </div>
          <div>
            © {new Date().getFullYear()} {site?.siteName || '月月岛'} ·{' '}
            {site?.footerNote || '以清透的风写代码与梦'}
          </div>
        </div>
      </footer>
    </div>
  );
}
