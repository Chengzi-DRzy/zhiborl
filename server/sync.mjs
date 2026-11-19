import { encrypt, decrypt } from './crypto.mjs';
import { GatewayError } from './gateway.mjs';
import { READ_FIELD_NAMES, parseMonthSheet, sheetMonthNumber } from './parse.mjs';

const STATE_ID = 'wps';
const MAX_PAGES = 20;
const KEEP_RUNS = 500;

// WPS 读取 → 校验 → 按月整份写入 MongoDB。任何一个月读失败都保留该月旧数据。
export function createSyncer({ store, gateway, oidc, config, log = console }) {
  let running = null;

  async function loadRefresh() {
    const state = await store.state.findOne({ _id: STATE_ID });
    if (!state?.oidcGrant) return null;
    return { state, refresh: decrypt(config.encryptionKey, state.oidcGrant) };
  }

  async function saveRefresh(refresh, extra = {}) {
    await store.state.updateOne(
      { _id: STATE_ID },
      { $set: { oidcGrant: encrypt(config.encryptionKey, refresh), ...extra } },
      { upsert: true },
    );
  }

  async function readAllRecords(accessToken, sheetId, fields) {
    const records = [];
    const ids = new Set();
    const tokens = new Set();
    let pageToken;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const data = await gateway.readRecords(accessToken, {
        fileId: config.scheduleFileId, sheetId, fields, pageSize: 1000, preferId: false, textValue: 'text',
        includeAttachmentUrls: false, ...(pageToken ? { pageToken } : {}),
      });
      if (String(data?.fileId) !== config.scheduleFileId || Number(data?.sheetId) !== sheetId || !Array.isArray(data.records)) {
        throw new Error('WPS 返回的表与请求不一致');
      }
      for (const record of data.records) {
        const id = String(record?.id ?? '');
        if (!id || ids.has(id)) throw new Error('WPS 记录 ID 缺失或重复');
        ids.add(id);
        records.push(record);
      }
      pageToken = data.nextPageToken;
      if (!pageToken) return records;
      if (tokens.has(pageToken) || !data.records.length) throw new Error('WPS 分页游标异常');
      tokens.add(pageToken);
    }
    throw new Error('WPS 分页超过上限');
  }

  async function syncOnce(trigger) {
    const startedAt = new Date();
    const run = { startedAt, trigger, months: [], issues: [] };
    const finish = async (status, error) => {
      run.status = status;
      run.finishedAt = new Date();
      if (error) run.error = { code: error.code ?? 'SYNC_FAILED', message: error.message };
      await store.runs.insertOne(run);
      const cutoff = await store.runs.find({}, { projection: { startedAt: 1 } }).sort({ startedAt: -1 }).skip(KEEP_RUNS).limit(1).next();
      if (cutoff) await store.runs.deleteMany({ startedAt: { $lte: cutoff.startedAt } });
      const set = { status, lastRunAt: startedAt, lastFinishedAt: run.finishedAt, lastError: run.error ?? null, lastIssues: run.issues };
      if (status === 'ok' || status === 'partial') set.lastSuccessAt = run.finishedAt;
      await store.state.updateOne({ _id: STATE_ID }, { $set: set }, { upsert: true });
      const level = status === 'ok' ? 'info' : 'warn';
      log[level](`[sync] ${status} months=${run.months.map(m => `${m.month}:${m.days}`).join(',')} issues=${run.issues.length}${error ? ` error=${error.code ?? ''} ${error.message}` : ''}`);
      return run;
    };

    const loaded = await loadRefresh();
    if (!loaded) return finish('auth_required', Object.assign(new Error('尚未授权读取 WPS 排班表'), { code: 'NOT_AUTHORIZED' }));

    try {
      const { access_token: accessToken, refresh_token: refresh } = await oidc.refresh(loaded.refresh);
      await saveRefresh(refresh);
      const schema = await gateway.dbsheetSchema(accessToken, config.scheduleFileId);
      const sheets = (schema?.sheets ?? [])
        .map(sheet => ({ id: Number(sheet.id), name: sheet.name, monthNumber: sheetMonthNumber(sheet.name), fieldNames: new Set((sheet.fields ?? []).map(f => f.name)) }))
        .filter(sheet => sheet.monthNumber && Number.isInteger(sheet.id));
      if (!sheets.length) throw Object.assign(new Error('排班表里没有「N月排班表」'), { code: 'NO_MONTH_SHEETS' });

      const parsedByMonth = new Map();
      for (const sheet of sheets) {
        const fields = READ_FIELD_NAMES.filter(name => sheet.fieldNames.has(name));
        try {
          if (!fields.includes('日期')) throw Object.assign(new Error('缺少「日期」字段'), { code: 'MISSING_DATE_FIELD' });
          const records = await readAllRecords(accessToken, sheet.id, fields);
          const parsed = parseMonthSheet(records, sheet.monthNumber);
          if (parsedByMonth.has(parsed.month)) throw Object.assign(new Error(`${parsed.month} 出现在多个工作表`), { code: 'DUPLICATE_MONTH' });
          parsedByMonth.set(parsed.month, { ...parsed, sheet });
        } catch (error) {
          if (error instanceof GatewayError && error.authRequired) throw error;
          run.issues.push({ sheetId: sheet.id, sheetName: sheet.name, code: error.code ?? 'SHEET_FAILED', message: error.message });
        }
      }

      for (const [month, parsed] of parsedByMonth) {
        const result = await store.months.replaceOne(
          { _id: month },
          {
            month,
            days: parsed.days,
            source: { fileId: config.scheduleFileId, sheetId: parsed.sheet.id, sheetName: parsed.sheet.name },
            skipped: parsed.skipped,
            syncedAt: new Date(),
          },
          { upsert: true },
        );
        run.months.push({ month, sheetName: parsed.sheet.name, days: parsed.days.length, changed: result.modifiedCount + result.upsertedCount > 0 });
      }
      return finish(!parsedByMonth.size ? 'error' : run.issues.length ? 'partial' : 'ok');
    } catch (error) {
      if (error.authRequired) return finish('auth_required', error);
      return finish('error', error);
    }
  }

  return {
    // 同一时间只跑一轮；重复触发直接复用正在跑的那一轮。
    run(trigger = 'schedule') {
      running ??= syncOnce(trigger).finally(() => { running = null; });
      return running;
    },
    async authorize({ access_token: accessToken, refresh_token: refresh }) {
      if (running) await running;
      const me = await gateway.me(accessToken);
      await gateway.dbsheetSchema(accessToken, config.scheduleFileId);
      const user = me?.user ?? {};
      await saveRefresh(refresh, { authorizedAt: new Date(), authorizedUser: { id: user.id ?? null, name: user.displayName ?? null } });
      return { userName: user.displayName ?? null };
    },
  };
}
