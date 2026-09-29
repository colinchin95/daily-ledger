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

// 分類色(v1.5):避開純綠、純紅;Shopping / Entertainment / Medical 三色分明;Home 不是綠。
// 已用 dataviz validate_palette.js 驗證:任兩色正常視覺 ΔE ≥ 15、相鄰色色盲 ΔE ≥ 9.7、對比 ≥ 3:1。
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food',      name: 'Food',          color: '#CF6E1E', type: 'expense' },
  { id: 'transport', name: 'Transport',     color: '#2F80D8', type: 'expense' },
  { id: 'shopping',  name: 'Shopping',      color: '#C23F7C', type: 'expense' },
  { id: 'fun',       name: 'Entertainment', color: '#8A45C8', type: 'expense' },
  { id: 'home',      name: 'Home',          color: '#3A4C94', type: 'expense' },
  { id: 'medical',   name: 'Medical',       color: '#0D9488', type: 'expense' },
  { id: 'other',     name: 'Other',         color: '#8A8078', type: 'expense' },
];

// v1.4 以前的預設色 → v1.5。只換「還是舊預設色」的,使用者自己改過的顏色不動。
const LEGACY_DEFAULT_COLORS = {
  food: '#B5763C', transport: '#566B96', shopping: '#B4697A',
  fun: '#96577E', home: '#4E8C7B', medical: '#A6452F',
};

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

// 收入分類(v1.6 擴充):馬來西亞常見收入來源。順序即顯示順序(8 個剛好一格排滿)
const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary',       name: 'Salary',         color: '#6E8B4A', type: 'income' },
  { id: 'bonus',        name: 'Bonus',          color: '#C69A4E', type: 'income' },
  { id: 'business',     name: 'Business',       color: '#B0592E', type: 'income' },
  { id: 'investment',   name: 'Investment',     color: '#3E7C8A', type: 'income' },
  { id: 'rental',       name: 'Rental Income',  color: '#3A4C94', type: 'income' },
  { id: 'gifts',        name: 'Gifts & Angpao', color: '#C23F7C', type: 'income' },
  { id: 'refunds',      name: 'Refunds & Aid',  color: '#2F80D8', type: 'income' },
  { id: 'other-income', name: 'Other Income',   color: '#8A8078', type: 'income' },
];

const DEFAULT_INCOME_SUBCATEGORIES = [
  ['salary', 'salary-allowance', 'Allowance & OT'],
  ['salary', 'salary-commission', 'Commission'],
  ['business', 'business-freelance', 'Freelance'],
  ['business', 'business-online', 'Online selling'],
  ['business', 'business-gig', 'Gig / e-hailing'],
  ['investment', 'inv-dividend', 'Stock dividends'],
  ['investment', 'inv-asb', 'ASB / Unit trust'],
  ['investment', 'inv-epf', 'EPF dividend'],
  ['investment', 'inv-interest', 'FD & interest'],
  ['investment', 'inv-gains', 'Capital gains'],
  ['refunds', 'refund-tax', 'Tax refund'],
  ['refunds', 'refund-aid', 'Govt aid (STR/SARA)'],
  ['refunds', 'refund-cashback', 'Cashback & rebates'],
].map(([parentId, id, name]) => {
  const parent = DEFAULT_INCOME_CATEGORIES.find((c) => c.id === parentId);
  return { id, name, color: parent.color, type: 'income', parentId };
});

const KEY_CAT_MIGRATIONS = 'catMigrations';

export async function getCategories() {
  let cats = await get(KEY_CATEGORIES);
  if (!cats || !cats.length) {
    // 新安裝:整套預設(含馬來西亞子分類)。既有用戶不動,避免改到他們的資料。
    cats = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_SUBCATEGORIES, ...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_INCOME_SUBCATEGORIES];
    await set(KEY_CATEGORIES, cats);
    await set(KEY_CAT_MIGRATIONS, ['income-v16']);
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
  // 遷移(v1.5 新色盤):預設分類若還是舊預設色 → 換新色;它的子分類存的色跟著換
  const newColor = new Map(DEFAULT_EXPENSE_CATEGORIES.map((c) => [c.id, c.color]));
  for (const c of cats) {
    const legacyOwn = LEGACY_DEFAULT_COLORS[c.id];
    const legacyParent = c.parentId && LEGACY_DEFAULT_COLORS[c.parentId];
    if (legacyOwn && c.color === legacyOwn) { c.color = newColor.get(c.id); changed = true; }
    else if (legacyParent && c.color === legacyParent) { c.color = newColor.get(c.parentId); changed = true; }
  }
  // 遷移(v1.6):既有用戶補上新的收入分類 / 子分類。只跑一次(使用者之後刪掉的不會再冒出來),
  // 只補缺的 id,不動使用者已有的分類。
  const done = (await get(KEY_CAT_MIGRATIONS)) ?? [];
  if (!done.includes('income-v16')) {
    const have = new Set(cats.map((c) => c.id));
    const addTop = DEFAULT_INCOME_CATEGORIES.filter((c) => !have.has(c.id));
    if (addTop.length) {
      // 新的頂層插在「Other Income」前面,Other 維持最後
      const at = cats.findIndex((c) => c.id === 'other-income');
      const fresh = addTop.filter((c) => c.id !== 'other-income').map((c) => ({ ...c }));
      if (at >= 0) cats.splice(at, 0, ...fresh); else cats.push(...addTop.map((c) => ({ ...c })));
    }
    const parents = new Set(cats.map((c) => c.id));
    for (const sub of DEFAULT_INCOME_SUBCATEGORIES) {
      if (have.has(sub.id) || !parents.has(sub.parentId)) continue;
      const parent = cats.find((c) => c.id === sub.parentId);
      cats.push({ ...sub, color: parent?.color || sub.color });
    }
    changed = true;
    await set(KEY_CAT_MIGRATIONS, [...done, 'income-v16']);
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
