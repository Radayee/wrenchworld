// WRENCHWORLD — ядро симуляции: состояние, время, деньги, движение машин, сутки.
// Всё состояние — чистые данные в WW.S (сейв = JSON). Рендер и интерфейс сюда не заглядывают.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, MAP = D.MAP, G = WW.G = {};
  const cat = { labor: 'Работа (нормо-часы)', partsRev: 'Детали клиентам', diag: 'Диагностика', tips: 'Чаевые', carSale: 'Продажа машин', prize: 'Призовые',
    partsCost: 'Закупка деталей', ownParts: 'Детали на свой сток', carBuy: 'Покупка машин', wages: 'Зарплата', mortgage: 'Ипотека', utilities: 'Коммуналка и страховка',
    upgrade: 'Оборудование и стройка', marketing: 'Реклама', tax: 'Налог с продаж', raceFee: 'Гоночные взносы', misc: 'Прочее', fine: 'Штрафы и компенсации', taxHeld: 'Налог с продаж (собран)' };
  G.catName = cat;
  G.rivers = { service: ['labor', 'partsRev', 'diag', 'tips', 'partsCost'], flip: ['carSale', 'carBuy', 'ownParts'], race: ['prize', 'raceFee'] };

  G.newGame = function (scnId, seed) {
    const sc = D.scenarios[scnId] || D.scenarios.legacy;
    const S = WW.S = {
      v: 2, rng: (seed || Date.now()) >>> 0, scn: scnId, day: 0, min: 420, year: sc.year, year0: sc.year, phase: 'day',
      money: sc.money, loan: { bal: sc.loan, pay: Math.round(sc.loan * .009 / 5) * 5 + (sc.loan ? 40 : 0), missed: 0 }, taxOwed: 0, bank: 0,
      rep: { q: 32, h: 40, s: 32, p: 40 },
      set: { rate: D.marketRate(sc.year), markup: .4, diagFee: Math.round(20 * D.infl(sc.year)), autoDiag: true, autoEst: false, interv: true, fast: true, rustK: 1, tut: !!sc.tut, pauseEv: true },
      upg: {}, adDays: 0, cars: {}, slotCar: {}, orders: {}, nextId: 1, pawns: [], cands: [], visitors: [], arrivals: [], deliveries: [], comebacks: [], trips: [],
      listings: [], offers: [], auction: null, race: null, trend: {}, mods: [], evq: [], evLast: {}, log: [], radio: [],
      fin: { today: {}, hist: [], total: {} }, stats: { orders: 0, sold: 0, bought: 0, comebacks: 0, races: 0, wins: 0, stars: [], flipProfit: 0, best: 0, hired: 0 },
      reviews: [], tut: { seen: {}, cur: null }, weather: 'clear', interv: { day: -1, n: 0 }, ach: {}, summary: null, tension: 0, calm: 0, enc: {}
    };
    for (const id in D.models) S.trend[id] = 1;
    // хозяин
    const k = sc.skill, sk = {}; D.skillIds.forEach(s => sk[s] = U.clamp(k + U.ri(-2, 2), 0, 20));
    sk.diag = U.clamp(k + 1, 0, 20); sk.talk = Math.max(sk.talk, 6); sk.drive = Math.max(sk.drive, 7);
    S.pawns.push({ id: S.nextId++, name: 'Хозяин', owner: true, role: 'owner', skills: sk, xp: {}, pas: { eng: 1, diag: 1 }, traits: [], known: 9, wage: 0, owed: 0, mood: 62, thoughts: [],
      x: 30.5, y: 12, path: null, task: null, pri: Object.assign({}, D.roles.owner.pri), hours: 0, state: 'work', fam: {}, hired: 0, look: { skin: 2, hat: 1, hair: 0 }, lunch: -1 });
    // машины деда
    const start = [
      { model: 'bug', year: 1971, quality: 'private', hid: 0, set: { start: 4, fuel: 52, ign: 58, block: 66, head: 70, gearbox: 71, brakes: 48, wheels: 55 }, rustSet: { floor: 34, sills: 28, frame: 12 }, note: 'Дед ездил на нём за запчастями. Последний год стоит — «что-то с аккумулятором».' },
      { model: 'caprio', year: 1979, quality: 'private', hid: 0, set: { block: 21, gearbox: 43, start: 74, fuel: 70, ign: 72 }, note: 'Caprio с «лёгким стуком». Дед взял его за $900 и не успел заняться.' },
      { model: 'firebolt', year: 1978, quality: 'barn', set: { block: 74, head: 71, gearbox: 68, interior: 31 }, rustSet: { rarch: 46, sills: 30, floor: 26, frame: 14 }, note: 'Firebolt T/A под брезентом. Попс говорит, дед мечтал выкатить его на дрэг-стрип.' }
    ];
    const slots = ['proj1', 'proj2', 'proj3'];
    for (let i = 0; i < sc.cars; i++) {
      const o = Object.assign({}, start[(i + (sc.cars === 1 ? 2 : 0)) % 3]);
      if (o.year > S.year - 2) { o.year = Math.max(D.models[o.model].y[0], S.year - 9); }
      const car = C.gen(Object.assign(o, { owner: 'player' }));
      car.note = o.note; car.cost = 0; car.title = 'clean';
      C.reveal(car, { nodes: { panels: 30, interior: 30, wheels: 35 }, rust: { farch: 30, rarch: 30, doors: 30 } }, 0);
      G.place(car, slots[i]);
    }
    WW.P.refreshCands(true);
    WW.M.init();
    G.log(sc.n + ': ' + sc.d, 'story');
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
  G.slotList = () => MAP.slots.filter(s => !s.upg || WW.S.upg[s.upg]);
  G.slot = id => MAP.slots.find(s => s.id === id);
  G.freeSlot = function (kinds) { const S = WW.S; for (const k of kinds) for (const s of G.slotList()) if (s.kind === k && !S.slotCar[s.id]) return s; return null; };
  G.countFree = kind => G.slotList().filter(s => s.kind === kind && !WW.S.slotCar[s.id]).length;
  G.place = function (car, slotId) { const S = WW.S, s = G.slot(slotId); if (car.slot) delete S.slotCar[car.slot]; car.slot = slotId; S.slotCar[slotId] = car.id; car.x = s.x; car.y = s.y; car.ang = -Math.PI / 2; car.mv = null; car.dest = null; };
  G.kindOf = car => car.slot ? G.slot(car.slot).kind : null;
  G.inBay = car => !car.mv && car.slot && G.slot(car.slot).kind === 'bay';
  G.send = function (car, dest) {
    const S = WW.S;
    let ax = car.x, ay = car.y, la;
    if (car.mv && car.dest && car.dest !== 'exit' && S.slotCar[car.dest] === car.id) delete S.slotCar[car.dest];
    if (car.slot) { la = G.slot(car.slot).lane; delete S.slotCar[car.slot]; car.slot = null; }
    else if (car.mv) la = Math.abs(car.y - MAP.lane2) < Math.abs(car.y - MAP.lane1) ? MAP.lane2 : (car.y > 26 ? MAP.roadY : MAP.lane1);
    else { ax = MAP.W + 4; ay = MAP.roadY; la = MAP.roadY; car.x = ax; car.y = ay; car.ang = Math.PI; }
    let bx, by, lb;
    if (dest === 'exit') { bx = -5; by = MAP.roadY; lb = MAP.roadY; }
    else { const s = G.slot(dest); bx = s.x; by = s.y; lb = s.lane; S.slotCar[dest] = car.id; }
    const pts = [];
    if (Math.abs(ay - la) > .05) pts.push([ax, la]);
    if (la !== lb) { pts.push([MAP.vx, la]); pts.push([MAP.vx, lb]); }
    pts.push([bx, lb]); if (Math.abs(by - lb) > .05) pts.push([bx, by]);
    car.mv = { pts, i: 0 }; car.dest = dest; car.lift = 0; car.hood = 0;
    WW.emit('sound', C.runs(car) ? 'engine' : 'push');
  };
  function moveCars(dt) {
    const S = WW.S;
    for (const id in S.cars) {
      const car = S.cars[id]; if (!car.mv) continue;
      let step = (C.runs(car) ? 13 : 4.5) * dt;
      while (step > 0 && car.mv) {
        const p = car.mv.pts[car.mv.i], dx = p[0] - car.x, dy = p[1] - car.y, d = Math.hypot(dx, dy);
        if (d > .01) { let ta = Math.atan2(dy, dx), da = ta - car.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; car.ang += da * Math.min(1, dt * 3.2 + .12); }
        if (d <= step) { car.x = p[0]; car.y = p[1]; step -= d; car.mv.i++; if (car.mv.i >= car.mv.pts.length) arrive(car); }
        else { car.x += dx / d * step; car.y += dy / d * step; step = 0; }
      }
    }
  }
  function arrive(car) {
    const S = WW.S; car.mv = null;
    if (car.dest === 'exit') { if (car.keep) { car.away = true; car.dest = null; } else delete S.cars[car.id]; return; }
    car.slot = car.dest; car.dest = null; car.ang = -Math.PI / 2;
  }
  // пешие посетители (клиенты) — косметика с колбэком «дошёл до стойки»
  G.visitor = function (o) { const S = WW.S; const v = Object.assign({ id: S.nextId++, spd: 7, i: 0 }, o); S.visitors.push(v); return v; };
  G.vGo = function (v, pts, then) { v.pts = pts; v.i = 0; v.then = then || null; };
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
  G.vLeave = function (oid) { const v = G.visitorOf(oid); if (v) { v.order = null; G.vGo(v, [MAP.spots.door.slice(), MAP.spots.gate.slice(), [MAP.spots.gate[0] + 14, 26.6]], 'remove'); } };

  // ---------- шаг симуляции ----------
  G.step = function (dt) {
    const S = WW.S; if (S.phase !== 'day') return;
    while (dt > 0) {
      const d = Math.min(dt, .25); dt -= d;
      S.min += d;
      moveCars(d); moveVisitors(d);
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
    // погода
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
    if (WW.M.raceDue()) { S.phase = 'race'; WW.emit('race'); return; }
    G.endDay2();
  };
  G.endDay2 = function () {
    const S = WW.S, px = G.px();
    const bays = G.slotList().filter(s => s.kind === 'bay').length;
    const util = Math.round((20 + 7 * bays + (S.upg.air ? 5 : 0) + (S.upg.alarm ? 9 : 13)) * px);
    G.money(-util, 'utilities');
    let wages = 0, paid = false;
    for (const p of S.pawns) if (!p.owner) { if (p.state !== 'absent') p.owed += p.wage * 10; }
    if (G.dow() === 4) { for (const p of S.pawns) if (!p.owner) { wages += p.owed; p.owed = 0; } if (wages > 0) { G.money(-Math.round(wages * 1.0765), 'wages'); paid = true; } }
    let mort = 0;
    if (G.dow() === 6 && S.loan.bal > 0) {
      const interest = S.loan.bal * .004; mort = Math.min(S.loan.pay, S.loan.bal + interest);
      if (S.money - mort < -2500 * px) { S.loan.missed++; S.loan.bal += interest; G.note('Платёж по ипотеке пропущен (' + S.loan.missed + '/2). Банк звонит каждый час.', 'bad'); mort = 0; }
      else { S.loan.bal = Math.max(0, S.loan.bal + interest - mort); G.money(-Math.round(mort), 'mortgage'); if (S.loan.bal <= 0) G.note('Ипотека выплачена! Заправка теперь целиком твоя.', 'good'); }
    }
    if (S.day % 14 === 13 && S.taxOwed > 0) { G.money(-Math.round(S.taxOwed), 'tax'); S.taxOwed = 0; }
    // тамагочи-слой стока
    for (const id in S.cars) {
      const car = S.cars[id];
      if (car.owner !== 'player' || !car.slot) continue;
      const k = G.kindOf(car);
      C.decay(car, 1, k === 'bay' ? .2 : (k === 'sale' && S.upg.canopy ? .6 : 1));
      car.days = (car.days || 0) + 1;
    }
    WW.M.night(); WW.P.night(); WW.E.night();
    // сводка и банкротство
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
      if (o.stage === 'intake' && !car.mv) { const w = S.min - o.t0; if (w > o.client.pat * .5) a.push({ sev: 2, text: 'Клиент ' + o.client.name + ' теряет терпение у стойки', act: ['order', o.id] }); }
      if (o.stage === 'diag' && o.decide) a.push({ sev: o.type === 'own' ? 0 : 1, text: nm + ': диагностика готова, нужна смета', act: ['order', o.id] });
      if (o.stage === 'diag' && !o.decide && !o.tests.length && !o.busy) a.push({ sev: 1, text: nm + ': выбери тесты или составь смету', act: ['order', o.id] });
      if (o.stage === 'parts') { const j = o.jobs.find(x => x.status === 'ordered'); if (j && j.eta && j.eta.day > S.day) a.push({ sev: 0, text: nm + ': ждём детали до завтра', act: ['order', o.id] }); }
      if (o.type !== 'own' && o.due && (S.day > o.due.day || (S.day === o.due.day && S.min > o.due.min)) && o.stage !== 'ready') a.push({ sev: 2, text: nm + ': срок сорван, клиент злится', act: ['order', o.id] });
      if (o.stage === 'ready' && o.clientHere && !o.desk) a.push({ sev: 1, text: nm + ': клиент пришёл за машиной — нужен человек на стойке', act: ['order', o.id] });
      if (o.findings && o.findings.length) a.push({ sev: 0, text: nm + ': при работе нашли ещё проблему — предложить клиенту?', act: ['order', o.id] });
    }
    const wait = Object.values(S.orders).filter(o => O.needsBay(o) && S.cars[o.car] && !G.inBay(S.cars[o.car]) && !S.cars[o.car].mv).length;
    if (wait >= 2) a.push({ sev: 1, text: 'Очередь в боксы: ' + wait + ' ' + U.plural(wait, 'машина ждёт', 'машины ждут', 'машин ждут') + ' подъёмник', act: ['panel', 'orders'] });
    for (const of of S.offers) { const car = S.cars[of.car]; if (car) a.push({ sev: 1, text: 'Покупатель даёт ' + U.money(of.price) + ' за ' + C.short(car), act: ['car', car.id] }); }
    for (const id in S.cars) { const car = S.cars[id]; if (car.owner === 'player' && car.sale && S.day - car.sale.day >= 12) a.push({ sev: 0, text: C.short(car) + ' стоит на продаже ' + (S.day - car.sale.day) + ' дн. — снизить цену?', act: ['car', car.id] }); }
    if (S.auction && S.auction.day === S.day && !S.auction.done && S.min >= S.auction.open && S.min < S.auction.close) a.push({ sev: 1, text: 'Аукцион штрафстоянки идёт до ' + U.time(S.auction.close), act: ['panel', 'market'] });
    if (S.race && S.race.day === S.day && !S.race.entry) a.push({ sev: 0, text: 'Сегодня вечером: ' + S.race.name + '. Заявиться?', act: ['panel', 'race'] });
    const owed = S.pawns.reduce((s, p) => s + (p.owed || 0), 0), dl = (4 - G.dow() + 7) % 7;
    if (owed > 0 && S.money < owed * 1.1 && dl <= 2) a.push({ sev: 2, text: 'В пятницу зарплата ' + U.money(owed * 1.08) + ', а в кассе ' + U.money(S.money), act: ['panel', 'fin'] });
    if (S.money < 0) a.push({ sev: 2, text: 'Касса в минусе: покупки и найм заблокированы', act: ['panel', 'fin'] });
    for (const p of S.pawns) if (!p.owner && p.mood < 25 && p.state === 'work') a.push({ sev: 1, text: p.name + ' на грани срыва (настроение ' + Math.round(p.mood) + ')', act: ['pawn', p.id] });
    a.sort((x, y) => y.sev - x.sev);
    return a;
  };

  // ---------- сейвы ----------
  G.save = () => JSON.stringify(WW.S);
  G.load = function (json) { const s = typeof json === 'string' ? JSON.parse(json) : json; if (!s || s.v !== 2) return false; WW.S = s; WW.P.resetPaths(); return true; };

  // покупка апгрейда
  G.buyUpg = function (id) {
    const S = WW.S, u = D.upg[id], cost = Math.round(u.cost * G.px() / 5) * 5;
    if (S.upg[id] || (u.req && !S.upg[u.req])) return false;
    if (S.money < cost) { G.toast('Не хватает денег: нужно ' + U.money(cost), 'bad'); return false; }
    G.money(-cost, 'upgrade'); S.upg[id] = true; WW.P.resetPaths();
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
    S.loan.bal -= amt; G.money(-amt, 'mortgage'); G.note('Досрочно погашено ' + U.money(amt) + ' ипотеки. Остаток ' + U.money(S.loan.bal) + '.', 'good');
  };
})(globalThis.WW);
