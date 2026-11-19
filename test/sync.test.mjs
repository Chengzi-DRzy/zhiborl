import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSyncer } from '../server/sync.mjs';
import { GatewayError } from '../server/gateway.mjs';
import { decrypt, encrypt } from '../server/crypto.mjs';

function fakeCollection() {
  const docs = new Map();
  const cursor = list => ({ sort: () => cursor(list), skip: n => cursor(list.slice(n)), limit: n => cursor(list.slice(0, n)), next: async () => list[0] ?? null, toArray: async () => list });
  return {
    docs,
    findOne: async ({ _id }) => docs.get(_id) ?? null,
    updateOne: async ({ _id }, { $set }) => { docs.set(_id, { _id, ...docs.get(_id), ...$set }); },
    replaceOne: async ({ _id }, doc) => { const had = docs.has(_id); docs.set(_id, { _id, ...doc }); return { modifiedCount: had ? 1 : 0, upsertedCount: had ? 0 : 1 }; },
    insertOne: async doc => { docs.set(docs.size + 1, doc); },
    find: () => cursor([...docs.values()].reverse()),
    deleteMany: async () => {},
  };
}

const FILE = 'file-1';
const quiet = { info() {}, warn() {}, error() {} };
const config = { scheduleFileId: FILE, encryptionKey: randomBytes(32) };

function setup(gatewayOverrides = {}) {
  const store = { months: fakeCollection(), state: fakeCollection(), runs: fakeCollection() };
  const calls = [];
  const gateway = {

    me: async () => ({ user: { id: 'u1', displayName: '橙子' } }),
    dbsheetSchema: async () => ({ sheets: [
      { id: 61, name: '11月排班表', fields: [{ name: '日期' }, { name: '抖音主号-早' }, { name: '抖音上新' }, { name: '负责主播' }] },
      { id: 62, name: '12月排班表', fields: [{ name: '日期' }] },
      { id: 31, name: '数据表_跨文件关联', fields: [{ name: '产品名' }] },
    ] }),
    readRecords: async (env, params) => {
      calls.push(params);
      if (params.sheetId === 61) return { fileId: FILE, sheetId: 61, records: [{ id: 'r1', fields: { '日期': '2026/11/02 星期一', '抖音主号-早': '小朱,贝贝', '抖音上新': '锅刷' } }] };
      return { fileId: FILE, sheetId: 62, records: [{ id: 'r2', fields: { '日期': '2026/12/01' } }] };
    },
    ...gatewayOverrides,
  };
  return { store, calls, syncer: createSyncer({ store, gateway, oidc: { refresh: gatewayOverrides.refresh || (async token => ({ refresh_token: token + '+r', access_token: 'new-access' })) }, config, log: quiet }) };
}

test('未授权时不读 WPS，状态为 auth_required', async () => {
  const { syncer, calls } = setup();
  const run = await syncer.run();
  assert.equal(run.status, 'auth_required');
  assert.equal(calls.length, 0);
});

test('授权后按月写入，只读需要的字段，并保存刷新后的授权', async () => {
  const { syncer, store, calls } = setup();
  assert.deepEqual(await syncer.authorize({ access_token: 'access', refresh_token: 'env-0' }), { userName: '橙子' });
  const run = await syncer.run();
  assert.equal(run.status, 'ok');
  assert.deepEqual([...store.months.docs.keys()].sort(), ['2026-11', '2026-12']);
  assert.deepEqual(store.months.docs.get('2026-11').days[0].slots, [{ slot: '早场', host: '小朱', assist: '贝贝' }]);
  assert.deepEqual(calls[0].fields, ['日期', '抖音主号-早', '抖音上新']);
  assert.equal(decrypt(config.encryptionKey, store.state.docs.get('wps').oidcGrant), 'env-0+r');
});

test('单月失败保留旧数据并标记 partial', async () => {
  const { syncer, store } = setup({
    readRecords: async (env, params) => {
      if (params.sheetId === 62) throw new Error('boom');
      return { fileId: FILE, sheetId: 61, records: [{ id: 'r1', fields: { '日期': '2026/11/02' } }] };
    },
  });
  store.months.docs.set('2026-12', { _id: '2026-12', days: [{ date: '2026-12-01' }] });
  await syncer.authorize({ access_token: 'access', refresh_token: 'env-0' });
  const run = await syncer.run();
  assert.equal(run.status, 'partial');
  assert.equal(store.months.docs.get('2026-12').days.length, 1);
  assert.equal(run.issues[0].sheetName, '12月排班表');
});

test('授权失效时停止并要求重新授权', async () => {
  const { syncer, store } = setup({ refresh: async () => { throw new GatewayError('AUTH_TOKEN_INVALID', 'expired', { status: 401 }); } });
  store.state.docs.set('wps', { _id: 'wps', oidcGrant: encrypt(config.encryptionKey, 'env-0') });
  const run = await syncer.run();
  assert.equal(run.status, 'auth_required');
  assert.equal(store.state.docs.get('wps').status, 'auth_required');
});

test('分页游标重复时拒绝该月', async () => {
  const { syncer } = setup({
    readRecords: async (env, params) => ({ fileId: FILE, sheetId: params.sheetId, records: [{ id: `r${params.pageToken ?? 0}`, fields: { '日期': '2026/11/02' } }], nextPageToken: 'same' }),
  });
  await syncer.authorize({ access_token: 'access', refresh_token: 'env-0' });
  const run = await syncer.run();
  assert.equal(run.status, 'error');
  assert.match(run.issues[0].message, /分页/);
});
