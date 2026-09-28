import {
  getEntries, saveEntries, getCategories, saveCategories,
  getMeta, saveMeta, getRecurring, saveRecurring,
  getAccounts, saveAccounts,
} from './db.js';
import { moneyRain, moneyBurn } from './entry-fx.js';
import { parseCsv, reconcile, parseWithAI } from './reconcile.js';

// 是否執行在原生 App(Capacitor / iOS 包裝版)殼層內。
// iOS 上 Apple 規定數位內容只能用內購,不能用外部金流 → 隱藏 Pro 購買入口,
// 只保留「恢復購買」(允許啟用在外部已購買的內容)。
// 加固偵測:Capacitor 全域有時在模組執行時尚未就緒,改用「協定/平台」多重判斷。
// iOS 殼層一律走 capacitor:// scheme;Android 走 https://localhost。任一成立即為原生。
const IS_NATIVE = !!(
  window.Capacitor?.isNativePlatform?.() ||
  window.Capacitor?.getPlatform?.() === 'ios' ||
  window.Capacitor?.getPlatform?.() === 'android' ||
  location.protocol === 'capacitor:' ||
  location.protocol === 'ionic:' ||
  (location.protocol === 'https:' && location.hostname === 'localhost')
);
if (IS_NATIVE) document.documentElement.classList.add('is-native');

// ---------- 多語系 ----------
const STRINGS = {
  en: {
    appTitle: 'RichAuntie',
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
    trendBoth: 'Spending & income trend',
    // Quick add (Back Tap)
    quickAddTitle: 'Quick add (Back Tap)',
    quickAddIntro: 'Jump straight to a new expense without hunting for the + button.',
    backtapBanner: 'Log Touch \u2019n Go and bank payments by double-tapping the back of your iPhone.',
    backtapSetup: 'Set up · 30s',
    backtapIntro: 'Double-tap the back of your iPhone on any payment screen (Touch \u2019n Go, bank app, e-receipt) and RichAuntie logs it for you.',
    backtapStep1: 'Add the RichAuntie shortcut',
    backtapStep1Hint: 'Tap the button, then tap “Add Shortcut” in the Shortcuts app and come back here.',
    backtapStep1Btn: 'Add shortcut',
    backtapStep1Manual: 'In the Shortcuts app tap <b>+</b>, add <b>Take Screenshot</b>, then add <b>Log Expense from Screenshot</b> (RichAuntie). Name it <b>RichAuntie Log</b> and tap <b>Done</b>.',
    backtapStep1ManualBtn: 'Open Shortcuts app',
    backtapStep2: 'Turn on Back Tap',
    backtapStep2Path: ['Settings', 'Accessibility', 'Touch', 'Back Tap', 'Double Tap'],
    backtapStep2Hint: 'Scroll <b>all the way down</b> to the <b>Shortcuts</b> section and pick <b>RichAuntie Log</b>.',
    backtapStep2Btn: 'Done — I\u2019ve set it',
    backtapStep3: 'Try it',
    backtapStep3Hint: 'Open a transaction in Touch \u2019n Go and double-tap the back of your phone.',
    backtapDone: 'Set up',
    backtapEmptyKeypad: 'Prefer an empty keypad instead? Use the <b>Quick Add Expense</b> action in Shortcuts.',
    quickAddIosSiri: 'Tip: you can also say “Hey Siri, log expense in RichAuntie”. Back Tap needs iPhone 8 or later.',
    quickAddAndroidSteps: [
      'Long-press the RichAuntie icon → <b>Log expense</b>. Drag it to your home screen for one-tap access.',
      'Pixel: <b>Settings → System → Gestures → Quick Tap → Open app → RichAuntie</b>. Samsung: use <b>Good Lock → RegiStar → Back-Tap action</b>.',
      'Turn on <b>Open straight to a new entry</b> below so the back tap lands on the keypad.',
    ],
    quickAddWebSteps: [
      'Add RichAuntie to your home screen.',
      'On Android, long-press the icon → <b>Log expense</b>.',
    ],
    quickAddLaunchToggle: 'Open straight to a new entry',
    quickAddAutoSave: 'Save screenshot entries automatically',
    quickAddAutoSaveHint: 'Uses one AI receipt scan per screenshot. When off, the entry is filled in and waits for you to tap Save.',
    quickAddLaunchHint: 'When RichAuntie is opened (or reopened after 30 seconds away), start on the new-expense keypad.',
    quickAddTry: 'Try it now',
    quickAddCopyLink: 'Copy quick-add link',
    quickAddCopied: 'Copied: richauntie://add',
    trendSpent: 'Spent',
    trendIncomeLbl: 'Income',
    trendRange: (n) => `${n}M`,
    // Note filter
    frequentNotes: 'Frequent notes',
    searchSpent: (x) => `Spent ${x}`,
    searchIncome: (x) => `Income ${x}`,
    topNotes: 'Top notes this month',
    topNotesIncome: 'Top income notes this month',
    noteTimes: (n) => `×${n}`,
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
    protectMsg: 'Turn on Cloud Sync so your data is never lost if you switch phones or delete the app (end-to-end encrypted, no account).',
    protectEnable: 'Turn on sync',
    lastBackup: (n) => `Last backup: ${n} day${n === 1 ? '' : 's'} ago`,
    lastBackupToday: 'Last backup: today',
    lastBackupNever: 'Never backed up',
    shareTitle: 'RichAuntie backup',
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
    budgetRecurringTitle: 'Budget & Recurring',
    currencyTitle: 'Currency',
    currencyHint: 'Choose your display currency. Amounts are not converted by exchange rate — only the symbol and formatting change.',
    cloudTitle: 'RichAuntie Cloud',
    cloudHubHint: 'Use RichAuntie Cloud to sync across devices; your data survives deleting and reinstalling. End-to-end encrypted — only your code can unlock it.',
    aboutTitle: 'About',
    faceUnlockTitle: 'Unlock with Face ID',
    faceUnlockTitleTouch: 'Unlock with Touch ID',
    faceUnlockHint: 'When on, you can unlock the app with Face ID; your PIN still works if it fails or is cancelled.',
    faceUnlockReason: 'Unlock RichAuntie',
    faceUnlockNeedPin: 'Set a PIN first to enable biometric unlock.',
    useFaceIDBtn: 'Use Face ID',
    useTouchIDBtn: 'Use Touch ID',
    syncEmailBackup: 'Email this code to myself as a backup',
    syncEmailSubject: 'Your RichAuntie Cloud code (keep it safe)',
    syncEmailBody: (code) => `This is your RichAuntie Cloud sync code. Keep it safe.\nOn a new phone or after reinstalling, enter it to restore all your data.\n\nCode: ${code}\n\nNote: this code is the only key that decrypts your data. If lost, it cannot be recovered — and don't forward it to anyone.`,
    syncedAt: (n) => (n <= 0 ? 'Synced just now' : `Synced ${n} min ago`),
    syncedHours: (n) => `Synced ${n}h ago`,
    syncedDays: (n) => `Synced ${n}d ago`,
    syncNever: 'Not synced yet',
    syncError: 'Sync failed — will retry automatically.',
    syncDisableConfirm: 'Stop syncing? Data stays on this device but no longer uploads/downloads.',
    // Receipt scanning
    scanReceipt: 'Scan receipt',
    importStatement: 'Import Bank / Credit card statement',
    planAnnual: 'Yearly',
    planMonthly: 'Monthly',
    planWeekly: 'Weekly',
    stmtStepRead: 'Reading file',
    stmtStepAnalyse: 'Analysing with AI',
    stmtStepMatch: 'Matching entries',
    stmtStepOf: (a, b) => `${a} / ${b}`,
    unitWeek: 'week',
    unitMonth: 'month',
    unitYear: 'year',
    aiConsentReceipt: 'Scanning a receipt sends this photo over an encrypted connection to our processing endpoint, then on to Anthropic (Claude) to read the amount, date and merchant. The image is not stored and is not used to train models. Continue?',
    aiConsentStatement: 'Importing a statement sends this file over an encrypted connection to our processing endpoint, then on to Anthropic (Claude) to extract the transactions. The file is not stored and is not used to train models. Continue?',
    planBest: 'Best value',
    planSave: (pct) => `Save ${pct}% vs monthly`,

    reconcileTitle: 'Statement reconcile',
    reconBusy: 'Reading…',
    reconMatched: 'Recorded',
    reconReview: 'Check',
    reconMissing: 'Missing',
    reconCredit: 'Refund',
    reconAdd: 'Add',
    reconAddAll: (n) => `Add ${n}`,
    reconSummary: (total, matched, add) => `${total} transactions · ${matched} recorded · ${add} to add`,
    reconOtherCard: (n) => `${n} more not on this card`,
    reconEmpty: "Couldn't find any transactions in that file.",
    reconFailed: "Couldn't read the statement. If the PDF is password-protected, open it and take a screenshot, or export a CSV from your bank instead.",
    reconQuota: "You've used this month's reconcile quota. Pro includes 12 statements a month.",
    reconQuotaNative: "You've used this month's reconcile quota. If you already have Pro, tap “Restore purchase”.",
    scanningReceipt: 'Scanning…',
    receiptFailed: "Couldn't read the receipt — please enter manually.",
    receiptQuota: (n) => `You've used all ${n} free scans this month. Upgrade to Pro for unlimited, or add it manually.`,
    proPitch: 'Go Pro: snap any receipt and AI auto-fills the amount, date, merchant, and category — no more typing, scan as much as you want. Free plan includes 5 scans a month.',
    proThanks: 'Thanks for supporting RichAuntie 💛 Your receipt scanning is now unlimited.',
    proNativeHint: 'Receipt scanning is a Pro feature. Already purchased elsewhere? Tap “Restore purchase” below to activate.',
    receiptQuotaNative: 'You’ve used all your free scans this month. Add entries manually, or tap “Restore purchase” if you already have Pro.',
    receiptRate: 'Too many scans right now — please try again shortly.',
    receiptBusy: 'The server is busy — please try again later.',
    receiptSection: 'Receipt scanning',
    upgradePro: 'Upgrade to Pro',
    upgradeProPrice: (p) => `Upgrade to Pro — ${p}/mo`,
    upgradeProGeneric: 'Subscribe to Pro',
    proPitchIAP: (p) => `Pro removes ads and unlocks unlimited receipt scanning and statement import. Auto-renewable subscription billed to your Apple ID; renews every ${p} unless cancelled at least 24 hours before the period ends. Manage or cancel anytime in iOS Settings.`,
    proPitchIAPAndroid: (p) => `Pro removes ads and unlocks unlimited receipt scanning and statement import. Auto-renewable subscription billed through Google Play; renews every ${p} unless cancelled before the period ends. Manage or cancel anytime in Google Play Subscriptions.`,
    proActive: 'Pro active',
    proUntil: (d) => `until ${d}`,
    proWelcome: "You're Pro! Receipt scanning is now unlimited.",
    proCheckoutFailed: "Couldn't open the payment page — please try again.",
    restorePurchase: 'Restore purchase',
    restorePrompt: 'Enter the email you used to buy Pro:',
    restoreFound: 'Pro restored!',
    restoreNotFound: 'No active subscription found for that email.',
    restoreFailed: 'Restore failed — please try again.',
    legalSection: 'Legal',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    accountsSection: 'Accounts',
    accountsHint: 'Route income and expenses to different accounts; balance = opening balance + income − expenses.',
    accountName: 'Account name',
    newAccount: 'New account',
    editAccount: 'Edit account',
    deleteAccount: 'Delete account',
    confirmDeleteAccount: (n) => `Delete this account? ${n} entries will move to your first account.`,
    lastAccountNoDelete: 'You need at least one account.',
    openingBalance: 'Opening balance (optional)',
    netWorth: 'Net worth',
    accountsTitle: 'Account balances',
    avgPerDay: 'Avg / day',
    avgPerDayIncome: 'Avg / day',
    vsLastMonth: 'vs last month',
    vsSamePeriod: 'vs same period',
    topSpend: 'Biggest expense',
    dailyTitle: 'Daily spending',
    dailyTitleIncome: 'Daily income',
    // Sub-categories
    subGeneral: 'General',
    newSubcategory: 'New subcategory',
    editSubcategory: 'Edit subcategory',
    subcategoryName: 'Subcategory name',
    addSubcategory: 'Add subcategory',
    deleteSubcategory: 'Delete subcategory',
    confirmDeleteSub: (n, parent) =>
      n > 0 ? `${n === 1 ? '1 entry' : `${n} entries`} will move to "${parent}". Delete this subcategory?` : 'Delete this subcategory?',
    confirmDeleteParent: (subs, n) =>
      `This also deletes ${subs === 1 ? '1 subcategory' : `${subs} subcategories`}${n > 0 ? `; ${n === 1 ? '1 entry' : `${n} entries`} will show as "Uncategorized"` : ''}. Delete anyway?`,
    bySubcategory: 'By subcategory',
  },
};

