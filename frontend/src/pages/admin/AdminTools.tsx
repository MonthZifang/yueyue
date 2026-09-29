import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api';

type DnsProfile = {
  id: number;
  name: string;
  servers: string;
  enabled: boolean;
};
type ProxyProfile = {
  id: number;
  name: string;
  host: string;
  port: number;
  username?: string | null;
  protocol: string;
  enabled: boolean;
};

export default function AdminTools() {
  const [domain, setDomain] = useState('');
  const [dnsProfileId, setDnsProfileId] = useState<number | ''>('');
  const [dnsResult, setDnsResult] = useState<unknown>(null);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyProfileId, setProxyProfileId] = useState<number | ''>('');
  const [proxyResult, setProxyResult] = useState<unknown>(null);
  const [dnsProfiles, setDnsProfiles] = useState<DnsProfile[]>([]);
  const [proxyProfiles, setProxyProfiles] = useState<ProxyProfile[]>([]);
  const [dnsName, setDnsName] = useState('');
  const [dnsServers, setDnsServers] = useState('8.8.8.8,1.1.1.1');
  const [pxName, setPxName] = useState('');
  const [pxHost, setPxHost] = useState('');
  const [pxPort, setPxPort] = useState('1080');
  const [pxUser, setPxUser] = useState('');
  const [pxPass, setPxPass] = useState('');
  const [pxProto, setPxProto] = useState('http');
  const [hosts, setHosts] = useState<{ id: number; host: string; note?: string | null }[]>([]);
  const [host, setHost] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<
    { id: number; action: string; target: string; ok: boolean; createdAt: string }[]
  >([]);
  const [views, setViews] = useState<
    { id: number; title: string; viewCount: number; uniqueViews: number }[]
  >([]);

  function load() {
    api.listAllowHosts().then(setHosts);
    api.toolAudit().then(setAudit);
    api.listDnsProfiles().then((d) => setDnsProfiles(d as DnsProfile[]));
    api.listProxyProfiles().then((d) => setProxyProfiles(d as ProxyProfile[]));
    api.viewStats().then((d) => setViews(d)).catch(() => setViews([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function onDns(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDnsResult(null);
    try {
      setDnsResult(
        await api.dnsLookup(domain, dnsProfileId === '' ? undefined : Number(dnsProfileId)),
      );
      load();
    } catch {
      setError('DNS 查询失败');
    }
  }

  async function onProxy(e: FormEvent) {
    e.preventDefault();
    setError('');
    setProxyResult(null);
    try {
      setProxyResult(
        await api.proxyFetch(proxyUrl, proxyProfileId === '' ? undefined : Number(proxyProfileId)),
      );
      load();
    } catch {
      setError('代理请求失败（检查白名单与目标）');
    }
  }

  async function addDnsProfile(e: FormEvent) {
    e.preventDefault();
    await api.createDnsProfile(dnsName, dnsServers);
    setDnsName('');
    load();
  }

  async function addProxyProfile(e: FormEvent) {
    e.preventDefault();
    await api.createProxyProfile({
      name: pxName,
      host: pxHost,
      port: Number(pxPort),
      username: pxUser || undefined,
      password: pxPass || undefined,
      protocol: pxProto,
    });
    setPxName('');
    setPxHost('');
    setPxUser('');
    setPxPass('');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">网络工具</h1>
      {error && <div className="card px-4 py-2 text-sm text-red-600">{error}</div>}

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">DNS 解析（可自定义 DNS）</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input !w-56" placeholder="DNS 名称，如 Cloudflare" value={dnsName} onChange={(e) => setDnsName(e.target.value)} />
          <input className="input !w-64" placeholder="服务器，逗号分隔 1.1.1.1,8.8.8.8" value={dnsServers} onChange={(e) => setDnsServers(e.target.value)} />
          <button type="button" className="btn-ghost" onClick={addDnsProfile}>
            添加 DNS 配置
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {dnsProfiles.map((p) => (
            <span key={p.id} className="flex items-center gap-2 rounded-full bg-teal-soft/50 px-3 py-1 text-sm">
              {p.name} · {p.servers}
              <button type="button" className="text-red-600" onClick={() => api.deleteDnsProfile(p.id).then(load)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={onDns} className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="例如 api.github.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
          <select
            className="input !w-48"
            value={dnsProfileId}
            onChange={(e) => setDnsProfileId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">系统 DNS</option>
            {dnsProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            查询
          </button>
        </form>
        {dnsResult != null && (
          <pre className="overflow-x-auto rounded-2xl bg-[#122220] p-4 text-xs text-[#D8EDE9]">
            {JSON.stringify(dnsResult, null, 2)}
          </pre>
        )}
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">自定义代理（名称 + 账号密码）</h2>
        <form onSubmit={addProxyProfile} className="flex flex-wrap gap-2">
          <input className="input !w-32" placeholder="代理名称" value={pxName} onChange={(e) => setPxName(e.target.value)} required />
          <select className="input !w-28" value={pxProto} onChange={(e) => setPxProto(e.target.value)}>
            <option value="http">http</option>
            <option value="socks5">socks5</option>
          </select>
          <input className="input !w-40" placeholder="主机" value={pxHost} onChange={(e) => setPxHost(e.target.value)} required />
          <input className="input !w-24" placeholder="端口" value={pxPort} onChange={(e) => setPxPort(e.target.value)} required />
          <input className="input !w-32" placeholder="用户名（可选）" value={pxUser} onChange={(e) => setPxUser(e.target.value)} />
          <input className="input !w-32" type="password" placeholder="密码（可选）" value={pxPass} onChange={(e) => setPxPass(e.target.value)} />
          <button type="submit" className="btn">
            添加代理
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {proxyProfiles.map((p) => (
            <span key={p.id} className="flex items-center gap-2 rounded-full bg-teal-soft/50 px-3 py-1 text-sm">
              {p.name} · {p.protocol}://{p.host}:{p.port}
              {p.username ? ` @${p.username}` : ''}
              <button
                type="button"
                className="text-red-600"
                onClick={() => api.deleteProxyProfile(p.id).then(load)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={onProxy} className="flex flex-wrap gap-2">
          <input
            className="input !w-80"
            placeholder="https://api.github.com/users/xxx"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            required
          />
          <select
            className="input !w-48"
            value={proxyProfileId}
            onChange={(e) => setProxyProfileId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">直连（仅白名单）</option>
            {proxyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            请求
          </button>
        </form>
        {proxyResult != null && (
          <pre className="max-h-80 overflow-auto rounded-2xl bg-[#122220] p-4 text-xs text-[#D8EDE9]">
            {JSON.stringify(proxyResult, null, 2).slice(0, 8000)}
          </pre>
        )}
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">代理白名单</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.addAllowHost(host, note || undefined);
            setHost('');
            setNote('');
            load();
          }}
          className="flex flex-wrap gap-2"
        >
          <input className="input !w-56" placeholder="主机名" value={host} onChange={(e) => setHost(e.target.value)} required />
          <input className="input !w-40" placeholder="备注" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="btn">
            添加
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {hosts.map((h) => (
            <span key={h.id} className="flex items-center gap-2 rounded-full bg-teal-soft/60 px-3 py-1 text-sm">
              {h.host}
              <button type="button" className="text-red-600" onClick={() => api.removeAllowHost(h.id).then(load)}>
                ×
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="card space-y-2 p-6">
        <h2 className="font-display text-lg font-bold">阅读统计（独立访客）</h2>
        <div className="space-y-1 text-sm">
          {views.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist px-3 py-2 dark:bg-white/5">
              <span className="truncate">{v.title}</span>
              <div className="flex items-center gap-3 text-xs">
                <span>点击 {v.viewCount}</span>
                <span className="text-teal">独立 {v.uniqueViews}</span>
                <button
                  type="button"
                  className="btn-ghost !py-1"
                  onClick={() => api.resetViews(v.id).then(load)}
                >
                  重置
                </button>
              </div>
            </div>
          ))}
          {!views.length && <p className="text-ink/50">暂无数据</p>}
        </div>
      </section>

      <section className="card space-y-2 p-6">
        <h2 className="font-display text-lg font-bold">审计日志</h2>
        <div className="space-y-1 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="flex flex-wrap gap-2 rounded-xl bg-mist px-3 py-2 dark:bg-white/5">
              <span className={a.ok ? 'text-teal' : 'text-red-600'}>{a.ok ? 'OK' : 'FAIL'}</span>
              <span className="font-medium">{a.action}</span>
              <span className="truncate text-ink/70">{a.target}</span>
              <span className="text-xs text-ink/40">{new Date(a.createdAt).toLocaleString('zh-CN')}</span>
            </div>
          ))}
          {!audit.length && <p className="text-ink/50">暂无记录</p>}
        </div>
      </section>
    </div>
  );
}
