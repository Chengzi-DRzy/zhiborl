// 金额统一使用整数分，避免浮点误差。输入仅来自已锁定的订单价格。
export function amountDue(totalCents) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) throw new RangeError('总额必须为非负整数分');
  const excess = Math.max(0, totalCents - 20000);
  return excess <= 1000 ? 0 : Math.round(excess * 0.8);
}
export function incrementalDue(previousCents, newOrderCents) {
  if (![previousCents, newOrderCents].every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isSafeInteger(previousCents + newOrderCents)) throw new RangeError('订单金额无效');
  return amountDue(previousCents + newOrderCents) - amountDue(previousCents);
}
export function priceToCents(value) {
  const text = String(value).trim();
  if (!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) throw new RangeError('价格格式无效');
  const [yuan, fen = ''] = text.split('.');
  const result = Number(yuan) * 100 + Number(fen.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new RangeError('价格超出范围');
  return result;
}
export const formatYuan = cents => (cents / 100).toFixed(2);
