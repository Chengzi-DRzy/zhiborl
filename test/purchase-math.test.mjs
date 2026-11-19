import test from 'node:test';
import assert from 'node:assert/strict';
import { amountDue, incrementalDue, priceToCents } from '../purchase-math.js';

test('月度预算与十元容差', () => {
  for (const sum of [0, 19999, 20000, 20001, 21000]) assert.equal(amountDue(sum), 0);
  assert.equal(amountDue(21001), 801);
  assert.equal(amountDue(21500), 1200);
});
test('跨订单增量可能跨过容差阈值', () => {
  assert.equal(incrementalDue(20500, 500), 0);
  assert.equal(incrementalDue(21000, 500), 1200);
  assert.equal(incrementalDue(21500, 1000), 800);
});
test('金额精度与无效输入', () => {
  assert.equal(priceToCents('39.80'), 3980);
  assert.equal(priceToCents('0.01'), 1);
  assert.throws(() => priceToCents('1.999'));
  assert.throws(() => amountDue(-1));
});
