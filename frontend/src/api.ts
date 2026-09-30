import axios from 'axios';
import type {
  About,
  AllowHost,
  ArchiveYear,
  Comment,
  FriendLink,
  GalleryItem,
  GitSource,
  GuestbookItem,
  Paged,
  Post,
  Project,
  SiteSetting,
  Tag,
} from './types';

const client = axios.create({ baseURL: '/api' });

function readPersistedToken(): string | null {
  try {
    const raw = localStorage.getItem('yueyuedao-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

client.interceptors.request.use((config) => {
  const token = readPersistedToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    if (status === 401 && url.includes('/admin')) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);

export function setToken(token: string | null) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}

export const api = {
  listPosts: (params?: { tag?: string; page?: number; pageSize?: number; q?: string }) =>
    client.get<Paged<Post>>('/posts', { params }).then((r) => r.data),
  getPost: (slug: string, fingerprint?: string, countView?: boolean) =>
    client
      .get<Post>(`/posts/${slug}`, {
        params: {
          ...(fingerprint ? { fingerprint } : {}),
          ...(countView ? { view: 1 } : {}),
        },
      })
      .then((r) => r.data),
  listComments: (slug: string) =>
    client.get(`/posts/${slug}/comments`).then((r) => r.data as Comment[]),
  addComment: (slug: string, content: string) =>
    client.post(`/posts/${slug}/comments`, { content }).then((r) => r.data),
  like: (slug: string, fingerprint: string) =>
    client.post(`/posts/${slug}/like`, { fingerprint }).then((r) => r.data as { likeCount: number; liked: boolean }),
  tags: () => client.get<Tag[]>('/tags').then((r) => r.data),
  archive: () => client.get<ArchiveYear[]>('/archive').then((r) => r.data),
  guestbook: () => client.get<GuestbookItem[]>('/guestbook').then((r) => r.data),
  addGuestbook: (content: string) =>
    client.post('/guestbook', { content }).then((r) => r.data),
  friends: () => client.get<FriendLink[]>('/friends').then((r) => r.data),
  projects: () => client.get<Project[]>('/projects').then((r) => r.data),
  gallery: () => client.get<GalleryItem[]>('/gallery').then((r) => r.data),
  about: () => client.get<About>('/about').then((r) => r.data),
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }).then((r) => r.data as { token: string; user: { id: number; username: string; displayName: string } }),
  me: () =>
    client
      .get<{
        id: number;
        username: string;
        displayName: string;
        email?: string | null;
        avatarUrl?: string | null;
        isRoot: boolean;
      }>('/auth/me')
      .then((r) => r.data),
  adminListPosts: () => client.get<Post[]>('/admin/posts').then((r) => r.data),
  adminCreatePost: (body: Partial<Post> & { tagIds?: number[] }) =>
    client.post('/admin/posts', body).then((r) => r.data),
  adminUpdatePost: (id: number, body: Partial<Post> & { tagIds?: number[] }) =>
    client.patch(`/admin/posts/${id}`, body).then((r) => r.data),
  adminDeletePost: (id: number) => client.delete(`/admin/posts/${id}`).then((r) => r.data),
  adminUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<{ url: string }>('/admin/upload', form).then((r) => r.data);
  },
  ssoStatus: () => client.get<{ enabled: boolean }>('/auth/sso/status').then((r) => r.data),
  ssoLogin: (returnTo?: string) =>
    client
      .get<{ url: string }>('/auth/sso/login', { params: returnTo ? { returnTo } : undefined })
      .then((r) => r.data),
  getProject: (id: number, fingerprint?: string, countView?: boolean) =>
    client.get<Project>('/projects/detail/' + id, { params: { fingerprint, view: countView ? 1 : undefined } }).then((r) => r.data),
  likeProject: (id: number, fingerprint: string) =>
    client.post('/projects/' + id + '/like', { fingerprint }).then((r) => r.data),
  addProjectComment: (id: number, content: string) =>
    client.post('/projects/' + id + '/comments', { content }).then((r) => r.data),
  searchProjects: (q?: string, source?: string) =>
    client.get<Project[]>('/projects/search', { params: { q, source } }).then((r) => r.data),
  navProjects: () => client.get<Project[]>('/projects/nav').then((r) => r.data),
  listGitSources: () => client.get<GitSource[]>('/admin/git/sources').then((r) => r.data),
  addGitSource: (kind: string, name: string, options?: { autoSync?: boolean; hiddenNew?: boolean }) =>
    client.post('/admin/git/sources', { kind, name, ...options }).then((r) => r.data),
  patchGitSource: (id: number, body: Record<string, unknown>) =>
    client.post(`/admin/git/sources/${id}`, body).then((r) => r.data),
  removeGitSource: (id: number) =>
    client.delete(`/admin/git/sources/${id}`).then((r) => r.data),
  syncGitSource: (id: number) =>
    client.post(`/admin/git/sources/${id}/sync`).then((r) => r.data),
  syncAllGit: () => client.post('/admin/git/sync-all').then((r) => r.data),
  adminListProjects: (q?: string, source?: string) =>
    client.get<Project[]>('/admin/git/projects', { params: { q, source } }).then((r) => r.data),
  createManualProject: (body: Record<string, unknown>) =>
    client.post<Project>('/admin/projects', body).then((r) => r.data),
  patchProjectNav: (id: number, body: Record<string, unknown>) =>
    client.post<Project>(`/admin/projects/${id}/nav`, body).then((r) => r.data),
  deleteProject: (id: number) => client.delete(`/admin/projects/${id}`).then((r) => r.data),
  listAllowHosts: () => client.get('/admin/tools/proxy/allowlist').then((r) => r.data as AllowHost[]),
  addAllowHost: (host: string, note?: string) =>
    client.post('/admin/tools/proxy/allowlist', { host, note }).then((r) => r.data),
  removeAllowHost: (id: number) =>
    client.delete(`/admin/tools/proxy/allowlist/${id}`).then((r) => r.data),
  dnsLookup: (domain: string, dnsProfileId?: number) =>
    client.get('/admin/tools/dns', { params: { domain, dnsProfileId } }).then((r) => r.data),
  proxyFetch: (url: string, proxyProfileId?: number) =>
    client.post('/admin/tools/proxy', { url, proxyProfileId }).then((r) => r.data),
  listDnsProfiles: () => client.get('/admin/tools/dns/profiles').then((r) => r.data),
  createDnsProfile: (name: string, servers: string) =>
    client.post('/admin/tools/dns/profiles', { name, servers }).then((r) => r.data),
  patchDnsProfile: (id: number, body: Record<string, unknown>) =>
    client.post(`/admin/tools/dns/profiles/${id}`, body).then((r) => r.data),
  deleteDnsProfile: (id: number) =>
    client.delete(`/admin/tools/dns/profiles/${id}`).then((r) => r.data),
  listProxyProfiles: () => client.get('/admin/tools/proxy/profiles').then((r) => r.data),
  createProxyProfile: (body: Record<string, unknown>) =>
    client.post('/admin/tools/proxy/profiles', body).then((r) => r.data),
  patchProxyProfile: (id: number, body: Record<string, unknown>) =>
    client.post(`/admin/tools/proxy/profiles/${id}`, body).then((r) => r.data),
  deleteProxyProfile: (id: number) =>
    client.delete(`/admin/tools/proxy/profiles/${id}`).then((r) => r.data),
  viewStats: () => client.get('/admin/views').then((r) => r.data),
  resetViews: (postId: number) =>
    client.post(`/admin/views/${postId}/reset`).then((r) => r.data),
  toolAudit: (limit = 50) =>
    client.get('/admin/tools/audit', { params: { limit } }).then((r) => r.data),
  site: () => client.get<SiteSetting>('/site').then((r) => r.data),
  adminSite: () => client.get<SiteSetting>('/admin/site').then((r) => r.data),
  updateSite: (body: Partial<SiteSetting>) =>
    client.patch<SiteSetting>('/admin/site', body).then((r) => r.data),
  adminTags: () => client.get('/admin/tags').then((r) => r.data as Tag[]),
  createTag: (name: string, slug?: string) =>
    client.post('/admin/tags', { name, slug }).then((r) => r.data),
  deleteTag: (id: number) => client.delete(`/admin/tags/${id}`).then((r) => r.data),
  adminFriends: () => client.get('/admin/friends').then((r) => r.data as FriendLink[]),
  createFriend: (body: Record<string, unknown>) =>
    client.post('/admin/friends', body).then((r) => r.data),
  updateFriend: (id: number, body: Record<string, unknown>) =>
    client.patch(`/admin/friends/${id}`, body).then((r) => r.data),
  deleteFriend: (id: number) => client.delete(`/admin/friends/${id}`).then((r) => r.data),
  adminGallery: () => client.get('/admin/gallery').then((r) => r.data as GalleryItem[]),
  createGallery: (body: Record<string, unknown>) =>
    client.post('/admin/gallery', body).then((r) => r.data),
  updateGallery: (id: number, body: Record<string, unknown>) =>
    client.patch(`/admin/gallery/${id}`, body).then((r) => r.data),
  deleteGallery: (id: number) => client.delete(`/admin/gallery/${id}`).then((r) => r.data),
  updateAbout: (title: string, content: string) =>
    client.patch('/admin/about', { title, content }).then((r) => r.data),
};

export type { Comment };