// 只提供英文介面(馬來西亞市場)。lang 仍保留,因為會傳給 AI 決定交易名稱的語言。
const lang = 'en';

// ---------- 幣別 ----------
// 內部一律以整數「分」(×100)儲存與計算;幣別只影響顯示符號與格式。
// 預設馬幣;使用者可在設定改。常見幣別清單(Intl 會提供正確符號)。
const CURRENCIES = [
  { code: 'MYR', name: 'Malaysian Ringgit (RM)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },
  { code: 'HKD', name: 'Hong Kong Dollar (HK$)' },
  { code: 'TWD', name: 'New Taiwan Dollar (NT$)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'KRW', name: 'South Korean Won (₩)' },
  { code: 'THB', name: 'Thai Baht (฿)' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)' },
  { code: 'PHP', name: 'Philippine Peso (₱)' },
  { code: 'VND', name: 'Vietnamese Dong (₫)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'NZD', name: 'New Zealand Dollar (NZ$)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'AED', name: 'UAE Dirham (د.إ)' },
];
const CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.code));
let currency = (() => {
  const saved = localStorage.getItem('currency');
  return saved && CURRENCY_CODES.has(saved) ? saved : 'MYR';
})();

// App 版本(與 sw.js 的 VERSION 同步,顯示在設定頁)
const APP_VERSION = 'v18';

function t(key, ...args) {
  const v = STRINGS[lang][key];
  return typeof v === 'function' ? v(...args) : v;
}

// ---------- 金額工具:儲存與計算全用整數「分」,只有顯示才轉換 ----------
let myrFmt, numFmt, dateFmt, monthFmt, shortDateFmt;

function buildFormatters() {
  const locale = 'en-MY';
  myrFmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // 純數字(無符號)—— 給趨勢圖等只需要數字的地方用,避免硬寫死幣別符號
  numFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
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

// 純數字字串(無幣別符號)
function formatNum(cents) {
  return numFmt.format(cents / 100);
}

// 目前幣別的顯示符號(給輸入框前綴等用)
function currencySymbol() {
  const part = myrFmt.formatToParts(0).find((p) => p.type === 'currency');
  return part ? part.value : currency;
}

// 把所有幣別前綴標籤(預算欄位等)更新成目前符號
function updateCurrencyLabels() {
  const sym = currencySymbol();
  document.querySelectorAll('.budget-field-prefix, .amount-currency').forEach((el) => { el.textContent = sym; });
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
let accounts = [];      // 帳戶 { id, name, color, openingCents, renamed? }
let searchQuery = '';   // 明細搜尋字串
let noteExact = false;
let searchFocused = false;  // 點了常用備註 chip → 只比對備註(完全相同),不混進分類/金額
let trendRange = 6;     // 趨勢折線圖顯示幾個月

let amountStr = '';
let selectedCatId = null;
let selectedAcctId = null;
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

// 低飽和寶石色盤,與香檳/金/酒紅主題同調
const PALETTE = [
  '#C69A4E', '#B5763C', '#A6452F', '#8E2A20', '#B4697A', '#96577E',
  '#75618F', '#566B96', '#3E7C8A', '#4E8C7B', '#6E8B4A', '#96A050',
  '#B79A62', '#9B7E68', '#8A8078', '#B3A99C',
];

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const listEl = $('#entry-list');
const emptyEl = $('#empty-state');
const viewListEl = $('#view-list');
const viewReportEl = $('#view-report');
const tabListBtn = $('#tab-list');
const tabReportBtn = $('#tab-report');

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
// 子分類只有一層:子分類帶 parentId 指向頂層分類。母分類不見(例如同步途中)時,當作頂層顯示,不讓資料憑空消失。
const isTopCat = (c, cats = catMap()) => !c.parentId || !cats.has(c.parentId);
const catsOfType = (type) => {
  const cats = catMap();
  return categories.filter((c) => c.type === type && isTopCat(c, cats));
};
const subCatsOf = (parentId) => categories.filter((c) => c.parentId === parentId);

// 子分類所屬的頂層分類;頂層就是自己
function rootCat(cat, cats = catMap()) {
  if (!cat) return cat;
  return (cat.parentId && cats.get(cat.parentId)) || cat;
}
// 顯示用全名:「Food › Mamak」
function catLabel(cat, cats = catMap()) {
  if (!cat) return t('uncategorized');
  const root = rootCat(cat, cats);
  return root !== cat ? `${catName(root)} › ${catName(cat)}` : catName(cat);
}
// 顏色一律跟頂層分類走
const catColor = (cat, cats = catMap()) => rootCat(cat, cats)?.color ?? '#8C95A3';

// 給 AI 的分類清單(含子分類全名),以及把 AI 回傳的名稱對回分類
function aiCategoryLabels(type = 'expense') {
  const cats = catMap();
  const out = [];
  for (const top of catsOfType(type)) {
    out.push(catName(top));
    for (const sub of subCatsOf(top.id)) out.push(catLabel(sub, cats));
  }
  return out;
}
function findCatByAiName(name, type = 'expense') {
  if (!name) return null;
  const q = String(name).trim().toLowerCase();
  const cats = catMap();
  const pool = categories.filter((c) => c.type === type);
  return pool.find((c) => catLabel(c, cats).toLowerCase() === q)
    || pool.find((c) => catName(c).toLowerCase() === q)
    || null;
}

// 內建分類:舊資料庫存的是中文名,以 id 對應英文顯示;使用者改過名(renamed=true)才用自訂名
const CATEGORY_NAMES = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  fun: 'Entertainment',
  home: 'Home',
  medical: 'Medical',
  other: 'Other',
  salary: 'Salary',
  bonus: 'Bonus',
  investment: 'Investment',
  'other-income': 'Other Income',
};

function catName(cat) {
  if (!cat) return t('uncategorized');
  const builtin = CATEGORY_NAMES[cat.id];
  if (builtin && !cat.renamed) return builtin;
  return cat.name;
}

// 內建帳戶同理
const ACCOUNT_NAMES = {
  cash: 'Cash',
  bank: 'Bank',
  tng: "Touch 'n Go",
};

const acctMap = () => new Map(accounts.map((a) => [a.id, a]));

function acctName(a) {
  if (!a) return '';
  const builtin = ACCOUNT_NAMES[a.id];
  if (builtin && !a.renamed) return builtin;
  return a.name;
}

// 帳戶目前餘額 = 期初 + 全部收入 − 全部支出(沒 accountId 的舊帳目歸第一個帳戶)
function acctBalance(a) {
  const fallback = accounts[0]?.id;
  let cents = a.openingCents || 0;
  for (const e of entries) {
    const aid = e.accountId || fallback;
    if (aid !== a.id) continue;
    cents += e.type === 'income' ? e.amountCents : -e.amountCents;
  }
  return cents;
}

function defaultAcctId() {
  const last = localStorage.getItem('lastAccountId');
  if (last && accounts.some((a) => a.id === last)) return last;
  return accounts[0]?.id ?? null;
}

function setSegActive(segEl, type) {
  segEl.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
}

// ---------- 語言切換 ----------
function applyLanguage() {
  document.documentElement.lang = 'en-MY';
  document.body.dataset.lang = lang;
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

// 切換幣別:存偏好、重建格式器、更新標籤、重畫所有金額
function setCurrency(code) {
  if (!CURRENCY_CODES.has(code) || code === currency) return;
  currency = code;
  localStorage.setItem('currency', code);
  buildFormatters();
  updateCurrencyLabels();
  renderList();
  renderReport();
  renderCatList();
  if (detailCatId !== null) renderCatDetail();
}

// ---------- 明細列表 ----------
const normNote = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// 依備註分組(不分大小寫、忽略多餘空白);label 取最近一次的寫法
function groupByNote(list) {
  const map = new Map();
  for (const e of list) {
    const k = normNote(e.note);
    if (!k) continue;
    let g = map.get(k);
    if (!g) {
      g = { key: k, label: e.note.trim(), count: 0, total: 0, last: '' };
      map.set(k, g);
    }
    g.count += 1;
    g.total += e.amountCents;
    if (e.date >= g.last) { g.last = e.date; g.label = e.note.trim(); }
  }
  return [...map.values()];
}

// 常用備註:出現 2 次以上,依次數、再依最近使用排序
function frequentNotes(limit = 12) {
  return groupByNote(entries)
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit);
}

function setNoteFilter(label) {
  searchQuery = label;
  noteExact = true;
  searchInput.value = label;
  searchClearBtn.hidden = false;
  renderList();
}

function renderNoteChips() {
  const wrap = $('#note-chips');
  const show = searchFocused || searchQuery.trim().length > 0;
  const notes = show ? frequentNotes() : [];
  wrap.innerHTML = '';
  wrap.hidden = !notes.length;
  if (!notes.length) return;
  const q = searchQuery.trim().toLowerCase();
  for (const g of notes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'note-chip' + (noteExact && g.key === q ? ' selected' : '');
    chip.innerHTML = `<span></span><span class="note-chip-n num"></span>`;
    chip.firstElementChild.textContent = g.label;
    chip.lastElementChild.textContent = g.count;
    chip.addEventListener('click', () => {
      if (noteExact && g.key === q) clearSearch();
      else setNoteFilter(g.label);
      searchInput.blur();
    });
    wrap.appendChild(chip);
  }
}

// 搜尋結果摘要:筆數 + 支出/收入合計
function renderSearchSummary(results, searching) {
  const el = $('#search-summary');
  if (!searching || !results.length) { el.hidden = true; return; }
  const spent = results.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amountCents, 0);
  const inc = results.filter((e) => e.type === 'income').reduce((s, e) => s + e.amountCents, 0);
  const parts = [t('entryCount', results.length)];
  if (spent > 0 || inc === 0) parts.push(t('searchSpent', formatRM(spent)));
  if (inc > 0) parts.push(t('searchIncome', formatRM(inc)));
  el.textContent = parts.join(' · ');
  el.hidden = false;
}

