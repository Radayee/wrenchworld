// WRENCHWORLD — гоночная команда (по мотивам WORKS: Motorsport Factory и Motorsport Manager):
// «фабрика — игра, гонка — экзамен». Клубная серия из 8 этапов, сетап по отзывам пилота,
// загрузка трейлера запчастями, живой заезд с пит-стопами и поломками реально установленных узлов, спонсоры.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, M = WW.M, RC = WW.RC = {};
  const G = () => WW.G, P = () => WW.P, O = () => WW.O;
  const gauss = () => (U.r() + U.r() + U.r() - 1.5) / .5;

  // ---------- данные ----------
  D.tune.cage = { n: 'Гоночная подготовка: каркас, ковш, ремни, огнетушитель', h: 6, part: 380, sk: 'body', hp: 0, wt: .02, grip: .03, val: -.03 };
  D.spares = {
    tires:  { n: 'Комплект шин', i: '⚫', size: 3, price: 160, d: 'Свежая резина на пит-стопе. Без неё шины меняют только на изношенные запасные — дольше и хуже.' },
    pads:   { n: 'Колодки и тормозная жидкость', i: '🛑', size: 1, price: 40, d: 'Чинит отказ тормозов на пит-стопе.' },
    hoses:  { n: 'Шланги, термостат, антифриз', i: '💧', size: 1, price: 45, d: 'Спасает от перегрева.' },
    ignit:  { n: 'Свечи, катушка, провода, реле', i: '⚡', size: 1, price: 50, d: 'Чинит пропуски зажигания, питание и зарядку.' },
    clutch: { n: 'Сцепление в сборе', i: '⚙', size: 2, price: 150, d: 'Меняется в боксах за пару минут.' },
    tools:  { n: 'Набор для ремонта в паддоке', i: '🧰', size: 2, price: 90, d: 'Чинит подвеску, рулевое и привод, ускоряет любой ремонт на пит-стопе вдвое.' }
  };
  D.tracks = {
    strip: { n: 'Дрэг-стрип «Норвок»', type: 'drag', fee: 20, opt: { gear: 30 }, d: 'Брекеты: назначаешь прогноз времени (dial-in) и должен приехать как можно ближе к нему, но не быстрее. Побеждает стабильность.' },
    mall:  { n: 'Автокросс у молла «Вестгейт»', type: 'autox', fee: 25, opt: { susp: 60, tyre: 45 }, d: 'Три попытки по конусам, в зачёт лучшая. Сбитый конус +2 секунды. Решают подвеска, шины и руки.',
      path: [[6, 62], [18, 52], [28, 60], [40, 50], [52, 60], [64, 48], [80, 40], [72, 26], [56, 20], [40, 28], [26, 18], [12, 10]] },
    oval:  { n: 'Овал «Лейксайд Спидвей»', type: 'circuit', fee: 45, laps: 30, base: 24, wear: 1, opt: { gear: 72, susp: 66, tyre: 58 }, d: 'Короткий овал, 30 кругов. Длинные передачи, жёсткая подвеска. Шины и бензин — на одну остановку.',
      path: [[22, 12], [78, 12], [93, 35], [78, 58], [22, 58], [7, 35]] },
    hill:  { n: 'Кольцо «Бернс-Хилл»', type: 'circuit', fee: 45, laps: 22, base: 50, wear: 1.15, opt: { gear: 36, susp: 40, tyre: 46 }, d: 'Холмистое кольцо, 22 круга. Короткие передачи, мягкая подвеска, тормоза работают на износ.',
      path: [[14, 12], [54, 9], [70, 18], [88, 13], [93, 31], [78, 39], [86, 57], [60, 61], [48, 48], [33, 58], [11, 54], [18, 37], [7, 24]] },
    junk:  { n: 'Junkyard 24 · «Бернс-Хилл»', type: 'junk', fee: 150, laps: 90, base: 50, wear: 1.3, opt: { gear: 40, susp: 38, tyre: 44 }, d: 'Финал сезона: сутки на машинах не дороже лимита. Очки ×2. Решает надёжность и что лежит в трейлере.', path: 'hill' }
  };
  RC.CAL = ['strip', 'mall', 'oval', 'strip', 'hill', 'mall', 'oval', 'junk'];
  RC.PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  RC.TEAM = 'Pops Auto';
  D.rivals = [
    { n: 'Харпер Рейсинг', d: '«Дикий» Билл Харпер', car: 'Corvan Nomad 454', col: '#c0392b', r: 62, rel: .9 },
    { n: 'Жёлтый свет', d: 'Сэл Веккио', car: 'Bellmore GT 400', col: '#E3B23C', r: 55, rel: .88 },
    { n: 'Ли Моторспорт', d: 'Ронда Ли', car: 'Halford Stallion 5.0', col: '#3B82F6', r: 68, rel: .93 },
    { n: 'Док и сыновья', d: 'Док Мейерс', car: 'Monarch Dart 340', col: '#8a6fb0', r: 48, rel: .9 },
    { n: 'Тито Гараж', d: 'Малыш Тито', car: 'Corvan Vega V8', col: '#2e9a8a', r: 44, rel: .82 },
    { n: 'Ковач Бразерс', d: 'Близнецы Ковач', car: 'Ameri Javelina', col: '#9aa0a6', r: 52, rel: .91 },
    { n: 'Гидрант Ойл', d: 'Чак «Гидрант»', car: 'Halford Fairline', col: '#4f9a6a', r: 40, rel: .95 },
    { n: 'Донна Рейсинг', d: 'Мисс Донна', car: 'Bellmore Firebolt', col: '#c77f9a', r: 58, rel: .89 },
    { n: 'Big Al’s Racing', d: 'Эл-младший', car: 'Corvan Square SS', col: '#d9662b', r: 64, rel: .86 },
    { n: 'Норвок Тех', d: 'студенты колледжа', car: 'Volkswerk Rabbit GTI', col: '#5d7a99', r: 36, rel: .8 },
    { n: 'Рейнольдс', d: 'Хэнк Рейнольдс', car: 'Tomiya Haul 4x4', col: '#b0763c', r: 33, rel: .97 }
  ];
  const JUNK = [['Ведро с болтами', 'Monarch Kay'], ['Ржавые братья', 'Volund 240'], ['Пончик Рейсинг', 'Corvan Caprio'], ['Команда «Изолента»', 'Halford Meridian'], ['Бабушкин гараж', 'Bellmore Century'], ['Церковный приход', 'Monarch Wagonette'], ['Фермеры Огайо', 'Corvan Square'], ['Клуб «Без тормозов»', 'Hikari Concord']];
  D.sponsors = [
    { id: 'pizza', n: 'Пиццерия «Тони»', base: 40, pod: 60, need: { starts: 1 }, d: 'Местная пиццерия. Платит за каждый старт, бонус за подиум.' },
    { id: 'tires', n: 'Шиномонтаж «Гудрич-Сити»', base: 70, pod: 120, need: { pts: 20 }, d: 'Хочет видеть свою наклейку в первой половине пелотона.' },
    { id: 'radio', n: 'Радио WRNC 98.7', base: 90, pod: 150, need: { wins: 1 }, d: 'Диджей будет орать твоё имя в эфире. Нужна хотя бы одна победа.' },
    { id: 'oil', n: 'Масло «Петро-Гард»', base: 130, pod: 220, need: { pts: 45, rep: 50 }, d: 'Региональный бренд. Только для команд с именем.' }
  ];
  RC.MODE = { save: { n: 'Беречь', lap: 1.025, tire: .7, fuel: .86, brk: .5 }, norm: { n: 'Норма', lap: 1, tire: 1, fuel: 1, brk: 1 }, attack: { n: 'Атака', lap: .978, tire: 1.45, fuel: 1.14, brk: 1.7 } };
  RC.TIRE = 3.1; RC.TANK = 18;
  RC.NODES = ['block', 'head', 'gasket', 'cool', 'gearbox', 'clutch', 'drive', 'brakes', 'wheels', 'fuel', 'ign', 'start', 'fsusp', 'rsusp', 'steer'];
  RC.FAIL = {
    cool: { t: 'перегрев — из-под капота пар', sp: 'hoses', limp: 1.25, dnfIn: 3 }, gasket: { t: 'белый дым — прокладка ГБЦ', sp: 'paddock', limp: 1.3, dnfIn: 4 },
    brakes: { t: 'педаль тормоза проваливается', sp: 'pads', limp: 1.16 }, clutch: { t: 'сцепление буксует', sp: 'clutch', limp: 1.2, dnfIn: 6 },
    gearbox: { t: 'коробка рассыпалась', dnf: 1 }, drive: { t: 'хруст и вой в приводе', sp: 'tools', limp: 1.2, dnfIn: 5 },
    block: { t: 'стук в моторе — шатун', dnf: 1 }, head: { t: 'оборвался ремень ГРМ', dnf: 1 },
    fuel: { t: 'провалы, мотор чихает', sp: 'ignit', limp: 1.15 }, ign: { t: 'троит на прямой', sp: 'ignit', limp: 1.15 },
    start: { t: 'села зарядка', sp: 'ignit', limp: 1.04, dnfIn: 7 }, wheels: { t: 'прокол', sp: 'tires', limp: 1.6, dnfIn: 2 },
    fsusp: { t: 'стук в передней подвеске', sp: 'tools', limp: 1.1 }, rsusp: { t: 'просела задняя подвеска', sp: 'tools', limp: 1.1 }, steer: { t: 'люфт руля', sp: 'tools', limp: 1.12 }
  };
  RC.KEYS = { gear: ['Передачи', 'короткие — разгон', 'длинные — максималка', 'покороче', 'подлиннее'], susp: ['Подвеска', 'мягко', 'жёстко', 'помягче', 'пожёстче'], tyre: ['Давление шин', 'низкое', 'высокое', 'пониже', 'повыше'] };
  RC.keys = type => type === 'drag' ? ['gear'] : type === 'autox' ? ['susp', 'tyre'] : ['gear', 'susp', 'tyre'];

  // ---------- чемпионат ----------
  RC.champ = function () {
    const S = WW.S; if (!S.champ || !S.champ.spares) S.champ = Object.assign({ season: 0, pts: {}, spares: { tires: 1, pads: 1, hoses: 1 }, load: { pads: 1, hoses: 1 }, crew: [], sponsor: null, offers: [], starts: 0, results: [], lastRes: null }, S.champ && S.champ.pts ? { pts: S.champ.pts } : {});
    if (!S.setup) S.setup = { gear: 50, susp: 50, tyre: 50 };
    return S.champ;
  };
  RC.seasonOf = day => Math.floor(day / 56);
  RC.cap = () => WW.S.upg.trailer ? 10 : 4;
  RC.loadSize = ld => Object.keys(ld || {}).reduce((a, k) => a + (ld[k] || 0) * D.spares[k].size, 0);
  RC.table = function () {
    const ch = RC.champ(), t = [{ n: RC.TEAM, pts: ch.pts[RC.TEAM] || 0, you: 1, col: '#ffffff' }].concat(D.rivals.map(r => ({ n: r.n, pts: ch.pts[r.n] || 0, col: r.col })));
    return t.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));
  };
  M.mkRace = function () {
    const S = WW.S, ch = RC.champ(), dw = G().dow(), day = S.day + ((5 - dw + 7) % 7);
    if (S.race && S.race.day === day) return;
    const ss = RC.seasonOf(day);
    if (ch.season !== ss) { RC.endSeason(); ch.season = ss; ch.pts = {}; if (ch.sponsor && ch.sponsor.season !== ss) { G().log('Контракт со спонсором «' + ch.sponsor.n + '» закончился вместе с сезоном.', 'info'); ch.sponsor = null; } }
    const idx = Math.floor(day / 7) % 8, tr = RC.CAL[idx], T = D.tracks[tr], rr = U.mk(U.hash('race' + day)), opt = {};
    for (const k in T.opt) opt[k] = U.clamp(Math.round(T.opt[k] + (rr() - .5) * 26), 4, 96);
    S.race = { day, round: idx + 1, track: tr, type: T.type, name: T.n, fee: Math.round(T.fee * G().px()), entry: null, res: null, opt, practice: [], setup: Object.assign({}, S.setup) };
  };
  const baseStart = M.startDay;
  M.startDay = function () {
    const S = WW.S, ch = RC.champ();
    if (S.race && S.race.day < S.day && !S.race.entry && ch.sponsor) { G().note('Спонсор «' + ch.sponsor.n + '» разорвал контракт: команда пропустила этап.', 'bad'); G().repAdd('h', -1); ch.sponsor = null; }
    baseStart(); M.mkRace();
  };
  M.raceCars = () => Object.values(WW.S.cars).filter(c => c.owner === 'player' && c.lot && !c.order && !c.mv && !c.push && C.runs(c));
  RC.limit = () => Math.round(500 * G().px() * 1.6 / 50) * 50;
  RC.check = function (car, race) {
    const out = [];
    out.push({ ok: !!car && car.owner === 'player', t: 'Своя машина' });
    if (!car) return out;
    out.push({ ok: C.runs(car), t: 'На ходу' });
    out.push({ ok: !car.order, t: 'Без открытого наряда' });
    out.push({ ok: !car.sale, t: 'Не выставлена на продажу' });
    if (race.type === 'circuit' || race.type === 'junk') out.push({ ok: car.mods.includes('cage'), t: 'Техком: каркас, ковш, огнетушитель (тюнинг «Гоночная подготовка»)' });
    if (race.type === 'junk') out.push({ ok: C.value(car, 't') <= RC.limit(), t: 'Стоимость машины не выше ' + U.money(RC.limit()) });
    return out;
  };
  M.raceEnter = function (carId, pid, dial) {
    const S = WW.S, g = G(), r = S.race, car = S.cars[carId], p = P().byId(pid), ch = RC.champ(); if (!r || r.entry || !car || !p) return false;
    if (S.day > r.day || (S.day === r.day && S.min >= 1140)) return false;
    const bad = RC.check(car, r).find(x => !x.ok); if (bad) { g.toast('Заявку не примут: ' + bad.t.toLowerCase() + '.', 'bad'); return false; }
    if (S.money < r.fee) { g.toast('Не хватает на взнос.', 'bad'); return false; }
    const load = {}; for (const k in ch.load) load[k] = Math.min(ch.load[k] || 0, ch.spares[k] || 0);
    g.money(-r.fee, 'raceFee'); r.entry = { car: carId, p: pid, dial: dial || null, crew: ch.crew.filter(id => P().byId(id)), load }; S.raceCar = carId;
    WW.emit('q', 'race'); g.note('Заявка на ' + r.round + '-й этап принята: ' + r.name + '. ' + p.name + ' за рулём ' + C.short(car) + '. Старт в субботу после закрытия.', 'info', ['panel', 'race']);
    return true;
  };
  M.raceDue = () => { const S = WW.S, r = S.race; return !!(r && r.day === S.day && r.entry && !r.res && S.cars[r.entry.car] && S.cars[r.entry.car].owner === 'player'); };

  // ---------- темп ----------
  RC.sq = function (set, opt, keys) { let s = 0; for (const k of keys) s += Math.abs((set[k] == null ? 50 : set[k]) - (opt[k] == null ? 50 : opt[k])); return U.clamp(1 - s / keys.length / 50, 0, 1); };
  RC.carF = function (car, p, sq) { const pf = C.perf(car), pw = pf.hp / pf.wt * 1000; return 1 + .18 * (1 - U.clamp((pw - 25) / 70, 0, 1)) + .1 * (1 - U.clamp(pf.grip, 0, 1.2)) + .06 * (1 - sq) + .05 * (1 - p.skills.drive / 20); };
  RC.rivalF = (r, season) => 1.07 + .2 * (1 - U.clamp(r.r + season * 2.5, 0, 100) / 100);
  RC.lapTime = function (race, car, p, sq) {
    const pf = C.perf(car), T = D.tracks[race.track];
    if (race.type === 'drag') return pf.et * (1 + (1 - sq) * .04);
    if (race.type === 'autox') return 71 - 60 * pf.hp / pf.wt - 10 * pf.grip - p.skills.drive * .35 + (pf.wt - 3000) / 400 + (1 - sq) * 3.2;
    return T.base * RC.carF(car, p, sq);
  };
  // тренировочный заезд: время и отзыв пилота. Точность отзыва — от «Вождения» и того, сколько он уже ездил на этой машине.
  RC.practice = function (race, car, p) {
    const keys = RC.keys(race.type), set = race.setup, opt = race.opt, acc = U.clamp(.58 + p.skills.drive * .016 + Math.min(.1, (car.raceStarts || 0) * .03), .5, .97), fb = {};
    for (const k of keys) { const dv = set[k] - opt[k]; let dir = Math.abs(dv) < 7 ? 0 : (dv > 0 ? -1 : 1); if (!U.chance(acc)) dir = U.pick([-1, 0, 1].filter(x => x !== dir)); fb[k] = { dir, big: dir !== 0 && Math.abs(dv) > 22 && U.chance(acc) }; }
    const sq = RC.sq(set, opt, keys), run = { set: Object.assign({}, set), time: RC.lapTime(race, car, p, sq) * (1 + gauss() * .006), fb, acc };
    race.practice.push(run); return run;
  };
  RC.autoSetup = function (race, car, p) { for (let i = 0; i < 3; i++) { const r = RC.practice(race, car, p); for (const k in r.fb) race.setup[k] = U.clamp(race.setup[k] + r.fb[k].dir * (r.fb[k].big ? 18 : 8), 0, 100); } };

  // ---------- живой заезд: круговые гонки и Junkyard 24 ----------
  RC.newRace = function (race, car, p, auto) {
    const S = WW.S, T = D.tracks[race.track], ch = RC.champ(), keys = RC.keys(race.type), sq = RC.sq(race.setup, race.opt, keys);
    const crew = (race.entry.crew || []).map(id => P().byId(id)).filter(Boolean), crewSk = crew.length ? Math.max(...crew.map(c => (c.skills.chassis + c.skills.eng) / 2)) : 3;
    const st = { t: 0, laps: T.laps, junk: race.type === 'junk', T, cars: [], log: [], over: false, auto: auto !== false, crewK: U.clamp(1.55 - crewSk * .04 - (crew.length > 1 ? .08 : 0), .7, 1.6), crewSk, load: Object.assign({}, race.entry.load || {}), used: {}, nodes: {}, start: {}, sq };
    for (const id of RC.NODES) if (car.nodes[id] && !car.nodes[id].gone) { st.nodes[id] = car.nodes[id].t; st.start[id] = car.nodes[id].t; }
    const mk = o => Object.assign({ d: 0, lap: 0, cur: 1, tire: 100, fuel: 100, mode: 'norm', pitReq: null, inPit: 0, dnf: null, fin: null, issues: [], limp: 1, best: 1e9, last: 0, lapStart: 0, pits: 0, dnfIn: null, spin: 0 }, o);
    st.cars.push(mk({ you: 1, n: RC.TEAM, drv: p.name, car: C.short(car), col: '#ffffff', f: RC.carF(car, p, sq), dsk: p.skills.drive, rel: 1 }));
    for (const r of D.rivals) st.cars.push(mk({ n: r.n, drv: r.d, car: r.car, col: r.col, f: RC.rivalF(r, ch.season) * (1 + gauss() * .012), rel: r.rel, dsk: 10 }));
    if (st.junk) for (const j of JUNK) st.cars.push(mk({ n: j[0], drv: 'любители', car: j[1], col: '#6b6f74', f: 1.2 + U.rf(0, .1), rel: U.rf(.65, .85), dsk: 6 }));
    // квалификация: сетка по темпу с шумом
    st.cars.sort((a, b) => a.f * (1 + gauss() * .01) - b.f * (1 + gauss() * .01));
    st.cars.forEach((c, i) => { c.grid = i + 1; c.d = -i * .012; c.lapStart = 0; RC.nextLap(st, c); });
    return st;
  };
  RC.nextLap = function (st, c) {
    const md = RC.MODE[c.mode], night = st.junk && c.lap >= st.laps * .45 && c.lap < st.laps * .72;
    let lt = st.T.base * c.f * md.lap * (1 + Math.pow(1 - c.tire / 100, 2) * .08) * c.limp * (night ? 1.05 : 1);
    lt *= 1 + gauss() * .008 * (c.you ? 1.3 - c.dsk / 20 * .7 : 1);
    c.cur = lt;
  };
  RC.step = function (st, dt) {
    st.t += dt;
    for (const c of st.cars) {
      if (c.dnf || c.fin != null) continue;
      if (c.inPit > 0) { c.inPit -= dt; if (c.inPit <= 0) { c.inPit = 0; RC.pitDone(st, c); } continue; }
      if (c.spin > 0) { c.spin -= dt; continue; }
      const before = Math.floor(c.d); c.d += dt / c.cur;
      if (Math.floor(c.d) > before && c.d >= 1) RC.lapDone(st, c);
    }
    if (st.cars.every(c => c.dnf || c.fin != null)) st.over = true;
  };
  const say = (st, t, k) => { st.log.push({ t: st.t, lap: (st.cars.find(c => c.you) || {}).lap || 0, x: t, k: k || '' }); if (st.onLog) st.onLog(); };
  RC.canFix = (st, i) => i.sp === 'paddock' ? st.junk : !!(i.sp && (st.load[i.sp] || 0) > 0);
  RC.lapDone = function (st, c) {
    c.lap++; const lt = st.t - c.lapStart; c.lapStart = st.t; c.last = lt; if (c.lap > 1 && lt < c.best) c.best = lt;
    const md = RC.MODE[c.mode];
    c.tire = Math.max(0, c.tire - RC.TIRE * md.tire * (st.junk ? .8 : 1) * st.T.wear * U.rf(.85, 1.15));
    c.fuel -= 100 / RC.TANK * md.fuel * U.rf(.97, 1.03);
    if (c.fuel <= 0) { c.dnf = 'кончился бензин'; if (c.you) say(st, 'Машина встала на прямой: кончился бензин. Сход.', 'bad'); return; }
    if (c.lap >= st.laps) { c.fin = st.t; if (c.you) say(st, 'Финиш! ' + st.laps + ' кругов позади.', 'good'); return; }
    if (c.you) RC.youFail(st, c, md);
    else if (U.chance((1 - c.rel) / st.laps * md.brk)) { c.dnf = U.pick(['мотор', 'коробка', 'вылет с трассы', 'перегрев', 'отвалилось колесо']); say(st, c.n + ' сходит: ' + c.dnf + '.'); return; }
    if (c.dnf) return;
    if (c.dnfIn != null) { c.dnfIn--; if (c.dnfIn <= 0) { c.dnf = c.issues.length ? RC.FAIL[c.issues[0].node].t : 'поломка'; if (c.you) say(st, 'Не дотянули до боксов: ' + c.dnf + '. Сход.', 'bad'); return; } }
    const tirePen = c.tire < 12 ? 3 : 1;
    if (c.mode === 'attack' && U.chance(.004 * (1 + (20 - c.dsk) / 10) * tirePen) || (c.tire < 6 && U.chance(.08))) { c.spin = U.rf(5, 9); if (c.you) say(st, 'Разворот! Потеряли ' + Math.round(c.spin) + ' с.', 'bad'); }
    if (!c.you || st.auto) RC.aiPit(st, c);
    if (c.pitReq) { c.inPit = RC.pitTime(st, c, c.pitReq); c.pits++; if (c.you) say(st, 'Заезд в боксы: ' + [c.pitReq.tires ? 'шины' : '', c.pitReq.fuel ? 'бензин' : '', (c.pitReq.fixes || []).length ? 'ремонт' : ''].filter(Boolean).join(', ') + ' — ' + Math.round(c.inPit) + ' с.'); return; }
    RC.nextLap(st, c);
  };
  RC.youFail = function (st, c, md) {
    for (const id in st.nodes) {
      st.nodes[id] = Math.max(1, st.nodes[id] - U.rf(.1, .5) * md.brk * st.T.wear);
      if (c.issues.some(i => i.node === id)) continue;
      const t = st.nodes[id], p = Math.pow(Math.max(0, (52 - t) / 52), 1.6) * .06 * md.brk + .0004;
      if (!U.chance(p)) continue;
      let f = RC.FAIL[id]; if (f.dnf && st.junk) f = { t: f.t, sp: 'paddock', limp: 1.5, dnfIn: 3 };
      if (f.dnf) { c.dnf = f.t; say(st, D.nodes[id].n + ': ' + f.t + '. Сход.', 'bad'); return; }
      c.issues.push({ node: id, sp: f.sp, limp: f.limp }); c.limp *= f.limp; if (f.dnfIn) c.dnfIn = Math.min(c.dnfIn == null ? 99 : c.dnfIn, f.dnfIn);
      say(st, D.nodes[id].n + ': ' + f.t + '. ' + (RC.canFix(st, c.issues[c.issues.length - 1]) ? 'В трейлере есть чем чинить — нужен пит-стоп.' : 'Запчасти в трейлере нет' + (f.dnfIn ? ' — протянет ещё ' + f.dnfIn + ' кр.' : ', едем как есть.')), 'bad');
      return;
    }
  };
  RC.aiPit = function (st, c) {
    const left = st.laps - c.lap, perLap = 100 / RC.TANK * RC.MODE[c.mode].fuel, fixes = c.you ? c.issues.filter(i => RC.canFix(st, i)) : [];
    const needFuel = c.fuel < perLap * 1.4 && left * perLap > c.fuel, needTire = c.tire < 24 && left > 3;
    if (needFuel || needTire || fixes.length) c.pitReq = { tires: needTire || (c.tire < 62 && left > 6), fuel: needFuel || (c.fuel < 55 && left * perLap > c.fuel), fix: true };
  };
  RC.pitTime = function (st, c, rq) {
    let t = 16 + (rq.tires ? 13 : 0) + (rq.fuel ? (100 - c.fuel) * .1 : 0); rq.fixes = [];
    if (c.you && rq.tires && !(st.load.tires > 0)) t += 10; // без комплекта шин — ставят изношенные запасные
    if (c.you && rq.fix !== false) for (const i of c.issues) if (RC.canFix(st, i)) { rq.fixes.push(i.node); t += i.sp === 'paddock' ? 900 : (st.load.tools > 0 && i.sp !== 'tools' ? 12 : 25); }
    return t * (c.you ? st.crewK : U.rf(.9, 1.15));
  };
  RC.pitDone = function (st, c) {
    const rq = c.pitReq || {}; c.pitReq = null;
    if (rq.tires) { if (!c.you || st.load.tires > 0) { c.tire = 100; if (c.you) { st.load.tires--; st.used.tires = (st.used.tires || 0) + 1; } } else c.tire = Math.max(c.tire, 55); }
    if (rq.fuel) c.fuel = 100;
    for (const n of rq.fixes || []) { const i = c.issues.find(x => x.node === n); if (!i) continue; if (i.sp !== 'paddock') { st.load[i.sp]--; st.used[i.sp] = (st.used[i.sp] || 0) + 1; } c.issues = c.issues.filter(x => x !== i); c.limp /= i.limp; st.nodes[n] = Math.max(st.nodes[n], i.sp === 'paddock' ? 40 : 58); say(st, 'Механики починили: ' + D.nodes[n].n.toLowerCase() + '.', 'good'); }
    if (c.issues.every(i => !RC.FAIL[i.node].dnfIn && i.sp !== 'paddock')) c.dnfIn = null;
    RC.nextLap(st, c);
  };
  RC.order = st => st.cars.slice().sort((a, b) => {
    const fa = a.fin != null, fb = b.fin != null; if (fa && fb) return a.fin - b.fin; if (fa !== fb) return fa ? -1 : 1;
    if (!!a.dnf !== !!b.dnf) return a.dnf ? 1 : -1; return b.d - a.d;
  });
  RC.resultCircuit = function (race, st) {
    const ord = RC.order(st), mult = st.junk ? 2 : 1, px = G().px(), you = st.cars.find(c => c.you), place = ord.indexOf(you) + 1;
    const field = ord.map((c, i) => ({ n: c.n, drv: c.drv, car: c.car, col: c.col, you: !!c.you, laps: c.fin != null ? st.laps : c.lap, time: c.fin, dnf: c.dnf, best: c.best < 1e8 ? c.best : null, pts: !c.dnf && i < 10 ? RC.PTS[i] * mult : 0, pits: c.pits }));
    const pr = (st.junk ? [800, 400, 250, 120, 80] : [300, 180, 120, 80, 60, 40])[place - 1] || 0;
    return { type: race.type, track: race.track, place, win: place === 1 && !you.dnf, dnf: you.dnf, field, prize: you.dnf ? 0 : Math.round(pr * px), pts: field[place - 1].pts, log: st.log, used: st.used, nodes: st.nodes, start: st.start, best: you.best < 1e8 ? you.best : null, text: you.dnf ? 'Сход: ' + you.dnf : place === 1 ? (st.junk ? 'Победа в Junkyard 24!' : 'Победа!') : place + '-е место из ' + field.length };
  };

  // ---------- дрэг и автокросс ----------
  RC.drag = function (race, car, p) {
    const pf = C.perf(car), dv = p.skills.drive, px = G().px(), sq = RC.sq(race.setup, race.opt, ['gear']), et0 = RC.lapTime(race, car, p, sq);
    const sig = .05 + (1 - pf.stab) * .3 + (20 - dv) * .006 + (1 - sq) * .05, dial = race.entry.dial || Math.round((et0 + .04) * 100) / 100;
    const res = { type: 'drag', track: race.track, rounds: [], dial }; let alive = true;
    const opps = D.rivals.slice().sort(() => U.r() - .5), nodes = {};
    for (const id of ['clutch', 'gearbox', 'drive', 'wheels', 'brakes', 'block']) if (car.nodes[id] && !car.nodes[id].gone) nodes[id] = car.nodes[id].t;
    for (let i = 0; i < 3 && alive; i++) {
      const o = opps[i], od = Math.round((12.6 + (100 - o.r) * .05 + U.rf(-.4, .4)) * 100) / 100;
      const you = { rt: .5 + U.rf(-.018, .26 - dv * .009), et: et0 + gauss() * sig, dial }, opp = { name: o.n, car: o.car, rt: .5 + U.rf(-.012, .2), et: od + .02 + gauss() * .07, dial: od };
      for (const id of ['gearbox', 'clutch', 'drive']) if (nodes[id] != null && nodes[id] < 30 && U.chance(.3)) { you.dnf = D.nodes[id].n; nodes[id] = Math.max(2, nodes[id] - 15); }
      you.red = you.rt < .5; opp.red = opp.rt < .5; you.bo = you.et < dial; opp.bo = opp.et < od;
      you.mph = Math.round(234 * Math.pow(pf.hp / pf.wt, 1 / 3)); opp.mph = Math.round(1320 / od * 1.05 * .68 * 1.6);
      let win; if (you.dnf) win = false; else if (you.red !== opp.red) win = opp.red; else if (you.bo !== opp.bo) win = opp.bo; else if (you.bo && opp.bo) win = (dial - you.et) < (od - opp.et); else win = (you.rt + you.et - dial) < (opp.rt + opp.et - od);
      res.rounds.push({ you, opp, win, name: ['Четвертьфинал', 'Полуфинал', 'Финал'][i] }); alive = win;
      for (const id in nodes) nodes[id] = Math.max(3, nodes[id] - U.rf(.4, 1.6));
    }
    const n = res.rounds.filter(x => x.win).length; res.win = n === 3; res.place = res.win ? 1 : n === 2 ? 2 : n === 1 ? 3 : 5;
    res.prize = Math.round([0, 40, 90, 240][n] * px); res.nodes = nodes; res.start = {}; for (const id in nodes) res.start[id] = car.nodes[id].t; res.used = {};
    res.text = res.win ? 'Победа в брекетах!' : n ? 'Вылет: ' + res.rounds[n].name.toLowerCase() : 'Вылет в первом же заезде';
    res.field = RC.fillField(res.place, opps.slice(0, 7)); res.pts = res.field.find(x => x.you).pts; return res;
  };
  RC.autox = function (race, car, p) {
    const dv = p.skills.drive, px = G().px(), sq = RC.sq(race.setup, race.opt, ['susp', 'tyre']), t0 = RC.lapTime(race, car, p, sq), res = { type: 'autox', track: race.track, runs: [] }, nodes = {};
    for (const id of ['wheels', 'brakes', 'fsusp', 'rsusp', 'steer']) if (car.nodes[id] && !car.nodes[id].gone) nodes[id] = car.nodes[id].t;
    for (let i = 0; i < 3; i++) { const cones = (U.chance(.3 - dv * .012) ? 1 : 0) + (U.chance(.08) ? 1 : 0), t = t0 + gauss() * (1.3 - dv * .04) - i * .4; res.runs.push({ t, cones, tot: t + cones * 2 }); for (const id in nodes) nodes[id] = Math.max(3, nodes[id] - U.rf(.2, .9)); }
    res.best = Math.min(...res.runs.map(x => x.tot)); const season = RC.champ().season;
    const f = D.rivals.map(r => ({ n: r.n, drv: r.d, car: r.car, col: r.col, t: 54.8 + (100 - U.clamp(r.r + season * 2.5, 0, 100)) * .1 + gauss() * .9 }));
    f.push({ n: RC.TEAM, drv: p.name, car: C.short(car), col: '#ffffff', t: res.best, you: true }); f.sort((a, b) => a.t - b.t);
    res.field = f.map((x, i) => Object.assign(x, { pts: i < 10 ? RC.PTS[i] : 0 })); res.place = f.findIndex(x => x.you) + 1; res.win = res.place === 1; res.pts = res.field[res.place - 1].pts;
    res.prize = Math.round(([150, 80, 40][res.place - 1] || 0) * px); res.nodes = nodes; res.start = {}; for (const id in nodes) res.start[id] = car.nodes[id].t; res.used = {};
    res.text = res.win ? 'Лучшее время дня!' : res.place + '-е место из ' + f.length; return res;
  };
  // места соперников в брекетах: по силе с шумом
  RC.fillField = function (place, opps) {
    const order = opps.slice().sort((a, b) => (b.r + gauss() * 15) - (a.r + gauss() * 15)), field = [], you = { n: RC.TEAM, you: true, col: '#ffffff' };
    for (let i = 0, k = 0; i < 8; i++) field.push(i + 1 === place ? you : Object.assign({}, order[k++] || {}));
    return field.map((x, i) => Object.assign(x, { pts: i < 10 ? RC.PTS[i] : 0, n: x.n }));
  };

  // ---------- быстрая симуляция (бот и «досимулировать») ----------
  M.raceSim = function () {
    const S = WW.S, r = S.race, car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0];
    if (!r.practice.length) RC.autoSetup(r, car, p);
    let res;
    if (r.type === 'drag') res = RC.drag(r, car, p);
    else if (r.type === 'autox') res = RC.autox(r, car, p);
    else { const st = r.live || RC.newRace(r, car, p, true); st.auto = true; let n = 0; while (!st.over && n++ < 200000) RC.step(st, 1); res = RC.resultCircuit(r, st); r.live = null; }
    res.car = C.name(car); res.driver = p.name; r.res = res; return res;
  };
  M.raceFinish = function () {
    const S = WW.S, g = G(), r = S.race, res = r.res || M.raceSim(), car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0], ch = RC.champ();
    // очки всем участникам
    for (const f of res.field || []) if (f.pts) ch.pts[f.n] = (ch.pts[f.n] || 0) + f.pts;
    if (res.prize) g.money(res.prize, 'prize');
    let spon = 0; if (ch.sponsor) { spon = Math.round((ch.sponsor.base + (res.place <= 3 && !res.dnf ? ch.sponsor.pod : 0)) * g.px()); g.money(spon, 'prize'); }
    for (const k in res.used || {}) { ch.spares[k] = Math.max(0, (ch.spares[k] || 0) - res.used[k]); ch.load[k] = Math.min(ch.load[k] || 0, ch.spares[k]); }
    S.stats.races++; ch.starts++; P().xp(p, 'drive', 3);
    const crew = (r.entry.crew || []).map(id => P().byId(id)).filter(Boolean);
    for (const c of crew) { P().xp(c, 'chassis', 1.5); P().xp(c, 'eng', 1.5); c.raceTired = S.day + 1; }
    if (res.win) { S.stats.wins++; if (car) car.wins++; g.repAdd('q', 2); g.repAdd('s', 1); g.addMod('clients', 1.15, 3, 'Победил в субботу — продал в понедельник'); for (const x of P().staff()) P().think(x, 'win', 'Победа команды в гонке', 12, 5); if (r.type === 'junk') S.ach.junkwin = S.day; }
    else if (res.place <= 3 && !res.dnf) for (const x of P().staff()) P().think(x, 'podium', 'Команда на подиуме', 5, 3);
    // износ и отчёт: реальные узлы машины, которую готовила мастерская
    if (car) {
      car.raceStarts = (car.raceStarts || 0) + 1;
      for (const id in res.nodes || {}) { const n = car.nodes[id]; if (!n || n.gone) continue; n.t = U.clamp(res.nodes[id], 1, 100); if (n.lo > n.t) n.lo = Math.floor(n.t); if (n.hi < n.t) n.hi = Math.ceil(n.t); }
      const spec = { nodes: {} }; for (const id of RC.NODES) spec.nodes[id] = 10; C.reveal(car, spec, 12, true); C.refreshFaults(car);
      car.hist.push({ d: S.day, y: S.year, t: r.name + ': ' + res.text, by: p.name });
      const weak = RC.NODES.filter(id => car.nodes[id] && !car.nodes[id].gone && car.nodes[id].hi < 50);
      if (weak.length && !car.order && !car.sale && car.owner === 'player') { const o = O().newOwn(car); if (o) { for (const id of weak) O().addJob(o, { kind: D.nodes[id].repl ? 'replace' : 'repair', node: id, grade: 'oem' }); res.order = o.id; } }
    }
    ch.lastRes = { day: S.day, round: r.round, track: r.track, text: res.text, place: res.place, pts: res.pts, prize: res.prize, spon };
    ch.results.push(ch.lastRes); if (ch.results.length > 16) ch.results.shift();
    g.log('Этап ' + r.round + ', ' + r.name + ': ' + p.name + ' на ' + res.car + ' — ' + res.text + (res.pts ? ', +' + res.pts + ' очк.' : '') + (res.prize ? ', призовые ' + U.money(res.prize) : '') + (spon ? ', спонсор ' + U.money(spon) : '') + '.', res.win ? 'story' : 'info');
    if (res.order) g.note('Отчёт по износу после гонки превращён в наряд №' + res.order + ' на ' + C.short(car) + ': проверь и запусти.', 'info', ['order', res.order]);
    if (r.round === 8) RC.endSeason();
    // спонсоры смотрят на результаты
    const mine = ch.pts[RC.TEAM] || 0;
    ch.offers = D.sponsors.filter(sp => (!ch.sponsor || sp.base > ch.sponsor.base) && (!sp.need.starts || ch.starts >= sp.need.starts) && (!sp.need.pts || mine >= sp.need.pts) && (!sp.need.wins || S.stats.wins >= sp.need.wins) && (!sp.need.rep || g.rep() >= sp.need.rep)).map(sp => sp.id);
    if (ch.offers.length) g.toast('Спонсоры заинтересовались командой — загляни в «Гонки».', 'good', ['panel', 'race']);
    r.done = true; r.live = null; g.endDay2();
  };
  // итоги сезона: место в серии и призовой фонд (один раз за сезон, даже если финал пропущен)
  RC.endSeason = function () {
    const S = WW.S, ch = RC.champ(), g = G(); ch.closed = ch.closed || {};
    if (ch.closed[ch.season] || !Object.keys(ch.pts).length) return; ch.closed[ch.season] = 1;
    const tb = RC.table(), pos = tb.findIndex(x => x.you) + 1, pz = (ch.pts[RC.TEAM] || 0) > 0 ? [1500, 800, 400][pos - 1] : 0;
    if (pz) { g.money(Math.round(pz * g.px()), 'prize'); g.repAdd('q', 4 - pos); }
    ch.history = (ch.history || []).concat({ season: ch.season, pos, pts: ch.pts[RC.TEAM] || 0, champ: tb[0].n }).slice(-10);
    g.note('Сезон клубной серии окончен. Чемпион — ' + tb[0].n + '. Pops Auto: ' + pos + '-е место (' + (ch.pts[RC.TEAM] || 0) + ' очк.)' + (pz ? '. Призовой фонд: ' + U.money(Math.round(pz * g.px())) + '!' : '.'), pos <= 3 ? 'story' : 'info');
    if (pos === 1 && pz) S.ach.champ = S.day;
  };
  RC.signSponsor = function (id) { const ch = RC.champ(), sp = D.sponsors.find(x => x.id === id); if (!sp || !ch.offers.includes(id)) return; ch.sponsor = Object.assign({ season: ch.season }, sp); ch.offers = []; G().note('Подписан спонсор: ' + sp.n + '. ' + U.money(sp.base * G().px()) + ' за старт, ' + U.money(sp.pod * G().px()) + ' за подиум. Пропуск этапа — разрыв контракта.', 'good'); };
  RC.buySpare = function (k) { const S = WW.S, ch = RC.champ(), c = Math.round(D.spares[k].price * G().px()); if (S.money < c) { G().toast('Не хватает денег.', 'bad'); return; } G().money(-c, 'raceFee'); ch.spares[k] = (ch.spares[k] || 0) + 1; };
  RC.setLoad = function (k, dv) { const ch = RC.champ(), n = U.clamp((ch.load[k] || 0) + dv, 0, ch.spares[k] || 0), nl = Object.assign({}, ch.load, { [k]: n }); if (RC.loadSize(nl) > RC.cap()) { G().toast('Трейлер забит: ' + RC.cap() + ' места.' + (WW.S.upg.trailer ? '' : ' Без прицепа-платформы всё едет в багажнике — 4 места.'), 'bad'); return; } ch.load = nl; };
  RC.prepOrder = function (car, race) {
    if (!car || car.owner !== 'player') return null; if (car.order) return WW.S.orders[car.order] || null; if (car.sale) { G().toast('Сначала сними машину с продажи.', 'bad'); return null; }
    const o = O().newOwn(car); if (!o) return null;
    if (race && (race.type === 'circuit' || race.type === 'junk') && !car.mods.includes('cage')) O().addJob(o, { kind: 'tune', key: 'cage' });
    for (const id of RC.NODES) { const n = car.nodes[id]; if (n && !n.gone && n.hi < 55) O().addJob(o, { kind: D.nodes[id].repl ? 'replace' : 'repair', node: id, grade: 'oem' }); }
    return o;
  };

  // =====================================================================
  // интерфейс
  // =====================================================================
  if (!WW.UI || !WW.MOD) return;
  const UI = WW.UI, MOD = WW.MOD, A = UI.act, V = UI.views, R = WW.R, $ = id => document.getElementById(id), h = U.esc, $m = U.money;
  const tip = t => ' data-tip="' + h(t) + '"';
  const btn = (label, a, data, cls, dis) => `<button class="btn ${cls || ''}" data-a="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${h(v)}"`).join(' ')} ${dis ? 'disabled' + tip(dis === true ? '' : dis) : ''}>${label}</button>`;
  const icon = { drag: '🏁', autox: '🔶', circuit: '🔁', junk: '🌙' };
  const fmtT = s => s == null ? '—' : (s >= 60 ? Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0') : s.toFixed(2));

  // ---------- панель «Гонки» ----------
  V.race = function () {
    const S = WW.S, ch = RC.champ(), r = S.race, G0 = G(); if (!r) M.mkRace();
    const race = S.race, T = D.tracks[race.track], own = Object.values(S.cars).filter(c => c.owner === 'player' && c.lot);
    let carId = UI.sub.rcar && S.cars[UI.sub.rcar] && S.cars[UI.sub.rcar].owner === 'player' ? UI.sub.rcar : (S.raceCar && S.cars[S.raceCar] && S.cars[S.raceCar].owner === 'player' ? S.raceCar : (own[0] || {}).id);
    const car = S.cars[carId], dl = race.day - S.day;
    let s = `<div class="card" style="border-color:var(--acc)"><div class="row"><b style="font-size:15px">🏆 Клубная серия Rust Belt · сезон ${S.year}</b><span class="mut sm">8 этапов по субботам, очки ${RC.PTS.slice(0, 5).join('-')}…, финал Junkyard 24 — очки ×2. Призовой фонд серии: ${$m(1500 * G0.px())} / ${$m(800 * G0.px())} / ${$m(400 * G0.px())}.</span></div><div class="cal">`;
    RC.CAL.forEach((tk, i) => { const t = D.tracks[tk], done = ch.results.find(x => x.round === i + 1 && RC.seasonOf(x.day) === ch.season); s += `<div class="calc ${i + 1 === race.round ? 'on' : ''} ${done ? 'dn' : ''}"${tip(t.n + '\n' + t.d)}><b>${i + 1}</b> ${icon[t.type]}<div class="sm">${h(t.n.split('«')[1] ? t.n.split('«')[1].replace('»', '') : t.n)}</div>${done ? `<div class="sm ${done.place <= 3 ? 'good' : 'mut'}">${done.place}-е · +${done.pts}</div>` : ''}</div>`; });
    s += '</div></div>';
    // ближайший этап
    const chk = RC.check(car, race), allOk = chk.every(x => x.ok), entered = race.entry;
    s += `<div class="grid2" style="margin-top:8px"><div class="card"><div class="row"><span style="font-size:22px">${icon[race.type]}</span><div><b>Этап ${race.round}: ${h(race.name)}</b><div class="sm mut">${dl === 0 ? 'сегодня вечером' : dl === 1 ? 'завтра' : 'в субботу, через ' + dl + ' дн.'} · взнос ${$m(race.fee)}${T.laps ? ' · ' + T.laps + ' кругов' : ''}</div></div></div><p class="sm">${h(T.d)}</p>`;
    s += '<div class="col sm">' + chk.map(x => `<div class="${x.ok ? 'good' : 'bad'}">${x.ok ? '✔' : '✖'} ${h(x.t)}</div>`).join('') + '</div>';
    if (entered) { const ec = S.cars[entered.car], ep = P().byId(entered.p); s += `<div class="good" style="margin-top:6px">Заявлены: ${ec ? h(C.name(ec)) : '—'}, пилот ${ep ? h(ep.name) : '—'}. Трейлер: ${RC.loadSize(entered.load)}/${RC.cap()} мест.</div>`; }
    else {
      const drv = S.pawns.filter(p => p.state !== 'absent').sort((a, b) => b.skills.drive - a.skills.drive);
      s += `<div class="row" style="margin-top:8px">Пилот: <select id="rdrv">${drv.map(p => `<option value="${p.id}">${h(p.name)} · вождение ${p.skills.drive}</option>`).join('')}</select>${btn('Заявиться — ' + $m(race.fee), 'raceEnter', { id: carId || 0 }, 'pri', !car ? 'Нет своей машины' : !allOk ? 'Не пройден техком — см. список выше' : null)}</div>`;
    }
    s += '</div>';
    // машина
    s += '<div class="card"><b>Гоночная машина</b>';
    if (!own.length) s += '<p class="mut sm">Нужна своя машина — купи на рынке или выкупи у клиента.</p>';
    else {
      const pf = C.perf(car), dr = P().byId((entered || {}).p) || S.pawns.slice().sort((a, b) => b.skills.drive - a.skills.drive)[0], keys = RC.keys(race.type), est = RC.lapTime(race, car, dr, .75);
      s += ` <select data-c="rcar">${own.map(c => `<option value="${c.id}" ${c.id === carId ? 'selected' : ''}>${h(C.name(c))}</option>`).join('')}</select>`;
      s += `<div class="row sm" style="margin-top:6px"><span class="pill">${pf.hp} л.с.</span><span class="pill">${pf.wt} фунтов</span><span class="pill">сцепление ${Math.round(pf.grip * 100)}%</span><span class="pill">стабильность ${Math.round(pf.stab * 100)}%</span><span class="pill b"${tip('Оценка при хорошем сетапе. Для сравнения: средний соперник в этом сезоне ≈ ' + fmtT(race.type === 'drag' ? 14.6 : race.type === 'autox' ? 61 : T.base * RC.rivalF({ r: 52 }, ch.season)))}>${race.type === 'drag' ? '¼ мили ≈ ' : race.type === 'autox' ? 'попытка ≈ ' : 'круг ≈ '}${fmtT(est)}</span>${car.mods.map(t => `<span class="pill y">⚙ ${h(D.tune[t].n.split(':')[0])}</span>`).join('')}</div>`;
      s += '<div class="sm" style="margin-top:6px"><b>Надёжность узлов</b> <span class="mut">— на гонке ломается то, что реально установлено</span></div><div class="rnodes" style="margin-top:3px">';
      for (const id of RC.NODES) { const n = car.nodes[id]; if (!n) continue; const mid = (n.lo + n.hi) / 2, fog = n.hi - n.lo; s += `<div class="rn sm"><span>${h(D.nodes[id].n)}</span><div class="bar"><i style="left:0;width:${n.gone ? 0 : n.lo}%;background:${D.condOf(mid).c}"></i><i class="fog" style="left:${n.lo}%;width:${n.gone ? 0 : fog}%"></i></div><span class="${n.hi < 50 ? 'bad' : 'mut'}">${n.gone ? 'снят' : fog > 60 ? '?' : n.lo + '–' + n.hi + '%'}</span></div>`; }
      s += `</div><div class="row" style="margin-top:6px">${car.order ? btn('Наряд №' + car.order, 'go', { k: 'order', id: car.order }) : btn('Наряд на подготовку', 'racePrep', { id: car.id }, '', car.sale ? 'Машина на продаже' : null).replace('<button', '<button' + tip('Откроет наряд на машину: «Гоночная подготовка», если техком требует, и замена узлов, которые известны как слабые (ниже 55%). Сначала осмотри машину — о неизвестных узлах ничего не скажешь.'))}</div>`;
    }
    s += '</div></div>';
    // команда и трейлер
    const ld = ch.load, used = RC.loadSize(ld), cap = RC.cap();
    s += `<div class="grid2" style="margin-top:8px"><div class="card"><b>Пит-крю</b> <span class="mut sm">до 2 человек: скорость пит-стопа и ремонта = их «Ходовая» и «Двигатель». Назавтра они придут позже.</span><div class="row" style="margin-top:6px">${S.pawns.map(p => `<label class="pill ${ch.crew.includes(p.id) ? 'y' : ''}" style="cursor:pointer"><input type="checkbox" data-c="crew" data-id="${p.id}" ${ch.crew.includes(p.id) ? 'checked' : ''}> ${h(p.name.split(' ')[0])} · ${Math.round((p.skills.chassis + p.skills.eng) / 2)}</label>`).join('')}</div>`;
    const cs = ch.crew.map(id => P().byId(id)).filter(Boolean), csk = cs.length ? Math.max(...cs.map(c => (c.skills.chassis + c.skills.eng) / 2)) : 3, ck = U.clamp(1.55 - csk * .04 - (cs.length > 1 ? .08 : 0), .7, 1.6);
    s += `<div class="sm" style="margin-top:6px">Пит-стоп «шины + бензин» ≈ <b>${Math.round((16 + 13 + 5) * ck)} с</b>${cs.length ? '' : ' <span class="bad">— без пит-крю пилот всё делает сам</span>'}</div></div>`;
    s += `<div class="card"><div class="row"><b>Трейлер</b><span class="mut sm">${S.upg.trailer ? 'прицеп-платформа' : 'багажник — купи прицеп в «Стройке»'}</span><span style="flex:1"></span><span class="${used > cap ? 'bad' : ''}">${used}/${cap} мест</span></div><div class="pbar" style="margin:4px 0"><i style="width:${Math.min(100, used / cap * 100)}%"></i></div><table class="sm">`;
    for (const k in D.spares) { const sp = D.spares[k]; s += `<tr${tip(sp.d)}><td>${sp.i} ${h(sp.n)}</td><td class="mut">${sp.size} м.</td><td>есть ${ch.spares[k] || 0}</td><td>${btn('−', 'rload', { k, v: -1 }, 'sm', !(ld[k] > 0))}<b style="display:inline-block;width:18px;text-align:center">${ld[k] || 0}</b>${btn('+', 'rload', { k, v: 1 }, 'sm', (ld[k] || 0) >= (ch.spares[k] || 0) ? 'Сначала купи' : null)}</td><td class="r">${btn('Купить ' + $m(sp.price * G0.px()), 'rbuy', { k }, 'sm')}</td></tr>`; }
    s += '</table><div class="sm mut">Неиспользованное возвращается на гоночный склад.</div></div></div>';
    // спонсоры и таблица
    s += `<div class="grid2" style="margin-top:8px"><div class="card"><b>Спонсор</b> ${ch.sponsor ? `<span class="pill g">${h(ch.sponsor.n)}</span><div class="sm">${$m(ch.sponsor.base * G0.px())} за старт · ${$m(ch.sponsor.pod * G0.px())} за подиум · пропуск этапа — разрыв</div>` : '<span class="mut sm">пока никого</span>'}`;
    for (const id of ch.offers) { const sp = D.sponsors.find(x => x.id === id); s += `<div class="row card" style="margin-top:6px;padding:5px 8px"><div style="flex:1"><b>${h(sp.n)}</b><div class="sm mut">${h(sp.d)} ${$m(sp.base * G0.px())} за старт, ${$m(sp.pod * G0.px())} за подиум.</div></div>${btn('Подписать', 'rsign', { id }, 'pri')}</div>`; }
    if (!ch.sponsor && !ch.offers.length) s += '<div class="sm mut" style="margin-top:4px">Спонсоры появятся, когда команда начнёт выходить на старт и набирать очки.</div>';
    s += `</div><div class="card"><b>Таблица серии</b><table class="sm" style="margin-top:4px">${RC.table().map((t, i) => `<tr class="${t.you ? 'acc b' : ''}"><td>${i + 1}</td><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${t.col};margin-right:5px"></span>${h(t.n)}</td><td class="r">${t.pts}</td></tr>`).join('')}</table></div></div>`;
    if (ch.lastRes) s += `<div class="sm mut" style="margin-top:6px">Прошлый этап: ${h(D.tracks[ch.lastRes.track].n)} — ${h(ch.lastRes.text)}${ch.lastRes.pts ? ', +' + ch.lastRes.pts + ' очк.' : ''}.</div>`;
    return s;
  };
  A.rcar = (d, el) => { UI.sub.rcar = +el.value; };
  A.raceEnter = d => { const dv = $('rdrv'); M.raceEnter(+d.id, dv ? +dv.value : WW.S.pawns[0].id); };
  A.racePrep = d => { const c = WW.S.cars[+d.id], o = RC.prepOrder(c, WW.S.race); if (o) UI.open('order', o.id); };
  A.crew = (d, el) => { const ch = RC.champ(), id = +d.id; ch.crew = ch.crew.filter(x => x !== id); if (el.checked) { if (ch.crew.length >= 2) { G().toast('В пит-крю максимум двое.', 'bad'); return; } ch.crew.push(id); } };
  A.rload = d => RC.setLoad(d.k, +d.v); A.rbuy = d => RC.buySpare(d.k); A.rsign = d => RC.signSponsor(d.id);

  // ---------- гоночный вечер: тренировки и сетап ----------
  MOD.race = function () {
    const S = WW.S, r = S.race; if (!r || !r.entry) { G().endDay2(); return; }
    UI.close(); const car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0], keys = RC.keys(r.type), T = D.tracks[r.track];
    if (r.res) { MOD.raceResult(); return; }
    const draw = () => {
      const last = r.practice[r.practice.length - 1];
      let s = `<div class="row"><h2 style="flex:1">${icon[r.type]} Этап ${r.round}: ${h(r.name)}</h2><span class="pill">${h(C.short(car))} · ${h(p.name)}</span><span class="pill">${D.weather[S.weather].i} ${D.weather[S.weather].n}</span></div>`;
      s += `<p class="sm mut">Тренировка. У каждой трассы свой оптимальный сетап, его никто не знает. После заезда пилот скажет, что ему не нравится. Точность его слов — от «Вождения» (${p.skills.drive}) и опыта на этой машине: ${Math.round(U.clamp(.58 + p.skills.drive * .016 + Math.min(.1, (car.raceStarts || 0) * .03), .5, .97) * 100)}%.</p><div class="col">`;
      for (const k of keys) { const kk = RC.KEYS[k], fb = last && last.fb[k]; s += `<div class="row"><b style="width:120px">${kk[0]}</b><span class="mut sm" style="width:130px;text-align:right">${kk[1]}</span><input type="range" min="0" max="100" value="${r.setup[k]}" data-i="rset" data-k="${k}" style="width:260px"><span class="mut sm" style="width:150px">${kk[2]}</span>${fb ? `<span class="pill ${fb.dir === 0 ? 'g' : 'y'}">«${fb.dir === 0 ? 'в самый раз' : (fb.big ? 'сильно ' : '') + kk[fb.dir < 0 ? 3 : 4]}»</span>` : ''}</div>`; }
      s += '</div>';
      if (r.practice.length) s += `<table class="sm" style="margin-top:8px"><tr><th>Заезд</th>${keys.map(k => `<th>${RC.KEYS[k][0]}</th>`).join('')}<th class="r">Время</th></tr>${r.practice.map((x, i) => `<tr><td>${i + 1}</td>${keys.map(k => `<td>${x.set[k]} → «${x.fb[k].dir === 0 ? 'ок' : (x.fb[k].big ? 'сильно ' : '') + RC.KEYS[k][x.fb[k].dir < 0 ? 3 : 4]}»</td>`).join('')}<td class="r b">${fmtT(x.time)}</td></tr>`).join('')}</table>`;
      if (r.type === 'drag') s += `<div class="row" style="margin-top:8px"${tip('Dial-in — твой прогноз времени. Приехал быстрее прогноза — «брейкаут», проигрыш. Медленнее — соперник с более точным прогнозом выиграет.')}><b>Dial-in:</b><input type="number" id="rdial" step="0.01" value="${(r.entry.dial || (last ? last.time + .04 : RC.lapTime(r, car, p, .7) + .05)).toFixed(2)}" style="width:90px"> с <span class="mut sm">последняя тренировка: ${last ? fmtT(last.time) : '—'}</span></div>`;
      s += `<div class="row" style="margin-top:12px">${btn('Тренировочный заезд (' + (3 - r.practice.length) + ' осталось)', 'rprac', {}, '', r.practice.length >= 3 ? 'Тренировки закончились' : null)}<span style="flex:1"></span>${btn('На старт →', 'rgo', {}, 'pri')}</div>`;
      MOD.show(s, 'mwide', 'race');
    };
    A.rset = (d, el) => { r.setup[d.k] = +el.value; WW.S.setup[d.k] = +el.value; };
    A.rprac = () => { if (r.practice.length >= 3) return; RC.practice(r, car, p); WW.A.play('engine'); draw(); };
    A.rgo = () => { const dl = $('rdial'); if (dl) r.entry.dial = Math.max(5, +dl.value || 0); MOD.raceStart(); };
    draw();
  };
  MOD.raceStart = function () {
    const S = WW.S, r = S.race, car = S.cars[r.entry.car], p = P().byId(r.entry.p) || S.pawns[0];
    if (r.type === 'drag') { r.res = RC.drag(r, car, p); r.res.car = C.name(car); r.res.driver = p.name; return MOD.dragShow(); }
    if (r.type === 'autox') { r.res = RC.autox(r, car, p); r.res.car = C.name(car); r.res.driver = p.name; return MOD.autoxShow(); }
    r.live = RC.newRace(r, car, p, true); MOD.liveRace();
  };
  const finRow = () => btn('Итоги этапа →', 'rresult', {}, 'pri');
  A.rresult = () => MOD.raceResult();

  // ---------- трасса: сплайн, точки по длине ----------
  const paths = {};
  RC.path = function (tk) {
    if (paths[tk]) return paths[tk]; let T = D.tracks[tk]; if (typeof T.path === 'string') T = D.tracks[T.path];
    const pts = T.path, closed = T.type !== 'autox', out = [], n = 16, Pt = i => pts[(i + pts.length) % pts.length], L = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < L; i++) { const p0 = closed ? Pt(i - 1) : pts[Math.max(0, i - 1)], p1 = Pt(i), p2 = closed ? Pt(i + 1) : pts[Math.min(pts.length - 1, i + 1)], p3 = closed ? Pt(i + 2) : pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3); out.push([f(0), f(1)]); } }
    if (closed) out.push(out[0].slice()); else out.push(pts[pts.length - 1].slice());
    const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + U.dist(out[i][0], out[i][1], out[i - 1][0], out[i - 1][1]));
    const len = cum[cum.length - 1];
    const at = f => { f = ((f % 1) + 1) % 1; const tg = f * len; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= tg) lo = m; else hi = m; } const a = out[lo], b = out[hi], k = (tg - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
    return (paths[tk] = { pts: out, len, at, closed });
  };
  // боксы — внутри кольца, у линии старта
  RC.pitPos = function (tk) { const pa = RC.path(tk), a = pa.at(.03); let cx = 0, cy = 0; for (const p of pa.pts) { cx += p[0]; cy += p[1]; } cx /= pa.pts.length; cy /= pa.pts.length; const dx = cx - a[0], dy = cy - a[1], d = Math.hypot(dx, dy) || 1; return [a[0] + dx / d * 11, a[1] + dy / d * 11]; };
  function drawTrack(c, w, hgt, tk, night) {
    const pa = RC.path(tk), s = Math.min(w / 100, hgt / 70), ox = (w - 100 * s) / 2, oy = (hgt - 70 * s) / 2, X = p => [ox + p[0] * s, oy + p[1] * s];
    c.fillStyle = night ? '#1b2219' : '#3d4a36'; c.fillRect(0, 0, w, hgt);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const line = (wd, col, dash) => { c.strokeStyle = col; c.lineWidth = wd * s; c.setLineDash(dash || []); c.beginPath(); pa.pts.forEach((p, i) => { const q = X(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); c.setLineDash([]); };
    line(7.8, '#f2f2f2'); line(7.8, '#b8392e', [1.4 * s, 1.4 * s]); line(6.6, '#3E4043'); line(.15, 'rgba(255,255,255,.18)', [2 * s, 2 * s]);
    if (pa.closed) { const a = pa.at(0), q = X(a); c.save(); c.translate(q[0], q[1]); c.rotate(a[2] + Math.PI / 2); for (let i = -3; i < 3; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#111'; c.fillRect(i * s * 1.1, -s * 1.1 + j * s * 1.1, s * 1.1, s * 1.1); } c.restore();
      const pp = RC.pitPos(tk), qb = X(pp); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(qb[0] - 10 * s, qb[1] - 2.4 * s, 20 * s, 4.8 * s); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(qb[0] - 10 * s, qb[1] - 2.4 * s, 20 * s, 4.8 * s); c.fillStyle = 'rgba(255,255,255,.45)'; c.font = (2 * s) + 'px system-ui'; c.textAlign = 'center'; c.fillText('ПИТ-ЛЕЙН', qb[0], qb[1] - 3.2 * s); }
    return { X, s, pa };
  }

  // ---------- живой заезд ----------
  MOD.liveRace = function () {
    const S = WW.S, r = S.race, st = r.live, T = D.tracks[r.track]; let speed = st.junk ? 32 : 8, done = false;
    st.auto = UI.sub.rauto !== false;
    const you = st.cars.find(c => c.you);
    MOD.show(`<div class="row"><h2 style="flex:1">${icon[r.type]} ${h(r.name)}</h2><span class="pill" id="rlap"></span></div>
      <div class="rgrid"><canvas id="trk" width="900" height="610"></canvas><div class="tower" id="tower"></div></div>
      <div class="row" style="margin-top:8px"><span class="mut sm">Режим:</span>${Object.keys(RC.MODE).map(k => `<button class="btn sm" data-a="rmode" data-k="${k}" id="rm_${k}"${tip(k === 'save' ? 'Медленнее на 2.5%, шины ×0.7, бензин ×0.86, поломки ×0.5' : k === 'attack' ? 'Быстрее на 2.2%, шины ×1.45, бензин ×1.14, поломки ×1.7, риск разворота' : 'Обычный темп')}>${RC.MODE[k].n}</button>`).join('')}
      <span style="width:10px"></span><label class="sm"><input type="checkbox" id="pt" checked> шины</label><label class="sm"><input type="checkbox" id="pf" checked> бензин</label><label class="sm"><input type="checkbox" id="px" checked> ремонт</label>${btn('🔧 В боксы на этом круге', 'rpit', {}, '')}
      <label class="sm"${tip('Пит-стопы по шинам, бензину и поломкам решает шеф-механик. Сними галочку, чтобы решать самому.')}><input type="checkbox" id="rauto" ${st.auto ? 'checked' : ''} data-c="rauto"> стратегия — шеф-механик</label>
      <span style="flex:1"></span>${[4, 8, 16, 32].map(v => `<button class="btn sm" data-a="rspd" data-v="${v}" id="rs_${v}">×${v}</button>`).join('')}${btn('⏭ До финиша', 'rskip', {}, 'sm')}</div>
      <div class="row sm" id="rme" style="margin-top:6px"></div><div class="bids" id="rlog" style="height:110px;margin-top:6px"></div><div id="rend"></div>`, 'mwide', 'race');
    const cv = $('trk'), c = cv.getContext('2d');
    A.rmode = d => { you.mode = d.k; };
    A.rpit = () => { you.pitReq = { tires: $('pt').checked, fuel: $('pf').checked, fix: $('px').checked }; WW.A.play('ping'); };
    A.rauto = (d, el) => { st.auto = el.checked; UI.sub.rauto = el.checked; };
    A.rspd = d => { speed = +d.v; };
    A.rskip = () => { st.auto = true; let n = 0; while (!st.over && n++ < 200000) RC.step(st, 1); };
    let shownLog = 0, last = performance.now(), tw = 0;
    const loop = () => {
      if (done) return; const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
      let left = dt * speed; while (left > 0 && !st.over) { const d = Math.min(1, left); RC.step(st, d); left -= d; }
      const night = st.junk && you.lap >= st.laps * .45 && you.lap < st.laps * .72, g = drawTrack(c, cv.width, cv.height, r.track, night), ord = RC.order(st);
      // машины
      const pitN = {};
      for (const k of st.cars.slice().reverse()) {
        if (k.dnf && !k.you) continue; let x, y, a;
        if (k.inPit > 0 || (k.dnf && k.you)) { const q = g.X(RC.pitPos(r.track)), n = pitN.n = (pitN.n || 0) + 1; x = q[0] - 9 * g.s + n * 3 * g.s; y = q[1]; a = 0; }
        else { const p = g.pa.at(Math.max(0, k.d) % 1), q = g.X(p); x = q[0]; y = q[1]; a = p[2]; }
        c.save(); c.translate(x, y); c.rotate(a); const L = 2.6 * g.s, W = 1.3 * g.s; c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-L / 2 + 2, -W / 2 + 2, L, W); c.fillStyle = k.col; c.fillRect(-L / 2, -W / 2, L, W); if (k.you) { c.strokeStyle = '#E3B23C'; c.lineWidth = 3; c.strokeRect(-L / 2 - 2, -W / 2 - 2, L + 4, W + 4); } c.fillStyle = '#1d2a33'; c.fillRect(-W * .2, -W * .35, W * .6, W * .7);
        if (night) { c.fillStyle = 'rgba(255,240,180,.25)'; c.beginPath(); c.moveTo(L / 2, -W / 2); c.lineTo(L / 2 + 6 * g.s, -W * 1.6); c.lineTo(L / 2 + 6 * g.s, W * 1.6); c.lineTo(L / 2, W / 2); c.fill(); }
        if (k.issues && k.issues.length) { c.fillStyle = 'rgba(240,240,240,.6)'; c.beginPath(); c.arc(-L / 2 - 4, 0, 4 + (now / 80 % 5), 0, 7); c.fill(); }
        c.restore();
        if (k.you) { c.fillStyle = '#E3B23C'; c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillText('POPS', x, y - 12); }
      }
      if (night) { c.fillStyle = 'rgba(10,15,35,.35)'; c.fillRect(0, 0, cv.width, cv.height); }
      if (now - tw > 250 || st.over) {
        tw = now; const lead = ord[0];
        $('rlap').textContent = 'Круг ' + Math.min(st.laps, Math.max(0, lead.lap + (lead.fin == null ? 1 : 0))) + ' / ' + st.laps + (night ? ' · ночь' : '');
        $('tower').innerHTML = ord.map((k, i) => { const gap = i === 0 ? (k.fin != null ? 'финиш' : 'лидер') : k.dnf ? 'сход' : k.fin != null ? '+' + fmtT(k.fin - lead.fin) : (lead.d - k.d >= 1 ? '+' + Math.floor(lead.d - k.d) + ' кр.' : '+' + ((lead.d - k.d) * k.cur).toFixed(1)); return `<div class="trow ${k.you ? 'you' : ''} ${k.dnf ? 'out' : ''}"><b>${i + 1}</b><i style="background:${k.col}"></i><span>${h(k.n)}</span><span class="mut">${gap}</span><span class="tb"><u style="width:${k.tire}%"></u></span>${k.inPit > 0 ? '<span class="pill y">ПИТ</span>' : ''}</div>`; }).join('');
        const pos = ord.indexOf(you) + 1; for (const k in RC.MODE) { const b = $('rm_' + k); if (b) b.classList.toggle('on', you.mode === k); } for (const v of [4, 8, 16, 32]) { const b = $('rs_' + v); if (b) b.classList.toggle('on', speed === v); }
        $('rme').innerHTML = `<b>P${pos}</b><span class="pill">круг ${you.lap}/${st.laps}</span><span class="pill">последний ${fmtT(you.last || null)}</span><span class="pill">лучший ${fmtT(you.best < 1e8 ? you.best : null)}</span><span class="pill ${you.tire < 30 ? 'r' : ''}">шины ${Math.round(you.tire)}%</span><span class="pill ${you.fuel < 15 ? 'r' : ''}">бензин ${Math.round(you.fuel)}% (~${Math.floor(you.fuel / (100 / RC.TANK * RC.MODE[you.mode].fuel))} кр.)</span>${you.issues.map(i => `<span class="pill r">${h(D.nodes[i.node].n)}${RC.canFix(st, i) ? ' · есть запчасть' : ''}</span>`).join('')}${you.pitReq ? '<span class="pill y">в боксы на этом круге</span>' : ''}<span class="mut">трейлер: ${Object.keys(st.load).filter(k => st.load[k] > 0).map(k => D.spares[k].i + '×' + st.load[k]).join(' ') || 'пусто'}</span>`;
        if (st.log.length > shownLog) { const el = $('rlog'); for (; shownLog < st.log.length; shownLog++) { const l = st.log[shownLog]; el.insertAdjacentHTML('beforeend', `<div class="${l.k}">круг ${l.lap}: ${h(l.x)}</div>`); if (l.k === 'bad') WW.A.play('bad'); } el.scrollTop = 9999; }
        if (st.over && !$('rend').innerHTML) { $('rend').innerHTML = `<div class="row" style="margin-top:8px"><span class="big ${you.dnf ? 'bad' : 'good'}">${you.dnf ? 'Сход: ' + h(you.dnf) : 'Финиш: P' + pos}</span><span style="flex:1"></span>${finRow()}</div>`; WW.A.play(you.dnf ? 'bad' : pos <= 3 ? 'win' : 'done'); }
      }
      if (st.over && now - tw > 300) { /* финальный кадр уже нарисован */ }
    };
    MOD.timers.push(setInterval(loop, 33));
    A.rresult = () => { done = true; r.res = RC.resultCircuit(r, st); r.res.car = C.name(S.cars[r.entry.car]); r.res.driver = (P().byId(r.entry.p) || S.pawns[0]).name; r.live = null; MOD.raceResult(); };
  };

  // ---------- автокросс: попытки на схеме с конусами ----------
  MOD.autoxShow = function () {
    const S = WW.S, r = S.race, res = r.res;
    MOD.show(`<h2>${icon.autox} ${h(r.name)}</h2><p class="mut sm">${h(res.car)} · пилот ${h(res.driver)}. Три попытки, в зачёт лучшая. Сбитый конус: +2 секунды.</p><div class="rgrid"><canvas id="trk" width="900" height="560"></canvas><div class="tower" id="tower"></div></div><div id="rend"></div>`, 'mwide', 'race');
    const cv = $('trk'), c = cv.getContext('2d'), pa = RC.path('mall'); let run = 0, t0 = performance.now(), done = false; const rows = [];
    const cones = []; for (let i = 1; i < 30; i++) { const p = pa.at(i / 30), side = i % 2 ? 1 : -1; cones.push([p[0] - Math.sin(p[2]) * 4.2 * side, p[1] + Math.cos(p[2]) * 4.2 * side]); }
    const loop = () => {
      if (done) return; const g = drawTrack(c, cv.width, cv.height, 'mall', false), x = res.runs[run], dur = x.t * .055, k = Math.min(1, (performance.now() - t0) / 1000 / dur);
      const hit = new Set(); if (x.cones) for (let j = 0; j < x.cones; j++) hit.add(7 + j * 11 + run * 3);
      cones.forEach((q, i) => { const p = g.X(q), down = hit.has(i) && k * 30 > i; c.fillStyle = down ? '#E53935' : '#f08a24'; c.beginPath(); if (down) { c.ellipse(p[0], p[1], 7, 4, .7, 0, 7); } else { c.moveTo(p[0], p[1] - 7); c.lineTo(p[0] + 5, p[1] + 5); c.lineTo(p[0] - 5, p[1] + 5); } c.fill(); });
      const p = pa.at(Math.min(.999, k * (2 - k) * .5 + k * .5)), q = g.X(p); c.save(); c.translate(q[0], q[1]); c.rotate(p[2]); c.fillStyle = '#fff'; c.fillRect(-14, -7, 28, 14); c.strokeStyle = '#E3B23C'; c.lineWidth = 3; c.strokeRect(-16, -9, 32, 18); c.restore();
      c.fillStyle = '#fff'; c.font = 'bold 22px system-ui'; c.textAlign = 'left'; c.fillText('Попытка ' + (run + 1) + ': ' + (k * x.t).toFixed(2) + ' с', 20, 34);
      if (k >= 1) { rows.push(x); WW.A.play(x.cones ? 'bad' : 'done'); $('tower').innerHTML = '<div class="trow"><b>#</b><span>время</span><span>конусы</span><span>в зачёт</span></div>' + rows.map((y, i) => `<div class="trow ${y.tot === res.best && rows.length === 3 ? 'you' : ''}"><b>${i + 1}</b><span>${y.t.toFixed(3)}</span><span class="${y.cones ? 'bad' : ''}">${y.cones || '—'}</span><span>${y.tot.toFixed(3)}</span></div>`).join(''); run++; t0 = performance.now() + 600; if (run >= 3) { done = true; $('rend').innerHTML = `<div class="row" style="margin-top:8px"><span class="big">${h(res.text)}</span><span style="flex:1"></span>${finRow()}</div>`; WW.A.play(res.win ? 'win' : 'ping'); } }
    };
    MOD.timers.push(setInterval(() => { if (performance.now() >= t0) loop(); }, 33));
  };

  // ---------- дрэг: светофорное дерево и тайм-слип ----------
  MOD.dragShow = function () {
    const S = WW.S, r = S.race, res = r.res; let ri = 0;
    const play = () => {
      const rd = res.rounds[ri], you = rd.you, opp = rd.opp;
      MOD.show(`<h2>${icon.drag} ${h(r.name)} · ${rd.name}</h2><div class="row sm"><span class="pill b">Ты: ${h(res.car)} — ${h(res.driver)}, dial-in ${you.dial.toFixed(2)}</span><span class="pill r">${h(opp.name)}: ${h(opp.car)}, dial-in ${opp.dial.toFixed(2)}</span></div><canvas class="race" id="rcv" width="900" height="260" style="margin-top:8px"></canvas><div id="rres"></div>`, 'mwide', 'race');
      const cv = $('rcv'), c = cv.getContext('2d'), t0 = performance.now(), K = 2.6, hd = opp.dial - you.dial, sy = Math.max(0, hd) + 2.2, so = Math.max(0, -hd) + 2.2; let shown = false, lastTree = -1;
      const frame = () => {
        if (shown) return; const t = (performance.now() - t0) / 1000 * K; c.fillStyle = '#22252a'; c.fillRect(0, 0, 900, 260); c.fillStyle = '#34383d'; c.fillRect(0, 50, 900, 160);
        c.strokeStyle = '#E8D36A'; c.setLineDash([18, 14]); c.beginPath(); c.moveTo(0, 130); c.lineTo(900, 130); c.stroke(); c.setLineDash([]); c.fillStyle = '#fff'; c.fillRect(70, 50, 3, 160); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#111'; c.fillRect(840, 50 + i * 20, 8, 20); }
        const lane = (st0, o, y, col, isYou) => {
          const tg = t - st0, lit = tg < -1.5 ? 0 : tg < -1 ? 1 : tg < -.5 ? 2 : tg < 0 ? 3 : 4; if (isYou && lit !== lastTree) { lastTree = lit; if (lit > 0) WW.A.play(lit === 4 ? 'go' : 'tree'); }
          for (let i = 0; i < 3; i++) { c.fillStyle = lit > i && lit < 4 ? '#FBC02D' : '#3a3a30'; c.beginPath(); c.arc(40, y - 16 + i * 12, 4.5, 0, 7); c.fill(); } c.fillStyle = lit === 4 ? (o.red ? '#E53935' : '#4CAF50') : '#2a3a2a'; c.beginPath(); c.arc(40, y + 22, 5.5, 0, 7); c.fill();
          const run = tg - (o.rt - .5); let f = run <= 0 ? 0 : Math.min(1, Math.pow(run / o.et, 1.75)); if (o.dnf) f = Math.min(f, .45);
          const x = 74 + f * 770; c.save(); c.translate(x, y); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-26, -9, 54, 22); c.fillStyle = col; c.fillRect(-28, -11, 54, 22); c.fillStyle = '#1d2a33'; c.fillRect(-8, -8, 16, 16); c.restore();
          if (o.dnf && f >= .45) { c.fillStyle = 'rgba(200,200,200,.5)'; c.beginPath(); c.arc(x - 30 - (t * 20) % 30, y, 10 + (t * 9) % 12, 0, 7); c.fill(); }
          return run >= o.et;
        };
        const a = lane(sy, you, 92, '#3B82F6', true), b = lane(so, opp, 168, '#b0563c', false);
        c.fillStyle = '#fff'; c.font = '12px system-ui'; c.fillText('ТЫ', 8, 96); c.fillText('СОПЕРНИК', 8, 240);
        if ((a && b) || t > Math.max(sy, so) + Math.max(you.et, opp.et) + 1.5) {
          shown = true; WW.A.play(rd.win ? 'win' : 'bad');
          const slip = (o, me) => `<td>${me ? 'Ты' : h(opp.name)}</td><td class="r ${o.red ? 'bad' : ''}">${o.rt.toFixed(3)}${o.red ? ' фальстарт' : ''}</td><td class="r">${o.dnf ? 'сход: ' + h(o.dnf) : o.et.toFixed(3)}</td><td class="r">${o.dial.toFixed(2)}</td><td class="r ${o.bo ? 'bad' : ''}">${o.dnf ? '—' : (o.et - o.dial >= 0 ? '+' : '') + (o.et - o.dial).toFixed(3) + (o.bo ? ' брейкаут' : '')}</td><td class="r">${o.dnf ? '—' : o.mph + ' миль/ч'}</td>`;
          $('rres').innerHTML = `<table style="margin-top:8px"><tr><th>Тайм-слип</th><th class="r">Реакция</th><th class="r">Время</th><th class="r">Dial-in</th><th class="r">От прогноза</th><th class="r">Финиш</th></tr><tr>${slip(you, 1)}</tr><tr>${slip(opp, 0)}</tr></table>` + (ri < res.rounds.length - 1 ? `<div class="row" style="margin-top:10px"><span class="big good">Проходим дальше!</span><span style="flex:1"></span>${btn('Следующий заезд →', 'raceNext', {}, 'pri')}</div>` : `<div class="row" style="margin-top:10px"><span class="big ${res.win ? 'good' : ''}">${h(res.text)}</span><span style="flex:1"></span>${finRow()}</div>`);
        }
      };
      MOD.timers.push(setInterval(frame, 33));
    };
    A.raceNext = () => { ri++; play(); }; play();
  };

  // ---------- итоги этапа ----------
  MOD.raceResult = function () {
    const S = WW.S, r = S.race, res = r.res, ch = RC.champ(), px = G().px(), car = S.cars[r.entry.car];
    let s = `<div class="row"><h2 style="flex:1">Итоги: ${h(r.name)}</h2>${res.win ? '<span class="stamp">ПОБЕДА</span>' : ''}</div><div class="grid3" style="margin:8px 0"><div class="card"><div class="mut sm">Результат</div><b class="big" style="font-size:20px">${res.dnf ? 'сход' : res.place + '-е место'}</b></div><div class="card"><div class="mut sm">Очки серии</div><b class="big" style="font-size:20px">+${res.pts || 0}</b></div><div class="card"><div class="mut sm">Призовые${ch.sponsor ? ' + спонсор' : ''}</div><b class="big good" style="font-size:20px">${$m((res.prize || 0) + (ch.sponsor ? (ch.sponsor.base + (res.place <= 3 && !res.dnf ? ch.sponsor.pod : 0)) * px : 0))}</b></div></div>`;
    s += '<div class="grid2"><div><h3>Протокол</h3><table class="sm">' + (res.field || []).slice(0, 12).map((f, i) => `<tr class="${f.you ? 'acc b' : ''}"><td>${i + 1}</td><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${f.col || '#888'};margin-right:5px"></span>${h(f.n)}</td><td class="mut">${h(f.car || '')}</td><td class="r">${f.dnf ? 'сход' : f.time != null ? fmtT(f.time) : f.t != null ? f.t.toFixed(2) : ''}</td><td class="r">${f.pts ? '+' + f.pts : ''}</td></tr>`).join('') + '</table></div><div><h3>Отчёт механиков</h3>';
    const rows = []; for (const id in res.nodes || {}) { const a = res.start[id], b = res.nodes[id]; if (a - b >= 1.5) rows.push(`<tr><td>${h(D.nodes[id].n)}</td><td class="r">${Math.round(a)}% → <b class="${b < 45 ? 'bad' : ''}">${Math.round(b)}%</b></td></tr>`); }
    s += rows.length ? '<table class="sm">' + rows.join('') + '</table>' : '<p class="sm mut">Износ незаметен.</p>';
    const used = Object.keys(res.used || {}).filter(k => res.used[k]); if (used.length) s += '<div class="sm">Израсходовано из трейлера: ' + used.map(k => D.spares[k].i + ' ' + D.spares[k].n.toLowerCase() + ' ×' + res.used[k]).join(', ') + '.</div>';
    s += `<div class="sm mut" style="margin-top:4px">Узлы ниже 50% автоматически попадут в наряд на ${car ? h(C.short(car)) : 'машину'}.</div>`;
    s += '<h3>Таблица серии после этапа</h3><table class="sm">';
    const tb = RC.table().map(t => Object.assign({}, t, { pts: t.pts + ((res.field || []).find(f => f.n === t.n) || {}).pts || 0 })).sort((a, b) => b.pts - a.pts);
    s += tb.slice(0, 6).map((t, i) => `<tr class="${t.you ? 'acc b' : ''}"><td>${i + 1}</td><td>${h(t.n)}</td><td class="r">${t.pts}</td></tr>`).join('') + '</table></div></div>';
    if (res.log && res.log.length) s += '<h3>Как это было</h3><div class="bids" style="height:90px">' + res.log.slice(-14).map(l => `<div class="${l.k}">круг ${l.lap}: ${h(l.x)}</div>`).join('') + '</div>';
    s += `<div class="row" style="margin-top:12px"><span style="flex:1"></span>${btn('В мастерскую →', 'raceDone', {}, 'pri')}</div>`;
    MOD.show(s, 'mwide', 'race'); MOD.onKey = k => { if (k === 'Enter') A.raceDone(); };
  };
  A.raceDone = () => { MOD.hide(); M.raceFinish(); };
})(globalThis.WW);
