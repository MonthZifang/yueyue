import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    api.ssoStatus().then((s) => setSsoEnabled(s.enabled)).catch(() => setSsoEnabled(false));
  }, []);

  async function onSso() {
    setError('');
    try {
      const { url } = await api.ssoLogin('/admin/posts');
      window.location.href = url;
    } catch {
      setError('SSO 暂不可用');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4 dark:bg-[#0F1A19]">
      <div className="card w-full max-w-md space-y-4 p-8">
        <div className="text-center">
          <img src="/assets/mascot.png" alt="" className="mx-auto h-14 w-14 rounded-full object-cover" />
          <h1 className="mt-3 font-display text-2xl font-bold">管理后台</h1>
          <p className="text-sm text-ink/60">后台默认关闭，仅 root（id=0）用户可进入</p>
        </div>
        {ssoEnabled ? (
          <button type="button" className="btn w-full" onClick={onSso}>
            使用 SSO 统一登录
          </button>
        ) : (
          <p className="text-center text-sm text-red-600">SSO 未配置，后台无法开放</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-ink/50">
          评论、留言等前台互动同样需要 SSO 统一登录；头像与邮箱来自 SSO 账号。
        </p>
      </div>
    </div>
  );
}