function matchesSearch(entry, cats) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  if (noteExact) return normNote(entry.note) === q;
  if (entry.note && entry.note.toLowerCase().includes(q)) return true;
  if (catLabel(cats.get(entry.categoryId), cats).toLowerCase().includes(q)) return true;
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
  renderNoteChips();
  renderSearchSummary(sorted, searching);

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
    card.querySelector('.cat-dot').style.background = catColor(cat, cats);
    card.querySelector('.entry-cat').textContent = catLabel(cat, cats);
    if (accounts.length > 1) {
      const acct = acctMap().get(entry.accountId || accounts[0]?.id);
      if (acct) {
        const tag = document.createElement('span');
        tag.className = 'entry-acct';
        tag.textContent = acctName(acct);
        card.querySelector('.entry-cat').after(tag);
      }
    }
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
  renderAccountsCard();
  renderInsights(key, monthEntries);
  renderDaily(key, monthEntries);
  renderTrend();
  renderTopNotes(monthEntries);

  // 各分類佔比
  const cats = catMap();
  const isIncome = reportType === 'income';
  const typed = monthEntries.filter((e) => (e.type === 'income') === isIncome);
  const total = typed.reduce((s, e) => s + e.amountCents, 0);

  const byCat = new Map();
  for (const e of typed) {
    // 子分類的花費算進母分類;母分類的明細頁再拆開看
    const rootId = rootCat(cats.get(e.categoryId), cats)?.id ?? e.categoryId;
    byCat.set(rootId, (byCat.get(rootId) ?? 0) + e.amountCents);
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

// ---------- 帳戶餘額卡 ----------
function renderAccountsCard() {
  const card = $('#accounts-card');
  card.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'trend-title';
  title.textContent = t('accountsTitle');
  card.appendChild(title);

  let total = 0;
  for (const a of accounts) {
    const bal = acctBalance(a);
    total += bal;
    const row = document.createElement('div');
    row.className = 'acct-bal-row';
    row.innerHTML = `<span class="cat-dot"></span><span class="acct-bal-name"></span><span class="acct-bal-amt num"></span>`;
    row.querySelector('.cat-dot').style.background = a.color;
    row.querySelector('.acct-bal-name').textContent = acctName(a);
    const amt = row.querySelector('.acct-bal-amt');
    amt.textContent = formatRM(bal);
    if (bal < 0) amt.classList.add('negative-text');
    card.appendChild(row);
  }
  const totalRow = document.createElement('div');
  totalRow.className = 'acct-bal-row acct-bal-total';
  totalRow.innerHTML = `<span class="acct-bal-name"></span><span class="acct-bal-amt num"></span>`;
  totalRow.querySelector('.acct-bal-name').textContent = t('netWorth');
  const totalAmt = totalRow.querySelector('.acct-bal-amt');
  totalAmt.textContent = formatRM(total);
  totalAmt.classList.toggle('negative-text', total < 0);
  card.appendChild(totalRow);
}

// ---------- 本月洞察(日均 / 較上月 / 最大單筆) ----------
function renderInsights(key, monthEntries) {
  const card = $('#insights-card');
  card.innerHTML = '';
  const isIncome = reportType === 'income';
  const typed = monthEntries.filter((e) => (e.type === 'income') === isIncome);
  const total = typed.reduce((s, e) => s + e.amountCents, 0);
  if (!typed.length) { card.hidden = true; return; }
  card.hidden = false;

  const isCurrent = reportMonth.y === now.getFullYear() && reportMonth.m === now.getMonth() + 1;
  const daysInMonth = new Date(reportMonth.y, reportMonth.m, 0).getDate();
  const elapsed = isCurrent ? now.getDate() : daysInMonth;

  // 較上月(當月比同期,過去月份比整月)
  let pm = reportMonth.m - 1, py = reportMonth.y;
  if (pm <= 0) { pm = 12; py -= 1; }
  const pKey = `${py}-${String(pm).padStart(2, '0')}`;
  const prevDaysInMonth = new Date(py, pm, 0).getDate();
  const cutoff = isCurrent ? Math.min(elapsed, prevDaysInMonth) : prevDaysInMonth;
  const prevTotal = entries
    .filter((e) => (e.type === 'income') === isIncome && e.date.startsWith(pKey)
      && Number(e.date.slice(8, 10)) <= cutoff)
    .reduce((s, e) => s + e.amountCents, 0);

  let deltaTxt = '—', deltaCls = '';
  if (prevTotal > 0) {
    const pct = ((total - prevTotal) / prevTotal) * 100;
    deltaTxt = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
    // 支出漲=紅,收入漲=綠
    deltaCls = (pct >= 0) === isIncome ? 'good' : 'bad';
    if (Math.abs(pct) < 0.5) deltaCls = '';
  }

  const top = typed.reduce((a, b) => (b.amountCents > a.amountCents ? b : a));
  const cats = catMap();
  const topLabel = top.note || catLabel(cats.get(top.categoryId), cats);

  const tiles = [
    { label: isIncome ? t('avgPerDayIncome') : t('avgPerDay'), value: formatRM(Math.round(total / Math.max(1, elapsed))) },
    { label: isCurrent ? t('vsSamePeriod') : t('vsLastMonth'), value: deltaTxt, cls: deltaCls },
    { label: t('topSpend'), value: formatRM(top.amountCents), sub: topLabel },
  ];
  for (const tile of tiles) {
    const el = document.createElement('div');
    el.className = 'insight-tile card';
    el.innerHTML = `<div class="insight-label"></div><div class="insight-value num"></div><div class="insight-sub" hidden></div>`;
    el.querySelector('.insight-label').textContent = tile.label;
    const v = el.querySelector('.insight-value');
    v.textContent = tile.value;
    if (tile.cls) v.classList.add('insight-' + tile.cls);
    if (tile.sub) {
      const s = el.querySelector('.insight-sub');
      s.textContent = tile.sub;
      s.hidden = false;
    }
    card.appendChild(el);
  }
}

// ---------- 每日長條圖 ----------
function renderDaily(key, monthEntries) {
  const card = $('#daily-card');
  card.innerHTML = '';
  const isIncome = reportType === 'income';
  const typed = monthEntries.filter((e) => (e.type === 'income') === isIncome);
  if (!typed.length) { card.hidden = true; return; }
  card.hidden = false;

  const daysInMonth = new Date(reportMonth.y, reportMonth.m, 0).getDate();
  const perDay = new Array(daysInMonth).fill(0);
  for (const e of typed) {
    const d = Number(e.date.slice(8, 10));
    if (d >= 1 && d <= daysInMonth) perDay[d - 1] += e.amountCents;
  }
  const max = Math.max(1, ...perDay);
  const isCurrent = reportMonth.y === now.getFullYear() && reportMonth.m === now.getMonth() + 1;
  const today = now.getDate();

  const title = document.createElement('div');
  title.className = 'trend-title';
  title.textContent = isIncome ? t('dailyTitleIncome') : t('dailyTitle');
  card.appendChild(title);

  const chart = document.createElement('div');
  chart.className = 'daily-chart';
  for (let d = 1; d <= daysInMonth; d++) {
    const col = document.createElement('div');
    col.className = 'daily-col' + (isCurrent && d === today ? ' today' : '');
    const h = perDay[d - 1] > 0 ? Math.max(5, (perDay[d - 1] / max) * 100) : 0;
    const showLabel = d === 1 || d % 5 === 0;   // 尾日不另標,避免 30/31 重疊
    col.innerHTML = `
      <span class="daily-bar-wrap"><span class="daily-bar" style="height:${h.toFixed(1)}%"></span></span>
      <span class="daily-day">${showLabel ? d : ''}</span>`;
    chart.appendChild(col);
  }
  card.appendChild(chart);
}

// ---------- 支出 / 收入趨勢(折線) ----------
// 兩條線同一張圖:支出(金)對收入(綠),一眼看出哪幾個月入不敷出。
// 視窗固定結束在本月;點某個月只切換報表月份,不讓整張圖跟著位移。
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// 刻度取整:1 / 2 / 2.5 / 5 × 10^n,讓頂端格線是好讀的整數
function niceMax(cents) {
  const v = Math.max(cents / 100, 100);   // 沒資料時也給 0 / 50 / 100 的刻度,而不是 0 / 1 / 1
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 2.5, 5, 10]) if (v <= f * p) return f * p * 100;
  return 10 * p * 100;
}
function compactRM(cents) {
  const v = cents / 100;
  if (v >= 1e6) return `${+(v / 1e6).toFixed(1)}m`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
}

