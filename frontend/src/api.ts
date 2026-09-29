import axios from 'axios';
import type {
  About,
  ArchiveGroup,
  Comment,
  FriendLink,
  GalleryItem,
  GuestbookItem,
  Paged,
  Post,
  Project,
  Tag,
} from './types';

const client = axios.create({ baseURL: '/api' });

export function setToken(token: string | null) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}

export const api = {
  listPosts: (params?: { tag?: string; page?: number; pageSize?: number }) =>
    client.get<Paged<Post>>('/posts', { params }).then((r) => r.data),
  getPost: (slug: string, fingerprint?: string) =>
    client
      .get<Post>(`/posts/${slug}`, { params: fingerprint ? { fingerprint } : undefined })
      .then((r) => r.data),
  listComments: (slug: string) =>
    client.get(`/posts/${slug}/comments`).then((r) => r.data as Comment[]),
  addComment: (slug: string, nickname: string, content: string) =>
    client.post(`/posts/${slug}/comments`, { nickname, content }).then((r) => r.data),
  like: (slug: string, fingerprint: string) =>
    client.post(`/posts/${slug}/like`, { fingerprint }).then((r) => r.data as { likeCount: number; liked: boolean }),
  tags: () => client.get<Tag[]>('/tags').then((r) => r.data),
  archive: () => client.get<ArchiveGroup[]>('/archive').then((r) => r.data),
  guestbook: () => client.get<GuestbookItem[]>('/guestbook').then((r) => r.data),
  addGuestbook: (nickname: string, content: string) =>
    client.post('/guestbook', { nickname, content }).then((r) => r.data),
  friends: () => client.get<FriendLink[]>('/friends').then((r) => r.data),
  projects: () => client.get<Project[]>('/projects').then((r) => r.data),
  gallery: () => client.get<GalleryItem[]>('/gallery').then((r) => r.data),
  about: () => client.get<About>('/about').then((r) => r.data),
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }).then((r) => r.data as { token: string; user: { id: number; username: string; displayName: string } }),
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
};

export type { Comment };
