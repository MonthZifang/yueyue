import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

const published = { status: 'published' as const };

export interface SiteSettingDto {
  heroKicker?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  siteName?: string;
  footerNote?: string;
  aboutTitle?: string;
  commentRequireSso?: boolean;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async siteSettings() {
    let row = await this.prisma.siteSetting.findFirst();
    if (!row) {
      row = await this.prisma.siteSetting.create({ data: {} });
    }
    return row;
  }

  async updateSiteSettings(dto: SiteSettingDto) {
    const current = await this.siteSettings();
    return this.prisma.siteSetting.update({
      where: { id: current.id },
      data: {
        heroKicker: dto.heroKicker,
        heroTitle: dto.heroTitle,
        heroSubtitle: dto.heroSubtitle,
        heroImage: dto.heroImage,
        siteName: dto.siteName,
        footerNote: dto.footerNote,
        aboutTitle: dto.aboutTitle,
        commentRequireSso: dto.commentRequireSso,
      },
    });
  }

  async listPosts(query: { tag?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const where = {
      ...published,
      ...(query.tag
        ? { tags: { some: { slug: query.tag } } }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tags: true,
          _count: { select: { comments: true, likes: true } },
        },
      }),
    ]);
    return {
      items: items.map((p) => ({
        ...p,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        _count: undefined,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getPost(slug: string, fingerprint?: string, countView = false) {
    const post = await this.prisma.post.findFirst({
      where: { slug, ...published },
      include: {
        tags: true,
        comments: { orderBy: { createdAt: 'desc' } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new NotFoundException('文章不存在');

    let viewCount = post.viewCount;
    if (countView && fingerprint?.trim()) {
      // 同一 fingerprint 只计 1 次阅读
      const fp = fingerprint.trim();
      const exists = await this.prisma.postView.findUnique({
        where: { postId_fingerprint: { postId: post.id, fingerprint: fp } },
      });
      if (!exists) {
        await this.prisma.postView.create({
          data: { postId: post.id, fingerprint: fp },
        });
        const updated = await this.prisma.post.update({
          where: { id: post.id },
          data: { viewCount: { increment: 1 } },
          select: { viewCount: true },
        });
        viewCount = updated.viewCount;
      }
    } else if (countView) {
      // 无 fingerprint 时仍计一次，避免完全丢数
      const updated = await this.prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      viewCount = updated.viewCount;
    }

    let liked = false;
    if (fingerprint?.trim()) {
      liked = Boolean(
        await this.prisma.like.findUnique({
          where: {
            postId_fingerprint: { postId: post.id, fingerprint: fingerprint.trim() },
          },
        }),
      );
    }
    return {
      ...post,
      viewCount,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      liked,
      _count: undefined,
    };
  }

  /** 后台：重置某文阅读数（按独立访客重算） */
  async resetPostViews(postId: number) {
    const row = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!row) throw new NotFoundException('文章不存在');
    await this.prisma.postView.deleteMany({ where: { postId } });
    return this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: 0 },
    });
  }

  async viewStats() {
    const posts = await this.prisma.post.findMany({
      where: published,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        _count: { select: { views: true } },
      },
      orderBy: { viewCount: 'desc' },
    });
    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      viewCount: p.viewCount,
      uniqueViews: p._count.views,
    }));
  }

  async listComments(slug: string) {
    const post = await this.prisma.post.findFirst({ where: { slug, ...published } });
    if (!post) throw new NotFoundException('文章不存在');
    return this.prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(
    slug: string,
    content: string,
    auth: {
      sub: number;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      email?: string;
    } | null,
  ) {
    const settings = await this.siteSettings();
    if (settings.commentRequireSso && !auth) {
      throw new UnauthorizedException('请先使用 SSO 统一登录后再评论');
    }
    const post = await this.prisma.post.findFirst({ where: { slug, ...published } });
    if (!post) throw new NotFoundException('文章不存在');
    if (!content.trim() || content.length > 500) {
      throw new BadRequestException('评论内容不合法');
    }

    let nickname = '旅人';
    let avatarUrl: string | null = null;
    let email: string | null = null;
    let userId: number | null = null;
    if (auth) {
      userId = auth.sub;
      const user = await this.prisma.user.findUnique({ where: { id: auth.sub } });
      nickname = user?.displayName || auth.displayName || auth.username || nickname;
      avatarUrl = user?.avatarUrl || auth.avatarUrl || null;
      email = user?.email || auth.email || null;
    }

    return this.prisma.comment.create({
      data: {
        postId: post.id,
        nickname,
        content: content.trim(),
        avatarUrl,
        email,
        userId,
      },
    });
  }

  async like(slug: string, fingerprint: string) {
    const post = await this.prisma.post.findFirst({ where: { slug, ...published } });
    if (!post) throw new NotFoundException('文章不存在');
    if (!fingerprint?.trim()) throw new BadRequestException('缺少 fingerprint');

    const existing = await this.prisma.like.findUnique({
      where: { postId_fingerprint: { postId: post.id, fingerprint: fingerprint.trim() } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.like.create({
        data: { postId: post.id, fingerprint: fingerprint.trim() },
      });
    }
    const likeCount = await this.prisma.like.count({ where: { postId: post.id } });
    return { likeCount, liked: !existing };
  }

  async tags() {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            posts: { where: published },
          },
        },
      },
    });
    return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, count: t._count.posts }));
  }

  async allTags() {
    return this.prisma.tag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(name: string, slug?: string) {
    const cleanName = name.trim();
    if (!cleanName) throw new BadRequestException('标签名不能为空');
    const cleanSlug = (slug || cleanName.toLowerCase().replace(/\s+/g, '-')).trim();
    const exists = await this.prisma.tag.findFirst({
      where: { OR: [{ name: cleanName }, { slug: cleanSlug }] },
    });
    if (exists) throw new BadRequestException('标签已存在');
    return this.prisma.tag.create({ data: { name: cleanName, slug: cleanSlug } });
  }

  async deleteTag(id: number) {
    const row = await this.prisma.tag.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('标签不存在');
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }

  async archive() {
    const posts = await this.prisma.post.findMany({
      where: published,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        publishedAt: true,
        tags: true,
      },
    });

    type Item = (typeof posts)[number];
    const byYear = new Map<string, Map<string, Map<string, Item[]>>>();
    for (const p of posts) {
      const d = p.publishedAt ? new Date(p.publishedAt) : null;
      const y = d ? String(d.getFullYear()) : '未分类';
      const m = d ? String(d.getMonth() + 1).padStart(2, '0') : '--';
      const day = d ? String(d.getDate()).padStart(2, '0') : '--';
      if (!byYear.has(y)) byYear.set(y, new Map());
      const months = byYear.get(y)!;
      if (!months.has(m)) months.set(m, new Map());
      const days = months.get(m)!;
      if (!days.has(day)) days.set(day, []);
      days.get(day)!.push(p);
    }

    return [...byYear.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, months]) => ({
        year,
        months: [...months.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([month, days]) => ({
            month,
            days: [...days.entries()]
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([day, items]) => ({ day, items })),
          })),
      }));
  }

  listGuestbook() {
    return this.prisma.guestbook.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addGuestbook(
    content: string,
    auth: {
      sub: number;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      email?: string;
    } | null,
  ) {
    if (!auth) {
      throw new UnauthorizedException('请先使用 SSO 统一登录后再留言');
    }
    if (!content.trim() || content.length > 500) {
      throw new BadRequestException('留言内容不合法');
    }
    const user = await this.prisma.user.findUnique({ where: { id: auth.sub } });
    return this.prisma.guestbook.create({
      data: {
        nickname: user?.displayName || auth.displayName || auth.username || '旅人',
        content: content.trim(),
        avatarUrl: user?.avatarUrl || auth.avatarUrl || null,
        email: user?.email || auth.email || null,
        userId: auth.sub,
      },
    });
  }

  async friends() {
    return this.prisma.friendLink.findMany({ orderBy: { sort: 'asc' } });
  }

  async createFriend(data: {
    name: string;
    url: string;
    avatar?: string;
    description?: string;
    sort?: number;
  }) {
    return this.prisma.friendLink.create({
      data: {
        name: data.name,
        url: data.url,
        avatar: data.avatar,
        description: data.description,
        sort: data.sort ?? 0,
      },
    });
  }

  async updateFriend(
    id: number,
    data: Partial<{
      name: string;
      url: string;
      avatar: string;
      description: string;
      sort: number;
    }>,
  ) {
    const row = await this.prisma.friendLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('友链不存在');
    return this.prisma.friendLink.update({ where: { id }, data });
  }

  async deleteFriend(id: number) {
    const row = await this.prisma.friendLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('友链不存在');
    await this.prisma.friendLink.delete({ where: { id } });
    return { ok: true };
  }

  async projects() {
    return this.prisma.project.findMany({
      where: { hidden: false },
      orderBy: [{ stars: 'desc' }, { sort: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        techStack: true,
        cover: true,
        homepage: true,
        stars: true,
        source: true,
        fullName: true,
        customHtml: true,
        bgImage: true,
        showInNav: true,
        navOrder: true,
      },
    });
  }

  async getProjectById(id: number) {
    const row = await this.prisma.project.findFirst({
      where: { id, hidden: false },
    });
    if (!row) throw new NotFoundException('项目不存在');
    return row;
  }

  async gallery(includeHidden = false) {
    return this.prisma.galleryItem.findMany({
      where: includeHidden ? {} : { hidden: false },
      orderBy: { sort: 'asc' },
    });
  }

  async createGallery(data: {
    title: string;
    imageUrl: string;
    description?: string;
    sort?: number;
    hidden?: boolean;
  }) {
    return this.prisma.galleryItem.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        description: data.description,
        sort: data.sort ?? 0,
        hidden: data.hidden ?? false,
      },
    });
  }

  async updateGallery(
    id: number,
    data: Partial<{
      title: string;
      imageUrl: string;
      description: string;
      sort: number;
      hidden: boolean;
    }>,
  ) {
    const row = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('画廊项不存在');
    return this.prisma.galleryItem.update({ where: { id }, data });
  }

  async deleteGallery(id: number) {
    const row = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('画廊项不存在');
    await this.prisma.galleryItem.delete({ where: { id } });
    return { ok: true };
  }

  async about() {
    return (
      (await this.prisma.about.findFirst()) ?? {
        id: 1,
        title: '关于',
        content: '# 关于\n\n月月岛。',
      }
    );
  }

  async updateAbout(title: string, content: string) {
    const current = await this.prisma.about.findFirst();
    if (current) {
      return this.prisma.about.update({
        where: { id: current.id },
        data: { title, content },
      });
    }
    return this.prisma.about.create({ data: { id: 1, title, content } });
  }

  async deleteGuestbook(id: number) {
    const row = await this.prisma.guestbook.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('留言不存在');
    await this.prisma.guestbook.delete({ where: { id } });
    return { ok: true };
  }

  async deleteComment(id: number) {
    const row = await this.prisma.comment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('评论不存在');
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }
}
