/**
 * 统一配置：优先读 config/app.config.json，可用环境变量覆盖。
 * 路径：项目根目录 config/app.config.json
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface AppConfig {
  site: {
    name: string;
    origin: string;
  };
  server: {
    port: number;
    clusterWorkers: number;
  };
  sso: {
    enabled: boolean;
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    postLoginRedirect: string;
    scopes: string[];
    rootUserIds: string[];
    rootPublicIds: number[];
  };
  auth: {
    jwtSecret: string;
    tokenExpiresIn: string;
  };
  proxyAllowHosts: string[];
}

const DEFAULTS: AppConfig = {
  site: {
    name: '月月岛',
    origin: 'https://mindustry.wiki:1081',
  },
  server: {
    port: 1081,
    clusterWorkers: 2,
  },
  sso: {
    enabled: true,
    issuer: 'https://mindustry.wiki:1090',
    clientId: 'yzfwe-blog',
    clientSecret: '',
    redirectUri: 'https://mindustry.wiki:1081/api/auth/sso/callback',
    postLoginRedirect: 'https://mindustry.wiki:1081/auth/sso/callback',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    rootUserIds: ['0'],
    rootPublicIds: [0],
  },
  auth: {
    jwtSecret: 'yueyuedao-blog-jwt',
    tokenExpiresIn: '7d',
  },
  proxyAllowHosts: ['api.github.com', 'github.com', 'raw.githubusercontent.com'],
};

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else if (v !== undefined && v !== null && v !== '') {
      out[k] = v;
    }
  }
  return out as T;
}

function loadFile(): Partial<AppConfig> {
  // 从 cwd 或上级找 config/app.config.json（兼容 backend/ 与根目录启动）
  const candidates = [
    join(process.cwd(), 'config', 'app.config.json'),
    join(process.cwd(), '..', 'config', 'app.config.json'),
    join(__dirname, '..', '..', 'config', 'app.config.json'),
    join(__dirname, '..', '..', '..', 'config', 'app.config.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8')) as Partial<AppConfig>;
      } catch (e) {
        console.error('[config] parse failed:', p, e);
      }
    }
  }
  return {};
}

function envOverrides(cfg: AppConfig): AppConfig {
  const e = process.env;
  return deepMerge(cfg, {
    server: {
      port: e.PORT ? Number(e.PORT) : undefined,
      clusterWorkers: e.CLUSTER_WORKERS ? Number(e.CLUSTER_WORKERS) : undefined,
    },
    sso: {
      issuer: e.SSO_ISSUER,
      clientId: e.SSO_CLIENT_ID,
      clientSecret: e.SSO_CLIENT_SECRET,
      redirectUri: e.SSO_REDIRECT_URI,
      postLoginRedirect: e.SSO_POST_LOGIN_REDIRECT,
      rootUserIds: e.SSO_ROOT_USER_IDS
        ? e.SSO_ROOT_USER_IDS.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    },
    auth: {
      jwtSecret: e.JWT_SECRET,
    },
  } as Partial<AppConfig>);
}

let cached: AppConfig | null = null;

export function loadAppConfig(): AppConfig {
  if (cached) return cached;
  cached = envOverrides(deepMerge(DEFAULTS, loadFile()));
  return cached;
}

export function getSsoConfig() {
  return loadAppConfig().sso;
}

export function isRootSsoId(userId?: string | number | null, publicId?: number | null): boolean {
  const sso = getSsoConfig();
  const uid = String(userId ?? '');
  if (uid === '0') return true;
  if (sso.rootUserIds?.includes(uid)) return true;
  if (publicId === 0 && (sso.rootPublicIds ?? []).includes(0)) return true;
  return false;
}
