import {
  getEntries, saveEntries, getCategories, saveCategories,
  getMeta, saveMeta, getRecurring, saveRecurring,
} from './db.js';

// ---------- 多語系 ----------
const STRINGS = {
  zh: {
    appTitle: 'Centsei',
    categories: '分類',
    done: '完成',
    cancel: '取消',
    delete: '刪除',
    save: '儲存',
    entries: '明細',
    reports: '報表',
    emptyTitle: '還沒有任何帳目',
    emptyHint: '點下方「＋」記下第一筆',
    expense: '支出',
    income: '收入',
    notePlaceholder: '備註（可空）',
    today: '今天',
    yesterday: '昨天',
    monthSpending: '本月支出',
    balance: '結餘',
    noExpense: '本月沒有支出記錄',
    noIncome: '本月沒有收入記錄',
    settings: '設定',
    categoriesSection: '分類',
    expenseCats: '支出分類',
    incomeCats: '收入分類',
    backupSection: '資料備份',
    exportBackup: '匯出 JSON 備份',
    importBackup: '匯入 JSON 備份',
    backupHint: '帳目只存在這台裝置上,建議定期匯出備份。',
    appSection: 'App',
    updateLatest: '更新到最新版',
    updateHint: '下載最新版本並重新整理(資料不受影響)。',
    updating: '更新中…',
    offlineNoUpdate: '目前離線,連上網路後再更新。',
    back: '返回',
    importInvalid: '這個檔案不是有效的記帳備份。',
    importConfirmMerge: (n) => `備份包含 ${n} 筆帳目,將與現有資料合併(相同項目以備份內容為準)。繼續?`,
    importDone: (n, m) => `已匯入 ${n} 筆帳目、${m} 個分類。`,
    newCategory: '新增分類',
    editCategory: '編輯分類',
    categoryName: '分類名稱',
    deleteCategory: '刪除分類',
    uncategorized: '未分類',
    entryCount: (n) => `${n} 筆`,
    confirmDeleteEntry: '確定要刪除這筆帳目嗎?',
    confirmDeleteCategory: '確定要刪除這個分類嗎?',
    confirmDeleteCategoryUsed: (n) => `已有 ${n} 筆帳目使用此分類,刪除後將顯示為「未分類」。確定刪除?`,
    // 預算
    monthlyBudget: '每月總預算',
    budgetSpent: '本月已花',
    budgetLeft: (s) => `剩 ${s}`,
    budgetOver: (s) => `超支 ${s}`,
    overBudgetTag: '超支',
    categoryBudget: '每月預算（可空）',
    budgetVs: (spent, budget) => `${spent} / ${budget}`,
    // 固定支出
    recurringSection: '固定支出',
    newRecurring: '新增固定支出',
    editRecurring: '編輯固定支出',
    recurringHint: '每月自動產生一筆,可照常編輯或刪除。',
    recurringEmpty: '尚未設定固定支出',
    recurringDay: (d) => `每月 ${d} 號`,
    dayOfMonth: '每月幾號',
    amountLabel: '金額',
    // 搜尋
    searchPlaceholder: '搜尋備註、分類或金額',
    noResults: '找不到符合的帳目',
    // 趨勢
    trendExpense: '近 6 個月支出',
    trendIncome: '近 6 個月收入',
    // App 鎖
    lockSection: 'App 鎖',
    lockStatusOn: '已開啟',
    lockStatusOff: '關閉',
    setPin: '設定 PIN 碼',
    removePin: '移除 PIN 碼',
    lockHint: '開啟後每次打開 App 需輸入 PIN(僅存在本機,不含在備份中)。',
    enterPin: '輸入 PIN 碼',
    newPinTitle: '設定 PIN(4–6 位數)',
    confirmPinTitle: '再次輸入確認',
    pinMismatch: '兩次輸入不一致,請重試',
    wrongPin: 'PIN 碼錯誤',
    confirmRemovePin: '確定要移除 PIN 碼嗎?',
    // 備份安全網
    exportCsv: '匯出 CSV(試算表)',
    backupReminderDays: (n) => `已 ${n} 天沒備份了,建議現在備份一次。`,
    backupReminderNever: '你的帳目只在這台裝置上,建議現在備份一次。',
    backupNow: '立即備份',
    later: '稍後',
    lastBackup: (n) => `上次備份:${n} 天前`,
    lastBackupToday: '上次備份:今天',
    lastBackupNever: '尚未備份',
    shareTitle: 'Centsei 備份',
    // 雲端同步
    syncSection: '雲端同步',
    syncOn: '已開啟',
    syncOff: '關閉',
    syncSetup: '雲端同步',
    syncIntro: '用一組「同步碼」加密同步。換手機或刪 App 重裝時,輸入同一組碼即可還原。資料在裝置上先加密,伺服器看不到內容。',
    syncCodeLabel: '同步碼',
    syncGenerate: '產生新的',
    syncEnable: '啟用同步',
    syncEnabling: '啟用中…',
    syncDisable: '停止同步',
    syncCopy: '複製同步碼',
    syncCopied: '已複製',
    syncCodeTooShort: '同步碼至少 8 碼',
    syncSavedWarn: '請先抄下或複製同步碼再離開——遺失將無法解密還原。',
    syncedAt: (n) => (n <= 0 ? '剛剛同步' : `${n} 分鐘前同步`),
    syncedHours: (n) => `${n} 小時前同步`,
    syncedDays: (n) => `${n} 天前同步`,
    syncNever: '尚未同步',
    syncError: '同步失敗,稍後會自動重試。',
    syncDisableConfirm: '停止同步?資料仍留在這台裝置,但不再上傳/下載。',
    // 收據辨識
    scanReceipt: '掃描收據',
    scanningReceipt: '辨識中…',
    receiptFailed: '收據辨識失敗,請改用手動輸入。',
    receiptQuota: (n) => `本月免費掃描已用完(${n} 張)。可手動記帳,或下個月再試。`,
    receiptRate: '掃描太頻繁,請稍後再試。',
    receiptBusy: '伺服器忙碌中,請稍後再試。',
    langBtn: 'EN',
  },
  en: {
    appTitle: 'Centsei',
    categories: 'Categories',
    done: 'Done',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    entries: 'Entries',
    reports: 'Reports',
    emptyTitle: 'No entries yet',
    emptyHint: 'Tap "+" below to add your first one',
    expense: 'Expense',
    income: 'Income',
    notePlaceholder: 'Note (optional)',
    today: 'Today',
    yesterday: 'Yesterday',
    monthSpending: 'Spent this month',
    balance: 'Balance',
    noExpense: 'No expenses this month',
    noIncome: 'No income this month',
    settings: 'Settings',
    categoriesSection: 'Categories',
    expenseCats: 'Expense',
    incomeCats: 'Income',
    backupSection: 'Backup',
    exportBackup: 'Export JSON backup',
    importBackup: 'Import JSON backup',
    backupHint: 'Your data lives only on this device — export a backup regularly.',
    appSection: 'App',
    updateLatest: 'Update to latest',
    updateHint: 'Download the latest version and reload. Your data is untouched.',
    updating: 'Updating…',
    offlineNoUpdate: 'You are offline — reconnect to update.',
    back: 'Back',
    importInvalid: 'This file is not a valid ledger backup.',
    importConfirmMerge: (n) =>
      `The backup contains ${n} ${n === 1 ? 'entry' : 'entries'} and will be merged with your current data (backup wins on conflicts). Continue?`,
    importDone: (n, m) => `Imported ${n} ${n === 1 ? 'entry' : 'entries'} and ${m} ${m === 1 ? 'category' : 'categories'}.`,
    newCategory: 'New Category',
    editCategory: 'Edit Category',
    categoryName: 'Category name',
    deleteCategory: 'Delete Category',
    uncategorized: 'Uncategorized',
    entryCount: (n) => (n === 1 ? '1 entry' : `${n} entries`),
    confirmDeleteEntry: 'Delete this entry?',
    confirmDeleteCategory: 'Delete this category?',
    confirmDeleteCategoryUsed: (n) =>
      `${n === 1 ? '1 entry uses' : `${n} entries use`} this category; they will show as "Uncategorized" after deletion. Delete anyway?`,
    // Budget
    monthlyBudget: 'Monthly budget',
    budgetSpent: 'Spent this month',
    budgetLeft: (s) => `${s} left`,
    budgetOver: (s) => `${s} over`,
    overBudgetTag: 'over',
    categoryBudget: 'Monthly budget (optional)',
    budgetVs: (spent, budget) => `${spent} / ${budget}`,
    // Recurring
    recurringSection: 'Recurring',
    newRecurring: 'New recurring',
    editRecurring: 'Edit recurring',
    recurringHint: 'Auto-added each month; edit or delete like any entry.',
    recurringEmpty: 'No recurring items yet',
    recurringDay: (d) => `Day ${d}`,
    dayOfMonth: 'Day of month',
    amountLabel: 'Amount',
    // Search
    searchPlaceholder: 'Search note, category or amount',
    noResults: 'No matching entries',
    // Trend
    trendExpense: 'Spending · last 6 months',
    trendIncome: 'Income · last 6 months',
    // App lock
    lockSection: 'App Lock',
    lockStatusOn: 'On',
    lockStatusOff: 'Off',
    setPin: 'Set passcode',
    removePin: 'Remove passcode',
    lockHint: 'When on, you must enter the passcode to open the app (stored on this device only, not in backups).',
    enterPin: 'Enter passcode',
    newPinTitle: 'Set a passcode (4–6 digits)',
    confirmPinTitle: 'Re-enter to confirm',
    pinMismatch: 'Passcodes do not match, try again',
    wrongPin: 'Wrong passcode',
    confirmRemovePin: 'Remove the passcode?',
    // Backup safety net
    exportCsv: 'Export CSV (spreadsheet)',
    backupReminderDays: (n) => `It's been ${n} days since your last backup — back up now.`,
    backupReminderNever: 'Your data lives only on this device — back it up now.',
    backupNow: 'Back up now',
    later: 'Later',
    lastBackup: (n) => `Last backup: ${n} day${n === 1 ? '' : 's'} ago`,
    lastBackupToday: 'Last backup: today',
    lastBackupNever: 'Never backed up',
    shareTitle: 'Centsei backup',
    // Cloud sync
    syncSection: 'Cloud Sync',
    syncOn: 'On',
    syncOff: 'Off',
    syncSetup: 'Cloud Sync',
    syncIntro: 'Sync with one "sync code". On a new phone, or after deleting and reinstalling, enter the same code to restore. Data is encrypted on your device — the server never sees it.',
    syncCodeLabel: 'Sync code',
    syncGenerate: 'Generate new',
    syncEnable: 'Enable sync',
    syncEnabling: 'Enabling…',
    syncDisable: 'Stop syncing',
    syncCopy: 'Copy sync code',
    syncCopied: 'Copied',
    syncCodeTooShort: 'Sync code must be at least 8 characters',
    syncSavedWarn: 'Copy or write down your sync code first — if lost, the data cannot be decrypted.',
    syncedAt: (n) => (n <= 0 ? 'Synced just now' : `Synced ${n} min ago`),
    syncedHours: (n) => `Synced ${n}h ago`,
    syncedDays: (n) => `Synced ${n}d ago`,
    syncNever: 'Not synced yet',
    syncError: 'Sync failed — will retry automatically.',
    syncDisableConfirm: 'Stop syncing? Data stays on this device but no longer uploads/downloads.',
    // Receipt scanning
    scanReceipt: 'Scan receipt',
    scanningReceipt: 'Scanning…',
    receiptFailed: "Couldn't read the receipt — please enter manually.",
    receiptQuota: (n) => `You've used all ${n} free scans this month. Add it manually, or try next month.`,
    receiptRate: 'Too many scans right now — please try again shortly.',
    receiptBusy: 'The server is busy — please try again later.',
    langBtn: '中文',
  },
};

