// WRENCHWORLD — запуск: главный цикл, ввод, тултипы карты.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, R = WW.R, UI = WW.UI, MOD = WW.MOD, P = WW.P;
  WW.hasUI = true; WW.started = false;
  const cv = document.getElementById('world'), tipEl = document.getElementById('tip');
  const O = WW.O, M = WW.M;
  UI.init(); R.init(cv); R.fit();
  window.addEventListener('resize', () => { R.resize(); });

  // ---------- цикл: 1 игровая минута = 1 секунда на ×1 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const S = WW.S;
    if (S && WW.started) {
      const run = !MOD.open && S.phase === 'day' && !S.pendingEv;
      if (run && UI.speed > 0) { try { let left = dt * UI.speed; const t0 = performance.now(); while (left > 0 && WW.S.phase === 'day' && !WW.S.pendingEv && !MOD.open) { const d = Math.min(.25, left); G.step(d); left -= d; if (performance.now() - t0 > 12) break; } } catch (e) { console.error(e); G.toast('Ошибка симуляции: ' + e.message, 'bad'); UI.setSpeed(0); } }
      R.frame(dt, run ? UI.speed : 0); UI.tick();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // если вкладка в фоне — requestAnimationFrame спит, и игра честно стоит на паузе

  // ---------- мышь на карте ----------
  let drag = null, moved = 0;
  let paint = false;
  const wpos = e => { const r = cv.getBoundingClientRect(); return R.toWorld(e.clientX - r.left, e.clientY - r.top); };
  cv.addEventListener('contextmenu', e => { e.preventDefault(); if (R.build) UI.buildOff(); });
  cv.addEventListener('mousedown', e => { WW.A.unlock(); if (e.button === 2) return; if (R.build && e.button === 0) { const w = wpos(e); R.build.x = w[0]; R.build.y = w[1]; paint = true; UI.buildClick(true); moved = 99; return; } drag = [e.clientX, e.clientY]; moved = 0; cv.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { drag = null; paint = false; cv.style.cursor = R.build ? 'crosshair' : 'grab'; });
  cv.addEventListener('mousemove', e => {
    if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; moved += Math.abs(dx) + Math.abs(dy); R.pan(dx, dy); drag = [e.clientX, e.clientY]; tipEl.classList.add('hidden'); return; }
    if (!WW.S || !WW.started) return;
    if (R.build) { const w = wpos(e); R.build.x = w[0]; R.build.y = w[1]; if (paint) UI.buildClick(false); tipEl.classList.add('hidden'); return; }
    const r = cv.getBoundingClientRect(), pk = R.pick(e.clientX - r.left, e.clientY - r.top); R.hover = pk ? pk.t + pk.id : null;
    let t = '';
    if (pk && pk.t === 'c') { const car = pk.o, o = car.order && WW.S.orders[car.order]; t = C.name(car) + ' · ' + car.colorName + '\n' + ({ player: 'Твоя машина', client: 'Клиентская', seller: 'Чужая', auction: 'Лот', sold: 'Продана', world: '' })[car.owner] + (o ? '\nНаряд №' + o.id + ': ' + WW.O.stageName(o.stage) + ' — ' + UI.ostatus(o) : '') + (car.sale ? '\nНа продаже: ' + U.money(car.sale.ask) : '') + (C.runs(car) ? '' : '\nНе на ходу') + '\nКлик — карточка'; }
    else if (pk && pk.t === 'p') { const p = pk.o; t = p.name + ' · ' + D.roles[p.role].n + '\n' + (p.task ? UI.taskName(p) : 'свободен') + (p.owner ? '' : '\nНастроение ' + Math.round(p.mood)); }
    else if (pk && pk.t === 'v') { const o = pk.o.order && WW.S.orders[pk.o.order]; t = o ? o.client.name + ' · ' + D.arch[o.client.arch].n : 'Клиент'; }
    if (t) { tipEl.textContent = t; tipEl.classList.remove('hidden'); tipEl.style.left = (e.clientX + 14) + 'px'; tipEl.style.top = (e.clientY + 16) + 'px'; e.stopPropagation(); } else tipEl.classList.add('hidden');
  });
  cv.addEventListener('mouseleave', () => { R.hover = null; });
  cv.addEventListener('click', e => {
    if (moved > 6 || !WW.S || !WW.started || R.build) return;
    const r = cv.getBoundingClientRect(), pk = R.pick(e.clientX - r.left, e.clientY - r.top);
    if (!pk) return;
    if (pk.t === 'c') { const car = pk.o; if (car.order && WW.S.orders[car.order]) UI.open('order', car.order); else UI.open('car', car.id); }
    else if (pk.t === 'p') UI.go(['pawn', pk.id]); else if (pk.t === 'v' && pk.o.order) UI.go(['order', pk.o.order]);
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); R.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });

  // ---------- клавиатура ----------
  const navKeys = ['orders', 'cars', 'people', 'market', 'stock', 'city', 'build', 'fin', 'race', 'log', 'goals'];
  document.addEventListener('keydown', e => {
    WW.A.unlock();
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Escape') e.target.blur(); return; }
    if (MOD.open) { if (MOD.onKey && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); MOD.onKey(e.key); } else if (e.key === 'Escape' && (MOD.key === 'menu' || MOD.key === 'sub') && WW.started) MOD.hide(); return; }
    if (!WW.started) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); UI.setSpeed(UI.speed ? 0 : (UI.prev || 1)); }
    else if (k === 'q' || k === 'й') UI.setSpeed(1); else if (k === 'w' || k === 'ц') UI.setSpeed(8); else if (k === 'e' || k === 'у') UI.setSpeed(16); else if (!R.build && (k === 'r' || k === 'к')) UI.setSpeed(32);
    else if (R.build && (k === 'r' || k === 'к')) { R.build.r = ((R.build.r || 0) + 1) % 4; }
    else if (e.key >= '1' && e.key <= '9') UI.act.panel({ p: navKeys[+e.key - 1] });
    else if (e.key === '0') UI.act.panel({ p: navKeys[9] }); else if (e.key === '-') UI.act.panel({ p: navKeys[10] });
    else if (e.key === 'Escape') { if (R.build) UI.buildOff(); else if (UI.view) UI.close(); else MOD.menu(); }
    else if (k === 'f' || k === 'а') R.fit();
    else return;
    UI.hud(true);
  });
  window.addEventListener('beforeunload', () => { if (WW.started && WW.S && WW.S.phase !== 'over') MOD.saveTo('auto'); });
  document.getElementById('hint').textContent = 'Пробел — пауза · Q/W/E/R — ×1/×8/×16/×32 · 1–9, 0, − — панели · F — вся карта · Esc — меню';

  // отладка: index.html#demo=s:legacy,site:gas,min:300,p:race,ovl:zones,race:circuit — сразу в игру для скриншотов
  const demo = (location.hash.match(/demo=([^&]*)/) || [])[1];
  if (demo) {
    const q = {}; decodeURIComponent(demo).split(',').forEach(kv => { const [k, v] = kv.split(':'); q[k] = v; });
    G.newGame(q.s || 'legacy', 7, q.site || 'gas'); WW.started = true; WW.S.set.tut = q.tut === '1'; WW.S.set.due = q.due || 'norm'; WW.S.set.interv = false; UI.setSpeed(0); R.fit();
    const S = WW.S; let n = +(q.min || 0) * 4;
    while (n-- > 0 && S.phase === 'day') { for (const id in S.orders) { const o = S.orders[id]; if (o.duePending) O.setDue(o, 'norm'); if (S.orders[id] && o.type !== 'own' && o.stage === 'diag' && o.decide) O.autoEstimate(o); if (S.orders[id]) for (const j of o.jobs) if (j.interv === 'wait') { j.interv = 'done'; j.qb = 10; } } if (S.pendingEv) WW.E.choose(0); G.step(.25); }
    if (q.ovl) R.overlay = q.ovl; if (q.zoom) { R.cam.z = +q.zoom; } if (q.cx) { R.cam.x = +q.cx; R.cam.y = +q.cy; }
    if (q.race) { M.mkRace(); const r = S.race; r.day = S.day; const tk = q.race === 'circuit' ? 'oval' : q.race === 'hill' ? 'hill' : q.race === 'junk' ? 'junk' : q.race === 'autox' ? 'mall' : 'strip'; r.track = tk; r.type = D.tracks[tk].type; r.name = D.tracks[tk].n; r.opt = Object.assign({}, D.tracks[tk].opt); const car = Object.values(S.cars).find(c => c.owner === 'player'); car.mods.push('cage'); for (const id in car.nodes) car.nodes[id].t = Math.max(car.nodes[id].t, 60); car.faults = []; r.entry = { car: car.id, p: S.pawns[0].id, crew: [], load: { tires: 1, hoses: 1 } }; WW.RC.champ().spares = { tires: 1, hoses: 1 }; S.phase = 'race'; MOD.race(); if (q.go) { WW.RC.autoSetup(r, car, S.pawns[0]); MOD.raceStart(); if (r.live) for (let i = 0; i < +q.go; i++) WW.RC.step(r.live, 1); } }
    else if (q.p === 'order' || q.p === 'car') { const o = Object.values(S.orders).find(x => x.type !== 'own') || Object.values(S.orders)[0]; if (q.p === 'order' && o) UI.open('order', o.id); else UI.open('car', (Object.values(S.cars).find(c => c.owner === 'player') || {}).id); if (q.view) UI.sub.bpView = q.view; }
    else if (q.p) UI.open(q.p, q.id ? +q.id : undefined);
    if (q.mg) { UI.act.dbg({ k: 'mg', a: q.mg }); }
    if (q.used) { const o = Object.values(S.orders).find(x => x.type !== 'own'); if (o) MOD.used(o, 'pads'); }
    if (q.dbg) { try { sessionStorage.setItem('ww_dbg', '1'); } catch (e) { } WW.DBG.open(); }
    if (q.b) UI.buildOn(q.b);
  } else MOD.menu();
  UI.ovl && UI.ovl(); WW.on('daystart', () => UI.ovl && UI.ovl());
})(globalThis.WW);
