// WRENCHWORLD — клиенты и заказ-наряды: приём → срок → диагностика → смета → согласование → детали → работа → ОТК → выдача → гарантия.
// Плюс склад запчастей: снять, поставить, отремонтировать на станке, собрать одну из двух.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, N = WW.N, MAP = D.MAP, O = WW.O = {};
  const G = () => WW.G, P = () => WW.P;
  O.stages = [['intake', 'Приём'], ['diag', 'Диагностика'], ['approval', 'Согласование'], ['parts', 'Ждём детали'], ['work', 'В работе'], ['qc', 'ОТК'], ['ready', 'Готово']];
  O.stageName = s => (O.stages.find(x => x[0] === s) || ['', s])[1];
  const fem = (c, a, b) => c.f ? b : a;

  // ---------- поток клиентов ----------
  O.planDay = function () {
    const S = WW.S, g = G();
    S.arrivals = S.arrivals.filter(a => a.day > S.day);
    const dowK = [1.3, 1, 1, 1, 1.2, .9, .5][g.dow()];
    const wK = S.weather === 'blizzard' ? .35 : S.weather === 'rain' ? .9 : 1;
    const site = D.sites[S.site] || D.sites.gas, bb = Math.min(3, N.objs('billboard').length);
    const rate = (2.7 + (g.rep() - 30) * .075) * dowK * (1 + (S.upg.sign ? .15 : 0) + (S.adDays > 0 ? .35 : 0) + bb * .04 + Math.max(0, N.beauty()) * .01) * g.mod('clients') * wK * site.clients;
    let n = U.clamp(Math.round(rate + U.rf(-1, 1)), 0, 14);
    if (S.day === 0 && S.set.tut) { n = 3; S.arrivals.push({ day: 0, min: 428, type: 'client', arch: 'retiree', model: S.year >= 1979 ? 'caprio' : 'bug', fault: { node: 'brakes', sym: 'brake_bad' } }); n--; }
    for (let i = 0; i < n; i++) S.arrivals.push({ day: S.day, min: U.rf(450, 930), type: 'client' });
    for (const cb of S.comebacks.filter(c => c.day <= S.day)) S.arrivals.push({ day: S.day, min: U.rf(440, 620), type: 'comeback', cb: cb.car });
    S.arrivals.sort((a, b) => a.day - b.day || a.min - b.min);
  };
  function pickFault(car, m) {
    const se = G().season();
    const ids = C.nodeIds(car).filter(id => id !== 'frame');
    const node = U.wpick(ids, id => {
      const nd = D.nodes[id]; let w = (nd.wear ? 3 : 1.2) * (nd.crit ? .5 : 1);
      if (id === 'interior') w = .15; if (id === 'panels') w = .5;
      const sg = m.sig.find(s => s.n === id); if (sg) w *= 1 + sg.w * 1.1;
      if (se === 3 && id === 'start') w *= 2.2; if (se === 1 && id === 'cool') w *= 2.2; if (se === 0 && id === 'fsusp') w *= 1.6;
      if (WW.S.weather === 'heat' && id === 'cool') w *= 2;
      return w;
    });
    const syms = (D.nodeSyms[node] || []).filter(s => !(s === 'overheat' && node === 'start'));
    if (!syms.length) return null;
    return { node, sym: U.wpick(syms, s => D.sym[s].c[node]) };
  }
  function complaint(client, f) {
    const s = D.sym[f.sym];
    if (U.chance(client.know)) return s.n + (client.know > .7 ? '. «Думаю, это ' + D.nodes[U.chance(.65) ? f.node : U.pick(Object.keys(s.c))].n.toLowerCase() + '»' : '');
    return '«' + s.v + '»';
  }
  O.create = function (car, client, type) {
    const S = WW.S;
    const o = { id: S.nextId++, car: car.id, client, type, stage: type === 'own' ? 'diag' : 'intake', t0: S.min, t0d: S.day, arrived: type === 'own', complaint: '', syms: [], tests: [], done: [],
      jobs: [], findings: [], due: null, urgent: false, assign: null, busy: null, desk: null, decide: type === 'own', sat: 60, rate: Math.round(S.set.rate * G().mod('rate')), fast: S.set.fast, notes: [], qcFail: 0, diagMin: 0, hold: false, pin: false, now: false };
    S.orders[o.id] = o; car.order = o.id; return o;
  };
  // неходовую эвакуатор сгрузит прямо в свободный бокс, если тот никому не обещан
  function landing(car) {
    const S = WW.S, g = G(), slot = g.freeSlot(['park', 'yard']);
    if (!C.runs(car)) { const b = g.freeSlot(['bay']); if (b && !Object.values(S.orders).some(o => O.needsBay(o) && !g.inBay(S.cars[o.car] || {}))) return b; }
    return slot;
  }
  O.arrive = function (a) {
    const S = WW.S, g = G();
    if (a.type === 'comeback') return O.comeback(a.cb);
    if (!g.freeSlot(['park', 'yard'])) { g.note('Клиент развернулся у въезда: негде поставить машину.', 'bad', ['panel', 'build']); g.repAdd('s', -.6); return; }
    const aid = a.arch || U.wpick(Object.keys(D.arch), k => ({ student: 1.2, mom: 1.2, worker: 1.3, retiree: 1.1, biz: .5, petrol: .7 })[k]);
    const arch = D.arch[aid];
    const pool = Object.values(D.models).filter(m => m.y[0] + 2 <= S.year || m.y[1] < S.year);
    const m = a.model ? D.models[a.model] : U.wpick(pool, m => m.share * (arch.pref[m.id] || .5));
    const yHi = Math.min(m.y[1], S.year - 1), yLo = Math.min(yHi, Math.max(m.y[0], S.year - Math.round(16 * arch.old)));
    const car = C.gen({ model: m.id, year: U.ri(yLo, yHi), quality: 'client', owner: 'client' });
    const fn = U.pick(D.first);
    const client = { temper: U.wpick(Object.keys(D.temper), k => D.temper[k].w * (k === 'trusting' && aid === 'retiree' ? 2 : k === 'tight' && aid === 'student' ? 3 : k === 'paranoid' && aid === 'biz' ? 2 : 1)), name: (D.female[fn] ? 'миссис ' : 'мистер ') + U.pick(D.last), first: fn, arch: aid, pat: arch.pat * U.rf(.75, 1.3) * (S.upg.waiting ? 1.5 : 1), know: arch.know, f: !!D.female[fn] };
    let type = 'fault';
    if (!a.fault && U.chance(.44)) type = 'service';
    const o = O.create(car, client, type);
    if (type === 'fault') {
      const f = a.fault || pickFault(car, m) || { node: 'brakes', sym: 'brake_bad' };
      C.addFault(car, f.node, f.sym, D.sym[f.sym].norun ? U.rf(2, 11) : U.rf(8, 37)); o.syms.push(f.sym); o.complaint = complaint(client, f);
      // комплексные поломки: две причины одного симптома или скрытый каскад, который всплывёт при разборке
      if (!a.fault) {
        const r = U.r(), sd = D.sym[f.sym];
        if (r < .15) { const others = Object.keys(sd.c).filter(n => n !== f.node && car.nodes[n] && n !== 'frame'); if (others.length) { const n2 = U.wpick(others, n => sd.c[n]); C.addFault(car, n2, f.sym, D.sym[f.sym].norun ? U.rf(3, 12) : U.rf(10, 36)); o.multi = 1; } }
        else if (r < .32) { const cs = (D.cascade[f.node] || []).filter(n => car.nodes[n]); if (cs.length) { const n2 = U.pick(cs), sy = (D.nodeSyms[n2] || []).filter(x => !D.sym[x].norun); if (sy.length) { C.addFault(car, n2, U.pick(sy), U.rf(12, 36)); o.hidden = [{ root: f.node, node: n2 }]; } } }
      }
      if (!a.fault && U.chance(.1)) { const f2 = pickFault(car, m); if (f2 && f2.node !== f.node && !D.sym[f2.sym].norun && f2.sym !== f.sym) { C.addFault(car, f2.node, f2.sym, U.rf(12, 38)); o.syms.push(f2.sym); o.complaint += ' И ещё: ' + complaint(client, f2); } }
    } else {
      const se = g.season();
      o.svc = U.wpick(Object.keys(D.svc), k => ({ oil: 4, tuneup: 1.5, pads: 2, tires: (se >= 2 ? 2.5 : 1), align: (se === 0 ? 2 : 1.2), season: (se === 2 ? 3 : se === 3 ? 2 : .6), insp: (se === 1 ? 2 : 1) })[k]);
      o.complaint = D.svc[o.svc].n;
    }
    if (!C.runs(car)) g.log('Эвакуатор везёт ' + C.name(car) + ' — не заводится.', 'info');
    g.send(car, landing(car).id);
    WW.emit('sound', 'bell');
    return o;
  };
  O.comeback = function (carId) {
    const S = WW.S, g = G(), i = S.comebacks.findIndex(c => c.car === carId); if (i < 0) return;
    const cb = S.comebacks[i], car = S.cars[carId]; if (!car) { S.comebacks.splice(i, 1); return; }
    if (cb.n >= 2) {
      S.comebacks.splice(i, 1); delete S.cars[carId]; g.repAdd('q', -5); S.reviews.unshift({ d: S.day, stars: 1, name: cb.client.name, t: 'Два раза чинили одно и то же. Больше ни ногой.' });
      g.note(cb.client.name + fem(cb.client, ' после второго возврата ушёл навсегда и оставил', ' после второго возврата ушла навсегда и оставила') + ' отзыв на одну звезду.', 'bad'); return;
    }
    if (!g.freeSlot(['park', 'yard'])) { cb.day = S.day + 1; return; }
    S.comebacks.splice(i, 1); car.keep = false;
    if (cb.why === 'quality' && car.nodes[cb.node]) { const syms = D.nodeSyms[cb.node] || []; if (syms.length) C.addFault(car, cb.node, U.pick(syms.filter(s => !D.sym[s].norun).concat(syms).slice(0, 3)), U.rf(12, 33)); }
    C.refreshFaults(car);
    const client = Object.assign({}, cb.client, { pat: 35 });
    const o = O.create(car, client, 'comeback'); o.cbN = cb.n; o.sat = 35;
    o.syms = [...new Set(car.faults.map(f => f.sym))];
    o.complaint = '«Опять то же самое! Я же платил за ремонт.» ' + o.syms.map(s => D.sym[s].n).join('; ');
    g.repAdd('q', -3); S.stats.comebacks++;
    g.send(car, landing(car).id);
    g.note('Возврат по гарантии: ' + client.name + ' снова здесь на ' + C.short(car) + '. Переделка за счёт мастерской.', 'bad', ['order', o.id]);
  };

  // ---------- минутная логика ----------
  O.delivered = function (d) { const S = WW.S, o = S.orders[d.o]; if (!o) return; const j = o.jobs.find(x => x.id === d.j); if (!j || j.status !== 'ordered') return; j.status = 'ready'; O.setWorkStage(o); };
  O.tick = function () {
    const S = WW.S, g = G(), mi = Math.floor(S.min);
    if (mi === S.lastMin) return; S.lastMin = mi;
    while (S.arrivals.length && S.arrivals[0].day <= S.day && S.arrivals[0].min <= S.min) { const a = S.arrivals.shift(); if (S.min < 1080) O.arrive(a); }
    const due = S.deliveries.filter(d => d.day < S.day || (d.day === S.day && d.min <= S.min));
    if (due.length) {
      S.deliveries = S.deliveries.filter(d => !due.includes(d)); const by = {};
      for (const d of due) (by[d.src || 'store'] = by[d.src || 'store'] || []).push(d);
      for (const k in by) { const v = S.veh.find(x => x.kind === 'van' && x.src === k && x.st === 'go'); if (v) { v.cargo.push(...by[k]); continue; } g.van(by[k], k); if (k !== 'dist') g.money(-Math.round(5 * g.px()), 'partsCost'); }
    }
    for (const id in S.orders) {
      const o = S.orders[id], car = S.cars[o.car]; if (!car) { delete S.orders[id]; continue; }
      if (!o.arrived && !car.mv) {
        o.arrived = true; o.t0 = S.min; o.t0d = S.day;
        const a = D.arch[o.client.arch]; const v = g.visitor({ x: car.x + 1.4, y: car.y, order: o.id, col: a.col, f: o.client.f });
        const cs = N.spot('client', 0, 0, o.id); g.vGo(v, cs[0], cs[1]);
      }
      if (o.stage === 'intake' && o.arrived && !o.desk && !o.duePending && (S.day > o.t0d || S.min - o.t0 > o.client.pat)) {
        g.note(o.client.name + fem(o.client, ' не дождался приёма и уехал.', ' не дождалась приёма и уехала.') + ' «У вас тут вообще кто-нибудь работает?»', 'bad', ['panel', 'people']); g.repAdd('s', -1.5);
        O.drop(o, true); continue;
      }
      if (o.client && o.client.waits && S.min > o.waitUntil && o.stage !== 'ready') { o.client.waits = false; o.sat -= 12; g.vLeave(o.id); g.toast(o.client.name + fem(o.client, ' устал ждать и ушёл.', ' устала ждать и ушла.') + ' Заберёт машину позже.', 'bad', ['order', o.id]); }
      if (o.stage === 'ready' && !o.clientHere && !o.vis && (S.day > o.pickDay || (S.day === o.pickDay && S.min >= o.pickAt)) && S.min < 1125) {
        o.vis = true; let v = g.visitorOf(o.id); const a = D.arch[o.client.arch];
        if (!v) v = g.visitor({ x: MAP.W - .5, y: 26.2, order: o.id, col: a.col, f: o.client.f });
        const cs = N.spot('client', 0, 0, o.id); g.vGo(v, cs[0], cs[1], 'here');
      }
      for (const j of o.jobs) if (j.interv === 'wait' && S.min - j.intervAt > 45) { j.interv = 'done'; j.qb = 10; }
    }
    O.bays();
  };
  O.needsBay = function (o) {
    if (o.stage === 'diag') return o.tests.some(t => D.tests[t].bay);
    if (o.stage === 'work') return o.jobs.some(j => j.status === 'ready' || j.status === 'doing');
    return false;
  };
  const prio = o => (o.now ? 0 : 1) * 1e7 + (o.urgent ? 0 : 1) * 1e6 + (o.type === 'comeback' ? 0 : o.type === 'own' ? 5e5 : 1e5) + o.t0d * 1440 + o.t0;
  // автоматика боксов; игрок перебивает её командами «в работу сейчас» и «на стоянку»
  O.bays = function () {
    const S = WW.S, g = G();
    const need = Object.values(S.orders).filter(o => { const c = S.cars[o.car]; return c && c.lot && !c.mv && !c.push && !c.away && o.arrived && !o.hold && (O.needsBay(o) || o.pin) && g.kindOf(c) !== 'bay'; });
    need.sort((a, b) => prio(a) - prio(b));
    for (const s of N.slots()) {
      if (s.kind !== 'bay') continue;
      const cid = S.slotCar[s.id];
      if (cid) {
        const car = S.cars[cid]; if (!car) { delete S.slotCar[s.id]; continue; }
        if (car.mv || car.push || car.slot !== s.id) continue;
        const o = car.order && S.orders[car.order];
        if (!o && car.pinBay) continue;
        if (o && o.pin && !o.hold) continue;
        const keep = o && !o.hold && (O.needsBay(o) || o.busy);
        const ownIdle = keep && o.type === 'own' && !o.busy && !o.urgent && need.length && need[0].type !== 'own';
        if (keep && !ownIdle) continue;
        if (o && !o.hold && !need.length && o.stage !== 'ready' && o.stage !== 'qc') continue;
        const to = g.freeSlot(car.owner === 'player' ? ['proj', 'yard', 'park'] : ['yard', 'park', 'proj'], car);
        if (to) g.send(car, to.id);
      } else { for (let i = 0; i < need.length; i++) { const o = need[i]; if (g.send(S.cars[o.car], s.id)) { o.blocked = false; need.splice(i, 1); break; } o.blocked = true; } }
    }
  };
  // «Взять в работу сейчас»: бокс освобождается под этот наряд, свободные руки переключаются на него
  O.takeNow = function (o) {
    const S = WW.S, g = G(), car = S.cars[o.car]; if (!car) return;
    o.hold = false; o.now = true; o.pin = true;
    for (const id in S.orders) if (S.orders[id] !== o) S.orders[id].now = false;
    if (g.kindOf(car) !== 'bay' && !g.freeSlot(['bay'])) {
      let victim = null, vs = -1;
      for (const s of N.slots()) { if (s.kind !== 'bay') continue; const c = S.cars[S.slotCar[s.id]]; if (!c || c.slot !== s.id) continue; const vo = c.order && S.orders[c.order]; const sc = !vo ? 1e9 : prio(vo) + (vo.busy ? 0 : 1e5); if (sc > vs) { vs = sc; victim = c; } }
      if (victim) {
        const vo = victim.order && S.orders[victim.order]; if (vo) { vo.pin = false; P().rethink((p, t) => t.o === vo.id && t.type !== 'desk'); }
        victim.pinBay = false; const to = g.freeSlot(victim.owner === 'player' ? ['proj', 'yard', 'park'] : ['yard', 'park', 'proj'], victim);
        if (to) g.send(victim, to.id); else { g.toast('Некуда выкатить ' + C.short(victim) + ': нет свободных мест.', 'bad'); }
      }
    }
    // все, кто занят менее важным, бросают и пересматривают
    P().rethink((p, t) => t.type !== 'desk' && t.type !== 'lunch' && t.o !== o.id && (t.type === 'bench' || (t.o && S.orders[t.o] && prio(S.orders[t.o]) > prio(o) && S.orders[t.o].type === 'own')));
    O.bays(); g.toast('№' + o.id + ' ' + C.short(car) + ': берём в работу сейчас.', 'info');
  };
  O.toYard = function (o) { o.hold = true; o.pin = false; o.now = false; P().rethink((p, t) => t.o === o.id && t.type !== 'desk'); O.bays(); };
  O.auto = function (o) { o.hold = false; o.pin = false; o.now = false; };
  O.endDay = function () {
    const S = WW.S, g = G();
    for (const id in S.orders) {
      const o = S.orders[id];
      if (o.duePending) O.setDue(o, 'norm');
      if (!S.orders[id]) continue;
      if (o.stage === 'intake') { if (o.arrived) { g.log(o.client.name + fem(o.client, ' так и не дождался', ' так и не дождалась') + ' приёма до закрытия.', 'bad'); g.repAdd('s', -1.5); } O.drop(o, true); continue; }
      if (o.client) o.client.waits = false;
      o.vis = false;
      if (o.stage === 'ready') { o.clientHere = false; o.pickDay = S.day + 1; o.pickAt = U.rf(470, 570); }
    }
    S.visitors = [];
  };
  O.drop = function (o, leave) {
    const S = WW.S, car = S.cars[o.car];
    for (const p of S.pawns) if (p.task && p.task.o === o.id) P().drop(p);
    S.deliveries = S.deliveries.filter(d => d.o !== o.id);
    if (car) { car.order = null; car.work = 0; car.hood = 0; if (leave) { if (car.mv && car.mv.tow) car.leaveAfter = true; else G().send(car, 'exit'); } }
    G().vLeave(o.id);
    delete S.orders[o.id];
  };

  // ---------- сроки на приёмке ----------
  O.normMins = function (o) {
    const S = WW.S, car = S.cars[o.car], nb = Math.max(1, N.slots().filter(s => s.kind === 'bay').length);
    const q = Object.values(S.orders).filter(x => x !== o && x.type !== 'own' && (x.stage === 'diag' || x.stage === 'work' || x.stage === 'parts')).length / nb;
    if (o.type === 'service') return Math.round(40 + D.svc[o.svc].h * 60 * 1.8 + q * 70);
    return Math.round((60 + 150 + 200 + q * 90 + (C.runs(car) ? 0 : 120)) * (o.type === 'comeback' ? .8 : 1));
  };
  O.dueOpts = function (o) { const n = O.normMins(o), g = G(), r = {}; for (const k in D.due) r[k] = { at: g.addWork(n * D.due[k].k), mins: Math.round(n * D.due[k].k) }; r.norm.base = n; return r; };
  O.leaveChance = function (o, k) { const a = D.arch[o.client.arch]; return k <= 1.2 ? 0 : Math.min(.6, (k - 1.2) * (a.pat < 30 ? 1.2 : .45)); };
  O.setDue = function (o, key, pct) {
    const S = WW.S, g = G(); o.duePending = false;
    const k = key === 'custom' ? U.clamp((pct || 100) / 100, .4, 4) : D.due[key].k;
    WW.emit('q', 'due'); o.dueK = k; o.due = g.addWork(O.normMins(o) * k); o.dueSpan = O.normMins(o) * k;
    o.sat += k < .9 ? 6 * Math.min(1, (1 - k) / .25) : k > 1.1 ? -5 * Math.min(2, (k - 1) / .5) : 0;
    if (U.chance(O.leaveChance(o, k)) && o.type !== 'comeback') {
      g.note(o.client.name + ': «' + (o.due.day > S.day ? 'Только ' + (o.due.day - S.day === 1 ? 'завтра' : 'через ' + (o.due.day - S.day) + ' дня') : 'Так долго') + '? Поеду в Big Al’s». Клиент уехал — срок показался слишком долгим.', 'bad'); g.repAdd('s', -.5);
      O.drop(o, true); return false;
    }
    afterIntake(o); return true;
  };
  function afterIntake(o) {
    const S = WW.S, g = G(), car = S.cars[o.car];
    if (o.type === 'service') {
      const j = O.mkJob(o, { kind: 'svc', key: o.svc }); o.jobs.push(j); O.orderPart(o, j); o.stage = 'work';
      o.client.waits = D.svc[o.svc].h <= 1.25 && S.min < 900 && o.due.day === S.day && U.chance(.6); o.waitUntil = Math.max(S.min + 150 * (S.upg.waiting ? 1.5 : 1), o.due.min);
    } else {
      o.stage = 'diag';
      if (S.set.autoDiag) { if (!O.autoTests(o)) O.afterDiag(o); } else o.decide = false;
    }
    const v = g.visitorOf(o.id);
    if (v) { if (o.client.waits) { const ch = N.spot('chair', 0, 0, o.id); g.vGo(v, ch[0], ch[1]); } else g.vLeave(o.id); }
  }

  // ---------- диагностика ----------
  O.hyp = function (o) {
    const S = WW.S, car = S.cars[o.car], m = C.model(car), out = [];
    for (const sym of o.syms) {
      const sd = D.sym[sym]; let list = [], tot = 0;
      for (const nd in sd.c) { if (!car.nodes[nd]) continue; const sg = m.sig.find(s => s.n === nd); const w = sd.c[nd] * (sg ? 1 + sg.w * .4 : 1) * C.pBad(car.nodes[nd]); list.push({ node: nd, w, sig: sg && sg.t }); tot += w; }
      list.forEach(x => x.p = tot > 0 ? x.w / tot : 0); list.sort((a, b) => b.p - a.p);
      out.push({ sym, list });
    }
    return out;
  };
  O.testWhy = function (o, t) {
    const S = WW.S, car = S.cars[o.car], d = D.tests[t];
    if (d.tool && !S.upg[d.tool]) return 'нужен прибор: ' + D.upg[d.tool].n;
    if (d.run && !C.runs(car)) return 'машина не на ходу';
    if (o.tests.includes(t)) return 'в очереди';
    return '';
  };
  O.queueTest = function (o, t) { if (O.testWhy(o, t)) return false; if (o.stage !== 'diag') return false; o.tests.push(t); o.decide = false; return true; };
  O.unqueueTest = function (o, t) { const i = o.tests.indexOf(t); if (i >= 0 && !(o.busy && WW.S.pawns.some(p => p.task && p.task.o === o.id && p.task.test === t))) o.tests.splice(i, 1); if (!o.tests.length) o.decide = true; };
  function nextStd(o) {
    const hy = O.hyp(o); let q = 0;
    for (const h of hy) {
      if (h.list.length && h.list[0].p >= .62) continue;
      const cand = (D.symTests[h.sym] || []).filter(t => !o.done.includes(t) && !O.testWhy(o, t));
      const top = h.list.slice(0, 3).map(x => x.node);
      const t = cand.find(t => top.some(n => D.tests[t].nodes[n])) || cand[0];
      if (t && !o.tests.includes(t)) { o.tests.push(t); q++; }
    }
    return q;
  }
  O.autoTests = function (o) { const n = nextStd(o); if (n) o.decide = false; return n; };
  O.testDone = function (o, t, p) {
    const S = WW.S, car = S.cars[o.car], d = D.tests[t], g = G();
    const i = o.tests.indexOf(t); if (i >= 0) o.tests.splice(i, 1);
    o.done.push(t); o.diagMin += d.min; if (o.type === 'own') WW.emit('q', 'ownTest');
    C.reveal(car, d, p.skills.diag, p.insight === S.day); o.diagSk = p.skills.diag; o.diagBy = p.name;
    P().xp(p, 'diag', d.min / 60 * 1.5);
    if (d.special === 'accident' && car.hidden.accident) g.note('Толщиномер: ' + C.short(car) + ' — перекрас и ' + (car.hidden.bondo ? 'слой шпатлёвки' : 'вторичный окрас') + ', ' + D.rust[car.hidden.accident].n.toLowerCase() + '. Был удар.', 'info', ['car', car.id]);
    if (!o.tests.length) O.afterDiag(o);
  };
  O.afterDiag = function (o) {
    const S = WW.S, g = G();
    if (o.type !== 'own' && S.set.autoDiag && nextStd(o)) return;
    o.decide = true;
    if (o.type !== 'own' && S.set.autoEst) { O.autoEstimate(o); return; }
    g.toast('Наряд №' + o.id + ': диагностика готова — составь смету.', 'info', ['order', o.id]); WW.emit('sound', 'ping');
  };

  // ---------- смета ----------
  O.itemBusy = id => Object.values(WW.S.orders).some(o => o.jobs.some(j => j.item === id && j.status !== 'done' && j.status !== 'declined')) || WW.S.bench.some(b => b.a === id || b.b === id);
  O.mkJob = function (o, sp) {
    const S = WW.S, car = S.cars[o.car], m = C.model(car), px = G().px(), pk = G().mod('parts');
    const j = { id: S.nextId++, kind: sp.kind, node: sp.node || null, zone: sp.zone || null, key: sp.key || null, grade: sp.grade || null, status: 'prop', left: null, q: null, free: o.type === 'comeback', oem: 0, cost: 0 };
    const nd = sp.node && D.nodes[sp.node], n = sp.node && car.nodes[sp.node];
    if (sp.kind === 'replace') { const gr = D.grades[sp.grade]; j.name = (n.gone ? 'Установка новой: ' : 'Замена: ') + nd.n + ' (' + gr.short + ')'; j.h = nd.repl * (n.gone ? .6 : 1); j.oem = nd.part * m.pm * px; j.cost = j.oem * gr.price * pk * ((!o.fast && sp.grade !== 'used') ? .8 : 1); j.sk = nd.sk; }
    else if (sp.kind === 'repair') { const kit = sp.grade || 'oem'; j.grade = kit; j.name = (sp.node === 'frame' ? 'Сварка: ' : 'Ремонт на станке: ') + nd.n + ' (ремкомплект ' + D.grades[kit].short + ')'; j.h = nd.rep; j.oem = nd.part * m.pm * px * .12; j.cost = j.oem * D.grades[kit].price * pk; j.sk = nd.sk; j.cons = 1; }
    else if (sp.kind === 'remove') { j.name = 'Снять на склад: ' + nd.n; j.h = (nd.repl || nd.rep) * .45; j.sk = nd.sk; }
    else if (sp.kind === 'install') { const it = S.parts.find(x => x.id === sp.item); j.item = sp.item; j.grade = it.grade; j.itemT = Math.round(it.t); j.name = 'Со склада: ' + nd.n + ' (' + D.grades[it.grade].short + ', ' + Math.round(it.t) + '%)'; j.h = (nd.repl || nd.rep) * (n.gone ? .6 : 1); j.oem = nd.part * m.pm * px; j.sk = nd.sk; }
    else if (sp.kind === 'svc') { const d = D.svc[sp.key]; j.name = d.n; j.h = d.h; j.oem = d.part * px; j.cost = j.oem * (S.upg.shelf ? .9 : 1); j.sk = d.sk; j.cons = 1; }
    else if (sp.kind === 'own') { const d = D.own[sp.key]; j.name = d.n; j.h = d.h; j.oem = d.part * px; j.cost = j.oem; j.sk = d.sk; j.cons = 1; }
    else if (sp.kind === 'rust') { const d = D.own.rust; j.name = d.n + ': ' + D.rust[sp.zone].n.toLowerCase(); j.h = d.h * (D.rust[sp.zone].struct ? 1.5 : 1); j.oem = d.part * px; j.cost = j.oem; j.sk = 'body'; j.cons = 1; }
    else if (sp.kind === 'tune') { const d = D.tune[sp.key]; j.name = 'Тюнинг: ' + d.n; j.h = d.h; j.oem = d.part * px * (m.pm > 1.2 ? 1.3 : 1); j.cost = j.oem; j.sk = d.sk; }
    j.cost = Math.round(j.cost); O.price(o, j);
    return j;
  };
  O.price = function (o, j) {
    const S = WW.S;
    j.labor = Math.round(j.h * o.rate);
    j.pp = j.item ? Math.round(j.oem * D.grades[j.grade].price * (.5 + .5 * (j.itemT || 50) / 100) * (1 + S.set.markup)) : Math.round(j.cost * (1 + S.set.markup));
    j.sup = Math.round(j.labor * .05);
    j.total = j.free ? 0 : j.labor + j.pp + j.sup;
    j.fair = Math.round((j.h * D.marketRate(S.year) + j.oem * (j.kind === 'repair' ? 1 : 1.4)) * 1.05);
  };
  // почему работу нельзя добавить ('' — можно)
  O.why = function (o, sp) {
    const S = WW.S, car = S.cars[o.car], n = sp.node && car.nodes[sp.node], nd = sp.node && D.nodes[sp.node];
    if (sp.node && !n) return 'у машины нет такого узла';
    if (sp.node && o.jobs.some(j => j.node === sp.node && j.status !== 'declined' && j.status !== 'done')) return 'по этому узлу уже есть работа в наряде';
    if (!sp.node && o.jobs.some(j => j.status !== 'declined' && j.status !== 'done' && j.kind === sp.kind && j.zone == (sp.zone || null) && j.key == (sp.key || null))) return 'уже в наряде';
    if (sp.kind === 'repair') { if (n.gone) return 'узел снят с машины'; if (!nd.rep) return 'этот узел не ремонтируется — только замена'; if (n.reps <= 0) return 'ресурс ремонтов исчерпан — только замена'; if (!N.bench(nd.sk)) return 'нужен станок: ' + D.build[D.benchOf(nd.sk)].n; }
    if (sp.kind === 'replace' && !nd.repl) return 'этот узел не меняется целиком';
    if (sp.kind === 'remove') { if (o.type !== 'own') return 'снимать детали можно только со своих машин'; if (n.gone) return 'уже снят'; if (sp.node === 'frame') return 'силовой кузов не снимается'; }
    if (sp.kind === 'install') { const it = S.parts.find(x => x.id === sp.item); if (!it) return 'детали нет на складе'; if (!C.fits(it, car)) return 'деталь не подходит к этой модели'; if (O.itemBusy(it.id)) return 'деталь уже занята другой работой'; }
    if (sp.kind === 'tune' && car.mods.includes(sp.key)) return 'уже стоит';
    return '';
  };
  O.addJob = function (o, sp) {
    if (o.stage !== 'diag' && o.type !== 'own' && o.stage !== 'work' && o.stage !== 'parts') return null;
    if (O.why(o, sp)) return null;
    const j = O.mkJob(o, sp); o.jobs.push(j);
    if (sp.finding) { j.finding = 1; o.findings = o.findings.filter(n => n !== sp.node); if ((o.mustFind || []).includes(sp.node)) j.must = 1; }
    return j;
  };
  O.delJob = function (o, jid) { const j = o.jobs.find(x => x.id === jid); if (j && (j.status === 'prop' || j.status === 'declined')) o.jobs = o.jobs.filter(x => x !== j); };
  function remake(o, j, grade) { const n = O.mkJob(o, { kind: j.kind, node: j.node, grade: grade || j.grade }); n.finding = j.finding; n.free = j.free; O.price(o, n); return n; }
  O.setGrade = function (o, jid, grade) { const i = o.jobs.findIndex(x => x.id === jid), j = o.jobs[i]; if (!j || j.status !== 'prop' || (j.kind !== 'replace' && j.kind !== 'repair')) return; o.jobs[i] = remake(o, j, grade); };
  O.setFast = function (o, fast) { o.fast = fast; o.jobs = o.jobs.map(j => (j.status !== 'prop' || j.kind !== 'replace') ? j : remake(o, j)); };
  O.toggleFree = function (o, jid) { const j = o.jobs.find(x => x.id === jid); if (!j || o.type === 'own') return; j.free = !j.free; O.price(o, j); };
  O.suggest = function (o) {
    const S = WW.S, car = S.cars[o.car]; let n = 0;
    for (const h of O.hyp(o)) {
      const top = h.list[0]; if (!top) continue;
      if (car.nodes[top.node].lo >= D.FAULT) continue;
      if (O.addJob(o, { kind: D.nodes[top.node].repl ? 'replace' : 'repair', node: top.node, grade: 'oem' })) n++;
    }
    return n;
  };
  O.autoEstimate = function (o) { O.suggest(o); if (o.jobs.some(j => j.status === 'prop')) O.send(o); else if (o.type !== 'own' && !o.jobs.some(j => j.status !== 'declined')) O.giveUp(o); };
  O.send = function (o) {
    if (!o.jobs.some(j => j.status === 'prop')) return false;
    o.decide = false; WW.emit('q', o.type === 'own' ? 'ownSent' : 'sent');
    if (o.type === 'own') { for (const j of o.jobs) if (j.status === 'prop') O.orderPart(o, j); O.setWorkStage(o); return true; }
    for (const j of o.jobs) if (j.status === 'prop') O.price(o, j);
    o.stage = 'approval'; return true;
  };
  O.giveUp = function (o) { if (o.type === 'own') return O.closeOwn(o); o.jobs = o.jobs.filter(j => j.status !== 'prop'); if (o.jobs.some(j => j.status === 'done')) { o.stage = 'qc'; return; } o.declined = true; o.sat -= 10; O.toReady(o); };

  function approve(o, p) {
    const S = WW.S, car = S.cars[o.car], arch = D.arch[o.client.arch], g = G();
    const trust = (S.rep.h - 50) / 50 + p.skills.talk / 40 + (P().has(p, 'pusher') ? .5 : 0) + (S.upg.waiting ? .1 : 0) + (o.dueK && o.dueK < .9 ? .15 : 0);
    const props = o.jobs.filter(j => j.status === 'prop');
    const sum = o.jobs.filter(j => j.status !== 'declined').reduce((s, j) => s + j.total, 0);
    const stress = sum / (arch.budget * (C.value(car, 't') * .5 + 260 * g.px()));
    const tm = o.client.temper || 'normal', isExtra = j => !j.must && !(j.node && car.faults.some(f => f.node === j.node && o.syms.includes(f.sym)));
    let yes = 0, no = 0;
    const scene = tm === 'paranoid' && props.some(j => !j.free && isExtra(j));
    if (scene) { o.sat -= 20; g.repAdd('h', -1.5); g.note('№' + o.id + ': ' + o.client.name + ' устроил скандал у стойки: «Я приехал с одной проблемой, а вы мне полмашины меняете! Развод!» Все рекомендации отклонены.', 'bad', ['order', o.id]); for (const pw of P().staff()) if (pw.task && pw.task.type === 'desk') P().think(pw, 'yell', 'Клиент наорал', -6, 1); }
    for (const j of props) {
      let ok = j.free;
      if (!ok && scene && isExtra(j)) { j.status = 'declined'; j.pA = 0; no++; continue; }
      if (!ok) {
        const f = j.node && car.faults.find(x => x.node === j.node);
        const urg = f ? (D.sym[f.sym].norun ? 1.3 : /brakes|steer/.test(j.node) ? .9 : .5) : -.4;
        const ev = j.node && car.nodes[j.node].hi < D.FAULT ? .5 : (j.node && car.nodes[j.node].lo >= 60 ? -.8 : 0);
        const ex = isExtra(j), tk = !ex ? 0 : tm === 'trusting' ? 2.6 : tm === 'tight' ? -1.8 : tm === 'paranoid' ? -3 : 0;
        const x = 1.1 + 3 * (j.fair - j.total) / Math.max(1, j.total) + trust + .8 * urg + ev - (tm === 'trusting' ? .5 : 1.2) * stress + tk;
        j.pA = U.sig(x); ok = U.chance(j.pA);
      }
      if (ok) { yes++; O.orderPart(o, j); if (!j.free && j.node && car.nodes[j.node].t >= 60 && P().has(p, 'pusher')) g.repAdd('h', -.4); }
      else { j.status = 'declined'; no++; }
    }
    P().xp(p, 'talk', .3); if (yes > 1) WW.emit('q', 'upsell');
    if (yes) g.toast('№' + o.id + ': ' + o.client.name + fem(o.client, ' согласовал ', ' согласовала ') + yes + ' из ' + (yes + no) + ' ' + U.plural(yes + no, 'позиции', 'позиций', 'позиций') + '.', no ? 'info' : 'good', ['order', o.id]);
    else g.toast('№' + o.id + ': ' + o.client.name + fem(o.client, ' отказался', ' отказалась') + ' от работ. Отказ записан.', 'bad', ['order', o.id]);
    O.setWorkStage(o);
  }
  O.orderPart = function (o, j) {
    const S = WW.S, car = S.cars[o.car], g = G(), m = C.model(car);
    if (j.cost > 0) { g.money(-j.cost, o.type === 'own' ? 'ownParts' : 'partsCost'); if (o.type === 'own') car.cost += j.cost; }
    if (j.cost <= 0 || j.cons) { j.status = 'ready'; return; }
    let day = S.day, min; const src = j.grade === 'used' ? 'junk' : (!o.fast ? 'dist' : 'store');
    if (src !== 'store' || m.rare || S.phase !== 'day') { day = S.day + 1 + (m.rare && j.kind !== 'tune' ? 1 : 0); min = U.rf(455, 500); }
    else { min = S.min + U.rf(60, 180) * (S.upg.shelf ? .5 : 1) * g.mod('delivery'); if (min > 1060) { day++; min = U.rf(490, 540); } }
    if (U.chance(.04)) { day++; o.notes.push('Поставщик прислал не ту деталь — «модель до мая и после разные». Ждём ещё день.'); g.toast('№' + o.id + ': пришла не та деталь, пересылают. +1 день.', 'bad', ['order', o.id]); }
    j.status = 'ordered'; j.eta = { day, min }; j.src = src;
    S.deliveries.push({ o: o.id, j: j.id, day, min, src });
  };
  O.setWorkStage = function (o) {
    const act = o.jobs.filter(j => j.status !== 'declined' && j.status !== 'prop');
    if (o.jobs.some(j => j.status === 'prop') && o.type !== 'own' && o.stage === 'approval') return;
    if (act.some(j => j.status === 'ready' || j.status === 'doing')) { o.stage = 'work'; return; }
    if (act.some(j => j.status === 'ordered')) { o.stage = 'parts'; return; }
    if (act.length && act.every(j => j.status === 'done')) { if (o.type === 'own') O.closeOwn(o); else if (o.stage !== 'qc' && o.stage !== 'ready') o.stage = 'qc'; return; }
    if (o.type === 'own') { o.stage = 'diag'; o.decide = true; return; }
    if (o.stage === 'approval') { o.declined = true; O.toReady(o); }
  };

  // ---------- склад и станки ----------
  O.toStock = function (car, node, from) { const S = WW.S, n = car.nodes[node]; const it = { id: S.nextId++, node, model: car.model, grade: n.grade, t: n.t, reps: n.reps, from: from || ('снято с ' + C.name(car)) }; S.parts.push(it); return it; };
  O.partName = it => D.nodes[it.node].n + ' · ' + D.models[it.model].make + ' ' + D.models[it.model].name;
  O.partValue = it => Math.max(1, Math.round(D.nodes[it.node].part * D.models[it.model].pm * G().px() * D.grades[it.grade].price * Math.pow(it.t / 100, 1.3) * .4));
  O.sellPart = function (id) { const S = WW.S, it = S.parts.find(x => x.id === id); if (!it || O.itemBusy(id)) return; const v = O.partValue(it); S.parts = S.parts.filter(x => x !== it); G().money(v, 'misc'); G().toast('Продано с прилавка: ' + O.partName(it) + ' — ' + U.money(v) + '.', 'info'); };
  // прибавка от ремкомплекта: грейд комплекта ниже грейда детали — эффект слабее
  O.kitGain = function (partGrade, kit, Q) {
    const g = D.grades[kit].gain, diff = D.gradeRank[partGrade] - D.gradeRank[kit], k = diff > 0 ? Math.max(.25, 1 - .25 * diff) : 1;
    return { lo: g[0] * k, hi: g[1] * k, k, v: U.lerp(g[0], g[1], Math.pow((Q == null ? 60 : Q) / 100, .8)) * k };
  };
  O.kitCost = (it, kit) => Math.round(D.nodes[it.node].part * D.models[it.model].pm * G().px() * .12 * D.grades[kit].price);
  O.mergeT = (a, b, skill) => Math.min(90, Math.max(a.t, b.t) + Math.min(a.t, b.t) * (.45 + .02 * (skill || 0)));
  O.benchAdd = function (kind, a, b, kit) {
    const S = WW.S, g = G(), ia = S.parts.find(x => x.id === a), ib = b && S.parts.find(x => x.id === b); if (!ia) return 'детали нет';
    const nd = D.nodes[ia.node], sk = nd.sk;
    if (!N.bench(sk)) return 'нужен станок: ' + D.build[D.benchOf(sk)].n;
    if (O.itemBusy(a) || (b && O.itemBusy(b))) return 'деталь уже занята';
    const bj = { id: S.nextId++, kind, a, b: b || null, sk, status: 'wait', left: null, by: null };
    if (kind === 'fix') { if (!nd.rep) return 'этот узел не ремонтируется'; if (ia.reps <= 0) return 'ресурс ремонтов исчерпан'; const c = O.kitCost(ia, kit); if (S.money < c) return 'не хватает на ремкомплект'; g.money(-c, 'ownParts'); bj.kit = kit; bj.h = nd.rep * .7; bj.name = 'Ремонт: ' + O.partName(ia) + ' (комплект ' + D.grades[kit].short + ')'; }
    else { if (!ib || ib.node !== ia.node || ib.model !== ia.model) return 'нужны две одинаковые детали одной модели'; bj.h = (nd.rep || nd.repl) * .7; bj.name = 'Собрать одну из двух: ' + O.partName(ia); }
    S.bench.push(bj); return '';
  };
  O.benchCancel = function (id) { const S = WW.S, b = S.bench.find(x => x.id === id); if (!b || b.status === 'doing') return; S.bench = S.bench.filter(x => x !== b); };
  O.benchDone = function (b, p) {
    const S = WW.S, g = G(), Pm = P(), ia = S.parts.find(x => x.id === b.a), ib = b.b && S.parts.find(x => x.id === b.b);
    S.bench = S.bench.filter(x => x !== b); if (!ia) return;
    const qd = Pm.quality(p, null, { sk: b.sk }), Q = U.clamp(qd.base + U.rf(-8, 8), 0, 100), ps = Pm.fixChance(p, b.sk, ia.t);
    Pm.xp(p, b.sk, (b.tot || 60) / 60); WW.emit('sound', 'done');
    if (b.kind === 'fix') {
      ia.reps--;
      if (U.chance(ps)) { const gn = O.kitGain(ia.grade, b.kit, Q).v, was = ia.t; ia.t = Math.min(96, ia.t + gn); g.note('Станок: ' + O.partName(ia) + ' — ' + Math.round(was) + '% → ' + Math.round(ia.t) + '% (' + p.name + ', шанс был ' + Math.round(ps * 100) + '%).', 'good', ['panel', 'stock']); }
      else if (U.chance((1 - ps) * .3)) { S.parts = S.parts.filter(x => x !== ia); g.note('Станок: ' + p.name + ' сломал деталь — ' + O.partName(ia) + ' ушла в металлолом.', 'bad', ['panel', 'stock']); }
      else { ia.t = Math.max(1, ia.t - U.rf(3, 10)); g.note('Станок: ремонт не удался — ' + O.partName(ia) + ' теперь ' + Math.round(ia.t) + '%, ресурс −1 (' + p.name + ').', 'bad', ['panel', 'stock']); }
    } else if (ib) {
      const worse = ia.t < ib.t ? ia : ib, better = worse === ia ? ib : ia;
      if (U.chance(ps)) { const t = O.mergeT(ia, ib, p.skills[b.sk]) * (.9 + .1 * Q / 100); better.t = Math.max(better.t, t); better.reps = Math.max(0, Math.max(ia.reps, ib.reps) - 1); if (D.gradeRank[worse.grade] < D.gradeRank[better.grade]) better.grade = worse.grade; better.from = 'собрано из двух'; S.parts = S.parts.filter(x => x !== worse); g.note('Станок: из двух деталей собрана одна — ' + O.partName(better) + ', ' + Math.round(better.t) + '% (' + p.name + ').', 'good', ['panel', 'stock']); }
      else { S.parts = S.parts.filter(x => x !== worse); g.note('Станок: не срослось — худшая из двух деталей (' + O.partName(worse) + ') испорчена.', 'bad', ['panel', 'stock']); }
    }
  };

  // ---------- работа ----------
  O.onJobStart = function (o, j, p) {
    const S = WW.S, car = S.cars[o.car], g = G(), nd = j.node && D.nodes[j.node];
    if ((nd && nd.rusty) || j.kind === 'rust') {
      const ar = (car.rust.sills.r + car.rust.floor.r + car.rust.frame.r) / 3;
      if (ar > 30 && U.chance(.14 * (P().has(p, 'brute') ? 2 : 1))) { const ex = U.rf(40, 140); j.left += ex; j.tot += ex; o.notes.push(p.name + ' сорвал прикипевший болт — плюс ' + U.dur(ex) + ' на извлечение.'); g.toast('№' + o.id + ': прикипевший болт сорван. +' + U.dur(ex), 'bad', ['order', o.id]); }
    }
    const crit = j.kind !== 'remove' && ((nd && nd.crit) || (j.kind === 'own' && j.key === 'paint') || (j.kind === 'tune' && j.key === 'carb') || j.node === 'frame');
    if (crit && S.set.interv && WW.hasUI) {
      if (S.interv.day !== S.day) S.interv = { day: S.day, n: 0 };
      if (S.interv.n < 2) { S.interv.n++; j.interv = 'wait'; j.intervAt = S.min; WW.emit('interv', { o: o.id, j: j.id }); }
    }
  };
  O.intervDone = function (oid, jid, bonus) { const o = WW.S.orders[oid]; if (!o) return; const j = o.jobs.find(x => x.id === jid); if (j) { j.interv = 'done'; j.qb = bonus; } };
  O.finishJob = function (o, j, p) {
    const S = WW.S, car = S.cars[o.car], g = G(), Pm = P();
    const qd = Pm.quality(p, o, j); const Q = U.clamp(qd.base + U.rf(-8, 8), 0, 100);
    j.q = Math.round(Q); j.status = 'done'; j.doneBy = p.name; j.qa = qd.a;
    const hours = (j.tot || 60) / 60, own = o.type === 'own';
    Pm.xp(p, j.sk, hours); p.fam[car.model] = (p.fam[car.model] || 0) + 1;
    if (own) car.cost += hours * (p.wage || 0);
    const n = j.node && car.nodes[j.node];
    const keepOld = () => { if (n && !n.gone && n.t > 3 && own) O.toStock(car, j.node); };
    if (j.kind === 'replace' && !j.dud && U.chance(D.grades[j.grade].dud || 0) && j.grade !== 'used') {
      j.dud = 1; j.status = 'ordered'; j.left = null; j.fetched = false; j.q = null; j.eta = { day: S.day + 1, min: U.rf(455, 500) }; S.deliveries.push({ o: o.id, j: j.id, day: j.eta.day, min: j.eta.min, src: j.src || 'store' });
      o.notes.push('Бракованная деталь из коробки (' + D.grades[j.grade].short + '): ' + D.nodes[j.node].n + '. Поставщик заменит завтра утром бесплатно.'); g.note('№' + o.id + ': новая деталь оказалась бракованной — ' + D.nodes[j.node].n.toLowerCase() + ' (' + D.grades[j.grade].short + '). Замена приедет завтра.', 'bad', ['order', o.id]);
      O.setWorkStage(o); return;
    }
    if (j.kind === 'replace') { const gr = D.grades[j.grade]; j.pre = n.gone ? 0 : n.t; keepOld(); n.t = U.rf(gr.st[0], gr.st[1]) * (.85 + .15 * Q / 100); n.grade = j.grade; n.reps = gr.reps; n.orig = false; n.gone = false; C.exact(car, j.node); }
    else if (j.kind === 'install') {
      const it = S.parts.find(x => x.id === j.item);
      if (!it) { j.status = 'ready'; j.left = null; o.notes.push('Деталь со склада пропала — работа отложена.'); O.setWorkStage(o); return; }
      j.pre = n.gone ? 0 : n.t; keepOld(); S.parts = S.parts.filter(x => x !== it);
      n.t = it.t * (.9 + .1 * Q / 100); n.grade = it.grade; n.reps = it.reps; n.orig = false; n.gone = false; C.exact(car, j.node);
    } else if (j.kind === 'remove') {
      const ar = (car.rust.sills.r + car.rust.floor.r + car.rust.frame.r) / 300, bc = .05 * (Pm.has(p, 'clumsy') ? 2 : 1) * (Pm.has(p, 'brute') ? 1.6 : 1) * (1 + ar) * (Q < 40 ? 1.5 : 1);
      const it = O.toStock(car, j.node);
      if (U.chance(bc)) { it.t = Math.max(1, it.t - U.rf(10, 30)); g.note(p.name + ' повредил деталь при снятии: ' + O.partName(it) + ' теперь ' + Math.round(it.t) + '%.', 'bad', ['panel', 'stock']); }
      n.gone = true; n.t = 0; n.lo = 0; n.hi = 0;
    } else if (j.kind === 'repair') {
      const ps = Pm.fixChance(p, j.sk, n.t); j.pS = ps; j.pre = n.t; n.reps--;
      if (U.chance(ps)) {
        n.t = Math.min(96, n.t + O.kitGain(n.grade, j.grade || 'oem', Q).v);
        if (j.node === 'frame') { for (const z of ['sills', 'floor', 'frame']) { car.rust[z].r *= .3; car.rust[z].lo = 0; car.rust[z].hi = Math.ceil(car.rust[z].r) + 2; } n.t = Math.max(n.t, 97 - Math.max(car.rust.sills.r, car.rust.floor.r, car.rust.frame.r)); }
      } else {
        j.failed = true; j.free = true; O.price(o, j);
        if (U.chance((1 - ps) * .3)) { n.t = 1; n.reps = 0; o.notes.push(p.name + ' сломал деталь на станке: ' + D.nodes[j.node].n + ' — теперь только замена.'); g.note('№' + o.id + ': ' + p.name + ' сломал деталь на станке (' + D.nodes[j.node].n.toLowerCase() + '). Теперь только замена.', 'bad', ['order', o.id]); }
        else { n.t = Math.max(1, n.t - U.rf(3, 10)); o.notes.push('Ремонт не удался (' + p.name + ', шанс был ' + Math.round(ps * 100) + '%): ' + D.nodes[j.node].n + ' ' + Math.round(n.t) + '%.'); g.toast('№' + o.id + ': ремонт на станке не удался — ' + D.nodes[j.node].n.toLowerCase() + '.', 'bad', ['order', o.id]); }
      }
      C.exact(car, j.node);
    } else if (j.kind === 'svc') {
      const d = D.svc[j.key];
      for (const id in d.fx) if (car.nodes[id] && !car.nodes[id].gone) { const nn = car.nodes[id]; if (nn.t < d.fx[id][1]) nn.t = Math.min(d.fx[id][1], nn.t + d.fx[id][0] * (.7 + .3 * Q / 100)); C.exact(car, id); }
      if (d.inspect) { const spec = { nodes: {}, rust: {} }; for (const id in car.nodes) spec.nodes[id] = 14; for (const z of D.rustIds) spec.rust[z] = 14; C.reveal(car, spec, p.skills.diag); }
    } else if (j.kind === 'own' && j.key === 'detail') {
      car.detail = Math.min(1, .55 + .45 * Q / 100); if (car.nodes.interior.t < 90 && !car.nodes.interior.gone) car.nodes.interior.t += 3;
      for (const f of car.finds) { if (f.v) { g.money(f.v, 'misc'); g.note('При уборке ' + C.short(car) + ' нашли ' + f.n + ': ' + U.money(f.v) + '.', 'good'); } else if (f.t === 'receipts') { car.docs.receipts = true; g.note('В бардачке ' + C.short(car) + ' — ' + f.n + '. Документы +, цена +3%.', 'good'); } else g.note('Под сиденьем ' + C.short(car) + ' нашли ' + f.n + '.', 'info'); }
      car.finds = [];
    } else if (j.kind === 'own' && j.key === 'paint') {
      const cos = (car.rust.farch.r + car.rust.rarch.r + car.rust.doors.r) / 3, pn = car.nodes.panels;
      if (!pn.gone) { pn.t = Math.min(cos > 30 ? 76 : 98, 68 + Q * .3); C.exact(car, 'panels'); } car.detail = Math.max(car.detail, .85); if (j.color) { car.color = j.color[1]; car.colorName = j.color[0]; car.color2 = null; }
      if (cos > 30) g.toast('Покрасили поверх ржавчины: через сезон пузыри вылезут снова.', 'bad', ['car', car.id]);
    } else if (j.kind === 'rust') {
      const R = car.rust[j.zone]; R.r = U.rf(2, 8) + (100 - Q) * .1; R.lo = Math.floor(R.r); R.hi = Math.ceil(R.r) + 1;
      const fr = car.nodes.frame; fr.t = Math.max(fr.t, 97 - Math.max(car.rust.sills.r, car.rust.floor.r, car.rust.frame.r) * .92); if (D.rust[j.zone].struct) C.exact(car, 'frame'); else if (!car.nodes.panels.gone) car.nodes.panels.t = Math.min(96, car.nodes.panels.t + 4);
    } else if (j.kind === 'tune') { car.mods.push(j.key); }
    car.hist.push({ d: S.day, y: S.year, t: j.name + (j.failed ? ' — неудачно' : ''), by: p.name, q: j.q });
    C.refreshFaults(car); N.addDirt(car.x, car.y, /eng|trans/.test(j.sk) ? .3 : .16);
    // разборка открыла скрытую поломку: каскад от корневой причины
    if (o.hidden && j.node) for (const hd of o.hidden.slice()) if (hd.root === j.node && car.nodes[hd.node] && car.nodes[hd.node].t < D.FAULT) {
      o.hidden = o.hidden.filter(x => x !== hd); C.exact(car, hd.node); const f = car.faults.find(x => x.node === hd.node); if (f && !o.syms.includes(f.sym)) o.syms.push(f.sym);
      if (!o.findings.includes(hd.node)) o.findings.push(hd.node); o.mustFind = (o.mustFind || []).concat(hd.node);
      o.notes.push('Разборка открыла ещё одну проблему: ' + D.nodes[hd.node].n + ' — ' + Math.round(car.nodes[hd.node].t) + '%. Без неё машина не будет исправна.'); g.note('№' + o.id + ': разобрали — а там ещё и ' + D.nodes[hd.node].n.toLowerCase() + '. Нужно дополнительное согласование.', 'bad', ['order', o.id]); WW.emit('sound', 'ping');
    }
    if (j.h >= 5 && Q > 68 && /eng|trans/.test(j.sk) && !j.failed) Pm.think(p, 'big', 'Перебрал агрегат — работает как часы', 8, 3);
    if (Pm.has(p, 'petrol')) { if (own || j.kind === 'tune') Pm.think(p, 'pet', 'Возился с проектной машиной', 5, 2); else if (j.kind === 'svc') Pm.think(p, 'bore', 'Скучная рутина', -3, 1); }
    if (!own) {
      if (U.chance(.022 * (Pm.has(p, 'clumsy') ? 2.2 : 1) * (Pm.has(p, 'sloppy') ? 1.5 : 1))) { const c = Math.round(U.rf(40, 120) * g.px()); g.money(-c, 'fine'); o.sat -= 15; o.notes.push(p.name + ' поцарапал крыло. Компенсация ' + U.money(c) + '.'); g.note('№' + o.id + ': ' + p.name + ' поцарапал кузов клиента. Компенсация ' + U.money(c) + '.', 'bad', ['order', o.id]); }
      if (j.kind === 'svc' && j.key === 'oil' && U.chance(.006 * (Pm.has(p, 'sloppy') ? 2.5 : 1) * (Q < 45 ? 2 : 1))) { const c = Math.round(U.rf(700, 1800) * g.px()); g.money(-c, 'fine'); g.repAdd('q', -6); g.note(p.name + ' не затянул сливную пробку. Мотор клиента заклинило через квартал. Иск: ' + U.money(c) + '.', 'bad'); Pm.think(p, 'guilt', 'Запорол чужой мотор', -8, 4); }
      if (o.type === 'fault' && U.chance(.28)) { const cand = C.nodeIds(car).filter(id => car.nodes[id].t < 44 && !car.nodes[id].gone && id !== 'frame' && !o.jobs.some(x => x.node === id) && !o.findings.includes(id)); if (cand.length) { const id = U.pick(cand); C.reveal(car, { nodes: { [id]: 9 } }, p.skills.diag); o.findings.push(id); g.toast('№' + o.id + ': попутно заметили — ' + D.nodes[id].n.toLowerCase() + ' в плохом состоянии.', 'info', ['order', o.id]); } }
    }
    WW.emit('sound', 'done');
    O.setWorkStage(o);
  };
  O.qcDone = function (o, p) {
    const S = WW.S, car = S.cars[o.car], g = G();
    const left = car.faults.filter(f => o.syms.includes(f.sym));
    if (left.length && U.chance(.45 + p.skills.diag * .03)) {
      o.qcFail++; o.stage = 'diag'; o.decide = true;
      o.notes.push('ОТК (' + p.name + '): симптом «' + D.sym[left[0].sym].n + '» остался. Диагноз был неверным или ремонт не удался.');
      g.note('№' + o.id + ': ОТК не пройден — ' + D.sym[left[0].sym].n.toLowerCase() + ' никуда не делся. Наряд вернулся на диагностику.', 'bad', ['order', o.id]);
      if (S.set.autoDiag) { if (!nextStd(o) && S.set.autoEst) O.autoEstimate(o); }
      return;
    }
    if (left.length) o.cb = { why: 'unfixed', node: left[0].node };
    O.toReady(o);
  };
  O.toReady = function (o) {
    const S = WW.S, g = G();
    o.stage = 'ready'; o.decide = false; o.readyAt = S.min; o.readyDay = S.day; o.tests = []; o.now = false; o.pin = false; o.hold = false;
    const v = g.visitorOf(o.id);
    if (o.client.waits && v) { const cs = N.spot('client', 0, 0, o.id); g.vGo(v, cs[0], cs[1], 'here'); o.vis = true; }
    else if (S.phase === 'day' && S.min < 1020) { o.pickDay = S.day; o.pickAt = S.min + U.rf(35, 140); if (o.pickAt > 1110) { o.pickDay++; o.pickAt = U.rf(470, 570); } }
    else { o.pickDay = S.day + 1; o.pickAt = U.rf(470, 570); }
  };
  O.invoice = function (o) {
    const S = WW.S; let labor = 0, parts = 0, sup = 0, fair = 0, cost = 0, n = 0, qs = 0;
    for (const j of o.jobs) if (j.status === 'done') { n++; qs += j.q; cost += j.cost; if (j.free) continue; labor += j.labor; parts += j.pp; sup += j.sup; fair += j.fair; }
    const diag = (o.type === 'fault' && o.done.length) ? S.set.diagFee : 0;
    const tax = Math.round((labor + parts + sup + diag) * .06);
    return { labor, parts, sup, diag, tax, total: labor + parts + sup + diag + tax, fair: fair + (diag ? Math.round(20 * G().px()) : 0), cost, n, q: n ? qs / n : 0 };
  };
  function payout(o, p) {
    const S = WW.S, car = S.cars[o.car], g = G(), arch = D.arch[o.client.arch], inv = O.invoice(o), Pm = P();
    g.money(inv.labor + inv.sup, 'labor'); g.money(inv.parts, 'partsRev'); g.money(inv.diag, 'diag'); g.money(inv.tax, 'taxHeld'); S.taxOwed += inv.tax;
    const late = o.due && (o.readyDay > o.due.day || (o.readyDay === o.due.day && o.readyAt > o.due.min + 20));
    const used = (o.readyDay - o.t0d) * 690 + (o.readyAt - o.t0), early = !late && o.dueSpan && used < o.dueSpan * .65;
    let sat = o.sat + p.skills.talk * .5 - (Pm.has(p, 'grump') ? 6 : 0);
    if (inv.n) sat += 10; if (late) sat -= (o.dueK && o.dueK < .9 ? 30 : 22); else sat += early ? 12 : 6;
    if (inv.fair > 0 && inv.total > 0) sat += U.clamp((inv.fair - (inv.total - inv.tax)) / inv.fair * 45, -25, 15);
    if (o.declined) sat = Math.min(sat, 55);
    if (o.type === 'comeback') sat = Math.min(sat, 62);
    sat = U.clamp(sat, 5, 100); const stars = U.clamp(Math.round(sat / 20), 1, 5);
    let tip = 0; if (sat > 82 && arch.tipk && U.chance(.6)) { tip = Math.round(U.rf(3, 14) * arch.tipk * g.px()); g.money(tip, 'tips'); }
    if (inv.n) g.repTo('q', 38 + inv.q * .62, .05);
    g.repTo('s', late ? (o.dueK && o.dueK < .9 ? 8 : 18) : (early ? 96 : 88), .045);
    if (inv.fair > 0) g.repTo('p', U.clamp(55 + (inv.fair - (inv.total - inv.tax)) / inv.fair * 150, 5, 95), .045);
    g.repTo('h', 62, .02); if (Pm.has(p, 'honest')) g.repAdd('h', .5);
    for (const j of o.jobs) if (j.status === 'done' && !j.free && j.pre != null && j.pre >= 58) { if (U.chance(.4)) { g.repAdd('h', -5); S.reviews.unshift({ d: S.day, stars: 2, name: o.client.name, t: 'Знакомый механик посмотрел старую деталь — она была живая. Развели на «' + j.name + '».' }); g.note('Слух пошёл: ' + o.client.name + ' рассказывает, что ему впарили лишнюю работу («' + j.name + '»).', 'bad'); } }
    for (const j of o.jobs) if (j.status === 'done' && j.free && !j.failed && o.type !== 'comeback') g.repAdd('h', 1.5);
    const txt = late ? U.pick(['Обещали одно, отдали позже. Не люблю, когда врут про сроки.', 'Сделали, но ждал дольше обещанного.', 'Назвали срок — держите срок.']) : stars >= 5 ? U.pick(['Починили быстро и честно. Буду советовать всем на заводе.', 'Наконец-то сервис, где объясняют по-человечески.', early ? 'Сказали — завтра, а позвонили уже сегодня. Вот это сервис.' : 'Показали старую деталь в коробке. Уважаю.']) : stars === 4 ? U.pick(['Нормально сделали, цена по делу.', 'Всё работает. Кофе бы ещё получше.']) : stars === 3 ? U.pick(['Терпимо. Дороговато.', 'Сделали, вопросов нет, восторга тоже.']) : U.pick(['Долго, дорого и нахамили.', 'Больше не приеду.']);
    S.reviews.unshift({ d: S.day, stars, name: o.client.name, t: txt }); if (S.reviews.length > 40) S.reviews.length = 40;
    S.stats.orders++; S.stats.stars.push(stars); if (S.stats.stars.length > 200) S.stats.stars.shift();
    S.dayClosed = (S.dayClosed || 0) + 1; (S.dayStars = S.dayStars || []).push(stars);
    S.enc[car.model] = (S.enc[car.model] || 0) + 1;
    let cb = o.cb;
    if (!cb) for (const j of o.jobs) if (j.status === 'done' && !j.failed && j.node && (j.kind === 'replace' || j.kind === 'repair' || j.kind === 'install') && U.chance(.3 * Math.pow(1 - j.q / 100, 2))) { cb = { why: 'quality', node: j.node }; break; }
    if (cb && (cb.why === 'quality' || U.chance(.85))) { S.comebacks.push({ day: S.day + U.ri(1, 3), car: car.id, client: o.client, why: cb.why, node: cb.node, n: (o.cbN || 0) + 1 }); car.keep = true; }
    car.hist.push({ d: S.day, y: S.year, t: 'Обслужена в мастерской, чек ' + U.money(inv.total), by: p.name });
    g.log('№' + o.id + ' ' + C.name(car) + ' — ' + o.client.name + ': ' + U.money(inv.total) + ', ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + (tip ? ', чаевые ' + U.money(tip) : '') + (late ? ', с опозданием' : early ? ', раньше срока' : '') + '. «' + txt + '»', stars >= 4 ? 'good' : stars <= 2 ? 'bad' : 'info');
    WW.emit('paid', { o: o.id, total: inv.total, stars, x: car.x, y: car.y, tip }); WW.emit('sound', 'cash');
    car.order = null; car.pinBay = false; g.send(car, 'exit'); g.vLeave(o.id); delete S.orders[o.id];
  }
  O.deskDone = function (o, sub, p) {
    const S = WW.S;
    if (sub === 'call') return approve(o, p);
    if (sub === 'payout') return payout(o, p);
    const w = S.min - o.t0; if (w > o.client.pat * .6) o.sat -= 8; if (S.upg.waiting) o.sat += 4; o.sat += U.clamp(N.beauty() / 3, -3, 4); if (N.roomOk(p.x, p.y, 'office')) o.sat += 2;
    o.client.read = U.chance(.25 + p.skills.talk * .05); if (N.anyRoom('wait')) o.client.pat *= 1.25;
    P().xp(p, 'talk', .25);
    if (S.set.due === 'ask' && WW.hasUI) { o.duePending = true; WW.emit('due', o.id); return; }
    O.setDue(o, S.set.due === 'ask' ? 'norm' : S.set.due, S.set.duePct);
  };

  // ---------- свои машины ----------
  O.newOwn = function (car) { if (car.order || car.sale) return null; return O.create(car, null, 'own'); };
  O.closeOwn = function (o) {
    const S = WW.S, car = S.cars[o.car];
    if (o.jobs.some(j => j.status === 'doing')) return false;
    for (const j of o.jobs) if (j.status === 'ordered' || (j.status === 'ready' && !j.fetched && !j.cons && j.cost > 0)) { G().money(j.cost, 'ownParts'); if (car) car.cost -= j.cost; }
    const done = o.jobs.filter(j => j.status === 'done').length;
    if (done) G().note('Работы по ' + C.name(car) + ' завершены (' + done + '). Проверь карточку — можно выставлять.', 'good', ['car', car.id]);
    O.drop(o, false); return true;
  };
  O.buyout = function (o, price) {
    const S = WW.S, car = S.cars[o.car], g = G(), arch = D.arch[o.client.arch];
    if (o.type === 'own' || !car || o.stage === 'ready') return false;
    const slot = g.freeSlot(['proj']); if (!slot) { g.toast('Нет свободного места под проект.', 'bad'); return false; }
    if (S.money < price) { g.toast('Не хватает денег.', 'bad'); return false; }
    if (o.buyTried) { g.toast('Второй раз предлагать бестактно.', 'bad'); return false; }
    o.buyTried = true;
    const V = C.value(car, 't'), est = o.jobs.filter(j => j.status !== 'declined' && j.status !== 'done').reduce((s, j) => s + j.total, 0);
    if (!U.chance(U.sig(5 * (price / V - .62) + (arch.sells ? .8 : 0) + Math.min(1.2, est / V)))) { o.sat -= 6; g.toast(o.client.name + ': «За такие деньги? Нет уж, чините».', 'bad', ['order', o.id]); return false; }
    if (price < V * .4) g.repAdd('h', -2);
    g.money(-price, 'carBuy'); car.owner = 'player'; car.cost = price; car.days = 0; S.stats.bought++;
    for (const j of o.jobs) if (j.status === 'ordered' || j.status === 'ready') g.money(j.cost * .9, 'partsCost');
    g.note(o.client.name + fem(o.client, ' продал тебе ', ' продала тебе ') + C.name(car) + ' за ' + U.money(price) + ' «как есть». Ты знаешь о ней всё — лучший источник машин.', 'good', ['car', car.id]);
    O.drop(o, false); if (g.kindOf(car) !== 'bay') g.send(car, slot.id); else car.pinBay = false;
    return true;
  };
  // ручная перестановка своей машины
  O.carTo = function (car, kind) {
    const g = G(); if (car.mv || car.push) { g.toast('Машина уже в движении.', 'info'); return false; }
    if (g.kindOf(car) === kind) return false;
    const s = g.freeSlot([kind], car); if (!s) { g.toast(kind === 'bay' ? 'Свободного бокса нет — освободи один командой «на стоянку».' : 'Нет свободного места этого типа — размечай в «Стройке».', 'bad'); return false; }
    car.pinBay = kind === 'bay'; const o = car.order && WW.S.orders[car.order]; if (o) { o.pin = kind === 'bay'; o.hold = kind !== 'bay'; P().rethink((p, t) => t.o === o.id && t.type !== 'desk'); }
    if (!g.send(car, s.id)) { g.toast('Не проехать: машина заперта или к месту нет дороги.', 'bad'); return false; } return true;
  };
  // пакет «обновить всё изношенное»: все узлы, про которые известно, что они ниже порога
  O.upsell = function (o, lim) { const car = WW.S.cars[o.car]; let n = 0; for (const id of C.nodeIds(car)) { const nd = car.nodes[id]; if (nd.gone || id === 'frame' || nd.hi >= (lim || 60) || nd.hi - nd.lo > 45) continue; if (O.addJob(o, { kind: D.nodes[id].repl ? 'replace' : 'repair', node: id, grade: 'oem' })) n++; } return n; };
})(globalThis.WW);
