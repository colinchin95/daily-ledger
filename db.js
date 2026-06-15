// 資料層：IndexedDB(idb-keyval 包一層)
// 金額一律以「分」為單位的整數儲存(RM12.50 → 1250)
import { get, set } from './lib/idb-keyval.js';

const KEY_ENTRIES = 'entries';
const KEY_CATEGORIES = 'categories';
const KEY_META = 'meta';
const KEY_RECURRING = 'recurring';

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food',      name: '餐飲', color: '#E8A33D', type: 'expense' },
  { id: 'transport', name: '交通', color: '#4FA3E0', type: 'expense' },
  { id: 'shopping',  name: '購物', color: '#D96BA0', type: 'expense' },
  { id: 'fun',       name: '娛樂', color: '#9B7BD8', type: 'expense' },
  { id: 'home',      name: '居家', color: '#5BBF8A', type: 'expense' },
  { id: 'medical',   name: '醫療', color: '#E06C5B', type: 'expense' },
  { id: 'other',     name: '其他', color: '#8C95A3', type: 'expense' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary',       name: '薪資',   color: '#6BCB8F', type: 'income' },
  { id: 'bonus',        name: '獎金',   color: '#EDC75A', type: 'income' },
  { id: 'investment',   name: '投資',   color: '#58B7D4', type: 'income' },
  { id: 'other-income', name: '其他收入', color: '#8C95A3', type: 'income' },
];

export async function getCategories() {
  let cats = await get(KEY_CATEGORIES);
  if (!cats || !cats.length) {
    cats = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
    await set(KEY_CATEGORIES, cats);
    return cats;
  }
  // 遷移:舊資料沒有 type → 視為支出;沒有收入分類 → 補預設
  let changed = false;
  for (const c of cats) {
    if (!c.type) { c.type = 'expense'; changed = true; }
  }
  if (!cats.some((c) => c.type === 'income')) {
    cats = [...cats, ...DEFAULT_INCOME_CATEGORIES];
    changed = true;
  }
  if (changed) await set(KEY_CATEGORIES, cats);
  return cats;
}

export async function saveCategories(cats) {
  await set(KEY_CATEGORIES, cats);
}

export async function getEntries() {
  const entries = (await get(KEY_ENTRIES)) ?? [];
  // 遷移:舊帳目沒有 type → 視為支出
  let changed = false;
  for (const e of entries) {
    if (!e.type) { e.type = 'expense'; changed = true; }
  }
  if (changed) await set(KEY_ENTRIES, entries);
  return entries;
}

export async function saveEntries(entries) {
  await set(KEY_ENTRIES, entries);
}

// meta:整月預算等設定(會包含在備份中)
export async function getMeta() {
  return (await get(KEY_META)) ?? {};
}

export async function saveMeta(meta) {
  await set(KEY_META, meta);
}

// recurring:固定/循環支出範本
export async function getRecurring() {
  return (await get(KEY_RECURRING)) ?? [];
}

export async function saveRecurring(list) {
  await set(KEY_RECURRING, list);
}
