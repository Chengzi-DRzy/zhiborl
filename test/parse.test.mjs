import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseMonthSheet, parseRecord, sheetMonthNumber, toText } from '../server/parse.mjs';

test('识别月表名', () => {
  assert.equal(sheetMonthNumber('11月排班表'), 11);
  assert.equal(sheetMonthNumber('1月排班表'), 1);
  assert.equal(sheetMonthNumber('数据表_跨文件关联'), null);
  assert.equal(sheetMonthNumber('13月排班表'), null);
});

test('解析带星期的日期并拒绝无效日期', () => {
  assert.equal(parseDate('2026/11/02 星期一'), '2026-11-02');
  assert.equal(parseDate('2026-2-30'), null);
  assert.equal(parseDate(''), null);
});

test('文本兼容数组与对象', () => {
  assert.equal(toText([{ text: '甲' }, '乙']), '甲、乙');
  assert.equal(toText({ name: '丙' }), '丙');
});

test('场次第一人为主播，其余为助播', () => {
  const day = parseRecord({ '日期': '2026/11/02 星期一', '抖音主号-早': '小朱,贝贝', '抖音主号-午': '苏苏，芬芬、珊珊', '抖音上新': '纤维球锅刷', '内部字段': 'x' });
  assert.deepEqual(day, {
    date: '2026-11-02', new: '纤维球锅刷', event: '',
    slots: [{ slot: '早场', host: '小朱', assist: '贝贝' }, { slot: '中午场', host: '苏苏', assist: '芬芬、珊珊' }],
  });
});

test('旧表上新字段名不同也能读到', () => {
  assert.equal(parseRecord({ '日期': '2026/05/01', '抖音上新产品名': '保温杯' }).new, '保温杯');
});

test('月表只保留本月、跳过空白行，记录可为 JSON 字符串', () => {
  const result = parseMonthSheet([
    { id: 'a', fields: JSON.stringify({ '日期': '2026/11/02 星期一' }) },
    { id: 'b', fields: { '日期': '2026/11/01 星期日' } },
    { id: 'c', fields: { '日期': '' } },
    { id: 'd', fields: { '日期': '2026/10/31' } },
  ], 11);
  assert.equal(result.month, '2026-11');
  assert.deepEqual(result.days.map(d => d.date), ['2026-11-01', '2026-11-02']);
  assert.deepEqual(result.skipped, { blank: 1, otherMonth: 1 });
});

test('重复日期或多个年份整月拒绝', () => {
  assert.throws(() => parseMonthSheet([{ id: 'a', fields: { '日期': '2026/11/01' } }, { id: 'b', fields: { '日期': '2026/11/01' } }], 11), { code: 'DUPLICATE_DATE' });
  assert.throws(() => parseMonthSheet([{ id: 'a', fields: { '日期': '2026/11/01' } }, { id: 'b', fields: { '日期': '2027/11/02' } }], 11), { code: 'MIXED_YEARS' });
  assert.throws(() => parseMonthSheet([{ id: 'a', fields: {} }], 11), { code: 'NO_DATED_ROWS' });
});
