import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../store';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.login(username, password);
      setAuth(res.token, res.user.username);
      navigate('/admin/posts');
    } catch {
      setError('登录失败，请检查账号密码');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4 dark:bg-[#0F1A19]">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
        <div className="text-center">
          <img src="/assets/logo.png" alt="" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-3 font-display text-2xl font-bold">管理后台</h1>
          <p className="text-sm text-ink/60">请使用管理员账号登录</p>
        </div>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn w-full">
          登录
        </button>
      </form>
    </div>
  );
}
