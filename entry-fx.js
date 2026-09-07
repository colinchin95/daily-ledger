// 記帳當下的慶祝/心痛特效:收入天降金雨,支出燒鈔票。
// 共用一層 canvas 疊層,播完自動移除;尊重 prefers-reduced-motion。

const RAIN_BILLS = 34;
const RAIN_SPARKS = 56;
const RAIN_MS = 2600;

// 支出比收入頻繁得多,燒錢動畫刻意做得更短、更輕,免得每筆都打斷操作
const BURN_BILLS = 9;
const BURN_EMBERS = 60;
const BURN_MS = 1800;

let running = false;

const rand = (a, b) => a + Math.random() * (b - a);

// Safari 16.4 以前沒有 ctx.roundRect,App 支援到 iOS 13 → 自己補
function roundRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 共用疊層:建立 canvas、驅動 rAF、到時自動收拾
function overlay(durationMs, setup) {
  if (running) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  running = true;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  });
  document.body.appendChild(cv);

  const ctx = cv.getContext('2d');
  const size = { w: 0, h: 0 };
  const resize = () => {
    size.w = cv.clientWidth; size.h = cv.clientHeight;
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const draw = setup(ctx, size);
  const start = performance.now();
  let raf = 0;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(guard);
    removeEventListener('resize', resize);
    cv.remove();
    running = false;
  };

  // App 切到背景時 rAF 會被凍結,frame() 就永遠跑不到結尾 → running 卡住,
  // 之後所有特效都不再播。用計時器兜底(計時器在背景仍會觸發,只是被降頻)。
  const guard = setTimeout(finish, durationMs + 400);

  const frame = (now) => {
    const t = now - start;
    if (t >= durationMs) return finish();
    const fadeMs = Math.min(700, durationMs * 0.3);
    const fade = t > durationMs - fadeMs ? 1 - (t - (durationMs - fadeMs)) / fadeMs : 1;
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.globalAlpha = fade;
    draw(t, fade);
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

/* ---------------- 收入:天降金雨 ---------------- */

// 速度以「每毫秒幾個螢幕高」計:要讓鈔票在時長內確實穿過畫面,
// 否則會全程停在畫面上方看不到(起始位置越高,需要的速度越大)。
function makeBill(w, h) {
  return {
    x: rand(-0.05, 1.05) * w,
    y: rand(-0.55, -0.02) * h,
    vy: rand(0.45, 0.85) * h / 1000,
    vx: rand(-0.03, 0.03) * w / 1000,
    len: rand(26, 46),
    rot: rand(0, Math.PI * 2),
    spin: rand(-0.0022, 0.0022),
    flip: rand(0, Math.PI * 2),
    flipSpeed: rand(0.0016, 0.0038),
    sway: rand(0.0008, 0.0018),
    swayAmp: rand(8, 26),
    delay: rand(0, 600),
  };
}

function makeSpark(w, h) {
  return {
    x: rand(0, 1) * w,
    y: rand(-0.4, 0.05) * h,
    vy: rand(0.35, 0.75) * h / 1000,
    r: rand(0.8, 2.6),
    twinkle: rand(0, Math.PI * 2),
    twinkleSpeed: rand(0.004, 0.011),
    delay: rand(0, 700),
  };
}

// char 0..1:0 為完好金鈔,1 為焦黑
function drawBill(ctx, b, t, char = 0) {
  const flip = Math.cos(b.flip + t * b.flipSpeed);
  const w = b.len;
  const h = b.len * 0.45;
  ctx.save();
  ctx.translate(b.x + Math.sin(t * b.sway) * b.swayAmp, b.y);
  ctx.rotate(b.rot + t * b.spin);
  ctx.scale(Math.max(0.12, Math.abs(flip)), 1);

  // 正面朝我們時亮、側面時暗,製造金屬翻轉感
  const lit = 0.55 + 0.45 * Math.abs(flip);
  const mix = (a, bb) => Math.round(a + (bb - a) * char);
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, `rgba(${mix(232, 74)}, ${mix(201, 46)}, ${mix(99, 34)}, ${lit})`);
  g.addColorStop(0.5, `rgba(${mix(201, 52)}, ${mix(162, 32)}, ${mix(39, 24)}, ${lit})`);
  g.addColorStop(1, `rgba(${mix(146, 34)}, ${mix(114, 22)}, ${mix(26, 18)}, ${lit})`);

  ctx.fillStyle = g;
  ctx.beginPath();
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 2);
  ctx.fill();

  // 內框 + 中央橢圓,遠看就有「紙鈔」的訊息量
  ctx.strokeStyle = `rgba(255, 244, 200, ${0.32 * lit * (1 - char)})`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  roundRectPath(ctx, -w / 2 + 2.5, -h / 2 + 2, w - 5, h - 4, 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.13, h * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 燒到一半時,下緣一條橘紅焰線
  if (char > 0.15 && char < 0.95) {
    const heat = Math.sin(char * Math.PI); // 中段最旺
    ctx.strokeStyle = `rgba(255, 138, 40, ${0.85 * heat})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - 1);
    ctx.lineTo(w / 2, h / 2 - 1);
    ctx.stroke();
  }

  ctx.restore();
}

export function moneyRain() {
  overlay(RAIN_MS, (ctx, size) => {
    const { w, h } = size;
    const bills = Array.from({ length: RAIN_BILLS }, () => makeBill(w, h));
    const sparks = Array.from({ length: RAIN_SPARKS }, () => makeSpark(w, h));

    return (t, fade) => {
      // 頂部暖金光暈,呼應圖示裡的光
      const glow = Math.max(0, 1 - t / 1100);
      if (glow > 0) {
        const rg = ctx.createRadialGradient(w / 2, -h * 0.1, 0, w / 2, -h * 0.1, h * 0.8);
        rg.addColorStop(0, `rgba(232, 201, 99, ${0.20 * glow})`);
        rg.addColorStop(1, 'rgba(232, 201, 99, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        if (t < s.delay) continue;
        const st = t - s.delay;
        const y = s.y + s.vy * st;
        if (y > h + 10) continue;
        const a = (0.45 + 0.55 * Math.sin(s.twinkle + st * s.twinkleSpeed)) * fade;
        ctx.fillStyle = `rgba(255, 232, 158, ${Math.max(0, a) * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      for (const b of bills) {
        if (t < b.delay) continue;
        const bt = t - b.delay;
        const y = b.y + b.vy * bt;
        if (y > h + 60) continue;
        drawBill(ctx, { ...b, x: b.x + b.vx * bt, y }, bt);
      }
    };
  });
}

