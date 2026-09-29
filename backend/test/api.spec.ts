import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Blog API', () => {
  let app: INestApplication;
  let token: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/posts lists published posts', async () => {
    const res = await request(app.getHttpServer()).get('/api/posts').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items[0].slug).toBeDefined();
  });

  it('GET /api/posts/:slug returns detail', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/posts/welcome-to-yueyuedao')
      .expect(200);
    expect(res.body.title).toContain('欢迎');
  });

  it('POST comment requires auth and like works', async () => {
    await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/comments')
      .send({ content: '匿名应被拒绝' })
      .expect(401);

    // 本地登录已停用
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'yueyuedao2026' })
      .expect(403);

    // 构造一个本地测试用户令牌用于互动 API
    const user = await prisma.user.upsert({
      where: { username: 'tester' },
      update: {},
      create: {
        username: 'tester',
        passwordHash: 'x',
        displayName: 'Tester',
      },
    });
    const jwt = app.get(JwtService);
    token = await jwt.signAsync({ sub: user.id, username: user.username });

    await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '来自登录用户的评论' })
      .expect(201);

    const like = await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/like')
      .send({ fingerprint: `test-fingerprint-${Date.now()}` })
      .expect(201);
    expect(like.body.liked).toBe(true);
    expect(like.body.likeCount).toBeGreaterThanOrEqual(1);
  });

  it('non-root user cannot access admin', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('root user can access admin after promotion', async () => {
    await prisma.user.updateMany({ data: { isRoot: true } });
    const list = await request(app.getHttpServer())
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
  });

  it('guestbook requires auth', async () => {
    await request(app.getHttpServer())
      .post('/api/guestbook')
      .send({ content: '留言板冒烟测试' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/guestbook')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '留言板冒烟测试' })
      .expect(201);
  });

  it('guestbook, tags, about, archive, friends, projects, gallery are available', async () => {
    await request(app.getHttpServer()).get('/api/tags').expect(200);
    await request(app.getHttpServer()).get('/api/about').expect(200);
    await request(app.getHttpServer()).get('/api/guestbook').expect(200);
    await request(app.getHttpServer()).get('/api/archive').expect(200);
    await request(app.getHttpServer()).get('/api/friends').expect(200);
    await request(app.getHttpServer()).get('/api/projects').expect(200);
    await request(app.getHttpServer()).get('/api/gallery').expect(200);
  });

  it('liked state is returned with fingerprint', async () => {
    const fp = `fp-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/like')
      .send({ fingerprint: fp })
      .expect(201);
    const detail = await request(app.getHttpServer())
      .get(`/api/posts/welcome-to-yueyuedao?fingerprint=${fp}`)
      .expect(200);
    expect(detail.body.liked).toBe(true);
  });

  it('rejects invalid admin post payload', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'x',
        slug: 'welcome-to-yueyuedao',
        summary: 'x',
        content: 'x',
        status: 'published',
      })
      .expect(409);
  });

  it('projects search and nav work', async () => {
    const nav = await request(app.getHttpServer()).get('/api/projects/nav').expect(200);
    expect(Array.isArray(nav.body)).toBe(true);
    const search = await request(app.getHttpServer())
      .get('/api/projects/search?q=博客')
      .expect(200);
    expect(Array.isArray(search.body)).toBe(true);
  });

  it('admin tools dns rejects bad domain and requires auth', async () => {
    await request(app.getHttpServer()).get('/api/admin/tools/dns?domain=api.github.com').expect(401);

    await request(app.getHttpServer())
      .get('/api/admin/tools/dns?domain=not_a_host!!')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('sso status returns enabled flag', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/sso/status').expect(200);
    expect(typeof res.body.enabled).toBe('boolean');
  });

  it('git sources require root', async () => {
    await prisma.user.updateMany({ data: { isRoot: false } });
    await request(app.getHttpServer())
      .get('/api/admin/git/sources')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
