// WRENCHWORLD — купи-продай (объявления, торг, аукцион, продажа) и гонки v1 (дрэг, автокросс, Junkyard 24).
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, M = WW.M = {};
  const G = () => WW.G, P = () => WW.P;
  const gauss = () => (U.r() + U.r() + U.r() - 1.5) / .5;
  const r5 = (v, k) => Math.round(v / (k || 5)) * (k || 5);

  M.init = function () { for (let i = 0; i < 5; i++) M.addListing(); };
  M.pool = () => Object.values(D.models).filter(m => m.y[0] <= WW.S.year);

  M.addListing = function (o) {
    const S = WW.S; o = o || {};
    const st = o.seller || U.wpick(Object.keys(D.sellers), k => ({ widow: 1, curb: 1.6, fan: 1, moving: 1.3, knowit: 1, farmer: .7 })[k]);
    const sd = D.sellers[st];
    const m = o.model ? D.models[o.model] : U.wpick(M.pool(), m => m.share + (m.curve === 'cult' ? 1 : 0) + .4);
    const q = o.quality || (st === 'fan' && U.chance(.6) ? 'good' : st === 'farmer' && U.chance(.5) ? 'barn' : 'private');
    const car = C.gen({ model: m.id, quality: q, hid: sd.hid, lie: sd.lie, owner: 'seller', year: o.year });
    if (sd.docs) { car.docs.book = true; car.docs.receipts = true; }
    let V = C.value(car, 't'); if (st === 'widow' || st === 'farmer') V *= U.rf(.8, 1.15);
    const ask = Math.max(100, r5(V * U.rf(sd.ask[0], sd.ask[1]) * (o.askK || 1), 25));
    const fn = U.pick(D.first);
    const lst = { id: S.nextId++, car: car.id, st, name: fn + ' ' + U.pick(D.last), ask, cur: ask, min: Math.round(ask * U.rf(sd.min[0], sd.min[1])), rounds: U.ri(sd.rounds[0], sd.rounds[1]), days: o.days || U.ri(3, 7), text: U.pick(sd.txt), insp: false, runs: C.runs(car), barn: !!o.barn, said: [] };
    C.reveal(car, { nodes: { panels: 38, interior: 38 }, rust: { farch: 40, rarch: 40, doors: 40 } }, 0);
    if (!lst.runs) lst.text += ' Не на ходу.';
    if (car.title !== 'clean') lst.text += ' Тайтл: ' + D.titles[car.title].n + '.';
    S.listings.push(lst); return lst;
  };
  M.lst = id => WW.S.listings.find(l => l.id === id);
  function removeLst(lst, keepCar) { const S = WW.S; S.listings = S.listings.filter(l => l !== lst); if (!keepCar) delete S.cars[lst.car]; S.trips = S.trips.filter(t => t.lst !== lst.id); }

  // выезд на осмотр: человек пропадает из мастерской
  M.inspect = function (lid, pid) {
    const S = WW.S, lst = M.lst(lid), p = P().byId(pid) || S.pawns[0], g = G();
    if (!lst || lst.insp || S.trips.some(t => t.lst === lid)) return false;
    if (S.phase !== 'day' || p.state !== 'work' || p.arriveAt) { g.toast(p.name + ' сейчас не может поехать.', 'bad'); return false; }
    if (S.min > 1040) { g.toast('Поздно ехать на осмотр — продавец ждёт завтра.', 'bad'); return false; }
    P().drop(p); p.state = 'away'; p.awayUntil = S.min + U.rf(65, 90);
    S.trips.push({ until: p.awayUntil, lst: lid, p: p.id });
    g.toast(p.name + ' уехал смотреть ' + C.short(S.cars[lst.car]) + '. Вернётся к ' + U.time(p.awayUntil) + '.', 'info');
    return true;
  };
  function tripDone(t) {
    const S = WW.S, lst = M.lst(t.lst), p = P().byId(t.p), g = G(); if (!lst || !p) return;
    const car = S.cars[lst.car], sk = p.skills.diag;
    C.reveal(car, D.tests.walk, sk); if (lst.runs) C.reveal(car, D.tests.drive, sk);
    C.reveal(car, { nodes: { start: 20, cool: 28, fuel: 28, ign: 28, frame: 26 }, rust: { floor: 30, frame: 32 } }, sk);
    if (S.upg.gauge) { C.reveal(car, D.tests.gauge, sk); car.known.accident = true; }
    lst.insp = true; P().xp(p, 'diag', 1); P().xp(p, 'trade', .5);
    const lv = M.levers(lst);
    g.note(p.name + ' осмотрел ' + C.name(car) + ': ' + (lv.length ? 'нашёл ' + lv.length + ' ' + U.plural(lv.length, 'рычаг', 'рычага', 'рычагов') + ' для торга.' : 'явных дефектов не видно.') + (S.upg.gauge && car.hidden.accident ? ' Толщиномер показал перекрас — был удар.' : ''), 'info', ['lst', lst.id]);
  }
  M.vin = function (lid) {
    const S = WW.S, lst = M.lst(lid), g = G(), cost = Math.round(15 * g.px()); if (!lst) return;
    const car = S.cars[lst.car]; if (car.known.vin) return;
    if (S.money < cost) { g.toast('Не хватает на отчёт.', 'bad'); return; }
    g.money(-cost, 'misc'); car.known.vin = true;
    if (car.hidden.rollback) car.known.rollback = true;
    if (car.hidden.accident && U.chance(.7)) car.known.accident = true;
    g.toast('Отчёт по VIN ' + car.vin + ': ' + (car.hidden.rollback ? 'пробег скручен! Реальный около ' + Math.round(car.milesTrue / 1000) + ' тыс. миль. ' : 'пробег сходится. ') + (car.known.accident && car.hidden.accident ? 'Есть запись о ДТП. ' : 'ДТП не заявлено. ') + (car.matching ? 'Мотор родной.' : 'Мотор не родной по коду.'), car.hidden.rollback ? 'bad' : 'info', ['lst', lid]);
  };
  // найденные дефекты — рычаги торга силой в стоимость устранения
  M.levers = function (lst) {
    const S = WW.S, car = S.cars[lst.car], m = C.model(car), px = G().px(), out = [];
    for (const id in car.nodes) { const n = car.nodes[id], nd = D.nodes[id]; if (n.hi < D.FAULT) out.push({ t: nd.n + ' ' + n.lo + '–' + n.hi + '%', v: Math.round(nd.part * m.pm * px + (nd.repl || nd.rep) * D.marketRate(S.year)) }); }
    for (const z of D.rustIds) if (D.rust[z].struct && car.rust[z].lo > 40) out.push({ t: 'Сквозная ржавчина: ' + D.rust[z].n.toLowerCase(), v: Math.round(lst.ask * .07) });
    if (car.known.rollback) out.push({ t: 'Скрученный пробег', v: Math.round(lst.ask * .12) });
    if (car.known.accident && car.hidden.accident) out.push({ t: 'Скрытое ДТП', v: Math.round(lst.ask * .07) });
    if (car.known.vin && !car.matching && m.curve === 'cult') out.push({ t: 'Не родной мотор', v: Math.round(lst.ask * .08) });
    return out;
  };
  M.minEff = function (lst) { const lv = M.levers(lst).reduce((s, x) => s + x.v, 0); return Math.max(lst.ask * .42, lst.min - Math.min(lv * .45, lst.ask * .18) * (lst.st === 'knowit' ? .5 : 1)); };
  M.read = function (lst) { // «температура» продавца по навыку Торговля
    const best = Math.max(...WW.S.pawns.filter(p => p.state !== 'absent').map(p => p.skills.trade));
    const err = Math.max(.03, .3 - best * .015), me = M.minEff(lst), h = U.hash('m' + lst.id) / 4294967296;
    return { lo: r5(me * (1 - err * (.4 + h * .6)), 5), hi: r5(me * (1 + err * (1 - h * .6)), 5), rounds: lst.rounds, trade: best };
  };
  M.offer = function (lid, X) {
    const S = WW.S, lst = M.lst(lid), g = G(); if (!lst) return null; X = Math.round(X);
    const car = S.cars[lst.car], me = M.minEff(lst);
    if (X >= lst.cur) return M.buy(lid, lst.cur) ? { res: 'deal' } : { res: 'fail' };
    if (lst.final) { if (X >= lst.final) return M.buy(lid, lst.final) ? { res: 'deal' } : { res: 'fail' }; removeLst(lst); g.toast(lst.name + ': «Я же сказал — последняя цена». Трубку бросили.', 'bad'); return { res: 'gone' }; }
    if (X >= me) return M.buy(lid, X) ? { res: 'deal' } : { res: 'fail' };
    if (X < me * .72) {
      lst.rounds -= 2; lst.said.push('«' + U.money(X) + '? Вы издеваетесь?»');
      if (lst.rounds <= 0) { removeLst(lst); g.toast(lst.name + ' обиделся на лоуболл и снял объявление.', 'bad'); return { res: 'gone' }; }
      return { res: 'offend' };
    }
    lst.rounds--; lst.cur = Math.min(lst.cur, r5(Math.max(me * U.rf(1.0, 1.05), lst.cur - (lst.cur - X) * U.rf(.35, .6)), 5));
    if (lst.rounds <= 0) { lst.final = lst.cur; lst.said.push('«' + U.money(lst.cur) + ' — и это последняя цена».'); return { res: 'final' }; }
    lst.said.push('«Могу уступить до ' + U.money(lst.cur) + '».'); return { res: 'counter' };
  };
  M.buy = function (lid, price) {
    const S = WW.S, lst = M.lst(lid), g = G(); if (!lst) return false;
    const car = S.cars[lst.car], slot = g.freeSlot(['proj']);
    const tow = (!lst.runs && !S.upg.trailer) ? Math.round(35 * g.px()) : 0;
    if (!slot) { g.toast('Нет места под проект: продай что-нибудь или размечай двор.', 'bad'); return false; }
    if (S.money < price + tow) { g.toast('Не хватает денег: нужно ' + U.money(price + tow), 'bad'); return false; }
    g.money(-price, 'carBuy'); if (tow) g.money(-tow, 'carBuy');
    car.owner = 'player'; car.cost = price + tow; car.days = 0; car.boughtFrom = D.sellers[lst.st].n; S.stats.bought++;
    removeLst(lst, true); g.send(car, slot.id);
    g.note('Куплен ' + C.name(car) + ' за ' + U.money(price) + (tow ? ' + эвакуатор ' + U.money(tow) : '') + ' (' + D.sellers[lst.st].n.toLowerCase() + ', просили ' + U.money(lst.ask) + ').', 'good', ['car', car.id]);
    car.hist.push({ d: S.day, y: S.year, t: 'Куплена мастерской за ' + U.money(price) });
    WW.emit('sound', 'cash'); return true;
  };

  // ---------- продажа ----------
  M.list = function (car, ask) {
    const S = WW.S, g = G(); if (car.order) { g.toast('Сначала закрой наряд по этой машине.', 'bad'); return false; }
    const slot = car.sale ? null : g.freeSlot(['sale']);
    if (!car.sale && !slot) { g.toast('Нет места на витрине у дороги.', 'bad'); return false; }
    car.sale = { ask: Math.round(ask), day: car.sale ? car.sale.day : S.day };
    if (slot) { g.send(car, slot.id); g.note(C.name(car) + ' выставлен на продажу за ' + U.money(ask) + '.', 'info', ['car', car.id]); }
    return true;
  };
  M.unlist = function (car) { const g = G(), slot = g.freeSlot(['proj']); if (!slot) { g.toast('Нет места в проектах.', 'bad'); return; } car.sale = null; WW.S.offers = WW.S.offers.filter(o => o.car !== car.id); g.send(car, slot.id); };
  function sold(car, price, how) {
    const S = WW.S, g = G(), profit = price - car.cost;
    g.money(price, 'carSale'); S.stats.sold++; S.stats.flipProfit += profit; S.stats.best = Math.max(S.stats.best, profit);
    S.offers = S.offers.filter(o => o.car !== car.id);
    g.log(C.name(car) + ' ' + how + ' за ' + U.money(price) + '. Вложено ' + U.money(car.cost) + ', ' + (profit >= 0 ? 'прибыль ' : 'убыток ') + U.money(Math.abs(profit)) + ', на площадке ' + (car.days || 0) + ' дн.' + (car.hist.length > 2 ? ' В её истории навсегда: «восстановлена в ' + S.year + ' году на заправке Попса».' : ''), profit >= 0 ? 'story' : 'bad');
    g.toast(C.short(car) + ' ' + how + ': ' + U.money(price) + ' (' + (profit >= 0 ? '+' : '−') + U.money(Math.abs(profit)).replace('−', '') + ')', profit >= 0 ? 'good' : 'bad');
    if (profit > 0 && C.score(car) > 70) g.repAdd('q', 1);
    car.owner = 'sold'; car.sale = null; if (car.order) { const o = S.orders[car.order]; if (o) WW.O.drop(o, false); }
    WW.emit('paid', { total: price, x: car.x, y: car.y, stars: 0 }); WW.emit('sound', 'cash');
    if (car.slot || car.mv) g.send(car, 'exit'); else delete S.cars[car.id];
  }
  M.accept = function (oid) { const S = WW.S, of = S.offers.find(o => o.id === oid); if (!of) return; const car = S.cars[of.car]; if (car) sold(car, of.price, 'продан (' + of.who.toLowerCase() + ')'); };
  M.decline = function (oid) { WW.S.offers = WW.S.offers.filter(o => o.id !== oid); };
  M.wholesale = car => r5(C.value(car, 't') * (.7 + (U.hash('w' + car.id) % 100) / 1000), 5);
  M.scrapValue = car => Math.round(C.model(car).wt * .034 * G().px());
  M.quickSell = function (car) { if (car.order) return; sold(car, M.wholesale(car), 'сдан оптом дилеру'); };
  M.scrap = function (car) { if (car.order) return; sold(car, M.scrapValue(car), 'сдан в металлолом'); };

  // ---------- аукцион штрафстоянки ----------
  M.mkAuction = function () {
    const S = WW.S, lots = [], px = G().px();
    for (let i = 0; i < 3; i++) {
      const m = U.wpick(M.pool(), m => m.share + (/sedan|pickup/.test(m.body) ? 2 : 0));
      const car = C.gen({ model: m.id, quality: 'auction', owner: 'auction' });
      C.reveal(car, { nodes: { panels: 36, interior: 40 }, rust: { farch: 40, rarch: 40, doors: 40 } }, 0);
      const V = C.value(car, 't'), inc = V < 1500 * px ? 25 : 50;
      const bs = D.bidders.slice().sort(() => U.r() - .5).slice(0, 3).map(b => ({ b: D.bidders.indexOf(b), lim: V * U.rf(b.k[0], b.k[1]) * (b.cult && m.curve !== 'cult' ? .6 : 1) }));
      lots.push({ car: car.id, cur: Math.max(50, r5(V * .22, 25)), inc, leader: null, lims: bs, done: false, runs: C.runs(car) });
    }
    S.auction = { day: S.day, open: 780, close: 960, lots, done: false, told: false };
  };
  M.aucAI = function (lot) { const c = lot.lims.filter(l => l.b !== lot.leader && l.lim >= lot.cur + lot.inc); if (!c.length) return null; const l = U.pick(c); lot.cur += lot.inc; lot.leader = l.b; return D.bidders[l.b]; };
  M.aucBid = function (lot) { const S = WW.S; if (lot.leader === 'you') return false; if (S.money < lot.cur + lot.inc + 40) { G().toast('Не хватает денег на ставку.', 'bad'); return false; } if (!G().freeSlot(['proj'])) { G().toast('Нет места под проект.', 'bad'); return false; } lot.cur += lot.inc; lot.leader = 'you'; return true; };
  M.aucClose = function (lot) {
    const S = WW.S, g = G(), car = S.cars[lot.car]; if (lot.done) return; lot.done = true;
    if (lot.leader === 'you' && car) {
      const slot = g.freeSlot(['proj']), tow = (!lot.runs && !S.upg.trailer) ? Math.round(35 * g.px()) : 0;
      if (slot) { g.money(-lot.cur - tow, 'carBuy'); car.owner = 'player'; car.cost = lot.cur + tow; car.days = 0; car.boughtFrom = 'Аукцион штрафстоянки'; S.stats.bought++; g.send(car, slot.id); g.note('Выигран лот: ' + C.name(car) + ' за ' + U.money(lot.cur) + '. Теперь узнаем, что мы купили.', 'good', ['car', car.id]); car.hist.push({ d: S.day, y: S.year, t: 'Куплена на аукционе за ' + U.money(lot.cur) }); return; }
    }
    if (car) delete S.cars[lot.car];
  };
  M.aucEnd = function () { const S = WW.S; if (!S.auction) return; for (const l of S.auction.lots) M.aucClose(l); S.auction.done = true; };

  // ---------- сутки ----------
  M.startDay = function () {
    const S = WW.S, g = G(), dw = g.dow();
    S.offers = S.offers.filter(o => o.until >= S.day);
    S.auction = null; if (S.race && S.race.day < S.day) S.race = null;
    if ((dw === 2 || dw === 5) && S.day > 0) { M.mkAuction(); g.radio('Сегодня с 13:00 до 16:00 — аукцион окружной штрафстоянки. Три лота, осмотр — только глазами.'); }
    if (dw === 5) M.mkRace();
    if (dw === 4) g.radio('Завтра вечером — заезды на стрипе «Норвок». Регистрация до закрытия.');
  };
  M.tick = function () {
    const S = WW.S;
    for (let i = S.trips.length - 1; i >= 0; i--) if (S.min >= S.trips[i].until) { const t = S.trips.splice(i, 1)[0]; tripDone(t); }
    const a = S.auction;
    if (a && !a.done) { if (!a.told && S.min >= a.open) { a.told = true; G().toast('Аукцион штрафстоянки открыт до 16:00.', 'info', ['panel', 'market']); WW.emit('sound', 'ping'); } if (S.min >= a.close) M.aucEnd(); }
  };
  M.night = function () {
    const S = WW.S, g = G();
    for (const id in S.trend) { const m = D.models[id]; let t = S.trend[id] * (1 + U.rf(-.02, .021)); t += (1 - t) * .01; S.trend[id] = U.clamp(t, .65, 1.8); }
    for (const l of S.listings.slice()) { l.days--; if (l.days <= 0) removeLst(l); }
    S.trips = [];
    const target = 6 + (g.rep() > 50 ? 1 : 0); let add = U.ri(1, 3);
    while (S.listings.length < target && add-- > 0) M.addListing();
    // покупатели на сток
    for (const id in S.cars) {
      const car = S.cars[id]; if (car.owner !== 'player' || !car.sale || car.mv) continue;
      if (S.offers.some(o => o.car === car.id)) continue;
      const Vb = C.value(car, 't') * U.rf(.9, 1.1) * (S.upg.canopy ? 1.03 : 1) * (1 + (g.rep() - 40) / 500);
      const p = U.clamp(.5 * Math.pow(Vb / car.sale.ask, 5), 0, .85) * (S.upg.sign ? 1.15 : 1);
      if (!U.chance(p)) continue;
      const low = U.chance(.3), price = r5(Math.min(car.sale.ask, Vb * (low ? U.rf(.72, .85) : U.rf(.9, 1.03))), 5);
      if (price < car.sale.ask * .62) continue;
      S.offers.push({ id: S.nextId++, car: car.id, price, until: S.day + 2, who: low ? 'Лоуболлер с наличкой' : U.pick(['Серьёзный покупатель', 'Семейная пара', 'Парень с завода', 'Коллекционер из соседнего штата']) });
    }
  };

  // ---------- гонки ----------
  M.mkRace = function () {
    const S = WW.S, px = G().px(), wk = Math.floor(S.day / 7);
    const type = (S.day % 14 === 12) ? 'junk' : (wk % 2 === 0 ? 'drag' : 'autox');
    const def = { drag: ['Субботние брекеты на стрипе «Норвок»', 20], autox: ['Автокросс на парковке молла', 25], junk: ['«Junkyard 24» — сутки на машинах за $500', 150] }[type];
    S.race = { day: S.day, type, name: def[0], fee: Math.round(def[1] * px), entry: null, res: null };
  };
  M.raceCars = () => Object.values(WW.S.cars).filter(c => c.owner === 'player' && !c.order && !c.mv && C.runs(c));
  M.raceEnter = function (carId, pid, dial) {
    const S = WW.S, g = G(), r = S.race, car = S.cars[carId], p = P().byId(pid); if (!r || r.entry || !car || !p) return false;
    if (!C.runs(car) || car.order) { g.toast('Машина должна быть на ходу и без открытого наряда.', 'bad'); return false; }
    if (r.type === 'junk') { if (!S.upg.trailer) { g.toast('На Junkyard 24 машину везут на прицепе — купи прицеп-платформу.', 'bad'); return false; } if (C.value(car, 't') > 500 * g.px() * 1.6) { g.toast('Техком не пропустит: машина дороже лимита $' + Math.round(500 * g.px() * 1.6) + '.', 'bad'); return false; } }
    if (S.money < r.fee) { g.toast('Не хватает на взнос.', 'bad'); return false; }
    g.money(-r.fee, 'raceFee'); r.entry = { car: carId, p: pid, dial: dial || null };
    g.note('Заявка принята: ' + r.name + '. ' + p.name + ' за рулём ' + C.short(car) + '. Старт после закрытия мастерской.', 'info');
    return true;
  };
  M.raceDue = () => { const r = WW.S.race; return !!(r && r.day === WW.S.day && r.entry && !r.res && WW.S.cars[r.entry.car]); };
  const rivals = [['«Дикий» Билл Харпер', 'Corvan Nomad 454'], ['Сэл «Жёлтый свет»', 'Bellmore GT 400'], ['Ронда Ли', 'Halford Stallion 5.0'], ['Док Мейерс', 'Monarch Dart 340'], ['Малыш Тито', 'Corvan Vega V8'], ['Близнецы Ковач', 'Ameri Javelina'], ['Чак «Гидрант»', 'Halford Fairline'], ['Мисс Донна', 'Bellmore Firebolt']];
  M.raceSim = function () {
    const S = WW.S, r = S.race, car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0], pf = C.perf(car), dv = p.skills.drive, px = G().px();
    const res = { type: r.type, car: C.name(car), driver: p.name, prize: 0, win: false, log: [] };
    const wearN = ['clutch', 'gearbox', 'drive', 'wheels', 'brakes'].filter(id => car.nodes[id]);
    if (r.type === 'drag') {
      const sig = .05 + (1 - pf.stab) * .3 + (20 - dv) * .006, dial = r.entry.dial || Math.round((pf.et + .04) * 100) / 100;
      res.rounds = []; res.dial = dial; let alive = true;
      const opps = rivals.slice().sort(() => U.r() - .5);
      for (let i = 0; i < 3 && alive; i++) {
        const od = Math.round(U.rf(13.2, 17.4) * 100) / 100;
        const you = { rt: .5 + U.rf(-.018, .26 - dv * .009), et: pf.et + gauss() * sig, dial }, opp = { name: opps[i][0], car: opps[i][1], rt: .5 + U.rf(-.012, .2), et: od + .02 + gauss() * .07, dial: od };
        for (const id of ['gearbox', 'clutch', 'drive']) if (car.nodes[id] && car.nodes[id].t < 30 && U.chance(.3)) { you.dnf = D.nodes[id].n; car.nodes[id].t = Math.max(2, car.nodes[id].t - 15); }
        you.red = you.rt < .5; opp.red = opp.rt < .5; you.bo = you.et < dial; opp.bo = opp.et < od;
        you.mph = Math.round(234 * Math.pow(pf.hp / pf.wt, 1 / 3)); opp.mph = Math.round(1320 / od * 1.05 * .68 * 1.6);
        let win;
        if (you.dnf) win = false; else if (you.red !== opp.red) win = opp.red; else if (you.bo !== opp.bo) win = opp.bo; else if (you.bo && opp.bo) win = (dial - you.et) < (od - opp.et); else win = (you.rt + you.et - dial) < (opp.rt + opp.et - od);
        res.rounds.push({ you, opp, win, name: ['Четвертьфинал', 'Полуфинал', 'Финал'][i] }); alive = win;
        for (const id of wearN) car.nodes[id].t = Math.max(3, car.nodes[id].t - U.rf(.4, 1.6));
      }
      const n = res.rounds.filter(x => x.win).length; res.win = n === 3; res.prize = Math.round([0, 40, 90, 240][n] * px); res.place = res.win ? 1 : n === 2 ? 2 : n === 1 ? 4 : 8;
      res.text = res.win ? 'Победа в брекетах!' : n ? 'Вылет: ' + res.rounds[n].name.toLowerCase() : 'Вылет в первом же заезде';
    } else if (r.type === 'autox') {
      res.runs = []; const pw = pf.hp / pf.wt;
      for (let i = 0; i < 3; i++) { const cones = (U.chance(.3 - dv * .012) ? 1 : 0) + (U.chance(.08) ? 1 : 0); const t = 71 - 60 * pw - 10 * pf.grip - dv * .35 + (pf.wt - 3000) / 400 + gauss() * (1.3 - dv * .04) - i * .4; res.runs.push({ t, cones, tot: t + cones * 2 }); for (const id of wearN) car.nodes[id].t = Math.max(3, car.nodes[id].t - U.rf(.2, .9)); }
      res.best = Math.min(...res.runs.map(x => x.tot));
      res.field = rivals.map(x => ({ name: x[0], car: x[1], t: U.rf(56.5, 66) })); res.field.push({ name: p.name, car: C.short(car), t: res.best, you: 1 }); res.field.sort((a, b) => a.t - b.t);
      res.place = res.field.findIndex(x => x.you) + 1; res.win = res.place === 1; res.prize = Math.round(([150, 80, 40][res.place - 1] || 0) * px);
      res.text = res.win ? 'Лучшее время дня!' : res.place + '-е место из ' + res.field.length;
    } else {
      const crew = Math.max(...S.pawns.filter(x => x.state === 'work').map(x => x.skills.eng)); let laps = 0, down = 0, stops = 0;
      const weak = ['block', 'head', 'gasket', 'cool', 'gearbox', 'clutch', 'drive', 'brakes', 'wheels', 'fuel', 'ign', 'start'].filter(id => car.nodes[id]);
      for (let h = 1; h <= 24; h++) {
        if (down > 0) { const d = Math.min(1, down); down -= d; laps += Math.round((1 - d) * 15); if (down <= 0) res.log.push({ h, t: 'Вернулись на трассу под аплодисменты соседнего паддока.' }); continue; }
        let br = null; for (const id of weak) if (U.chance(Math.max(0, 58 - car.nodes[id].t) / 58 * .045 + .003)) { br = id; break; }
        if (br) { stops++; down = U.rf(.5, 3) / (.6 + crew / 20); car.nodes[br].t = Math.min(70, car.nodes[br].t + 22); res.log.push({ h, t: U.time(h * 60 % 1440 + 600) + ' — ' + D.nodes[br].n + ': ' + U.pick(['дым и запах гари', 'встал на прямой', 'приехал в боксы на буксире', 'что-то отвалилось']) + '. Ремонт в паддоке ~' + U.dur(down * 60) + '.', bad: 1 }); continue; }
        const l = Math.round(15 * (.8 + dv / 60) * (.85 + pf.grip * .15) * (h > 12 && h < 20 ? .92 : 1)); laps += l;
        if (h % 6 === 0) res.log.push({ h, t: U.time(h * 60 % 1440 + 600) + ' — ' + laps + ' кругов. ' + U.pick(['Пилот просит кофе.', 'Ночь, фары светят куда-то в лес.', 'Соперники чинят свой универсал изолентой.', 'Судьи приняли «взятку» пончиками.']) });
      }
      for (const id of weak) car.nodes[id].t = Math.max(3, car.nodes[id].t - U.rf(4, 12));
      res.laps = laps; res.stops = stops;
      const field = []; for (let i = 0; i < 19; i++) field.push(Math.round(285 + gauss() * 45)); res.place = field.filter(x => x > laps).length + 1;
      res.win = res.place === 1; res.prize = Math.round((res.place === 1 ? 600 : res.place <= 3 ? 250 : res.place <= 8 ? 60 : 0) * px);
      res.text = res.win ? 'Победа в Junkyard 24!' : res.place + '-е место из 20, ' + laps + ' кругов';
    }
    C.refreshFaults(car); r.res = res; return res;
  };
  M.raceFinish = function () {
    const S = WW.S, g = G(), r = S.race, res = r.res || M.raceSim(), car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0];
    if (res.prize) g.money(res.prize, 'prize');
    S.stats.races++; P().xp(p, 'drive', 3);
    if (res.win) { S.stats.wins++; if (car) car.wins++; g.repAdd('q', 2); g.repAdd('s', 1); g.addMod('clients', 1.15, 3, 'Победил в субботу — продал в понедельник'); for (const x of P().staff()) P().think(x, 'win', 'Победа команды в гонке', 12, 5); if (r.type === 'junk') S.ach.junkwin = S.day; }
    else if (res.place <= 3) for (const x of P().staff()) P().think(x, 'podium', 'Команда на подиуме', 5, 3);
    if (car) car.hist.push({ d: S.day, y: S.year, t: r.name + ': ' + res.text, by: p.name });
    g.log(r.name + ': ' + p.name + ' на ' + res.car + ' — ' + res.text + (res.prize ? ', призовые ' + U.money(res.prize) : '') + '.', res.win ? 'story' : 'info');
    r.done = true; G().endDay2();
  };
})(globalThis.WW);