/* ---------------- 支出:燒鈔票 ---------------- */

function makeBurnBill(w, h) {
  return {
    x: rand(0.15, 0.85) * w,
    y: rand(0.55, 0.95) * h,          // 從畫面下半部升起(熱氣上衝)
    vy: -rand(0.10, 0.26) * h / 1000, // 負值 = 往上
    vx: rand(-0.02, 0.02) * w / 1000,
    len: rand(30, 50),
    rot: rand(0, Math.PI * 2),
    spin: rand(-0.0016, 0.0016),
    flip: rand(0, Math.PI * 2),
    flipSpeed: rand(0.0012, 0.0026),
    sway: rand(0.0012, 0.0026),
    swayAmp: rand(6, 18),
    delay: rand(0, 380),
  };
}

function makeEmber(w, h) {
  return {
    x: rand(0.1, 0.9) * w,
    y: rand(0.6, 1.02) * h,
    vy: -rand(0.30, 0.75) * h / 1000,
    vx: rand(-0.05, 0.05) * w / 1000,
    r: rand(0.7, 2.4),
    flicker: rand(0, Math.PI * 2),
    flickerSpeed: rand(0.008, 0.020),
    hot: Math.random(),                // 決定偏黃還是偏紅
    delay: rand(0, 700),
  };
}

export function moneyBurn() {
  overlay(BURN_MS, (ctx, size) => {
    const { w, h } = size;
    const bills = Array.from({ length: BURN_BILLS }, () => makeBurnBill(w, h));
    const embers = Array.from({ length: BURN_EMBERS }, () => makeEmber(w, h));

    return (t, fade) => {
      const p = t / BURN_MS;

      // 底部火光,前段最旺
      const heat = Math.max(0, 1 - p * 1.5);
      if (heat > 0) {
        const rg = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, h * 0.75);
        rg.addColorStop(0, `rgba(255, 132, 40, ${0.28 * heat})`);
        rg.addColorStop(0.5, `rgba(226, 78, 32, ${0.12 * heat})`);
        rg.addColorStop(1, 'rgba(226, 78, 32, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }

      // 燒到一半才開始冒煙,避免一開始就糊掉畫面
      if (p > 0.3) {
        const smoke = Math.sin((p - 0.3) / 0.7 * Math.PI) * 0.10;
        const sg = ctx.createLinearGradient(0, h, 0, h * 0.25);
        sg.addColorStop(0, `rgba(60, 46, 36, ${smoke})`);
        sg.addColorStop(1, 'rgba(60, 46, 36, 0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, w, h);
      }

      // 鈔票邊升邊焦
      for (const b of bills) {
        if (t < b.delay) continue;
        const bt = t - b.delay;
        const char = Math.min(1, bt / (BURN_MS * 0.75));
        const y = b.y + b.vy * bt;
        if (y < -60) continue;
        ctx.save();
        ctx.globalAlpha = fade * (1 - char * 0.75); // 燒完趨近消失
        drawBill(ctx, { ...b, x: b.x + b.vx * bt, y }, bt, char);
        ctx.restore();
      }

      // 餘燼上飄
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        if (t < e.delay) continue;
        const et = t - e.delay;
        const y = e.y + e.vy * et;
        if (y < -10) continue;
        const a = (0.4 + 0.6 * Math.sin(e.flicker + et * e.flickerSpeed)) * fade;
        const g = Math.round(90 + 110 * e.hot);
        ctx.fillStyle = `rgba(255, ${g}, 48, ${Math.max(0, a) * 0.85})`;
        ctx.beginPath();
        ctx.arc(e.x + Math.sin(et * 0.004) * 6, y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
  });
}
