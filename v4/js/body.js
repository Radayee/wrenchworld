// WRENCHWORLD — кузов по панелям, кузовные работы, мини-игры хозяина, поиск б/у деталей по телефону.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, N = WW.N, O = WW.O, M = WW.M, B = WW.B = {};
  const G = () => WW.G, P = () => WW.P;
  const TWO = { coupe: 1, hatch: 1, roadster: 1, bug: 1, prewar: 1, jeep: 1, pickup: 1 };
  B.panelIds = car => D.panelIds.filter(id => !(TWO[D.models[car.model].body] && (id === 'drl' || id === 'drr')));
  B.cond = p => U.clamp(Math.min(p.dent, p.paint * .6 + 40) - p.rust * .7, 0, 100);

  // ---------- кузов экземпляра ----------
  B.gen = function (car, r) {
    if (car.body) return; r = r || Math.random; const age = Math.max(0, WW.S.year - car.year), body = {};
    for (const id of B.panelIds(car)) {
      const z = D.panels[id].zone, zr = z ? car.rust[z].r : 0;
      body[id] = { dent: U.clamp(100 - (r() < .25 ? 15 + r() * 40 : r() * 12), 5, 100), paint: U.clamp(100 - age * 2.2 - r() * 20 + (car.detail || 0) * 10, 8, 100), rust: z ? U.clamp(zr * (.6 + r() * .8), 0, 100) : (r() < .1 ? r() * 20 : 0), grade: 'oem', orig: true };
    }
    if (car.hidden && car.hidden.accident) { const map = { farch: ['fl', 'fr'], rarch: ['rl', 'rr'], doors: ['dfl', 'dfr', 'trunk'] }, ids = (map[car.hidden.accident] || ['fl']).filter(x => body[x]); const id = ids[Math.floor(r() * ids.length)] || 'fl'; if (body[id]) { body[id].orig = false; body[id].paint = Math.max(body[id].paint, 70); if (!car.hidden.bondo) body[id].dent = Math.min(body[id].dent, 55); } }
    car.body = body; B.sync(car);
  };
  // кузовной узел «Панели и краска» = среднее состояние панелей; косметическая ржавчина зон = средняя ржавчина их панелей
  B.sync = function (car) {
    if (!car.body) return; const n = car.nodes.panels, zs = {}; let s = 0, k = 0;
    for (const id in car.body) { const p = car.body[id]; s += B.cond(p); k++; const z = D.panels[id].zone; if (z) (zs[z] = zs[z] || []).push(p.rust); }
    if (n && !n.gone && k) { const was = n.t; n.t = U.clamp(s / k, 1, 100); if (n.hi - n.lo < 12 || Math.abs(was - n.t) > 1) { n.lo = Math.max(0, Math.floor(n.t) - 3); n.hi = Math.min(100, Math.ceil(n.t) + 3); } }
    for (const z in zs) { const R = car.rust[z]; R.r = zs[z].reduce((a, b) => a + b, 0) / zs[z].length; if (R.lo > R.r) R.lo = Math.floor(R.r); if (R.hi < R.r) R.hi = Math.ceil(R.r); }
  };
  const baseGen = C.gen; C.gen = function (o) { const car = baseGen(o); B.gen(car, U.mk(car.seed + 7)); return car; };
  const baseDecay = C.decay; C.decay = function (car, days, k) {
    if (!car.body) B.gen(car); const before = {}; for (const z of ['farch', 'rarch', 'doors']) before[z] = car.rust[z].r;
    baseDecay(car, days, k);
    for (const id in car.body) { const z = D.panels[id].zone, p = car.body[id]; if (z) p.rust = U.clamp(p.rust + (car.rust[z].r - before[z]) * (.6 + Math.random() * .8), 0, 100); p.paint = Math.max(5, p.paint - .03 * days * k); }
    B.sync(car);
  };
  const baseAddFault = C.addFault; C.addFault = function (car, node, sym, t) {
    baseAddFault(car, node, sym, t);
    if (node === 'panels' && car.body) { const ids = Object.keys(car.body), id = ids[Math.floor(Math.random() * ids.length)]; car.body[id].dent = U.clamp(t + Math.random() * 20, 8, 60); car.body[id].paint = Math.min(car.body[id].paint, 55); }
  };

  // ---------- кузовные работы в наряде ----------
  const baseMk = O.mkJob; O.mkJob = function (o, sp) {
    if (sp.kind !== 'body') return baseMk(o, sp);
    const S = WW.S, car = S.cars[o.car], m = C.model(car), px = G().px(), w = D.bodyWork[sp.key], pd = D.panels[sp.panel], gr = D.grades[sp.grade || 'oem'];
    const j = { id: S.nextId++, kind: 'body', key: sp.key, panel: sp.panel, grade: sp.key === 'swap' ? (sp.grade || 'oem') : null, status: 'prop', left: null, q: null, free: o.type === 'comeback', sk: 'body', mg: w.mg };
    j.name = w.n + ': ' + pd.n.toLowerCase() + (sp.key === 'swap' ? ' (' + gr.short + ')' : '');
    j.h = w.h * (pd.part > 150 ? 1.25 : 1); j.oem = (sp.key === 'swap' ? pd.part * m.pm : w.part) * px; j.cost = Math.round(j.oem * (sp.key === 'swap' ? gr.price : 1)); j.cons = sp.key !== 'swap' ? 1 : 0;
    O.price(o, j); return j;
  };
  const baseWhy = O.why; O.why = function (o, sp) {
    if (sp.kind !== 'body') return baseWhy(o, sp);
    const car = WW.S.cars[o.car]; if (!car.body || !car.body[sp.panel]) return 'у этой машины нет такой панели';
    if (o.jobs.some(j => j.kind === 'body' && j.panel === sp.panel && j.key === sp.key && j.status !== 'declined' && j.status !== 'done')) return 'уже в наряде';
    const p = car.body[sp.panel]; if (sp.key === 'dent' && p.dent > 92) return 'вмятин нет'; if (sp.key === 'derust' && p.rust < 8) return 'ржавчины нет'; if (sp.key === 'paint' && p.paint > 94 && p.rust < 8) return 'краска в порядке';
    return '';
  };
  B.paintCap = () => N.has('paintbooth') ? 98 : 72;
  const baseFin = O.finishJob; O.finishJob = function (o, j, p) {
    baseFin(o, j, p);
    if (j.kind !== 'body') return;
    const car = WW.S.cars[o.car]; if (!car || !car.body) return; const pn = car.body[j.panel], Q = j.q;
    if (j.key === 'dent') pn.dent = Math.min(100, pn.dent + (100 - pn.dent) * (.5 + .45 * Q / 100));
    else if (j.key === 'derust') { pn.rust = Math.max(0, pn.rust * (.45 - .4 * Q / 100)); pn.paint = Math.min(pn.paint, 35); WW.X.add('metal', .4, car.x, car.y); WW.X.add('gen', .3, car.x, car.y); }
    else if (j.key === 'paint') { pn.paint = Math.min(B.paintCap(), 55 + Q * .45); if (pn.rust > 25) pn.rust *= 1.05; car.detail = Math.max(car.detail, .7); WW.X.add('gen', .4, car.x, car.y); }
    else if (j.key === 'swap') { WW.X.scrap('panels', .4, car.x, car.y); const gr = D.grades[j.grade]; pn.dent = Math.min(100, U.rf(gr.st[0], gr.st[1]) + 3); pn.rust = 0; pn.paint = j.grade === 'used' ? U.rf(30, 80) : 20; pn.grade = j.grade; pn.orig = false; }
    B.sync(car); C.refreshFaults(car);
  };

  // ---------- мини-игры хозяина ----------
  const baseStart = O.onJobStart; O.onJobStart = function (o, j, p) {
    baseStart(o, j, p);
    const mg = j.kind === 'body' ? j.mg : j.kind === 'rust' ? 'rust' : (j.kind === 'own' && j.key === 'paint') ? 'paint' : null;
    if (mg && p.owner && WW.S.set.mg !== false && WW.hasUI && !j.mgDone) { j.mgDone = 1; j.interv = 'wait'; j.intervAt = WW.S.min; WW.emit('minigame', { o: o.id, j: j.id, type: mg }); }
  };
  B.mgResult = function (oid, jid, score) {
    const o = WW.S.orders[oid]; if (!o) return; const j = o.jobs.find(x => x.id === jid); if (!j) return;
    j.interv = 'done'; j.qb = Math.round(score * 22); if (score > .5 && j.left) j.left *= 1 - (score - .5) * .5;
    j.mgScore = score; if (score > .85) { WW.G.repAdd('q', .3); WW.G.toast('Рука мастера: качество +' + j.qb + ', работа быстрее.', 'good'); }
  };

  // ---------- поиск б/у по телефону ----------
  const NAMES = ['Разборка «Ржавый Пит»', 'Гараж Сэла', 'Pull-A-Part, стол заказов', 'Частник с Оук-стрит', 'Фермер Хендерсон', 'Разборка «Две собаки»', 'Ларри из объявления', 'Вдова Ковальски', 'Студент с объявления', 'Мастерская Дюка'];
  const LINES = { liar: ['Да как новая! Муха не сидела, брал под себя.', 'Ресурс — во! Сам бы ставил, да машину продал.', 'Не сомневайся, бери — потом спасибо скажешь.'], pess: ['Ну… потёртая. Не знаю, сколько протянет.', 'Честно? Снял с битой, не проверял.', 'Старенькая, но вроде живая.'], honest: ['Снимал сам, проверял на машине. Состояние примерно такое.', 'Есть фото, можно приехать посмотреть.', 'Пробег у донора известен, вот и считай.'] };
  B.offers = function (model, node) {
    const S = WW.S, mm = D.models[model], n = U.ri(3, 6), out = [], base = D.nodes[node].part * mm.pm * G().px();
    for (let i = 0; i < n; i++) {
      const kind = U.wpick(['honest', 'liar', 'pess'], k => ({ honest: 5, liar: 3, pess: 2 })[k]);
      const truth = U.chance(.6) ? U.rf(18, 55) : U.rf(55, 88), stated = kind === 'liar' ? Math.min(92, truth + U.rf(25, 50)) : kind === 'pess' ? Math.max(10, truth - U.rf(15, 30)) : truth + U.rf(-6, 6);
      out.push({ id: S.nextId++, model, node, who: U.pick(NAMES), kind, truth: Math.round(truth), stated: Math.round(U.clamp(stated, 5, 95)), price: Math.max(4, Math.round(base * .3 * (.35 + stated / 100) * U.rf(.75, 1.25))), dist: U.ri(8, 32), called: false, line: U.pick(LINES[kind]), haggled: false });
    }
    return out;
  };
  // насколько слова продавца выдают его: «Торговля» хозяина ловит интонацию
  B.read = function (of) { const sk = (WW.S.pawns.find(p => p.owner) || {}).skills || {}; const acc = .45 + (sk.trade || 5) * .025; if (!U.chance(acc)) return 'не понять, врёт или нет'; return of.kind === 'liar' ? 'слишком уж нахваливает…' : of.kind === 'pess' ? 'похоже, сам не уверен' : 'звучит честно'; };
  B.haggle = function (of) { if (of.haggled) return false; of.haggled = true; const sk = (WW.S.pawns.find(p => p.owner) || {}).skills.trade || 5; if (U.chance(.35 + sk * .025)) { of.price = Math.max(3, Math.round(of.price * U.rf(.7, .85))); return true; } return false; };
  B.fetch = function (of, pid, oid, jid) {
    const S = WW.S, g = G(), p = P().byId(pid); if (!p || p.state !== 'work' || p.arriveAt) { g.toast('Этот человек сейчас не может поехать.', 'bad'); return false; }
    if (S.money < of.price) { g.toast('Не хватает денег.', 'bad'); return false; }
    const until = S.min + of.dist * 2 + 15; if (until > 1125) { g.toast('Не успеть до закрытия — договорись на завтра или выбери ближе.', 'bad'); return false; }
    P().drop(p); p.state = 'away'; p.awayUntil = until; S.usedTrips = S.usedTrips || []; S.usedTrips.push({ until, of, p: pid, o: oid, j: jid });
    g.toast(p.name + ' поехал за деталью к «' + of.who + '». Вернётся к ' + U.time(until) + '.', 'info'); return true;
  };
  B.tick = function () {
    const S = WW.S; if (!S.usedTrips || !S.usedTrips.length) return;
    for (let i = S.usedTrips.length - 1; i >= 0; i--) {
      const t = S.usedTrips[i]; if (S.min < t.until) continue; S.usedTrips.splice(i, 1);
      const of = t.of, g = G(); g.money(-of.price, 'ownParts');
      const it = { id: S.nextId++, node: of.node, model: of.model, grade: 'used', t: of.truth, reps: U.ri(1, 3), from: of.who };
      S.parts.push(it); const diff = of.truth - of.stated;
      g.note('Привезли б/у: ' + D.nodes[of.node].n.toLowerCase() + ' от «' + of.who + '». По телефону — ' + of.stated + '%, на деле ' + of.truth + '%' + (diff < -15 ? '. Развели!' : diff > 12 ? '. Приятный сюрприз!' : '.'), diff < -15 ? 'bad' : diff > 12 ? 'good' : 'info', ['panel', 'stock']);
      const o = S.orders[t.o], j = o && o.jobs.find(x => x.id === t.j);
      if (o && j && (j.status === 'prop' || j.status === 'ready' && j.left == null) && j.kind === 'replace') { if (j.status === 'ready' && j.cost) g.money(j.cost, o.type === 'own' ? 'ownParts' : 'partsCost'); o.jobs = o.jobs.filter(x => x !== j); const nj = O.addJob(o, { kind: 'install', node: of.node, item: it.id }); if (nj && o.type === 'own') { nj.status = 'ready'; O.setWorkStage(o); } }
    }
  };
  const baseMTick = M.tick; M.tick = function (dt) { baseMTick(dt); B.tick(); };

  // миграция: кузов у всех машин
  const baseMig = WW.X.migrate; WW.X.migrate = function (s) { baseMig(s); for (const id in s.cars) if (!s.cars[id].body) { const c = s.cars[id]; const S0 = WW.S; WW.S = s; B.gen(c); WW.S = S0; } };
  D.build.paintbooth = { n: 'Покрасочный пост с вытяжкой', i: '🎨', cost: 900, w: 3, h: 2, solid: 1, g: 'Станки', d: 'Без него покраска не лучше 72%: пыль, потёки, соринки. С постом — до 98%.' };
})(globalThis.WW);
