// WRENCHWORLD — люди: навыки, черты, настроение, специализации, выбор работы.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, N = WW.N, MAP = D.MAP, P = WW.P = {};
  const G = () => WW.G;

  P.resetPaths = () => N.dirty();
  P.path = (ax, ay, bx, by) => N.path(ax, ay, bx, by);
  P.goto = function (p, x, y) { p.path = N.path(p.x, p.y, x, y); p.pi = 0; };
  P.byId = id => WW.S.pawns.find(p => p.id === id);
  P.has = (p, t) => p.traits.indexOf(t) >= 0;
  P.staff = () => WW.S.pawns.filter(p => !p.owner);
  P.setSpec = function (p, spec) { if (!D.specs[spec]) return; p.spec = spec; p.pri = Object.assign({}, D.specs[spec].pri); };
  P.col = p => (D.specs[p.spec] || D.specs.general).col;

  // ---------- кандидаты и найм ----------
  P.mk = function (role, legend) {
    const S = WW.S, R = D.roles[role], sk = {}, fn = U.pick(D.first), px = WW.G ? WW.G.px() : D.infl(S.year);
    let tot = 0, mx = 0;
    for (const s of D.skillIds) { const a = R.sk[s]; sk[s] = U.ri(a[0], a[1]); if (legend && a[1] > 9) sk[s] = U.ri(15, 19); tot += (sk[s] - a[0]); mx += (a[1] - a[0]); }
    const pool = D.traitIds.slice(), traits = [], conf = [['perf', 'sloppy'], ['lark', 'owl'], ['lazy', 'workah'], ['fast', 'lazy'], ['honest', 'pusher'], ['soul', 'grump']];
    const n = U.ri(2, 3);
    while (traits.length < n) { const t = U.pick(pool); if (traits.includes(t)) continue; if (conf.some(c => c.includes(t) && c.some(x => x !== t && traits.includes(x)))) continue; traits.push(t); }
    if (legend && !traits.includes('drunk')) traits[0] = 'drunk';
    if (traits.includes('drunk')) for (const s of ['eng', 'trans', 'chassis', 'body']) if (R.sk[s][1] > 9) sk[s] = Math.min(20, sk[s] + U.ri(2, 4));
    const pas = {}; const main = D.skillIds.filter(s => R.sk[s][1] > 7); for (let i = 0; i < U.ri(1, 2); i++) pas[U.pick(role === 'appr' ? D.skillIds : main)] = U.ri(1, 2);
    const q = legend ? 1.3 : tot / Math.max(1, mx);
    // специализация подсказывается лучшим навыком
    let spec = D.roleSpec[role];
    if (role === 'mech') { const b = ['eng', 'chassis', 'elec'].sort((a, c) => sk[c] - sk[a]); if (sk[b[0]] - sk[b[1]] >= 3) spec = { eng: 'engine', chassis: 'chassis', elec: 'elec' }[b[0]]; if (legend) spec = 'engine'; }
    return { id: S.nextId++, name: fn + ' ' + U.pick(D.last), role, spec, skills: sk, xp: {}, pas, traits, known: 1, wage: Math.round(U.lerp(R.wage[0], R.wage[1], q) * px * 4) / 4, owed: 0, mood: 55, thoughts: [],
      x: 34, y: 26, path: null, task: null, pri: Object.assign({}, D.specs[spec].pri), hours: 0, state: 'work', fam: {}, hired: S.day, look: { skin: U.ri(0, 7), hat: U.ri(0, 5), hair: U.ri(0, 9), f: !!D.female[fn] }, lunch: -1, low: 0 };
  };
  P.refreshCands = function (force) {
    const S = WW.S; if (!force && S.day % 3 !== 0) return;
    S.cands = S.cands.filter(c => (c.legend || c.poached) && S.day - c.hired < 3);
    const roles = ['mech', 'mech', 'appr', 'appr', 'recep', 'body', 'mech'];
    const n = 3 + (WW.G && WW.G.rep() > 50 ? 1 : 0);
    for (let i = 0; i < n; i++) S.cands.push(P.mk(U.pick(roles)));
    if (!S.cands.some(c => c.role === 'mech')) S.cands.push(P.mk('mech'));
  };
  P.hire = function (id) {
    const S = WW.S, i = S.cands.findIndex(c => c.id === id); if (i < 0) return;
    if (P.staff().length >= 6) { G().toast('В v1 в мастерской помещается хозяин и до 6 сотрудников.', 'bad'); return; }
    if (S.money < 0) { G().toast('С пустой кассой людей не нанимают.', 'bad'); return; }
    const p = S.cands.splice(i, 1)[0]; p.hired = S.day; p.x = MAP.spots.gate[0]; p.y = MAP.spots.gate[1]; p.arriveAt = S.min + 20; p.state = 'work';
    S.pawns.push(p); S.stats.hired++;
    G().note('Принят на работу: ' + p.name + ', ' + D.specs[p.spec].n.toLowerCase() + ', ' + U.money(p.wage) + '/ч. Видимая черта: ' + D.traits[p.traits[0]].n + '.', 'good');
    P.think(p, 'new', 'Новая работа', 6, 4);
  };
  P.fire = function (id) {
    const S = WW.S, p = P.byId(id); if (!p || p.owner) return;
    P.drop(p); if (p.owed > 0) { G().money(-Math.round(p.owed), 'wages'); }
    S.pawns = S.pawns.filter(x => x !== p);
    for (const o of P.staff()) P.think(o, 'fired', 'Уволили ' + p.name.split(' ')[0], -4, 3);
    G().note(p.name + ' уволен. Ящик с инструментом забрал с собой.', 'info');
  };

  // ---------- настроение ----------
  P.think = function (p, k, text, v, days) {
    if (p.owner) return; const S = WW.S;
    p.thoughts = p.thoughts.filter(t => t.k !== k); p.thoughts.push({ k, t: text, v, until: S.day + days - 1 }); P.moodCalc(p);
  };
  P.moodParts = function (p) {
    const S = WW.S, a = [['База', 52]];
    for (const t of p.thoughts) if (t.until >= S.day) a.push([t.t, t.v]);
    if (S.upg.rest) a.push(['Уголок отдыха', 5]);
    if (N.anyRoom('rest')) a.push(['Комната отдыха по всем правилам', 3]);
    if (N.has('vending')) a.push(['Автомат с газировкой', 2]);
    const bt = Math.round(N.beauty() / 4); if (bt) a.push([bt > 0 ? 'Приятная мастерская' : 'Свалка вместо мастерской', bt]);
    const dt = N.dirtTotal(); if (dt > 8) a.push(['Грязь и масло повсюду', -Math.min(6, Math.round(dt / 4))]);
    let soc = 0; for (const o of S.pawns) if (o !== p && o.state === 'work') { if (P.has(o, 'soul')) soc += 3; if (P.has(o, 'grump')) soc -= 3; }
    if (soc) a.push(['Коллеги рядом', U.clamp(soc, -6, 6)]);
    if (S.weather === 'heat') a.push(['Жара в боксе', -5]);
    if (S.weather === 'snow' || S.weather === 'blizzard') a.push(['Холодно в боксе', -4]);
    if (p.hang === S.day) a.push(['Похмелье', -8]);
    if (S.money < 0) a.push(['Слухи, что зарплаты не будет', -8]);
    const junior = S.pawns.find(o => !o.owner && o !== p && o.hired > p.hired && o.role === p.role && o.wage > p.wage + .2);
    if (junior) a.push(['Новичок получает больше меня', -10]);
    if (P.has(p, 'vet')) a.push(['Ветеран: видал и хуже', 4]);
    return a;
  };
  P.moodCalc = function (p) { if (p.owner) { p.mood = 62; return 62; } p.mood = U.clamp(P.moodParts(p).reduce((s, x) => s + x[1], 0), 0, 100); return p.mood; };

  P.xp = function (p, sk, hours) {
    let g = hours * 9 * [1, 1.5, 2][p.pas[sk] || 0]; if (P.has(p, 'selft')) g *= 2;
    if (p.role === 'appr' && WW.S.pawns.some(o => o !== p && P.has(o, 'mentor'))) g *= 1.5;
    p.xp[sk] = (p.xp[sk] || 0) + g;
    const need = 60 + p.skills[sk] * 25;
    if (p.xp[sk] >= need && p.skills[sk] < 20) { p.xp[sk] -= need; p.skills[sk]++; if (p.skills[sk] % 5 === 0 || p.owner) G().toast(p.name + ': навык «' + D.skills[sk] + '» вырос до ' + p.skills[sk], 'good'); if (p.skills[sk] === 20) G().log(p.name + ' достиг вершины мастерства: «' + D.skills[sk] + '» 20.', 'story'); }
  };

  // ---------- T_fact и Q (GDD раздел 6) ----------
  function common(p, sk, f) {
    const S = WW.S, s = p.skills[sk] || 0;
    const fs = s <= 10 ? 2.2 - 1.2 * s / 10 : 1 - .45 * (s - 10) / 10; f.push(['Навык «' + D.skills[sk] + '» ' + s, fs]);
    const ft = (S.upg.air ? 1.0 : 1.3) * G().mod('tools'); f.push([S.upg.air ? 'Пневмоинструмент' : 'Ручной инструмент', ft]);
    const fm = U.interp([[0, 1.25], [50, 1], [100, .9]], p.mood); if (!p.owner) f.push(['Настроение ' + Math.round(p.mood), fm]);
    if (p.hours > 9 && !P.has(p, 'workah')) f.push(['Усталость после 9 часов', 1 + Math.min(.25, (p.hours - 9) * .1)]);
    if (P.has(p, 'perf')) f.push(['Перфекционист', 1.15]); if (P.has(p, 'sloppy')) f.push(['Халтурщик', .85]); if (P.has(p, 'fast')) f.push(['Быстрые руки', .9]); if (P.has(p, 'lazy')) f.push(['Лентяй', 1.15]);
    if (P.has(p, 'lark')) f.push(['Жаворонок', S.min < 720 ? .9 : S.min > 900 ? 1.08 : 1]); if (P.has(p, 'owl')) f.push(['Сова', S.min < 720 ? 1.08 : S.min > 900 ? .9 : 1]);
    if (p.hang === S.day) f.push(['Похмелье', 1.2]);
  }
  P.tfact = function (p, o, job) {
    const S = WW.S, car = S.cars[o.car], f = [];
    common(p, job.sk, f);
    const slot = car.slot && N.slot(car.slot);
    if (slot && !slot.indoor && /rain|snow|blizzard|heat/.test(S.weather)) f.push(['Пост под открытым небом, ' + D.weather[S.weather].n, 1.15]);
    if (slot && N.nearTool(slot.x, slot.y)) f.push(['Ящик с инструментом рядом', .95]);
    if (slot && N.roomOk(slot.x, slot.y, 'service')) f.push(['Зона «Сервисный бокс»', .93]);
    const nd = job.node && D.nodes[job.node];
    if ((nd && nd.rusty) || job.kind === 'rust') { const ar = (car.rust.sills.r + car.rust.floor.r + car.rust.frame.r) / 3; const fr = 1 + .5 * ar / 100 * (P.has(p, 'brute') ? .5 : 1); if (fr > 1.02) f.push(['Ржавчина узла', fr]); }
    const n = p.fam[car.model] || 0, ff = U.lerp(1.15, .85, Math.min(1, n / 12)); f.push([n >= 12 ? 'Знаток платформы' : 'Знакомство с платформой (' + n + ' работ)', ff]);
    let h = job.h; for (const x of f) h *= x[1];
    return { h, book: job.h, f };
  };
  P.tbench = function (p, b) { const f = []; common(p, b.sk, f); let h = b.h; for (const x of f) h *= x[1]; return { h, book: b.h, f }; };
  P.quality = function (p, o, job) {
    const S = WW.S, s = p.skills[job.sk] || 0, a = [['База', 30], ['Навык ' + s + ' × 2.5', 2.5 * s]];
    if (S.upg.air) a.push(['Инструмент', 3]); if (S.upg.tester && job.sk === 'elec') a.push(['Мотор-тестер', 3]);
    if (job.grade && job.kind !== 'repair') a.push(['Грейд детали', D.grades[job.grade].bq]);
    if (p.pas[job.sk]) a.push(['Страсть', p.pas[job.sk] * 3]);
    if (!p.owner) a.push(['Настроение', Math.round((p.mood - 50) / 10)]);
    if (o && o.urgent) a.push(['Спешка («срочно»)', P.has(p, 'vet') ? -3 : -8]);
    if (p.hours > 9 && !P.has(p, 'workah')) a.push(['Усталость', -5]);
    if (P.has(p, 'perf')) a.push(['Перфекционист', 10]); if (P.has(p, 'sloppy')) a.push(['Халтурщик', -10]); if (p.hang === S.day) a.push(['Похмелье', -12]);
    if (job.qb) a.push(['Вмешательство мастера', job.qb]);
    if (P.has(p, 'petrol') && o && o.type === 'own') a.push(['Петролхед на проекте', 4]);
    const car = o && S.cars[o.car]; if (car && car.slot) { if (N.roomOk(car.x, car.y, 'service')) a.push(['Зона «Сервисный бокс»', 3]); const dr = N.dirtAround(car.x, car.y, 3); if (dr > .12) a.push(['Грязный пост', -Math.min(8, Math.round(dr * 30))]); }
    const base = a.reduce((x, y) => x + y[1], 0);
    return { base, a };
  };
  // шанс, что ремонт на станке удастся (иначе деталь теряет ресурс, а может и сломаться)
  P.fixChance = function (p, sk, t) { const q = P.quality(p, null, { sk }).base, b = N.bench(sk); return U.clamp(.35 + q / 160 - ((t != null && t < 12) ? .08 : 0) + (b && N.roomOk(b.x, b.y, 'machine') ? .06 : 0), .25, .97); };
  P.best = function (sk) { const l = WW.S.pawns.filter(p => p.state !== 'absent' && p.pri[D.priOf(sk)]); return l.sort((a, b) => (b.skills[sk] || 0) - (a.skills[sk] || 0))[0] || WW.S.pawns[0]; };

  // ---------- задачи ----------
  P.drop = function (p) {
    const S = WW.S, t = p.task; p.task = null; p.path = null; p.carry = 0; if (!t) return;
    if (t.type === 'bench') { const b = S.bench.find(x => x.id === t.b); if (b && b.by === p.id) { b.status = 'wait'; b.by = null; } return; }
    const o = t.o && S.orders[t.o]; if (!o) return;
    if (t.type === 'desk') { if (o.desk === p.id) o.desk = null; }
    else { if (o.busy === p.id) o.busy = null; if (t.type === 'job') { const j = o.jobs.find(x => x.id === t.j); if (j && j.status === 'doing') j.status = 'ready'; } }
    const car = S.cars[o.car]; if (car) { car.hood = 0; car.work = 0; }
  };
  function sideOf(car, p) { const sx = -Math.sin(car.ang), sy = Math.cos(car.ang), fx = Math.cos(car.ang), fy = Math.sin(car.ang), k = (p.id % 2 ? 1.75 : -1.75), f = ((p.id % 3) - 1) * .8; return [car.x + sx * k + fx * f, car.y + sy * k + fy * f]; }
  // толкают в одиночку, упершись в стойку у водительской двери (слева по ходу)
  function behind(car) { const m = D.models[car.model], fx = Math.cos(car.ang), fy = Math.sin(car.ang); return [car.x + fx * .55 + fy * (m.W / 2 + .38), car.y + fy * .55 - fx * (m.W / 2 + .38)]; }
  function choose(p, deskOnly) {
    const S = WW.S; let best = null, bs = -1e9;
    const cand = (pri, sc, task, x, y) => { if (!pri) return; const s = (4 - pri) * 1000 + sc - U.dist(p.x, p.y, x, y) * 3; if (s > bs) { bs = s; best = { task, x, y }; } };
    const dk = N.spot('desk');
    for (const id in S.orders) {
      const o = S.orders[id], car = S.cars[o.car]; if (!car || car.away) continue;
      const urg = (o.urgent ? 400 : 0) + (o.now ? 1500 : 0) + (o.type === 'comeback' ? 200 : 0) + (o.type === 'own' ? -150 : 0) + Math.min(300, (S.day - o.t0d) * 720 + S.min - o.t0) * .3;
      if (!o.desk && o.type !== 'own' && !o.duePending && o.arrived) {
        const sub = o.stage === 'intake' ? 'intake' : o.stage === 'approval' ? 'call' : (o.stage === 'ready' && o.clientHere) ? 'payout' : null;
        if (sub) cand(p.pri.desk, urg + (sub === 'payout' ? 300 : sub === 'intake' ? 200 : 100) + p.skills.talk * 8, { type: 'desk', o: o.id, sub, ph: 'go' }, dk[0], dk[1]);
      }
      if (o.busy || deskOnly || car.mv || car.push) continue;
      const sd = sideOf(car, p);
      if (o.stage === 'diag' && o.tests.length) {
        const t = o.tests.find(t => !D.tests[t].bay || G().inBay(car));
        if (t) cand(p.pri.diag, urg + p.skills.diag * 8, { type: 'test', o: o.id, test: t, ph: 'go' }, sd[0], sd[1]);
      }
      if (o.stage === 'work' && G().inBay(car) && (!o.assign || o.assign === p.id)) {
        for (const j of o.jobs) {
          if (j.status !== 'ready') continue;
          if (j.kind === 'repair' && !N.bench(j.sk)) continue;
          if (j.item && !S.parts.some(x => x.id === j.item)) continue;
          cand(p.pri[D.priOf(j.sk)], urg + (p.skills[j.sk] || 0) * 8 + (j.left != null ? 50 : 0), { type: 'job', o: o.id, j: j.id, ph: 'go' }, sd[0], sd[1]); break;
        }
      }
      if (o.stage === 'qc') cand(p.pri.diag, urg + 250 + p.skills.diag * 8, { type: 'qc', o: o.id, ph: 'go' }, sd[0], sd[1]);
    }
    if (!deskOnly) {
      for (const id in S.cars) { const c = S.cars[id]; if (!c.push || !c.lot) continue; const n = S.pawns.filter(q => q.task && q.task.type === 'push' && q.task.car === c.id).length; if (n >= 1) continue; const b = behind(c); cand(p.pri.haul, 500, { type: 'push', car: c.id, ph: 'go' }, b[0], b[1]); }
      if (p.pri.clean && !S.pawns.some(q => q.task && q.task.type === 'clean')) { const d = N.dirtiest(); if (d) cand(p.pri.clean, d[2] * 100, { type: 'clean', x: d[0], y: d[1], ph: 'go' }, d[0], d[1]); }
      for (const b of S.bench) { if (b.status !== 'wait') continue; const sp = N.spot('bench', p.x, p.y, b.sk); if (!N.bench(b.sk)) continue; cand(p.pri[D.priOf(b.sk)], 80 + (p.skills[b.sk] || 0) * 8, { type: 'bench', b: b.id, ph: 'go' }, sp[0], sp[1]); }
    }
    if (!best) return false;
    const t = best.task, o = t.o && S.orders[t.o]; p.task = t; p.idle = false;
    if (t.type === 'desk') o.desk = p.id; else if (o) o.busy = p.id;
    if (t.type === 'bench') { const b = S.bench.find(x => x.id === t.b); b.status = 'doing'; b.by = p.id; }
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car]; j.status = 'doing'; j.by = p.id;
      if ((j.cost > 0 || j.item) && !j.fetched) { t.ph = 'store'; const sp = N.spot('store', car.x, car.y, p.id); P.goto(p, sp[0], sp[1]); return true; }
      if (j.kind === 'repair') { const sp = N.spot('bench', car.x, car.y, j.sk); P.goto(p, sp[0], sp[1]); return true; }
    }
    P.goto(p, best.x, best.y);
    return true;
  }
  function arrived(p) {
    const S = WW.S, t = p.task, O = WW.O, o = t.o && S.orders[t.o];
    if (t.type === 'lunch' || t.type === 'idle') return;
    if (t.type === 'push') { const car = S.cars[t.car]; if (!car || !car.push) { p.task = null; return; } t.ph = 'do'; if (!(car.mv && car.mv.push) && !G().startPush(car)) { p.task = null; p.wait = 8; G().toast(C.short(car) + ': не протолкнуть — дорогу перекрыла другая машина или дороги нет.', 'bad', ['car', car.id]); } return; }
    if (t.type === 'clean') { t.ph = 'do'; t.left = 2.5; return; }
    if (t.type === 'bench') { const b = S.bench.find(x => x.id === t.b); if (!b) { p.task = null; return; } t.ph = 'do'; if (b.left == null) { b.tf = P.tbench(p, b); b.left = b.tf.h * 60; b.tot = b.left; } return; }
    if (!o) { p.task = null; return; }
    if (t.type === 'desk') { t.ph = 'do'; const talk = p.skills.talk; t.left = (t.sub === 'intake' ? 8 : t.sub === 'call' ? 5 : 4) / (.7 + talk / 25) * (P.has(p, 'lazy') ? 1.2 : 1) * (N.roomOk(p.x, p.y, 'office') ? .8 : 1); t.tot = t.left; return; }
    if (t.type === 'test') { t.ph = 'do'; t.left = D.tests[t.test].min * (1.35 - p.skills.diag * .03); t.tot = t.left; resume(p, t); return; }
    if (t.type === 'qc') { t.ph = 'do'; t.left = 12; t.tot = 12; resume(p, t); return; }
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car];
      if (t.ph === 'store') { t.ph = 'pick'; t.left = N.roomOk(p.x, p.y, 'store') ? .5 : 1.5; return; }
      t.ph = 'do';
      if (j.left == null) { j.tf = P.tfact(p, o, j); j.left = j.tf.h * 60; j.tot = j.left; O.onJobStart(o, j, p); }
      car.work = 1; car.hood = /eng|elec/.test(j.sk) ? 1 : 0;
    }
  }
  function resume(p, t) { const r = p.resume; if (r && r.o === t.o && r.type === t.type && r.test === t.test && r.left < t.left) t.left = r.left; if (r && r.o === t.o) p.resume = null; }
  function work(p, dt) {
    const S = WW.S, t = p.task, O = WW.O, o = t.o && S.orders[t.o];
    if (t.type === 'lunch') { if (S.min >= t.until) { p.task = null; p.hours = Math.max(0, p.hours - (S.upg.rest ? 2.5 : 1.5)); } return; }
    if (t.type === 'idle') { p.task = null; return; }
    if (t.type === 'push') {
      const car = S.cars[t.car]; if (!car || !car.push || !car.lot) { p.task = null; return; }
      const b = behind(car); p.x = b[0]; p.y = b[1]; p.dir = car.ang; p.hours += dt / 60; return;
    }
    if (t.type === 'clean') { t.left -= dt; p.hours += dt / 60; if (t.left <= 0) { N.clean(t.x, t.y); p.task = null; } return;
    }
    if (t.type === 'bench') {
      const b = S.bench.find(x => x.id === t.b); if (!b) { p.task = null; return; }
      b.left -= dt * (p.inspired === S.day ? 1.5 : 1); p.hours += dt / 60;
      const bo = N.bench(b.sk, p.x, p.y); if (WW.hasUI && bo && Math.random() < dt * .5) WW.emit('fx', { x: bo.x, y: bo.y, sk: b.sk, small: 1 });
      if (b.left <= 0) { p.task = null; O.benchDone(b, p); }
      return;
    }
    if (!o) { p.task = null; return; }
    if (t.ph === 'pick') { t.left -= dt; if (t.left <= 0) { const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car]; j.fetched = true; t.ph = 'go'; const sd = j.kind === 'repair' ? N.spot('bench', car.x, car.y, j.sk) : sideOf(car, p); P.goto(p, sd[0], sd[1]); p.carry = 1; } return; }
    if (t.ph !== 'do') return;
    p.carry = 0; p.hours += dt / 60;
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car];
      if (j.interv === 'wait') return;
      j.left -= dt * (p.inspired === S.day ? 1.5 : 1);
      if (WW.hasUI && Math.random() < dt * .5) { if (j.kind === 'repair') WW.emit('fx', { x: p.x, y: p.y - .6, sk: j.sk, small: 1 }); else WW.emit('fx', { x: car.x, y: car.y, sk: j.sk, kind: j.kind }); }
      if (j.left <= 0) { car.work = 0; car.hood = 0; o.busy = null; p.task = null; O.finishJob(o, j, p); }
      return;
    }
    t.left -= dt;
    if (t.left <= 0) {
      p.task = null;
      if (t.type === 'desk') { o.desk = null; O.deskDone(o, t.sub, p); }
      else if (t.type === 'test') { o.busy = null; O.testDone(o, t.test, p); }
      else if (t.type === 'qc') { o.busy = null; O.qcDone(o, p); }
    }
  }
  function deskWaiting() {
    const S = WW.S;
    for (const id in S.orders) { const o = S.orders[id], car = S.cars[o.car]; if (!car || o.desk || o.type === 'own' || o.duePending || !o.arrived) continue; if (o.stage === 'intake' || o.stage === 'approval' || (o.stage === 'ready' && o.clientHere)) return true; }
    return false;
  }
  function curPri(p, t) {
    const S = WW.S;
    if (t.type === 'job') { const o = S.orders[t.o], j = o && o.jobs.find(x => x.id === t.j); return p.pri[D.priOf(j ? j.sk : 'eng')] || 3; }
    if (t.type === 'push') return p.pri.haul || 3;
    if (t.type === 'clean') return p.pri.clean || 3;
    if (t.type === 'bench') { const b = S.bench.find(x => x.id === t.b); return p.pri[D.priOf(b ? b.sk : 'eng')] || 3; }
    return p.pri.diag || 3;
  }
  P.tick = function (dt) {
    const S = WW.S;
    for (let k = 0; k < S.pawns.length; k++) {
      const p = S.pawns[k];
      if (p.state === 'away') { if (S.min >= p.awayUntil) { p.state = 'work'; p.x = MAP.spots.gate[0]; p.y = MAP.spots.gate[1]; p.path = null; } else continue; }
      if (p.state !== 'work') continue;
      if (p.arriveAt) { if (S.min < p.arriveAt) continue; p.arriveAt = 0; }
      if (p.task && p.task.type !== 'desk' && p.task.type !== 'lunch' && p.pri.desk) {
        // тревога прерывает цепочку: клиент у стойки важнее гайки, прогресс работы сохраняется
        p.chk = (p.chk || 0) - dt;
        if (p.chk <= 0) {
          p.chk = 3; const t = p.task;
          if (p.pri.desk <= curPri(p, t) && deskWaiting()) { const keep = (t.type === 'test' || t.type === 'qc') ? { o: t.o, type: t.type, test: t.test, left: t.left } : null; P.drop(p); if (!choose(p, true)) p.wait = 0; else if (keep && t.ph === 'do') p.resume = keep; continue; }
        }
      }
      if (p.path) {
        let step = 8 * dt * (p.carry ? .8 : 1);
        while (step > 0 && p.path) {
          const q = p.path[p.pi], dx = q[0] - p.x, dy = q[1] - p.y, d = Math.hypot(dx, dy);
          if (d > .001) p.dir = Math.atan2(dy, dx);
          if (d <= step) { p.x = q[0]; p.y = q[1]; step -= d; p.pi++; if (p.pi >= p.path.length) { p.path = null; if (p.task) arrived(p); } }
          else { p.x += dx / d * step; p.y += dy / d * step; step = 0; }
        }
        continue;
      }
      if (p.task) { work(p, dt); continue; }
      if (S.min >= 720 && S.min < 775 && p.lunch !== S.day) {
        p.lunch = S.day; const sp = N.spot('rest', p.x, p.y, k);
        p.task = { type: 'lunch', until: S.min + (P.has(p, 'workah') ? 20 : 45) }; P.goto(p, sp[0], sp[1]); continue;
      }
      p.wait = (p.wait || 0) - dt;
      if (p.wait > 0) continue; p.wait = .6;
      if (choose(p)) continue;
      if (!p.idle) { p.idle = true; const sp = MAP.spots.idle[k % MAP.spots.idle.length]; P.goto(p, sp[0], sp[1]); }
    }
  };
  // прервать и пересмотреть: игрок сказал «в работу сейчас»
  P.rethink = function (pred) { for (const p of WW.S.pawns) if (p.task && pred(p, p.task)) { P.drop(p); p.wait = 0; p.idle = false; } };

  P.startDay = function () {
    const S = WW.S; let i = 0;
    for (const p of S.pawns) {
      p.task = null; p.path = null; p.hours = 0; p.idle = false; p.carry = 0; p.driving = null;
      if (p.absent && p.absent >= S.day) { p.state = 'absent'; continue; }
      if (p.course && p.course.until < S.day) { const c = p.course; p.course = null; p.skills[c.sk] = Math.min(20, p.skills[c.sk] + 2); G().note(p.name + ' вернулся с курсов: «' + D.skills[c.sk] + '» +2 (теперь ' + p.skills[c.sk] + ').', 'good', ['pawn', p.id]); P.think(p, 'course', 'Отправили на курсы', 6, 5); }
      p.state = 'work'; p.x = MAP.spots.gate[0] + (i % 3) * .7; p.y = MAP.spots.gate[1] + Math.floor(i / 3) * .7; i++;
      let late = 0;
      if (!p.owner && !P.has(p, 'vet')) { if (P.has(p, 'lazy') ? U.chance(.3) : U.chance(.07)) late = U.ri(12, 50); if (p.sulk === S.day) late = 70; }
      if (p.raceTired === S.day) { late = Math.max(late, 45); P.think(p, 'race', 'Гонка до ночи', 2, 1); }
      p.arriveAt = 420 + late + i * 1.5;
      if (late > 20) G().toast(p.name + ' опаздывает на ' + late + ' мин.', 'bad');
      if (P.has(p, 'drunk') && U.chance(.18)) { p.hang = S.day; G().note(p.name + ' пришёл с похмелья. Сегодня руки не те.', 'bad', ['pawn', p.id]); }
      if (p.inspired === S.day) G().note(p.name + ' сегодня в ударе: скорость ×1.5.', 'good', ['pawn', p.id]);
      P.moodCalc(p);
    }
  };
  P.endDay = function () { for (const p of WW.S.pawns) { P.drop(p); p.path = null; if (p.state === 'away') p.state = 'work'; } };
  P.night = function () {
    const S = WW.S;
    for (const p of S.pawns.slice()) {
      if (p.owner) continue;
      p.thoughts = p.thoughts.filter(t => t.until > S.day);
      const m = P.moodCalc(p);
      if ((S.day - p.hired) % 3 === 2 && p.known < p.traits.length) { const t = D.traits[p.traits[p.known]]; p.known++; G().note('Присмотрелся к ' + p.name + ': ' + t.n + ' (' + t.d + ').', 'info', ['pawn', p.id]); }
      if (m < 18) { p.low = (p.low || 0) + 1; if (p.low >= 2) { P.drop(p); S.pawns = S.pawns.filter(x => x !== p); G().note(p.name + ' швырнул ключи на верстак и ушёл к конкуренту. Говорит, там хотя бы кофе есть.', 'bad'); for (const o of P.staff()) P.think(o, 'quit', p.name.split(' ')[0] + ' ушёл', -4, 3); continue; } G().note(p.name + ' на грани: ещё один такой день — и он уйдёт.', 'bad', ['pawn', p.id]); }
      else p.low = 0;
      if (m >= 18 && m < 32 && U.chance(.25)) { p.sulk = S.day + 1; }
      if (m > 74 && U.chance(.15)) p.inspired = S.day + 1;
    }
    P.refreshCands(false);
  };
})(globalThis.WW);
