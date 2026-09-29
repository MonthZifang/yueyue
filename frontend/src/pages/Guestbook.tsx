import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { GuestbookItem } from '../types';
import { useAuth } from '../store';
import { UserAvatar } from '../components/UserAvatar';

export default function Guestbook() {
  const [items, setItems] = useState<GuestbookItem[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const token = useAuth((s) => s.token);
  const displayName = useAuth((s) => s.displayName) || useAuth((s) => s.username);
  const avatarUrl = useAuth((s) => s.avatarUrl);

  useEffect(() => {
    api.guestbook().then(setItems);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('请你进行登录');
      return;
    }
    try {
      const item = await api.addGuestbook(content);
      setItems((list) => [item, ...list]);
      setContent('');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('请你进行登录');
      } else {
        setError('发送失败，请稍后重试');
      }
    }
  }

  async function onSso() {
    try {
      const { url } = await api.ssoLogin('/guestbook');
      window.location.href = url;
    } catch {
      setError('SSO 暂不可用');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">留言板</h1>

      {!token ? (
        <div className="card space-y-3 p-6">
          <p className="text-sm text-ink/75">发送留言需要 SSO 统一登录，将使用账号头像与昵称。</p>
          <button type="button" className="btn" onClick={onSso}>
            请你进行登录
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm">
            <UserAvatar src={avatarUrl} name={displayName} />
            <span className="font-medium text-teal">{displayName || '旅人'}</span>
          </div>
          <textarea
            className="input min-h-[120px]"
            placeholder="留下你的足迹～"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn">
            发送留言
          </button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((g) => (
          <div key={g.id} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserAvatar src={g.avatarUrl} name={g.nickname} size={28} />
                <span className="font-medium text-teal">{g.nickname}</span>
              </div>
              <span className="text-xs text-ink/50">{new Date(g.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            <p className="mt-2 text-sm">{g.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