let lang = localStorage.getItem('lang') === 'en' ? 'en' : 'zh';

// App 版本(與 sw.js 的 VERSION 同步,顯示在設定頁)
const APP_VERSION = 'v11';

function t(key, ...args) {
  const v = STRINGS[lang][key];
  return typeof v === 'function' ? v(...args) : v;
}

// ---------- 金額工具:儲存與計算全用整數「分」,只有顯示才轉換 ----------
let myrFmt, dateFmt, monthFmt, shortDateFmt;

function buildFormatters() {
  const locale = lang === 'en' ? 'en-MY' : 'zh-Hant';
  myrFmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MYR',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  dateFmt = new Intl.DateTimeFormat(
    locale,
    lang === 'en'
      ? { weekday: 'short', day: 'numeric', month: 'short' }
      : { month: 'long', day: 'numeric', weekday: 'short' }
  );
  monthFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
  shortDateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
}

function shortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return shortDateFmt.format(new Date(y, m - 1, d));
}

// 顯示成「RM 12.50」(currency 符號後保證一個空格)
export function formatRM(cents) {
  return myrFmt
    .formatToParts(cents / 100)
    .map((p) => (p.type === 'currency' ? p.value + ' ' : p.value))
    .join('')
    .replace(/\s+/g, ' ');
}

// 鍵盤輸入字串 → 分(純字串/整數運算,不經過浮點加總)
function toCents(str) {
  if (!str) return 0;
  const [intPart = '0', fracPart = ''] = str.split('.');
  return parseInt(intPart || '0', 10) * 100 + parseInt((fracPart + '00').slice(0, 2), 10);
}

// 分 → 鍵盤輸入字串(編輯時回填用)
function centsToInputStr(cents) {
  const i = Math.trunc(cents / 100);
  const f = cents % 100;
  return f === 0 ? String(i) : `${i}.${String(f).padStart(2, '0')}`;
}

// 自由文字金額(可含 RM、逗號)→ 分
function parseMoney(str) {
  const clean = String(str).replace(/[^0-9.]/g, '');
  return toCents(clean);
}

// 預算使用率 → 顏色狀態
function budgetColor(ratio) {
  if (ratio > 1) return 'var(--red)';
  if (ratio >= 0.8) return '#E8A33D';
  return 'var(--green)';
}

// ---------- 日期工具(本地時區) ----------
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const todayStr = () => ymd(new Date());

function dateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const label = dateFmt.format(new Date(y, m - 1, d));
  if (dateStr === todayStr()) return `${t('today')} · ${label}`;
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (dateStr === ymd(yest)) return `${t('yesterday')} · ${label}`;
  return label;
}

// ---------- 狀態 ----------
let entries = [];
let categories = [];
let meta = {};          // { monthlyBudgetCents }
let recurring = [];     // 固定支出範本
let searchQuery = '';   // 明細搜尋字串

let amountStr = '';
let selectedCatId = null;
let editingId = null;        // null = 新增模式
let sheetType = 'expense';   // 記帳面板:支出/收入

const now = new Date();
let reportMonth = { y: now.getFullYear(), m: now.getMonth() + 1 };
let reportType = 'expense';  // 報表佔比:支出/收入

let catManageType = 'expense'; // 分類管理目前分頁
let editingCatId = null;       // null = 新增分類
let editorColor = null;

// 固定支出編輯器狀態
let editingRecurId = null;     // null = 新增
let recurType = 'expense';
let recurCatId = null;

const PALETTE = [
  '#E8A33D', '#EDC75A', '#E06C5B', '#FF8FA3', '#D96BA0', '#C77DBA',
  '#9B7BD8', '#6E8BE0', '#4FA3E0', '#58B7D4', '#5BBFA8', '#6BCB8F',
  '#A8C95B', '#C4A484', '#8C95A3', '#C9CCD4',
];

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const listEl = $('#entry-list');
const emptyEl = $('#empty-state');
const viewListEl = $('#view-list');
const viewReportEl = $('#view-report');
const tabListBtn = $('#tab-list');
const tabReportBtn = $('#tab-report');
const langBtn = $('#lang-btn');

const sheetEl = $('#sheet');
const sheetBackdropEl = $('#sheet-backdrop');
const amountTextEl = $('#amount-text');
const categoryRowEl = $('#category-row');
const noteInput = $('#note-input');
const dateInput = $('#date-input');
const saveBtn = $('#save-btn');
const deleteBtn = $('#sheet-delete');
const typeSegEl = $('#type-seg');

const monthLabelEl = $('#month-label');
const monthPrevBtn = $('#month-prev');
const monthNextBtn = $('#month-next');
const reportExpenseEl = $('#report-expense');
const reportIncomeEl = $('#report-income');
const reportBalanceEl = $('#report-balance');
const reportSegEl = $('#report-seg');
const breakdownEl = $('#report-breakdown');

const catModalEl = $('#cat-modal');
const catSegEl = $('#cat-seg');
const catListEl = $('#cat-list');
const catEditorEl = $('#cat-editor');
const catEditorBackdropEl = $('#cat-editor-backdrop');
const catNameInput = $('#cat-name-input');
const colorGridEl = $('#color-grid');
const catDeleteBtn = $('#cat-delete-btn');

const detailModalEl = $('#detail-modal');
const detailTitleEl = $('#detail-title');
const detailSummaryEl = $('#detail-summary');
const detailListEl = $('#detail-list');
let detailCatId = null;   // 目前開啟的分類明細(null = 未開啟)

// 搜尋
const searchInput = $('#search-input');
const searchClearBtn = $('#search-clear');

// 備份安全網
const backupBannerEl = $('#backup-banner');
const backupStatusEl = $('#backup-status');

// 報表:預算卡 + 趨勢卡
const budgetCardEl = $('#budget-card');
const trendCardEl = $('#trend-card');

// 分類編輯器:預算欄
const catBudgetField = $('#cat-budget-field');
const catBudgetInput = $('#cat-budget-input');

// 設定:整月預算、固定支出、App 鎖
const budgetInput = $('#budget-input');
const recurListEl = $('#recur-list');
const lockRowEl = $('#lock-row');
const lockStatusEl = $('#lock-status');

// 固定支出編輯器
const recurEditorEl = $('#recur-editor');
const recurEditorBackdropEl = $('#recur-editor-backdrop');
const recurTypeSegEl = $('#recur-type-seg');
const recurAmountInput = $('#recur-amount-input');
const recurCatRowEl = $('#recur-cat-row');
const recurNoteInput = $('#recur-note-input');
const recurDayInput = $('#recur-day-input');
const recurDeleteBtn = $('#recur-delete-btn');

