// 把 WPS 多维表「N月排班表」的记录转成网页需要的每日排班。纯函数，便于测试。
export const SOURCE_FIELDS = Object.freeze({
  date: ['日期'],
  slots: [['早场', '抖音主号-早'], ['中午场', '抖音主号-午'], ['晚场', '抖音主号-晚']],
  new: ['抖音上新', '抖音上新产品名', '上新产品名称'],
  event: ['抖音活动'],
});

export const READ_FIELD_NAMES = [
  ...SOURCE_FIELDS.date,
  ...SOURCE_FIELDS.slots.map(([, name]) => name),
  ...SOURCE_FIELDS.new,
  ...SOURCE_FIELDS.event,
];

export function sheetMonthNumber(name) {
  const match = String(name ?? '').trim().match(/^(\d{1,2})月排班表$/);
  const month = match ? Number(match[1]) : NaN;
  return month >= 1 && month <= 12 ? month : null;
}

export function toText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('、');
  if (typeof value === 'object') return toText(value.text ?? value.value ?? value.name ?? '');
  return String(value).trim();
}

export function parseDate(value) {
  const match = toText(value).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const firstText = (fields, names) => names.map(name => toText(fields[name])).find(Boolean) ?? '';
const splitPeople = text => text.split(/[,，、]/).map(name => name.trim()).filter(Boolean);

export function recordFields(record) {
  const fields = record?.fields;
  if (typeof fields === 'string') return fields ? JSON.parse(fields) : {};
  return fields && typeof fields === 'object' ? fields : {};
}

export function parseRecord(fields) {
  const date = parseDate(fields[SOURCE_FIELDS.date[0]]);
  if (!date) return null;
  const slots = SOURCE_FIELDS.slots.flatMap(([slot, name]) => {
    const people = splitPeople(toText(fields[name]));
    return people.length ? [{ slot, host: people[0], assist: people.slice(1).join('、') }] : [];
  });
  return { date, new: firstText(fields, SOURCE_FIELDS.new), event: firstText(fields, SOURCE_FIELDS.event), slots };
}

export class SheetParseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// 一个月表只接受该月份的日期，日期必须唯一、年份唯一；空白行（没有日期）跳过。
export function parseMonthSheet(records, monthNumber) {
  const days = [];
  let blank = 0;
  let otherMonth = 0;
  for (const record of records) {
    const day = parseRecord(recordFields(record));
    if (!day) { blank += 1; continue; }
    if (Number(day.date.slice(5, 7)) !== monthNumber) { otherMonth += 1; continue; }
    days.push({ ...day, recordId: String(record.id ?? '') });
  }
  if (!days.length) throw new SheetParseError('NO_DATED_ROWS', `${monthNumber}月排班表没有可识别的日期`);
  const years = new Set(days.map(day => day.date.slice(0, 4)));
  if (years.size !== 1) throw new SheetParseError('MIXED_YEARS', `${monthNumber}月排班表包含多个年份`);
  const seen = new Set();
  for (const day of days) {
    if (seen.has(day.date)) throw new SheetParseError('DUPLICATE_DATE', `${day.date} 重复出现`);
    seen.add(day.date);
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { month: days[0].date.slice(0, 7), days, skipped: { blank, otherMonth } };
}
