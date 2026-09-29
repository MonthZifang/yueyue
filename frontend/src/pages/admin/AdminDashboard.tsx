import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store';

export default function AdminDashboard() {
  const token = useAuth((s) => s.token);
  const username = useAuth((s) => s.username);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    if (!useAuth.getState().isRoot) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  if (!token || !useAuth.getState().isRoot) return null;

  return (
    <div className="min-h-screen bg-mist dark:bg-[#0F1A19]">
      <header className="border-b border-teal-soft/50 bg-white/80 px-4 py-3 dark:bg-white/5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <Link to="/admin/posts" className="font-display text-lg font-bold text-teal">
            月月岛 · 后台
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink/70">{username}</span>
            <NavLink to="/admin/posts" className="btn-ghost">
              文章
            </NavLink>
            <NavLink to="/admin/content" className="btn-ghost">
              内容
            </NavLink>
            <NavLink to="/admin/git" className="btn-ghost">
              Git 项目
            </NavLink>
            <NavLink to="/admin/tools" className="btn-ghost">
              网络工具
            </NavLink>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
