// WRENCHWORLD — запуск: главный цикл, ввод, тултипы карты.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, R = WW.R, UI = WW.UI, MOD = WW.MOD, P = WW.P;
  WW.hasUI = true; WW.started = false;
  const cv = document.getElementById('world'), tipEl = document.getElementById('tip');
  UI.init(); R.init(cv); R.fit();
  window.addEventListener('resize', () => { R.resize(); });

  // ---------- цикл: 1 игровая минута = 1 секунда на ×1 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const S = WW.S;
    if (S && WW.started) {
      const run = !MOD.open && S.phase === 'day' && !S.pendingEv;
      if (run && UI.speed > 0) { try { G.step(dt * UI.speed); } catch (e) { console.error(e); G.toast('Ошибка симуляции: ' + e.message, 'bad'); UI.setSpeed(0); } }
      R.frame(dt, run ? UI.speed : 0); UI.tick();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // если вкладка в фоне — requestAnimationFrame спит, и игра честно стоит на паузе

  // ---------- мышь на карте ----------
  let drag = null, moved = 0;
  cv.addEventListener('mousedown', e => { drag = [e.clientX, e.clientY]; moved = 0; cv.style.cursor = 'grabbing'; WW.A.unlock(); });
  window.addEventListener('mouseup', () => { drag = null; cv.style.cursor = 'grab'; });
  cv.addEventListener('mousemove', e => {
    if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; moved += Math.abs(dx) + Math.abs(dy); R.pan(dx, dy); drag = [e.clientX, e.clientY]; tipEl.classList.add('hidden'); return; }
    if (!WW.S || !WW.started) return;
    const r = cv.getBoundingClientRect(), pk = R.pick(e.clientX - r.left, e.clientY - r.top); R.hover = pk ? pk.t + pk.id : null;
    let t = '';
    if (pk && pk.t === 'c') { const car = pk.o, o = car.order && WW.S.orders[car.order]; t = C.name(car) + ' · ' + car.colorName + '\n' + ({ player: 'Твоя машина', client: 'Клиентская', seller: 'Чужая', auction: 'Лот', sold: 'Продана', world: '' })[car.owner] + (o ? '\nНаряд №' + o.id + ': ' + WW.O.stageName(o.stage) + ' — ' + UI.ostatus(o) : '') + (car.sale ? '\nНа продаже: ' + U.money(car.sale.ask) : '') + (C.runs(car) ? '' : '\nНе на ходу') + '\nКлик — карточка'; }
    else if (pk && pk.t === 'p') { const p = pk.o; t = p.name + ' · ' + D.roles[p.role].n + '\n' + (p.task ? UI.taskName(p) : 'свободен') + (p.owner ? '' : '\nНастроение ' + Math.round(p.mood)); }
    else if (pk && pk.t === 'v') { const o = pk.o.order && WW.S.orders[pk.o.order]; t = o ? o.client.name + ' · ' + D.arch[o.client.arch].n : 'Клиент'; }
    if (t) { tipEl.textContent = t; tipEl.classList.remove('hidden'); tipEl.style.left = (e.clientX + 14) + 'px'; tipEl.style.top = (e.clientY + 16) + 'px'; e.stopPropagation(); } else tipEl.classList.add('hidden');
  });
  cv.addEventListener('mouseleave', () => { R.hover = null; });
  cv.addEventListener('click', e => {
    if (moved > 6 || !WW.S || !WW.started) return;
    const r = cv.getBoundingClientRect(), pk = R.pick(e.clientX - r.left, e.clientY - r.top);
    if (!pk) return;
    if (pk.t === 'c') { const car = pk.o; if (car.order && WW.S.orders[car.order]) UI.open('order', car.order); else UI.open('car', car.id); }
    else if (pk.t === 'p') UI.go(['pawn', pk.id]); else if (pk.t === 'v' && pk.o.order) UI.go(['order', pk.o.order]);
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); R.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });

  // ---------- клавиатура ----------
  const navKeys = ['orders', 'cars', 'people', 'market', 'build', 'fin', 'race', 'log', 'goals'];
  document.addEventListener('keydown', e => {
    WW.A.unlock();
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Escape') e.target.blur(); return; }
    if (MOD.open) { if (MOD.onKey && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); MOD.onKey(e.key); } else if (e.key === 'Escape' && (MOD.key === 'menu' || MOD.key === 'sub') && WW.started) MOD.hide(); return; }
    if (!WW.started) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); UI.setSpeed(UI.speed ? 0 : (UI.prev || 1)); }
    else if (k === 'q' || k === 'й') UI.setSpeed(1); else if (k === 'w' || k === 'ц') UI.setSpeed(2); else if (k === 'e' || k === 'у') UI.setSpeed(4); else if (k === 'r' || k === 'к') UI.setSpeed(8);
    else if (e.key >= '1' && e.key <= '9') UI.act.panel({ p: navKeys[+e.key - 1] });
    else if (e.key === 'Escape') { if (UI.view) UI.close(); else MOD.menu(); }
    else if (k === 'f' || k === 'а') R.fit();
    else return;
    UI.hud(true);
  });
  window.addEventListener('beforeunload', () => { if (WW.started && WW.S && WW.S.phase !== 'over') MOD.saveTo('auto'); });
  document.getElementById('hint').textContent = 'Пробел — пауза · Q/W/E/R — скорость · 1–9 — панели · F — вся карта · Esc — меню';

  MOD.menu();
})(globalThis.WW);