function renderTrend() {
  const n = trendRange;
  const cur = { y: now.getFullYear(), m: now.getMonth() + 1 };
  // 報表月份若落在視窗外(翻到很久以前),視窗改以它為結尾
  const idx = (o) => o.y * 12 + o.m;
  const endMonth = idx(reportMonth) <= idx(cur) - n ? reportMonth : cur;

  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = endMonth.m - i;
    let y = endMonth.y;
    while (m <= 0) { m += 12; y -= 1; }
    months.push({ y, m, key: `${y}-${String(m).padStart(2, '0')}`, spent: 0, income: 0 });
  }
  const byKey = new Map(months.map((mo) => [mo.key, mo]));
  for (const e of entries) {
    const mo = byKey.get(e.date.slice(0, 7));
    if (!mo) continue;
    if (e.type === 'income') mo.income += e.amountCents;
    else mo.spent += e.amountCents;
  }
  const selIdx = months.findIndex((mo) => mo.y === reportMonth.y && mo.m === reportMonth.m);

  trendCardEl.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'trend-head';
  const title = document.createElement('div');
  title.className = 'trend-title';
  title.textContent = t('trendBoth');
  const seg = document.createElement('div');
  seg.className = 'trend-range';
  for (const r of [6, 12]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trend-range-btn' + (r === n ? ' active' : '');
    b.textContent = t('trendRange', r);
    b.addEventListener('click', () => { trendRange = r; renderTrend(); });
    seg.appendChild(b);
  }
  head.append(title, seg);
  trendCardEl.appendChild(head);

  // 圖例 + 選中月份的數字(直接標數值,不必靠顏色猜)
  const sel = months[selIdx] ?? months[months.length - 1];
  const legend = document.createElement('div');
  legend.className = 'trend-legend';
  legend.innerHTML = `
    <span class="lg lg-spent"><i></i><span class="lg-name"></span> <b class="num"></b></span>
    <span class="lg lg-income"><i></i><span class="lg-name"></span> <b class="num"></b></span>
    <span class="lg-month"></span>`;
  legend.querySelector('.lg-spent .lg-name').textContent = t('trendSpent');
  legend.querySelector('.lg-spent b').textContent = formatRM(sel.spent);
  legend.querySelector('.lg-income .lg-name').textContent = t('trendIncomeLbl');
  legend.querySelector('.lg-income b').textContent = formatRM(sel.income);
  legend.querySelector('.lg-month').textContent = new Intl.DateTimeFormat('en-MY', { month: 'short', year: 'numeric' })
    .format(new Date(sel.y, sel.m - 1, 1));
  trendCardEl.appendChild(legend);

  // 用卡片實際寬度畫,文字不會被縮放變形
  const W = Math.max(260, (trendCardEl.clientWidth || 340) - 32);
  const H = 150;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxV = niceMax(Math.max(...months.map((mo) => Math.max(mo.spent, mo.income)), 0));
  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (v / maxV) * ih;

  const svg = svgEl('svg', { class: 'trend-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img' });
  svg.setAttribute('aria-label', months.map((mo) =>
    `${mo.key}: ${t('trendSpent')} ${formatRM(mo.spent)}, ${t('trendIncomeLbl')} ${formatRM(mo.income)}`).join('; '));

  // 格線:0 / 一半 / 頂端
  for (const f of [0, 0.5, 1]) {
    const gy = y(maxV * f);
    svg.appendChild(svgEl('line', { x1: pad.l, x2: W - pad.r, y1: gy, y2: gy, class: f === 0 ? 'tr-axis' : 'tr-grid' }));
    const lbl = svgEl('text', { x: pad.l - 6, y: gy + 3.5, class: 'tr-ylbl', 'text-anchor': 'end' });
    lbl.textContent = compactRM(maxV * f);
    svg.appendChild(lbl);
  }

  // 選中月份的直線標示
  if (selIdx >= 0) {
    svg.appendChild(svgEl('line', { x1: x(selIdx), x2: x(selIdx), y1: pad.t, y2: pad.t + ih, class: 'tr-cursor' }));
  }

  const path = (key) => months.map((mo, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(mo[key]).toFixed(1)}`).join('');
  // 支出底下淡淡的面積,讓主線更突出
  svg.appendChild(svgEl('path', {
    d: `${path('spent')}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`, class: 'tr-area',
  }));
  svg.appendChild(svgEl('path', { d: path('income'), class: 'tr-line tr-income' }));
  svg.appendChild(svgEl('path', { d: path('spent'), class: 'tr-line tr-spent' }));

  months.forEach((mo, i) => {
    const on = i === selIdx;
    svg.appendChild(svgEl('circle', { cx: x(i), cy: y(mo.income), r: on ? 4 : 2.5, class: 'tr-dot tr-income' }));
    svg.appendChild(svgEl('circle', { cx: x(i), cy: y(mo.spent), r: on ? 4 : 2.5, class: 'tr-dot tr-spent' }));
    // 12 個月時隔月標,避免擠在一起
    if (n <= 6 || i % 2 === (n - 1) % 2 || on) {
      const lbl = svgEl('text', { x: x(i), y: H - 6, class: 'tr-xlbl' + (on ? ' on' : ''), 'text-anchor': 'middle' });
      lbl.textContent = new Intl.DateTimeFormat('en-MY', { month: 'short' }).format(new Date(mo.y, mo.m - 1, 1));
      svg.appendChild(lbl);
    }
    // 整欄的透明點擊區:手指不用對準小圓點
    const colW = n === 1 ? iw : iw / (n - 1);
    const hit = svgEl('rect', { x: x(i) - colW / 2, y: 0, width: colW, height: H, class: 'tr-hit' });
    hit.addEventListener('click', () => {
      reportMonth = { y: mo.y, m: mo.m };
      renderReport();
    });
    svg.appendChild(hit);
  });

  trendCardEl.appendChild(svg);
}

// ---------- 本月常見備註(點了回明細,用備註篩選) ----------
function renderTopNotes(monthEntries) {
  const card = $('#notes-card');
  const isIncome = reportType === 'income';
  const groups = groupByNote(monthEntries.filter((e) => (e.type === 'income') === isIncome))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  card.innerHTML = '';
  card.hidden = !groups.length;
  if (!groups.length) return;
  const title = document.createElement('div');
  title.className = 'trend-title';
  title.textContent = isIncome ? t('topNotesIncome') : t('topNotes');
  card.appendChild(title);
  const max = groups[0].total || 1;
  for (const g of groups) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'note-row';
    row.innerHTML = `
      <span class="note-row-top"><span class="note-row-name"></span><span class="note-row-n num"></span><span class="note-row-amt num"></span></span>
      <span class="note-row-track"><span class="note-row-bar"></span></span>`;
    row.querySelector('.note-row-name').textContent = g.label;
    row.querySelector('.note-row-n').textContent = t('noteTimes', g.count);
    const amt = row.querySelector('.note-row-amt');
    amt.textContent = (isIncome ? '+' : '') + formatRM(g.total);
    amt.classList.toggle('income-text', isIncome);
    const bar = row.querySelector('.note-row-bar');
    bar.style.width = `${Math.max(2, (g.total / max) * 100).toFixed(1)}%`;
    bar.classList.toggle('income', isIncome);
    row.addEventListener('click', () => {
      switchView('list');
      setNoteFilter(g.label);
      window.scrollTo({ top: 0 });
    });
    card.appendChild(row);
  }
}

// ---------- 分類明細(點報表分類進入) ----------
function renderCatDetail() {
  if (detailCatId === null) return;
  const cats = catMap();
  const cat = cats.get(detailCatId);
  const key = monthKey(reportMonth);
  const isIncome = reportType === 'income';

  const inCat = (e) => e.categoryId === detailCatId || cats.get(e.categoryId)?.parentId === detailCatId;
  const rows = entries
    .filter((e) => inCat(e) && e.date.startsWith(key) && (e.type === 'income') === isIncome)
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

  // 子分類拆分(有子分類且這個月有花費才顯示)
  const subs = subCatsOf(detailCatId);
  if (subs.length && rows.length) {
    const bySub = new Map();
    for (const e of rows) {
      const k = e.categoryId === detailCatId ? '' : e.categoryId;
      bySub.set(k, (bySub.get(k) ?? 0) + e.amountCents);
    }
    if (bySub.size > 1 || !bySub.has('')) {
      const box = document.createElement('div');
      box.className = 'sub-breakdown';
      const h = document.createElement('div');
      h.className = 'sub-breakdown-title';
      h.textContent = t('bySubcategory');
      box.appendChild(h);
      const list = [...bySub.entries()].sort((a, b) => b[1] - a[1]);
      for (const [subId, cents] of list) {
        const row = document.createElement('div');
        row.className = 'sub-breakdown-row';
        row.innerHTML = `<span class="sub-name"></span><span class="sub-bar-track"><span class="sub-bar"></span></span><span class="sub-amt num"></span>`;
        row.querySelector('.sub-name').textContent = subId ? catName(cats.get(subId)) : t('subGeneral');
        const bar = row.querySelector('.sub-bar');
        bar.style.width = `${((cents / total) * 100).toFixed(1)}%`;
        bar.style.background = cat?.color ?? '#8C95A3';
        row.querySelector('.sub-amt').textContent = formatRM(cents);
        box.appendChild(row);
      }
      detailSummaryEl.appendChild(box);
    }
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
    const entryCat = cats.get(entry.categoryId);
    const subName = entryCat && entryCat.id !== detailCatId ? catName(entryCat) : '';
    if (entry.note) {
      noteEl.textContent = subName ? `${entry.note} · ${subName}` : entry.note;
    } else {
      noteEl.textContent = subName || catName(cat);
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
  const cats = catMap();
  const selected = cats.get(selectedCatId);
  const selectedRoot = rootCat(selected, cats);
  categoryRowEl.innerHTML = '';
  for (const cat of catsOfType(sheetType)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip' + (selectedRoot && cat.id === selectedRoot.id ? ' selected' : '');
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
  renderSubcatChips(selectedRoot);
}

// 選了有子分類的母分類 → 下方出現子分類列(預設「General」= 母分類本身)
function renderSubcatChips(root) {
  const rowEl = $('#subcat-row');
  rowEl.innerHTML = '';
  const subs = root ? subCatsOf(root.id) : [];
  rowEl.hidden = !subs.length;
  if (!subs.length) return;
  const opts = [{ id: root.id, label: t('subGeneral') }, ...subs.map((s) => ({ id: s.id, label: catName(s) }))];
  for (const o of opts) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'sub-chip' + (o.id === selectedCatId ? ' selected' : '');
    chip.textContent = o.label;
    chip.addEventListener('click', () => {
      selectedCatId = o.id;
      renderCategoryChips();
      updateSaveState();
    });
    rowEl.appendChild(chip);
  }
  // 選中的子分類捲進可見範圍
  rowEl.querySelector('.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function renderAccountChips() {
  const rowEl = $('#account-row');
  rowEl.innerHTML = '';
  rowEl.hidden = accounts.length < 2;   // 只有一個帳戶時不佔版面
  for (const a of accounts) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'acct-chip' + (a.id === selectedAcctId ? ' selected' : '');
    chip.innerHTML = `<span class="cat-dot"></span><span></span>`;
    chip.querySelector('.cat-dot').style.background = a.color;
    chip.children[1].textContent = acctName(a);
    chip.addEventListener('click', () => {
      selectedAcctId = a.id;
      renderAccountChips();
    });
    rowEl.appendChild(chip);
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
  selectedAcctId = entry?.accountId ?? defaultAcctId();
  renderAccountChips();
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
    accountId: selectedAcctId || defaultAcctId(),
    note: noteInput.value.trim(),
    date: dateInput.value || todayStr(),
  };
  if (record.accountId) localStorage.setItem('lastAccountId', record.accountId);

  const isNew = !editingId;

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
  // 只有新增才播;編輯既有記錄不該再演一次
  if (isNew) (record.type === 'income' ? moneyRain() : moneyBurn());
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
    const subs = subCatsOf(cat.id);
    const subIds = new Set(subs.map((s) => s.id));
    const count = entries.filter((e) => e.categoryId === cat.id || subIds.has(e.categoryId)).length;
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

    for (const sub of subs) {
      const n = entries.filter((e) => e.categoryId === sub.id).length;
      const sr = document.createElement('button');
      sr.type = 'button';
      sr.className = 'cat-row cat-row-sub';
      sr.innerHTML = `
        <span class="cat-row-name"></span>
        <span class="cat-row-count"></span>
        <span class="cat-row-chevron">›</span>`;
      sr.querySelector('.cat-row-name').textContent = catName(sub);
      sr.querySelector('.cat-row-count').textContent = n > 0 ? t('entryCount', n) : '';
      sr.addEventListener('click', () => openCatEditor(sub));
      catListEl.appendChild(sr);
    }
    const addSub = document.createElement('button');
    addSub.type = 'button';
    addSub.className = 'cat-row cat-row-sub cat-row-addsub';
    addSub.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
    addSub.querySelector('.cat-row-name').textContent = t('addSubcategory');
    addSub.addEventListener('click', () => openCatEditor(null, cat.id));
    catListEl.appendChild(addSub);
  }

  const addRow = document.createElement('button');
  addRow.type = 'button';
  addRow.className = 'cat-row cat-row-add';
  addRow.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  addRow.querySelector('.cat-row-name').textContent = t('newCategory');
  addRow.addEventListener('click', () => openCatEditor(null));
  catListEl.appendChild(addRow);
}

// ---------- 帳戶管理 ----------
let editingAcctId = null;   // null = 新增
let acctEditorColor = null;

function renderAcctList() {
  const listEl2 = $('#acct-list');
  listEl2.innerHTML = '';
  for (const a of accounts) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cat-row';
    row.innerHTML = `
      <span class="cat-dot"></span>
      <span class="cat-row-name"></span>
      <span class="cat-row-count num"></span>
      <span class="cat-row-chevron">›</span>`;
    row.querySelector('.cat-dot').style.background = a.color;
    row.querySelector('.cat-row-name').textContent = acctName(a);
    const bal = acctBalance(a);
    const balEl = row.querySelector('.cat-row-count');
    balEl.textContent = formatRM(bal);
    if (bal < 0) balEl.style.color = 'var(--red)';
    row.addEventListener('click', () => openAcctEditor(a));
    listEl2.appendChild(row);
  }
  const addRow = document.createElement('button');
  addRow.type = 'button';
  addRow.className = 'cat-row cat-row-add';
  addRow.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  addRow.querySelector('.cat-row-name').textContent = t('newAccount');
  addRow.addEventListener('click', () => openAcctEditor(null));
  listEl2.appendChild(addRow);
}

function renderAcctColorGrid() {
  const grid = $('#acct-color-grid');
  grid.innerHTML = '';
  for (const color of PALETTE) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (color === acctEditorColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.addEventListener('click', () => {
      acctEditorColor = color;
      renderAcctColorGrid();
    });
    grid.appendChild(swatch);
  }
}

function openAcctEditor(acct) {
  editingAcctId = acct?.id ?? null;
  $('#acct-editor-title').textContent = acct ? t('editAccount') : t('newAccount');
  $('#acct-name-input').value = acct ? acctName(acct) : '';
  $('#acct-opening-input').value = acct?.openingCents ? centsToInputStr(acct.openingCents) : '';
  acctEditorColor = acct?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)];
  renderAcctColorGrid();
  $('#acct-delete-btn').hidden = !acct || accounts.length <= 1;
  $('#acct-editor').classList.add('open');
  $('#acct-editor-backdrop').classList.add('open');
}

function closeAcctEditor() {
  $('#acct-editor').classList.remove('open');
  $('#acct-editor-backdrop').classList.remove('open');
}

async function onAcctSave() {
  const name = $('#acct-name-input').value.trim().slice(0, 12);
  if (!name) return;
  const opening = toCents($('#acct-opening-input').value.trim());
  if (editingAcctId) {
    const a = accounts.find((x) => x.id === editingAcctId);
    if (a) {
      if (name !== acctName(a)) { a.name = name; a.renamed = true; }
      a.color = acctEditorColor;
      a.openingCents = opening > 0 ? opening : 0;
    }
  } else {
    accounts.push({ id: crypto.randomUUID(), name, color: acctEditorColor, openingCents: opening > 0 ? opening : 0 });
  }
  await saveAccounts(accounts);
  schedulePush();
  closeAcctEditor();
  renderAcctList();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

async function onAcctDelete() {
  if (!editingAcctId) return;
  if (accounts.length <= 1) { alert(t('lastAccountNoDelete')); return; }
  const count = entries.filter((e) => (e.accountId || accounts[0]?.id) === editingAcctId).length;
  if (!confirm(t('confirmDeleteAccount', count))) return;
  accounts = accounts.filter((a) => a.id !== editingAcctId);
  const fallback = accounts[0].id;
  for (const e of entries) {
    if (e.accountId === editingAcctId || !e.accountId) e.accountId = fallback;
  }
  if (localStorage.getItem('lastAccountId') === editingAcctId) localStorage.removeItem('lastAccountId');
  await Promise.all([saveAccounts(accounts), saveEntries(entries)]);
  schedulePush();
  closeAcctEditor();
  renderAcctList();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

function openCatModal() {
  renderCatList();
  renderAcctList();
  budgetInput.value = meta.monthlyBudgetCents ? centsToInputStr(meta.monthlyBudgetCents) : '';
  renderRecurList();
  renderLockStatus();
  updateBackupStatus();
  updateSyncStatus();
  renderCurrencyList();
  updateSettingsHubStatuses();
  updateProUI();
  checkEntitlement();
  showSettingsHub();          // 每次打開都回到主頁
  catModalEl.classList.add('open');
}

function closeCatModal() {
  catModalEl.classList.remove('open');
  showSettingsHub();          // 關閉時重設,下次打開乾淨
}

// ---------- 設定:主頁 ↔ 子頁 導覽 ----------
const settingsHubEl = $('#settings-hub');
const settingsBackBtn = $('#settings-back');
const settingsTitleEl = $('#settings-title');

function showSettingsHub() {
  settingsHubEl.hidden = false;
  document.querySelectorAll('#cat-modal .settings-page').forEach((p) => { p.hidden = true; });
  settingsBackBtn.style.visibility = 'hidden';
  settingsTitleEl.textContent = t('settings');
  settingsTitleEl.setAttribute('data-i18n', 'settings');
}

function showSettingsPage(page, titleKey) {
  if (page === 'quickadd') renderQuickAddPage();
  settingsHubEl.hidden = true;
  document.querySelectorAll('#cat-modal .settings-page').forEach((p) => {
    p.hidden = p.dataset.page !== page;
  });
  settingsBackBtn.style.visibility = 'visible';
  settingsTitleEl.textContent = titleKey ? t(titleKey) : '';
  if (titleKey) settingsTitleEl.setAttribute('data-i18n', titleKey);
  else settingsTitleEl.removeAttribute('data-i18n');
  catModalEl.scrollTop = 0;
}

document.querySelectorAll('#settings-hub .settings-row').forEach((row) => {
  row.addEventListener('click', () => showSettingsPage(row.dataset.page, row.dataset.titleKey));
});
settingsBackBtn.addEventListener('click', showSettingsHub);

// 主頁各列右側的小狀態(目前幣別、是否開同步、是否設鎖)
function updateSettingsHubStatuses() {
  const cur = CURRENCIES.find((c) => c.code === currency);
  $('#currency-current').textContent = cur ? currency : '';
  const cloudEl = $('#cloud-hub-status');
  if (cloudEl) cloudEl.textContent = syncCode ? t('syncOn') : '';
  const lockEl = $('#lock-hub-status');
  if (lockEl) lockEl.textContent = pinIsSet() ? t('syncOn') : '';
}

// ---------- 幣別清單 ----------
function renderCurrencyList() {
  const wrap = $('#currency-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  CURRENCIES.forEach((c) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'cat-row currency-row' + (c.code === currency ? ' is-selected' : '');
    row.innerHTML = `<span class="cat-row-name">${c.name}</span><span class="currency-check">${c.code === currency ? '✓' : ''}</span>`;
    row.addEventListener('click', () => {
      setCurrency(c.code);
      renderCurrencyList();
      updateSettingsHubStatuses();
    });
    wrap.appendChild(row);
  });
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

let editingParentId = null;   // 新增子分類時的母分類;編輯子分類時為其母分類

function openCatEditor(cat, parentId = null) {
  editingCatId = cat?.id ?? null;
  editingParentId = cat?.parentId ?? parentId;
  const isSub = !!editingParentId;
  editorColor = cat?.color ?? PALETTE[Math.floor(PALETTE.length / 2)];
  catNameInput.value = cat ? catName(cat) : '';
  catNameInput.placeholder = isSub ? t('subcategoryName') : t('categoryName');
  $('#cat-editor-title').textContent = isSub
    ? (cat ? t('editSubcategory') : t('newSubcategory'))
    : (cat ? t('editCategory') : t('newCategory'));
  catDeleteBtn.hidden = !cat;
  catDeleteBtn.textContent = isSub ? t('deleteSubcategory') : t('deleteCategory');
  // 子分類只有名字:顏色跟母分類,預算算在母分類
  colorGridEl.hidden = isSub;
  const type = cat ? cat.type : catManageType;
  catBudgetField.hidden = isSub || type !== 'expense';
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
  if (!editingCatId && editingParentId) {
    const parent = categories.find((c) => c.id === editingParentId);
    if (!parent) return closeCatEditor();
    categories.push({ id: crypto.randomUUID(), name, color: parent.color, type: parent.type, parentId: parent.id });
  } else if (editingCatId) {
    const cat = categories.find((c) => c.id === editingCatId);
    if (cat) {
      const builtin = CATEGORY_NAMES[cat.id];
      // 名稱仍等於內建預設 → 維持內建;否則記為自訂名
      if (builtin && name === builtin) {
        cat.renamed = false;
        cat.name = builtin;
      } else {
        cat.renamed = true;
        cat.name = name;
      }
      if (!cat.parentId) {
        cat.color = editorColor;
        // 子分類存的顏色一起更新(顯示時本來就跟母分類走,這裡讓匯出/舊版也一致)
        for (const s of subCatsOf(cat.id)) s.color = editorColor;
        if (cat.type === 'expense') cat.budgetCents = budgetCents;
      }
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
  const cat = categories.find((c) => c.id === editingCatId);
  if (!cat) return closeCatEditor();

  if (cat.parentId) {
    // 刪子分類:帳目併回母分類,不讓它們變成「未分類」
    const parent = categories.find((c) => c.id === cat.parentId);
    const moved = entries.filter((e) => e.categoryId === cat.id);
    if (!confirm(t('confirmDeleteSub', moved.length, catName(parent)))) return;
    for (const e of moved) e.categoryId = cat.parentId;
    for (const r of recurring) if (r.categoryId === cat.id) r.categoryId = cat.parentId;
    categories = categories.filter((c) => c.id !== cat.id);
    await Promise.all([saveCategories(categories), saveEntries(entries), saveRecurring(recurring)]);
    schedulePush();
    closeCatEditor();
    renderCatList();
    renderList();
    if (!viewReportEl.hidden) renderReport();
    return;
  }

  const subIds = new Set(subCatsOf(cat.id).map((s) => s.id));
  const count = entries.filter((e) => e.categoryId === cat.id || subIds.has(e.categoryId)).length;
  const msg = subIds.size
    ? t('confirmDeleteParent', subIds.size, count)
    : (count > 0 ? t('confirmDeleteCategoryUsed', count) : t('confirmDeleteCategory'));
  if (!confirm(msg)) return;
  categories = categories.filter((c) => c.id !== editingCatId && !subIds.has(c.id));
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
      accountId: defaultAcctId(),
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
    row.querySelector('.cat-dot').style.background = catColor(cat);
    row.querySelector('.recur-name').textContent = r.note || catLabel(cat);
    row.querySelector('.recur-sub').textContent = `${catLabel(cat)} · ${t('recurringDay', r.dayOfMonth)}`;
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
    accounts,
  };
  const ok = await shareOrDownload(
    `richmama-backup-${todayStr()}.json`,
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
  const am = acctMap();
  const header = ['date', 'type', 'category', 'account', 'note', 'amount'];
  const lines = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((e) =>
      [e.date, e.type, catLabel(cats.get(e.categoryId), cats), acctName(am.get(e.accountId)) || '', e.note || '', (e.amountCents / 100).toFixed(2)]
        .map(csvCell)
        .join(',')
    );
  // 加 BOM 讓 Excel 正確辨識 UTF-8
  const csv = '﻿' + [header.join(','), ...lines].join('\n');
  await shareOrDownload(`richmama-${todayStr()}.csv`, csv, 'text/csv');
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

// 資料保護提示:有資料但還沒開雲端同步時,提醒開啟(避免換機/刪 App 丟資料)
function maybeShowProtectBanner() {
  const el = $('#protect-banner');
  if (!el) return;
  if (syncEnabled() || entries.length < 3) { el.hidden = true; return; }
  if (Date.now() < (Number(localStorage.getItem('protectSnoozeUntil')) || 0)) { el.hidden = true; return; }
  el.querySelector('.protect-text').textContent = t('protectMsg');
  el.hidden = false;
}
function hideProtectBanner() {
  const el = $('#protect-banner');
  if (el) el.hidden = true;
}
function snoozeProtectBanner() {
  localStorage.setItem('protectSnoozeUntil', String(Date.now() + 3 * DAY_MS));
  hideProtectBanner();
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
    name: c.name.trim().slice(0, 24),
    color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#8C95A3',
    type: c.type === 'income' ? 'income' : 'expense',
  };
  if (c.renamed === true) out.renamed = true;
  // 子分類的母分類 id —— 漏掉的話,同步/還原後所有子分類都會被攤平成頂層
  if (typeof c.parentId === 'string' && c.parentId && c.parentId !== out.id) out.parentId = c.parentId;
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

  // accounts:以 id 合併
  const inAccts2 = Array.isArray(data.accounts) ? data.accounts.map(sanitizeAccount).filter(Boolean) : [];
  if (inAccts2.length) {
    const acctMapById = new Map(accounts.map((x) => [x.id, x]));
    for (const x of inAccts2) acctMapById.set(x.id, x);
    accounts = [...acctMapById.values()];
  }

  await Promise.all([saveEntries(entries), saveCategories(categories), saveMeta(meta), saveRecurring(recurring), saveAccounts(accounts)]);
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
  const faceBtn = lockScreenEl.querySelector('#lock-face-btn');
  if (faceBtn) faceBtn.hidden = true;
  lockScreenEl.hidden = false;
  if (mode === 'unlock') maybeOfferBiometric();
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
  if (BiometricAuth) refreshBiometry().then(renderFaceUnlockRow);
  else renderFaceUnlockRow();
}

function onLockRowClick() {
  if (pinIsSet()) {
    if (confirm(t('confirmRemovePin'))) {
      localStorage.removeItem('pinHash');
      localStorage.removeItem('pinSalt');
      localStorage.removeItem('pinLen');
      localStorage.removeItem('faceUnlock');   // 移除 PIN 一併關閉生物辨識
      renderLockStatus();
    }
  } else {
    showLock('set-new');
  }
}

// ---------- 生物辨識解鎖(Face ID / Touch ID,僅原生 App)----------
// 透過原生外掛 BiometricAuthNative 的原始 proxy 取得(免打包工具);Web 版為 null。
// 注意:Capacitor.registerPlugin 在模組執行當下還不存在(要等動態載入的 bundle),
// 但原生殼層一開始就把所有原生外掛放進 Capacitor.Plugins,所以先從那裡拿。
const BiometricAuth = IS_NATIVE
  ? (window.Capacitor?.Plugins?.BiometricAuthNative || window.Capacitor?.registerPlugin?.('BiometricAuthNative') || null)
  : null;
let biometryInfo = { isAvailable: false, biometryType: 0 };  // 1=Touch ID, 2=Face ID

async function refreshBiometry() {
  if (!BiometricAuth) { biometryInfo = { isAvailable: false, biometryType: 0 }; return biometryInfo; }
  try { biometryInfo = await BiometricAuth.checkBiometry(); }
  catch { biometryInfo = { isAvailable: false, biometryType: 0 }; }
  return biometryInfo;
}

const faceUnlockEnabled = () => pinIsSet() && localStorage.getItem('faceUnlock') === '1';

async function tryBiometricUnlock() {
  if (!BiometricAuth || !faceUnlockEnabled()) return false;
  try {
    const info = await refreshBiometry();
    if (!info.isAvailable) return false;
    await BiometricAuth.internalAuthenticate({ reason: t('faceUnlockReason'), cancelTitle: t('cancel'), iosFallbackTitle: '' });
    return true;   // 驗證成功
  } catch { return false; }  // 取消或失敗 → 退回 PIN
}

// 鎖屏(unlock 模式)時:顯示「使用 Face ID」按鈕並自動嘗試一次
async function maybeOfferBiometric() {
  const faceBtn = lockScreenEl.querySelector('#lock-face-btn');
  if (!BiometricAuth || !faceUnlockEnabled()) { if (faceBtn) faceBtn.hidden = true; return; }
  const info = await refreshBiometry();
  if (!info.isAvailable) { if (faceBtn) faceBtn.hidden = true; return; }
  if (faceBtn) {
    faceBtn.hidden = false;
    faceBtn.textContent = info.biometryType === 1 ? t('useTouchIDBtn') : t('useFaceIDBtn');
  }
  if (await tryBiometricUnlock()) hideLock();
}

// 設定 → App 鎖:生物辨識開關列(只在原生+可用+已設 PIN 顯示)
function renderFaceUnlockRow() {
  const block = $('#face-unlock-block');
  const hint = $('#face-unlock-hint');
  if (!block) return;
  const show = !!BiometricAuth && biometryInfo.isAvailable && pinIsSet();
  block.hidden = !show;
  if (hint) hint.hidden = !show;
  if (!show) return;
  const isTouch = biometryInfo.biometryType === 1;
  $('#face-unlock-name').textContent = t(isTouch ? 'faceUnlockTitleTouch' : 'faceUnlockTitle');
  $('#face-unlock-status').textContent = localStorage.getItem('faceUnlock') === '1' ? t('syncOn') : t('syncOff');
}

function onFaceUnlockClick() {
  if (!pinIsSet()) { alert(t('faceUnlockNeedPin')); return; }
  if (localStorage.getItem('faceUnlock') === '1') localStorage.removeItem('faceUnlock');
  else localStorage.setItem('faceUnlock', '1');
  renderFaceUnlockRow();
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
  const data = new TextEncoder().encode(JSON.stringify({ categories, entries, meta, recurring, accounts }));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, syncKey, data);
  return { iv: bufToB64(iv.buffer), ciphertext: bufToB64(ct) };
}
async function decryptPayload(ivB64, ctB64) {
  const iv = new Uint8Array(b64ToBuf(ivB64));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, syncKey, b64ToBuf(ctB64));
  return JSON.parse(new TextDecoder().decode(pt));
}

function sanitizeAccount(a) {
  if (!a || typeof a !== 'object' || typeof a.name !== 'string' || !a.name.trim()) return null;
  const out = {
    id: typeof a.id === 'string' && a.id ? a.id : crypto.randomUUID(),
    name: a.name.trim().slice(0, 12),
    color: /^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : '#8C95A3',
    openingCents: 0,
  };
  const op = Math.round(Number(a.openingCents));
  if (Number.isFinite(op) && op > 0) out.openingCents = op;
  if (a.renamed === true) out.renamed = true;
  return out;
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

  const inAccts = Array.isArray(data.accounts) ? data.accounts.map(sanitizeAccount).filter(Boolean) : [];
  if (inAccts.length) {
    const am = new Map(accounts.map((x) => [x.id, x]));
    for (const x of inAccts) am.set(x.id, x);
    accounts = [...am.values()];
  }

  if (data.meta && typeof data.meta === 'object') {
    const b = Math.round(Number(data.meta.monthlyBudgetCents));
    if (Number.isFinite(b) && b > 0) meta = { ...meta, monthlyBudgetCents: b };
  }
}

async function persistAll() {
  await Promise.all([saveEntries(entries), saveCategories(categories), saveMeta(meta), saveRecurring(recurring), saveAccounts(accounts)]);
}

function setSyncVersion(v) {
  syncVersion = v;
  localStorage.setItem('syncVersion', String(v));
}

function refreshAfterSync() {
  renderList();
  if (!viewReportEl.hidden) renderReport();
  renderCatList();
  renderAcctList();
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
  hideProtectBanner(); // 已開同步 → 收起保護提示
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

// Apple 5.1.2:把使用者的財務文件送到第三方(Anthropic)前,必須先明確告知並取得同意。
// 同意記在本機,每種功能問一次。
function ensureAiConsent(kind) {
  const key = 'aiConsent:' + kind;
  if (localStorage.getItem(key) === '1') return true;
  const ok = confirm(t(kind === 'receipt' ? 'aiConsentReceipt' : 'aiConsentStatement'));
  if (ok) localStorage.setItem(key, '1');
  return ok;
}

async function onReceiptFile(file) {
  if (!file) return;
  if (!ensureAiConsent('receipt')) return;
  let image;
  try { image = await fileToBase64(file); } catch { alert(t('receiptFailed')); return; }
  await scanReceiptImage(image);
}

// 收據 / 付款截圖 → AI 讀出金額、商家、日期、分類,填進記帳面板。成功填入回傳 true。
// 呼叫前要先 openSheet(),而且已取得 AI 同意。
async function scanReceiptImage(image) {
  const btn = $('#receipt-btn');
  const label = btn.querySelector('.receipt-label');
  const original = label.textContent;
  btn.disabled = true;
  btn.classList.add('busy');
  label.textContent = t('scanningReceipt');
  try {
    const names = aiCategoryLabels('expense');
    const res = await fetch(RECEIPT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        mediaType: 'image/jpeg',
        categories: names,
        installId: getInstallId(),
      }),
    });
    if (!res.ok) {
      let e = {};
      try { e = await res.json(); } catch {}
      if (res.status === 429 && e.error === 'quota') alert(IS_NATIVE ? t('receiptQuotaNative') : t('receiptQuota', e.limit ?? 5));
      else if (res.status === 429) alert(t('receiptRate'));
      else if (res.status === 503) alert(t('receiptBusy'));
      else alert(t('receiptFailed'));
      return false;
    }
    const r = await res.json();

    // 收據一律是支出;付款 App 截圖(TNG 收款、轉入)可能是收入
    const isIn = r.direction === 'in';
    setSheetType(isIn ? 'income' : 'expense');
    if (typeof r.amount === 'number' && r.amount > 0) {
      amountStr = String(Math.round(r.amount * 100) / 100);
      renderAmount();
    }
    if (r.merchant) noteInput.value = String(r.merchant).slice(0, 60);
    if (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) dateInput.value = r.date;
    if (!isIn) {
      const match = findCatByAiName(r.category, 'expense');
      if (match) selectedCatId = match.id;
    }
    renderCategoryChips();
    updateSaveState();
    return typeof r.amount === 'number' && r.amount > 0;
  } catch {
    alert(t('receiptFailed'));
    return false;
  } finally {
    btn.disabled = false;
    btn.classList.remove('busy');
    label.textContent = original;
  }
}

// ---------- Pro 訂閱 ----------
// Web 用 Stripe;原生殼層用商店內購(StoreKit / Play Billing via RevenueCat,避開 3.1.1)。
const WORKER_BASE = 'https://daily-ledger-sync.yuxuanchin95.workers.dev';
// RevenueCat Public SDK key。在 RevenueCat → Project → API keys 取得(iOS 為 appl_…,Android 為 goog_…)。
const REVENUECAT_IOS_KEY = 'appl_RUMkTHZXFfjCiraVUjeqZcEQSSA';
const REVENUECAT_ANDROID_KEY = 'goog_PQVyVvEOPkdjQOnLjtghnxBOohA';
const REVENUECAT_KEY = (window.Capacitor?.getPlatform?.() === 'android')
  ? REVENUECAT_ANDROID_KEY : REVENUECAT_IOS_KEY;
let isPro = false;
let proUntil = null;
let proPriceStr = null; // 原生 paywall 顯示的在地化價格（如 RM12.90 / US$2.99）

// 懶載入 IAP shim（只在 iOS 殼層、且只載一次）。Web 永不觸發。
let _iapMod = null;
async function iapModule() {
  if (_iapMod) return _iapMod;
  _iapMod = await import('./iap.bundle.js');
  return _iapMod;
}
// ---------- 廣告(免費版限定) ----------
// AdMob App/Ad unit 是綁平台的,iOS 和 Android 各自獨立申請,不能共用。
// Android 目前還是 Google 官方測試 banner 佔位(不會產生無效流量/停權)——
// 等 AdMob 主控台建好 Android app + 正式 banner unit 後要換成真實 ID。
const ADMOB_BANNER_ID_IOS = 'ca-app-pub-1502132653355957/4667553024'; // RichAuntie Bottom Banner (iOS)
const ADMOB_BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111'; // Google test banner (Android) — TODO: swap for real unit
const ADMOB_BANNER_ID = (window.Capacitor?.getPlatform?.() === 'android')
  ? ADMOB_BANNER_ID_ANDROID : ADMOB_BANNER_ID_IOS;

let _adsMod = null;
async function adsModule() {
  if (_adsMod) return _adsMod;
  window.__ADMOB_BANNER_ID__ = ADMOB_BANNER_ID;
  _adsMod = await import('./ads.bundle.js');
  return _adsMod;
}

// Pro 用戶「完全不載入」SDK,而不是載入後隱藏——
// 後者仍會收集廣告識別碼,等於白白違背對付費用戶的承諾。
// 廣告總開關:等拿到正式 AdMob ID 再開。
// 絕不能帶著 Google 測試廣告上架——用戶會看到「Test Ad」字樣且收入為零。
const ADS_ENABLED = true;

async function syncAds() {
  if (!ADS_ENABLED || !IS_NATIVE) return;
  try {
    if (isPro) {
      if (_adsMod) await _adsMod.stopAds();
      return;
    }
    const m = await adsModule();
    await m.startAds();
  } catch {
    /* 廣告載不出來不該擋住記帳功能 */
  }
}

async function iapReady() {
  const m = await iapModule();
  await m.configureIAP(REVENUECAT_KEY, getInstallId());
  return m;
}

// 訂閱週期文字:Apple 3.1.2 要求購買點清楚標示「長度」,且說明不可與實際方案不符
const PLAN_UNIT_KEY = { weekly: 'unitWeek', monthly: 'unitMonth', annual: 'unitYear' };
const planUnit = (plan) => t(PLAN_UNIT_KEY[plan] || 'unitMonth');

function updateProUI() {
  const label = $('#pro-label');
  const status = $('#pro-status');
  const hint = $('#pro-hint');
  if (isPro) {
    label.textContent = t('proActive');
    const d = proUntil ? new Date(proUntil * 1000).toLocaleDateString('en-MY') : '';
    status.textContent = d ? t('proUntil', d) : '';
    $('#pro-btn').classList.add('is-pro');
    hint.textContent = t('proThanks');
  } else {
    status.textContent = '';
    $('#pro-btn').classList.remove('is-pro');
    if (IS_NATIVE) {
      // 原生:方案由下方 picker 選,按鈕本身只當「購買」動作
      label.textContent = t('upgradeProGeneric');
      const isAndroid = window.Capacitor?.getPlatform?.() === 'android';
      hint.textContent = t(isAndroid ? 'proPitchIAPAndroid' : 'proPitchIAP', planUnit(selectedPlan));
    } else {
      label.textContent = t('upgradePro');
      hint.textContent = t('proPitch');
    }
  }
  // iOS 也顯示購買鈕(內購合規);Web 維持原本行為
  $('#pro-btn').hidden = false;
  // 恢復購買:已是 Pro 就不顯示
  $('#restore-btn').hidden = isPro;
  // iOS 未訂閱時顯示自動續訂法務連結(Apple 要求 paywall 附 Terms/隱私)
  const legal = $('#pro-legal');
  if (legal) legal.hidden = !(IS_NATIVE && !isPro);
  renderPlanPicker();
  syncAds();
}

async function onRestore() {
  if (IS_NATIVE) {
    // iOS:用 Apple 帳號還原內購
    try {
      const m = await iapReady();
      const res = await m.restorePro();
      if (res.pro) {
        isPro = true;
        proUntil = res.until || null;
        updateProUI();
        alert(t('restoreFound'));
      } else {
        alert(t('restoreNotFound'));
      }
    } catch {
      alert(t('restoreFailed'));
    }
    return;
  }
  // Web:用 email 比對 Stripe 訂閱還原
  const email = (prompt(t('restorePrompt')) || '').trim();
  if (!email) return;
  try {
    const r = await fetch(`${WORKER_BASE}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId: getInstallId(), email }),
    });
    const d = await r.json();
    if (d.pro) {
      isPro = true;
      proUntil = d.until || null;
      updateProUI();
      alert(t('restoreFound'));
    } else if (r.ok) {
      alert(t('restoreNotFound'));
    } else {
      alert(t('restoreFailed'));
    }
  } catch {
    alert(t('restoreFailed'));
  }
}

