// 通过 shueho-sso-gateway 读取 WPS。只用授权人的 tokenEnvelope 读，网关负责刷新 WPS token。
export class GatewayError extends Error {
  constructor(code, message, { status, requestId } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
  get authRequired() {
    return this.status === 401 || /^AUTH_|ENVELOPE|SESSION/.test(this.code ?? '');
  }
}

export function createGateway({ baseUrl, clientService, clientSecret, fetchImpl = fetch, timeoutMs = 30_000 }) {
  async function post(route, body) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientService, clientSecret, ...body }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new GatewayError('GATEWAY_NETWORK_ERROR', `连不上 WPS 网关：${error.message}`);
    }
    const payload = await response.json().catch(() => null);
    if (payload?.error) {
      throw new GatewayError(payload.error.code ?? 'GATEWAY_ERROR', payload.error.message ?? 'WPS 网关返回错误', {
        status: response.status, requestId: payload.error.requestId,
      });
    }
    if (!response.ok || !payload || !('data' in payload)) {
      throw new GatewayError('GATEWAY_HTTP_ERROR', `WPS 网关返回 HTTP ${response.status}`, { status: response.status });
    }
    return payload.data;
  }

  return {
    refreshEnvelope: tokenEnvelope => post('/wps/token/refresh', { tokenEnvelope }),
    me: tokenEnvelope => post('/wps/api/org/me', { tokenEnvelope }),
    dbsheetSchema: (tokenEnvelope, fileId) => post('/wps/api/docs/dbsheet/schema', { tokenEnvelope, fileId }),
    readRecords: (tokenEnvelope, params) => post('/wps/api/docs/table/read', { tokenEnvelope, documentType: 'dbsheet', ...params }),
  };
}
