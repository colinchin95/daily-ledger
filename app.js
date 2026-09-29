import {
  getEntries, saveEntries, getCategories, saveCategories,
  getMeta, saveMeta, getRecurring, saveRecurring,
  getAccounts, saveAccounts,
} from './db.js';
import { moneyRain, moneyBurn } from './entry-fx.js';
import { parseCsv, reconcile, parseWithAI } from './reconcile.js';
import { INSTITUTIONS, INSTITUTION_MAP } from './institutions.js';

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
    net: 'Net',
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
    backtapBanner: 'Double-tap the back of your iPhone to log any payment \u2014 Touch \u2019n Go, DuitNow, GrabPay, Boost, ShopeePay, MAE, bank apps and e-receipts.',
    backtapSetup: 'Set up · 30s',
    backtapIntro: 'Double-tap the back of your iPhone on any payment or transfer screen and RichAuntie logs it for you. Works with Malaysian e-wallets (Touch \u2019n Go, GrabPay, Boost, ShopeePay, Setel, BigPay), DuitNow QR and transfers, bank apps (MAE, CIMB, Public Bank, RHB, Hong Leong\u2026), card payment screens and e-receipts.',
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
    backtapStep3Hint: 'Open any payment receipt or transaction detail \u2014 e.g. in Touch \u2019n Go, MAE or GrabPay \u2014 and double-tap the back of your phone.',
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
    trendRange: (n) => (n === 'all' ? 'All' : `${n}M`),
    trendsTitle: 'Trends',
    trendsViewAll: 'View trends',
    trendsAvgSpent: 'Avg spent / month',
    trendsAvgIncome: 'Avg income / month',
    trendsAvgSaved: 'Avg saved / month',
    trendsSavingsRate: 'Savings rate',
    trendsHighest: 'Highest spending',
    trendsLowest: 'Lowest spending',
    trendsByMonth: 'By month',
    trendsColMonth: 'Month',
    trendsColNet: 'Net',
    trendsEmpty: 'Add a few entries to see your trends.',
    inProgress: 'In progress',
    trendsNeedFullMonth: 'Averages appear after your first full month.',
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
    statusOff: 'Off',
    statusSetUp: 'Set up',
    statusActive: 'Active',
    statusUpgrade: 'Upgrade',
    statusUnlimited: 'Unlimited',
    statusFreeScans: '5 free / month',
    statusNever: 'Never',
    statusToday: 'Today',
    statusDaysAgo: (n) => `${n}d ago`,
    grpTracking: 'TRACKING',
    grpAutomation: 'AUTOMATION',
    grpDataSecurity: 'DATA & SECURITY',
    proTitle: 'RichAuntie Pro',
    proHeroSub: 'Log faster. See everything.',
    proBenefit1: 'Unlimited receipt & screenshot scanning',
    proBenefit2: 'Bank & credit card statement import',
    proBenefit3: 'No ads',
    proBenefit4: '60+ Malaysian 3D category icons',
    iconLabel: 'Icon',
    iconDefault: 'Default',
    chooseIcon: 'Choose icon',
    iconProNote: 'The 3D icon pack is part of RichAuntie Pro. Tap any icon to see Pro.',
    iconGroupFood: 'Food & drink',
    iconGroupTransport: 'Transport & home',
    iconGroupLife: 'Life & shopping',
    iconGroupMoney: 'Money & festive',
    receiptIntro: 'Snap a receipt or a payment screenshot and AI fills in the amount, merchant, date and category for you.',
    receiptQuotaFree: 'Free plan: 5 scans a month. Pro makes scanning unlimited.',
    receiptQuotaPro: 'You have Pro — scanning is unlimited.',
    backupHintSynced: 'Your data is synced with RichAuntie Cloud. You can still export a backup any time.',
    backupHintLocal: 'Your data lives only on this device — export a backup regularly.',
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
    planSixMonth: '6 months',
    stmtStepRead: 'Reading file',
    stmtStepAnalyse: 'Analysing with AI',
    stmtStepMatch: 'Matching entries',
    stmtStepOf: (a, b) => `${a} / ${b}`,
    unitSixMonths: '6 months',
    aiConsentReceipt: 'Scanning a receipt sends this photo over an encrypted connection to our processing endpoint, then on to Anthropic (Claude) to read the amount, date and merchant. The image is not stored and is not used to train models. Continue?',
    aiConsentStatement: 'Importing a statement sends this file over an encrypted connection to our processing endpoint, then on to Anthropic (Claude) to extract the transactions. The file is not stored and is not used to train models. Continue?',
    planPerMonth: (x) => `Just ${x} a month`,

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
    accountsHint: 'Add your bank accounts and e-wallets, then log income and spending to each. Balance = what you entered + income − expenses since then.',
    accountName: 'Account name',
    newAccount: 'New account',
    editAccount: 'Edit account',
    deleteAccount: 'Delete account',
    confirmDeleteAccount: (n) => `Delete this account? ${n} entries will move to your first account.`,
    lastAccountNoDelete: 'You need at least one account.',
    openingBalance: 'Opening balance (optional)',
    netWorth: 'Net worth',
    accountsTitle: 'Account balances',
    trendsRow: '6-month trends',
    ofBudget: (b) => `of ${b} budget`,
    budgetLeftLine: (left) => `${left} left`,
    budgetDaysLine: (d, perDay) => `${d === 1 ? '1 day' : `${d} days`} to go · ~${perDay}/day`,
    budgetOverLine: (x) => `${x} over budget`,
    setBudget: 'Set a budget',
    deltaVsSamePeriod: (p) => `${p} vs same period`,
    deltaVsLastMonth: (p) => `${p} vs last month`,
    biggestExpense: 'Biggest expense',
    backtapBannerShort: 'Log any payment with a double-tap on the back of your iPhone.',
    backtapSetupShort: 'Set up',
    addAccount: 'Add account',
    pickInstitution: 'Add account',
    instSearch: 'Search bank or e-wallet',
    instEwallets: 'E-wallets',
    instBanks: 'Banks',
    instOther: 'Cash, cards & others',
    instCustom: 'Other account',
    currentBalance: 'Current balance',
    currentBalanceHint: 'Enter what the account shows right now. Credit card or loan? Use a minus sign, e.g. -1200.',
    updateBalance: 'Tap an account to update its balance',
    avgPerDay: 'Avg / day',
    avgPerDayIncome: 'Avg / day',
    vsLastMonth: 'vs last month',
    vsSamePeriod: 'vs same period',
    topSpend: 'Biggest expense',
    dailyTitle: 'Daily spending',
    dailyTitleIncome: 'Daily income',
    dailyTitleExFixed: 'Daily spending (excl. fixed)',
    splitLine: (d, f) => `Daily ${d} + Fixed ${f}`,
    excludeFixed: 'Exclude fixed',
    fixedExpense: 'Fixed expense',
    fixedShort: 'Fixed',
    paidFrom: 'Paid from',
    receivedTo: 'Received to',
    chooseAccount: 'Choose account',
    moreCats: 'More',
    allCategories: 'All categories',
    today: 'Today',
    yesterday: 'Yesterday',
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
// 對外只顯示行銷版本(和 App Store 一致);build 號用小字。原生殼層從 App.getInfo() 讀真實值。
const APP_MARKETING_VERSION = '1.5';
const WEB_BUILD = 19;

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