async function checkEntitlement() {
  if (IS_NATIVE) {
    // iOS:訂閱狀態與價格來自 RevenueCat（StoreKit）
    try {
      const m = await iapReady();
      proPriceStr = await m.getPriceString().catch(() => null);
      const s = await m.getProStatus();
      isPro = !!s.pro;
      proUntil = s.until || null;
      updateProUI();
    } catch {
      /* 離線或尚未設定金鑰:維持現狀 */
      updateProUI();
    }
    return;
  }
  // Web:Stripe 入帳狀態
  try {
    const r = await fetch(`${WORKER_BASE}/entitlement?installId=${getInstallId()}`);
    if (!r.ok) return;
    const d = await r.json();
    isPro = !!d.pro;
    proUntil = d.until || null;
    updateProUI();
  } catch {
    /* 離線:維持現狀 */
  }
}

// ---------- 方案選擇(週/月/年) ----------

// 價格字串一律用 StoreKit 回的在地化結果,不自己組貨幣符號——
// 同一個 App 在不同國家幣別和稅制都不同。
async function renderPlanPicker() {
  const picker = $('#plan-picker');
  if (!IS_NATIVE || isPro) { picker.hidden = true; return; }
  let plans = null;
  try {
    const m = await iapReady();
    plans = await m.getPlans();
  } catch {
    picker.hidden = true;
    return;
  }
  const available = [];
  for (const plan of ['annual', 'monthly', 'weekly']) {
    const row = picker.querySelector(`[data-plan="${plan}"]`);
    const info = plans && plans[plan];
    if (!info || !info.priceString) { row.hidden = true; continue; }
    row.hidden = false;
    available.push(plan);
    // 「RM 39.90 / 年」——價格 + 週期一起顯示
    $(`#plan-${plan}-price`).textContent = `${info.priceString} / ${planUnit(plan)}`;
  }
  // 年繳省多少:拿月繳年化來比,算得出來才顯示
  const sub = $('#plan-annual-sub');
  const a = plans && plans.annual, mo = plans && plans.monthly;
  if (a && mo && typeof a.price === 'number' && typeof mo.price === 'number' && mo.price > 0) {
    const pct = Math.round((1 - a.price / (mo.price * 12)) * 100);
    sub.textContent = pct > 0 ? t('planSave', pct) : '';
  } else {
    sub.textContent = '';
  }
  picker.hidden = !available.length;
  // 選中的方案若沒上架(例如沙盒只載到部分產品),要改選第一個可用的——
  // 否則說明文字的續訂週期會跟畫面上的方案對不上(Apple 3.1.2)
  selectPlan(available.includes(selectedPlan) ? selectedPlan : (available[0] || selectedPlan));
}

