import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Blog API', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
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

  it('POST comment and like work', async () => {
    await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/comments')
      .send({ nickname: 'tester', content: '来自 supertest 的评论' })
      .expect(201);

    const like = await request(app.getHttpServer())
      .post('/api/posts/welcome-to-yueyuedao/like')
      .send({ fingerprint: `test-fingerprint-${Date.now()}` })
      .expect(201);
    expect(like.body.liked).toBe(true);
    expect(like.body.likeCount).toBeGreaterThanOrEqual(1);
  });

  it('auth login and admin posts', async () => {
    const bad = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
    expect(bad.body.message).toBeDefined();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'yueyuedao2026' })
      .expect(201);
    token = login.body.token;
    expect(token).toBeTruthy();

    const unauthorized = await request(app.getHttpServer())
      .get('/api/admin/posts')
      .expect(401);
    expect(unauthorized.status).toBe(401);

    const list = await request(app.getHttpServer())
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
  });

  it('guestbook, tags, about, archive, friends, projects, gallery are available', async () => {
    await request(app.getHttpServer()).get('/api/tags').expect(200);
    await request(app.getHttpServer()).get('/api/about').expect(200);
    await request(app.getHttpServer()).get('/api/guestbook').expect(200);
    await request(app.getHttpServer()).get('/api/archive').expect(200);
    await request(app.getHttpServer()).get('/api/friends').expect(200);
    await request(app.getHttpServer()).get('/api/projects').expect(200);
    await request(app.getHttpServer()).get('/api/gallery').expect(200);

    const post = await request(app.getHttpServer())
      .post('/api/guestbook')
      .send({ nickname: 'tester', content: '留言板冒烟测试' })
      .expect(201);
    expect(post.body.nickname).toBe('tester');
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
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'yueyuedao2026' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/admin/posts')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({
        title: 'x',
        slug: 'welcome-to-yueyuedao',
        summary: 'x',
        content: 'x',
        status: 'published',
      })
      .expect(409);
  });
});
