// WRENCHWORLD — люди: навыки, черты, настроение, выбор работы, пути (A* по сетке).
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, MAP = D.MAP, P = WW.P = {};
  const G = () => WW.G;
  let grid = null;

  P.resetPaths = () => { grid = null; };
  function getGrid() {
    if (grid) return grid;
    grid = new Uint8Array(MAP.W * MAP.H);
    for (let y = 0; y < MAP.H; y++) for (let x = 0; x < MAP.W; x++) grid[y * MAP.W + x] = D.blocked(x, y, WW.S.upg) ? 1 : 0;
    return grid;
  }
  P.path = function (ax, ay, bx, by) {
    const g = getGrid(), W = MAP.W, H = MAP.H;
    const sx = U.clamp(Math.floor(ax), 0, W - 1), sy = U.clamp(Math.floor(ay), 0, H - 1), tx = U.clamp(Math.floor(bx), 0, W - 1), ty = U.clamp(Math.floor(by), 0, H - 1);
    if (sx === tx && sy === ty) return [[bx, by]];
    const N = W * H, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), open = [];
    const s = sy * W + sx, t = ty * W + tx; gs[s] = 0; open.push(s);
    const h = i => { const dx = Math.abs(i % W - tx), dy = Math.abs(Math.floor(i / W) - ty); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
    let found = false;
    while (open.length) {
      let bi = 0, bf = 1e9; for (let i = 0; i < open.length; i++) { const f = gs[open[i]] + h(open[i]); if (f < bf) { bf = f; bi = i; } }
      const cur = open.splice(bi, 1)[0]; if (cur === t) { found = true; break; }
      if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % W, cy = Math.floor(cur / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx; if ((g[ni] && ni !== t) || closed[ni]) continue;
        if (dx && dy && (g[cy * W + nx] || g[ny * W + cx])) continue;
        const ng = gs[cur] + (dx && dy ? 1.414 : 1); if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push(ni); }
      }
    }
    if (!found) return [[bx, by]];
    const pts = []; let c = from[t]; while (c !== -1 && c !== s) { pts.push([c % W + .5, Math.floor(c / W) + .5]); c = from[c]; }
    pts.reverse(); pts.push([bx, by]); return pts;
  };
  P.goto = function (p, x, y) { p.path = P.path(p.x, p.y, x, y); p.pi = 0; };
  P.byId = id => WW.S.pawns.find(p => p.id === id);
  P.has = (p, t) => p.traits.indexOf(t) >= 0;
  P.staff = () => WW.S.pawns.filter(p => !p.owner);

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
    return { id: S.nextId++, name: fn + ' ' + U.pick(D.last), role, skills: sk, xp: {}, pas, traits, known: 1, wage: Math.round(U.lerp(R.wage[0], R.wage[1], q) * px * 4) / 4, owed: 0, mood: 55, thoughts: [],
      x: 34, y: 26, path: null, task: null, pri: Object.assign({}, R.pri), hours: 0, state: 'work', fam: {}, hired: S.day, look: { skin: U.ri(0, 7), hat: U.ri(0, 5), hair: U.ri(0, 9), f: !!D.female[fn] }, lunch: -1, low: 0 };
  };
  P.refreshCands = function (force) {
    const S = WW.S; if (!force && S.day % 3 !== 0) return;
    S.cands = S.cands.filter(c => c.legend && S.day - c.hired < 3);
    const roles = ['mech', 'mech', 'appr', 'appr', 'recep', 'body', 'mech'];
    const n = 3 + (G() && G().rep() > 50 ? 1 : 0);
    for (let i = 0; i < n; i++) S.cands.push(P.mk(U.pick(roles)));
    if (!S.cands.some(c => c.role === 'mech')) S.cands.push(P.mk('mech'));
  };
  P.hire = function (id) {
    const S = WW.S, i = S.cands.findIndex(c => c.id === id); if (i < 0) return;
    if (P.staff().length >= 6) { G().toast('В v1 в мастерской помещается хозяин и до 6 сотрудников.', 'bad'); return; }
    if (S.money < 0) { G().toast('С пустой кассой людей не нанимают.', 'bad'); return; }
    const p = S.cands.splice(i, 1)[0]; p.hired = S.day; p.x = MAP.spots.gate[0]; p.y = MAP.spots.gate[1]; p.arriveAt = S.min + 20; p.state = 'work';
    S.pawns.push(p); S.stats.hired++;
    G().note('Принят на работу: ' + p.name + ', ' + D.roles[p.role].n.toLowerCase() + ', ' + U.money(p.wage) + '/ч. Видимая черта: ' + D.traits[p.traits[0]].n + '.', 'good');
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
    if (S.upg.rest) a.push(['Комната отдыха', 5]);
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
  P.tfact = function (p, o, job) {
    const S = WW.S, car = S.cars[o.car], s = p.skills[job.sk] || 0, f = [];
    const fs = s <= 10 ? 2.2 - 1.2 * s / 10 : 1 - .45 * (s - 10) / 10; f.push(['Навык «' + D.skills[job.sk] + '» ' + s, fs]);
    const ft = (S.upg.air ? 1.0 : 1.3) * G().mod('tools'); f.push([S.upg.air ? 'Пневмоинструмент' : 'Ручной инструмент', ft]);
    const slot = car.slot && G().slot(car.slot); const wet = slot && slot.open && /rain|snow|blizzard/.test(S.weather);
    if (wet) f.push(['Пост под открытым небом, непогода', 1.15]);
    const nd = job.node && D.nodes[job.node];
    if ((nd && nd.rusty) || job.kind === 'rust') { const ar = (car.rust.sills.r + car.rust.floor.r + car.rust.frame.r) / 3; const fr = 1 + .5 * ar / 100 * (P.has(p, 'brute') ? .5 : 1); if (fr > 1.02) f.push(['Ржавчина узла', fr]); }
    const n = p.fam[car.model] || 0, ff = U.lerp(1.15, .85, Math.min(1, n / 12)); f.push([n >= 12 ? 'Знаток платформы' : 'Знакомство с платформой (' + n + ' работ)', ff]);
    const fm = U.interp([[0, 1.25], [50, 1], [100, .9]], p.mood); if (!p.owner) f.push(['Настроение ' + Math.round(p.mood), fm]);
    if (p.hours > 9 && !P.has(p, 'workah')) f.push(['Усталость после 9 часов', 1 + Math.min(.25, (p.hours - 9) * .1)]);
    if (P.has(p, 'perf')) f.push(['Перфекционист', 1.15]); if (P.has(p, 'sloppy')) f.push(['Халтурщик', .85]); if (P.has(p, 'fast')) f.push(['Быстрые руки', .9]); if (P.has(p, 'lazy')) f.push(['Лентяй', 1.15]);
    if (P.has(p, 'lark')) f.push(['Жаворонок', S.min < 720 ? .9 : S.min > 900 ? 1.08 : 1]); if (P.has(p, 'owl')) f.push(['Сова', S.min < 720 ? 1.08 : S.min > 900 ? .9 : 1]);
    if (p.hang === S.day) f.push(['Похмелье', 1.2]);
    let h = job.h; for (const x of f) h *= x[1];
    return { h, book: job.h, f };
  };
  P.quality = function (p, o, job) {
    const S = WW.S, s = p.skills[job.sk] || 0, a = [['База', 30], ['Навык ' + s + ' × 2.5', 2.5 * s]];
    if (S.upg.air) a.push(['Инструмент', 3]); if (S.upg.tester && job.sk === 'elec') a.push(['Мотор-тестер', 3]);
    if (job.grade) a.push(['Грейд детали', D.grades[job.grade].bq]);
    if (p.pas[job.sk]) a.push(['Страсть', p.pas[job.sk] * 3]);
    if (!p.owner) a.push(['Настроение', Math.round((p.mood - 50) / 10)]);
    if (o.urgent) a.push(['Спешка («срочно»)', P.has(p, 'vet') ? -3 : -8]);
    if (p.hours > 9 && !P.has(p, 'workah')) a.push(['Усталость', -5]);
    if (P.has(p, 'perf')) a.push(['Перфекционист', 10]); if (P.has(p, 'sloppy')) a.push(['Халтурщик', -10]); if (p.hang === S.day) a.push(['Похмелье', -12]);
    if (job.qb) a.push(['Вмешательство мастера', job.qb]);
    if (P.has(p, 'petrol') && o.type === 'own') a.push(['Петролхед на проекте', 4]);
    const base = a.reduce((x, y) => x + y[1], 0);
    return { base, a };
  };

  // ---------- задачи ----------
  P.drop = function (p) {
    const S = WW.S, t = p.task; p.task = null; p.path = null; if (!t) return;
    const o = t.o && S.orders[t.o]; if (!o) return;
    if (t.type === 'desk') { if (o.desk === p.id) o.desk = null; }
    else { if (o.busy === p.id) o.busy = null; if (t.type === 'job') { const j = o.jobs.find(x => x.id === t.j); if (j && j.status === 'doing') j.status = 'ready'; } }
    const car = S.cars[o.car]; if (car) { car.hood = 0; car.work = 0; }
  };
  function sideOf(car, p) { return [car.x + (p.id % 2 ? 1.75 : -1.75), car.y + ((p.id % 3) - 1) * .8]; }
  function choose(p, deskOnly) {
    const S = WW.S, O = WW.O; let best = null, bs = -1e9;
    const cand = (pri, sc, task, x, y) => { if (!pri) return; const s = (4 - pri) * 1000 + sc - U.dist(p.x, p.y, x, y) * 3; if (s > bs) { bs = s; best = { task, x, y }; } };
    for (const id in S.orders) {
      const o = S.orders[id], car = S.cars[o.car]; if (!car || car.mv || car.away) continue;
      const urg = (o.urgent ? 400 : 0) + (o.type === 'comeback' ? 200 : 0) + (o.type === 'own' ? -150 : 0) + Math.min(300, (S.day - o.t0d) * 720 + S.min - o.t0) * .3;
      if (!o.desk && o.type !== 'own') {
        const sub = o.stage === 'intake' ? 'intake' : o.stage === 'approval' ? 'call' : (o.stage === 'ready' && o.clientHere) ? 'payout' : null;
        if (sub) cand(p.pri.desk, urg + (sub === 'payout' ? 300 : sub === 'intake' ? 200 : 100) + p.skills.talk * 8, { type: 'desk', o: o.id, sub, ph: 'go' }, MAP.spots.desk[0], MAP.spots.desk[1]);
      }
      if (o.busy || deskOnly) continue;
      const sd = sideOf(car, p);
      if (o.stage === 'diag' && o.tests.length) {
        const t = o.tests.find(t => !D.tests[t].bay || G().inBay(car));
        if (t) cand(p.pri.diag, urg + p.skills.diag * 8, { type: 'test', o: o.id, test: t, ph: 'go' }, sd[0], sd[1]);
      }
      if (o.stage === 'work' && G().inBay(car) && (!o.assign || o.assign === p.id)) {
        for (const j of o.jobs) if (j.status === 'ready') { cand(p.pri[j.sk === 'body' ? 'body' : 'mech'], urg + (p.skills[j.sk] || 0) * 8 + (j.left != null ? 50 : 0), { type: 'job', o: o.id, j: j.id, ph: 'go' }, sd[0], sd[1]); break; }
      }
      if (o.stage === 'qc') cand(p.pri.diag, urg + 250 + p.skills.diag * 8, { type: 'qc', o: o.id, ph: 'go' }, sd[0], sd[1]);
    }
    if (!best) return false;
    const t = best.task, o = S.orders[t.o]; p.task = t; p.idle = false;
    if (t.type === 'desk') o.desk = p.id; else o.busy = p.id;
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j); j.status = 'doing'; j.by = p.id;
      if (j.cost > 0 && !j.fetched) { t.ph = 'store'; P.goto(p, MAP.spots.store[0] + (p.id % 2) * .8, MAP.spots.store[1] + (p.id % 3) * .5); return true; }
    }
    P.goto(p, best.x, best.y);
    return true;
  }
  function resume(p, t) { const r = p.resume; if (r && r.o === t.o && r.type === t.type && r.test === t.test && r.left < t.left) t.left = r.left; if (r && r.o === t.o) p.resume = null; }
  function arrived(p) {
    const S = WW.S, t = p.task, O = WW.O, o = t.o && S.orders[t.o];
    if (t.type === 'lunch' || t.type === 'idle') return;
    if (!o) { p.task = null; return; }
    if (t.type === 'desk') { t.ph = 'do'; const talk = p.skills.talk; t.left = (t.sub === 'intake' ? 8 : t.sub === 'call' ? 5 : 4) / (.7 + talk / 25) * (P.has(p, 'lazy') ? 1.2 : 1); t.tot = t.left; return; }
    if (t.type === 'test') { t.ph = 'do'; t.left = D.tests[t.test].min * (1.35 - p.skills.diag * .03) * (o.diagFast ? .77 : 1); t.tot = t.left; resume(p, t); return; }
    if (t.type === 'qc') { t.ph = 'do'; t.left = 12; t.tot = 12; resume(p, t); return; }
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car];
      if (t.ph === 'store') { t.ph = 'pick'; t.left = 1.5; return; }
      t.ph = 'do';
      if (j.left == null) { j.tf = P.tfact(p, o, j); j.left = j.tf.h * 60; j.tot = j.left; O.onJobStart(o, j, p); }
      car.work = 1; car.hood = /eng|elec/.test(j.sk) ? 1 : 0;
    }
  }
  function work(p, dt) {
    const S = WW.S, t = p.task, O = WW.O, o = t.o && S.orders[t.o];
    if (t.type === 'lunch') { if (S.min >= t.until) { p.task = null; p.hours = Math.max(0, p.hours - (S.upg.rest ? 2.5 : 1.5)); } return; }
    if (t.type === 'idle') { p.task = null; return; }
    if (!o) { p.task = null; return; }
    if (t.ph === 'pick') { t.left -= dt; if (t.left <= 0) { const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car]; j.fetched = true; t.ph = 'go'; const sd = sideOf(car, p); P.goto(p, sd[0], sd[1]); p.carry = 1; } return; }
    if (t.ph !== 'do') return;
    p.carry = 0; p.hours += dt / 60;
    if (t.type === 'job') {
      const j = o.jobs.find(x => x.id === t.j), car = S.cars[o.car];
      if (j.interv === 'wait') return;
      j.left -= dt * (p.inspired === S.day ? 1.5 : 1);
      if (WW.hasUI && Math.random() < dt * .5) WW.emit('fx', { x: car.x, y: car.y, sk: j.sk, kind: j.kind });
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
    for (const id in S.orders) { const o = S.orders[id], car = S.cars[o.car]; if (!car || car.mv || o.desk || o.type === 'own') continue; if (o.stage === 'intake' || o.stage === 'approval' || (o.stage === 'ready' && o.clientHere)) return true; }
    return false;
  }
  P.tick = function (dt) {
    const S = WW.S;
    for (let k = 0; k < S.pawns.length; k++) {
      const p = S.pawns[k];
      if (p.state === 'away') { if (S.min >= p.awayUntil) { p.state = 'work'; p.x = MAP.spots.gate[0]; p.y = MAP.spots.gate[1]; p.path = null; } else continue; }
      if (p.state !== 'work') continue;
      if (p.arriveAt) { if (S.min < p.arriveAt) continue; p.arriveAt = 0; }
      if (p.smoke && S.min < p.smoke) continue;
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
      if (p.task) {
        // тревога прерывает цепочку: клиент у стойки важнее гайки, прогресс работы сохраняется
        const t = p.task;
        if (t.type !== 'desk' && t.type !== 'lunch' && p.pri.desk) {
          p.chk = (p.chk || 0) - dt;
          if (p.chk <= 0) { p.chk = 3; const cur = t.type === 'job' ? p.pri[(S.orders[t.o] && (S.orders[t.o].jobs.find(x => x.id === t.j) || {}).sk) === 'body' ? 'body' : 'mech'] : p.pri.diag; if (p.pri.desk <= cur && deskWaiting()) { const keep = t.type !== 'job' ? { o: t.o, type: t.type, test: t.test, left: t.left } : null; P.drop(p); if (!choose(p, true)) p.think = 0; else if (keep && t.ph === 'do') p.resume = keep; continue; } }
        }
        work(p, dt); continue;
      }
      // обед
      if (S.min >= 720 && S.min < 775 && p.lunch !== S.day) {
        p.lunch = S.day; const sp = MAP.spots.rest[k % MAP.spots.rest.length];
        p.task = { type: 'lunch', until: S.min + (P.has(p, 'workah') ? 20 : 45) }; P.goto(p, sp[0] + (k > 2 ? 1.5 : 0), sp[1] + (k > 2 ? 1 : 0)); continue;
      }
      p.think = (p.think || 0) - dt;
      if (p.think > 0) continue; p.think = .6;
      if (choose(p)) continue;
      if (!p.idle) { p.idle = true; const sp = MAP.spots.idle[k % MAP.spots.idle.length]; P.goto(p, sp[0], sp[1]); }
    }
  };

  P.startDay = function () {
    const S = WW.S; let i = 0;
    for (const p of S.pawns) {
      p.task = null; p.path = null; p.hours = 0; p.idle = false; p.carry = 0; p.smoke = 0;
      if (p.absent && p.absent >= S.day) { p.state = 'absent'; continue; }
      p.state = 'work'; p.x = MAP.spots.gate[0] + (i % 3) * .7; p.y = MAP.spots.gate[1] + Math.floor(i / 3) * .7; i++;
      let late = 0;
      if (!p.owner && !P.has(p, 'vet')) { if (P.has(p, 'lazy') ? U.chance(.3) : U.chance(.07)) late = U.ri(12, 50); if (p.sulk === S.day) late = 70; }
      p.arriveAt = 420 + late + i * 1.5;
      if (late > 20) G().toast(p.name + ' опаздывает на ' + late + ' мин.', 'bad');
      if (P.has(p, 'drunk') && U.chance(.18)) { p.hang = S.day; G().note(p.name + ' пришёл с похмелья. Сегодня руки не те.', 'bad', ['pawn', p.id]); }
      if (p.inspired === S.day) G().note(p.name + ' сегодня в ударе: скорость ×1.5.', 'good', ['pawn', p.id]);
      P.moodCalc(p);
    }
  };
  P.endDay = function () { for (const p of WW.S.pawns) { P.drop(p); p.path = null; } };
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