// PIN 鎖
const lockScreenEl = $('#lock-screen');

// 雲端同步
const syncRowEl = $('#sync-row');
const syncStatusEl = $('#sync-status');
const syncSheetEl = $('#sync-sheet');
const syncSheetBackdropEl = $('#sync-sheet-backdrop');
const syncCodeInput = $('#sync-code-input');

const catMap = () => new Map(categories.map((c) => [c.id, c]));
const catsOfType = (type) => categories.filter((c) => c.type === type);

// 內建分類名稱會跟著介面語言切換;使用者改過名的分類(renamed=true)維持自訂名稱
const CATEGORY_NAMES = {
  food:           { zh: '餐飲', en: 'Food' },
  transport:      { zh: '交通', en: 'Transport' },
  shopping:       { zh: '購物', en: 'Shopping' },
  fun:            { zh: '娛樂', en: 'Entertainment' },
  home:           { zh: '居家', en: 'Home' },
  medical:        { zh: '醫療', en: 'Medical' },
  other:          { zh: '其他', en: 'Other' },
  salary:         { zh: '薪資', en: 'Salary' },
  bonus:          { zh: '獎金', en: 'Bonus' },
  investment:     { zh: '投資', en: 'Investment' },
  'other-income': { zh: '其他收入', en: 'Other Income' },
};

function catName(cat) {
  if (!cat) return t('uncategorized');
  const builtin = CATEGORY_NAMES[cat.id];
  if (builtin && !cat.renamed) return builtin[lang === 'en' ? 'en' : 'zh'];
  return cat.name;
}

function setSegActive(segEl, type) {
  segEl.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
}

// ---------- 語言切換 ----------
function applyLanguage() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  document.body.dataset.lang = lang;
  document.title = t('appTitle');
  langBtn.textContent = t('langBtn');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

function setLang(l) {
  lang = l;
  localStorage.setItem('lang', l);
  buildFormatters();
  applyLanguage();
  // 動態內容全部重畫
  renderList();
  renderReport();
  renderCatList();
  if (detailCatId !== null) renderCatDetail();
  $('#cat-editor-title').textContent = editingCatId ? t('editCategory') : t('newCategory');
}

// ---------- 明細列表 ----------
function matchesSearch(entry, cats) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  if (entry.note && entry.note.toLowerCase().includes(q)) return true;
  if (catName(cats.get(entry.categoryId)).toLowerCase().includes(q)) return true;
  const qNum = q.replace(/[^0-9.]/g, '');
  if (qNum && centsToInputStr(entry.amountCents).includes(qNum)) return true;
  return false;
}

function renderList() {
  const cats = catMap();
  const sorted = [...entries]
    .filter((e) => matchesSearch(e, cats))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const searching = searchQuery.trim().length > 0;
  emptyEl.hidden = entries.length > 0;          // 完全沒帳目才顯示空狀態
  listEl.innerHTML = '';

  // 搜尋無結果
  if (searching && !sorted.length && entries.length > 0) {
    const nr = document.createElement('div');
    nr.className = 'breakdown-empty';
    nr.textContent = t('noResults');
    listEl.appendChild(nr);
    return;
  }

  let currentDate = null;
  let groupCardEl = null;

  for (const entry of sorted) {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      const dayEntries = sorted.filter((e) => e.date === currentDate);
      // 整數「分」相加,無浮點誤差
      const dayExpense = dayEntries.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amountCents, 0);
      const dayIncome = dayEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amountCents, 0);

      const group = document.createElement('div');
      group.className = 'date-group';

      const header = document.createElement('div');
      header.className = 'date-header';
      const left = document.createElement('span');
      left.textContent = dateLabel(currentDate);
      const sums = document.createElement('span');
      sums.className = 'day-sums';
      if (dayIncome > 0) {
        const inc = document.createElement('span');
        inc.className = 'day-income';
        inc.textContent = '+' + formatRM(dayIncome);
        sums.appendChild(inc);
      }
      if (dayExpense > 0 || dayIncome === 0) {
        const exp = document.createElement('span');
        exp.textContent = '−' + formatRM(dayExpense);
        sums.appendChild(exp);
      }
      header.append(left, sums);
      group.appendChild(header);

      groupCardEl = document.createElement('div');
      groupCardEl.className = 'group-card';
      group.appendChild(groupCardEl);
      listEl.appendChild(group);
    }

    const cat = cats.get(entry.categoryId);
    const isIncome = entry.type === 'income';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'entry-card';
    card.innerHTML = `
      <span class="cat-dot"></span>
      <span class="entry-main">
        <span class="entry-cat"></span>
        <div class="entry-note" hidden></div>
      </span>
      <span class="entry-amount"></span>`;
    card.querySelector('.cat-dot').style.background = cat?.color ?? '#8C95A3';
    card.querySelector('.entry-cat').textContent = catName(cat);
    if (entry.note) {
      const noteEl = card.querySelector('.entry-note');
      noteEl.textContent = entry.note;
      noteEl.hidden = false;
    }
    const amountEl = card.querySelector('.entry-amount');
    amountEl.textContent = (isIncome ? '+' : '') + formatRM(entry.amountCents);
    amountEl.classList.toggle('income-text', isIncome);
    card.addEventListener('click', () => openSheet(entry));
    groupCardEl.appendChild(card);
  }
}

// ---------- 報表 ----------
function monthKey({ y, m }) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

function renderReport() {
  const key = monthKey(reportMonth);
  monthLabelEl.textContent = monthFmt.format(new Date(reportMonth.y, reportMonth.m - 1, 1));
  monthNextBtn.disabled =
    reportMonth.y === now.getFullYear() && reportMonth.m === now.getMonth() + 1;

  const monthEntries = entries.filter((e) => e.date.startsWith(key));
  const expense = monthEntries.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amountCents, 0);
  const income = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amountCents, 0);
  const balance = income - expense;

  reportExpenseEl.textContent = formatRM(expense);
  reportIncomeEl.textContent = formatRM(income);
  reportBalanceEl.textContent = formatRM(balance);
  reportBalanceEl.classList.toggle('income-text', balance >= 0);
  reportBalanceEl.classList.toggle('negative-text', balance < 0);

  renderBudgetCard(expense);
  renderTrend();

  // 各分類佔比
  const cats = catMap();
  const isIncome = reportType === 'income';
  const typed = monthEntries.filter((e) => (e.type === 'income') === isIncome);
  const total = typed.reduce((s, e) => s + e.amountCents, 0);

  const byCat = new Map();
  for (const e of typed) {
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amountCents);
  }
  const rows = [...byCat.entries()]
    .map(([catId, cents]) => {
      const cat = cats.get(catId);
      const budget = !isIncome ? (cat?.budgetCents ?? 0) : 0;
      return {
        id: catId,
        name: catName(cat),
        color: cat?.color ?? '#8C95A3',
        cents,
        over: budget > 0 && cents > budget,
      };
    })
    .sort((a, b) => b.cents - a.cents);

  breakdownEl.innerHTML = '';
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'breakdown-empty';
    empty.textContent = reportType === 'income' ? t('noIncome') : t('noExpense');
    breakdownEl.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const pct = (row.cents / total) * 100; // 僅用於顯示比例
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'breakdown-row';
    div.innerHTML = `
      <div class="breakdown-top">
        <span class="cat-dot"></span>
        <span class="breakdown-name"></span>
        <span class="over-tag" hidden></span>
        <span class="breakdown-pct"></span>
        <span class="breakdown-amount num"></span>
        <span class="breakdown-chev">›</span>
      </div>
      <div class="breakdown-bar-track"><div class="breakdown-bar"></div></div>`;
    div.querySelector('.cat-dot').style.background = row.color;
    div.querySelector('.breakdown-name').textContent = row.name;
    if (row.over) {
      const tag = div.querySelector('.over-tag');
      tag.textContent = t('overBudgetTag');
      tag.hidden = false;
    }
    div.querySelector('.breakdown-pct').textContent = `${pct.toFixed(1)}%`;
    div.querySelector('.breakdown-amount').textContent = formatRM(row.cents);
    const bar = div.querySelector('.breakdown-bar');
    bar.style.background = row.color;
    bar.style.width = `${pct.toFixed(1)}%`;
    div.addEventListener('click', () => openCatDetail(row.id));
    breakdownEl.appendChild(div);
  }
}

// ---------- 整月預算卡 ----------
function renderBudgetCard(monthExpense) {
  const budget = meta.monthlyBudgetCents ?? 0;
  if (budget <= 0) {
    budgetCardEl.hidden = true;
    return;
  }
  budgetCardEl.hidden = false;
  const ratio = monthExpense / budget;
  const remaining = budget - monthExpense;
  const color = budgetColor(ratio);

  budgetCardEl.innerHTML = `
    <div class="budget-top">
      <span class="budget-label"></span>
      <span class="budget-vs num"></span>
    </div>
    <div class="budget-bar-track"><div class="budget-bar"></div></div>
    <div class="budget-foot num"></div>`;
  budgetCardEl.querySelector('.budget-label').textContent = t('monthlyBudget');
  budgetCardEl.querySelector('.budget-vs').textContent = t('budgetVs', formatRM(monthExpense), formatRM(budget));
  const bar = budgetCardEl.querySelector('.budget-bar');
  bar.style.width = `${Math.min(100, ratio * 100).toFixed(1)}%`;
  bar.style.background = color;
  const foot = budgetCardEl.querySelector('.budget-foot');
  foot.textContent = remaining >= 0 ? t('budgetLeft', formatRM(remaining)) : t('budgetOver', formatRM(-remaining));
  foot.style.color = color;
}

