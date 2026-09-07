// 對帳單匯入 + 對帳:解析交易、跟已記帳目配對、找出漏記的。
// CSV 走本地解析(零成本、離線可用);PDF/圖片才送 Worker 給 AI。

const STMT_ENDPOINT = 'https://daily-ledger-sync.yuxuanchin95.workers.dev/statement';

/* ---------------- CSV 本地解析 ---------------- */

// 逐字元切,處理被引號包住的逗號
function splitCsvLine(line) {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ''));
}

const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

// 回傳 YYYY-MM-DD 或 null。大馬銀行常見 DD/MM/YYYY,故日在前優先。
function parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  m = t.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s](\d{2,4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (!mo) return null;
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${String(mo).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  }
  return null;
}

// "1,234.56" / "(12.30)" / "12.30 DR" → { amount, isCredit }
function parseAmount(s) {
  if (!s) return null;
  let t = String(s).trim();
  if (!t) return null;
  let credit = false;
  if (/\bCR\b/i.test(t)) credit = true;
  if (/\bDR\b/i.test(t)) credit = false;
  if (/^\(.*\)$/.test(t)) { credit = true; t = t.slice(1, -1); }
  t = t.replace(/\b(DR|CR)\b/gi, '').replace(/[^0-9.\-]/g, '');
  if (!t || t === '-' || t === '.') return null;
  const n = Number(t);
  if (!isFinite(n) || n === 0) return null;
  if (n < 0) credit = true;
  return { amount: Math.abs(n), isCredit: credit };
}

// 嗅探欄位:哪一欄是日期、哪一欄是金額、剩下最長的文字欄當描述。
// 命中率 <60% 就回 null,讓呼叫端 fallback 去 AI。
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  const rows = lines.map(splitCsvLine).filter((r) => r.length >= 2);
  if (!rows.length) return null;

  const width = Math.max(...rows.map((r) => r.length));

  // 先找日期欄
  let dateCol = -1, bestDate = 0;
  for (let c = 0; c < width; c++) {
    let hits = 0;
    for (const r of rows) if (parseDate(r[c])) hits++;
    if (hits > bestDate) { bestDate = hits; dateCol = c; }
  }
  if (dateCol < 0 || !bestDate) return null;

  // 金額欄要靠表頭判斷,不能只看「哪欄數字最多」——
  // 餘額欄通常比金額欄還多一筆(結餘那行),純比數量一定選到餘額。
  const AMOUNT_WORDS = /(amount|debit|credit|withdraw|deposit|transaction|payment|jumlah|nilai|金[额額]|支出|存入)/i;
  const BALANCE_WORDS = /(balance|baki|余[额額]|餘[额額])/i;

  let amtCol = -1, bestScore = -Infinity;
  for (let c = 0; c < width; c++) {
    if (c === dateCol) continue;
    let hits = 0;
    for (const r of rows) if (parseAmount(r[c])) hits++;
    if (!hits) continue;

    // 表頭 = 該欄中無法解析成日期/金額的短文字
    let header = '';
    for (const r of rows) {
      const v = (r[c] || '').trim();
      if (v && v.length < 30 && !parseAmount(v) && !parseDate(v)) { header = v; break; }
    }

    let score = hits;
    if (BALANCE_WORDS.test(header)) score -= 1000;  // 餘額欄直接淘汰
    if (AMOUNT_WORDS.test(header)) score += 1000;   // 命中金額關鍵字則強烈優先
    score -= c * 0.1;                                // 同分時偏左(金額欄通常在餘額欄左邊)

    if (score > bestScore) { bestScore = score; amtCol = c; }
  }
  if (amtCol < 0) return null;

  const txns = [];
  for (const r of rows) {
    const date = parseDate(r[dateCol]);
    const amt = parseAmount(r[amtCol]);
    if (!date || !amt) continue; // 表頭與小計自然被濾掉
    // 描述:除日期/金額外最長的文字欄
    let desc = '';
    for (let c = 0; c < r.length; c++) {
      if (c === dateCol || c === amtCol) continue;
      const v = (r[c] || '').trim();
      if (v.length > desc.length && !/^[\d.,\-\s]*$/.test(v)) desc = v;
    }
    txns.push({
      date,
      desc: desc.slice(0, 80),
      amount: amt.amount,
      direction: amt.isCredit ? 'credit' : 'debit',
      category: null,
    });
  }

  // 解析出來的筆數太少 → 大概不是交易明細,交給 AI
  if (!txns.length || txns.length < rows.length * 0.4) return null;
  return txns;
}

/* ---------------- 配對演算法(全本地) ---------------- */

const toCents = (n) => Math.round(n * 100);
const dayDiff = (a, b) =>
  Math.round(Math.abs(new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);

const WINDOW_DAYS = 3; // 刷卡日與入帳日常差 1–2 天,手記日期也可能偏一天

// 回傳 [{ txn, status: 'matched'|'review'|'missing', entryId }]
// 只配 debit 對支出;credit(退款/繳款)顯示但不配對。
export function reconcile(txns, entries) {
  const pool = entries
    .filter((e) => e.type !== 'income')
    .map((e) => ({ id: e.id, date: e.date, cents: e.amountCents, used: false }));

  const results = txns.map((t) => ({ txn: t, status: 'missing', entryId: null, candidates: 0 }));

  // 先算候選,再按「日期距離」由近到遠貪婪指派,
  // 這樣同金額多筆(兩杯同價咖啡)才會各配各的。
  const jobs = [];
  results.forEach((r, i) => {
    if (r.txn.direction !== 'debit') { r.status = 'credit'; return; }
    const cents = toCents(r.txn.amount);
    pool.forEach((p) => {
      if (p.cents !== cents) return;
      const d = dayDiff(p.date, r.txn.date);
      if (d <= WINDOW_DAYS) jobs.push({ i, p, d });
    });
  });
  jobs.sort((a, b) => a.d - b.d);

  for (const j of jobs) {
    const r = results[j.i];
    r.candidates++;
    if (r.entryId || j.p.used) continue;
    r.entryId = j.p.id;
    j.p.used = true;
    r.status = j.d <= 1 ? 'matched' : 'review'; // 差 2–3 天先當待確認
  }
  // 同窗口有多個候選 → 也降級成待確認,讓使用者看一眼
  for (const r of results) {
    if (r.status === 'matched' && r.candidates > 1) r.status = 'review';
  }

  const inWindow = new Set(jobs.map((j) => j.p.id));
  const otherCount = pool.filter((p) => !p.used && inWindow.has(p.id)).length;

  return {
    rows: results,
    total: results.filter((r) => r.status !== 'credit').length,
    matched: results.filter((r) => r.status === 'matched').length,
    review: results.filter((r) => r.status === 'review').length,
    missing: results.filter((r) => r.status === 'missing').length,
    credits: results.filter((r) => r.status === 'credit').length,
    otherCount,
  };
}

/* ---------------- 送 AI 解析(PDF / 圖片 / CSV fallback) ---------------- */

export async function parseWithAI({ kind, data, mediaType, categories, installId, lang }) {
  const res = await fetch(STMT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data, mediaType, categories, installId, lang }),
  });
  if (!res.ok) {
    let e = {};
    try { e = await res.json(); } catch {}
    const err = new Error(e.error || 'failed');
    err.code = e.error;
    err.status = res.status;
    err.limit = e.limit;
    throw err;
  }
  const r = await res.json();
  return Array.isArray(r.transactions) ? r.transactions : [];
}
