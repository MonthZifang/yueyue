import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface PostInput {
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover?: string | null;
  status: string;
  tagIds?: number[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listPosts(includeDrafts = true) {
    return this.prisma.post.findMany({
      where: includeDrafts ? {} : { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      include: { tags: true, _count: { select: { comments: true, likes: true } } },
    });
  }

  async getPost(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!post) throw new NotFoundException('文章不存在');
    return post;
  }

  /** 自动 slug：从 1000 起顺序分配；删除文章后编号标记失效但不复用 */
  async nextAutoSlug(): Promise<string> {
    const last = await this.prisma.usedSlug.findFirst({
      orderBy: { code: 'desc' },
    });
    let code = (last?.code ?? 999) + 1;
    // 若存在但未记录的历史 slug（如手工写入），继续向后找空闲
    for (let i = 0; i < 50; i += 1) {
      const slug = String(code);
      const used = await this.prisma.usedSlug.findUnique({ where: { code } });
      const clash = await this.prisma.post.findUnique({ where: { slug } });
      if (!used && !clash) {
        await this.prisma.usedSlug.create({
          data: { code, slug, expired: false },
        });
        return slug;
      }
      code += 1;
    }
    throw new BadRequestException('无法分配自动 slug');
  }
  async createPost(input: PostInput) {
    if (!['draft', 'published'].includes(input.status || 'draft')) {
      throw new BadRequestException('status 只能是 draft 或 published');
    }
    let slug = (input.slug || '').trim();
    if (!slug) {
      slug = await this.nextAutoSlug();
    }
    const exists = await this.prisma.post.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('slug 已存在');
    await this.prisma.usedSlug.upsert({
      where: { slug },
      update: {},
      create: { slug, code: parseInt(slug, 10) || 0 },
    });
    return this.prisma.post.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        content: input.content,
        cover: input.cover ?? null,
        status: input.status || 'draft',
        publishedAt: input.status === 'published' ? new Date() : null,
        tags: input.tagIds?.length
          ? { connect: input.tagIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { tags: true },
    });
  }

  async updatePost(id: number, input: Partial<PostInput>) {
    const existing = await this.getPost(id);
    if (input.status && !['draft', 'published'].includes(input.status)) {
      throw new BadRequestException('status 只能是 draft 或 published');
    }
    if (input.slug && input.slug !== existing.slug) {
      const clash = await this.prisma.post.findUnique({ where: { slug: input.slug } });
      if (clash) throw new ConflictException('slug 已存在');
    }
    const data: Parameters<typeof this.prisma.post.update>[0]['data'] = {
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      content: input.content,
      cover: input.cover,
      status: input.status,
      tags: input.tagIds
        ? { set: input.tagIds.map((tid) => ({ id: tid })) }
        : undefined,
    };

    if (input.status === 'published' && existing.status !== 'published') {
      data.publishedAt = new Date();
    } else if (input.status === 'draft') {
      data.publishedAt = null;
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: { tags: true },
    });
  }

  async deletePost(id: number) {
    const post = await this.getPost(id);
    await this.prisma.post.delete({ where: { id } });
    await this.prisma.usedSlug.updateMany({
      where: { slug: post.slug },
      data: { expired: true, postId: null },
    });
    return { ok: true };
  }

  createTag(name: string, slug: string) {
    return this.prisma.tag.create({ data: { name, slug } });
  }

  async deleteTag(id: number) {
    const row = await this.prisma.tag.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('标签不存在');
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }

  createFriend(data: {
    name: string;
    url: string;
    avatar?: string;
    description?: string;
    sort?: number;
  }) {
    return this.prisma.friendLink.create({ data });
  }

  async updateFriend(
    id: number,
    data: Partial<{ name: string; url: string; avatar: string; description: string; sort: number }>,
  ) {
    await this.prisma.friendLink.findUniqueOrThrow({ where: { id } });
    return this.prisma.friendLink.update({ where: { id }, data });
  }

  async deleteFriend(id: number) {
    const row = await this.prisma.friendLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('友链不存在');
    await this.prisma.friendLink.delete({ where: { id } });
    return { ok: true };
  }

  createProject(data: {
    title: string;
    description: string;
    url?: string;
    techStack?: string;
    cover?: string;
    sort?: number;
  }) {
    return this.prisma.project.create({ data });
  }

  async updateProject(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      url: string;
      techStack: string;
      cover: string;
      sort: number;
    }>,
  ) {
    await this.prisma.project.findUniqueOrThrow({ where: { id } });
    return this.prisma.project.update({ where: { id }, data });
  }

  async deleteProject(id: number) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('项目不存在');
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  createGallery(data: {
    title: string;
    imageUrl: string;
    description?: string;
    sort?: number;
  }) {
    return this.prisma.galleryItem.create({ data });
  }

  async deleteGallery(id: number) {
    const row = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('画廊项不存在');
    await this.prisma.galleryItem.delete({ where: { id } });
    return { ok: true };
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
