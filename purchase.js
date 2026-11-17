import { amountDue, incrementalDue, priceToCents, formatYuan } from './purchase-math.js';

const byId = id => document.getElementById(id);
const notice = byId('purchaseNotice');
const form = byId('purchaseForm');
const submit = byId('purchaseSubmit');
const search = byId('productSearch');
const options = byId('productOptions');
const chosen = byId('chosenProduct');
const month = byId('purchaseMonth');
const quantity = byId('purchaseQuantity');
let selected = null;
let products = [];
const state = { ready: false };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function drawOptions() {
  const query = search.value.trim().toLocaleLowerCase();
  options.replaceChildren();
  if (!query || !state.ready) return;
  for (const product of products.filter(p => p.name.toLocaleLowerCase().includes(query)).slice(0, 20)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-option';
    button.textContent = `${product.name} · ${product.code} · ¥${formatYuan(product.cents)}`;
    button.addEventListener('click', () => {
      selected = product;
      search.value = product.name;
      options.replaceChildren();
      drawSelected();
    });
    options.append(button);
  }
  if (!options.childElementCount) options.textContent = '没有匹配的商品';
}
function drawSelected() {
  chosen.innerHTML = selected ? `已选：${escapeHtml(selected.name)} · 编码 ${escapeHtml(selected.code)} · 锁定单价 ¥${formatYuan(selected.cents)}` : '尚未选择商品；编码由商品记录自动带出，不可填写。';
  const count = Number(quantity.value);
  byId('orderEstimate').textContent = selected && Number.isSafeInteger(count) && count > 0 && Number.isSafeInteger(selected.cents * count)
    ? `本单商品金额 ¥${formatYuan(selected.cents * count)}。月度补差须依据同一账号、所填月份的已提交订单计算。`
    : '选择商品后显示本单商品金额。';
}
search.addEventListener('input', () => { selected = null; drawSelected(); drawOptions(); });
quantity.addEventListener('input', drawSelected);
month.value = new Date().toISOString().slice(0, 7);
form.addEventListener('submit', e => { e.preventDefault(); notice.textContent = '订单服务尚未启用，当前页面不会保存或发送收货信息。'; });
submit.disabled = true;
notice.textContent = '订单库尚未启用：目前仅可查看规则，不能提交或保存收货信息。';
// 数据库启用后须接入登录、服务端行级权限和实时商品查询；不得改为浏览器端缓存私有定价表。
export { amountDue, incrementalDue, priceToCents };
