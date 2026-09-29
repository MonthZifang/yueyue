import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const published = { status: 'published' as const };

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getPost(slug: string, fingerprint?: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, ...published },
      include: {
        tags: true,
        comments: { orderBy: { createdAt: 'desc' } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new NotFoundException('文章不存在');
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
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      liked,
      _count: undefined,
    };
  }

  async listComments(slug: string) {
    const post = await this.prisma.post.findFirst({ where: { slug, ...published } });
    if (!post) throw new NotFoundException('文章不存在');
    return this.prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(slug: string, nickname: string, content: string) {
    const post = await this.prisma.post.findFirst({ where: { slug, ...published } });
    if (!post) throw new NotFoundException('文章不存在');
    if (!nickname.trim() || !content.trim() || content.length > 500) {
      throw new BadRequestException('昵称或评论内容不合法');
    }
    return this.prisma.comment.create({
      data: { postId: post.id, nickname: nickname.trim(), content: content.trim() },
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
    const groups: Record<string, typeof posts> = {};
    for (const p of posts) {
      const key = p.publishedAt
        ? `${p.publishedAt.getFullYear()}-${String(p.publishedAt.getMonth() + 1).padStart(2, '0')}`
        : '未分类';
      (groups[key] ||= []).push(p);
    }
    return Object.entries(groups).map(([month, items]) => ({ month, items }));
  }

  listGuestbook() {
    return this.prisma.guestbook.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addGuestbook(nickname: string, content: string) {
    if (!nickname.trim() || !content.trim() || content.length > 500) {
      throw new BadRequestException('昵称或留言内容不合法');
    }
    return this.prisma.guestbook.create({
      data: { nickname: nickname.trim(), content: content.trim() },
    });
  }

  async friends() {
    return this.prisma.friendLink.findMany({ orderBy: { sort: 'asc' } });
  }

  async projects() {
    return this.prisma.project.findMany({ orderBy: { sort: 'asc' } });
  }

  async gallery() {
    return this.prisma.galleryItem.findMany({ orderBy: { sort: 'asc' } });
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
}
