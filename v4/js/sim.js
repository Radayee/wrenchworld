// WRENCHWORLD — ядро симуляции: состояние, время, деньги, движение машин и техники, сутки.
// Всё состояние — чистые данные в WW.S (сейв = JSON). Рендер и интерфейс сюда не заглядывают.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, N = WW.N, MAP = D.MAP, G = WW.G = {};
  const cat = { labor: 'Работа (нормо-часы)', partsRev: 'Детали клиентам', diag: 'Диагностика', tips: 'Чаевые', carSale: 'Продажа машин', prize: 'Призовые', loan: 'Кредит банка',
    partsCost: 'Закупка деталей', ownParts: 'Детали на свой сток', carBuy: 'Покупка машин', wages: 'Зарплата', mortgage: 'Ипотека и кредит', utilities: 'Коммуналка и страховка',
    upgrade: 'Оборудование и стройка', marketing: 'Реклама', tax: 'Налог с продаж', raceFee: 'Гоночные взносы', misc: 'Прочее', fine: 'Штрафы и компенсации', taxHeld: 'Налог с продаж (собран)' };
  G.catName = cat;
  G.rivers = { service: ['labor', 'partsRev', 'diag', 'tips', 'partsCost'], flip: ['carSale', 'carBuy', 'ownParts'], race: ['prize', 'raceFee'] };

  G.newGame = function (scnId, seed, siteId) {
    const sc = D.scenarios[scnId] || D.scenarios.legacy, site = D.sites[siteId] ? siteId : 'gas', st = D.sites[site], loan0 = Math.round(sc.loan * st.loan / 500) * 500;
    const S = WW.S = {
      v: 5, rng: (seed || Date.now()) >>> 0, scn: scnId, site, day: 0, min: 420, year: sc.year, year0: sc.year, phase: 'day',
      money: sc.money, loan: { bal: loan0, pay: Math.round(loan0 * .012 / 5) * 5 + (loan0 ? 60 : 0), missed: 0 }, taxOwed: 0, bank: 0,
      rep: { q: 32, h: 40, s: 32, p: 40 },
      set: { rate: D.marketRate(sc.year), markup: .4, diagFee: Math.round(20 * D.infl(sc.year)), autoDiag: true, autoEst: false, interv: true, fast: true, rustK: 1, tut: !!sc.tut, pauseEv: true, due: 'ask', duePct: 100 },
      upg: {}, adDays: 0, cars: {}, slotCar: {}, orders: {}, nextId: 1, pawns: [], cands: [], visitors: [], arrivals: [], deliveries: [], comebacks: [], trips: [],
      parts: [], bench: [], junk: [], veh: [], runs: [],
      listings: [], offers: [], auction: null, race: null, trend: {}, mods: [], evq: [], evLast: {}, log: [], radio: [],
      fin: { today: {}, hist: [], total: {} }, stats: { orders: 0, sold: 0, bought: 0, comebacks: 0, races: 0, wins: 0, stars: [], flipProfit: 0, best: 0, hired: 0 },
      reviews: [], tut: { seen: {}, cur: null }, weather: 'clear', interv: { day: -1, n: 0 }, ach: {}, summary: null, tension: 0, calm: 0, enc: {}
    };
    S.map = N.mk(site); N.dirty(); WW.X.init(S); S.champ = { pts: {}, round: 0, season: 0 }; S.raceCar = null; S.setup = { gear: 50, susp: 50, tyre: 50 };
    for (const id in D.models) S.trend[id] = 1;
    // хозяин
    const k = sc.skill, sk = {}; D.skillIds.forEach(s => sk[s] = U.clamp(k + U.ri(-2, 2), 0, 20));
    sk.diag = U.clamp(k + 1, 0, 20); sk.talk = Math.max(sk.talk, 6); sk.drive = Math.max(sk.drive, 7);
    S.pawns.push({ id: S.nextId++, name: 'Хозяин', owner: true, role: 'owner', spec: 'owner', skills: sk, xp: {}, pas: { eng: 1, diag: 1 }, traits: [], known: 9, wage: 0, owed: 0, mood: 62, thoughts: [],
      x: 30.5, y: 12, path: null, task: null, pri: Object.assign({}, D.specs.owner.pri), hours: 0, state: 'work', fam: {}, hired: 0, look: { skin: 2, hat: 1, hair: 0 }, lunch: -1 });
    // машины деда
    const start = [
      { model: 'bug', year: 1971, quality: 'private', hid: 0, set: { start: 4, fuel: 52, ign: 58, block: 66, head: 70, gearbox: 71, brakes: 48, wheels: 55 }, rustSet: { floor: 34, sills: 28, frame: 12 }, note: 'Дед ездил на нём за запчастями. Последний год стоит — «что-то с аккумулятором».' },
      { model: 'caprio', year: 1979, quality: 'private', hid: 0, set: { block: 21, gearbox: 43, start: 74, fuel: 70, ign: 72 }, note: 'Caprio с «лёгким стуком». Дед взял его за $900 и не успел заняться.' },
      { model: 'firebolt', year: 1978, quality: 'barn', set: { block: 74, head: 71, gearbox: 68, interior: 31 }, rustSet: { rarch: 46, sills: 30, floor: 26, frame: 14 }, note: 'Firebolt T/A под брезентом. Попс говорит, дед мечтал выкатить его на дрэг-стрип.' }
    ];
    const slots = N.slots().filter(s => s.kind === 'proj').concat(N.slots().filter(s => s.kind === 'yard'));
    for (let i = 0; i < Math.min(sc.cars, slots.length); i++) {
      const o = Object.assign({}, start[(i + (sc.cars === 1 ? 2 : 0)) % 3]);
      if (o.year > S.year - 2) { o.year = Math.max(D.models[o.model].y[0], S.year - 9); }
      const car = C.gen(Object.assign(o, { owner: 'player' }));
      car.note = o.note; car.cost = 0; car.title = 'clean';
      C.reveal(car, { nodes: { panels: 30, interior: 30, wheels: 35 }, rust: { farch: 30, rarch: 30, doors: 30 } }, 10, true);
      G.place(car, slots[i].id);
    }
    for (let i = 0; i < st.cars; i++) { const sl = G.freeSlot(['proj', 'yard']); if (!sl) break; const pool = Object.values(D.models).filter(m => m.y[0] <= S.year - 12 && m.curve !== 'mass'); const car = C.gen({ model: U.pick(pool).id, quality: 'barn', owner: 'player' }); car.note = 'Стояла в амбаре под сеном. Прежний хозяин фермы про неё забыл.'; car.cost = 0; C.reveal(car, { nodes: { panels: 35, interior: 35 }, rust: { farch: 35, rarch: 35, doors: 35 } }, 10, true); G.place(car, sl.id); }
    WW.P.refreshCands(true);
    WW.M.init();
    G.log(sc.n + ' · ' + st.n + ': ' + sc.d, 'story');
    G.startDay(true);
    return S;
  };

  // ---------- время и календарь ----------
  G.dow = () => WW.S.day % 7;
  G.season = () => Math.floor((WW.S.day % 56) / 14);
  G.date = function () { const S = WW.S; return D.dow[G.dow()] + ', день ' + (S.day + 1) + ' · ' + D.seasons[G.season()] + ' ' + S.year; };
  G.px = () => D.infl(WW.S.year);
  G.rep = () => { const r = WW.S.rep; return (r.q + r.h + r.s + r.p) / 4; };
  G.repAdd = function (k, v) { const r = WW.S.rep; r[k] = U.clamp(r[k] + v, 0, 100); };
  G.repTo = function (k, target, rate) { const r = WW.S.rep; r[k] = U.clamp(r[k] + (target - r[k]) * (rate || .07), 0, 100); };
  G.mod = function (key) { const S = WW.S; let v = 1; for (const m of S.mods) if (m.k === key && m.until >= S.day) v *= m.v; return v; };
  G.addMod = function (k, v, days, label) { WW.S.mods.push({ k, v, until: WW.S.day + days - 1, label }); };
  // рабочие минуты → календарный срок (день 07:00–19:00)
  G.addWork = function (mins) { const S = WW.S; let day = S.day, m = Math.max(420, S.min) + mins; while (m > 1110) { m -= 690; day++; } return { day, min: Math.round(m) }; };

  G.money = function (amt, c, note) {
    const S = WW.S; if (!amt) return;
    S.money += amt; S.fin.today[c] = (S.fin.today[c] || 0) + amt; S.fin.total[c] = (S.fin.total[c] || 0) + amt;
    WW.emit('money', { amt, cat: c, note });
  };
  G.log = function (text, kind) { const S = WW.S; S.log.unshift({ d: S.day, m: Math.floor(S.min), y: S.year, t: text, k: kind || 'info' }); if (S.log.length > 500) S.log.length = 500; };
  G.toast = function (text, kind, act) { WW.emit('toast', { text, kind: kind || 'info', act }); };
  G.note = function (text, kind, act) { G.log(text, kind); G.toast(text, kind, act); };
  G.radio = function (text) { const S = WW.S; S.radio.unshift(text); if (S.radio.length > 12) S.radio.length = 12; WW.emit('radio', text); };

  // ---------- места и движение машин ----------
  G.slotList = () => N.slots();
  G.slot = id => N.slot(id);
  // свободное место нужного типа, до которого реально доехать (car — откуда едем; без car — с улицы)
  G.freeSlot = function (kinds, car) {
    const S = WW.S, r = N.roadIn(), x = car && car.lot ? car.x : r[0], y = car && car.lot ? car.y : r[1], from = car && car.lot ? car.slot : null;
    for (const k of kinds) for (const s of N.slots()) if (s.kind === k && !S.slotCar[s.id] && N.reach(x, y, from, s.id)) return s;
    return null;
  };
  G.countFree = kind => N.slots().filter(s => s.kind === kind && !WW.S.slotCar[s.id]).length;
  G.place = function (car, slotId) { const S = WW.S, s = N.slot(slotId); if (!s) return; if (car.slot && S.slotCar[car.slot] === car.id) delete S.slotCar[car.slot]; car.slot = slotId; S.slotCar[slotId] = car.id; car.x = s.x; car.y = s.y; car.ang = s.r % 2 ? 0 : -Math.PI / 2; car.mv = null; car.dest = null; car.push = null; car.lot = true; };
  G.kindOf = car => { const s = car.slot && N.slot(car.slot); return s ? s.kind : null; };
  G.inBay = car => !car.mv && !!car.slot && G.kindOf(car) === 'bay';
  G.blocked = car => !!(car.lot && car.slot && !car.mv && !N.reach(car.x, car.y, car.slot, 'exit'));
  G.slotName = function (car) { const s = car.slot && N.slot(car.slot); if (!s) return car.mv ? (car.mv.tow ? 'на эвакуаторе' : car.mv.push ? 'толкают' : 'в пути') : car.away ? 'в отъезде' : '—'; return s.n || ({ yard: 'двор', park: 'парковка', proj: 'проекты', sale: 'витрина' })[s.kind]; };
  // Машина на ходу едет сама — только по дороге. Не на ходу: по участку её толкают, привозит и увозит эвакуатор.
  // Возвращает false, если проезда нет (заперли другой машиной, нет дороги).
  G.send = function (car, dest) {
    const S = WW.S, runs = C.runs(car);
    if (car.mv && car.mv.tow) return false;
    if (car.lot && dest !== 'exit' && !N.reach(car.x, car.y, car.slot, dest)) return false;
    if (!car.lot && dest !== 'exit') { const r = N.roadIn(); if (!N.reach(r[0], r[1], null, dest)) return false; }
    if (car.dest && car.dest !== 'exit' && car.dest !== dest && S.slotCar[car.dest] === car.id) delete S.slotCar[car.dest];
    car.push = null; car.wantExit = false;
    if (!car.lot) { // въезд с улицы
      const r = N.roadIn(); S.slotCar[dest] = car.id; car.x = r[0]; car.y = r[1]; car.ang = Math.PI; car.dest = dest; car.lot = true; car.away = false; car.lift = 0; car.hood = 0;
      if (runs) { car.mv = { pts: N.route(car.x, car.y, null, dest), i: 0 }; WW.emit('sound', 'engine'); } else G.tow(car, 'in', dest);
      return true;
    }
    if (!runs) {
      if (dest === 'exit') { car.dest = 'exit'; G.tow(car, 'out'); return true; }
      S.slotCar[dest] = car.id; car.dest = dest; if (car.mv) car.mv = null; car.push = { dest }; car.lift = 0; car.hood = 0; car.work = 0; return true;
    }
    const from = car.slot, pts = N.route(car.x, car.y, from, dest);
    if (!pts) { if (dest === 'exit') car.wantExit = true; return false; }
    if (dest !== 'exit') S.slotCar[dest] = car.id;
    if (from && S.slotCar[from] === car.id && !car.home) delete S.slotCar[from]; car.slot = null;
    car.dest = dest; car.lift = 0; car.hood = 0; car.work = 0; car.mv = { pts, i: 0 }; WW.emit('sound', 'engine');
    return true;
  };
  G.startPush = function (car) {
    const S = WW.S; if (!car.push || (car.mv && car.mv.push)) return false;
    const from = car.slot, pts = N.route(car.x, car.y, from, car.push.dest); if (!pts) return false;
    if (from && S.slotCar[from] === car.id) delete S.slotCar[from]; car.slot = null;
    car.mv = { pts, i: 0, push: true }; WW.emit('sound', 'push'); return true;
  };
  G.pushers = car => WW.S.pawns.filter(p => p.task && p.task.type === 'push' && p.task.car === car.id && p.task.ph === 'do').length;
  function advance(o, speed, dt, turn) {
    let step = speed * dt, done = false;
    while (step > 0 && !done) {
      const p = o.pts[o.i], dx = p[0] - o.x, dy = p[1] - o.y, d = Math.hypot(dx, dy);
      if (d > .01) { let da = Math.atan2(dy, dx) - o.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; o.ang += da * Math.min(1, dt * turn + .1); }
      if (d <= step) { o.x = p[0]; o.y = p[1]; step -= d; o.i++; if (o.i >= o.pts.length) done = true; } else { o.x += dx / d * step; o.y += dy / d * step; step = 0; }
    }
    return done;
  }
  function moveCars(dt) {
    const S = WW.S;
    for (const id in S.cars) {
      const car = S.cars[id], mv = car.mv; if (!mv || mv.tow) continue;
      let sp = 13;
      if (mv.push) { if (!G.pushers(car)) continue; sp = 1.15; }
      const o = { x: car.x, y: car.y, ang: car.ang, pts: mv.pts, i: mv.i };
      const done = advance(o, sp, dt, mv.push ? 1 : 3.2); car.x = o.x; car.y = o.y; car.ang = o.ang; mv.i = o.i;
      if (done) arrive(car);
    }
  }
  function arrive(car) {
    const S = WW.S; car.mv = null; car.push = null;
    if (car.dest === 'exit') { car.lot = false; car.slot = null; if (car.keep) { car.away = true; car.dest = null; } else delete S.cars[car.id]; return; }
    const s = N.slot(car.dest); car.slot = car.dest; car.dest = null; if (s) { car.x = s.x; car.y = s.y; car.ang = s.r % 2 ? (Math.cos(car.ang) >= 0 ? 0 : Math.PI) : (Math.sin(car.ang) >= 0 ? Math.PI / 2 : -Math.PI / 2); }
  }
  // ---------- эвакуатор и фургон доставки ----------
  G.tow = function (car, mode, dest) {
    const S = WW.S, r = N.roadIn(), v = { id: S.nextId++, kind: 'tow', x: r[0], y: r[1], ang: Math.PI, car: car.id, mode, dest: dest || null, st: 'go', i: 0, wait: 0 };
    if (mode === 'in') { car.mv = { tow: v.id }; const s = N.slot(dest), a = {}; a[dest] = 1; v.pts = N.vehRoute(v.x, v.y, s.x, s.y, a) || [[s.x, s.y]]; }
    else { car.mv = { tow: v.id, wait: true }; const a = {}; if (car.slot) a[car.slot] = 1; v.pts = N.vehRoute(v.x, v.y, car.x, car.y, a) || [[car.x, car.y]]; }
    S.veh.push(v); WW.emit('sound', 'engine'); return v;
  };
  G.van = function (cargo, src) {
    const S = WW.S, r = N.roadIn(), d = N.dropPoint();
    const v = { id: S.nextId++, kind: 'van', src: src || 'store', x: r[0], y: r[1], ang: Math.PI, pts: N.vehRoute(r[0], r[1], d[0], d[1]) || [d], i: 0, st: 'go', wait: 0, cargo };
    S.veh.push(v); return v;
  };
  G.unload = function (cargo) { for (const d of cargo) { if (d.item) { WW.S.parts.push(d.item); } else WW.O.delivered(d); } if (cargo.length) WW.emit('sound', 'box'); };
  function vehDone(v) {
    const S = WW.S, car = v.car && S.cars[v.car];
    if (v.kind === 'tow' && car) { if (v.mode === 'in' && car.mv && car.mv.tow === v.id) G.place(car, v.dest); else if (v.mode === 'out') { if (car.slot && S.slotCar[car.slot] === car.id) delete S.slotCar[car.slot]; car.lot = false; car.slot = null; car.mv = null; if (car.keep) car.away = true; else delete S.cars[car.id]; } }
    if (v.kind === 'van' && v.cargo) { G.unload(v.cargo); v.cargo = null; }
  }
  function moveVeh(dt) {
    const S = WW.S;
    for (let k = S.veh.length - 1; k >= 0; k--) {
      const v = S.veh[k], car = v.car && S.cars[v.car];
      if (v.kind === 'tow' && !car && v.st !== 'leave') { v.st = 'leave'; v.pts = N.vehRoute(v.x, v.y, 'exit'); v.i = 0; }
      if (v.st === 'load') {
        v.wait -= dt; if (v.wait > 0) continue;
        if (v.kind === 'tow') { if (v.mode === 'in') { G.place(car, v.dest); v.car = null; if (car.leaveAfter) { car.leaveAfter = false; v.mode = 'out'; v.car = car.id; car.mv = { tow: v.id, wait: true }; v.wait = 2; continue; } } else { if (car.slot && S.slotCar[car.slot] === car.id) delete S.slotCar[car.slot]; car.slot = null; car.mv = { tow: v.id }; v.carry = true; } }
        else { G.unload(v.cargo); v.cargo = null; }
        { const a = {}; if (v.dest) a[v.dest] = 1; for (const sl of N.slots()) if (Math.abs(sl.x - v.x) < 1.6 && Math.abs(sl.y - v.y) < 2.6) a[sl.id] = 1; v.st = 'leave'; v.pts = N.vehRoute(v.x, v.y, 'exit', 0, a); v.i = 0; } continue;
      }
      const done = advance(v, v.kind === 'tow' ? 8 : 11, dt, 3);
      if (v.kind === 'tow' && car && ((v.mode === 'in' && v.st === 'go') || v.carry)) { car.x = v.x - Math.cos(v.ang) * .9; car.y = v.y - Math.sin(v.ang) * .9; car.ang = v.ang; }
      if (!done) continue;
      if (v.st === 'go') { v.st = 'load'; v.wait = v.kind === 'tow' ? 3 : 4; }
      else { if (v.carry && car) { car.lot = false; car.mv = null; if (car.keep) car.away = true; else delete S.cars[car.id]; } S.veh.splice(k, 1); }
    }
  }
  // самовывоз: человек на своей машине на ходу забирает всё заказанное
  G.pickupCars = () => Object.values(WW.S.cars).filter(c => c.owner === 'player' && c.lot && c.slot && !c.mv && !c.order && !c.push && C.runs(c));
  G.pickup = function (pid, carId) {
    const S = WW.S, p = WW.P.byId(pid), car = S.cars[carId];
    if (!S.deliveries.length) { G.toast('Забирать нечего: заказов в пути нет.', 'info'); return false; }
    if (S.phase !== 'day' || !p || p.state !== 'work' || p.arriveAt) { G.toast('Этот человек сейчас не может поехать.', 'bad'); return false; }
    if (!car || !G.pickupCars().includes(car)) { G.toast('Нужна своя машина на ходу, без открытого наряда.', 'bad'); return false; }
    let t = 0; for (const d of S.deliveries) t = Math.max(t, D.city[d.src || 'store'].t);
    const until = S.min + t * 2 + 12; if (until > 1120) { G.toast('Не успеть до закрытия.', 'bad'); return false; }
    WW.P.drop(p); p.state = 'away'; p.awayUntil = until; p.driving = car.id;
    const out = N.route(car.x, car.y, car.slot, 'exit'); if (!out) { p.state = 'work'; p.awayUntil = 0; p.driving = null; G.toast(C.short(car) + ' заперта: выезд перекрыт другой машиной.', 'bad'); return false; }
    car.home = car.slot; car.keep = true; S.slotCar[car.home] = car.id; car.slot = null; car.dest = 'exit'; car.mv = { pts: out, i: 0 }; WW.emit('sound', 'engine');
    S.runs.push({ until, p: p.id, car: car.id, cargo: S.deliveries.splice(0) });
    G.toast(p.name + ' уехал за деталями на ' + C.short(car) + '. Вернётся к ' + U.time(until) + '.', 'info'); return true;
  };
  function runDone(r, instant) {
    const S = WW.S, car = S.cars[r.car]; G.unload(r.cargo);
    if (car) { car.keep = false; const h = car.home; car.home = null; car.away = false; car.lot = false; if (instant || !N.slot(h) || !G.send(car, h)) { const s = N.slot(h) ? h : (G.freeSlot(['proj', 'yard', 'park']) || {}).id; if (s) G.place(car, s); } }
    const p = WW.P.byId(r.p); if (p) p.driving = null;
    if (!instant) G.toast('Самовывоз вернулся: детали на складе.', 'good');
  }

  // пешие посетители (клиенты) — косметика с колбэком «дошёл до стойки»
  G.visitor = function (o) { const S = WW.S; const v = Object.assign({ id: S.nextId++, spd: 7, i: 0 }, o); S.visitors.push(v); return v; };
  G.vGo = function (v, x, y, then) { v.pts = N.path(v.x, v.y, x, y); v.i = 0; v.then = then || null; };
  function moveVisitors(dt) {
    const S = WW.S;
    for (let k = S.visitors.length - 1; k >= 0; k--) {
      const v = S.visitors[k]; if (!v.pts) continue;
      let step = v.spd * dt;
      while (step > 0 && v.pts) {
        const p = v.pts[v.i], dx = p[0] - v.x, dy = p[1] - v.y, d = Math.hypot(dx, dy);
        if (d <= step) { v.x = p[0]; v.y = p[1]; step -= d; v.i++; if (v.i >= v.pts.length) { v.pts = null; if (v.then === 'remove') S.visitors.splice(k, 1); else if (v.then === 'here') { const o = S.orders[v.order]; if (o) o.clientHere = true; } v.then = null; } }
        else { v.x += dx / d * step; v.y += dy / d * step; v.dir = Math.atan2(dy, dx); step = 0; }
      }
    }
  }
  G.visitorOf = oid => WW.S.visitors.find(v => v.order === oid);
  G.vLeave = function (oid) { const v = G.visitorOf(oid); if (v) { v.order = null; G.vGo(v, MAP.W - .5, 26.2, 'remove'); } };

  // ---------- шаг симуляции ----------
  G.step = function (dt) {
    const S = WW.S; if (S.phase !== 'day') return;
    while (dt > 0) {
      const d = Math.min(dt, .25); dt -= d;
      S.min += d;
      moveCars(d); moveVeh(d); moveVisitors(d);
      for (let i = S.runs.length - 1; i >= 0; i--) if (S.min >= S.runs[i].until) runDone(S.runs.splice(i, 1)[0]);
      if (Math.floor(S.min) !== Math.floor(S.min - d)) for (const id in S.cars) { const c = S.cars[id]; if (c.wantExit && c.lot && !c.mv) G.send(c, 'exit'); }
      WW.O.tick(d); WW.P.tick(d); WW.M.tick(d); WW.E.tick(d);
      if (S.min >= 1140) { G.endDay(); break; }
      if (S.phase !== 'day') break;
    }
  };

  G.startDay = function (first) {
    const S = WW.S;
    if (!first) {
      S.day++;
      const y = S.year0 + Math.floor(S.day / 56);
      if (y !== S.year) {
        S.year = y; G.note('С Новым ' + y + ' годом! Цены, зарплаты и ставки подросли на 3.5%.', 'story');
        for (const id in D.models) if (D.models[id].y[0] === y) { G.note('Новинка года: ' + D.models[id].make + ' ' + D.models[id].name + ' появилась у дилеров. В сервис поедет года через два.', 'info'); G.radio('Премьера: ' + D.models[id].make + ' ' + D.models[id].name + ' — в салонах города.'); }
      }
    }
    S.min = 420; S.fin.today = {}; S.phase = 'day'; S.summary = null;
    S.mods = S.mods.filter(m => m.until >= S.day);
    if (S.adDays > 0) S.adDays--;
    const se = G.season(), r = U.r();
    S.weather = se === 3 ? (r < .4 ? 'snow' : r < .7 ? 'cloud' : 'clear') : se === 1 ? (r < .22 ? 'heat' : r < .38 ? 'rain' : 'clear') : (r < .3 ? 'rain' : r < .55 ? 'cloud' : 'clear');
    WW.E.planDay();
    WW.P.startDay();
    WW.M.startDay();
    WW.O.planDay();
    WW.emit('daystart');
  };

  G.endDay = function () {
    const S = WW.S; S.min = 1140;
    WW.P.endDay(); WW.O.endDay();
    for (const v of S.veh) vehDone(v); S.veh = [];
    for (const r of S.runs) runDone(r, true); S.runs = [];
    if (WW.M.raceDue()) { S.phase = 'race'; WW.emit('race'); return; }
    G.endDay2();
  };
  G.dailyCost = function () { const S = WW.S, bays = N.slots().filter(s => s.kind === 'bay').length; return Math.round((42 + 11 * bays + (S.upg.air ? 5 : 0) + (S.upg.alarm ? 9 : 13) - N.objs('vending').length * 4) * G.px()); };
  G.endDay2 = function () {
    const S = WW.S, px = G.px();
    G.money(-G.dailyCost(), 'utilities');
    let wages = 0, paid = false;
    for (const p of S.pawns) if (!p.owner) { if (p.state !== 'absent') p.owed += p.wage * 10; }
    if (G.dow() === 4) { for (const p of S.pawns) if (!p.owner) { wages += p.owed; p.owed = 0; } if (wages > 0) { G.money(-Math.round(wages * 1.22), 'wages'); paid = true; } }
    let mort = 0;
    if (G.dow() === 6 && S.loan.bal > 0) {
      const interest = S.loan.bal * .004; mort = Math.min(S.loan.pay, S.loan.bal + interest);
      if (S.money - mort < -2500 * px) { S.loan.missed++; S.loan.bal += interest; G.note('Платёж банку пропущен (' + S.loan.missed + '/2). Банк звонит каждый час.', 'bad'); mort = 0; }
      else { S.loan.bal = Math.max(0, S.loan.bal + interest - mort); G.money(-Math.round(mort), 'mortgage'); if (S.loan.bal <= 0) G.note('Долг банку выплачен! Заправка теперь целиком твоя.', 'good'); }
    }
    if (S.day % 14 === 13 && S.taxOwed > 0) { G.money(-Math.round(S.taxOwed), 'tax'); S.taxOwed = 0; }
    // тамагочи-слой стока
    for (const id in S.cars) {
      const car = S.cars[id];
      if (car.owner !== 'player' || !car.lot) continue;
      const k = G.kindOf(car), roof = N.indoor(car.x, car.y);
      C.decay(car, 1, k === 'bay' ? .2 : roof ? .55 : 1);
      car.days = (car.days || 0) + 1;
    }
    WW.M.night(); WW.P.night(); WW.E.night(); WW.X.night();
    const t = S.fin.today; let inc = 0, exp = 0;
    for (const c in t) { if (c === 'taxHeld') continue; if (t[c] > 0) inc += t[c]; else exp += t[c]; }
    const riv = {}; for (const rv in G.rivers) riv[rv] = G.rivers[rv].reduce((a, c) => a + (t[c] || 0), 0);
    S.summary = { day: S.day, inc, exp, net: inc + exp, fin: Object.assign({}, t), riv, wages: paid ? wages : 0, mort, money: S.money, rep: G.rep(), closed: S.dayClosed || 0, stars: (S.dayStars || []).slice() };
    S.fin.hist.push({ d: S.day, net: inc + exp, money: S.money, riv, rep: G.rep() }); if (S.fin.hist.length > 120) S.fin.hist.shift();
    S.dayClosed = 0; S.dayStars = [];
    if (S.money < -2000 * px) { S.bank++; if (S.bank < 3) G.note('Касса в глубоком минусе (' + S.bank + '/3). Ещё немного — и банк заберёт мастерскую.', 'bad'); } else S.bank = 0;
    WW.E.achievements();
    if (S.bank >= 3 || S.loan.missed >= 2) { S.phase = 'over'; G.log('Банкротство. Банк забрал заправку на ' + (S.day + 1) + '-й день.', 'bad'); WW.emit('over'); return; }
    S.phase = 'summary'; WW.emit('dayend');
  };
  G.nextDay = function () { if (WW.S.phase !== 'summary') return; G.startDay(false); WW.emit('save'); };

  // ---------- тревоги: «что сейчас горит» ----------
  G.alerts = function () {
    const S = WW.S, a = [], O = WW.O;
    for (const id in S.orders) {
      const o = S.orders[id], car = S.cars[o.car]; if (!car) continue; const nm = '№' + o.id + ' ' + C.short(car);
      if (o.duePending) a.push({ sev: 2, text: nm + ': клиент ждёт, какой срок назвать', act: ['due', o.id] });
      else if (o.stage === 'intake' && !car.mv) { const w = S.min - o.t0; if (w > o.client.pat * .5) a.push({ sev: 2, text: 'Клиент ' + o.client.name + ' теряет терпение у стойки', act: ['order', o.id] }); }
      if (o.stage === 'diag' && o.decide) a.push({ sev: o.type === 'own' ? 0 : 1, text: nm + ': диагностика готова, нужна смета', act: ['order', o.id] });
      if (o.stage === 'diag' && !o.decide && !o.tests.length && !o.busy) a.push({ sev: 1, text: nm + ': выбери тесты или составь смету', act: ['order', o.id] });
      if (o.stage === 'parts') { const j = o.jobs.find(x => x.status === 'ordered'); if (j && j.eta && j.eta.day > S.day) a.push({ sev: 0, text: nm + ': ждём детали до завтра', act: ['order', o.id] }); }
      if (o.type !== 'own' && o.due && (S.day > o.due.day || (S.day === o.due.day && S.min > o.due.min)) && o.stage !== 'ready') a.push({ sev: 2, text: nm + ': срок сорван, клиент злится', act: ['order', o.id] });
      if (o.stage === 'ready' && o.clientHere && !o.desk) a.push({ sev: 1, text: nm + ': клиент пришёл за машиной — нужен человек на стойке', act: ['order', o.id] });
      if (o.findings && o.findings.length) a.push({ sev: 0, text: nm + ': при работе нашли ещё проблему — предложить клиенту?', act: ['order', o.id] });
      if (o.hold && O.needsBay(o)) a.push({ sev: 0, text: nm + ': стоит на стоянке по твоей команде', act: ['order', o.id] });
    }
    const wait = Object.values(S.orders).filter(o => O.needsBay(o) && !o.hold && S.cars[o.car] && !G.inBay(S.cars[o.car]) && !S.cars[o.car].mv).length;
    if (wait >= 2) a.push({ sev: 1, text: 'Очередь в боксы: ' + wait + ' ' + U.plural(wait, 'машина ждёт', 'машины ждут', 'машин ждут') + ' подъёмник', act: ['panel', 'orders'] });
    for (const id in S.cars) { const c = S.cars[id]; if (c.wantExit && c.lot) a.push({ sev: 2, text: C.short(c) + ' не может выехать: дорогу перекрыла другая машина', act: ['car', c.id] }); }
    for (const id in S.orders) { const o = S.orders[id]; if (o.blocked) a.push({ sev: 2, text: '№' + o.id + ': машину не достать — заперта другой или нет дороги до бокса', act: ['order', o.id] }); }
    const push = Object.values(S.cars).filter(c => c.push && !(c.mv && c.mv.push && G.pushers(c)));
    if (push.length) a.push({ sev: S.pawns.some(p => p.pri.haul && p.state === 'work') ? 0 : 2, text: C.short(push[0]) + ' не на ходу: ждёт, пока её перекатят' + (S.pawns.some(p => p.pri.haul) ? '' : ' — ни у кого не включён «Перегон»'), act: ['panel', 'people'] });
    for (const of of S.offers) { const car = S.cars[of.car]; if (car) a.push({ sev: 1, text: 'Покупатель даёт ' + U.money(of.price) + ' за ' + C.short(car), act: ['car', car.id] }); }
    for (const id in S.cars) { const car = S.cars[id]; if (car.owner === 'player' && car.sale && S.day - car.sale.day >= 12) a.push({ sev: 0, text: C.short(car) + ' стоит на продаже ' + (S.day - car.sale.day) + ' дн. — снизить цену?', act: ['car', car.id] }); }
    if (S.auction && S.auction.day === S.day && !S.auction.done && S.min >= S.auction.open && S.min < S.auction.close) a.push({ sev: 1, text: 'Аукцион штрафстоянки идёт до ' + U.time(S.auction.close), act: ['panel', 'market'] });
    if (S.race && S.race.day === S.day && !S.race.entry) a.push({ sev: 0, text: 'Сегодня вечером: ' + S.race.name + '. Заявиться?', act: ['panel', 'race'] });
    const owed = S.pawns.reduce((s, p) => s + (p.owed || 0), 0), dl = (4 - G.dow() + 7) % 7;
    if (owed > 0 && S.money < owed * 1.22 && dl <= 2) a.push({ sev: 2, text: 'В пятницу зарплата ' + U.money(owed * 1.22) + ', а в кассе ' + U.money(S.money), act: ['panel', 'fin'] });
    if (S.money < 0) a.push({ sev: 2, text: 'Касса в минусе: покупки и найм заблокированы', act: ['panel', 'fin'] });
    for (const p of S.pawns) if (!p.owner && p.mood < 25 && p.state === 'work') a.push({ sev: 1, text: p.name + ' на грани срыва (настроение ' + Math.round(p.mood) + ')', act: ['pawn', p.id] });
    a.sort((x, y) => y.sev - x.sev);
    return a;
  };

  // ---------- сейвы ----------
  G.save = () => JSON.stringify(WW.S);
  G.load = function (json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json; if (!s || s.v < 2 || s.v > 5) return false;
    WW.S = s; N.dirty();
    if (s.v < 4) { // миграция: карта не по сетке → сетка с дорогами; новые системы получают значения по умолчанию
      s.parts = s.parts || []; s.bench = s.bench || []; s.junk = s.junk || []; s.veh = []; s.runs = []; if (!s.set.due) { s.set.due = 'ask'; s.set.duePct = 100; }
      for (const id in s.cars) { const c = s.cars[id]; if (c.lot == null) c.lot = !!(c.slot || c.mv); }
      N.migrate(s); s.site = 'gas';
      for (const p of s.pawns.concat(s.cands)) {
        const old = p.pri || {}; if (!p.spec) { p.spec = D.roleSpec[p.role] || 'general'; p.pri = { desk: old.desk || 0, diag: old.diag || 0, eng: old.mech || 0, chassis: old.mech || 0, elec: old.mech || 0, body: old.body || 0, haul: p.role === 'recep' ? 0 : 3 }; }
        if (p.pri.clean == null) p.pri.clean = D.specs[p.spec] ? D.specs[p.spec].pri.clean : 3; p.task = null; p.path = null; if (p.state === 'away') p.state = 'work';
      }
      for (const id in s.orders) { const o = s.orders[id]; o.busy = null; o.desk = null; o.duePending = false; if (o.client && !o.client.temper) o.client.temper = 'normal'; for (const j of o.jobs) if (j.status === 'doing') j.status = 'ready'; }
      for (const d of s.deliveries) if (!d.src) d.src = 'store';
      s.visitors = []; s.champ = { pts: {}, round: 0, season: 0 }; s.raceCar = null; s.setup = { gear: 50, susp: 50, tyre: 50 }; s.race = null; delete s.upg.canopy; s.v = 4; if (!s.junk.length) WW.M.junkRefresh();
    }
    if (s.v < 5) { for (const id in s.cars) D.migrateCar(s.cars[id]); for (const it of s.parts) if (it.node === 'lights') it.node = 'hl_fl'; for (const id in s.orders) for (const j of s.orders[id].jobs) if (j.node === 'lights') j.node = 'hl_fl'; s.v = 5; }
    if (WW.X && WW.X.migrate) WW.X.migrate(s);
    N.dirty(); return true;
  };

  G.buyUpg = function (id) {
    const S = WW.S, u = D.upg[id], cost = Math.round(u.cost * G.px() / 5) * 5;
    if (S.upg[id] || (u.req && !S.upg[u.req])) return false;
    if (id === 'land' && N.lotFull()) { G.toast('Участок и так занимает всё, что можно.', 'info'); return false; }
    if (S.money < cost) { G.toast('Не хватает денег: нужно ' + U.money(cost), 'bad'); return false; }
    G.money(-cost, 'upgrade'); S.upg[id] = true; if (id === 'land') N.expand();
    G.note('Куплено: ' + u.n + ' за ' + U.money(cost) + '.', 'good'); WW.emit('sound', 'build');
    return true;
  };
  G.buyAd = function () {
    const S = WW.S, cost = Math.round(80 * G.px());
    if (S.money < cost) { G.toast('Не хватает денег на рекламу', 'bad'); return; }
    G.money(-cost, 'marketing'); S.adDays = 5; G.note('Объявление в газете и ролик на радио: +35% клиентов на 5 дней.', 'good');
  };
  G.payLoan = function (amt) {
    const S = WW.S; amt = Math.min(amt, S.loan.bal, Math.max(0, S.money)); if (amt <= 0) return;
    S.loan.bal -= amt; G.money(-amt, 'mortgage'); G.note('Досрочно погашено ' + U.money(amt) + '. Остаток долга ' + U.money(S.loan.bal) + '.', 'good');
  };
  // банк: кредит под залог мастерской, лимит растёт с репутацией
  G.loanLimit = () => Math.max(0, Math.round((6000 + G.rep() * 260) * G.px() / 500) * 500 - Math.round(WW.S.loan.bal));
  G.takeLoan = function (amt) {
    const S = WW.S; if (amt <= 0 || amt > G.loanLimit()) { G.toast('Банк столько не даст.', 'bad'); return; }
    S.loan.bal += amt; S.loan.pay = Math.max(S.loan.pay, Math.round(S.loan.bal * .012 / 5) * 5 + 60); G.money(amt, 'loan');
    G.note('Банк выдал ' + U.money(amt) + '. Долг ' + U.money(S.loan.bal) + ', платёж ' + U.money(S.loan.pay) + ' в неделю.', 'info');
  };
})(globalThis.WW);
