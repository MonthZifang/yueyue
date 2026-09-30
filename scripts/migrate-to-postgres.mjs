/**
 * 将 SQLite 数据与磁盘 uploads 迁入 PostgreSQL + Media 表。
 * 用法：node scripts/migrate-to-postgres.mjs
 */
import { execFileSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { PrismaClient } from '@prisma/client';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const sqlitePath =
  process.env.SQLITE_PATH || join(root, 'backend/prisma/dev.db');
const uploadsDir = process.env.UPLOADS_DIR || join(root, 'backend/uploads');

const prisma = new PrismaClient();

function dumpJson(table) {
  try {
    const out = execFileSync(
      'sqlite3',
      [sqlitePath, `-json`, `SELECT * FROM ${table};`],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return out.trim() ? JSON.parse(out) : [];
  } catch (e) {
    console.warn(`dump ${table} failed`, String(e).slice(0, 120));
    return [];
  }
}

async function main() {
  console.log('sqlite:', sqlitePath);
  console.log('uploads:', uploadsDir);

  // ---- 媒体：磁盘文件入库 ----
  if (existsSync(uploadsDir)) {
    for (const name of readdirSync(uploadsDir)) {
      if (name.startsWith('.')) continue;
      const full = join(uploadsDir, name);
      if (!statSync(full).isFile()) continue;
      const exists = await prisma.media.findUnique({ where: { filename: name } });
      if (exists) continue;
      const data = readFileSync(full);
      const ext = (name.split('.').pop() || 'bin').toLowerCase();
      const mime =
        ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : 'application/octet-stream';
      await prisma.media.create({
        data: { filename: name, mime, size: data.length, data },
      });
      console.log('media <-', name, data.length);
    }
  }

  // ---- 站点设置 ----
  for (const r of dumpJson('SiteSetting')) {
    await prisma.siteSetting.upsert({
      where: { id: r.id ?? 1 },
      update: r,
      create: r,
    });
  }

  // ---- 用户 ----
  for (const r of dumpJson('User')) {
    await prisma.user.upsert({
      where: { id: r.id },
      update: {
        username: r.username,
        passwordHash: r.passwordHash,
        displayName: r.displayName,
        email: r.email,
        avatarUrl: r.avatarUrl,
        ssoUserId: r.ssoUserId,
        ssoPublicId: r.ssoPublicId,
        isRoot: Boolean(r.isRoot),
      },
      create: {
        id: r.id,
        username: r.username,
        passwordHash: r.passwordHash,
        displayName: r.displayName,
        email: r.email,
        avatarUrl: r.avatarUrl,
        ssoUserId: r.ssoUserId,
        ssoPublicId: r.ssoPublicId,
        isRoot: Boolean(r.isRoot),
      },
    });
  }

  // ---- 标签 ----
  for (const r of dumpJson('Tag')) {
    await prisma.tag.upsert({
      where: { id: r.id },
      update: { name: r.name, slug: r.slug },
      create: { id: r.id, name: r.name, slug: r.slug },
    });
  }

  // ---- 文章 ----
  for (const r of dumpJson('Post')) {
    const data = {
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      content: r.content,
      cover: r.cover,
      status: r.status,
      viewCount: r.viewCount ?? 0,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    };
    const exists = await prisma.post.findUnique({ where: { slug: r.slug } });
    if (exists) await prisma.post.update({ where: { id: r.id }, data });
    else await prisma.post.create({ data: { id: r.id, ...data } });
  }

  // 关联标签
  for (const r of dumpJson('_PostToTag')) {
    await prisma.post
      .update({
        where: { id: r.A ?? r.a },
        data: { tags: { connect: [{ id: r.B ?? r.b }] } },
      })
      .catch(() => undefined);
  }

  // ---- 评论 / 点赞 / 阅读 / 留言 ----
  for (const r of dumpJson('Comment')) {
    await prisma.comment.create({
      data: {
        id: r.id,
        postId: r.postId,
        nickname: r.nickname,
        content: r.content,
        avatarUrl: r.avatarUrl,
        email: r.email,
        userId: r.userId,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      },
    }).catch(() => undefined);
  }
  for (const r of dumpJson('Like')) {
    await prisma.like
      .create({
        data: {
          id: r.id,
          postId: r.postId,
          fingerprint: r.fingerprint,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        },
      })
      .catch(() => undefined);
  }
  for (const r of dumpJson('PostView')) {
    await prisma.postView
      .create({
        data: {
          id: r.id,
          postId: r.postId,
          fingerprint: r.fingerprint,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        },
      })
      .catch(() => undefined);
  }
  for (const r of dumpJson('Guestbook')) {
    await prisma.guestbook
      .create({
        data: {
          id: r.id,
          nickname: r.nickname,
          content: r.content,
          avatarUrl: r.avatarUrl,
          email: r.email,
          userId: r.userId,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        },
      })
      .catch(() => undefined);
  }

  // ---- 友链 / 项目 / 画廊 / 关于 / 组 ----
  for (const r of dumpJson('FriendLink')) {
    await prisma.friendLink
      .create({ data: r })
      .catch(() => undefined);
  }
  for (const r of dumpJson('Project')) {
    await prisma.project
      .create({
        data: {
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        },
      })
      .catch(() => undefined);
  }
  for (const r of dumpJson('GalleryItem')) {
    await prisma.galleryItem.create({ data: r }).catch(() => undefined);
  }
  for (const r of dumpJson('About')) {
    await prisma.about
      .upsert({ where: { id: r.id }, update: r, create: r })
      .catch(() => undefined);
  }
  for (const r of dumpJson('Group')) {
    await prisma.group
      .create({
        data: {
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        },
      })
      .catch(() => undefined);
  }

  const media = await prisma.media.count();
  console.log('done. media count =', media);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
