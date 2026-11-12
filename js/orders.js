// WRENCHWORLD — клиенты и заказ-наряды: приём → диагностика → смета → согласование → детали → работа → ОТК → выдача → гарантия.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, MAP = D.MAP, O = WW.O = {};
  const G = () => WW.G, P = () => WW.P;
  O.stages = [['intake', 'Приём'], ['diag', 'Диагностика'], ['approval', 'Согласование'], ['parts', 'Ждём детали'], ['work', 'В работе'], ['qc', 'ОТК'], ['ready', 'Готово']];
  O.stageName = s => (O.stages.find(x => x[0] === s) || ['', s])[1];

  // ---------- поток клиентов ----------
  O.planDay = function () {
    const S = WW.S, g = G();
    S.arrivals = S.arrivals.filter(a => a.day > S.day);
    const dowK = [1.3, 1, 1, 1, 1.2, .9, .5][g.dow()];
    const wK = S.weather === 'blizzard' ? .35 : S.weather === 'rain' ? .9 : 1;
    const rate = (2.7 + (g.rep() - 30) * .075) * dowK * (1 + (S.upg.sign ? .15 : 0) + (S.adDays > 0 ? .35 : 0)) * g.mod('clients') * wK;
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
    const sym = U.wpick(syms, s => D.sym[s].c[node]);
    return { node, sym };
  }
  function complaint(client, f) {
    const s = D.sym[f.sym];
    if (U.chance(client.know)) return s.n + (client.know > .7 ? '. «Думаю, это ' + D.nodes[U.chance(.65) ? f.node : U.pick(Object.keys(s.c))].n.toLowerCase() + '»' : '');
    return '«' + s.v + '»';
  }
  O.create = function (car, client, type) {
    const S = WW.S;
    const o = { id: S.nextId++, car: car.id, client, type, stage: type === 'own' ? 'diag' : 'intake', t0: S.min, t0d: S.day, arrived: type === 'own', complaint: '', syms: [], tests: [], done: [],
      jobs: [], findings: [], due: null, urgent: false, assign: null, busy: null, desk: null, decide: type === 'own', sat: 60, rate: Math.round(S.set.rate * G().mod('rate')), fast: S.set.fast, notes: [], qcFail: 0, diagMin: 0 };
    S.orders[o.id] = o; car.order = o.id; return o;
  };
  O.arrive = function (a) {
    const S = WW.S, g = G();
    if (a.type === 'comeback') return O.comeback(a.cb);
    const slot = g.freeSlot(['park', 'yard']);
    if (!slot) { g.note('Клиент развернулся у въезда: негде поставить машину.', 'bad', ['panel', 'orders']); g.repAdd('s', -.6); return; }
    const aid = a.arch || U.wpick(Object.keys(D.arch), k => ({ student: 1.2, mom: 1.2, worker: 1.3, retiree: 1.1, biz: .5, petrol: .7 })[k]);
    const arch = D.arch[aid];
    const pool = Object.values(D.models).filter(m => m.y[0] + 2 <= S.year || m.y[1] < S.year);
    const m = a.model ? D.models[a.model] : U.wpick(pool, m => m.share * (arch.pref[m.id] || .5));
    const yHi = Math.min(m.y[1], S.year - 1), yLo = Math.min(yHi, Math.max(m.y[0], S.year - Math.round(16 * arch.old)));
    const car = C.gen({ model: m.id, year: U.ri(yLo, yHi), quality: 'client', owner: 'client' });
    const fn = U.pick(D.first);
    const client = { name: (D.female[fn] ? 'миссис ' : 'мистер ') + U.pick(D.last), first: fn, arch: aid, pat: arch.pat * U.rf(.75, 1.3) * (S.upg.waiting ? 1.5 : 1), know: arch.know, f: !!D.female[fn] };
    let type = 'fault';
    if (!a.fault && U.chance(.44)) type = 'service';
    const o = O.create(car, client, type);
    if (type === 'fault') {
      const f = a.fault || pickFault(car, m) || { node: 'brakes', sym: 'brake_bad' };
      const t = D.sym[f.sym].norun ? U.rf(2, 11) : U.rf(8, 37);
      C.addFault(car, f.node, f.sym, t); o.syms.push(f.sym); o.complaint = complaint(client, f);
      if (!a.fault && U.chance(.12)) { const f2 = pickFault(car, m); if (f2 && f2.node !== f.node && !D.sym[f2.sym].norun && f2.sym !== f.sym) { C.addFault(car, f2.node, f2.sym, U.rf(12, 38)); o.syms.push(f2.sym); o.complaint += ' И ещё: ' + complaint(client, f2); } }
    } else {
      const se = g.season();
      o.svc = U.wpick(Object.keys(D.svc), k => ({ oil: 4, tuneup: 1.5, pads: 2, tires: (se >= 2 ? 2.5 : 1), align: (se === 0 ? 2 : 1.2), season: (se === 2 ? 3 : se === 3 ? 2 : .6), insp: (se === 1 ? 2 : 1) })[k]);
      o.complaint = D.svc[o.svc].n;
    }
    car.towed = !C.runs(car);
    g.send(car, slot.id);
    if (car.towed) g.log('Эвакуатор привёз ' + C.name(car) + ' — не заводится.', 'info');
    WW.emit('sound', 'bell');
    return o;
  };
  O.comeback = function (carId) {
    const S = WW.S, g = G(), i = S.comebacks.findIndex(c => c.car === carId); if (i < 0) return;
    const cb = S.comebacks[i], car = S.cars[carId]; if (!car) { S.comebacks.splice(i, 1); return; }
    if (cb.n >= 2) {
      S.comebacks.splice(i, 1); delete S.cars[carId]; g.repAdd('q', -5); S.reviews.unshift({ d: S.day, stars: 1, name: cb.client.name, t: 'Два раза чинили одно и то же. Больше ни ногой.' });
      g.note(cb.client.name + (cb.client.f ? ' после второго возврата ушла навсегда и оставила' : ' после второго возврата ушёл навсегда и оставил') + ' отзыв на одну звезду.', 'bad'); return;
    }
    const slot = g.freeSlot(['park', 'yard']); if (!slot) { cb.day = S.day + 1; return; }
    S.comebacks.splice(i, 1); car.away = false; car.keep = false;
    if (cb.why === 'quality') { const syms = D.nodeSyms[cb.node] || []; if (syms.length) C.addFault(car, cb.node, U.wpick(syms.filter(s => !D.sym[s].norun).concat(syms).slice(0, 3), s => 1), U.rf(12, 33)); }
    C.refreshFaults(car);
    const client = Object.assign({}, cb.client, { pat: 35 });
    const o = O.create(car, client, 'comeback'); o.cbN = cb.n; o.sat = 35;
    o.syms = [...new Set(car.faults.map(f => f.sym))];
    o.complaint = '«Опять то же самое! Я же платил за ремонт.» ' + o.syms.map(s => D.sym[s].n).join('; ');
    g.repAdd('q', -3); S.stats.comebacks++;
    g.send(car, slot.id);
    g.note('Возврат по гарантии: ' + client.name + ' снова здесь на ' + C.short(car) + '. Переделка за счёт мастерской.', 'bad', ['order', o.id]);
  };

  // ---------- минутная логика ----------
  O.tick = function () {
    const S = WW.S, g = G(), mi = Math.floor(S.min);
    if (mi === S.lastMin) return; S.lastMin = mi;
    while (S.arrivals.length && S.arrivals[0].day <= S.day && S.arrivals[0].min <= S.min) { const a = S.arrivals.shift(); if (S.min < 1080) O.arrive(a); }
    for (let i = S.deliveries.length - 1; i >= 0; i--) {
      const d = S.deliveries[i]; if (d.day > S.day || (d.day === S.day && d.min > S.min)) continue;
      S.deliveries.splice(i, 1); const o = S.orders[d.o]; if (!o) continue; const j = o.jobs.find(x => x.id === d.j); if (!j || j.status !== 'ordered') continue;
      j.status = 'ready'; WW.emit('sound', 'box'); O.setWorkStage(o);
    }
    for (const id in S.orders) {
      const o = S.orders[id], car = S.cars[o.car]; if (!car) { delete S.orders[id]; continue; }
      if (!o.arrived && !car.mv) {
        o.arrived = true; o.t0 = S.min; o.t0d = S.day;
        const a = D.arch[o.client.arch]; const v = g.visitor({ x: car.x + 1.4, y: car.y, order: o.id, col: a.col, f: o.client.f });
        g.vGo(v, [MAP.spots.door.slice(), [MAP.spots.client[0] + U.rf(-.5, .5), MAP.spots.client[1] + U.rf(0, .8)]]);
      }
      if (o.stage === 'intake' && o.arrived && !o.desk && (S.day > o.t0d || S.min - o.t0 > o.client.pat)) {
        g.note(o.client.name + (o.client.f ? ' не дождалась приёма и уехала.' : ' не дождался приёма и уехал.') + ' «У вас тут вообще кто-нибудь работает?»', 'bad', ['panel', 'people']); g.repAdd('s', -1.5);
        O.drop(o, true); continue;
      }
      if (o.client && o.client.waits && S.min > o.waitUntil && o.stage !== 'ready') { o.client.waits = false; o.sat -= 12; g.vLeave(o.id); g.toast(o.client.name + (o.client.f ? ' устала ждать и ушла.' : ' устал ждать и ушёл.') + ' Заберёт машину позже.', 'bad', ['order', o.id]); }
      if (o.stage === 'ready' && !o.clientHere && !o.vis && (S.day > o.pickDay || (S.day === o.pickDay && S.min >= o.pickAt)) && S.min < 1125) {
        o.vis = true; let v = g.visitorOf(o.id); const a = D.arch[o.client.arch];
        if (!v) v = g.visitor({ x: MAP.spots.gate[0] + 10, y: 26.6, order: o.id, col: a.col, f: o.client.f });
        g.vGo(v, [MAP.spots.gate.slice(), MAP.spots.door.slice(), MAP.spots.client.slice()], 'here');
      }
      for (const j of o.jobs) if (j.interv === 'wait' && S.min - j.intervAt > 45) { j.interv = 'done'; j.qb = 10; }
    }
    bays();
  };
  O.needsBay = function (o) {
    if (o.stage === 'diag') return o.tests.some(t => D.tests[t].bay);
    if (o.stage === 'work') return o.jobs.some(j => j.status === 'ready' || j.status === 'doing');
    return false;
  };
  function bays() {
    const S = WW.S, g = G();
    const need = Object.values(S.orders).filter(o => { const c = S.cars[o.car]; return c && !c.mv && !c.away && o.arrived && O.needsBay(o) && g.kindOf(c) !== 'bay'; });
    const pr = o => (o.urgent ? 0 : 1) * 1e6 + (o.type === 'comeback' ? 0 : o.type === 'own' ? 5e5 : 1e5) + o.t0d * 1440 + o.t0;
    need.sort((a, b) => pr(a) - pr(b));
    for (const s of g.slotList()) {
      if (s.kind !== 'bay') continue;
      const cid = S.slotCar[s.id];
      if (cid) {
        const car = S.cars[cid]; if (!car || car.mv) continue;
        const o = car.order && S.orders[car.order];
        const ownIdle = o && o.type === 'own' && !o.busy && !o.urgent && need.length && need[0].type !== 'own';
        if (o && (O.needsBay(o) || o.busy) && !ownIdle) continue;
        if (o && !need.length && o.stage !== 'ready' && o.stage !== 'qc') continue;
        const to = g.freeSlot(car.owner === 'player' ? ['proj', 'yard'] : ['yard', 'park']);
        if (to) g.send(car, to.id);
      } else if (need.length) { const o = need.shift(); g.send(S.cars[o.car], s.id); }
    }
  }
  O.endDay = function () {
    const S = WW.S, g = G();
    for (const id in S.orders) {
      const o = S.orders[id];
      if (o.stage === 'intake') { if (o.arrived) { g.log(o.client.name + (o.client.f ? ' так и не дождалась' : ' так и не дождался') + ' приёма до закрытия.', 'bad'); g.repAdd('s', -1.5); } O.drop(o, true); continue; }
      if (o.client) o.client.waits = false;
      o.vis = false;
      if (o.stage === 'ready') { o.clientHere = false; o.pickDay = S.day + 1; o.pickAt = U.rf(470, 570); }
    }
    S.visitors = [];
  };
  // клиент уезжает без работы
  O.drop = function (o, leave) {
    const S = WW.S, car = S.cars[o.car];
    for (const p of S.pawns) if (p.task && p.task.o === o.id) P().drop(p);
    S.deliveries = S.deliveries.filter(d => d.o !== o.id);
    if (car) { car.order = null; car.work = 0; car.hood = 0; if (leave) { if (car.mv && !car.slot && car.dest && car.dest !== 'exit') delete S.slotCar[car.dest]; G().send(car, 'exit'); } }
    G().vLeave(o.id);
    delete S.orders[o.id];
  };

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
    o.done.push(t); o.diagMin += d.min;
    C.reveal(car, d, p.skills.diag + (p.insight === S.day ? 20 : 0));
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
  O.mkJob = function (o, sp) {
    const S = WW.S, car = S.cars[o.car], m = C.model(car), px = G().px(), pk = G().mod('parts');
    const j = { id: S.nextId++, kind: sp.kind, node: sp.node || null, zone: sp.zone || null, key: sp.key || null, grade: sp.grade || null, status: 'prop', left: null, q: null, free: o.type === 'comeback', oem: 0 };
    if (sp.kind === 'replace') { const nd = D.nodes[sp.node], gr = D.grades[sp.grade]; j.name = 'Замена: ' + nd.n + ' (' + gr.short + ')'; j.h = nd.repl; j.oem = nd.part * m.pm * px; j.cost = j.oem * gr.price * pk * ((!o.fast && sp.grade !== 'used') ? .8 : 1); j.sk = nd.sk; }
    else if (sp.kind === 'repair') { const nd = D.nodes[sp.node]; j.name = (sp.node === 'frame' ? 'Сварка: ' : 'Ремонт: ') + nd.n; j.h = nd.rep; j.oem = nd.part * m.pm * px * .12; j.cost = j.oem * pk; j.sk = nd.sk; }
    else if (sp.kind === 'svc') { const d = D.svc[sp.key]; j.name = d.n; j.h = d.h; j.oem = d.part * px; j.cost = j.oem * (S.upg.shelf ? .9 : 1); j.sk = d.sk; j.cons = 1; }
    else if (sp.kind === 'own') { const d = D.own[sp.key]; j.name = d.n; j.h = d.h; j.oem = d.part * px; j.cost = j.oem; j.sk = d.sk; j.cons = 1; }
    else if (sp.kind === 'rust') { const d = D.own.rust; j.name = d.n + ': ' + D.rust[sp.zone].n.toLowerCase(); j.h = d.h * (D.rust[sp.zone].struct ? 1.5 : 1); j.oem = d.part * px; j.cost = j.oem; j.sk = 'body'; j.cons = 1; }
    else if (sp.kind === 'tune') { const d = D.tune[sp.key]; j.name = 'Тюнинг: ' + d.n; j.h = d.h; j.oem = d.part * px * (m.pm > 1.2 ? 1.3 : 1); j.cost = j.oem; j.sk = d.sk; }
    j.cost = Math.round(j.cost); O.price(o, j);
    return j;
  };
  O.price = function (o, j) {
    const S = WW.S;
    j.labor = Math.round(j.h * o.rate); j.pp = Math.round(j.cost * (1 + S.set.markup)); j.sup = Math.round(j.labor * .05);
    j.total = j.free ? 0 : j.labor + j.pp + j.sup;
    j.fair = Math.round((j.h * D.marketRate(S.year) + j.oem * 1.4) * 1.05);
  };
  O.hasJob = (o, sp) => o.jobs.some(j => j.status !== 'declined' && j.kind === sp.kind && j.node == (sp.node || null) && j.zone == (sp.zone || null) && j.key == (sp.key || null)) ||
    (sp.node && o.jobs.some(j => j.node === sp.node && j.status !== 'declined' && j.status !== 'done'));
  O.addJob = function (o, sp) {
    const S = WW.S, car = S.cars[o.car];
    if (o.stage !== 'diag' && !(o.type === 'own')) { if (!(o.stage === 'work' || o.stage === 'parts')) return null; }
    if (O.hasJob(o, sp)) return null;
    if (sp.kind === 'repair' && (!D.nodes[sp.node].rep || car.nodes[sp.node].reps <= 0)) return null;
    if (sp.kind === 'replace' && !D.nodes[sp.node].repl) return null;
    if (sp.kind === 'tune' && car.mods.includes(sp.key)) return null;
    const j = O.mkJob(o, sp); o.jobs.push(j);
    if (sp.finding) { j.finding = 1; o.findings = o.findings.filter(n => n !== sp.node); }
    return j;
  };
  O.delJob = function (o, jid) { const j = o.jobs.find(x => x.id === jid); if (j && (j.status === 'prop' || j.status === 'declined')) o.jobs = o.jobs.filter(x => x !== j); };
  O.setGrade = function (o, jid, grade) { const i = o.jobs.findIndex(x => x.id === jid), j = o.jobs[i]; if (!j || j.status !== 'prop' || j.kind !== 'replace') return; const n = O.mkJob(o, { kind: 'replace', node: j.node, grade }); n.finding = j.finding; n.free = j.free; O.price(o, n); o.jobs[i] = n; };
  O.setFast = function (o, fast) { o.fast = fast; o.jobs = o.jobs.map(j => { if (j.status !== 'prop' || j.kind !== 'replace') return j; const n = O.mkJob(o, { kind: 'replace', node: j.node, grade: j.grade }); n.finding = j.finding; n.free = j.free; O.price(o, n); return n; }); };
  O.toggleFree = function (o, jid) { const j = o.jobs.find(x => x.id === jid); if (!j || o.type === 'own') return; j.free = !j.free; O.price(o, j); };
  O.suggest = function (o) {
    const S = WW.S, car = S.cars[o.car]; let n = 0;
    for (const h of O.hyp(o)) {
      const top = h.list[0]; if (!top) continue;
      if (car.nodes[top.node].lo >= D.FAULT) continue;
      const sp = { kind: D.nodes[top.node].repl ? 'replace' : 'repair', node: top.node, grade: 'oem' };
      if (O.addJob(o, sp)) n++;
    }
    return n;
  };
  O.autoEstimate = function (o) { O.suggest(o); if (o.jobs.some(j => j.status === 'prop')) O.send(o); else if (o.type !== 'own' && !o.jobs.some(j => j.status !== 'declined')) O.giveUp(o); };
  O.send = function (o) {
    const S = WW.S; if (!o.jobs.some(j => j.status === 'prop')) return false;
    o.decide = false;
    if (o.type === 'own') { for (const j of o.jobs) if (j.status === 'prop') O.orderPart(o, j); O.setWorkStage(o); return true; }
    for (const j of o.jobs) if (j.status === 'prop') O.price(o, j);
    o.stage = 'approval'; return true;
  };
  // «не нашли / не берёмся»: клиент платит только диагностику
  O.giveUp = function (o) { if (o.type === 'own') return O.closeOwn(o); o.jobs = o.jobs.filter(j => j.status !== 'prop'); if (o.jobs.some(j => j.status === 'done')) { o.stage = 'qc'; return; } o.declined = true; o.sat -= 10; O.toReady(o); };

  function approve(o, p) {
    const S = WW.S, car = S.cars[o.car], arch = D.arch[o.client.arch], g = G();
    const trust = (S.rep.h - 50) / 50 + p.skills.talk / 40 + (P().has(p, 'pusher') ? .5 : 0) + (S.upg.waiting ? .1 : 0);
    const props = o.jobs.filter(j => j.status === 'prop');
    const sum = o.jobs.filter(j => j.status !== 'declined').reduce((s, j) => s + j.total, 0);
    const stress = sum / (arch.budget * (C.value(car, 't') * .5 + 260 * g.px()));
    let yes = 0, no = 0;
    for (const j of props) {
      let ok = j.free;
      if (!ok) {
        const f = j.node && car.faults.find(x => x.node === j.node);
        const urg = f ? (D.sym[f.sym].norun ? 1.3 : /brakes|steer/.test(j.node) ? .9 : .5) : -.4;
        const ev = j.node && car.nodes[j.node].hi < D.FAULT ? .5 : (j.node && car.nodes[j.node].lo >= 60 ? -.8 : 0);
        const x = 1.1 + 3 * (j.fair - j.total) / Math.max(1, j.total) + trust + .8 * urg + ev - 1.2 * stress;
        j.pA = U.sig(x); ok = U.chance(j.pA);
      }
      if (ok) { yes++; O.orderPart(o, j); if (!j.free && j.node && car.nodes[j.node].t >= 60 && P().has(p, 'pusher')) g.repAdd('h', -.4); }
      else { j.status = 'declined'; no++; }
    }
    P().xp(p, 'talk', .3);
    if (yes) g.toast('№' + o.id + ': ' + o.client.name + (o.client.f ? ' согласовала ' : ' согласовал ') + yes + ' из ' + (yes + no) + ' ' + U.plural(yes + no, 'позиции', 'позиций', 'позиций') + '.', no ? 'info' : 'good', ['order', o.id]);
    else g.toast('№' + o.id + ': ' + o.client.name + (o.client.f ? ' отказалась' : ' отказался') + ' от работ. Отказ записан.', 'bad', ['order', o.id]);
    O.setWorkStage(o);
  }
  O.orderPart = function (o, j) {
    const S = WW.S, car = S.cars[o.car], g = G(), m = C.model(car);
    if (j.cost > 0) { g.money(-j.cost, o.type === 'own' ? 'ownParts' : 'partsCost'); if (o.type === 'own') car.cost += j.cost; }
    if (j.cost <= 0 || j.cons) { j.status = 'ready'; return; }
    let day = S.day, min;
    if (j.grade === 'used' || !o.fast || m.rare || S.phase !== 'day') { day = S.day + 1 + (m.rare && j.kind !== 'tune' ? 1 : 0); min = U.rf(455, 500); if (S.phase !== 'day' && !m.rare && o.fast && j.grade !== 'used') day = S.day + 1; }
    else { min = S.min + U.rf(60, 180) * (S.upg.shelf ? .5 : 1) * g.mod('delivery'); if (min > 1060) { day++; min = U.rf(490, 540); } }
    if (U.chance(.04)) { day++; o.notes.push('Поставщик прислал не ту деталь — «модель до мая и после разные». Ждём ещё день.'); g.toast('№' + o.id + ': пришла не та деталь, пересылают. +1 день.', 'bad', ['order', o.id]); }
    j.status = 'ordered'; j.eta = { day, min };
    S.deliveries.push({ o: o.id, j: j.id, day, min });
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

  // ---------- работа ----------
  O.onJobStart = function (o, j, p) {
    const S = WW.S, car = S.cars[o.car], g = G(), nd = j.node && D.nodes[j.node];
    if ((nd && nd.rusty) || j.kind === 'rust') {
      const ar = (car.rust.sills.r + car.rust.floor.r + car.rust.frame.r) / 3;
      if (ar > 30 && U.chance(.14 * (P().has(p, 'brute') ? 2 : 1))) { const ex = U.rf(40, 140); j.left += ex; j.tot += ex; o.notes.push(p.name + ' сорвал прикипевший болт — плюс ' + U.dur(ex) + ' на извлечение.'); g.toast('№' + o.id + ': прикипевший болт сорван. +' + U.dur(ex), 'bad', ['order', o.id]); }
    }
    const crit = (nd && nd.crit) || j.kind === 'own' && j.key === 'paint' || (j.kind === 'tune' && j.key === 'carb') || j.node === 'frame';
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
    const hours = (j.tot || 60) / 60;
    Pm.xp(p, j.sk, hours); p.fam[car.model] = (p.fam[car.model] || 0) + 1;
    if (o.type === 'own') car.cost += hours * (p.wage || 0);
    const n = j.node && car.nodes[j.node];
    if (j.kind === 'replace') { const gr = D.grades[j.grade]; j.pre = n.t; n.t = U.rf(gr.st[0], gr.st[1]) * (.85 + .15 * Q / 100); n.grade = j.grade; n.reps = gr.reps; n.orig = false; C.exact(car, j.node); }
    else if (j.kind === 'repair') {
      const gr = D.grades[n.grade] || D.grades.oem; j.pre = n.t; n.t = Math.min(96, n.t + U.lerp(gr.gain[0], gr.gain[1], Math.pow(Q / 100, .8))); n.reps--;
      if (j.node === 'frame') { for (const z of ['sills', 'floor', 'frame']) { car.rust[z].r *= .3; car.rust[z].lo = 0; car.rust[z].hi = Math.ceil(car.rust[z].r) + 2; } n.t = Math.max(n.t, 97 - Math.max(car.rust.sills.r, car.rust.floor.r, car.rust.frame.r)); }
      C.exact(car, j.node);
    } else if (j.kind === 'svc') {
      const d = D.svc[j.key];
      for (const id in d.fx) if (car.nodes[id]) { const nn = car.nodes[id]; if (nn.t < d.fx[id][1]) nn.t = Math.min(d.fx[id][1], nn.t + d.fx[id][0] * (.7 + .3 * Q / 100)); C.exact(car, id); }
      if (d.inspect) { const spec = { nodes: {}, rust: {} }; for (const id in car.nodes) spec.nodes[id] = 14; for (const z of D.rustIds) spec.rust[z] = 14; C.reveal(car, spec, p.skills.diag); }
    } else if (j.kind === 'own' && j.key === 'detail') {
      car.detail = Math.min(1, .55 + .45 * Q / 100); if (car.nodes.interior.t < 90) car.nodes.interior.t += 3;
      for (const f of car.finds) { if (f.v) { g.money(f.v, 'misc'); g.note('При уборке ' + C.short(car) + ' нашли ' + f.n + ': ' + U.money(f.v) + '.', 'good'); } else if (f.t === 'receipts') { car.docs.receipts = true; g.note('В бардачке ' + C.short(car) + ' — ' + f.n + '. Документы +, цена +3%.', 'good'); } else g.note('Под сиденьем ' + C.short(car) + ' нашли ' + f.n + '.', 'info'); }
      car.finds = [];
    } else if (j.kind === 'own' && j.key === 'paint') {
      const cos = (car.rust.farch.r + car.rust.rarch.r + car.rust.doors.r) / 3; const pn = car.nodes.panels;
      pn.t = Math.min(cos > 30 ? 76 : 98, 68 + Q * .3); C.exact(car, 'panels'); car.detail = Math.max(car.detail, .85); if (j.color) { car.color = j.color[1]; car.colorName = j.color[0]; car.color2 = null; }
      if (cos > 30) g.toast('Покрасили поверх ржавчины: через сезон пузыри вылезут снова.', 'bad', ['car', car.id]);
    } else if (j.kind === 'rust') {
      const R = car.rust[j.zone]; R.r = U.rf(2, 8) + (100 - Q) * .1; R.lo = Math.floor(R.r); R.hi = Math.ceil(R.r) + 1;
      const fr = car.nodes.frame; fr.t = Math.max(fr.t, 97 - Math.max(car.rust.sills.r, car.rust.floor.r, car.rust.frame.r) * .92); if (D.rust[j.zone].struct) C.exact(car, 'frame'); else car.nodes.panels.t = Math.min(96, car.nodes.panels.t + 4);
    } else if (j.kind === 'tune') { car.mods.push(j.key); }
    car.hist.push({ d: S.day, y: S.year, t: j.name, by: p.name, q: j.q });
    C.refreshFaults(car);
    // мысли
    if (j.h >= 5 && Q > 68 && /eng|trans/.test(j.sk)) Pm.think(p, 'big', 'Перебрал агрегат — работает как часы', 8, 3);
    if (Pm.has(p, 'petrol')) { if (o.type === 'own' || j.kind === 'tune') Pm.think(p, 'pet', 'Возился с проектной машиной', 5, 2); else if (j.kind === 'svc') Pm.think(p, 'bore', 'Скучная рутина', -3, 1); }
    // инциденты
    if (o.type !== 'own') {
      if (U.chance(.022 * (Pm.has(p, 'clumsy') ? 2.2 : 1) * (Pm.has(p, 'sloppy') ? 1.5 : 1))) { const c = Math.round(U.rf(40, 120) * g.px()); g.money(-c, 'fine'); o.sat -= 15; o.notes.push(p.name + ' поцарапал крыло. Компенсация ' + U.money(c) + '.'); g.note('№' + o.id + ': ' + p.name + ' поцарапал кузов клиента. Компенсация ' + U.money(c) + '.', 'bad', ['order', o.id]); }
      if (j.kind === 'svc' && j.key === 'oil' && U.chance(.006 * (Pm.has(p, 'sloppy') ? 2.5 : 1) * (Q < 45 ? 2 : 1))) { const c = Math.round(U.rf(700, 1800) * g.px()); g.money(-c, 'fine'); g.repAdd('q', -6); g.note(p.name + ' не затянул сливную пробку. Мотор клиента заклинило через квартал. Иск: ' + U.money(c) + '.', 'bad'); Pm.think(p, 'guilt', 'Запорол чужой мотор', -8, 4); }
      if (o.type === 'fault' && U.chance(.28)) { const cand = C.nodeIds(car).filter(id => car.nodes[id].t < 44 && id !== 'frame' && !o.jobs.some(x => x.node === id) && !o.findings.includes(id)); if (cand.length) { const id = U.pick(cand); C.reveal(car, { nodes: { [id]: 9 } }, p.skills.diag); o.findings.push(id); g.toast('№' + o.id + ': попутно заметили — ' + D.nodes[id].n.toLowerCase() + ' в плохом состоянии.', 'info', ['order', o.id]); } }
    }
    WW.emit('sound', 'done');
    O.setWorkStage(o);
  };
  O.qcDone = function (o, p) {
    const S = WW.S, car = S.cars[o.car], g = G();
    const left = car.faults.filter(f => o.syms.includes(f.sym));
    if (left.length && U.chance(.45 + p.skills.diag * .03)) {
      o.qcFail++; o.stage = 'diag'; o.decide = true;
      o.notes.push('ОТК (' + p.name + '): симптом «' + D.sym[left[0].sym].n + '» остался. Диагноз был неверным.');
      g.note('№' + o.id + ': ОТК не пройден — ' + D.sym[left[0].sym].n.toLowerCase() + ' никуда не делся. Наряд вернулся на диагностику.', 'bad', ['order', o.id]);
      if (S.set.autoDiag) { if (!nextStd(o) && S.set.autoEst) O.autoEstimate(o); }
      return;
    }
    if (left.length) o.cb = { why: 'unfixed', node: left[0].node };
    O.toReady(o);
  };
  O.toReady = function (o) {
    const S = WW.S, g = G();
    o.stage = 'ready'; o.decide = false; o.readyAt = S.min; o.readyDay = S.day; o.tests = [];
    const v = g.visitorOf(o.id);
    if (o.client.waits && v) { g.vGo(v, [MAP.spots.client.slice()], 'here'); o.vis = true; }
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
    const late = o.due && (S.day > o.due.day || (S.day === o.due.day && o.readyAt > o.due.min + 20) || (o.readyDay > o.due.day));
    let sat = o.sat + p.skills.talk * .5 - (Pm.has(p, 'grump') ? 6 : 0);
    if (inv.n) sat += 10; if (late) sat -= 22; else sat += 6;
    if (inv.fair > 0 && inv.total > 0) sat += U.clamp((inv.fair - (inv.total - inv.tax)) / inv.fair * 45, -25, 15);
    if (o.declined) sat = Math.min(sat, 55);
    if (o.type === 'comeback') sat = Math.min(sat, 62);
    sat = U.clamp(sat, 5, 100); const stars = U.clamp(Math.round(sat / 20), 1, 5);
    let tip = 0; if (sat > 82 && arch.tipk && U.chance(.6)) { tip = Math.round(U.rf(3, 14) * arch.tipk * g.px()); g.money(tip, 'tips'); }
    if (inv.n) g.repTo('q', 38 + inv.q * .62, .05);
    g.repTo('s', late ? 18 : 88, .045);
    if (inv.fair > 0) g.repTo('p', U.clamp(55 + (inv.fair - (inv.total - inv.tax)) / inv.fair * 150, 5, 95), .045);
    g.repTo('h', 62, .02); if (Pm.has(p, 'honest')) g.repAdd('h', .5);
    for (const j of o.jobs) if (j.status === 'done' && !j.free && j.pre != null && j.pre >= 58) { if (U.chance(.4)) { g.repAdd('h', -5); S.reviews.unshift({ d: S.day, stars: 2, name: o.client.name, t: 'Знакомый механик посмотрел старую деталь — она была живая. Развели на «' + j.name + '».' }); g.note('Слух пошёл: ' + o.client.name + ' рассказывает, что ему впарили лишнюю работу («' + j.name + '»).', 'bad'); } }
    for (const j of o.jobs) if (j.status === 'done' && j.free && o.type !== 'comeback') g.repAdd('h', 1.5);
    const txt = stars >= 5 ? U.pick(['Починили быстро и честно. Буду советовать всем на заводе.', 'Наконец-то сервис, где объясняют по-человечески.', 'Показали старую деталь в коробке. Уважаю.']) : stars === 4 ? U.pick(['Нормально сделали, цена по делу.', 'Всё работает. Кофе бы ещё получше.']) : stars === 3 ? U.pick(['Сделали, но ждал дольше обещанного.', 'Терпимо. Дороговато.']) : U.pick(['Долго, дорого и нахамили.', 'Больше не приеду.', 'Обещали к вечеру — отдали через два дня.']);
    S.reviews.unshift({ d: S.day, stars, name: o.client.name, t: txt }); if (S.reviews.length > 40) S.reviews.length = 40;
    S.stats.orders++; S.stats.stars.push(stars); if (S.stats.stars.length > 200) S.stats.stars.shift();
    S.dayClosed = (S.dayClosed || 0) + 1; (S.dayStars = S.dayStars || []).push(stars);
    S.enc[car.model] = (S.enc[car.model] || 0) + 1;
    // гарантия
    let cb = o.cb;
    if (!cb) for (const j of o.jobs) if (j.status === 'done' && j.node && (j.kind === 'replace' || j.kind === 'repair') && U.chance(.3 * Math.pow(1 - j.q / 100, 2))) { cb = { why: 'quality', node: j.node }; break; }
    if (cb && (cb.why === 'quality' || U.chance(.85))) { S.comebacks.push({ day: S.day + U.ri(1, 3), car: car.id, client: o.client, why: cb.why, node: cb.node, n: (o.cbN || 0) + 1 }); car.keep = true; }
    car.hist.push({ d: S.day, y: S.year, t: 'Обслужена в мастерской, чек ' + U.money(inv.total), by: p.name });
    g.log('№' + o.id + ' ' + C.name(car) + ' — ' + o.client.name + ': ' + U.money(inv.total) + ', ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + (tip ? ', чаевые ' + U.money(tip) : '') + '. «' + txt + '»', stars >= 4 ? 'good' : stars <= 2 ? 'bad' : 'info');
    WW.emit('paid', { o: o.id, total: inv.total, stars, x: car.x, y: car.y, tip }); WW.emit('sound', 'cash');
    car.order = null; g.send(car, 'exit'); g.vLeave(o.id); delete S.orders[o.id];
  }
  O.deskDone = function (o, sub, p) {
    const S = WW.S, g = G(), car = S.cars[o.car];
    if (sub === 'call') return approve(o, p);
    if (sub === 'payout') return payout(o, p);
    // приём
    const w = S.min - o.t0; if (w > o.client.pat * .6) o.sat -= 8; if (S.upg.waiting) o.sat += 4;
    P().xp(p, 'talk', .25);
    if (o.type === 'service') {
      const j = O.mkJob(o, { kind: 'svc', key: o.svc }); o.jobs.push(j); O.orderPart(o, j); o.stage = 'work';
      o.due = S.min < 840 ? { day: S.day, min: 1110 } : { day: S.day + 1, min: 780 };
      o.client.waits = D.svc[o.svc].h <= 1.25 && S.min < 900 && U.chance(.6); o.waitUntil = S.min + 150 * (S.upg.waiting ? 1.5 : 1);
    } else {
      o.stage = 'diag'; const nr = !C.runs(car);
      o.due = { day: S.day + (nr ? 2 : 1) + (o.type === 'comeback' ? 0 : 0), min: 1080 };
      if (S.set.autoDiag) { if (!O.autoTests(o)) O.afterDiag(o); } else o.decide = false;
    }
    const v = g.visitorOf(o.id);
    if (v) { if (o.client.waits) { const ch = MAP.spots.chairs[o.id % 3]; g.vGo(v, [ch.slice()]); } else g.vLeave(o.id); }
  };

  // ---------- свои машины ----------
  O.newOwn = function (car) { if (car.order || car.sale) return null; const o = O.create(car, null, 'own'); return o; };
  O.closeOwn = function (o) {
    const S = WW.S, car = S.cars[o.car];
    if (o.jobs.some(j => j.status === 'doing')) return false;
    for (const j of o.jobs) if (j.status === 'ordered' || (j.status === 'ready' && !j.fetched && !j.cons)) { G().money(j.cost, 'ownParts'); if (car) car.cost -= j.cost; }
    const done = o.jobs.filter(j => j.status === 'done').length;
    if (done) G().note('Работы по ' + C.name(car) + ' завершены (' + done + '). Проверь карточку — можно выставлять.', 'good', ['car', car.id]);
    O.drop(o, false); return true;
  };
  // скупка у клиента: смета дороже машины → предложи купить «как есть»
  O.buyout = function (o, price) {
    const S = WW.S, car = S.cars[o.car], g = G(), arch = D.arch[o.client.arch];
    if (o.type === 'own' || !car || o.stage === 'ready') return false;
    const slot = g.freeSlot(['proj']); if (!slot) { g.toast('Нет свободного места под проект.', 'bad'); return false; }
    if (S.money < price) { g.toast('Не хватает денег.', 'bad'); return false; }
    if (o.buyTried) { g.toast('Второй раз предлагать бестактно.', 'bad'); return false; }
    o.buyTried = true;
    const V = C.value(car, 't'), est = o.jobs.filter(j => j.status !== 'declined' && j.status !== 'done').reduce((s, j) => s + j.total, 0);
    const p = U.sig(5 * (price / V - .62) + (arch.sells ? .8 : 0) + Math.min(1.2, est / V));
    if (!U.chance(p)) { o.sat -= 6; g.toast(o.client.name + ': «За такие деньги? Нет уж, чините».', 'bad', ['order', o.id]); return false; }
    if (price < V * .4) g.repAdd('h', -2);
    g.money(-price, 'carBuy'); car.owner = 'player'; car.cost = price; car.days = 0; S.stats.bought++;
    for (const j of o.jobs) if (j.status === 'ordered' || j.status === 'ready') g.money(j.cost * .9, 'partsCost');
    g.note(o.client.name + (o.client.f ? ' продала тебе ' : ' продал тебе ') + C.name(car) + ' за ' + U.money(price) + ' «как есть». Ты знаешь о ней всё — лучший источник машин.', 'good', ['car', car.id]);
    O.drop(o, false); g.send(car, slot.id);
    return true;
  };
})(globalThis.WW);
