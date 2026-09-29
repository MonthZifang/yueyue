import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns/promises';
import { lookup } from 'dns/promises';
import { PrismaService } from './prisma.service';

const DEFAULT_ALLOW = ['api.github.com', 'github.com', 'raw.githubusercontent.com'];

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultAllowlist() {
    const count = await this.prisma.proxyAllowHost.count();
    if (count === 0) {
      for (const host of DEFAULT_ALLOW) {
        await this.prisma.proxyAllowHost
          .create({ data: { host, note: 'default' } })
          .catch(() => undefined);
      }
    }
  }

  async resolveDns(domain: string, actor?: string) {
    const host = domain.trim().toLowerCase();
    if (!host || !/^[a-z0-9.-]+$/i.test(host) || host.length > 253) {
      throw new BadRequestException('域名不合法');
    }
    try {
      const [records, a, aaaa, cname, mx, txt] = await Promise.all([
        dns.resolve(host).catch(() => []),
        dns.resolve4(host).catch(() => []),
        dns.resolve6(host).catch(() => []),
        dns.resolveCname(host).catch(() => []),
        dns.resolveMx(host).catch(() => []),
        dns.resolveTxt(host).catch(() => []),
      ]);
      const addr = await lookup(host).catch(() => null);
      const result = {
        host,
        lookup: addr,
        a,
        aaaa,
        cname,
        mx,
        txt: txt.flat().slice(0, 20),
        any: records,
      };
      await this.audit('dns', host, actor, true, JSON.stringify({ a, aaaa }).slice(0, 500));
      return result;
    } catch (e) {
      await this.audit('dns', host, actor, false, String(e).slice(0, 300));
      throw new BadRequestException(`DNS 查询失败：${String(e)}`);
    }
  }

  async listAllowHosts() {
    await this.ensureDefaultAllowlist();
    return this.prisma.proxyAllowHost.findMany({ orderBy: { host: 'asc' } });
  }

  async addAllowHost(host: string, note?: string) {
    const h = host.trim().toLowerCase();
    if (!/^[a-z0-9.-]+$/.test(h)) throw new BadRequestException('主机名不合法');
    return this.prisma.proxyAllowHost.upsert({
      where: { host: h },
      update: { note },
      create: { host: h, note },
    });
  }

  async removeAllowHost(id: number) {
    await this.prisma.proxyAllowHost.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * 受限出站 HTTP：仅允许白名单主机，禁止内网目标，避免变成开放代理。
   */
  async restrictedFetch(targetUrl: string, actor?: string) {
    await this.ensureDefaultAllowlist();
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new BadRequestException('URL 不合法');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('仅支持 http/https');
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new BadRequestException('禁止访问内网地址');
    }

    const allow = await this.prisma.proxyAllowHost.findMany();
    const hosts = new Set(allow.map((h) => h.host));
    const allowed =
      hosts.has(host) ||
      [...hosts].some((h) => host === h || host.endsWith(`.${h}`));
    if (!allowed) {
      throw new BadRequestException(`主机 ${host} 不在代理白名单`);
    }

    const headers: Record<string, string> = {
      'User-Agent': 'yueyuedao-blog-tools',
      Accept: 'application/json, text/plain, */*',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(parsed.toString(), {
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });
      const text = (await res.text()).slice(0, 200_000);
      await this.audit('proxy', parsed.toString(), actor, res.ok, `status=${res.status}`);
      return {
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        body: text,
      };
    } catch (e) {
      await this.audit('proxy', parsed.toString(), actor, false, String(e).slice(0, 300));
      throw new BadRequestException(`代理请求失败：${String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async audit(action: string, target: string, actor: string | undefined, ok: boolean, detail?: string) {
    await this.prisma.toolAuditLog
      .create({
        data: {
          action,
          target: target.slice(0, 500),
          actor: actor ?? null,
          ok,
          detail: detail?.slice(0, 1000),
        },
      })
      .catch(() => undefined);
  }

  listAudit(limit = 50) {
    return this.prisma.toolAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }
}