// ---------- 近 6 個月趨勢 ----------
function renderTrend() {
  const isIncome = reportType === 'income';
  const months = [];
  for (let i = 5; i >= 0; i--) {
    let m = reportMonth.m - i;
    let y = reportMonth.y;
    while (m <= 0) { m += 12; y -= 1; }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const sum = entries
      .filter((e) => e.date.startsWith(key) && (e.type === 'income') === isIncome)
      .reduce((s, e) => s + e.amountCents, 0);
    months.push({ y, m, key, sum, current: y === reportMonth.y && m === reportMonth.m });
  }
  const max = Math.max(1, ...months.map((x) => x.sum));

  trendCardEl.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'trend-title';
  title.textContent = isIncome ? t('trendIncome') : t('trendExpense');
  trendCardEl.appendChild(title);

  const chart = document.createElement('div');
  chart.className = 'trend-chart';
  for (const mo of months) {
    const col = document.createElement('button');
    col.type = 'button';
    col.className = 'trend-col' + (mo.current ? ' current' : '');
    const h = mo.sum > 0 ? Math.max(4, (mo.sum / max) * 100) : 2;
    col.innerHTML = `
      <span class="trend-val num">${mo.sum > 0 ? formatRM(mo.sum).replace(/^RM\s/, '') : ''}</span>
      <span class="trend-bar-wrap"><span class="trend-bar" style="height:${h.toFixed(1)}%"></span></span>
      <span class="trend-month">${mo.m}</span>`;
    col.addEventListener('click', () => {
      reportMonth = { y: mo.y, m: mo.m };
      renderReport();
    });
    chart.appendChild(col);
  }
  trendCardEl.appendChild(chart);
}

// ---------- 分類明細(點報表分類進入) ----------
function renderCatDetail() {
  if (detailCatId === null) return;
  const cats = catMap();
  const cat = cats.get(detailCatId);
  const key = monthKey(reportMonth);
  const isIncome = reportType === 'income';

  const rows = entries
    .filter((e) => e.categoryId === detailCatId && e.date.startsWith(key) && (e.type === 'income') === isIncome)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const total = rows.reduce((s, e) => s + e.amountCents, 0);

  detailTitleEl.textContent = catName(cat);
  detailSummaryEl.innerHTML = `<span class="detail-total num"></span><span class="detail-sub"></span>`;
  const totalEl = detailSummaryEl.querySelector('.detail-total');
  totalEl.textContent = (isIncome ? '+' : '') + formatRM(total);
  totalEl.classList.toggle('income-text', isIncome);
  detailSummaryEl.querySelector('.detail-sub').textContent =
    `${monthFmt.format(new Date(reportMonth.y, reportMonth.m - 1, 1))} · ${t('entryCount', rows.length)}`;

  // 分類預算進度(僅支出且有設定預算)
  const budget = !isIncome ? (cat?.budgetCents ?? 0) : 0;
  if (budget > 0) {
    const ratio = total / budget;
    const remaining = budget - total;
    const color = budgetColor(ratio);
    const wrap = document.createElement('div');
    wrap.className = 'detail-budget';
    wrap.innerHTML = `
      <div class="budget-top">
        <span class="budget-label"></span>
        <span class="budget-vs num"></span>
      </div>
      <div class="budget-bar-track"><div class="budget-bar"></div></div>
      <div class="budget-foot num"></div>`;
    wrap.querySelector('.budget-label').textContent = t('monthlyBudget');
    wrap.querySelector('.budget-vs').textContent = t('budgetVs', formatRM(total), formatRM(budget));
    const bar = wrap.querySelector('.budget-bar');
    bar.style.width = `${Math.min(100, ratio * 100).toFixed(1)}%`;
    bar.style.background = color;
    const foot = wrap.querySelector('.budget-foot');
    foot.textContent = remaining >= 0 ? t('budgetLeft', formatRM(remaining)) : t('budgetOver', formatRM(-remaining));
    foot.style.color = color;
    detailSummaryEl.appendChild(wrap);
  }

  detailListEl.innerHTML = '';
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'detail-empty';
    empty.textContent = isIncome ? t('noIncome') : t('noExpense');
    detailListEl.appendChild(empty);
    return;
  }

  for (const entry of rows) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cat-row detail-row';
    item.innerHTML = `
      <span class="detail-date"></span>
      <span class="detail-note"></span>
      <span class="detail-amount num"></span>`;
    item.querySelector('.detail-date').textContent = shortDate(entry.date);
    const noteEl = item.querySelector('.detail-note');
    if (entry.note) {
      noteEl.textContent = entry.note;
    } else {
      noteEl.textContent = catName(cat);
      noteEl.classList.add('muted');
    }
    const amtEl = item.querySelector('.detail-amount');
    amtEl.textContent = (isIncome ? '+' : '') + formatRM(entry.amountCents);
    amtEl.classList.toggle('income-text', isIncome);
    item.addEventListener('click', () => openSheet(entry));
    detailListEl.appendChild(item);
  }
}

function openCatDetail(catId) {
  detailCatId = catId;
  detailListEl.scrollTop = 0;
  renderCatDetail();
  detailModalEl.classList.add('open');
}

function closeCatDetail() {
  detailModalEl.classList.remove('open');
  detailCatId = null;
}

// ---------- 視圖切換 ----------
function switchView(view) {
  viewListEl.hidden = view !== 'list';
  viewReportEl.hidden = view !== 'report';
  tabListBtn.classList.toggle('active', view === 'list');
  tabReportBtn.classList.toggle('active', view === 'report');
  if (view === 'report') renderReport();
}

// ---------- 記帳面板 ----------
function renderCategoryChips() {
  categoryRowEl.innerHTML = '';
  for (const cat of catsOfType(sheetType)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip' + (cat.id === selectedCatId ? ' selected' : '');
    chip.innerHTML = `<span class="cat-dot"></span><span></span>`;
    chip.querySelector('.cat-dot').style.background = cat.color;
    chip.children[1].textContent = catName(cat);
    chip.addEventListener('click', () => {
      selectedCatId = cat.id;
      renderCategoryChips();
      updateSaveState();
    });
    categoryRowEl.appendChild(chip);
  }
}

function renderAmount() {
  amountTextEl.textContent = amountStr || '0';
}

function updateSaveState() {
  saveBtn.disabled = !(toCents(amountStr) > 0 && selectedCatId);
}

function setSheetType(type) {
  sheetType = type;
  sheetEl.dataset.type = type;
  setSegActive(typeSegEl, type);
  if (selectedCatId && catMap().get(selectedCatId)?.type !== type) selectedCatId = null;
  renderCategoryChips();
  updateSaveState();
}

function openSheet(entry = null) {
  editingId = entry?.id ?? null;
  amountStr = entry ? centsToInputStr(entry.amountCents) : '';
  selectedCatId = entry?.categoryId ?? null;
  noteInput.value = entry?.note ?? '';
  dateInput.value = entry?.date ?? todayStr();
  deleteBtn.hidden = !entry;

  setSheetType(entry?.type ?? 'expense');
  renderAmount();
  sheetEl.classList.add('open');
  sheetBackdropEl.classList.add('open');
}

function closeSheet() {
  sheetEl.classList.remove('open');
  sheetBackdropEl.classList.remove('open');
}

// ---------- 鍵盤 ----------
function pressKey(key) {
  if (key === 'del') {
    amountStr = amountStr.slice(0, -1);
  } else if (key === '.') {
    if (!amountStr.includes('.')) amountStr = (amountStr || '0') + '.';
  } else {
    const [intPart = '', fracPart] = amountStr.split('.');
    if (fracPart !== undefined) {
      if (fracPart.length >= 2) return;          // 最多兩位小數
    } else {
      if (intPart.length >= 7) return;           // 上限 9,999,999
      if (intPart === '0') amountStr = '';       // 避免 "05"
    }
    amountStr += key;
  }
  renderAmount();
  updateSaveState();
}

// ---------- 儲存 / 刪除 帳目 ----------
async function onSave() {
  const amountCents = toCents(amountStr);
  if (amountCents <= 0 || !selectedCatId) return;

  const record = {
    amountCents,
    type: sheetType,
    categoryId: selectedCatId,
    note: noteInput.value.trim(),
    date: dateInput.value || todayStr(),
  };

  if (editingId) {
    const idx = entries.findIndex((e) => e.id === editingId);
    if (idx >= 0) entries[idx] = { ...entries[idx], ...record };
  } else {
    entries.push({ id: crypto.randomUUID(), createdAt: Date.now(), ...record });
  }

  await saveEntries(entries);
  schedulePush();
  closeSheet();
  renderList();
  if (!viewReportEl.hidden) renderReport();
  if (detailCatId !== null) renderCatDetail();
}

