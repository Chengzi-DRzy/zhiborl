// 通过 shueho-sso-gateway 读取 WPS。用授权人的 OIDC Bearer 读取，网关负责刷新 WPS token。
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

export function createGateway({ baseUrl, fetchImpl = fetch, timeoutMs = 30_000 }) {
  async function post(route, accessToken, body) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${route}`, {
        method: 'POST',
        redirect: 'error', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + accessToken },
        body: JSON.stringify(body),
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
    me: token => post('/wps/api/org/me', token, {}),
    dbsheetSchema: (token, fileId) => post('/wps/api/docs/dbsheet/schema', token, { fileId }),
    readRecords: (token, params) => post('/wps/api/docs/table/read', token, { documentType: 'dbsheet', ...params }),
  };
}
