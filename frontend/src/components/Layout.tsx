import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/', label: '首页' },
  { to: '/posts', label: '文章' },
  { to: '/archive', label: '归档' },
  { to: '/tags', label: '标签' },
  { to: '/projects', label: '项目' },
  { to: '/gallery', label: '画廊' },
  { to: '/friends', label: '友链' },
  { to: '/guestbook', label: '留言板' },
  { to: '/about', label: '关于' },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-teal-soft/50 bg-mist/85 backdrop-blur dark:border-white/10 dark:bg-[#0F1A19]/85">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="月月岛" className="h-10 w-auto object-contain dark:opacity-90" />
            <span className="hidden font-display text-lg font-bold text-teal-deep sm:block dark:text-teal-soft">
              月月岛
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
            <Link to="/admin/login" className="btn-ghost ml-2">
              后台
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
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
              <Link to="/admin/login" className="rounded-2xl px-3 py-2 text-sm hover:bg-teal-soft/60" onClick={() => setOpen(false)}>
                后台
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-8">
        <Outlet />
      </main>

      <footer className="border-t border-teal-soft/50 py-8 text-center text-sm text-ink/70 dark:border-white/10 dark:text-white/60">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-2 font-display text-teal dark:text-teal-soft">月月岛科技 · YUEYUEDAO TECH</div>
          <div>© {new Date().getFullYear()} 月月岛 · 以清透的风写代码与梦</div>
        </div>
      </footer>
    </div>
  );
}