async function onDelete() {
  if (!editingId) return;
  if (!confirm(t('confirmDeleteEntry'))) return;
  entries = entries.filter((e) => e.id !== editingId);
  await saveEntries(entries);
  schedulePush();
  closeSheet();
  renderList();
  if (!viewReportEl.hidden) renderReport();
  if (detailCatId !== null) renderCatDetail();
}

// ---------- 分類管理 ----------
function renderCatList() {
  setSegActive(catSegEl, catManageType);
  catListEl.innerHTML = '';

  for (const cat of catsOfType(catManageType)) {
    const count = entries.filter((e) => e.categoryId === cat.id).length;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cat-row';
    row.innerHTML = `
      <span class="cat-dot"></span>
      <span class="cat-row-name"></span>
      <span class="cat-row-count"></span>
      <span class="cat-row-chevron">›</span>`;
    row.querySelector('.cat-dot').style.background = cat.color;
    row.querySelector('.cat-row-name').textContent = catName(cat);
    row.querySelector('.cat-row-count').textContent = count > 0 ? t('entryCount', count) : '';
    row.addEventListener('click', () => openCatEditor(cat));
    catListEl.appendChild(row);
  }

  const addRow = document.createElement('button');
  addRow.type = 'button';
  addRow.className = 'cat-row cat-row-add';
  addRow.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  addRow.querySelector('.cat-row-name').textContent = t('newCategory');
  addRow.addEventListener('click', () => openCatEditor(null));
  catListEl.appendChild(addRow);
}

function openCatModal() {
  renderCatList();
  budgetInput.value = meta.monthlyBudgetCents ? centsToInputStr(meta.monthlyBudgetCents) : '';
  renderRecurList();
  renderLockStatus();
  updateBackupStatus();
  updateSyncStatus();
  catModalEl.classList.add('open');
}

function closeCatModal() {
  catModalEl.classList.remove('open');
}

// ---------- 分類編輯器 ----------
function renderColorGrid() {
  colorGridEl.innerHTML = '';
  for (const color of PALETTE) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (color === editorColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.setAttribute('aria-label', color);
    swatch.addEventListener('click', () => {
      editorColor = color;
      renderColorGrid();
    });
    colorGridEl.appendChild(swatch);
  }
}

function openCatEditor(cat) {
  editingCatId = cat?.id ?? null;
  editorColor = cat?.color ?? PALETTE[Math.floor(PALETTE.length / 2)];
  catNameInput.value = cat ? catName(cat) : '';
  $('#cat-editor-title').textContent = cat ? t('editCategory') : t('newCategory');
  catDeleteBtn.hidden = !cat;
  // 預算欄:只在支出分類顯示
  const type = cat ? cat.type : catManageType;
  catBudgetField.hidden = type !== 'expense';
  catBudgetInput.value = cat?.budgetCents ? centsToInputStr(cat.budgetCents) : '';
  renderColorGrid();
  catEditorEl.classList.add('open');
  catEditorBackdropEl.classList.add('open');
}

function closeCatEditor() {
  catEditorEl.classList.remove('open');
  catEditorBackdropEl.classList.remove('open');
}

