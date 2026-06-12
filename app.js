import { getEntries, saveEntries, getCategories, saveCategories } from './db.js';

// ---------- 多語系 ----------
const STRINGS = {
  zh: {
    appTitle: '日常記帳',
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
    langBtn: 'EN',
  },
  en: {
    appTitle: 'Daily Ledger',
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
    langBtn: '中文',
  },
};

let lang = localStorage.getItem('lang') === 'en' ? 'en' : 'zh';

function t(key, ...args) {
  const v = STRINGS[lang][key];
  return typeof v === 'function' ? v(...args) : v;
}

// ---------- 金額工具:儲存與計算全用整數「分」,只有顯示才轉換 ----------
let myrFmt, dateFmt, monthFmt;

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

const catMap = () => new Map(categories.map((c) => [c.id, c]));
const catsOfType = (type) => categories.filter((c) => c.type === type);

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
  $('#cat-editor-title').textContent = editingCatId ? t('editCategory') : t('newCategory');
}

// ---------- 明細列表 ----------
function renderList() {
  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  emptyEl.hidden = sorted.length > 0;
  listEl.innerHTML = '';

  const cats = catMap();
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
    card.querySelector('.entry-cat').textContent = cat?.name ?? t('uncategorized');
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

  // 各分類佔比
  const cats = catMap();
  const typed = monthEntries.filter((e) => (e.type === 'income') === (reportType === 'income'));
  const total = typed.reduce((s, e) => s + e.amountCents, 0);

  const byCat = new Map();
  for (const e of typed) {
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amountCents);
  }
  const rows = [...byCat.entries()]
    .map(([catId, cents]) => ({
      name: cats.get(catId)?.name ?? t('uncategorized'),
      color: cats.get(catId)?.color ?? '#8C95A3',
      cents,
    }))
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
    const div = document.createElement('div');
    div.className = 'breakdown-row';
    div.innerHTML = `
      <div class="breakdown-top">
        <span class="cat-dot"></span>
        <span class="breakdown-name"></span>
        <span class="breakdown-pct"></span>
        <span class="breakdown-amount num"></span>
      </div>
      <div class="breakdown-bar-track"><div class="breakdown-bar"></div></div>`;
    div.querySelector('.cat-dot').style.background = row.color;
    div.querySelector('.breakdown-name').textContent = row.name;
    div.querySelector('.breakdown-pct').textContent = `${pct.toFixed(1)}%`;
    div.querySelector('.breakdown-amount').textContent = formatRM(row.cents);
    const bar = div.querySelector('.breakdown-bar');
    bar.style.background = row.color;
    bar.style.width = `${pct.toFixed(1)}%`;
    breakdownEl.appendChild(div);
  }
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
    chip.children[1].textContent = cat.name;
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
  closeSheet();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

async function onDelete() {
  if (!editingId) return;
  if (!confirm(t('confirmDeleteEntry'))) return;
  entries = entries.filter((e) => e.id !== editingId);
  await saveEntries(entries);
  closeSheet();
  renderList();
  if (!viewReportEl.hidden) renderReport();
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
    row.querySelector('.cat-row-name').textContent = cat.name;
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
  catNameInput.value = cat?.name ?? '';
  $('#cat-editor-title').textContent = cat ? t('editCategory') : t('newCategory');
  catDeleteBtn.hidden = !cat;
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
  if (editingCatId) {
    const cat = categories.find((c) => c.id === editingCatId);
    if (cat) {
      cat.name = name;
      cat.color = editorColor;
    }
  } else {
    categories.push({ id: crypto.randomUUID(), name, color: editorColor, type: catManageType });
  }
  await saveCategories(categories);
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
  closeCatEditor();
  renderCatList();
  renderList();
  if (!viewReportEl.hidden) renderReport();
}

// ---------- 資料備份:JSON 匯出 / 匯入 ----------
function exportBackup() {
  const payload = {
    app: 'daily-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily-ledger-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  return {
    id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
    name: c.name.trim().slice(0, 12),
    color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#8C95A3',
    type: c.type === 'income' ? 'income' : 'expense',
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

  await Promise.all([saveEntries(entries), saveCategories(categories)]);
  renderList();
  renderReport();
  renderCatList();
  alert(t('importDone', inEntries.length, inCats.length));
}

// ---------- 事件繫結 ----------
langBtn.addEventListener('click', () => setLang(lang === 'en' ? 'zh' : 'en'));

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
$('#import-btn').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (e) => {
  onImportFile(e.target.files[0]);
  e.target.value = '';
});

$('#cat-editor-cancel').addEventListener('click', closeCatEditor);
catEditorBackdropEl.addEventListener('click', closeCatEditor);
$('#cat-editor-save').addEventListener('click', onCatSave);
catDeleteBtn.addEventListener('click', onCatDelete);

// ---------- 啟動 ----------
async function init() {
  buildFormatters();
  applyLanguage();
  [entries, categories] = await Promise.all([getEntries(), getCategories()]);
  renderList();

  // PWA:註冊 service worker(需要 https 或 localhost)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
