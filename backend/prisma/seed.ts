import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 不再创建默认本地管理员；登录统一走 SSO，root 由 SSO user_id=0 判定。
  await prisma.user.deleteMany({
    where: {
      OR: [{ username: 'admin' }, { ssoUserId: null }],
    },
  });

  const tagNames = ['技术', '随笔', '二次元', '笔记'];
  const tags: Record<string, { id: number; name: string; slug: string }> = {};
  for (const name of tagNames) {
    const slug = name === '技术' ? 'tech' : name === '随笔' ? 'essay' : name === '二次元' ? 'anime' : 'notes';
    tags[name] = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug },
    });
  }

  const posts = [
    {
      title: '欢迎来到月月岛',
      slug: 'welcome-to-yueyuedao',
      summary: '在清透的风与墨绿的电路之间，记录代码与生活。',
      content: `# 欢迎来到月月岛

这是**月月岛科技**的个人博客。这里会分享技术笔记、二次元随想，以及一些项目手记。

## 这里有什么

- 技术文章与实践笔记
- 二次元相关随笔
- 项目与作品展示

> 愿你在月色与海风里，写出自己的航线。

\`\`\`ts
console.log('Hello, Yueyuedao!');
\`\`\`
`,
      cover: '/assets/hero.png',
      status: 'published',
      tags: ['随笔', '二次元'],
    },
    {
      title: '用 NestJS + Prisma 搭一个博客 API',
      slug: 'nestjs-prisma-blog-api',
      summary: '从 schema 到接口，快速搭好博客后端。',
      content: `# 用 NestJS + Prisma 搭一个博客 API

个人博客后端选型要轻、可维护。NestJS 提供清晰模块边界，Prisma 让数据层可预期。

## 步骤

1. 定义 schema
2. 生成 client
3. 编写模块与 DTO
4. 种子数据

\`\`\`prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
}
\`\`\`

完成后用 supertest 覆盖关键路径即可放心迭代。
`,
      cover: '/assets/hero.png',
      status: 'published',
      tags: ['技术', '笔记'],
    },
    {
      title: '二次元网站的视觉层次',
      slug: 'anime-visual-hierarchy',
      summary: '清透明亮不是堆颜色，而是留白、点缀与呼吸感。',
      content: `# 二次元网站的视觉层次

好的二次元站点不靠满屏特效，而靠：

1. **一张主视觉**说话
2. **一个 accent** 点睛
3. **一致的圆角与间距**

墨绿点缀在浅色底上很安静，也很耐看。
`,
      cover: '/assets/hero.png',
      status: 'published',
      tags: ['二次元', '技术'],
    },
    {
      title: '草稿：下一篇想写的',
      slug: 'draft-next',
      summary: '尚未发布的草稿示例。',
      content: '# 草稿\n\n还在写。',
      status: 'draft',
      tags: ['笔记'],
    },
  ];

  for (const p of posts) {
    const created = await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        content: p.content,
        cover: p.cover ?? null,
        status: p.status,
        publishedAt: p.status === 'published' ? new Date() : null,
        tags: {
          connect: p.tags.map((t) => ({ id: tags[t].id })),
        },
      },
    });

    // 不写入测试评论
  }

  if ((await prisma.friendLink.count()) === 0) {
    // 友链由后台手动添加，不写测试/示例数据
  }

  if ((await prisma.project.count()) === 0) {
    await prisma.project.createMany({
      data: [
        {
          title: '月月岛博客',
          description: '二次元风格个人博客，React + NestJS。',
          url: 'https://github.com/example/yueyuedao-blog',
          techStack: 'React, NestJS, Prisma, SQLite',
          sort: 1,
        },
        {
          title: '终端小工具集',
          description: '效率向 CLI 合集。',
          url: 'https://github.com/example/cli-tools',
          techStack: 'Node.js',
          sort: 2,
        },
      ],
    });
  }

  if ((await prisma.galleryItem.count()) === 0) {
    await prisma.galleryItem.createMany({
      data: [
        {
          title: '主视觉',
          imageUrl: '/assets/hero.png',
          description: '阳台上的白发少女与城市远景',
          sort: 1,
        },
        {
          title: '品牌标识',
          imageUrl: '/assets/logo.png',
          description: '月月岛科技 Logo',
          sort: 2,
        },
        {
          title: 'Q 版吉祥物',
          imageUrl: '/assets/mascot.png',
          description: '手持咖啡的 Q 版形象',
          sort: 3,
        },
      ],
    });
  }

  // 清理测试评论 / 点赞 / 留言
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.guestbook.deleteMany();

  await prisma.about.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: '关于月月岛',
      content: `# 关于

**月月岛科技 / YUEYUEDAO TECH** 是一个以清透二次元美学为基调的创作与技术品牌。

这里是我的个人博客：写代码、画画、记录喜欢的作品。
`,
    },
  });

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      heroKicker: 'YUEYUEDAO TECH',
      heroTitle: '在清透的风与\n墨绿的电路之间',
      heroSubtitle: '记录代码、二次元与生活的小站。',
      heroImage: '/assets/hero.png',
      siteName: '月月岛',
      footerNote: '以清透的风写代码与梦',
      aboutTitle: '关于月月岛',
      commentRequireSso: true,
    },
  });

  // 移除画廊中的「林间猫耳」
  await prisma.galleryItem.deleteMany({
    where: {
      OR: [
        { title: '林间猫耳' },
        { title: '林间白猫' },
        { imageUrl: { contains: 'art-cat' } },
        { imageUrl: { contains: 'art-forest' } },
      ],
    },
  });

  // 移除示例友链
  await prisma.friendLink.deleteMany({
    where: { name: { contains: '示例' } },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