async function onCatSave() {
  const name = catNameInput.value.trim();
  if (!name) {
    catNameInput.focus();
    return;
  }
  const budgetCents = catBudgetField.hidden ? 0 : parseMoney(catBudgetInput.value);
  if (editingCatId) {
    const cat = categories.find((c) => c.id === editingCatId);
    if (cat) {
      const builtin = CATEGORY_NAMES[cat.id];
      // 名稱仍等於內建預設(任一語言)→ 保持可隨語言切換;否則記為自訂名
      if (builtin && (name === builtin.zh || name === builtin.en)) {
        cat.renamed = false;
        cat.name = builtin.zh;
      } else {
        cat.renamed = true;
        cat.name = name;
      }
      cat.color = editorColor;
      if (cat.type === 'expense') cat.budgetCents = budgetCents;
    }
  } else {
    const cat = { id: crypto.randomUUID(), name, color: editorColor, type: catManageType };
    if (catManageType === 'expense') cat.budgetCents = budgetCents;
    categories.push(cat);
  }
  await saveCategories(categories);
  schedulePush();
  closeCatEditor();
  renderCatList();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

async function onCatDelete() {
  if (!editingCatId) return;
  const count = entries.filter((e) => e.categoryId === editingCatId).length;
  const msg = count > 0 ? t('confirmDeleteCategoryUsed', count) : t('confirmDeleteCategory');
  if (!confirm(msg)) return;
  categories = categories.filter((c) => c.id !== editingCatId);
  await saveCategories(categories);
  schedulePush();
  closeCatEditor();
  renderCatList();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

// ---------- 整月預算儲存 ----------
async function onBudgetChange() {
  const cents = parseMoney(budgetInput.value);
  meta = { ...meta, monthlyBudgetCents: cents };
  await saveMeta(meta);
  schedulePush();
  budgetInput.value = cents ? centsToInputStr(cents) : '';
  if (!viewReportEl.hidden) renderReport();
}

// ---------- 固定/循環支出 ----------
// 開啟時把「本月該產生但尚未產生」的固定支出補成正式帳目
async function materializeRecurring() {
  const d = new Date();
  const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const today = d.getDate();
  let added = 0;
  for (const r of recurring) {
    if (r.lastRun === mKey) continue;
    if (today < r.dayOfMonth) continue;          // 還沒到當月指定日
    const date = `${mKey}-${String(r.dayOfMonth).padStart(2, '0')}`;
    entries.push({
      id: crypto.randomUUID(),
      createdAt: Date.now() + added,
      amountCents: r.amountCents,
      type: r.type,
      categoryId: r.categoryId,
      note: r.note,
      date,
      recurringId: r.id,
    });
    r.lastRun = mKey;
    added++;
  }
  if (added) {
    await Promise.all([saveEntries(entries), saveRecurring(recurring)]);
    if (syncEnabled()) localStorage.setItem('syncDirty', '1'); // 啟動時的 initSync 會推上去
  }
  return added;
}

function renderRecurList() {
  recurListEl.innerHTML = '';
  const cats = catMap();
  for (const r of recurring) {
    const cat = cats.get(r.categoryId);
    const isIncome = r.type === 'income';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cat-row recur-row';
    row.innerHTML = `
      <span class="cat-dot"></span>
      <span class="recur-main">
        <span class="recur-name"></span>
        <span class="recur-sub"></span>
      </span>
      <span class="recur-amount num"></span>
      <span class="cat-row-chevron">›</span>`;
    row.querySelector('.cat-dot').style.background = cat?.color ?? '#8C95A3';
    row.querySelector('.recur-name').textContent = r.note || catName(cat);
    row.querySelector('.recur-sub').textContent = `${catName(cat)} · ${t('recurringDay', r.dayOfMonth)}`;
    const amt = row.querySelector('.recur-amount');
    amt.textContent = (isIncome ? '+' : '') + formatRM(r.amountCents);
    amt.classList.toggle('income-text', isIncome);
    row.addEventListener('click', () => openRecurEditor(r));
    recurListEl.appendChild(row);
  }

  const addRow = document.createElement('button');
  addRow.type = 'button';
  addRow.className = 'cat-row cat-row-add';
  addRow.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  addRow.querySelector('.cat-row-name').textContent = t('newRecurring');
  addRow.addEventListener('click', () => openRecurEditor(null));
  recurListEl.appendChild(addRow);
}

function renderRecurCatChips() {
  recurCatRowEl.innerHTML = '';
  for (const cat of catsOfType(recurType)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip' + (cat.id === recurCatId ? ' selected' : '');
    chip.innerHTML = `<span class="cat-dot"></span><span></span>`;
    chip.querySelector('.cat-dot').style.background = cat.color;
    chip.children[1].textContent = catName(cat);
    chip.addEventListener('click', () => {
      recurCatId = cat.id;
      renderRecurCatChips();
    });
    recurCatRowEl.appendChild(chip);
  }
}

function setRecurType(type) {
  recurType = type;
  setSegActive(recurTypeSegEl, type);
  if (recurCatId && catMap().get(recurCatId)?.type !== type) recurCatId = null;
  renderRecurCatChips();
}

function openRecurEditor(r) {
  editingRecurId = r?.id ?? null;
  recurAmountInput.value = r ? centsToInputStr(r.amountCents) : '';
  recurNoteInput.value = r?.note ?? '';
  recurDayInput.value = r?.dayOfMonth ?? 1;
  recurCatId = r?.categoryId ?? null;
  $('#recur-editor-title').textContent = r ? t('editRecurring') : t('newRecurring');
  recurDeleteBtn.hidden = !r;
  setRecurType(r?.type ?? 'expense');
  recurEditorEl.classList.add('open');
  recurEditorBackdropEl.classList.add('open');
}

function closeRecurEditor() {
  recurEditorEl.classList.remove('open');
  recurEditorBackdropEl.classList.remove('open');
}

async function onRecurSave() {
  const amountCents = parseMoney(recurAmountInput.value);
  let day = parseInt(recurDayInput.value, 10);
  if (!Number.isFinite(day)) day = 1;
  day = Math.min(28, Math.max(1, day));          // 限制 1–28,避免月底缺日
  if (amountCents <= 0 || !recurCatId) {
    if (!recurCatId) renderRecurCatChips();
    return;
  }
  const data = {
    amountCents,
    type: recurType,
    categoryId: recurCatId,
    note: recurNoteInput.value.trim(),
    dayOfMonth: day,
  };
  if (editingRecurId) {
    const idx = recurring.findIndex((x) => x.id === editingRecurId);
    if (idx >= 0) recurring[idx] = { ...recurring[idx], ...data };
  } else {
    recurring.push({ id: crypto.randomUUID(), lastRun: '', ...data });
  }
  await saveRecurring(recurring);
  schedulePush();
  // 立即補當月(若已到指定日)
  const added = await materializeRecurring();
  closeRecurEditor();
  renderRecurList();
  if (added) renderList();
  if (!viewReportEl.hidden) renderReport();
}

async function onRecurDelete() {
  if (!editingRecurId) return;
  recurring = recurring.filter((x) => x.id !== editingRecurId);
  await saveRecurring(recurring);
  schedulePush();
  closeRecurEditor();
  renderRecurList();
}

// ---------- 資料備份:JSON 匯出 / 匯入 ----------
const DAY_MS = 86400000;
const REMIND_DAYS = 14;

function daysSince(ts) {
  return Math.floor((Date.now() - ts) / DAY_MS);
}

// 優先用系統分享面板(iOS 可存到「檔案」/iCloud),不支援才退回下載
async function shareOrDownload(filename, text, mime) {
  try {
    const file = new File([text], filename, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: t('shareTitle') });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false; // 使用者取消,不算完成
    // 其他錯誤 → 退回下載
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function markBackup() {
  localStorage.setItem('lastBackupAt', String(Date.now()));
  hideBackupBanner();
  updateBackupStatus();
}

async function exportBackup() {
  const payload = {
    app: 'daily-ledger',
    version: 2,
    exportedAt: new Date().toISOString(),
    categories,
    entries,
    meta,
    recurring,
  };
  const ok = await shareOrDownload(
    `centsei-backup-${todayStr()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
  if (ok) markBackup();   // 只有真的存出 JSON(可還原)才更新備份時間
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportCsv() {
  const cats = catMap();
  const header = ['date', 'type', 'category', 'note', 'amount'];
  const lines = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((e) =>
      [e.date, e.type, catName(cats.get(e.categoryId)), e.note || '', (e.amountCents / 100).toFixed(2)]
        .map(csvCell)
        .join(',')
    );
  // 加 BOM 讓 Excel 正確辨識 UTF-8
  const csv = '﻿' + [header.join(','), ...lines].join('\n');
  await shareOrDownload(`centsei-${todayStr()}.csv`, csv, 'text/csv');
}

// 設定頁:上次備份狀態
function updateBackupStatus() {
  const ts = Number(localStorage.getItem('lastBackupAt'));
  if (!ts) { backupStatusEl.textContent = t('lastBackupNever'); return; }
  const d = daysSince(ts);
  backupStatusEl.textContent = d <= 0 ? t('lastBackupToday') : t('lastBackup', d);
}

// 開 App 時的備份提醒橫幅
function maybeShowBackupBanner() {
  if (entries.length < 5) return;                              // 帳目太少不打擾
  if (Date.now() < (Number(localStorage.getItem('backupSnoozeUntil')) || 0)) return;
  const ts = Number(localStorage.getItem('lastBackupAt'));
  if (ts && daysSince(ts) < REMIND_DAYS) return;
  backupBannerEl.querySelector('.backup-banner-text').textContent =
    ts ? t('backupReminderDays', daysSince(ts)) : t('backupReminderNever');
  backupBannerEl.hidden = false;
}

function hideBackupBanner() {
  backupBannerEl.hidden = true;
}

function snoozeBackupBanner() {
  localStorage.setItem('backupSnoozeUntil', String(Date.now() + 3 * DAY_MS));
  hideBackupBanner();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const cents = Math.round(Number(e.amountCents));
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return {
    id: typeof e.id === 'string' && e.id ? e.id : crypto.randomUUID(),
    amountCents: cents,
    type: e.type === 'income' ? 'income' : 'expense',
    categoryId: typeof e.categoryId === 'string' ? e.categoryId : '',
    note: typeof e.note === 'string' ? e.note.slice(0, 60) : '',
    date: DATE_RE.test(e.date) ? e.date : todayStr(),
    createdAt: Number.isFinite(e.createdAt) ? e.createdAt : Date.now(),
  };
}

function sanitizeCategory(c) {
  if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name.trim()) return null;
  const out = {
    id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
    name: c.name.trim().slice(0, 12),
    color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#8C95A3',
    type: c.type === 'income' ? 'income' : 'expense',
  };
  if (c.renamed === true) out.renamed = true;
  const budget = Math.round(Number(c.budgetCents));
  if (Number.isFinite(budget) && budget > 0) out.budgetCents = budget;
  return out;
}

function sanitizeRecurring(r) {
  if (!r || typeof r !== 'object') return null;
  const cents = Math.round(Number(r.amountCents));
  if (!Number.isFinite(cents) || cents <= 0) return null;
  let day = parseInt(r.dayOfMonth, 10);
  if (!Number.isFinite(day)) day = 1;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : crypto.randomUUID(),
    amountCents: cents,
    type: r.type === 'income' ? 'income' : 'expense',
    categoryId: typeof r.categoryId === 'string' ? r.categoryId : '',
    note: typeof r.note === 'string' ? r.note.slice(0, 60) : '',
    dayOfMonth: Math.min(28, Math.max(1, day)),
    lastRun: typeof r.lastRun === 'string' ? r.lastRun : '',
  };
}

async function onImportFile(file) {
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert(t('importInvalid'));
    return;
  }
  const inEntries = Array.isArray(data?.entries) ? data.entries.map(sanitizeEntry).filter(Boolean) : [];
  const inCats = Array.isArray(data?.categories) ? data.categories.map(sanitizeCategory).filter(Boolean) : [];
  if (!inEntries.length && !inCats.length) {
    alert(t('importInvalid'));
    return;
  }
  if (entries.length && !confirm(t('importConfirmMerge', inEntries.length))) return;

  // 以 id 合併(同 id 以備份為準),不會弄丟現有資料
  const entryMap = new Map(entries.map((x) => [x.id, x]));
  for (const x of inEntries) entryMap.set(x.id, x);
  entries = [...entryMap.values()];

  const catMapById = new Map(categories.map((x) => [x.id, x]));
  for (const x of inCats) catMapById.set(x.id, x);
  categories = [...catMapById.values()];

  // meta:整月預算(若備份有)
  if (data.meta && typeof data.meta === 'object') {
    const b = Math.round(Number(data.meta.monthlyBudgetCents));
    if (Number.isFinite(b) && b > 0) meta = { ...meta, monthlyBudgetCents: b };
  }

  // recurring:以 id 合併
  const inRecur = Array.isArray(data.recurring) ? data.recurring.map(sanitizeRecurring).filter(Boolean) : [];
  if (inRecur.length) {
    const recurMap = new Map(recurring.map((x) => [x.id, x]));
    for (const x of inRecur) recurMap.set(x.id, x);
    recurring = [...recurMap.values()];
  }

  await Promise.all([saveEntries(entries), saveCategories(categories), saveMeta(meta), saveRecurring(recurring)]);
  schedulePush();
  renderList();
  renderReport();
  renderCatList();
  alert(t('importDone', inEntries.length, inCats.length));
}

// ---------- 更新到最新版 ----------
async function forceUpdate() {
  // 離線時清快取會讓 App 開不起來,因此只在連線時更新
  if (!navigator.onLine) {
    alert(t('offlineNoUpdate'));
    return;
  }
  const btn = $('#refresh-btn');
  const label = btn.querySelector('.cat-row-name');
  label.textContent = t('updating');
  btn.disabled = true;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();                                  // 抓取新的 sw.js
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    if (window.caches) {
      for (const k of await caches.keys()) await caches.delete(k); // 清掉舊殼層快取
    }
  } catch {
    /* 即使更新檢查失敗,仍重新載入以套用任何已下載的新版本 */
  }
  location.reload();
}

// ---------- App 鎖(PIN) ----------
// PIN 以加鹽 SHA-256 雜湊存在 localStorage(僅本機,不含在備份中)
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomSaltHex() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}
async function hashPin(pin, saltHex) {
  const data = new TextEncoder().encode(saltHex + ':' + pin);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}
const pinIsSet = () => !!localStorage.getItem('pinHash');

let lockMode = null;     // 'unlock' | 'set-new' | 'set-confirm'
let pinBuffer = '';
let firstPin = '';

function lockDotsMax() {
  return lockMode === 'unlock' ? Number(localStorage.getItem('pinLen')) || 4 : 6;
}

function renderLockDots(error = false) {
  const dots = lockScreenEl.querySelector('#lock-dots');
  const max = lockDotsMax();
  dots.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const d = document.createElement('span');
    d.className = 'lock-dot' + (i < pinBuffer.length ? ' filled' : '') + (error ? ' error' : '');
    dots.appendChild(d);
  }
  lockScreenEl.querySelector('#lock-done').hidden = !(lockMode !== 'unlock' && pinBuffer.length >= 4);
}

function setLockTitle() {
  const titles = { unlock: 'enterPin', 'set-new': 'newPinTitle', 'set-confirm': 'confirmPinTitle' };
  lockScreenEl.querySelector('#lock-title').textContent = t(titles[lockMode]);
  lockScreenEl.querySelector('#lock-error').textContent = '';
}

function showLock(mode) {
  lockMode = mode;
  pinBuffer = '';
  if (mode === 'set-new') firstPin = '';
  setLockTitle();
  renderLockDots();
  lockScreenEl.hidden = false;
}

function hideLock() {
  lockScreenEl.hidden = true;
  lockMode = null;
  pinBuffer = '';
  firstPin = '';
}

function lockError(msgKey) {
  lockScreenEl.querySelector('#lock-error').textContent = t(msgKey);
  renderLockDots(true);
  pinBuffer = '';
  setTimeout(() => { if (lockMode) renderLockDots(); }, 400);
}

async function lockSubmit() {
  if (lockMode === 'unlock') {
    const h = await hashPin(pinBuffer, localStorage.getItem('pinSalt'));
    if (h === localStorage.getItem('pinHash')) hideLock();
    else lockError('wrongPin');
  } else if (lockMode === 'set-new') {
    firstPin = pinBuffer;
    showLock('set-confirm');
  } else if (lockMode === 'set-confirm') {
    if (pinBuffer === firstPin) {
      const salt = randomSaltHex();
      const h = await hashPin(pinBuffer, salt);
      localStorage.setItem('pinSalt', salt);
      localStorage.setItem('pinHash', h);
      localStorage.setItem('pinLen', String(pinBuffer.length));
      hideLock();
      renderLockStatus();
    } else {
      lockError('pinMismatch');
      lockMode = 'set-new';
      firstPin = '';
      setLockTitle();
    }
  }
}

function lockPress(key) {
  const err = lockScreenEl.querySelector('#lock-error');
  if (err) err.textContent = '';
  if (key === 'del') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (pinBuffer.length < 6) {
    pinBuffer += key;
  }
  renderLockDots();
  if (lockMode === 'unlock' && pinBuffer.length === lockDotsMax()) lockSubmit();
}

function renderLockStatus() {
  lockStatusEl.textContent = pinIsSet() ? t('lockStatusOn') : t('lockStatusOff');
}

function onLockRowClick() {
  if (pinIsSet()) {
    if (confirm(t('confirmRemovePin'))) {
      localStorage.removeItem('pinHash');
      localStorage.removeItem('pinSalt');
      localStorage.removeItem('pinLen');
      renderLockStatus();
    }
  } else {
    showLock('set-new');
  }
}

// ---------- 雲端同步(端到端加密) ----------
const SYNC_ENDPOINT = 'https://daily-ledger-sync.yuxuanchin95.workers.dev/v1/';
const SYNC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字元

let syncCode = localStorage.getItem('syncCode') || null;
let syncKey = null;     // CryptoKey(只在記憶體)
let syncId = null;      // 雲端查詢鍵(同步碼的雜湊)
let syncVersion = Number(localStorage.getItem('syncVersion')) || 0;
let syncBusy = false;
let syncPushTimer = null;

const syncEnabled = () => !!syncCode;

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBuf(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}
function hexOf(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 由同步碼推導:AES-GCM 金鑰(PBKDF2)+ 雲端 id(SHA-256)
async function deriveSync(code) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  syncKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('dl-enc-v1'), iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  syncId = hexOf(await crypto.subtle.digest('SHA-256', enc.encode(code + 'dl-id-v1')));
}

function generateSyncCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += SYNC_ALPHABET[bytes[i] % SYNC_ALPHABET.length];
    if (i % 4 === 3 && i < bytes.length - 1) out += '-';
  }
  return out; // 例如 ABCD-EFGH-JKLM-NPQR
}

async function encryptPayload() {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ categories, entries, meta, recurring }));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, syncKey, data);
  return { iv: bufToB64(iv.buffer), ciphertext: bufToB64(ct) };
}
async function decryptPayload(ivB64, ctB64) {
  const iv = new Uint8Array(b64ToBuf(ivB64));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, syncKey, b64ToBuf(ctB64));
  return JSON.parse(new TextDecoder().decode(pt));
}

// 把遠端資料合併進本機(以 id 聯集,遠端優先;不弄丟資料)
function mergeRemote(data) {
  const inEntries = Array.isArray(data.entries) ? data.entries.map(sanitizeEntry).filter(Boolean) : [];
  const inCats = Array.isArray(data.categories) ? data.categories.map(sanitizeCategory).filter(Boolean) : [];
  const inRecur = Array.isArray(data.recurring) ? data.recurring.map(sanitizeRecurring).filter(Boolean) : [];

  const em = new Map(entries.map((x) => [x.id, x]));
  for (const x of inEntries) em.set(x.id, x);
  entries = [...em.values()];

  const cm = new Map(categories.map((x) => [x.id, x]));
  for (const x of inCats) cm.set(x.id, x);
  categories = [...cm.values()];

  const rm = new Map(recurring.map((x) => [x.id, x]));
  for (const x of inRecur) rm.set(x.id, x);
  recurring = [...rm.values()];

  if (data.meta && typeof data.meta === 'object') {
    const b = Math.round(Number(data.meta.monthlyBudgetCents));
    if (Number.isFinite(b) && b > 0) meta = { ...meta, monthlyBudgetCents: b };
  }
}

async function persistAll() {
  await Promise.all([saveEntries(entries), saveCategories(categories), saveMeta(meta), saveRecurring(recurring)]);
}

function setSyncVersion(v) {
  syncVersion = v;
  localStorage.setItem('syncVersion', String(v));
}

function refreshAfterSync() {
  renderList();
  if (!viewReportEl.hidden) renderReport();
  renderCatList();
  if (detailCatId !== null) renderCatDetail();
}

async function pullSync() {
  const res = await fetch(SYNC_ENDPOINT + syncId);
  if (!res.ok) throw new Error('pull failed');
  const data = await res.json();
  if (data.iv && data.ciphertext && data.version > syncVersion) {
    const remote = await decryptPayload(data.iv, data.ciphertext);
    mergeRemote(remote);
    await persistAll();
    setSyncVersion(data.version);
    refreshAfterSync();
  }
}

async function pushSync(retry = true) {
  const enc = await encryptPayload();
  const res = await fetch(SYNC_ENDPOINT + syncId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseVersion: syncVersion, iv: enc.iv, ciphertext: enc.ciphertext }),
  });
  if (res.status === 409) {
    const remote = await res.json();
    if (remote.iv && remote.ciphertext) {
      mergeRemote(await decryptPayload(remote.iv, remote.ciphertext));
      await persistAll();
      refreshAfterSync();
    }
    setSyncVersion(remote.version || 0);
    if (retry) return pushSync(false); // 合併遠端後重推一次
    throw new Error('conflict');
  }
  if (!res.ok) throw new Error('push failed');
  const out = await res.json();
  setSyncVersion(out.version);
  localStorage.setItem('syncAt', String(Date.now()));
  localStorage.removeItem('syncDirty');
  updateSyncStatus();
}

// 開 App / 回前景:先拉再(必要時)推
async function syncNow() {
  if (!syncEnabled() || !syncKey || syncBusy) return;
  syncBusy = true;
  try {
    await pullSync();
    if (localStorage.getItem('syncDirty')) await pushSync();
  } catch {
    /* 網路/衝突失敗:保留 dirty,稍後再試 */
  } finally {
    syncBusy = false;
    updateSyncStatus();
  }
}

// 任何資料變動後呼叫:標記待同步並排程上傳
function schedulePush() {
  if (!syncEnabled()) return;
  localStorage.setItem('syncDirty', '1');
  updateSyncStatus();
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(doPush, 2500);
}

async function doPush() {
  if (!syncEnabled() || !syncKey || syncBusy) {
    syncPushTimer = setTimeout(doPush, 2500); // 還沒就緒,稍後再試
    return;
  }
  syncBusy = true;
  try {
    await pushSync();
  } catch {
    /* 失敗保留 dirty */
  } finally {
    syncBusy = false;
    updateSyncStatus();
  }
}

async function enableSync(code) {
  syncCode = code;
  localStorage.setItem('syncCode', code);
  setSyncVersion(0);
  await deriveSync(code);
  try {
    await pullSync();                          // 雲端若已有此碼資料 → 合併還原
    localStorage.setItem('syncDirty', '1');    // 確保把本機(合併後)推上去
    await pushSync();
  } catch {
    /* 失敗:仍保持啟用,dirty 會在下次重試 */
  }
  updateSyncStatus();
}

function disableSync() {
  syncCode = null;
  syncKey = null;
  syncId = null;
  syncVersion = 0;
  ['syncCode', 'syncVersion', 'syncAt', 'syncDirty'].forEach((k) => localStorage.removeItem(k));
  updateSyncStatus();
}

async function initSync() {
  if (!syncCode) return;
  await deriveSync(syncCode);
  await syncNow();
}

function updateSyncStatus() {
  if (!syncStatusEl) return;
  if (!syncEnabled()) { syncStatusEl.textContent = t('syncOff'); return; }
  const at = Number(localStorage.getItem('syncAt'));
  if (!at) { syncStatusEl.textContent = t('syncOn'); return; }
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 60) syncStatusEl.textContent = t('syncedAt', mins);
  else if (mins < 1440) syncStatusEl.textContent = t('syncedHours', Math.floor(mins / 60));
  else syncStatusEl.textContent = t('syncedDays', Math.floor(mins / 1440));
}

// ---------- 同步設定面板 ----------
function openSyncSheet() {
  const on = syncEnabled();
  syncCodeInput.value = on ? syncCode : generateSyncCode();
  syncCodeInput.readOnly = on;
  $('#sync-generate').hidden = on;
  $('#sync-enable').hidden = on;
  $('#sync-copy').hidden = !on;
  $('#sync-disable').hidden = !on;
  $('#sync-warn').hidden = on;
  $('#sync-enable').disabled = false;
  $('#sync-enable').textContent = t('syncEnable');
  syncSheetEl.classList.add('open');
  syncSheetBackdropEl.classList.add('open');
}
function closeSyncSheet() {
  syncSheetEl.classList.remove('open');
  syncSheetBackdropEl.classList.remove('open');
}

async function onSyncEnable() {
  const code = syncCodeInput.value.trim().toUpperCase();
  if (code.replace(/[^A-Z0-9]/g, '').length < 8) {
    alert(t('syncCodeTooShort'));
    return;
  }
  const btn = $('#sync-enable');
  btn.disabled = true;
  btn.textContent = t('syncEnabling');
  await enableSync(code);
  closeSyncSheet();
  renderRecurList();
}

// ---------- 收據辨識(Claude vision) ----------
const RECEIPT_ENDPOINT = 'https://daily-ledger-sync.yuxuanchin95.workers.dev/receipt';

// 匿名安裝 ID:用於收據用量計量(不含個資,清除資料會重置)
function getInstallId() {
  let id = localStorage.getItem('installId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('installId', id);
  }
  return id;
}

// 縮圖 + 轉 JPEG base64,壓低上傳量
async function fileToBase64(file, maxDim = 1280, quality = 0.7) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d').drawImage(img, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', quality).split(',')[1];
}

async function onReceiptFile(file) {
  if (!file) return;
  const btn = $('#receipt-btn');
  const label = btn.querySelector('.receipt-label');
  const original = label.textContent;
  btn.disabled = true;
  btn.classList.add('busy');
  label.textContent = t('scanningReceipt');
  try {
    const image = await fileToBase64(file);
    const names = catsOfType('expense').map((c) => catName(c));
    const res = await fetch(RECEIPT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mediaType: 'image/jpeg', categories: names, installId: getInstallId() }),
    });
    if (!res.ok) {
      let e = {};
      try { e = await res.json(); } catch {}
      if (res.status === 429 && e.error === 'quota') alert(t('receiptQuota', e.limit ?? 5));
      else if (res.status === 429) alert(t('receiptRate'));
      else if (res.status === 503) alert(t('receiptBusy'));
      else alert(t('receiptFailed'));
      return;
    }
    const r = await res.json();

    setSheetType('expense'); // 收據一律當支出
    if (typeof r.amount === 'number' && r.amount > 0) {
      amountStr = String(Math.round(r.amount * 100) / 100);
      renderAmount();
    }
    if (r.merchant) noteInput.value = String(r.merchant).slice(0, 60);
    if (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) dateInput.value = r.date;
    if (r.category) {
      const match = catsOfType('expense').find(
        (c) => catName(c).toLowerCase() === String(r.category).toLowerCase()
      );
      if (match) selectedCatId = match.id;
    }
    renderCategoryChips();
    updateSaveState();
  } catch {
    alert(t('receiptFailed'));
  } finally {
    btn.disabled = false;
    btn.classList.remove('busy');
    label.textContent = original;
  }
}

// ---------- 事件繫結 ----------
langBtn.addEventListener('click', () => setLang(lang === 'en' ? 'zh' : 'en'));

$('#receipt-btn').addEventListener('click', () => $('#receipt-input').click());
$('#receipt-input').addEventListener('change', (e) => {
  onReceiptFile(e.target.files[0]);
  e.target.value = '';
});

tabListBtn.addEventListener('click', () => switchView('list'));
tabReportBtn.addEventListener('click', () => switchView('report'));

$('#add-btn').addEventListener('click', () => openSheet());
$('#sheet-cancel').addEventListener('click', closeSheet);
sheetBackdropEl.addEventListener('click', closeSheet);
saveBtn.addEventListener('click', onSave);
deleteBtn.addEventListener('click', onDelete);
document.querySelectorAll('.keypad .key').forEach((btn) =>
  btn.addEventListener('click', () => pressKey(btn.dataset.key))
);

typeSegEl.querySelectorAll('.seg-btn').forEach((btn) =>
  btn.addEventListener('click', () => setSheetType(btn.dataset.type))
);

monthPrevBtn.addEventListener('click', () => {
  reportMonth.m -= 1;
  if (reportMonth.m === 0) { reportMonth.m = 12; reportMonth.y -= 1; }
  renderReport();
});
monthNextBtn.addEventListener('click', () => {
  reportMonth.m += 1;
  if (reportMonth.m === 13) { reportMonth.m = 1; reportMonth.y += 1; }
  renderReport();
});
reportSegEl.querySelectorAll('.seg-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    reportType = btn.dataset.type;
    setSegActive(reportSegEl, reportType);
    renderReport();
  })
);

$('#cat-manage-btn').addEventListener('click', openCatModal);
$('#cat-done-btn').addEventListener('click', closeCatModal);
catSegEl.querySelectorAll('.seg-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    catManageType = btn.dataset.type;
    renderCatList();
  })
);
$('#export-btn').addEventListener('click', exportBackup);
$('#export-csv-btn').addEventListener('click', exportCsv);
$('#import-btn').addEventListener('click', () => $('#import-file').click());

// 備份提醒橫幅
$('#backup-banner-now').addEventListener('click', exportBackup);
$('#backup-banner-later').addEventListener('click', snoozeBackupBanner);
$('#import-file').addEventListener('change', (e) => {
  onImportFile(e.target.files[0]);
  e.target.value = '';
});
$('#refresh-btn').addEventListener('click', forceUpdate);

// 搜尋
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  searchClearBtn.hidden = !searchQuery;
  renderList();
});
searchClearBtn.addEventListener('click', () => {
  searchQuery = '';
  searchInput.value = '';
  searchClearBtn.hidden = true;
  renderList();
  searchInput.focus();
});

// 整月預算
budgetInput.addEventListener('change', onBudgetChange);

// 固定支出編輯器
$('#recur-cancel').addEventListener('click', closeRecurEditor);
recurEditorBackdropEl.addEventListener('click', closeRecurEditor);
$('#recur-save').addEventListener('click', onRecurSave);
recurDeleteBtn.addEventListener('click', onRecurDelete);
recurTypeSegEl.querySelectorAll('.seg-btn').forEach((btn) =>
  btn.addEventListener('click', () => setRecurType(btn.dataset.type))
);

// 雲端同步
syncRowEl.addEventListener('click', openSyncSheet);
$('#sync-cancel').addEventListener('click', closeSyncSheet);
syncSheetBackdropEl.addEventListener('click', closeSyncSheet);
$('#sync-generate').addEventListener('click', () => { syncCodeInput.value = generateSyncCode(); });
$('#sync-enable').addEventListener('click', onSyncEnable);
$('#sync-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(syncCode); } catch {}
  const b = $('#sync-copy');
  b.textContent = t('syncCopied');
  setTimeout(() => { b.textContent = t('syncCopy'); }, 1500);
});
$('#sync-disable').addEventListener('click', () => {
  if (confirm(t('syncDisableConfirm'))) { disableSync(); closeSyncSheet(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });

// App 鎖
lockRowEl.addEventListener('click', onLockRowClick);
lockScreenEl.querySelectorAll('.lock-key').forEach((btn) =>
  btn.addEventListener('click', () => lockPress(btn.dataset.key))
);
$('#lock-done').addEventListener('click', lockSubmit);

$('#detail-back-btn').addEventListener('click', closeCatDetail);

$('#cat-editor-cancel').addEventListener('click', closeCatEditor);
catEditorBackdropEl.addEventListener('click', closeCatEditor);
$('#cat-editor-save').addEventListener('click', onCatSave);
catDeleteBtn.addEventListener('click', onCatDelete);

// ---------- 啟動 ----------
async function init() {
  buildFormatters();
  applyLanguage();
  $('#app-version').textContent = APP_VERSION;

  // 設了 PIN 就先鎖住(內容在鎖屏後面,不可見)
  if (pinIsSet()) showLock('unlock');

  [entries, categories, meta, recurring] = await Promise.all([
    getEntries(), getCategories(), getMeta(), getRecurring(),
  ]);
  await materializeRecurring();   // 補當月固定支出
  renderList();
  maybeShowBackupBanner();        // 太久沒備份就提醒

  // PWA:註冊 service worker(需要 https 或 localhost)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  initSync();   // 若已設定同步碼:拉回雲端最新並推送本機變動
}

init();
