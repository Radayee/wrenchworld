// WRENCHWORLD — автомобиль как сущность: шаблон + экземпляр, истина и знание, ржавчина, цена.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C = {};

  C.model = car => D.models[car.model];
  C.name = car => car.year + ' ' + D.models[car.model].make + ' ' + D.models[car.model].name;
  C.short = car => D.models[car.model].make + ' ' + D.models[car.model].name;
  C.hasNode = function (m, id) {
    const o = D.nodes[id].only;
    if (!o) return true;
    return o === 'turbo' ? !!m.turbo : m.layout === '4x4';
  };
  C.nodeIds = car => D.nodeIds.filter(id => car.nodes[id]);

  function vin(m, year, r, engOk) {
    const ser = String(100000 + Math.floor(r() * 899999));
    const ec = (m.eng || 'X').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 2) || 'X';
    if (year < 1981) return m.make[0].toUpperCase() + String(year).slice(2) + (engOk ? ec[0] : 'Z') + ser;
    const yc = 'BCDEFGHJKLMNPRSTVWXY123456789'[(year - 1981) % 29];
    const al = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let mid = ''; for (let i = 0; i < 4; i++) mid += al[Math.floor(r() * al.length)];
    return (D.wmi[m.make] || '1XX') + mid + (engOk ? ec[0] : 'Z') + Math.floor(r() * 10) + yc + 'DTLAK'[Math.floor(r() * 5)] + ser;
  }

  // Генератор: быстро прокручивает жизнь машины — владельцы, регионы, ДТП — и выводит из неё состояние.
  // o: {model, year, quality:'client'|'private'|'auction'|'barn'|'junk'|'good', seed, set:{node:t}, rustSet:{}}
  C.gen = function (o) {
    const S = WW.S, m = D.models[o.model];
    const seed = o.seed || ((U.r() * 4294967296) >>> 0), r = U.mk(seed);
    const q = o.quality || 'private';
    const yMax = Math.min(m.y[1], S.year), yMin = Math.min(m.y[0], yMax);
    const year = o.year || U.ri(yMin, yMax, r);
    const age = Math.max(0, S.year - year);
    // цепочка владельцев
    const owners = []; let left = age, miles = 0, careSum = 0, rustK = 0, yrs = 0;
    const types = ['family', 'family', 'worker', 'student', 'retiree', 'fan', 'taxi', 'rental', 'police'];
    while (left > 0 || owners.length === 0) {
      let type = U.pick(types, r);
      if ((type === 'taxi' || type === 'police') && !/sedan|wagon/.test(m.body)) type = 'family';
      if (m.curve === 'cult' && age > 20 && r() < .5) type = r() < .5 ? 'fan' : 'barn';
      if (q === 'barn' && left <= 12) type = 'barn';
      const ow = D.owners[type];
      const n = Math.max(1, Math.min(left, U.ri(2, 9, r)));
      const reg = U.wpick(D.regions, x => x[2], r);
      const mi = n * ow.mpy * 1000 * U.rf(.7, 1.3, r);
      miles += mi; careSum += ow.care * n; yrs += n;
      rustK += reg[1] * (ow.garage ? .45 : 1) * n;
      owners.push({ type, years: n, region: reg[0], from: year + (age - left) });
      left -= n; if (owners.length >= 7) break;
    }
    yrs = Math.max(1, yrs);
    const care = careSum / yrs; rustK /= yrs;
    const c = {
      id: S.nextId++, seed, model: o.model, year, miles: 0, milesTrue: Math.round(miles), owners,
      nodes: {}, rust: {}, faults: [], finds: [], mods: [], hist: [], hidden: {}, known: {},
      title: 'clean', docs: { book: r() < .25 * care, receipts: r() < .3 * care, sticker: m.curve === 'cult' && r() < .12, keys: r() < .6 },
      matching: r() > .07, k: r() < .08 ? U.rf(1.2, 1.3, r) : U.rf(.9, 1.12, r), manual: r() < (m.sport || m.body === 'roadster' ? .7 : .25),
      detail: U.rf(.1, .6, r), wins: 0, cost: 0, owner: o.owner || 'world', slot: null, x: 0, y: 0, ang: -Math.PI / 2, mv: null, order: null, hood: 0, lift: 0
    };
    const pal = D.paint.find(p => year <= p.to).c; const col = U.pick(pal, r);
    c.colorName = col[0]; c.color = col[1];
    if (m.two && r() < .6) c.color2 = '#e9e7e0';
    // ржавчина: R = 50·(e^{a·t/50} − 1), a из формулы GDD
    const a = 1.25 * rustK * 1.2 * m.rust;
    for (const z of D.rustIds) {
      let R = 50 * (Math.exp(a * age / 50) - 1) * D.rust[z].bias * U.rf(.45, 1.35, r);
      if (q === 'good') R *= .35; if (q === 'junk') R *= 1.4;
      c.rust[z] = { r: U.clamp(R, 0, 100), lo: 0, hi: 100 };
    }
    // ДТП в истории
    if (r() < .07 + age * .012) { c.hidden.accident = U.pick(['farch', 'rarch', 'doors'], r); c.hidden.bondo = r() < .6; }
    // узлы
    for (const id of D.nodeIds) {
      if (!C.hasNode(m, id)) continue;
      const nd = D.nodes[id];
      let t = 100 - (miles / 100000) * nd.life / care - age * nd.age + U.rf(-12, 12, r);
      if (nd.wear && r() < .45) t = U.rf(68, 97, r);
      if (id === 'frame') t = 100 - Math.max(c.rust.sills.r, c.rust.floor.r, c.rust.frame.r) * .92 - U.rf(0, 6, r);
      if (id === 'panels') t -= (c.rust.farch.r + c.rust.rarch.r + c.rust.doors.r) / 3 * .35 + (c.hidden.accident && !c.hidden.bondo ? 18 : 0);
      if (q === 'auction') t -= U.rf(0, 18, r);
      if (q === 'junk') t = Math.min(80, t * U.rf(.15, .7, r));
      if (q === 'good') t = Math.max(t, U.rf(72, 96, r));
      c.nodes[id] = { t: U.clamp(t, 4, 99), lo: 0, hi: 100, grade: 'oem', reps: 5, orig: true };
    }
    // фирменные болячки модели
    if (q !== 'client' && q !== 'good') for (const sg of m.sig) {
      if (c.nodes[sg.n] && sg.n !== 'frame' && (miles > 45000 || age > 6) && r() < .14 * sg.w) c.nodes[sg.n].t = U.rf(8, 38, r);
    }
    if (q === 'private' || q === 'auction') { // случайный скрытый дефект
      const p = q === 'auction' ? .55 : (o.hid != null ? o.hid : .3);
      if (r() < p) { const id = U.pick(C.nodeIds(c).filter(x => x !== 'frame' && x !== 'panels' && x !== 'interior'), r); c.nodes[id].t = U.rf(6, 36, r); }
    }
    if (q === 'barn') for (const id of ['start', 'fuel', 'brakes', 'pads', 'discs', 'wheels', 'cool', 'ign']) if (c.nodes[id]) c.nodes[id].t = U.rf(3, 30, r);
    if (q === 'client') for (const id in c.nodes) if (id !== 'frame' && id !== 'panels' && id !== 'interior') c.nodes[id].t = Math.max(c.nodes[id].t, U.rf(47, 66, r));
    if (o.set) for (const id in o.set) if (c.nodes[id]) c.nodes[id].t = o.set[id];
    if (o.rustSet) for (const z in o.rustSet) c.rust[z].r = o.rustSet[z];
    // тайтл и пробег
    const tr = r();
    if (q === 'auction') c.title = tr < .45 ? 'salvage' : tr < .6 ? 'rebuilt' : 'clean';
    else if (q !== 'client' && q !== 'good') c.title = tr < .05 ? 'salvage' : tr < .11 ? 'rebuilt' : tr < .14 ? 'tmu' : 'clean';
    c.miles = c.milesTrue;
    if ((q === 'private' || q === 'auction') && c.milesTrue > 90000 && r() < (o.lie ? .35 : .06)) { c.hidden.rollback = true; c.miles = Math.round(c.milesTrue * U.rf(.4, .65, r)); }
    if (year < 1981 && c.milesTrue > 99999 && r() < .7) c.miles = c.milesTrue % 100000; // пятизначный одометр
    c.vin = vin(m, year, r, c.matching);
    // находки в салоне
    if (r() < .4) { const n = U.ri(1, 2, r); for (let i = 0; i < n; i++) { const f = Object.assign({}, U.pick(D.finds, r)); if (f.t === 'money' || f.t === 'coin') f.v = f.t === 'coin' ? U.ri(2, 9, r) : Math.round(U.rf(5, 120, r) * (r() < .1 ? 4 : 1)); c.finds.push(f); } }
    C.refreshFaults(c, r);
    S.cars[c.id] = c;
    return c;
  };

  // симптомы следуют из состояния узлов
  C.refreshFaults = function (car, r) {
    car.faults = car.faults.filter(f => car.nodes[f.node] && !car.nodes[f.node].gone && car.nodes[f.node].t < D.FAULT);
    for (const id in car.nodes) {
      const n = car.nodes[id];
      if (n.gone || n.t >= 35 || car.faults.some(f => f.node === id)) continue;
      const syms = (D.nodeSyms[id] || []).filter(s => (!D.sym[s].norun || n.t < 14) && (s !== 'overheat' || id !== 'start'));
      if (syms.length) car.faults.push({ node: id, sym: U.wpick(syms, s => D.sym[s].c[id], r) });
    }
    return car.faults;
  };
  C.addFault = function (car, node, sym, t) {
    if (!car.nodes[node]) return;
    car.nodes[node].t = t; car.faults = car.faults.filter(f => f.node !== node); car.faults.push({ node, sym });
  };
  C.missing = car => Object.keys(car.nodes).filter(id => car.nodes[id].gone);
  C.runs = car => !car.faults.some(f => D.sym[f.sym].norun) && car.nodes.block.t > 5 && car.nodes.start.t > 8 && !Object.keys(D.vital).some(id => car.nodes[id] && car.nodes[id].gone);
  // подходит ли деталь со склада: та же модель; электрика — в пределах марки
  C.fits = (it, car) => !!car.nodes[it.node] && (it.model === car.model || (D.models[it.model].make === D.models[car.model].make && D.nodes[it.node].g === 'Электрика'));

  // Знание сужается тестами. Точность прямо зависит от навыка «Диагностика»:
  // навык 0 — погрешность ×1.6 и до 30% шанс прочитать показания неверно (интервал не содержит истину);
  // навык 10 — ×1.0 и 10%; навык 20 — ×0.4 и без ошибок.
  C.diagK = sk => 1.6 - 1.2 * U.clamp((sk || 0) / 20, 0, 1);
  C.diagMiss = sk => U.clamp(.3 - .02 * (sk || 0), 0, .3);
  C.reveal = function (car, spec, skill, sure) {
    const k = C.diagK(skill), miss = sure ? 0 : C.diagMiss(skill);
    const one = (o, tv, err) => {
      err = Math.max(1, err * k);
      let c = tv + U.rf(-err * .6, err * .6);
      if (err > 3 && U.chance(miss)) c += (U.chance(.5) ? 1 : -1) * U.rf(18, 38); // показания прочитаны неверно
      let lo = U.clamp(Math.round(c - err), 0, 100), hi = U.clamp(Math.round(c + err), 0, 100);
      if (lo > o.hi || hi < o.lo) { o.lo = lo; o.hi = hi; } // новое показание противоречит старому — верим последнему
      else { o.lo = Math.max(o.lo, lo); o.hi = Math.min(o.hi, hi); }
    };
    if (spec.nodes) for (const id in spec.nodes) if (car.nodes[id] && !car.nodes[id].gone) one(car.nodes[id], car.nodes[id].t, spec.nodes[id]);
    if (spec.rust) for (const z in spec.rust) one(car.rust[z], car.rust[z].r, spec.rust[z]);
    if (spec.special === 'accident') { car.known.accident = true; }
  };
  C.exact = function (car, id) { const n = car.nodes[id]; n.lo = Math.max(0, Math.round(n.t) - 1); n.hi = Math.min(100, Math.round(n.t) + 1); };
  C.knownMid = n => (n.lo + n.hi) / 2;
  C.pBad = n => n.lo >= D.FAULT ? .02 : n.hi < D.FAULT ? 1 : Math.max(.02, (D.FAULT - n.lo) / Math.max(1, n.hi - n.lo));

  // сводный балл состояния 0–100; mode: 't' истина, 'lo' пессимист, 'hi' оптимист
  C.score = function (car, mode) {
    mode = mode || 't';
    let sw = 0, s = 0;
    for (const id in car.nodes) { const w = D.nodes[id].w, n = car.nodes[id]; sw += w; s += w * (mode === 't' ? n.t : n[mode]); }
    s /= sw;
    const rk = mode === 't' ? 'r' : (mode === 'lo' ? 'hi' : 'lo');
    const st = Math.max(car.rust.sills[rk], car.rust.floor[rk], car.rust.frame[rk]);
    const cos = (car.rust.farch[rk] + car.rust.rarch[rk] + car.rust.doors[rk]) / 3;
    return U.clamp(s - st * .22 - cos * .1, 0, 100);
  };
  C.cls = sc => sc >= 90 ? 1 : sc >= 80 ? 2 : sc >= 66 ? 3 : sc >= 50 ? 4 : 5;
  C.clsName = ['', 'Конкурс', 'Отличный', 'Хороший', 'Удовлетворительный', 'Проект / донор'];

  // V = B · C · M · O · D · K · T · S · P — возвращает цену и разбор по множителям для тултипа «почему?»
  C.valueParts = function (car, mode) {
    const S = WW.S, m = D.models[car.model]; mode = mode || 't';
    const age = Math.max(0, S.year - car.year);
    const B = m.new88 * U.interp(D.curves[m.curve], age) / 100 * D.infl(S.year);
    const sc = C.score(car, mode);
    const Cm = U.interp([[0, .1], [15, .15], [40, .35], [58, .65], [73, 1.0], [85, 1.25], [95, 1.6], [100, 1.7]], sc);
    const miles = (mode === 't' || car.known.rollback) ? car.milesTrue : car.miles;
    const ratio = miles / Math.max(20000, age * 10000);
    let Mm = U.interp([[.3, 1.2], [.5, 1.15], [1, 1], [1.5, .85], [2.5, .7]], ratio);
    if (m.curve === 'cult' && Mm > 1) Mm = 1 + (Mm - 1) * 2;
    const knowMatch = mode === 't' || car.known.vin;
    const Om = (m.curve === 'cult' && age >= 20) ? (knowMatch ? (car.matching ? 1.2 : .85) : 1) : 1;
    const Dm = 1 + (car.docs.book ? .04 : 0) + (car.docs.receipts ? .03 : 0) + (car.docs.sticker ? .08 : 0);
    const Tm = (S.trend[car.model] || 1);
    const Sm = D.titles[car.title].k * ((mode === 't' && car.hidden.rollback && !car.known.rollback) ? .9 : 1);
    const noRun = mode === 'hi' ? false : !C.runs(car);
    const Rm = noRun ? .78 : 1;
    let Xm = 1; for (const t of car.mods) if (D.tune[t]) Xm += (D.tune[t].val || 0) * (m.curve === 'cult' ? 1 : .3);
    for (const id in car.nodes) { const g = car.nodes[id].grade; if (D.perfNode[id] && (g === 'sport' || g === 'race')) Xm += (m.curve === 'cult' ? .012 : .003) * (g === 'race' ? .5 : 1); else if (g === 'used' || g === 'econ') Xm -= .004; }
    Xm += Math.min(3, car.wins) * .02;
    const Pm = .93 + .13 * car.detail;
    const V = B * Cm * Mm * Om * Dm * car.k * Tm * Sm * Rm * Xm * Pm;
    return { V: Math.max(60, V), parts: [['База модели по возрасту (' + D.curveName[m.curve] + ', ' + age + ' ' + U.plural(age, 'год', 'года', 'лет') + ')', U.money(B)], ['Класс состояния ' + C.cls(sc) + ' (балл ' + Math.round(sc) + ')', '×' + Cm.toFixed(2)],
      ['Пробег', '×' + Mm.toFixed(2)], ['Оригинальность', '×' + Om.toFixed(2)], ['Документы', '×' + Dm.toFixed(2)], ['Цвет и опции', '×' + car.k.toFixed(2)], ['Тренд модели', '×' + Tm.toFixed(2)],
      ['Тайтл', '×' + Sm.toFixed(2)], ['На ходу', '×' + Rm.toFixed(2)], ['Тюнинг и гонки', '×' + Xm.toFixed(2)], ['Подача', '×' + Pm.toFixed(2)]] };
  };
  C.value = (car, mode) => C.valueParts(car, mode).V;
  C.valueRange = car => [C.value(car, 'lo'), C.value(car, 'hi')];
  C.known = car => { let s = 0, n = 0; for (const id in car.nodes) { s += (car.nodes[id].hi - car.nodes[id].lo); n++; } return 1 - s / n / 100; };

  // текущие ТТХ для гонок: база модели × состояние × моды
  C.perf = function (car) {
    const m = D.models[car.model], nd = car.nodes;
    const T = id => nd[id] && !nd[id].gone ? nd[id].t : 0;
    const eh = (T('block') * .36 + T('head') * .18 + T('fuel') * .14 + T('ign') * .14 + T('intake') * .09 + T('exh') * .09) / 100;
    let hp = m.hp * (.5 + .5 * eh), wt = m.wt, grip = (T('wheels') * .45 + T('fsusp') * .2 + T('rsusp') * .2 + (T('pads') + T('discs')) * .075) / 100;
    for (const t of car.mods) { const d = D.tune[t]; if (!d) continue; hp *= 1 + (d.hp || 0); wt *= 1 + (d.wt || 0); grip += d.grip || 0; }
    // тюнинг — это детали другого грейда: премиум и гоночные дают мощность или сцепление
    for (const id in nd) { const kind = D.perfNode[id], g = D.grades[nd[id].grade]; if (!kind || !g || !g.perf || nd[id].gone) continue; if (kind === 'hp') hp *= 1 + g.perf * (id === 'turbo' ? 2 : 1); else grip += g.perf * (kind === 'brake' ? .35 : 1); }
    const et = 5.825 * Math.pow(wt / Math.max(20, hp), 1 / 3) * (1.06 - .06 * U.clamp(grip, 0, 1.2));
    const stab = (T('ign') + T('fuel') + T('gearbox') + (nd.clutch ? T('clutch') : 80) + T('wheels')) / 500;
    return { hp: Math.round(hp), wt: Math.round(wt), grip, et, stab };
  };

  // износ на хранении и ржавчина (тамагочи-слой); days — прошедшие дни
  C.decay = function (car, days, kStore) {
    const S = WW.S, nd = car.nodes;
    const wear = (id, lo, k) => { if (!nd[id].gone) nd[id].t = Math.max(Math.min(lo, nd[id].t), nd[id].t - k * days * kStore); };
    wear('start', 2, 1.6); wear('discs', 5, .35); wear('wheels', 5, .3); wear('fuel', 5, .2);
    car.detail = Math.max(0, car.detail - .02 * days * kStore);
    const dp = 1 - nd.panels.t / 100;
    for (const z of D.rustIds) { const R = car.rust[z]; R.r = Math.min(100, R.r + .022 * 2.0 * kStore * (1 + dp) * (1 + R.r / 50) * days * (S.set.rustK || 1)); if (R.hi < R.r) R.hi = Math.min(100, Math.ceil(R.r)); }
    for (const id of ['start', 'discs', 'wheels', 'fuel']) { const n = nd[id]; if (n.lo > n.t) n.lo = Math.floor(n.t); if (n.hi < n.t) n.hi = Math.ceil(n.t); }
    C.refreshFaults(car);
  };

  // история словами — только то, что игрок узнал
  C.story = function (car, full) {
    return car.owners.map(o => o.from + '–' + (o.from + o.years) + ' — ' + D.owners[o.type].n + ', ' + o.region).join('. ') + '.' +
      (full && car.hidden.accident ? ' В истории удар: ' + D.rust[car.hidden.accident].n.toLowerCase() + (car.hidden.bondo ? ' (под краской шпатлёвка).' : '.') : '');
  };
})(globalThis.WW);
