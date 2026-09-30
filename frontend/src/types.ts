export interface SiteSetting {
  id: number;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  siteName: string;
  footerNote: string;
  aboutTitle: string;
  commentRequireSso: boolean;
  viewUniqueMode?: boolean;
}

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
  avatarUrl?: string | null;
  email?: string | null;
}

export interface GuestbookItem {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover?: string | null;
  status: string;
  viewCount?: number;
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

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  avatar?: string | null;
  description?: string | null;
}

export interface GitSource {
  id: number;
  kind: string;
  name: string;
  enabled: boolean;
  autoSync?: boolean;
  hiddenNew?: boolean;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  _count?: { projects: number };
}

export interface Project {
  id: number;
  title: string;
  description: string;
  url?: string | null;
  techStack?: string | null;
  cover?: string | null;
  homepage?: string | null;
  stars?: number;
  source?: string;
  fullName?: string | null;
  customHtml?: string | null;
  customTitle?: string | null;
  customSummary?: string | null;
  bgImage?: string | null;
  showInNav?: boolean;
  navOrder?: number;
  hidden?: boolean;
  indexed?: boolean;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  comments?: Comment[];
}

export interface AllowHost {
  id: number;
  host: string;
  note?: string | null;
}

export interface GalleryItem {
  id: number;
  title: string;
  imageUrl: string;
  description?: string | null;
  sort?: number;
  hidden?: boolean;
}

export interface About {
  id: number;
  title: string;
  content: string;
}

export interface ArchiveDay {
  day: string;
  items: Pick<Post, 'id' | 'title' | 'slug' | 'summary' | 'publishedAt' | 'tags'>[];
}

export interface ArchiveMonth {
  month: string;
  days: ArchiveDay[];
}

export interface ArchiveYear {
  year: string;
  months: ArchiveMonth[];
}

export interface Group {
  id: number;
  title: string;
  kind: string;
  summary: string;
  content: string;
  url?: string | null;
  qrImage?: string | null;
  cover?: string | null;
  hidden?: boolean;
  sort?: number;
}
