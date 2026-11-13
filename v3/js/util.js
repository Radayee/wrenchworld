// WRENCHWORLD — утилиты. Все файлы — классические скрипты с общим неймспейсом WW,
// чтобы игра запускалась двойным кликом по index.html и грузилась в Node для тестов.
globalThis.WW = globalThis.WW || {};
(function (WW) {
  const U = WW.U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sig = x => 1 / (1 + Math.exp(-x));
  // локальный детерминированный генератор (mulberry32) — для машины из сида VIN
  U.mk = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  // глобальный генератор симуляции: состояние лежит в сейве
  U.r = function () {
    const S = WW.S; let a = S.rng = (S.rng + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  U.rf = (a, b, r) => a + (b - a) * (r || U.r)();
  U.ri = (a, b, r) => Math.floor(U.rf(a, b + 1, r));
  U.pick = (arr, r) => arr[Math.floor((r || U.r)() * arr.length)];
  U.chance = (p, r) => (r || U.r)() < p;
  U.wpick = function (arr, wf, r) {
    let tot = 0; const ws = arr.map(x => { const w = Math.max(0, wf(x)); tot += w; return w; });
    if (tot <= 0) return arr[0];
    let x = (r || U.r)() * tot;
    for (let i = 0; i < arr.length; i++) { x -= ws[i]; if (x <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };
  U.money = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
  U.time = m => { m = Math.floor(m); const h = Math.floor(m / 60) % 24, mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };
  U.dur = min => { min = Math.round(min); return min < 60 ? min + ' мин' : (Math.floor(min / 60) + ' ч' + (min % 60 ? ' ' + (min % 60) + ' мин' : '')); };
  U.hash = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // кусочно-линейная интерполяция по таблице [[x,y],...]
  U.interp = function (tb, x) {
    if (x <= tb[0][0]) return tb[0][1];
    for (let i = 1; i < tb.length; i++) if (x <= tb[i][0]) {
      const a = tb[i - 1], b = tb[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    return tb[tb.length - 1][1];
  };
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  U.plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return (m > 10 && m < 20) ? c : k === 1 ? a : (k >= 2 && k <= 4) ? b : c; };

  // шина событий: симуляция ничего не знает про интерфейс
  const L = {};
  WW.on = (n, f) => { (L[n] = L[n] || []).push(f); };
  WW.emit = (n, d) => { (L[n] || []).forEach(f => f(d)); };
})(globalThis.WW);
