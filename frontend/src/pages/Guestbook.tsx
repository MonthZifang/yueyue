import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { GuestbookItem } from '../types';

export default function Guestbook() {
  const [items, setItems] = useState<GuestbookItem[]>([]);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.guestbook().then(setItems);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const item = await api.addGuestbook(nickname, content);
      setItems((list) => [item, ...list]);
      setContent('');
    } catch {
      setError('发送失败，请检查内容');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">留言板</h1>
      <form onSubmit={onSubmit} className="card space-y-3 p-6">
        <input
          className="input"
          placeholder="昵称"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          required
        />
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
      <div className="space-y-3">
        {items.map((g) => (
          <div key={g.id} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-teal">{g.nickname}</span>
              <span className="text-xs text-ink/50">{new Date(g.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            <p className="mt-2 text-sm">{g.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
