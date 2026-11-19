// 一次性授权：用有排班表权限的 WPS 账号登录，把网关签发的授权交给 zhiborl 服务器保存（服务器端加密）。
// 用法：ZHIBORL_ADMIN_TOKEN=... npm run authorize
// 浏览器会打开 WPS 登录；登录完成后网关把授权回传到本机 127.0.0.1，脚本再转交给服务器。
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const serverUrl = (process.env.ZHIBORL_URL ?? 'http://192.168.2.249:8850').replace(/\/+$/, '');
const adminToken = process.env.ZHIBORL_ADMIN_TOKEN;
const gatewayUrl = (process.env.WPS_GATEWAY_BASE_URL ?? 'https://sso.shueho.com:8443').replace(/\/+$/, '');
const clientService = process.env.WPS_GATEWAY_CLIENT_SERVICE ?? 'shueho-zhiborl';
const port = Number(process.env.AUTHORIZE_PORT ?? 4931);
if (!adminToken) { console.error('请设置 ZHIBORL_ADMIN_TOKEN（服务器 .env 里的 ADMIN_TOKEN）'); process.exit(1); }

const state = randomBytes(24).toString('base64url');
const redirectUri = `http://127.0.0.1:${port}/wps/callback`;
const loginUrl = `${gatewayUrl}/wps/sso/login?${new URLSearchParams({ client_service: clientService, redirect_uri: redirectUri, state, response_mode: 'form_post' })}`;

const page = (title, body) => `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;padding:40px"><h2>${title}</h2><p>${body}</p></body>`;
const escape = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/wps/callback')) { res.writeHead(404).end(); return; }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  let ok = false;
  let message;
  if (form.get('state') !== state || !form.get('tokenEnvelope')) {
    message = '回传的 state 不匹配或没有授权，请重新运行脚本。';
  } else {
    try {
      const response = await fetch(`${serverUrl}/api/admin/wps-authorization`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ tokenEnvelope: form.get('tokenEnvelope') }),
      });
      const result = await response.json().catch(() => ({}));
      ok = response.ok;
      message = ok
        ? `已用「${result.authorizedUser ?? '当前账号'}」授权。首轮同步：${result.sync?.status}，${(result.sync?.months ?? []).map(m => `${m.month} ${m.days} 天`).join('、') || '无月份'}${result.sync?.issues?.length ? `；问题：${result.sync.issues.map(i => `${i.sheetName} ${i.code}`).join('、')}` : ''}`
        : `服务器拒绝：${result.error ?? response.status} ${result.message ?? ''}`;
    } catch (error) {
      message = `连不上服务器 ${serverUrl}：${error.message}`;
    }
  }
  console[ok ? 'log' : 'error'](message);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page(ok ? '授权完成' : '授权失败', escape(message)));
  server.close();
  process.exitCode = ok ? 0 : 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`请在浏览器完成 WPS 登录：\n${loginUrl}`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  spawn(opener, [loginUrl], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
});
setTimeout(() => { console.error('10 分钟内没有完成授权，已退出。'); process.exit(1); }, 10 * 60_000).unref();
