import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ToolsService } from './tools.service';

interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  archived?: boolean;
}

@Injectable()
export class GitSyncService {
  private readonly logger = new Logger(GitSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: ToolsService,
  ) {}

  private ghHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'yueyuedao-blog',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
  }

  private async ghGet(url: string): Promise<unknown> {
    const res = await fetch(url, {
      headers: this.ghHeaders(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  listSources() {
    return this.prisma.gitSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { projects: true } } },
    });
  }

  async addSource(kind: string, name: string) {
    if (!['user', 'org'].includes(kind)) {
      throw new BadRequestException('kind 必须是 user 或 org');
    }
    const login = name.trim();
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(login)) {
      throw new BadRequestException('GitHub login 不合法');
    }
    return this.prisma.gitSource.upsert({
      where: { name_kind: { name: login, kind } },
      update: { enabled: true },
      create: { kind, name: login },
    });
  }

  async removeSource(id: number) {
    const row = await this.prisma.gitSource.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('监控源不存在');
    await this.prisma.gitSource.delete({ where: { id } });
    return { ok: true };
  }

  /** 同步某个 user/org 的公开仓库，写入/更新 Project（source=github）并建立全文索引。 */
  async syncSource(id: number) {
    const src = await this.prisma.gitSource.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('监控源不存在');

    try {
      const url =
        src.kind === 'org'
          ? `https://api.github.com/orgs/${src.name}/repos?per_page=50&sort=updated`
          : `https://api.github.com/users/${src.name}/repos?per_page=50&sort=updated`;
      const repos = (await this.ghGet(url)) as GhRepo[];
      let upserted = 0;

      for (const repo of repos) {
        if (repo.archived) continue;
        const tech = [repo.language, ...(repo.topics ?? [])].filter(Boolean).join(', ');
        const data = {
          title: repo.name,
          description: repo.description ?? '（无描述）',
          url: repo.html_url,
          techStack: tech || null,
          homepage: repo.homepage || null,
          stars: repo.stargazers_count,
          fullName: repo.full_name,
          source: 'github',
          gitSourceId: src.id,
          showInNav: false,
        };
        await this.prisma.project.upsert({
          where: { githubId: String(repo.id) },
          update: data,
          create: {
            ...data,
            githubId: String(repo.id),
            sort: 100,
            navOrder: 999,
          },
        });
        upserted += 1;
      }

      await this.prisma.gitSource.update({
        where: { id },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
      this.logger.log(`synced ${src.name}: ${upserted} repos`);
      return { ok: true, upserted };
    } catch (e) {
      const msg = String(e);
      await this.prisma.gitSource.update({
        where: { id },
        data: { lastError: msg.slice(0, 500) },
      });
      throw e instanceof Error ? e : new BadRequestException(msg);
    }
  }

  async syncAll() {
    const sources = await this.prisma.gitSource.findMany({
      where: { enabled: true },
    });
    const results: Array<Record<string, unknown>> = [];
    for (const s of sources) {
      try {
        results.push({ id: s.id, name: s.name, ...(await this.syncSource(s.id)) });
      } catch (e) {
        results.push({ id: s.id, name: s.name, ok: false, error: String(e) });
      }
    }
    return results;
  }

  /** 项目自动索引：按关键词/技术栈/来源做简单检索。 */
  async searchProjects(q?: string, source?: string) {
    const keyword = (q ?? '').trim();
    const where = {
      ...(source ? { source } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { description: { contains: keyword } },
              { techStack: { contains: keyword } },
              { fullName: { contains: keyword } },
            ],
          }
        : {}),
    };
    return this.prisma.project.findMany({
      where,
      orderBy: [{ stars: 'desc' }, { sort: 'asc' }, { updatedAt: 'desc' }],
      include: { gitSource: true },
    });
  }

  listNavProjects() {
    return this.prisma.project.findMany({
      where: { showInNav: true },
      orderBy: [{ navOrder: 'asc' }, { sort: 'asc' }],
    });
  }

  async setProjectNav(
    id: number,
    payload: { showInNav?: boolean; navOrder?: number; customHtml?: string; title?: string; description?: string },
  ) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('项目不存在');
    return this.prisma.project.update({
      where: { id },
      data: {
        showInNav: payload.showInNav,
        navOrder: payload.navOrder,
        customHtml: payload.customHtml,
        title: payload.title,
        description: payload.description,
      },
    });
  }

  async createManualProject(payload: {
    title: string;
    description: string;
    url?: string;
    techStack?: string;
    cover?: string;
    customHtml?: string;
    showInNav?: boolean;
    navOrder?: number;
    sort?: number;
  }) {
    return this.prisma.project.create({
      data: {
        title: payload.title,
        description: payload.description,
        url: payload.url,
        techStack: payload.techStack,
        cover: payload.cover,
        customHtml: payload.customHtml,
        showInNav: payload.showInNav ?? true,
        navOrder: payload.navOrder ?? 0,
        sort: payload.sort ?? 0,
        source: 'manual',
      },
    });
  }

  async deleteProject(id: number) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('项目不存在');
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }
}
