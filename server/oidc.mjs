import { createRemoteJWKSet, jwtVerify } from 'jose';

export function createOidc({ baseUrl, clientService, clientSecret, fetchImpl = fetch }) {
  const keys = createRemoteJWKSet(new URL(baseUrl + '/.well-known/jwks.json'));
  async function token(params) {
    const response = await fetchImpl(baseUrl + '/oauth/token', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { authorization: 'Basic ' + Buffer.from(clientService + ':' + clientSecret).toString('base64') },
      body: new URLSearchParams(params),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('网关未能续期或交换授权'), {
      authRequired: data.error === 'invalid_grant', code: data.error === 'invalid_grant' ? 'AUTH_TOKEN_INVALID' : 'TOKEN_EXCHANGE_FAILED',
    });
    if (data.token_type?.toLowerCase() !== 'bearer' || !data.access_token || !data.refresh_token)
      throw new Error('网关未返回完整授权');
    return data;
  }
  return {
    async exchange({ code, verifier, nonce, redirectUri }) {
      const t = await token({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri });
      const { payload } = await jwtVerify(t.id_token, keys, {
        algorithms: ['ES256', 'RS256'], issuer: baseUrl, audience: clientService, requiredClaims: ['exp','sub','nonce'],
      });
      if (payload.nonce !== nonce || !t.scope?.split(' ').includes('offline_access')) throw new Error('网关授权验证未通过');
      return t;
    },
    refresh: refreshToken => token({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  };
}
