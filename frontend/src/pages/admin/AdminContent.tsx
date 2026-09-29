import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api';
import type { FriendLink, GalleryItem, SiteSetting, Tag } from '../../types';

export default function AdminContent() {
  const [tab, setTab] = useState<'site' | 'tags' | 'friends' | 'gallery' | 'about'>('site');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [site, setSite] = useState<SiteSetting | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');
  const [friends, setFriends] = useState<FriendLink[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutContent, setAboutContent] = useState('');
  const [msg, setMsg] = useState('');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);

  const filteredGallery = gallery.filter((g) => {
    if (galleryFilter === 'hidden') return g.hidden;
    if (galleryFilter === 'visible') return !g.hidden;
    return true;
  });

  function load() {
    api.adminSite().then(setSite);
    api.adminTags().then(setTags);
    api.adminFriends().then(setFriends);
    api.adminGallery().then(setGallery);
    api.about().then((a) => {
      setAboutTitle(a.title);
      setAboutContent(a.content);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSite(e: FormEvent) {
    e.preventDefault();
    if (!site) return;
    let heroImage = site.heroImage;
    if (heroImageFile) {
      const up = await api.adminUpload(heroImageFile);
      heroImage = up.url;
    }
    await api.updateSite({ ...site, heroImage });
    setMsg('首页配置已保存');
    load();
  }

  async function addTag(e: FormEvent) {
    e.preventDefault();
    await api.createTag(tagName, tagSlug || undefined);
    setTagName('');
    setTagSlug('');
    setMsg('标签已添加');
    load();
  }

  async function saveFriend(f: FriendLink) {
    await api.updateFriend(f.id, {
      name: f.name,
      url: f.url,
      description: f.description ?? '',
      avatar: f.avatar ?? '',
      sort: 0,
    });
    setMsg('友链已更新');
    load();
  }

  async function addFriend() {
    await api.createFriend({ name: '新友链', url: 'https://example.com', description: '描述' });
    load();
  }

  async function addGallery() {
    await api.createGallery({ title: '新画作', imageUrl: '/assets/art-cat-branch.png', description: '' });
    load();
  }

  async function saveAbout(e: FormEvent) {
    e.preventDefault();
    await api.updateAbout(aboutTitle, aboutContent);
    setMsg('关于内容已保存');
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">站点内容管理</h1>
      {msg && <div className="card px-4 py-2 text-sm text-teal">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['site', '首页文案'],
            ['tags', '标签'],
            ['friends', '友链'],
            ['gallery', '画廊'],
            ['about', '关于'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'btn' : 'btn-ghost'}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'site' && site && (
        <form onSubmit={saveSite} className="card space-y-3 p-6">
          <label className="block text-sm">
            站点名称
            <input className="input mt-1" value={site.siteName} onChange={(e) => setSite({ ...site, siteName: e.target.value })} />
          </label>
          <label className="block text-sm">
            Hero 英文眉题
            <input className="input mt-1" value={site.heroKicker} onChange={(e) => setSite({ ...site, heroKicker: e.target.value })} />
          </label>
          <label className="block text-sm">
            Hero 标题（用换行分行）
            <textarea className="input mt-1 min-h-[80px]" value={site.heroTitle} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} />
          </label>
          <label className="block text-sm">
            Hero 副文案
            <textarea className="input mt-1 min-h-[80px]" value={site.heroSubtitle} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} />
          </label>
          <label className="block text-sm">
            Hero 图片 URL
            <input className="input mt-1" value={site.heroImage} onChange={(e) => setSite({ ...site, heroImage: e.target.value })} />
          </label>
          <label className="block text-sm">
            或上传新的 Hero 图
            <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block text-sm">
            页脚文案
            <input className="input mt-1" value={site.footerNote} onChange={(e) => setSite({ ...site, footerNote: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={site.commentRequireSso}
              onChange={(e) => setSite({ ...site, commentRequireSso: e.target.checked })}
            />
            评论需要 SSO 统一登录
          </label>
          <button type="submit" className="btn">
            保存首页配置
          </button>
        </form>
      )}

      {tab === 'tags' && (
        <div className="card space-y-4 p-6">
          <form onSubmit={addTag} className="flex flex-wrap gap-2">
            <input className="input !w-40" placeholder="标签名" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
            <input className="input !w-40" placeholder="slug（可选）" value={tagSlug} onChange={(e) => setTagSlug(e.target.value)} />
            <button type="submit" className="btn">
              新建标签
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="flex items-center gap-2 rounded-full bg-teal-soft/60 px-3 py-1 text-sm">
                #{t.name}
                <button type="button" className="text-red-600" onClick={() => api.deleteTag(t.id).then(load)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="card space-y-4 p-6">
          <button type="button" className="btn" onClick={addFriend}>
            添加友链
          </button>
          <div className="space-y-3">
            {friends.map((f) => (
              <div key={f.id} className="grid gap-2 rounded-2xl border border-teal-soft/50 p-4 sm:grid-cols-2">
                <input
                  className="input"
                  value={f.name}
                  onChange={(e) => setFriends((list) => list.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  className="input"
                  value={f.url}
                  onChange={(e) => setFriends((list) => list.map((x) => (x.id === f.id ? { ...x, url: e.target.value } : x)))}
                />
                <input
                  className="input sm:col-span-2"
                  value={f.description ?? ''}
                  onChange={(e) => setFriends((list) => list.map((x) => (x.id === f.id ? { ...x, description: e.target.value } : x)))}
                />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="button" className="btn" onClick={() => saveFriend(f)}>
                    保存
                  </button>
                  <button type="button" className="btn-ghost text-red-600" onClick={() => api.deleteFriend(f.id).then(load)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'gallery' && (
        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">画廊整理</h2>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['all', '全部'],
                  ['visible', '显示中'],
                  ['hidden', '已隐藏'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={galleryFilter === k ? 'btn !py-1' : 'btn-ghost !py-1'}
                  onClick={() => setGalleryFilter(k)}
                >
                  {label}
                </button>
              ))}
              <button type="button" className="btn" onClick={addGallery}>
                新增画作
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredGallery.map((g, index) => (
              <div key={g.id} className="rounded-2xl border border-teal-soft/50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink/50">#{index + 1}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        g.hidden ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {g.hidden ? '已隐藏' : '显示中'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1"
                      disabled={index === 0}
                      onClick={async () => {
                        const prev = filteredGallery[index - 1];
                        if (!prev) return;
                        await api.updateGallery(g.id, { sort: prev.sort ?? 0 });
                        await api.updateGallery(prev.id, { sort: g.sort ?? 0 });
                        load();
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1"
                      disabled={index === filteredGallery.length - 1}
                      onClick={async () => {
                        const next = filteredGallery[index + 1];
                        if (!next) return;
                        await api.updateGallery(g.id, { sort: next.sort ?? 0 });
                        await api.updateGallery(next.id, { sort: g.sort ?? 0 });
                        load();
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <img
                  src={g.imageUrl}
                  alt={g.title}
                  className={`h-36 w-full rounded-xl object-cover ${g.hidden ? 'opacity-50' : ''}`}
                />
                <input
                  className="input mt-2"
                  value={g.title}
                  onChange={(e) =>
                    setGallery((list) => list.map((x) => (x.id === g.id ? { ...x, title: e.target.value } : x)))
                  }
                />
                <input
                  className="input mt-2"
                  value={g.imageUrl}
                  onChange={(e) =>
                    setGallery((list) => list.map((x) => (x.id === g.id ? { ...x, imageUrl: e.target.value } : x)))
                  }
                />
                <input
                  className="input mt-2"
                  value={g.description ?? ''}
                  onChange={(e) =>
                    setGallery((list) =>
                      list.map((x) => (x.id === g.id ? { ...x, description: e.target.value } : x)),
                    )
                  }
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      api
                        .updateGallery(g.id, {
                          title: g.title,
                          imageUrl: g.imageUrl,
                          description: g.description ?? '',
                          sort: index + 1,
                        })
                        .then(load)
                    }
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      api.updateGallery(g.id, { hidden: !g.hidden }).then(load)
                    }
                  >
                    {g.hidden ? '取消隐藏' : '隐藏'}
                  </button>
                  <label className="btn-ghost cursor-pointer">
                    上传图
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const up = await api.adminUpload(file);
                        await api.updateGallery(g.id, { imageUrl: up.url });
                        load();
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-ghost text-red-600"
                    onClick={() => {
                      if (confirm('删除该画作？')) api.deleteGallery(g.id).then(load);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'about' && (
        <form onSubmit={saveAbout} className="card space-y-3 p-6">
          <input className="input" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} />
          <textarea
            className="input min-h-[240px] font-mono text-sm"
            value={aboutContent}
            onChange={(e) => setAboutContent(e.target.value)}
          />
          <button type="submit" className="btn">
            保存关于内容
          </button>
        </form>
      )}
    </div>
  );
}
