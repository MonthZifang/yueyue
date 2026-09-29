export interface Tag {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export interface Comment {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  comments?: Comment[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GuestbookItem {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  avatar?: string | null;
  description?: string | null;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  url?: string | null;
  techStack?: string | null;
  cover?: string | null;
}

export interface GalleryItem {
  id: number;
  title: string;
  imageUrl: string;
  description?: string | null;
}

export interface About {
  id: number;
  title: string;
  content: string;
}

export interface ArchiveGroup {
  month: string;
  items: Pick<Post, 'id' | 'title' | 'slug' | 'summary' | 'publishedAt' | 'tags'>[];
}
