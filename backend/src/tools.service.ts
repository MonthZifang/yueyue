import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns/promises';
import { Resolver } from 'dns/promises';
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

  // ---- DNS profiles ----
  listDnsProfiles() {
    return this.prisma.dnsProfile.findMany({ orderBy: { id: 'asc' } });
  }

  createDnsProfile(name: string, servers: string) {
    return this.prisma.dnsProfile.create({ data: { name, servers } });
  }

  async updateDnsProfile(id: number, data: Partial<{ name: string; servers: string; enabled: boolean }>) {
    await this.prisma.dnsProfile.findUniqueOrThrow({ where: { id } });
    return this.prisma.dnsProfile.update({ where: { id }, data });
  }

  async deleteDnsProfile(id: number) {
    await this.prisma.dnsProfile.delete({ where: { id } });
    return { ok: true };
  }

  /** 自定义 DNS 解析：可指定 DNS 服务器 */
  async resolveDns(domain: string, actor?: string, dnsProfileId?: number) {
    const host = domain.trim().toLowerCase();
    if (!host || !/^[a-z0-9.-]+$/i.test(host) || host.length > 253) {
      throw new BadRequestException('域名不合法');
    }

    let servers: string[] = [];
    if (dnsProfileId) {
      const profile = await this.prisma.dnsProfile.findUnique({ where: { id: dnsProfileId } });
      if (!profile) throw new BadRequestException('DNS 配置不存在');
      if (!profile.enabled) throw new BadRequestException('DNS 配置已停用');
      servers = profile.servers.split(',').map((s) => s.trim()).filter(Boolean);
    }

    try {
      const resolver = new Resolver({ timeout: 5000, tries: 1 });
      if (servers.length) resolver.setServers(servers);

      const [a, aaaa, cname, mx, txt] = await Promise.all([
        resolver.resolve4(host).catch(() => []),
        resolver.resolve6(host).catch(() => []),
        resolver.resolveCname(host).catch(() => []),
        resolver.resolveMx(host).catch(() => []),
        resolver.resolveTxt(host).catch(() => []),
      ]);
      const lookup = await dns.lookup(host).catch(() => null);
      const result = {
        host,
        dnsServers: servers.length ? servers : ['system default'],
        lookup,
        a,
        aaaa,
        cname,
        mx,
        txt: txt.flat().slice(0, 20),
      };
      await this.audit('dns', `${host}${servers.length ? ` @${servers.join(',')}` : ''}`, actor, true);
      return result;
    } catch (e) {
      await this.audit('dns', host, actor, false, String(e).slice(0, 300));
      throw new BadRequestException(`DNS 查询失败：${String(e)}`);
    }
  }

  // ---- Proxy profiles ----
  listProxyProfiles() {
    return this.prisma.proxyProfile.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        protocol: true,
        enabled: true,
        // password 不回传
      },
    });
  }

  createProxyProfile(data: {
    name: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    protocol?: string;
  }) {
    return this.prisma.proxyProfile.create({
      data: {
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        protocol: data.protocol || 'http',
      },
    });
  }

  async updateProxyProfile(
    id: number,
    data: Partial<{
      name: string;
      host: string;
      port: number;
      username: string;
      password: string;
      protocol: string;
      enabled: boolean;
    }>,
  ) {
    await this.prisma.proxyProfile.findUniqueOrThrow({ where: { id } });
    return this.prisma.proxyProfile.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        protocol: true,
        enabled: true,
      },
    });
  }

  async deleteProxyProfile(id: number) {
    await this.prisma.proxyProfile.delete({ where: { id } });
    return { ok: true };
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
   * 受限出站 HTTP：白名单主机，可走自定义代理（名称+账号密码）。
   */
  async restrictedFetch(targetUrl: string, actor?: string, proxyProfileId?: number) {
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
      hosts.has(host) || [...hosts].some((h) => host === h || host.endsWith(`.${h}`));
    if (!allowed) {
      throw new BadRequestException(`主机 ${host} 不在代理白名单`);
    }

    let proxy: {
      name: string;
      host: string;
      port: number;
      username: string | null;
      password: string | null;
      protocol: string;
    } | null = null;
    if (proxyProfileId) {
      const p = await this.prisma.proxyProfile.findUnique({ where: { id: proxyProfileId } });
      if (!p) throw new BadRequestException('代理配置不存在');
      if (!p.enabled) throw new BadRequestException('代理已停用');
      proxy = p;
    }

    const headers: Record<string, string> = {
      'User-Agent': 'yueyuedao-blog-tools',
      Accept: 'application/json, text/plain, */*',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Node fetch 支持 undici ProxyAgent 时优先；否则用 CONNECT 隧道提示
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);

      let init: RequestInit = {
        headers,
        signal: controller.signal,
        redirect: 'follow',
      };

      // undici / Node 20+ 可通过 dispatcher 使用代理
      if (proxy) {
        try {
          const { ProxyAgent } = await import('undici');
          const auth =
            proxy.username != null && proxy.password != null
              ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
              : '';
          const proxyUrl = `${proxy.protocol || 'http'}://${auth}${proxy.host}:${proxy.port}`;
          (init as { dispatcher?: unknown }).dispatcher = new ProxyAgent(proxyUrl);
        } catch (e) {
          this.logger.warn(`ProxyAgent unavailable: ${String(e)}`);
        }
      }

      const res = await fetch(parsed.toString(), init);
      const text = (await res.text()).slice(0, 200_000);
      clearTimeout(timer);
      await this.audit(
        'proxy',
        `${parsed.toString()}${proxy ? ` via ${proxy.name}` : ''}`,
        actor,
        res.ok,
        `status=${res.status}`,
      );
      return {
        status: res.status,
        ok: res.ok,
        viaProxy: proxy?.name || null,
        contentType: res.headers.get('content-type'),
        body: text,
      };
    } catch (e) {
      await this.audit('proxy', parsed.toString(), actor, false, String(e).slice(0, 300));
      throw new BadRequestException(`代理请求失败：${String(e)}`);
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
