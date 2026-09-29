import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api';
import type { AllowHost } from '../../types';

export default function AdminTools() {
  const [domain, setDomain] = useState('');
  const [dnsResult, setDnsResult] = useState<unknown>(null);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyResult, setProxyResult] = useState<unknown>(null);
  const [hosts, setHosts] = useState<AllowHost[]>([]);
  const [host, setHost] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<{ id: number; action: string; target: string; ok: boolean; createdAt: string }[]>([]);

  function load() {
    api.listAllowHosts().then(setHosts);
    api.toolAudit().then(setAudit);
  }

  useEffect(() => {
    load();
  }, []);

  async function onDns(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDnsResult(null);
    try {
      setDnsResult(await api.dnsLookup(domain));
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
      setProxyResult(await api.proxyFetch(proxyUrl));
      load();
    } catch {
      setError('代理请求失败（检查白名单与目标）');
    }
  }

  async function addHost(e: FormEvent) {
    e.preventDefault();
    await api.addAllowHost(host, note || undefined);
    setHost('');
    setNote('');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">网络工具（DNS / 受限代理）</h1>
      {error && <div className="card px-4 py-2 text-sm text-red-600">{error}</div>}

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">DNS 解析</h2>
        <form onSubmit={onDns} className="flex flex-wrap gap-2">
          <input
            className="input !w-64"
            placeholder="例如 api.github.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
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
        <h2 className="font-display text-lg font-bold">受限 HTTP 代理</h2>
        <p className="text-sm text-ink/60">
          仅允许白名单主机，禁止内网；每次调用写入审计日志。适合拉取 GitHub API 等公开资料。
        </p>
        <form onSubmit={onProxy} className="flex flex-wrap gap-2">
          <input
            className="input !w-96"
            placeholder="https://api.github.com/users/xxx"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            required
          />
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
        <form onSubmit={addHost} className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="主机名，如 api.github.com"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
          <input
            className="input !w-40"
            placeholder="备注"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="btn">
            添加
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {hosts.map((h) => (
            <span key={h.id} className="flex items-center gap-2 rounded-full bg-teal-soft/60 px-3 py-1 text-sm">
              {h.host}
              <button
                type="button"
                className="text-red-600"
                onClick={() => api.removeAllowHost(h.id).then(load)}
              >
                ×
              </button>
            </span>
          ))}
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
