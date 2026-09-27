// 資料層：IndexedDB(idb-keyval 包一層)
// 金額一律以「分」為單位的整數儲存(RM12.50 → 1250)
import { get, set } from './lib/idb-keyval.js';

const KEY_ENTRIES = 'entries';
const KEY_CATEGORIES = 'categories';
const KEY_META = 'meta';
const KEY_RECURRING = 'recurring';
const KEY_ACCOUNTS = 'accounts';

// 預設帳戶(新安裝才會用到)。顯示名稱由 app.js 的 ACCOUNT_NAMES 依 id 決定。
const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: 'Cash',         color: '#6E8B4A', openingCents: 0 },
  { id: 'bank', name: 'Bank',         color: '#566B96', openingCents: 0 },
  { id: 'tng',  name: "Touch 'n Go",  color: '#3E7C8A', openingCents: 0 },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food',      name: 'Food',          color: '#B5763C', type: 'expense' },
  { id: 'transport', name: 'Transport',     color: '#566B96', type: 'expense' },
  { id: 'shopping',  name: 'Shopping',      color: '#B4697A', type: 'expense' },
  { id: 'fun',       name: 'Entertainment', color: '#96577E', type: 'expense' },
  { id: 'home',      name: 'Home',          color: '#4E8C7B', type: 'expense' },
  { id: 'medical',   name: 'Medical',       color: '#A6452F', type: 'expense' },
  { id: 'other',     name: 'Other',         color: '#8A8078', type: 'expense' },
];

// 子分類(只有一層)。在地化:照馬來西亞人實際花錢的方式分。
// id 固定,多台裝置各自初始化時同步合併也不會重複。
const DEFAULT_SUBCATEGORIES = [
  ['food', 'food-mamak', 'Mamak'],
  ['food', 'food-hawker', 'Hawker & Kopitiam'],
  ['food', 'food-groceries', 'Groceries'],
  ['food', 'food-drinks', 'Coffee & Drinks'],
  ['food', 'food-delivery', 'Food Delivery'],
  ['transport', 'transport-petrol', 'Petrol'],
  ['transport', 'transport-ehailing', 'Grab / e-hailing'],
  ['transport', 'transport-toll', 'Toll'],
  ['transport', 'transport-parking', 'Parking'],
  ['transport', 'transport-public', 'LRT / MRT / Bus'],
  ['shopping', 'shopping-online', 'Online Shopping'],
  ['shopping', 'shopping-clothing', 'Clothing'],
  ['shopping', 'shopping-personal', 'Personal Care'],
  ['fun', 'fun-movies', 'Movies'],
  ['fun', 'fun-subscriptions', 'Subscriptions'],
  ['fun', 'fun-travel', 'Travel'],
  ['home', 'home-rent', 'Rent / Loan'],
  ['home', 'home-electricity', 'Electricity'],
  ['home', 'home-water', 'Water'],
  ['home', 'home-internet', 'Internet & Phone'],
  ['medical', 'medical-clinic', 'Clinic'],
  ['medical', 'medical-pharmacy', 'Pharmacy'],
  ['medical', 'medical-insurance', 'Insurance'],
].map(([parentId, id, name]) => {
  const parent = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === parentId);
  return { id, name, color: parent.color, type: 'expense', parentId };
});

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary',       name: 'Salary',       color: '#6E8B4A', type: 'income' },
  { id: 'bonus',        name: 'Bonus',        color: '#C69A4E', type: 'income' },
  { id: 'investment',   name: 'Investment',   color: '#3E7C8A', type: 'income' },
  { id: 'other-income', name: 'Other Income', color: '#8A8078', type: 'income' },
];

export async function getCategories() {
  let cats = await get(KEY_CATEGORIES);
  if (!cats || !cats.length) {
    // 新安裝:整套預設(含馬來西亞子分類)。既有用戶不動,避免改到他們的資料。
    cats = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_SUBCATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
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
  // 遷移:舊帳目沒有 type → 視為支出;沒有帳戶 → 歸入現金
  let changed = false;
  for (const e of entries) {
    if (!e.type) { e.type = 'expense'; changed = true; }
    if (!e.accountId) { e.accountId = 'cash'; changed = true; }
  }
  if (changed) await set(KEY_ENTRIES, entries);
  return entries;
}

export async function getAccounts() {
  let accounts = await get(KEY_ACCOUNTS);
  if (!accounts || !accounts.length) {
    accounts = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
    await set(KEY_ACCOUNTS, accounts);
  }
  return accounts;
}

export async function saveAccounts(accounts) {
  await set(KEY_ACCOUNTS, accounts);
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