let selectedPlan = 'annual';

function selectPlan(plan) {
  selectedPlan = plan;
  $('#plan-picker').querySelectorAll('.plan-row').forEach((r) => {
    r.classList.toggle('selected', r.dataset.plan === plan);
  });
  // 續訂週期說明要跟著改,否則選年繳卻寫「每月續訂」= 誤導(3.1.2)
  if (IS_NATIVE && !isPro) {
    const isAndroid = window.Capacitor?.getPlatform?.() === 'android';
    $('#pro-hint').textContent = t(isAndroid ? 'proPitchIAPAndroid' : 'proPitchIAP', planUnit(plan));
  }
}

$('#plan-picker').addEventListener('click', (e) => {
  const row = e.target.closest('.plan-row');
  if (row) selectPlan(row.dataset.plan);
});

async function onProClick() {
  if (isPro) return; // 已是 Pro
  if (IS_NATIVE) {
    // iOS:Apple 內購(StoreKit via RevenueCat),買使用者選的那一檔
    const btn = $('#pro-btn');
    btn.disabled = true;
    try {
      const m = await iapReady();
      const res = await m.purchasePro(selectedPlan);
      if (res.cancelled) return; // 使用者取消,不報錯
      if (res.pro) {
        isPro = true;
        proUntil = res.until || null;
        updateProUI();
        alert(t('proWelcome'));
      }
    } catch {
      alert(t('proCheckoutFailed'));
    } finally {
      btn.disabled = false;
    }
    return;
  }
  // Web:Stripe 結帳
  try {
    const r = await fetch(`${WORKER_BASE}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId: getInstallId() }),
    });
    const d = await r.json();
    if (d.url) window.location.href = d.url; // 轉到 Stripe 結帳
    else alert(t('proCheckoutFailed'));
  } catch {
    alert(t('proCheckoutFailed'));
  }
}

// 從 Stripe 結帳返回:驗證 session、開通 Pro
async function handleProReturn() {
  const params = new URLSearchParams(location.search);
  const status = params.get('pro');
  if (!status) return;
  if (status === 'success' && params.get('session_id')) {
    try {
      const r = await fetch(
        `${WORKER_BASE}/verify?session_id=${encodeURIComponent(params.get('session_id'))}&installId=${getInstallId()}`
      );
      const d = await r.json();
      if (d.pro) {
        isPro = true;
        proUntil = d.until || null;
        updateProUI();
        alert(t('proWelcome'));
      }
    } catch {}
  }
  history.replaceState(null, '', location.pathname); // 清掉網址參數
}

// ---------- 事件繫結 ----------

$('#pro-btn').addEventListener('click', onProClick);
$('#restore-btn').addEventListener('click', onRestore);


$('#receipt-btn').addEventListener('click', () => $('#receipt-input').click());
$('#receipt-input').addEventListener('change', (e) => {
  onReceiptFile(e.target.files[0]);
  e.target.value = '';
});

// ---------- 明細頁頂部:掃收據 / 匯入對帳單 ----------

// 明細頁的「掃描收據」= 開記帳頁再觸發既有的收據流程,避免兩套邏輯
$('#scan-receipt-btn').addEventListener('click', () => $('#scan-receipt-input').click());
$('#scan-receipt-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  openSheet();
  setSheetType('expense');
  onReceiptFile(file);
});

$('#import-stmt-btn').addEventListener('click', () => $('#stmt-input').click());
$('#stmt-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  onStatementFile(file);
});

const reconSheetEl = $('#recon-sheet');
const reconBackdropEl = $('#recon-backdrop');
const reconListEl = $('#recon-list');
let reconRows = [];

// 對帳單匯入進度:三個真實階段。填滿的比例 = 已完成的階段數(不假造百分比),
// 剩下的部分跑掃描動畫,表示還在等一個時間未知的工作(AI 解析)。
const STMT_STAGES = ['stmtStepRead', 'stmtStepAnalyse', 'stmtStepMatch'];

function stmtProgress(stage) {
  const box = $('#stmt-progress');
  if (stage === null) { box.hidden = true; return; }
  const bar = $('#stmt-progress-bar');
  const track = $('#stmt-progress-track');
  box.hidden = false;
  $('#stmt-progress-label').textContent = t(STMT_STAGES[stage]);
  $('#stmt-progress-step').textContent = t('stmtStepOf', stage + 1, STMT_STAGES.length);
  bar.style.width = `${(stage / STMT_STAGES.length) * 100}%`;
  track.classList.add('busy');
}

function stmtProgressDone() {
  const bar = $('#stmt-progress-bar');
  const track = $('#stmt-progress-track');
  track.classList.remove('busy');
  bar.style.width = '100%';
  setTimeout(() => { $('#stmt-progress').hidden = true; bar.style.width = '0%'; }, 450);
}

async function onStatementFile(file) {
  if (!file) return;
  if (!ensureAiConsent('statement')) return;
  const btn = $('#import-stmt-btn');
  const label = btn.querySelector('span');
  const original = label.textContent;
  btn.disabled = true;
  label.textContent = t('reconBusy');
  stmtProgress(0);                       // 讀取檔案
  try {
    const names = aiCategoryLabels('expense');
    let txns = null;

    const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
    if (isCsv) {
      const text = await file.text();
      stmtProgress(1);                   // AI 解析
      // AI 優先:讓 Claude 一次做解析 + 支出類別智能分類;
      // 失敗(額度用完/離線)才退回本地解析(類別會落在「其他」)。
      try {
        txns = await parseWithAI({
          kind: 'text', data: text, categories: names,
          installId: getInstallId(), lang,
        });
      } catch (aiErr) {
        txns = parseCsv(text);
        if (!txns) throw aiErr;
      }
      if (!txns || !txns.length) txns = parseCsv(text);
    } else if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      const data = await fileToBase64Raw(file);
      stmtProgress(1);                   // AI 解析
      txns = await parseWithAI({
        kind: 'pdf', data, categories: names,
        installId: getInstallId(), lang,
      });
    } else {
      const data = await fileToBase64(file, 1800, 0.8); // 帳單字小,給高一點解析度
      stmtProgress(1);                   // AI 解析
      txns = await parseWithAI({
        kind: 'image', data, mediaType: 'image/jpeg', categories: names,
        installId: getInstallId(), lang,
      });
    }

    if (!txns || !txns.length) { alert(t('reconEmpty')); return; }
    stmtProgress(2);                     // 比對帳目
    openRecon(txns);
    stmtProgressDone();
  } catch (err) {
    if (err.code === 'quota') alert(IS_NATIVE ? t('reconQuotaNative') : t('reconQuota'));
    else if (err.code === 'rate') alert(t('receiptRate'));
    else if (err.code === 'global') alert(t('receiptBusy'));
    else alert(t('reconFailed'));
  } finally {
    // 還在 busy = 中途失敗,直接收掉(成功路徑已由 stmtProgressDone 收尾)
    if ($('#stmt-progress-track').classList.contains('busy')) stmtProgress(null);
    btn.disabled = false;
    label.textContent = original;
  }
}

// PDF 要原始 base64(不能走縮圖那條)
function fileToBase64Raw(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function openRecon(txns) {
  const result = reconcile(txns, entries);
  reconRows = result.rows;
  $('#recon-summary').textContent =
    t('reconSummary', result.total, result.matched, result.missing + result.review) +
    (result.otherCount ? ' · ' + t('reconOtherCard', result.otherCount) : '');
  renderRecon();
  reconSheetEl.classList.add('open');
  reconBackdropEl.classList.add('open');
}

function closeRecon() {
  reconSheetEl.classList.remove('open');
  reconBackdropEl.classList.remove('open');
  reconRows = [];
}

function renderRecon() {
  const pending = reconRows.filter((r) => r.status === 'missing' || r.status === 'review');
  const addAll = $('#recon-add-all');
  addAll.hidden = !pending.length;
  addAll.textContent = t('reconAddAll', pending.length);

  reconListEl.innerHTML = '';
  for (const [i, r] of reconRows.entries()) {
    const row = document.createElement('div');
    row.className = 'recon-row';
    const chipCls = { matched: 'ok', review: 'warn', missing: 'bad', credit: 'mut' }[r.status];
    const chipTxt = {
      matched: t('reconMatched'), review: t('reconReview'),
      missing: t('reconMissing'), credit: t('reconCredit'),
    }[r.status];

    const info = document.createElement('div');
    info.className = 'recon-main';
    const d = document.createElement('div');
    d.className = 'recon-desc';
    d.textContent = r.txn.label || r.txn.desc || '—';
    const meta = document.createElement('div');
    meta.className = 'recon-meta';
    // 副行:日期 + 原始帳單描述(有 label 時保留原文對照)
    meta.textContent = r.txn.label && r.txn.desc ? `${r.txn.date} · ${r.txn.desc}` : r.txn.date;
    info.append(d, meta);

    const right = document.createElement('div');
    right.className = 'recon-right';
    const amt = document.createElement('div');
    amt.className = 'recon-amt num';
    amt.textContent = (r.txn.direction === 'credit' ? '+' : '') + formatRM(Math.round(r.txn.amount * 100));
    const chip = document.createElement('span');
    chip.className = 'chip ' + chipCls;
    chip.textContent = chipTxt;
    right.append(amt, chip);

    row.append(info, right);

    if (r.status === 'missing' || r.status === 'review') {
      const add = document.createElement('button');
      add.className = 'recon-add';
      add.type = 'button';
      add.textContent = t('reconAdd');
      add.addEventListener('click', () => addFromStatement(i));
      row.append(add);
    }
    reconListEl.append(row);
  }
}

async function addFromStatement(i) {
  const r = reconRows[i];
  if (!r || r.status === 'matched') return;
  const match = findCatByAiName(r.txn.category, 'expense');
  const fallback = catsOfType('expense').find((c) => c.id === 'other') || catsOfType('expense')[0];
  entries.push({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    amountCents: Math.round(r.txn.amount * 100),
    type: 'expense',
    accountId: defaultAcctId(),
    categoryId: (match || fallback)?.id ?? null,
    note: (r.txn.label || r.txn.desc || '').slice(0, 60),
    date: r.txn.date,
    source: 'stmt',
  });
  r.status = 'matched';
  await saveEntries(entries);
  schedulePush();
  renderList();
  if (!viewReportEl.hidden) renderReport();
  renderRecon();
}

$('#recon-add-all').addEventListener('click', async () => {
  for (const [i, r] of reconRows.entries()) {
    if (r.status === 'missing' || r.status === 'review') await addFromStatement(i);
  }
});
$('#recon-close').addEventListener('click', closeRecon);
reconBackdropEl.addEventListener('click', closeRecon);

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
$('#backtap-later').addEventListener('click', () => {
  lsSet('backtapSnoozeUntil', String(Date.now() + 7 * DAY_MS));
  maybeShowBacktapBanner();
});
$('#backtap-setup').addEventListener('click', openQuickAddSettings);

// 資料保護提示橫幅
$('#protect-enable').addEventListener('click', () => { hideProtectBanner(); openSyncSheet(); });
$('#protect-later').addEventListener('click', snoozeProtectBanner);
$('#import-file').addEventListener('change', (e) => {
  onImportFile(e.target.files[0]);
  e.target.value = '';
});
$('#refresh-btn').addEventListener('click', forceUpdate);

// 搜尋
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  noteExact = false;   // 自己打字 = 一般搜尋
  searchClearBtn.hidden = !searchQuery;
  renderList();
});
searchInput.addEventListener('focus', () => { searchFocused = true; renderNoteChips(); });
// 失焦稍後才收起 chip 列:否則點 chip 時輸入框先失焦、chip 被移除,點擊就落空
searchInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (document.activeElement === searchInput) return;
    searchFocused = false;
    renderNoteChips();
  }, 250);
});
function clearSearch() {
  searchQuery = '';
  noteExact = false;
  searchInput.value = '';
  searchClearBtn.hidden = true;
  renderList();
}
searchClearBtn.addEventListener('click', () => {
  clearSearch();
  searchInput.focus();
});

// 整月預算
budgetInput.addEventListener('change', onBudgetChange);

// 帳戶編輯器
$('#acct-editor-cancel').addEventListener('click', closeAcctEditor);
$('#acct-editor-backdrop').addEventListener('click', closeAcctEditor);
$('#acct-editor-save').addEventListener('click', onAcctSave);
$('#acct-delete-btn').addEventListener('click', onAcctDelete);

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
$('#sync-email-backup').addEventListener('click', () => {
  // 把代碼用 email 寄給自己備份:純 mailto,代碼不經過我們的伺服器,維持端到端加密
  const code = (syncCodeInput.value || syncCode || '').trim().toUpperCase();
  if (code.length < 8) { alert(t('syncCodeTooShort')); return; }
  const subject = encodeURIComponent(t('syncEmailSubject'));
  const body = encodeURIComponent(t('syncEmailBody', code));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
$('#face-unlock-row').addEventListener('click', onFaceUnlockClick);
lockScreenEl.querySelector('#lock-face-btn').addEventListener('click', async () => {
  if (await tryBiometricUnlock()) hideLock();
});

$('#detail-back-btn').addEventListener('click', closeCatDetail);

$('#cat-editor-cancel').addEventListener('click', closeCatEditor);
catEditorBackdropEl.addEventListener('click', closeCatEditor);
$('#cat-editor-save').addEventListener('click', onCatSave);
catDeleteBtn.addEventListener('click', onCatDelete);

// ---------- 快速記帳:背面輕點兩下 / Siri / 長按圖示 ----------
// 入口全部收斂成一個網址:richauntie://add[?type=income](原生)或 ./?action=add(PWA)。
// iOS 的 App Intent(Back Tap 綁的捷徑)在原生端把這個網址丟進 Capacitor 的 appUrlOpen。
const LAUNCH_ADD_KEY = 'ra-launch-add';
const launchToAdd = () => { try { return localStorage.getItem(LAUNCH_ADD_KEY) === '1'; } catch { return false; } };

function quickAdd(type = 'expense') {
  if (catModalEl.classList.contains('open')) closeCatModal();
  if (detailModalEl.classList.contains('open')) closeCatDetail();
  switchView('list');
  openSheet();
  if (type === 'income') setSheetType('income');
}

// 解析各種入口帶進來的網址;是快速記帳就開面板並回傳 true
function handleQuickAddUrl(raw) {
  if (!raw) return false;
  let u;
  try { u = new URL(raw, location.href); } catch { return false; }
  const isScheme = u.protocol === 'richauntie:' && (u.host === 'add' || u.pathname.replace(/^\/+/, '') === 'add');
  const isParam = u.searchParams.get('action') === 'add';
  if (!isScheme && !isParam) return false;
  quickAdd(u.searchParams.get('type') === 'income' ? 'income' : 'expense');
  return true;
}

function initQuickAdd() {
  // 資料載入完才開放給原生呼叫;原生端會一直等到這個函式出現
  window.__raScan = raScan;
  // PWA 捷徑:./?action=add
  if (handleQuickAddUrl(location.href)) {
    history.replaceState(null, '', location.pathname);
  } else if (launchToAdd()) {
    quickAdd();
  }

  // 原生:URL scheme(冷啟動 + App 已在背景時)
  // 原生殼層的 Capacitor.Plugins.App 一開始就在;registerPlugin 要等打包的 bundle 載入後才有,不能靠它
  const AppPlugin = IS_NATIVE ? (window.Capacitor?.Plugins?.App || window.Capacitor?.registerPlugin?.('App')) : null;
  if (AppPlugin) {
    AppPlugin.addListener?.('appUrlOpen', ({ url }) => handleQuickAddUrl(url));
    // 冷啟動(Android 捷徑、iOS 從 URL 開啟):事件可能早於監聽,再用 launch URL 補一次
    AppPlugin.getLaunchUrl?.().then((r) => r?.url && handleQuickAddUrl(r.url)).catch(() => {});
  }

  // 「開啟就記帳」:離開 30 秒以上再回來也直接到鍵盤
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (launchToAdd() && hiddenAt && Date.now() - hiddenAt > 30000 && !sheetEl.classList.contains('open')) quickAdd();
  });
}

// 背面輕點 → 捷徑「截圖」→「Log Expense from Screenshot」:原生把 JPEG base64 丟進來
const AUTO_SAVE_SCAN_KEY = 'ra-scan-autosave';
const autoSaveScans = () => { try { return localStorage.getItem(AUTO_SAVE_SCAN_KEY) === '1'; } catch { return false; } };
let scanBusy = false;

const raScan = async (b64) => {
  if (scanBusy || typeof b64 !== 'string' || !b64) return;
  scanBusy = true;
  try {
    quickAdd();
    if (!ensureAiConsent('receipt')) return;
    const ok = await scanReceiptImage(b64);
    if (!ok || !autoSaveScans()) return;
    // 自動存檔:AI 沒給分類就放「Other」,金額一定要有
    if (!selectedCatId) {
      const fallback = categories.find((c) => c.id === (sheetType === 'income' ? 'other-income' : 'other'))
        || catsOfType(sheetType)[0];
      if (fallback) selectedCatId = fallback.id;
    }
    if (toCents(amountStr) > 0 && selectedCatId) await onSave();
  } finally {
    scanBusy = false;
  }
};

// 用戶在自己 iPhone 做好捷徑 → 分享 → 拷貝 iCloud 連結,貼在這裡就變成一鍵加入。
// 空字串時退回手動教學 + 打開捷徑 App。
const BACKTAP_SHORTCUT_URL = '';
const BACKTAP_DONE_KEY = 'ra-backtap-done';
const BACKTAP_STEP1_KEY = 'ra-backtap-step1';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const isIOSNative = () => IS_NATIVE && window.Capacitor?.getPlatform?.() === 'ios';

function openExternal(url) {
  // Capacitor 會把非 App 內的網址 / scheme 交給系統開(iCloud 捷徑連結 → 捷徑 App)
  window.open(url, '_blank');
}

function openQuickAddSettings() {
  openCatModal();
  showSettingsPage('quickadd', 'quickAddTitle');
}

// 明細頁頂部的一次性引導卡(只有 iOS App;設定完或按 Later 就不再出現)
function maybeShowBacktapBanner() {
  const el = $('#backtap-banner');
  if (!el) return;
  const snoozed = Date.now() < (Number(lsGet('backtapSnoozeUntil')) || 0);
  el.hidden = !isIOSNative() || lsGet(BACKTAP_DONE_KEY) === '1' || snoozed;
  if (!el.hidden) el.querySelector('.backtap-text').textContent = t('backtapBanner');
}

function renderBacktapSetup(page) {
  const step1Done = lsGet(BACKTAP_STEP1_KEY) === '1';
  const allDone = lsGet(BACKTAP_DONE_KEY) === '1';

  const intro = document.createElement('p');
  intro.className = 'qa-intro';
  intro.textContent = t('backtapIntro');
  page.appendChild(intro);

  const step = (n, title, done) => {
    const card = document.createElement('div');
    card.className = 'bt-step' + (done ? ' done' : '');
    card.innerHTML = `<div class="bt-step-head"><span class="bt-num"></span><span class="bt-title"></span></div><div class="bt-body"></div>`;
    card.querySelector('.bt-num').textContent = done ? '✓' : n;
    card.querySelector('.bt-title').textContent = title;
    page.appendChild(card);
    return card.querySelector('.bt-body');
  };
  const btn = (label, primary, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bt-btn' + (primary ? ' primary' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };
  const hint = (html) => {
    const p = document.createElement('p');
    p.className = 'bt-hint';
    p.innerHTML = html;   // 固定字串,只含 <b>
    return p;
  };

  // 1. 加入捷徑
  const b1 = step(1, t('backtapStep1'), step1Done);
  if (BACKTAP_SHORTCUT_URL) {
    b1.appendChild(hint(t('backtapStep1Hint')));
    b1.appendChild(btn(t('backtapStep1Btn'), !step1Done, () => {
      lsSet(BACKTAP_STEP1_KEY, '1');
      openExternal(BACKTAP_SHORTCUT_URL);
      setTimeout(() => showSettingsPage('quickadd', 'quickAddTitle'), 600);
    }));
  } else {
    b1.appendChild(hint(t('backtapStep1Manual')));
    b1.appendChild(btn(t('backtapStep1ManualBtn'), !step1Done, () => {
      lsSet(BACKTAP_STEP1_KEY, '1');
      openExternal('shortcuts://create-shortcut');
      setTimeout(() => showSettingsPage('quickadd', 'quickAddTitle'), 600);
    }));
  }

  // 2. 背面輕點(系統不允許 App 直接開這頁,只能給清楚的路徑)
  const b2 = step(2, t('backtapStep2'), allDone);
  const path = document.createElement('div');
  path.className = 'bt-path';
  t('backtapStep2Path').forEach((p, i) => {
    if (i) { const s = document.createElement('span'); s.className = 'bt-sep'; s.textContent = '›'; path.appendChild(s); }
    const c = document.createElement('span'); c.className = 'bt-crumb'; c.textContent = p; path.appendChild(c);
  });
  b2.appendChild(path);
  b2.appendChild(hint(t('backtapStep2Hint')));
  if (!allDone) {
    b2.appendChild(btn(t('backtapStep2Btn'), step1Done, () => {
      lsSet(BACKTAP_STEP1_KEY, '1');
      lsSet(BACKTAP_DONE_KEY, '1');
      maybeShowBacktapBanner();
      showSettingsPage('quickadd', 'quickAddTitle');
    }));
  }

  // 3. 試試看
  const b3 = step(3, t('backtapStep3'), false);
  b3.appendChild(hint(t('backtapStep3Hint')));
}

function renderQuickAddPage() {
  const page = $('#quickadd-body');
  const platform = window.Capacitor?.getPlatform?.() || 'web';
  if (platform === 'ios') {
    page.innerHTML = '';
    renderBacktapSetup(page);
    const list = document.createElement('div');
    list.className = 'cat-list qa-actions';
    const row = document.createElement('label');
    row.className = 'cat-row qa-toggle-row';
    row.innerHTML = `<span class="cat-row-name"></span><input type="checkbox" class="qa-switch">`;
    row.querySelector('.cat-row-name').textContent = t('quickAddAutoSave');
    const cb = row.querySelector('input');
    cb.checked = autoSaveScans();
    cb.addEventListener('change', () => lsSet(AUTO_SAVE_SCAN_KEY, cb.checked ? '1' : '0'));
    list.appendChild(row);
    page.appendChild(list);
    const foot = document.createElement('p');
    foot.className = 'backup-hint';
    foot.innerHTML = `${t('quickAddAutoSaveHint')}<br><br>${t('quickAddIosSiri')} ${t('backtapEmptyKeypad')}`;
    page.appendChild(foot);
    return;
  }
  const steps = platform === 'android' ? t('quickAddAndroidSteps')
    : t('quickAddWebSteps');
  page.innerHTML = '';
  const intro = document.createElement('p');
  intro.className = 'qa-intro';
  intro.textContent = t('quickAddIntro');
  page.appendChild(intro);

  const ol = document.createElement('ol');
  ol.className = 'qa-steps';
  for (const s of steps) {
    const li = document.createElement('li');
    li.innerHTML = s;   // 固定字串(無使用者輸入),只含 <b>
    ol.appendChild(li);
  }
  page.appendChild(ol);

  const list = document.createElement('div');
  list.className = 'cat-list qa-actions';
  {
    const row = document.createElement('label');
    row.className = 'cat-row qa-toggle-row';
    row.innerHTML = `<span class="cat-row-name"></span><input type="checkbox" class="qa-switch">`;
    row.querySelector('.cat-row-name').textContent = t('quickAddLaunchToggle');
    const cb = row.querySelector('input');
    cb.checked = launchToAdd();
    cb.addEventListener('change', () => {
      try { localStorage.setItem(LAUNCH_ADD_KEY, cb.checked ? '1' : '0'); } catch {}
    });
    list.appendChild(row);
  }
  const tryBtn = document.createElement('button');
  tryBtn.type = 'button';
  tryBtn.className = 'cat-row cat-row-add';
  tryBtn.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  tryBtn.querySelector('.cat-row-name').textContent = t('quickAddTry');
  tryBtn.addEventListener('click', () => quickAdd());
  list.appendChild(tryBtn);
  if (IS_NATIVE) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'cat-row';
    copy.innerHTML = `<span class="cat-row-name"></span><span class="cat-row-count">richauntie://add</span>`;
    copy.querySelector('.cat-row-name').textContent = t('quickAddCopyLink');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('richauntie://add'); alert(t('quickAddCopied')); } catch {}
    });
    list.appendChild(copy);
  }
  page.appendChild(list);
  const hint = document.createElement('p');
  hint.className = 'backup-hint';
  hint.textContent = t('quickAddLaunchHint');
  page.appendChild(hint);
}

