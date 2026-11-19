// 排班由服务器从 WPS 多维表自动同步到 MongoDB，页面通过 /api/schedule 读取。
let days = [];
const $ = id => document.getElementById(id);
const zh = ['日','一','二','三','四','五','六'];
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let byDate = new Map();
const todayText = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const today = () => new Date(`${todayText()}T12:00:00`);
const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
let month = firstOfMonth(today()), week = today(), selectedDate = todayText();
const monthDays = () => days.filter(d => d.date.startsWith(`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-`));
function updateSummary() {
  const current = monthDays();
  $('heroNew').textContent = current.filter(d => d.new).length;
  $('heroEvents').textContent = current.filter(d => d.event).length;
  $('summaryMonth').textContent = `${month.getMonth()+1}月`;
  if (!$('summaryPanel').hidden) openSummary($('summaryPanel').dataset.kind, true);
}
function slotHtml(s) { return `<div class="slot"><b>${safe(s.slot)}</b><span>主播：${safe(s.host)}</span><span>助播：${safe(s.assist)}</span></div>`; }
function detailHtml(date) {
  const d = byDate.get(date), day = new Date(`${date}T12:00:00`);
  const info = [d?.new ? `<p class="detail-line"><strong>新品上新：</strong>${safe(d.new)}</p>` : '', d?.event ? `<p class="detail-line"><strong>平台活动：</strong>${safe(d.event)}</p>` : ''].join('');
  return `<h3>${day.getMonth()+1}月${day.getDate()}日 · 周${zh[day.getDay()]}</h3>${info}${d?.slots?.length ? d.slots.map(slotHtml).join('') : '<p class="empty">当天暂无直播排班</p>'}`;
}
function selectDate(date, scroll = false) {
  selectedDate = date;
  $('dayDetail').innerHTML = detailHtml(date);
  document.querySelectorAll('.day[data-date]').forEach(button => {
    const active = button.dataset.date === date;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (scroll && matchMedia('(max-width: 767px)').matches) $('dayDetail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderMonth() {
  const year = month.getFullYear(), m = month.getMonth(), count = new Date(year,m+1,0).getDate();
  $('monthTitle').textContent = `${year} 年 ${m+1} 月`;
  if (!selectedDate.startsWith(`${year}-${String(m+1).padStart(2,'0')}-`)) selectedDate = fmt(new Date(year,m,1));
  $('calendar').innerHTML = zh.map(x => `<div class="dow">周${x}</div>`).join('') +
    Array.from({length:new Date(year,m,1).getDay()}, () => '<div class="day muted" aria-hidden="true"></div>').join('') +
    Array.from({length:count}, (_,i) => {
      const n = i+1, date = fmt(new Date(year,m,n)), d = byDate.get(date);
      const description = [d?.new && '新品上新',d?.event && '平台活动',d?.slots?.length && `${d.slots.length} 场直播`].filter(Boolean).join('、') || '暂无排班';
      return `<button type="button" class="day" data-date="${date}" aria-label="${m+1}月${n}日，${description}" aria-pressed="false"><span class="num">${n}</span>${d?.new ? `<span class="chip" title="${safe(d.new)}">新品：${safe(d.new)}</span>` : ''}${d?.event ? `<span class="chip event" title="${safe(d.event)}">活动：${safe(d.event)}</span>` : ''}${d?.slots?.length ? `<span class="chip live">${d.slots.length} 场直播</span>` : ''}<span class="mobile-day-indicators" aria-hidden="true">${d?.new ? '<i class="new"></i>' : ''}${d?.event ? '<i class="event"></i>' : ''}${d?.slots?.length ? '<i class="live"></i>' : ''}</span></button>`;
    }).join('');
  $('calendar').querySelectorAll('button[data-date]').forEach(button => button.addEventListener('click', () => selectDate(button.dataset.date,true)));
  selectDate(selectedDate);
  updateSummary();
}
function monday(date) { const d = new Date(date); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d; }
function renderWeek() {
  const start = monday(week), end = new Date(start); end.setDate(end.getDate()+6);
  $('weekTitle').textContent = `${fmt(start).replaceAll('-',' / ')} — ${fmt(end).slice(5).replace('-',' / ')}`;
  $('weekList').innerHTML = Array.from({length:7}, (_,i) => {
    const date = new Date(start); date.setDate(date.getDate()+i);
    const d = byDate.get(fmt(date));
    const info = [d?.new ? `<div class="day-info"><div class="meta">抖音上新</div><p>${safe(d.new)}</p></div>` : '', d?.event ? `<div class="day-info"><div class="meta">抖音活动</div><p>${safe(d.event)}</p></div>` : ''].join('');
    return `<article class="b-card week-card"><div class="core"><div class="meta">${date.getMonth()+1}月 · ${String(date.getDate()).padStart(2,'0')}</div><h3>${date.getMonth()+1}月${date.getDate()}日 · 周${zh[date.getDay()]}</h3>${info}${d?.slots?.length ? d.slots.map(slotHtml).join('') : '<p class="empty">当天暂无直播排班</p>'}</div></article>`;
  }).join('');
}
function tab(name) {
  document.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active',b.dataset.tab===name); b.setAttribute('aria-pressed',String(b.dataset.tab===name)); });
  for (const view of ['month','week','purchase']) $(`${view}View`).classList.toggle('hide',name!==view);
  if (name==='week') renderWeek();
  $('schedule').scrollIntoView({behavior:'smooth',block:'start'});
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click',() => tab(b.dataset.tab)));
$('prev').onclick = () => { month.setMonth(month.getMonth()-1); renderMonth(); };
$('next').onclick = () => { month.setMonth(month.getMonth()+1); renderMonth(); };
$('today').onclick = () => { month = firstOfMonth(today()); selectedDate = todayText(); renderMonth(); };
$('weekPrev').onclick = () => { week.setDate(week.getDate()-7); renderWeek(); };
$('weekNext').onclick = () => { week.setDate(week.getDate()+7); renderWeek(); };
$('weekToday').onclick = () => { week = today(); renderWeek(); };
function openSummary(kind, refresh = false) {
  const panel = $('summaryPanel');
  const cards = document.querySelectorAll('[data-summary]');
  const closing = !refresh && !panel.hidden && panel.dataset.kind === kind;
  panel.hidden = closing;
  cards.forEach(card => {
    const active = !closing && card.dataset.summary === kind;
    card.setAttribute('aria-expanded', String(active));
    card.setAttribute('aria-pressed', String(active));
  });
  if (closing) return;
  panel.dataset.kind = kind;
  const titles = {new:'上新日期',event:'平台活动'};
  $('summaryTitle').textContent = `${month.getMonth()+1}月${titles[kind]}`;
  const entries = monthDays().filter(d => kind === 'new' ? d.new : d.event);
  $('summaryList').innerHTML = entries.map(d => {
    const day = new Date(`${d.date}T12:00:00`);
    const label = `${day.getMonth()+1}月${day.getDate()}日 · 周${zh[day.getDay()]}`;
    const detail = kind === 'new' ? d.new : d.event;
    return `<button type="button" data-summary-date="${d.date}" aria-label="查看${safe(label)}详情"><strong>${safe(label)}</strong><span>${safe(detail)}</span></button>`;
  }).join('') || '<p class="empty">暂无相关安排</p>';
  $('summaryList').querySelectorAll('[data-summary-date]').forEach(button => button.addEventListener('click', () => {
    const date = button.dataset.summaryDate;
    const target = new Date(`${date}T12:00:00`);
    month = new Date(target.getFullYear(), target.getMonth(), 1);
    tab('month');
    renderMonth();
    selectDate(date);
    $('dayDetail').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  if (!refresh) panel.scrollIntoView({behavior:'smooth',block:'start'});
}
document.querySelectorAll('[data-summary]').forEach(card => card.addEventListener('click', () => openSummary(card.dataset.summary)));
$('summaryClose').addEventListener('click', () => {
  $('summaryPanel').hidden = true;
  document.querySelectorAll('[data-summary]').forEach(card => { card.setAttribute('aria-expanded','false'); card.setAttribute('aria-pressed','false'); });
});
function syncNote(sync) {
  if (!sync?.lastSuccessAt) return '排班同步中，请稍后刷新';
  const time = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(sync.lastSuccessAt));
  // 超过 1 小时没同步成功（授权失效、WPS 表改名等），提醒维护的同事。
  const stale = sync.status === 'auth_required' || Date.now() - new Date(sync.lastSuccessAt) > 60 * 60_000;
  return stale ? `⚠ 排班同步已暂停，当前是 ${time} 的数据` : `排班更新于 ${time}`;
}
async function load() {
  $('calendar').innerHTML = '<p class="empty">排班加载中…</p>';
  try {
    const response = await fetch('api/schedule', {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    days = data.days ?? [];
    byDate = new Map(days.map(d => [d.date,d]));
    const note = syncNote(data.sync);
    $('syncNote').textContent = data.version ? `${note} · 版本 ${data.version}` : note;
    $('sideSync').textContent = note;
    const t = today();
    $('topNote').textContent = `${t.toLocaleString('en-US',{month:'long'}).toUpperCase()} / ${t.getFullYear()}`;
    renderMonth();
  } catch (error) {
    console.error('排班读取失败', error);
    $('calendar').innerHTML = '<p class="empty">排班暂时读取不到，请稍后刷新。</p>';
  }
}
load();