// 整數金額省略「.00」(預算、每日可花這類概數用):RM 3,500 / RM 559
function formatRMRound(cents) {
  return formatRM(Math.round(cents / 100) * 100).replace(/[.,]00$/, '');
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

// 預算使用率 → 顏色:平時 accent、用超過 90% 警示、超支 negative
function budgetColor(ratio) {
  if (ratio > 1) return 'var(--negative)';
  if (ratio > 0.9) return 'var(--warning)';
  return 'var(--accent)';
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
// 分類可選色:沒有純綠、純紅(綠 / 紅保留給收入與負數);前 6 色 = 預設支出分類,已過 dataviz 驗證
const PALETTE = [
  '#CF6E1E', '#2F80D8', '#C23F7C', '#8A45C8', '#3A4C94', '#0D9488',
  '#B8862A', '#A35A3A', '#D0689A', '#5E7FB0', '#6B5BD6', '#1F7A8C',
  '#7E8B3A', '#9B7E68', '#8A8078', '#B3A99C',
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
const catColor = (cat, cats = catMap()) => rootCat(cat, cats)?.color ?? 'var(--cat-none)';

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

// 帳戶對應的銀行/錢包;舊資料沒有 inst,內建的 cash / tng 自動對上
function acctInst(a) {
  if (!a) return null;
  return INSTITUTION_MAP.get(a.inst) || INSTITUTION_MAP.get(a.id === 'tng' || a.id === 'cash' ? a.id : '') || null;
}

// 帳戶徽章:品牌色 + 簡稱(有授權 logo 圖時改用圖);自訂帳戶用它自己的顏色 + 首字
function acctBadge(a, size = 'md') {
  const el = document.createElement('span');
  el.className = `acct-badge acct-badge-${size}`;
  const inst = acctInst(a);
  if (inst?.logo) {
    const img = document.createElement('img');
    img.src = inst.logo;
    img.alt = '';
    el.appendChild(img);
    return el;
  }
  el.style.background = inst ? inst.bg : (a?.color || 'var(--cat-none)');
  el.style.color = inst ? inst.fg : 'var(--on-color)';
  const txt = inst ? inst.short : (acctName(a).trim()[0] || '?').toUpperCase();
  el.textContent = txt;
  if (txt.length >= 4) el.classList.add('long');
  return el;
}

// 帶正負號的金額(信用卡/貸款餘額是負的)
const parseSignedMoney = (str) => (/^\s*[-−]/.test(String(str)) ? -1 : 1) * parseMoney(str);
const signedToInput = (c) => (c < 0 ? '-' : '') + centsToInputStr(Math.abs(c));

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

// ---------- 共用帳目列(明細頁、分類明細頁) ----------
// 主行 = 備註(沒有備註就顯示子分類);副行 = 分類色點 + 子分類 · 帳戶;右側金額。一律單行,過長截斷。
function entryRow(entry, { cats = catMap(), showDate = false, hideCategory = null } = {}) {
  const cat = cats.get(entry.categoryId);
  const isIncome = entry.type === 'income';
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'entry-row';
  row.innerHTML = `
    ${showDate ? '<span class="er-date"></span>' : ''}
    <span class="er-main">
      <span class="er-title"></span>
      <span class="er-sub"><span class="cat-dot"></span><span class="er-sub-text"></span></span>
    </span>
    <span class="er-amount num"></span>`;
  if (showDate) row.querySelector('.er-date').textContent = shortDate(entry.date);
  const catText = cat ? catName(cat) : t('uncategorized');
  row.querySelector('.er-title').textContent = entry.note || catText;
  // 副行:在分類明細頁裡母分類不用重複,其他地方顯示子分類(或分類)名
  const bits = [];
  if (entry.note || (cat && cat.parentId)) {
    const label = entry.note ? catText : catName(rootCat(cat, cats));
    // 分類明細頁已經在看這個母分類,不重複顯示
    const redundant = hideCategory && (cat?.id === hideCategory || (!entry.note && rootCat(cat, cats)?.id === hideCategory));
    if (!redundant) bits.push(label);
  }
  if (accounts.length > 1) {
    const acct = acctMap().get(entry.accountId || accounts[0]?.id);
    if (acct) bits.push(acctName(acct));
  }
  if (isFixed(entry)) bits.push(t('fixedShort'));
  row.querySelector('.cat-dot').style.background = catColor(cat, cats);
  row.querySelector('.er-sub-text').textContent = bits.join(' · ');
  const amt = row.querySelector('.er-amount');
  amt.textContent = (isIncome ? '+' : '') + formatRM(entry.amountCents);
  amt.classList.toggle('income-text', isIncome);
  row.addEventListener('click', () => openSheet(entry));
  return row;
}

// ---------- 固定 / 日常支出 ----------
// fixed === true → 固定;fixed === false → 使用者明確取消;沒有這個欄位 → 由 Recurring 規則產生的就算固定
const isFixed = (e) => e.type !== 'income' && (e.fixed === true || (e.fixed !== false && !!e.recurringId));

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

    groupCardEl.appendChild(entryRow(entry, { cats }));
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
  // 「Net」= 本月收入 − 支出(不叫 Balance,避免和帳戶餘額混淆)
  const net = income - expense;

  reportExpenseEl.textContent = formatRM(expense);
  reportIncomeEl.textContent = formatRM(income);
  reportBalanceEl.textContent = (net < 0 ? '−' : '') + formatRM(Math.abs(net));
  reportBalanceEl.classList.toggle('negative-text', net < 0);

  // 主數字照舊含全部支出;有固定支出才顯示拆分
  const fixed = monthEntries.filter(isFixed).reduce((s, e) => s + e.amountCents, 0);
  const splitEl = $('#report-split');
  splitEl.hidden = fixed <= 0;
  if (fixed > 0) splitEl.textContent = t('splitLine', formatRM(expense - fixed), formatRM(fixed));

  renderDeltaTag(key, expense);
  renderBudgetLine(expense);
  renderDaily(key, monthEntries);
  renderReportLinks();

  // 各分類佔比
  const cats = catMap();
  const isIncome = reportType === 'income';
  // 「Exclude fixed」:只在看支出、且本月有固定支出時提供
  const hasFixed = !isIncome && monthEntries.some(isFixed);
  renderFixedToggle(hasFixed);
  const typed = monthEntries.filter((e) => (e.type === 'income') === isIncome
    && !(hasFixed && reportExcludeFixed && isFixed(e)));
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
        color: cat?.color ?? 'var(--cat-none)',
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

// ---------- 主卡片:較同期標籤 ----------
function renderDeltaTag(key, total) {
  const el = $('#report-delta');
  const isCurrent = reportMonth.y === now.getFullYear() && reportMonth.m === now.getMonth() + 1;
  const daysInMonth = new Date(reportMonth.y, reportMonth.m, 0).getDate();
  const elapsed = isCurrent ? now.getDate() : daysInMonth;
  let pm = reportMonth.m - 1, py = reportMonth.y;
  if (pm <= 0) { pm = 12; py -= 1; }
  const pKey = `${py}-${String(pm).padStart(2, '0')}`;
  // 當月比「上月同一天為止」,過去月份比整月
  const cutoff = isCurrent ? Math.min(elapsed, new Date(py, pm, 0).getDate()) : 31;
  const prev = entries
    .filter((e) => e.type !== 'income' && e.date.startsWith(pKey) && Number(e.date.slice(8, 10)) <= cutoff)
    .reduce((s, e) => s + e.amountCents, 0);
  if (!prev || !total) { el.hidden = true; return; }
  const pct = Math.round(((total - prev) / prev) * 100);
  const txt = (pct > 0 ? '+' : pct < 0 ? '−' : '') + Math.abs(pct) + '%';
  el.textContent = isCurrent ? t('deltaVsSamePeriod', txt) : t('deltaVsLastMonth', txt);
  // 花得比較少 = 正向變化(positive);花得比較多只是中性資訊,不用紅色
  el.classList.toggle('delta-good', pct < 0);
  el.hidden = false;
}

// ---------- 主卡片:預算進度 ----------
function renderBudgetLine(expense) {
  const el = $('#report-budget');
  el.innerHTML = '';
  const budget = meta.monthlyBudgetCents ?? 0;
  if (budget <= 0) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'set-budget-btn';
    b.textContent = `${t('setBudget')} ›`;
    b.addEventListener('click', () => { openCatModal(); showSettingsPage('budget', 'budgetRecurringTitle'); });
    el.appendChild(b);
    return;
  }
  const ratio = expense / budget;
  const remaining = budget - expense;
  const color = budgetColor(ratio);
  el.innerHTML = `
    <div class="budget-bar-track"><div class="budget-bar"></div></div>
    <div class="budget-of"></div>
    <div class="budget-left num"></div>`;
  const bar = el.querySelector('.budget-bar');
  bar.style.width = `${Math.min(100, ratio * 100).toFixed(1)}%`;
  bar.style.background = color;
  el.querySelector('.budget-of').textContent = t('ofBudget', formatRMRound(budget));
  const left = el.querySelector('.budget-left');
  if (remaining < 0) {
    left.textContent = t('budgetOverLine', formatRM(-remaining));
    left.classList.add('negative-text');
    return;
  }
  let line = t('budgetLeftLine', formatRM(remaining));
  // 剩餘天數 / 每日可花:只在看當月時顯示;剩餘天數含今天
  const isCurrent = reportMonth.y === now.getFullYear() && reportMonth.m === now.getMonth() + 1;
  if (isCurrent) {
    const daysLeft = new Date(reportMonth.y, reportMonth.m, 0).getDate() - now.getDate() + 1;
    line += ' · ' + t('budgetDaysLine', daysLeft, formatRMRound(Math.floor(remaining / daysLeft / 100) * 100));
  }
  left.textContent = line;
  if (ratio > 0.9) left.style.color = color;
}

// ---------- 分類區塊:排除固定支出 ----------
let reportExcludeFixed = false;
function renderFixedToggle(show) {
  const row = $('#report-fixed-toggle');
  row.hidden = !show;
  if (!show) return;
  row.innerHTML = `<label class="fixed-toggle"><span></span><input type="checkbox" class="qa-switch qa-switch-sm"></label>`;
  row.querySelector('span').textContent = t('excludeFixed');
  const cb = row.querySelector('input');
  cb.checked = reportExcludeFixed;
  cb.addEventListener('change', () => { reportExcludeFixed = cb.checked; renderReport(); });
}

// ---------- 入口列:淨資產 / 趨勢 ----------
function renderReportLinks() {
  // 淨資產 = 所有帳戶目前餘額,不受月份切換影響
  const total = accounts.reduce((s, a) => s + acctBalance(a), 0);
  const el = $('#networth-amt');
  el.textContent = (total < 0 ? '−' : '') + formatRM(Math.abs(total));
  el.classList.toggle('negative-text', total < 0);
}

// ---------- 每日長條圖 ----------
function renderDaily(key, monthEntries) {
  const card = $('#daily-card');
  card.innerHTML = '';
  // 只算日常(變動)支出:房租這類固定支出會把第 1 天壓成一根柱子
  const typed = monthEntries.filter((e) => e.type !== 'income' && !isFixed(e));
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
  title.textContent = t('dailyTitleExFixed');
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

// 某段期間每個月的支出/收入。range:6、12 或 'all'(從第一筆帳目那個月開始,最多 36 個月)
function trendMonths(range) {
  const cur = { y: now.getFullYear(), m: now.getMonth() + 1 };
  const idx = (o) => o.y * 12 + (o.m - 1);
  let n = range;
  if (range === 'all') {
    const first = entries.reduce((min, e) => (e.date < min ? e.date : min), todayStr());
    const f = { y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) };
    n = Math.min(36, Math.max(2, idx(cur) - idx(f) + 1));
  }
  // 報表月份若落在視窗外(翻到很久以前),視窗改以它為結尾
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
  return months;
}

const monthShort = (mo) => new Intl.DateTimeFormat('en-MY', { month: 'short' }).format(new Date(mo.y, mo.m - 1, 1));
const monthLong = (mo) => new Intl.DateTimeFormat('en-MY', { month: 'short', year: 'numeric' }).format(new Date(mo.y, mo.m - 1, 1));

// 支出(金)對收入(綠)兩條線,同一個 y 軸。compact = 報表頁上的迷你預覽(無軸、無點擊)。
function drawTrendChart(host, months, { height = 150, selIdx = -1, onSelect = null, compact = false } = {}) {
  const n = months.length;
  const W = Math.max(240, (host.clientWidth || 340));
  const H = height;
  const pad = compact ? { l: 4, r: 4, t: 6, b: 6 } : { l: 34, r: 46, t: 12, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxV = niceMax(Math.max(...months.map((mo) => Math.max(mo.spent, mo.income)), 0));
  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (v / maxV) * ih;

  const svg = svgEl('svg', { class: 'trend-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img' });
  svg.setAttribute('aria-label', months.map((mo) =>
    `${monthLong(mo)}: ${t('trendSpent')} ${formatRM(mo.spent)}, ${t('trendIncomeLbl')} ${formatRM(mo.income)}`).join('; '));

  if (!compact) {
    // 格線:0 / 一半 / 頂端
    for (const f of [0, 0.5, 1]) {
      const gy = y(maxV * f);
      svg.appendChild(svgEl('line', { x1: pad.l, x2: W - pad.r, y1: gy, y2: gy, class: f === 0 ? 'tr-axis' : 'tr-grid' }));
      const lbl = svgEl('text', { x: pad.l - 6, y: gy + 3.5, class: 'tr-ylbl', 'text-anchor': 'end' });
      lbl.textContent = compactRM(maxV * f);
      svg.appendChild(lbl);
    }
    if (selIdx >= 0) {
      svg.appendChild(svgEl('line', { x1: x(selIdx), x2: x(selIdx), y1: pad.t, y2: pad.t + ih, class: 'tr-cursor' }));
    }
  }

  const path = (key) => months.map((mo, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(mo[key]).toFixed(1)}`).join('');
  svg.appendChild(svgEl('path', { d: `${path('spent')}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`, class: 'tr-area' }));
  svg.appendChild(svgEl('path', { d: path('income'), class: 'tr-line tr-income' }));
  svg.appendChild(svgEl('path', { d: path('spent'), class: 'tr-line tr-spent' }));
  if (compact) return svg;

  // 線尾直接標名稱:辨識不只靠顏色
  const last = months[n - 1];
  const ends = [
    { key: 'spent', label: t('trendSpent'), yy: y(last.spent) },
    { key: 'income', label: t('trendIncomeLbl'), yy: y(last.income) },
  ].sort((a, b) => a.yy - b.yy);
  if (ends[1].yy - ends[0].yy < 12) { ends[0].yy -= 6; ends[1].yy += 6; }   // 太近就上下錯開
  for (const e of ends) {
    const lbl = svgEl('text', { x: x(n - 1) + 8, y: e.yy + 3.5, class: `tr-endlbl tr-${e.key}-ink` });
    lbl.textContent = e.label;
    svg.appendChild(lbl);
  }

  // 月份標籤:月數多時只標一部分,選中的月份一定標
  const step = n <= 6 ? 1 : n <= 12 ? 2 : Math.ceil(n / 6);
  months.forEach((mo, i) => {
    const on = i === selIdx;
    svg.appendChild(svgEl('circle', { cx: x(i), cy: y(mo.income), r: on ? 4.5 : 3, class: 'tr-dot tr-income' }));
    svg.appendChild(svgEl('circle', { cx: x(i), cy: y(mo.spent), r: on ? 4.5 : 3, class: 'tr-dot tr-spent' }));
    if ((n - 1 - i) % step === 0 || on) {
      const lbl = svgEl('text', { x: x(i), y: H - 6, class: 'tr-xlbl' + (on ? ' on' : ''), 'text-anchor': 'middle' });
      lbl.textContent = monthShort(mo);
      svg.appendChild(lbl);
    }
    if (onSelect) {
      // 整欄透明點擊區:手指不用對準小圓點
      const colW = n === 1 ? iw : iw / (n - 1);
      const hit = svgEl('rect', { x: x(i) - colW / 2, y: 0, width: colW, height: H, class: 'tr-hit' });
      hit.addEventListener('click', () => onSelect(i));
      hit.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') onSelect(i, true); });
      svg.appendChild(hit);
    }
  });
  return svg;
}

// 圖例 + 選中月份的數字(直接標數值,不必靠顏色猜)
function trendLegend(mo) {
  const legend = document.createElement('div');
  legend.className = 'trend-legend';
  legend.innerHTML = `
    <span class="lg lg-spent"><i></i><span class="lg-name"></span> <b class="num"></b></span>
    <span class="lg lg-income"><i></i><span class="lg-name"></span> <b class="num"></b></span>
    <span class="lg-month"></span>`;
  legend.querySelector('.lg-spent .lg-name').textContent = t('trendSpent');
  legend.querySelector('.lg-spent b').textContent = formatRM(mo.spent);
  legend.querySelector('.lg-income .lg-name').textContent = t('trendIncomeLbl');
  legend.querySelector('.lg-income b').textContent = formatRM(mo.income);
  legend.querySelector('.lg-month').textContent = monthLong(mo);
  return legend;
}

// ---------- Trends 頁 ----------
let trendRange = 6;       // 6 / 12 / 'all'
let trendSel = -1;        // 選中的月份索引(-1 = 最後一個月)

function openTrends() {
  trendSel = -1;
  $('#trends-modal').classList.add('open');
  renderTrendsPage();
}
function closeTrends() {
  $('#trends-modal').classList.remove('open');
}

function renderTrendsPage() {
  const body = $('#trends-body');
  const months = trendMonths(trendRange);
  const n = months.length;
  const sel = trendSel >= 0 && trendSel < n ? trendSel : n - 1;
  body.innerHTML = '';

  // 期間切換
  const seg = document.createElement('div');
  seg.className = 'seg trends-seg';
  for (const r of [6, 12, 'all']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (r === trendRange ? ' active' : '');
    b.textContent = t('trendRange', r);
    b.addEventListener('click', () => { trendRange = r; trendSel = -1; renderTrendsPage(); });
    seg.appendChild(b);
  }
  body.appendChild(seg);

  const active = months.filter((mo) => mo.spent || mo.income);
  if (!active.length) {
    const empty = document.createElement('div');
    empty.className = 'breakdown-empty';
    empty.textContent = t('trendsEmpty');
    body.appendChild(empty);
    return;
  }

  // 大圖
  const card = document.createElement('section');
  card.className = 'card trend-card trends-chart-card';
  card.appendChild(trendLegend(months[sel]));
  const box = document.createElement('div');
  card.appendChild(box);
  body.appendChild(card);
  box.appendChild(drawTrendChart(box, months, {
    height: 230,
    selIdx: sel,
    onSelect: (i) => { if (i !== trendSel) { trendSel = i; renderTrendsPage(); } },
  }));

  // 摘要:只算有帳目的月份,不讓還沒開始用 App 的月份拉低平均
  // 進行中的當月不算:月初的半個月會把平均、最低支出、儲蓄率全部拉歪
  const isOngoing = (mo) => mo.y === now.getFullYear() && mo.m === now.getMonth() + 1;
  const complete = active.filter((mo) => !isOngoing(mo));
  const nFull = complete.length;
  const avg = (key) => (nFull ? Math.round(complete.reduce((s, mo) => s + mo[key], 0) / nFull) : null);
  const avgSpent = avg('spent');
  const avgIncome = avg('income');
  const avgSaved = nFull ? avgIncome - avgSpent : null;
  const totIncome = complete.reduce((s, mo) => s + mo.income, 0);
  const totSpent = complete.reduce((s, mo) => s + mo.spent, 0);
  const rate = totIncome > 0 ? Math.round(((totIncome - totSpent) / totIncome) * 100) : null;
  const tiles = document.createElement('div');
  tiles.className = 'trends-tiles';
  const tile = (label, value, cls = '') => {
    const d = document.createElement('div');
    d.className = 'trends-tile';
    d.innerHTML = `<span class="tt-label"></span><span class="tt-value num ${cls}"></span>`;
    d.querySelector('.tt-label').textContent = label;
    d.querySelector('.tt-value').textContent = value;
    tiles.appendChild(d);
  };
  tile(t('trendsAvgSpent'), nFull ? formatRM(avgSpent) : '—');
  tile(t('trendsAvgIncome'), nFull ? formatRM(avgIncome) : '—', nFull ? 'income-text' : '');
  tile(t('trendsAvgSaved'), nFull ? (avgSaved < 0 ? '−' : '') + formatRM(Math.abs(avgSaved)) : '—', !nFull ? '' : avgSaved < 0 ? 'negative-text' : 'income-text');
  tile(t('trendsSavingsRate'), rate === null ? '—' : `${rate}%`, rate !== null && rate < 0 ? 'negative-text' : '');
  body.appendChild(tiles);
  if (!nFull) {
    const note = document.createElement('p');
    note.className = 'backup-hint trends-note';
    note.textContent = t('trendsNeedFullMonth');
    body.appendChild(note);
  }

  // 最高 / 最低支出月份
  // 少於 2 個完整月份就不顯示最高 / 最低
  const spentMonths = complete.filter((mo) => mo.spent > 0);
  if (spentMonths.length >= 2) {
    const hi = spentMonths.reduce((a, b) => (b.spent > a.spent ? b : a));
    const lo = spentMonths.reduce((a, b) => (b.spent < a.spent ? b : a));
    const hl = document.createElement('div');
    hl.className = 'cat-list trends-highlights';
    for (const [label, mo] of [[t('trendsHighest'), hi], [t('trendsLowest'), lo]]) {
      const row = document.createElement('div');
      row.className = 'cat-row';
      row.innerHTML = `<span class="cat-row-name"></span><span class="cat-row-count"></span><span class="num tt-amt"></span>`;
      row.querySelector('.cat-row-name').textContent = label;
      row.querySelector('.cat-row-count').textContent = monthLong(mo);
      row.querySelector('.tt-amt').textContent = formatRM(mo.spent);
      hl.appendChild(row);
    }
    body.appendChild(hl);
  }

  // 逐月表格(也是圖表的文字版);點一列 → 回報表看那個月
  const label = document.createElement('div');
  label.className = 'section-label';
  label.textContent = t('trendsByMonth');
  body.appendChild(label);
  const table = document.createElement('div');
  table.className = 'cat-list trends-table';
  const headRow = document.createElement('div');
  headRow.className = 'tt-row tt-headrow';
  for (const h of [t('trendsColMonth'), t('trendSpent'), t('trendIncomeLbl'), t('trendsColNet')]) {
    const c = document.createElement('span');
    c.textContent = h;
    headRow.appendChild(c);
  }
  table.appendChild(headRow);
  [...months].reverse().forEach((mo) => {
    const net = mo.income - mo.spent;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'tt-row' + (mo === months[sel] ? ' on' : '');
    row.innerHTML = `<span></span><span class="num"></span><span class="num income-text"></span><span class="num"></span>`;
    const [c0, c1, c2, c3] = row.children;
    c0.textContent = monthLong(mo);
    if (isOngoing(mo)) {
      const tag = document.createElement('span');
      tag.className = 'tt-progress';
      tag.textContent = t('inProgress');
      c0.appendChild(tag);
    }
    c1.textContent = formatNum(mo.spent);
    c2.textContent = formatNum(mo.income);
    c3.textContent = (net < 0 ? '−' : '') + formatNum(Math.abs(net));
    c3.classList.toggle('negative-text', net < 0);
    row.addEventListener('click', () => {
      reportMonth = { y: mo.y, m: mo.m };
      closeTrends();
      switchView('report');
    });
    table.appendChild(row);
  });
  body.appendChild(table);
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

  // 本分類本月最大一筆(從報表首頁的數據卡移過來)
  if (!isIncome && rows.length) {
    const top = rows.reduce((x, y) => (y.amountCents > x.amountCents ? y : x));
    const big = document.createElement('div');
    big.className = 'detail-biggest';
    big.innerHTML = `<span class="db-label"></span><span class="db-note"></span><span class="db-amt num"></span>`;
    big.querySelector('.db-label').textContent = t('biggestExpense');
    big.querySelector('.db-note').textContent = `${top.note || catLabel(cats.get(top.categoryId), cats)} · ${shortDate(top.date)}`;
    big.querySelector('.db-amt').textContent = formatRM(top.amountCents);
    detailSummaryEl.appendChild(big);
  }

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
        bar.style.background = cat?.color ?? 'var(--cat-none)';
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
    detailListEl.appendChild(entryRow(entry, { cats, showDate: true, hideCategory: detailCatId }));
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
  $('#hdr-title').hidden = view !== 'list';
  $('#hdr-month').hidden = view !== 'report';
  tabListBtn.classList.toggle('active', view === 'list');
  tabReportBtn.classList.toggle('active', view === 'report');
  if (view === 'report') renderReport();
}

// ---------- 分類圖示 ----------
// 內建分類各有一個線條 icon;自訂分類顯示名稱首字
const CAT_ICONS = {
  food: '<path d="M5 11h14a7 7 0 0 1-14 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>',
  transport: '<path d="M5 16V11l2-5h10l2 5v5Z"/><path d="M5 11h14"/><circle cx="8" cy="16.5" r="1.6"/><circle cx="16" cy="16.5" r="1.6"/>',
  shopping: '<path d="M6 8h12l-1 12H7Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  fun: '<path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V6H4Z" transform="translate(0 1)"/><path d="M12 7v10" stroke-dasharray="2 2"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  medical: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
  other: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  salary: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2"/><path d="M3 12h18"/>',
  bonus: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1Z"/>',
  investment: '<path d="M4 18 10 12l4 4 6-7"/><path d="M15 9h5v5"/>',
  'other-income': '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
};
// Pro 3D 圖示包(icons/cat3d/*.webp,128px)。分類存 icon: '3d:<id>'
const ICON_PACK = [
  ['iconGroupFood', ['nasi-lemak', 'teh-tarik', 'roti-canai', 'durian', 'satay', 'char-kuey-teow', 'bubble-tea', 'kopi', 'bread', 'groceries', 'fruit', 'ais-kacang', 'burger', 'chicken-rice', 'fried-chicken', 'delivery-bag']],
  ['iconGroupTransport', ['car', 'motorcycle', 'petrol', 'toll', 'lrt', 'bus', 'ehailing', 'parking', 'flight', 'house', 'keys', 'electricity', 'water', 'wifi', 'phone-bill', 'tv']],
  ['iconGroupLife', ['shopping-bag', 'clothes', 'shoes', 'cosmetics', 'haircut', 'medicine', 'clinic', 'insurance', 'gym', 'popcorn', 'games', 'headphones', 'books', 'school', 'baby', 'pets']],
  ['iconGroupMoney', ['salary', 'bonus', 'investment', 'gold', 'savings', 'bank', 'credit-card', 'donation', 'angpao', 'ketupat', 'lantern', 'diya', 'christmas', 'wedding', 'travel', 'birthday']],
];
const ICON_IDS = new Set(ICON_PACK.flatMap(([, ids]) => ids));
const iconSrc = (id) => `icons/cat3d/${id}.webp`;
// 只有 Pro 顯示自訂 3D 圖示;訂閱到期就回到預設線條 icon(設定保留,續訂即恢復)
const activeIcon = (cat) => {
  const v = cat?.icon;
  if (!isPro || typeof v !== 'string' || !v.startsWith('3d:')) return null;
  const id = v.slice(3);
  return ICON_IDS.has(id) ? id : null;
};

function catIconEl(cat) {
  const el = document.createElement('span');
  el.className = 'cat-icon';
  const root = rootCat(cat);
  const color = root?.color || 'var(--cat-none)';
  el.style.setProperty('--cat', color);
  const custom = activeIcon(root);
  if (custom) {
    el.classList.add('cat-icon-img');
    const img = document.createElement('img');
    img.src = iconSrc(custom);
    img.alt = '';
    img.decoding = 'async';
    el.appendChild(img);
    return el;
  }
  const path = root && CAT_ICONS[root.id];
  if (path) {
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  } else {
    el.textContent = (root ? catName(root) : '?').trim().charAt(0).toUpperCase();
  }
  return el;
}

// ---------- 通用挑選清單(帳戶、更多分類)----------
function openPick(title, items, onPick) {
  $('#pick-title').textContent = title;
  const list = $('#pick-list');
  list.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick-row' + (it.selected ? ' selected' : '');
    b.innerHTML = `<span class="pick-name"></span><span class="pick-value num"></span><span class="pick-check">${it.selected ? '✓' : ''}</span>`;
    if (it.lead) b.prepend(it.lead);
    b.querySelector('.pick-name').textContent = it.name;
    b.querySelector('.pick-value').textContent = it.value || '';
    b.addEventListener('click', () => { closePick(); onPick(it.id); });
    list.appendChild(b);
  }
  $('#pick-sheet').classList.add('open');
  $('#pick-backdrop').classList.add('open');
}
function closePick() {
  $('#pick-sheet').classList.remove('open');
  $('#pick-backdrop').classList.remove('open');
}

// ---------- 記帳面板 ----------
// 分類格:每列 4 個、最多 2 列;超過 8 個時最後一格是「More」
function renderCategoryChips() {
  const cats = catMap();
  const selected = cats.get(selectedCatId);
  const selectedRoot = rootCat(selected, cats);
  categoryRowEl.innerHTML = '';
  const all = catsOfType(sheetType);
  let shown = all;
  const needMore = all.length > 8;
  if (needMore) {
    shown = all.slice(0, 7);
    // 選中的若不在前 7 個,放到第 7 格,保證看得到目前選擇
    if (selectedRoot && !shown.includes(selectedRoot) && all.includes(selectedRoot)) shown[6] = selectedRoot;
  }
  for (const cat of shown) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'cat-tile' + (selectedRoot && cat.id === selectedRoot.id ? ' selected' : '');
    tile.appendChild(catIconEl(cat));
    const nm = document.createElement('span');
    nm.className = 'cat-tile-name';
    nm.textContent = catName(cat);
    tile.appendChild(nm);
    tile.addEventListener('click', () => {
      selectedCatId = cat.id;
      renderCategoryChips();
      updateSaveState();
    });
    categoryRowEl.appendChild(tile);
  }
  if (needMore) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'cat-tile cat-tile-more';
    more.innerHTML = `<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg></span><span class="cat-tile-name"></span>`;
    more.querySelector('.cat-tile-name').textContent = t('moreCats');
    more.addEventListener('click', () => openPick(t('allCategories'), all.map((c) => ({
      id: c.id, name: catName(c), lead: catIconEl(c), selected: selectedRoot && c.id === selectedRoot.id,
    })), (id) => { selectedCatId = id; renderCategoryChips(); updateSaveState(); }));
    categoryRowEl.appendChild(more);
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

// 帳戶:「Paid from [logo] Touch 'n Go ▾」單行;點了開帳戶清單
function renderAccountChips() {
  const a = accounts.find((x) => x.id === selectedAcctId) || accounts[0];
  $('#account-picker-label').textContent = sheetType === 'income' ? t('receivedTo') : t('paidFrom');
  const badge = $('#account-picker-badge');
  badge.innerHTML = '';
  if (a) badge.appendChild(acctBadge(a, 'xs'));
  $('#account-picker-name').textContent = a ? acctName(a) : '';
}
function openAccountPick() {
  openPick(t('chooseAccount'), accounts.map((a) => {
    const bal = acctBalance(a);
    return { id: a.id, name: acctName(a), lead: acctBadge(a, 'sm'), value: (bal < 0 ? '−' : '') + formatRM(Math.abs(bal)), selected: a.id === selectedAcctId };
  }), (id) => { selectedAcctId = id; renderAccountChips(); });
}

// 日期:預設 Today;快捷 chip 在 Today / Yesterday 之間切換;點日期 chip 開系統選擇器
function renderDateChips() {
  const v = dateInput.value || todayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  $('#date-chip-label').textContent = v === todayStr() ? t('today') : v === yStr ? t('yesterday') : shortDate(v);
  const quick = $('#date-quick');
  const toYesterday = v === todayStr();
  quick.textContent = toYesterday ? t('yesterday') : t('today');
  quick.dataset.to = toYesterday ? yStr : todayStr();
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
  $('#fixed-chip').hidden = type === 'income';
  renderAccountChips();   // Paid from ↔ Received to
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
  setFixedOn(entry ? isFixed(entry) : false);

  setSheetType(entry?.type ?? 'expense');
  renderDateChips();
  renderAmount();
  sheetEl.classList.add('open');
  sheetBackdropEl.classList.add('open');
}

let fixedOn = false;
function setFixedOn(on) {
  fixedOn = !!on;
  const chip = $('#fixed-chip');
  chip.classList.toggle('selected', fixedOn);
  chip.setAttribute('aria-pressed', String(fixedOn));
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
  // 支出才有固定 / 日常之分;明確存 true / false,編輯時才蓋得掉 Recurring 的預設
  if (sheetType !== 'income') record.fixed = fixedOn;
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
    const dot = row.querySelector('.cat-dot');
    // Pro 自訂 3D 圖示取代色點(只限頂層分類)
    if (!cat.parentId && activeIcon(cat)) dot.replaceWith(catIconEl(cat));
    else dot.style.background = cat.color;
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
      <span class="cat-row-name"></span>
      <span class="cat-row-count num"></span>
      <span class="cat-row-chevron">›</span>`;
    row.prepend(acctBadge(a, 'sm'));
    row.querySelector('.cat-row-name').textContent = acctName(a);
    const bal = acctBalance(a);
    const balEl = row.querySelector('.cat-row-count');
    balEl.textContent = formatRM(bal);
    if (bal < 0) balEl.style.color = 'var(--negative)';
    row.addEventListener('click', () => openAcctEditor(a));
    listEl2.appendChild(row);
  }
  const addRow = document.createElement('button');
  addRow.type = 'button';
  addRow.className = 'cat-row cat-row-add';
  addRow.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  addRow.querySelector('.cat-row-name').textContent = t('addAccount');
  addRow.addEventListener('click', openInstPicker);
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

let editingInst = null;   // 新增時從挑選器帶進來的銀行/錢包 id

function openAcctEditor(acct, instId = null) {
  editingAcctId = acct?.id ?? null;
  const inst = acct ? acctInst(acct) : INSTITUTION_MAP.get(instId) || null;
  editingInst = inst?.id ?? null;
  $('#acct-editor-title').textContent = acct ? t('editAccount') : t('newAccount');
  $('#acct-name-input').value = acct ? acctName(acct) : (inst ? inst.name : '');
  // 顯示「目前餘額」,存檔時反推期初:期初 = 目前餘額 − 期間收支
  $('#acct-opening-input').value = acct ? signedToInput(acctBalance(acct)) : '';
  acctEditorColor = acct?.color ?? inst?.bg ?? PALETTE[Math.floor(Math.random() * PALETTE.length)];
  // 選了銀行/錢包就用品牌色,不必再挑顏色
  const head = $('#acct-editor-inst');
  head.innerHTML = '';
  if (inst) {
    head.appendChild(acctBadge({ inst: inst.id }, 'lg'));
    const nm = document.createElement('span');
    nm.textContent = inst.name;
    head.appendChild(nm);
  }
  head.hidden = !inst;
  $('#acct-color-grid').hidden = !!inst;
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
  const name = $('#acct-name-input').value.trim().slice(0, 24);
  if (!name) { $('#acct-name-input').focus(); return; }
  const target = parseSignedMoney($('#acct-opening-input').value.trim());
  const inst = INSTITUTION_MAP.get(editingInst);
  if (editingAcctId) {
    const a = accounts.find((x) => x.id === editingAcctId);
    if (a) {
      if (name !== acctName(a)) { a.name = name; a.renamed = true; }
      if (!inst) a.color = acctEditorColor;
      const flows = acctBalance(a) - (a.openingCents || 0);
      a.openingCents = target - flows;
    }
  } else {
    const a = { id: crypto.randomUUID(), name, color: inst ? inst.bg : acctEditorColor, openingCents: target };
    if (inst) a.inst = inst.id;
    accounts.push(a);
  }
  await saveAccounts(accounts);
  schedulePush();
  closeAcctEditor();
  renderAcctList();
  renderAccountChips();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

// ---------- 新增帳戶:挑銀行 / 電子錢包 ----------
function openInstPicker() {
  $('#inst-search').value = '';
  renderInstPicker();
  $('#inst-picker').classList.add('open');
  $('#inst-picker-backdrop').classList.add('open');
}

function closeInstPicker() {
  $('#inst-picker').classList.remove('open');
  $('#inst-picker-backdrop').classList.remove('open');
}

function renderInstPicker() {
  const q = $('#inst-search').value.trim().toLowerCase();
  const body = $('#inst-list');
  body.innerHTML = '';
  const match = (x) => !q || x.name.toLowerCase().includes(q) || x.short.toLowerCase().includes(q) || x.id.includes(q);
  const groups = [['ewallet', t('instEwallets')], ['bank', t('instBanks')], ['other', t('instOther')]];
  for (const [kind, title] of groups) {
    const items = INSTITUTIONS.filter((x) => x.kind === kind && match(x));
    if (!items.length) continue;
    const h = document.createElement('div');
    h.className = 'section-label';
    h.textContent = title;
    body.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'inst-grid';
    for (const x of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst-tile';
      b.appendChild(acctBadge({ inst: x.id }, 'lg'));
      const nm = document.createElement('span');
      nm.className = 'inst-name';
      nm.textContent = x.name;
      b.appendChild(nm);
      b.addEventListener('click', () => { closeInstPicker(); openAcctEditor(null, x.id); });
      grid.appendChild(b);
    }
    body.appendChild(grid);
  }
  // 清單裡沒有的:自訂名稱與顏色
  const custom = document.createElement('button');
  custom.type = 'button';
  custom.className = 'cat-row cat-row-add inst-custom';
  custom.innerHTML = `<span class="add-mark">＋</span><span class="cat-row-name"></span>`;
  custom.querySelector('.cat-row-name').textContent = t('instCustom');
  custom.addEventListener('click', () => { closeInstPicker(); openAcctEditor(null); });
  body.appendChild(custom);
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
  const set = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  const cur = CURRENCIES.find((c) => c.code === currency);
  set('#currency-current', cur ? currency : '');
  set('#pro-hub-status', isPro ? t('statusActive') : t('statusUpgrade'));
  set('#cat-hub-status', String(catsOfType('expense').length + catsOfType('income').length));
  set('#acct-hub-status', String(accounts.length));
  const budget = meta.monthlyBudgetCents ?? 0;
  set('#budget-hub-status', budget > 0 ? formatRMRound(budget) : t('statusOff'));
  set('#quickadd-hub-status', isIOSNative() ? (lsGet(BACKTAP_DONE_KEY) === '1' ? t('syncOn') : t('statusSetUp')) : '');
  set('#receipt-hub-status', isPro ? t('statusUnlimited') : t('statusFreeScans'));
  set('#cloud-hub-status', syncCode ? t('syncOn') : t('statusOff'));
  set('#lock-hub-status', pinIsSet() ? t('syncOn') : t('statusOff'));
  const ts = Number(localStorage.getItem('lastBackupAt'));
  const d = ts ? daysSince(ts) : null;
  set('#backup-hub-status', !ts ? t('statusNever') : d <= 0 ? t('statusToday') : t('statusDaysAgo', d));
  // 收據辨識頁:目前方案說明
  set('#receipt-quota-line', isPro ? t('receiptQuotaPro') : t('receiptQuotaFree'));
  set('#receipt-pro-status', isPro ? t('statusActive') : t('statusUpgrade'));
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
  // 圖示只給頂層分類(子分類跟母分類)
  editorIcon = cat?.icon ?? null;
  $('#cat-icon-field').hidden = isSub;
  renderIconField();
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

let editorIcon = null;   // '3d:<id>' 或 null(預設線條 icon)

function renderIconField() {
  const prev = $('#cat-icon-preview');
  prev.innerHTML = '';
  const id = typeof editorIcon === 'string' && editorIcon.startsWith('3d:') ? editorIcon.slice(3) : null;
  if (id && ICON_IDS.has(id)) {
    const img = document.createElement('img');
    img.src = iconSrc(id); img.alt = '';
    prev.appendChild(img);
    $('#cat-icon-value').textContent = '';
  } else {
    $('#cat-icon-value').textContent = t('iconDefault');
  }
}

function openIconSheet() {
  const wrap = $('#icon-grid');
  wrap.innerHTML = '';
  const note = $('#icon-pro-note');
  note.hidden = isPro;
  note.textContent = t('iconProNote');
  const pick = (value) => { editorIcon = value; renderIconField(); closeIconSheet(); };
  // 第一格:預設(免費線條 icon)
  const def = document.createElement('button');
  def.type = 'button';
  def.className = 'icon-cell icon-cell-default' + (!editorIcon ? ' selected' : '');
  def.textContent = t('iconDefault');
  def.addEventListener('click', () => pick(null));
  wrap.appendChild(def);
  for (const [groupKey, ids] of ICON_PACK) {
    const h = document.createElement('div');
    h.className = 'section-label icon-group-label';
    h.textContent = t(groupKey);
    wrap.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    for (const id of ids) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-cell' + (editorIcon === `3d:${id}` ? ' selected' : '') + (isPro ? '' : ' locked');
      b.setAttribute('aria-label', id.replace(/-/g, ' '));
      b.innerHTML = `<img src="${iconSrc(id)}" alt="" loading="lazy" decoding="async">${isPro ? '' : '<span class="icon-lock">👑</span>'}`;
      b.addEventListener('click', () => {
        if (!isPro) {
          // 非 Pro:帶去 Pro 頁
          closeIconSheet();
          closeCatEditor();
          showSettingsPage('pro', 'proTitle');
          return;
        }
        pick(`3d:${id}`);
      });
      grid.appendChild(b);
    }
    wrap.appendChild(grid);
  }
  $('#icon-sheet').classList.add('open');
  $('#icon-backdrop').classList.add('open');
}
function closeIconSheet() {
  $('#icon-sheet').classList.remove('open');
  $('#icon-backdrop').classList.remove('open');
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
        if (editorIcon) cat.icon = editorIcon; else delete cat.icon;
        cat.color = editorColor;
        // 子分類存的顏色一起更新(顯示時本來就跟母分類走,這裡讓匯出/舊版也一致)
        for (const s of subCatsOf(cat.id)) s.color = editorColor;
        if (cat.type === 'expense') cat.budgetCents = budgetCents;
      }
    }
  } else {
    const cat = { id: crypto.randomUUID(), name, color: editorColor, type: catManageType };
    if (editorIcon) cat.icon = editorIcon;
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
function renderAppVersion() {
  const paint = (version, build) => {
    for (const el of [$('#app-version'), $('#about-hub-status')]) {
      if (!el) continue;
      el.innerHTML = '';
      el.append(`v${version}`);
      const small = document.createElement('small');
      small.className = 'build-no';
      small.textContent = ` (${build})`;
      if (el.id === 'app-version') el.appendChild(small);
    }
  };
  paint(APP_MARKETING_VERSION, `web ${WEB_BUILD}`);
  const AppPlugin = IS_NATIVE ? window.Capacitor?.Plugins?.App : null;
  AppPlugin?.getInfo?.().then((info) => { if (info?.version) paint(info.version, `build ${info.build}`); }).catch(() => {});
}

function updateBackupStatus() {
  // 開了雲端同步就不能說「資料只在這台裝置上」
  const hint = $('#backup-hint');
  if (hint) hint.textContent = syncCode ? t('backupHintSynced') : t('backupHintLocal');
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
    // 以下皆 optional:舊備份沒有這些欄位也照常匯入
    ...(typeof e.accountId === 'string' && e.accountId ? { accountId: e.accountId } : {}),
    ...(typeof e.recurringId === 'string' && e.recurringId ? { recurringId: e.recurringId } : {}),
    ...(typeof e.fixed === 'boolean' ? { fixed: e.fixed } : {}),
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
  // Pro 自訂圖示(optional);未知的 id 直接略過
  if (typeof c.icon === 'string' && c.icon.startsWith('3d:') && ICON_IDS.has(c.icon.slice(3))) out.icon = c.icon;
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
    name: a.name.trim().slice(0, 24),
    color: /^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : '#8C95A3',
    openingCents: 0,
  };
  // 信用卡 / 貸款的餘額可以是負的
  const op = Math.round(Number(a.openingCents));
  if (Number.isFinite(op)) out.openingCents = op;
  if (typeof a.inst === 'string' && INSTITUTION_MAP.has(a.inst)) out.inst = a.inst;
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
    if (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) { dateInput.value = r.date; renderDateChips(); }
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
let proPriceStr = null; // 原生 paywall 顯示的在地化價格（如 RM19.90）

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
const planUnit = () => t('unitSixMonths');

let lastIconPro = false;
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
      hint.textContent = t(isAndroid ? 'proPitchIAPAndroid' : 'proPitchIAP', planUnit());
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
  // Pro 狀態改變 → 3D 分類圖示顯示 / 隱藏
  if (isPro !== lastIconPro) {
    lastIconPro = isPro;
    renderList();
    renderReport();
    renderCatList();
  }
  syncAds();
  updateSettingsHubStatuses();
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
  let info = null;
  try {
    const m = await iapReady();
    info = (await m.getPlans()).sixmonth;
  } catch {}
  if (!info || !info.priceString) { picker.hidden = true; return; }
  // 「RM19.90 / 6 months」——價格 + 週期一起顯示(3.1.2)
  $('#plan-sixmonth-price').textContent = `${info.priceString} / ${planUnit()}`;
  // 換算月費當輔助說明;幣別用 StoreKit 回的,不自己寫死 RM
  let perMonth = '';
  if (typeof info.price === 'number' && info.currencyCode) {
    try {
      perMonth = new Intl.NumberFormat('en-MY', { style: 'currency', currency: info.currencyCode }).format(info.price / 6);
    } catch {}
  }
  $('#plan-sixmonth-sub').textContent = perMonth ? t('planPerMonth', perMonth) : '';
  picker.hidden = false;
}

const selectedPlan = 'sixmonth';

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
  btn.disabled = true;
  btn.classList.add('busy');
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
    btn.classList.remove('busy');
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
  lsSet(BACKTAP_DISMISSED_KEY, '1');   // 永久關閉,不再出現
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
$('#inst-search').addEventListener('input', renderInstPicker);
// iOS 數字鍵盤沒有負號:用 ± 切換(信用卡 / 貸款)
$('#acct-sign-btn').addEventListener('click', () => {
  const el = $('#acct-opening-input');
  const v = el.value.trim();
  el.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, '') : '-' + (v || '');
  el.focus();
});
$('#inst-picker-cancel').addEventListener('click', closeInstPicker);
$('#inst-picker-backdrop').addEventListener('click', closeInstPicker);

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
$('#trends-back-btn').addEventListener('click', closeTrends);
$('#fixed-chip').addEventListener('click', () => setFixedOn(!fixedOn));
$('#account-picker').addEventListener('click', openAccountPick);
$('#cat-icon-field').addEventListener('click', openIconSheet);
$('#icon-cancel').addEventListener('click', closeIconSheet);
$('#icon-backdrop').addEventListener('click', closeIconSheet);
$('#pick-cancel').addEventListener('click', closePick);
$('#pick-backdrop').addEventListener('click', closePick);
dateInput.addEventListener('change', renderDateChips);
$('#date-quick').addEventListener('click', (e) => { dateInput.value = e.currentTarget.dataset.to; renderDateChips(); });
$('#receipt-to-pro').addEventListener('click', () => showSettingsPage('pro', 'proTitle'));
$('#trends-row').addEventListener('click', () => { trendRange = 6; openTrends(); });
$('#networth-row').addEventListener('click', () => { openCatModal(); showSettingsPage('accounts', 'accountsSection'); });

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
const BACKTAP_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/021e402d801642c8b9e0896888665f75';
const BACKTAP_DONE_KEY = 'ra-backtap-done';
const BACKTAP_DISMISSED_KEY = 'ra-backtap-dismissed';
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
  // 設定完成或按過 ✕ 就永久隱藏(舊版的「稍後」暫緩也算已關閉)
  const dismissed = lsGet(BACKTAP_DISMISSED_KEY) === '1' || !!lsGet('backtapSnoozeUntil');
  el.hidden = !isIOSNative() || lsGet(BACKTAP_DONE_KEY) === '1' || dismissed;
  if (!el.hidden) el.querySelector('.backtap-text').textContent = t('backtapBannerShort');
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
  renderAppVersion();

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