// ---------- 啟動 ----------
async function init() {
  buildFormatters();
  applyLanguage();
  updateCurrencyLabels();
  $('#app-version').textContent = APP_VERSION;

  // 設了 PIN 就先鎖住(內容在鎖屏後面,不可見)
  if (pinIsSet()) showLock('unlock');

  [entries, categories, meta, recurring, accounts] = await Promise.all([
    getEntries(), getCategories(), getMeta(), getRecurring(), getAccounts(),
  ]);
  await materializeRecurring();   // 補當月固定支出
  renderList();
  switchView('report');           // 預設開在「報表」頁
  maybeShowProtectBanner();       // 有資料但沒開同步 → 提醒保護資料
  maybeShowBackupBanner();        // 太久沒備份就提醒
  maybeShowBacktapBanner();       // iOS:引導設定背面輕點記帳
  initQuickAdd();                 // 背面輕點 / 捷徑 / 長按圖示 → 直接記帳

  // PWA:註冊 service worker(需要 https 或 localhost)。
  // 原生 App 殼層內不需要 SW(資產已打包進 App),且 capacitor:// scheme 下會失敗。
  if (!IS_NATIVE && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  initSync();   // 若已設定同步碼:拉回雲端最新並推送本機變動
  handleProReturn();   // 處理 Stripe 結帳返回
  checkEntitlement();  // 查詢 Pro 狀態
}

init();
