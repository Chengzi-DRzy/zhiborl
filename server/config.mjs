const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
};
const number = (name, fallback, min, max) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} 必须在 ${min}-${max} 之间`);
  return value;
};

export function loadConfig() {
  const encryptionKey = Buffer.from(required('ENVELOPE_ENCRYPTION_KEY'), 'base64');
  if (encryptionKey.length !== 32) throw new Error('ENVELOPE_ENCRYPTION_KEY 必须是 32 字节的 base64');
  const adminToken = required('ADMIN_TOKEN');
  if (adminToken.length < 32) throw new Error('ADMIN_TOKEN 至少 32 个字符');
  return {
    port: number('PORT', 8850, 1, 65535),
    mongoUrl: required('MONGO_URL'),
    mongoDb: process.env.MONGO_DB?.trim() || 'zhiborl',
    gatewayBaseUrl: required('WPS_GATEWAY_BASE_URL').replace(/\/+$/, ''),
    gatewayClientService: required('WPS_GATEWAY_CLIENT_SERVICE'),
    gatewayClientSecret: required('WPS_GATEWAY_CLIENT_SECRET'),
    scheduleFileId: required('WPS_SCHEDULE_FILE_ID'),
    syncIntervalMinutes: number('SYNC_INTERVAL_MINUTES', 5, 1, 1440),
    encryptionKey,
    adminToken,
    appVersion: process.env.APP_VERSION?.trim() || 'dev',
    statusDir: process.env.STATUS_DIR?.trim() || '/app/status',
    staticDir: process.env.STATIC_DIR?.trim() || new URL('../dist/', import.meta.url).pathname,
  };
}
