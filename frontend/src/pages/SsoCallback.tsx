import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setToken } from '../api';
import { useAuth } from '../store';
import { api } from '../api';

export default function SsoCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const code = params.get('code');
    const username = params.get('username') || 'sso';
    const returnTo = params.get('returnTo') || '/';
    if (!token) {
      if (code) {
        setError(
          '回调地址配置错误：授权码打到了前端。请把 SSO_REDIRECT_URI 设为 /api/auth/sso/callback',
        );
        return;
      }
      setError('SSO 登录失败：缺少 token');
      return;
    }
    setToken(token);
    // 拉取完整身份（头像/邮箱/root）
    api
      .me()
      .then((me) => {
        setAuth(token, {
          username: me.username,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl,
          email: me.email,
          isRoot: me.isRoot,
        });
        if (returnTo.startsWith('/admin') && !me.isRoot) {
          navigate('/', { replace: true });
          return;
        }
        navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true });
      })
      .catch(() => {
        setAuth(token, { username, isRoot: false });
        navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true });
      });
  }, [params, navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist dark:bg-[#0F1A19]">
      <div className="card p-8 text-center">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <p className="font-display text-lg text-teal">SSO 登录中…</p>
            <p className="mt-2 text-sm text-ink/60">正在同步头像与账号信息</p>
          </>
        )}
      </div>
    </div>
  );
}
