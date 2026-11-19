import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { loadConfig } from './config.mjs';
import { connectDb } from './db.mjs';
import { createGateway, GatewayError } from './gateway.mjs';
import { createSyncer } from './sync.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };

const config = loadConfig();
const store = await connectDb(config);
const gateway = createGateway({ baseUrl: config.gatewayBaseUrl, clientService: config.gatewayClientService, clientSecret: config.gatewayClientSecret });
const syncer = createSyncer({ store, gateway, config });

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

async function readJson(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('请求体过大'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('请求体不是 JSON'), { status: 400 }); }
}

function isAdmin(req) {
  const given = Buffer.from(String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(config.adminToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function publicSyncState() {
  const state = await store.state.findOne({ _id: 'wps' }, { projection: { envelope: 0 } });
  return {
    status: state?.status ?? 'pending',
    authorized: Boolean(state?.authorizedAt),
    lastRunAt: state?.lastRunAt ?? null,
    lastSuccessAt: state?.lastSuccessAt ?? null,
    lastErrorCode: state?.lastError?.code ?? null,
    issues: (state?.lastIssues ?? []).map(({ sheetName, code }) => ({ sheetName, code })),
    intervalMinutes: config.syncIntervalMinutes,
  };
}

async function serveStatic(req, res, pathname) {
  const root = normalize(config.staticDir);
  let file = normalize(join(root, decodeURIComponent(pathname)));
  if (!file.startsWith(root)) return send(res, 404, { error: 'not_found' });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (extname(pathname)) return send(res, 404, { error: 'not_found' });
    file = join(root, 'index.html');
  }
  try {
    const body = await readFile(file);
    const cache = file.includes(`${root}assets/`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': cache, 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    send(res, 404, { error: 'not_found' });
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      await store.db.command({ ping: 1 });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/api/schedule') {
      const months = await store.months.find({}, { projection: { days: 1, syncedAt: 1 } }).sort({ _id: 1 }).toArray();
      const days = months.flatMap(month => month.days.map(({ recordId, ...day }) => day));
      return send(res, 200, { months: months.map(m => m._id), days, sync: await publicSyncState(), version: config.appVersion });
    }
    if (req.method === 'GET' && pathname === '/api/sync/status') return send(res, 200, await publicSyncState());
    if (req.method === 'GET' && pathname === '/api/deploy/status') {
      const status = await readFile(join(config.statusDir, 'deploy-status.json'), 'utf8').then(JSON.parse).catch(() => ({}));
      return send(res, 200, { runningVersion: config.appVersion, ...status });
    }
    if (pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
      if (req.method === 'POST' && pathname === '/api/admin/wps-authorization') {
        const { tokenEnvelope } = await readJson(req);
        if (typeof tokenEnvelope !== 'string' || tokenEnvelope.length < 20 || tokenEnvelope.length > 16_384) return send(res, 400, { error: 'invalid_envelope' });
        const result = await syncer.authorize(tokenEnvelope);
        const run = await syncer.run('authorization');
        return send(res, 200, { authorizedUser: result.userName, sync: { status: run.status, months: run.months, issues: run.issues, error: run.error ?? null } });
      }
      if (req.method === 'POST' && pathname === '/api/admin/sync') {
        const run = await syncer.run('manual');
        return send(res, 200, { status: run.status, months: run.months, issues: run.issues, error: run.error ?? null });
      }
      return send(res, 404, { error: 'not_found' });
    }
    if (pathname.startsWith('/api/')) return send(res, 404, { error: 'not_found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method_not_allowed' });
    return serveStatic(req, res, pathname);
  } catch (error) {
    if (error instanceof GatewayError) return send(res, 502, { error: error.code, message: error.message });
    if (error.status) return send(res, error.status, { error: error.message });
    console.error(error);
    return send(res, 500, { error: 'internal_error' });
  }
});

server.listen(config.port, () => console.log(`[server] listening on ${config.port}`));

const tick = () => syncer.run('schedule').catch(error => console.error('[sync] crashed', error));
setTimeout(tick, 5_000);
const timer = setInterval(tick, config.syncIntervalMinutes * 60_000);

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    clearInterval(timer);
    server.close(() => store.client.close().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
