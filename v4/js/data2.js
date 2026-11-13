// WRENCHWORLD — данные v4: 30 узлов, 6 грейдов, тюнинг деталями, отношение клиентов к грейдам, отходы, жидкости, кузовные панели.
// Загружается сразу после data.js и перестраивает D.
(function (WW) {
  const D = WW.D;

  // ---------- 30 узлов ----------
  const N0 = D.nodes;
  const add = {
    intake: { n: 'Впуск', g: 'Двигатель', sk: 'eng', rep: .8, repl: 1.2, part: 95, life: 45, age: .6, w: .8, wear: 1, mat: { metal: 1, gen: 1 } },
    pads:   { n: 'Тормозные колодки', g: 'Ходовая', sk: 'chassis', rep: 0, repl: .7, part: 34, life: 95, age: .3, w: .5, wear: 1, mat: { metal: .5 } },
    discs:  { n: 'Тормозные диски', g: 'Ходовая', sk: 'chassis', rep: .6, repl: 1.1, part: 70, life: 45, age: .4, w: .6, wear: 1, rusty: 1, mat: { metal: 2 } },
    hl_fl:  { n: 'Фара передняя левая', g: 'Электрика', sk: 'elec', rep: .3, repl: .4, part: 28, life: 6, age: .7, w: .2, mat: { gen: 1 } },
    hl_fr:  { n: 'Фара передняя правая', g: 'Электрика', sk: 'elec', rep: .3, repl: .4, part: 28, life: 6, age: .7, w: .2, mat: { gen: 1 } },
    tl_rl:  { n: 'Фонарь задний левый', g: 'Электрика', sk: 'elec', rep: .3, repl: .4, part: 22, life: 5, age: .6, w: .15, mat: { gen: 1 } },
    tl_rr:  { n: 'Фонарь задний правый', g: 'Электрика', sk: 'elec', rep: .3, repl: .4, part: 22, life: 5, age: .6, w: .15, mat: { gen: 1 } }
  };
  N0.exh.n = 'Выпуск'; N0.exh.part = 110;
  N0.brakes = Object.assign(N0.brakes, { n: 'Суппорты, шланги, ГТЦ', rep: 1, repl: 1.8, part: 95, life: 30, age: .5, w: .8, wear: 0 });
  N0.wiring.n = 'Проводка, ЭБУ и приборы';
  const order = ['block', 'head', 'gasket', 'intake', 'fuel', 'ign', 'cool', 'lube', 'exh', 'turbo', 'clutch', 'gearbox', 'drive', 'transfer', 'fsusp', 'rsusp', 'steer', 'pads', 'discs', 'brakes', 'wheels', 'start', 'wiring', 'hl_fl', 'hl_fr', 'tl_rl', 'tl_rr', 'panels', 'frame', 'interior'];
  const all = Object.assign({}, N0, add); delete all.lights;
  D.nodes = {}; for (const id of order) D.nodes[id] = all[id];
  D.nodeIds = order.slice();
  // из чего состоит деталь, когда её выбрасывают (единицы мусора); жидкости, которые сливают при работе (литры)
  const MAT = { block: { metal: 4 }, head: { metal: 2 }, gasket: { gen: .3 }, fuel: { metal: 1, gen: .5 }, ign: { metal: .5, gen: .5 }, cool: { metal: 1.5, gen: .5 }, lube: { metal: .5, gen: .5 }, exh: { metal: 3 }, turbo: { metal: 2 },
    clutch: { metal: 1.5 }, gearbox: { metal: 4 }, drive: { metal: 2 }, transfer: { metal: 2 }, fsusp: { metal: 2, rubber: .5 }, rsusp: { metal: 2, rubber: .5 }, steer: { metal: 1.5 }, brakes: { metal: 1, rubber: .3 },
    wheels: { rubber: 4, metal: .5 }, start: { metal: 1, gen: .5 }, wiring: { gen: 1, metal: .3 }, panels: { metal: 2, plast: .5 }, frame: { metal: 3 }, interior: { gen: 2, plast: 1 } };
  for (const id in MAT) if (D.nodes[id]) D.nodes[id].mat = MAT[id];
  D.FLUID = { block: { oil: 5 }, lube: { oil: 5 }, head: { oil: 2, chem: 4 }, gasket: { oil: 4, chem: 8 }, cool: { chem: 8 }, gearbox: { oil: 4 }, transfer: { oil: 1.5 }, drive: { oil: 1.5 }, brakes: { chem: 1 }, steer: { oil: 1 }, turbo: { oil: 1 }, clutch: { chem: .5 } };
  D.LAMPS = ['hl_fl', 'hl_fr', 'tl_rl', 'tl_rr'];

  // симптомы и тесты: переносим «свет» на четыре фонаря, тормоза — на колодки/диски/суппорты
  const remap = (o, w) => { if (!o) return; if (o.lights != null) { const v = o.lights; delete o.lights; for (const l of D.LAMPS) o[l] = w ? v / 3 : v; } };
  for (const k in D.sym) remap(D.sym[k].c, 1);
  for (const k in D.tests) remap(D.tests[k].nodes, 0);
  Object.assign(D.sym.brake_bad.c, { pads: 5, discs: 3, brakes: 3, wheels: 1 }); delete D.sym.brake_bad.c.fsusp; delete D.sym.brake_bad.c.steer;
  D.sym.brake_bad.n = 'Скрип тормозов, педаль проваливается';
  D.sym.brake_vib = { n: 'Бьёт в педаль при торможении', v: 'Тормозишь — руль трясётся', c: { discs: 7, wheels: 1.5, fsusp: 1 } };
  D.sym.brake_pull = { n: 'При торможении тянет в сторону', v: 'Жму на тормоз — тянет вправо', c: { brakes: 6, pads: 2, fsusp: 1.5 } };
  D.sym.intake_leak = { n: 'Подсос воздуха, плавают обороты', v: 'На холостых обороты гуляют, будто кто-то газует', c: { intake: 6, fuel: 2, wiring: 1 } };
  D.sym.lights_out = { n: 'Не горит фара или фонарь', v: 'Сзади мигнули — говорят, фонарь не горит', c: { hl_fl: 3, hl_fr: 3, tl_rl: 2.5, tl_rr: 2.5, wiring: 2 } };
  D.sym.gauges = { n: 'Врут приборы, не работает печка', v: 'Бензин всегда «полный», а печка дует холодным', c: { wiring: 6, cool: 2 } };
  D.sym.misfire.c.intake = 1.5; D.sym.no_boost.c.intake = 2;
  D.sym.pull.c = { wheels: 4, brakes: 3, fsusp: 2, steer: 2 };
  D.nodeSyms = {}; for (const s in D.sym) for (const nd in D.sym[s].c) (D.nodeSyms[nd] = D.nodeSyms[nd] || []).push(s);
  D.nodeSyms.frame = []; D.nodeSyms.interior = D.nodeSyms.interior || [];
  Object.assign(D.tests.walk.nodes, { pads: 30 });
  Object.assign(D.tests.drive.nodes, { pads: 22, discs: 20, brakes: 24, intake: 25 }); delete D.tests.drive.nodes.lights;
  Object.assign(D.tests.lift.nodes, { pads: 8, discs: 9, brakes: 10, intake: 18 });
  Object.assign(D.tests.scan.nodes, { intake: 8 });
  Object.assign(D.symTests, { brake_vib: ['drive', 'lift'], brake_pull: ['lift', 'drive'], intake_leak: ['scan', 'drive', 'lift'], gauges: ['elec', 'scan'] });
  D.svc.pads.fx = { pads: [60, 96], brakes: [5, 80] };
  D.svc.tuneup.fx.intake = [15, 85];
  Object.assign(D.cascade, { pads: ['discs'], discs: ['brakes'], brakes: ['pads'], intake: ['fuel'], wiring: ['hl_fl', 'start'] });
  Object.assign(D.vital, { pads: 1, discs: 1 });
  for (const m of Object.values(D.models)) for (const s of m.sig) if (/впускн/.test(s.t) && s.n === 'exh') s.n = 'intake';

  // ---------- 6 грейдов ----------
  // price — к цене OEM; st — состояние новой детали; wear — износ; reps — ресурс ремонтов; gain — ремкомплект; bq — к качеству работы;
  // dud — брак из коробки; fit — шанс встать без колхоза; perf — тюнинг-эффект на мощность/сцепление; comfort — клиентам на дороге
  D.grades = {
    used:   { n: 'Б/у с разборки', short: 'Б/у', c: '#9AA0A6', icon: '▢', price: .3, st: [18, 85], wear: 2.0, reps: 3, gain: [1, 30], bq: -5, dud: 0, fit: .95, perf: 0, why: 'Копейки, но лотерея: ресурс неизвестен, износ вдвое быстрее. Идеально для ведра за $500 и для донора.' },
    econ:   { n: 'Эконом-аналог', short: 'Эконом', c: '#cfcfc4', icon: '◻', price: .45, st: [72, 94], wear: 1.45, reps: 3, gain: [10, 35], bq: -2, dud: .08, fit: .78, perf: 0, why: 'Дёшево и новое. Но каждая пятая встаёт только с колхозом: дольше и хуже. Брак из коробки — нередко.' },
    analog: { n: 'Аналог', short: 'Аналог', c: '#e0ddd0', icon: '◇', price: .75, st: [88, 98], wear: 1.1, reps: 4, gain: [18, 45], bq: 2, dud: .03, fit: .96, perf: 0, why: 'Нормальная деталь стороннего завода: почти как родная за три четверти цены. Выбор разумного клиента.' },
    oem:    { n: 'OEM (оригинал)', short: 'OEM', c: '#F2F2F2', icon: '◆', price: 1.0, st: [94, 100], wear: 1.0, reps: 5, gain: [20, 50], bq: 5, dud: .01, fit: 1, perf: 0, why: 'Родная деталь. Дорого, надёжно, сохраняет оригинальность — важно для классики и для дорогих машин.' },
    sport:  { n: 'Премиум / тюнинг', short: 'Премиум', c: '#3B82F6', icon: '★', price: 2.2, st: [98, 100], wear: .8, reps: 7, gain: [40, 70], bq: 8, dud: 0, fit: .9, perf: .04, comfort: -1, why: 'Тюнинг-деталь для этой машины: +мощность или сцепление, медленнее изнашивается. Жёстче и громче — семейный клиент не оценит.' },
    race:   { n: 'Гоночный', short: 'Гонка', c: '#D4A72C', icon: '✪', price: 4.5, st: [100, 100], wear: .6, reps: 10, gain: [60, 90], bq: 8, dud: 0, fit: .85, perf: .08, comfort: -3, why: 'Для трека. Максимум эффекта, но на дороге шумно, жёстко и не для смог-чека. Обычный клиент сочтёт это издевательством.' }
  };
  D.gradeIds = Object.keys(D.grades);
  D.gradeRank = { used: 0, econ: 1, analog: 2, oem: 3, sport: 4, race: 5 };
  // какие узлы дают эффект тюнинг-грейдом и какой
  D.perfNode = { intake: 'hp', exh: 'hp', fuel: 'hp', ign: 'hp', turbo: 'hp', head: 'hp', fsusp: 'grip', rsusp: 'grip', wheels: 'grip', pads: 'brake', discs: 'brake', brakes: 'brake', clutch: 'hp', gearbox: 'hp' };
  // тюнинг теперь — это детали: оставляем только работы, которые не являются деталью
  D.tune = { cage: D.tune.cage || { n: 'Гоночная подготовка: каркас, ковш, ремни, огнетушитель', h: 6, part: 380, sk: 'body', hp: 0, wt: .02, grip: .03, val: -.03 }, diet: D.tune.diet };
  D.tune.cage = D.tune.cage || null;

  // как клиент смотрит на грейд (модификатор согласия) — «студент на ведре за $500 офигеет от OEM»
  D.gradePref = {
    student: { used: 1.2, econ: .9, analog: 0, oem: -1.4, sport: -1.6, race: -3, say: 'Студенту на ведре нужно дёшево: Б/у или эконом. OEM и тем более премиум — «вы с ума сошли?»' },
    mom:     { used: -.8, econ: -.3, analog: .6, oem: .4, sport: -.8, race: -3, say: 'Маме важны надёжность и безопасность за разумные деньги: аналог или OEM. Б/у на тормоза — ни за что.' },
    worker:  { used: .4, econ: .4, analog: .6, oem: 0, sport: -1, race: -3, say: 'Работяге лишь бы ехало завтра: аналог, эконом, можно б/у. Тюнинг — пустая трата.' },
    retiree: { used: -1.2, econ: -.6, analog: .2, oem: 1, sport: -1, race: -3, say: 'Пенсионер привык к родному: OEM. Аналог стерпит. «Б/у? В мою машину?»' },
    biz:     { used: -2, econ: -1.5, analog: -.6, oem: 1.2, sport: .3, race: -2, say: 'Бизнесмен на немце хочет только оригинал. Аналог — с поджатыми губами, эконом и б/у — оскорбление.' },
    petrol:  { used: -.5, econ: -1, analog: 0, oem: .3, sport: 1.6, race: 1, say: 'Петролхед ценит премиум и гоночное, свои детали тащит сам. Эконом — «это что, шутка?»' }
  };
  // дорогой ремонт для дешёвой машины — отдельный удар (доля стоимости машины)
  D.gradeCarShock = (total, carV) => carV <= 0 ? 0 : Math.max(0, total / carV - .35) * 2.2;

  // ---------- кузовные панели ----------
  D.panels = {
    hood: { n: 'Капот', zone: null, part: 140 }, roof: { n: 'Крыша', zone: null, part: 260 }, trunk: { n: 'Крышка багажника', zone: 'doors', part: 130 },
    fl: { n: 'Крыло переднее левое', zone: 'farch', part: 95 }, fr: { n: 'Крыло переднее правое', zone: 'farch', part: 95 },
    rl: { n: 'Крыло заднее левое', zone: 'rarch', part: 160 }, rr: { n: 'Крыло заднее правое', zone: 'rarch', part: 160 },
    dfl: { n: 'Дверь передняя левая', zone: 'doors', part: 150 }, dfr: { n: 'Дверь передняя правая', zone: 'doors', part: 150 },
    drl: { n: 'Дверь задняя левая', zone: 'doors', part: 140 }, drr: { n: 'Дверь задняя правая', zone: 'doors', part: 140 },
    fbump: { n: 'Бампер передний', zone: null, part: 85, plast: 1 }, rbump: { n: 'Бампер задний', zone: null, part: 80, plast: 1 }
  };
  D.panelIds = Object.keys(D.panels);
  D.bodyWork = {
    dent:  { n: 'Рихтовка', h: 1.4, part: 6, mg: 'dent', d: 'Выправить вмятины молотком и споттером.' },
    derust:{ n: 'Зачистка ржавчины и заплатка', h: 2.2, part: 30, mg: 'rust', d: 'Срезать гниль, вварить латку, зашпатлевать.' },
    paint: { n: 'Покраска детали', h: 2.4, part: 45, mg: 'paint', d: 'Грунт, база, лак. Без покрасочной камеры качество ограничено.' },
    swap:  { n: 'Замена панели', h: 1.6, part: 0, mg: null, d: 'Новая или б/у панель, покраска отдельно.' }
  };

  // ---------- отходы и жидкости ----------
  D.waste = {
    gen:    { n: 'Общий мусор', i: '🗑', col: '#6b6f74', unit: 'ед.', pay: -4, d: 'Стекло, ветошь, упаковка — всё, что нельзя сдать. За вывоз платим.' },
    metal:  { n: 'Металлолом', i: '🔩', col: '#8a8d90', unit: 'ед.', pay: 2.5, d: 'Старые детали, обрезки, диски. Приёмщик металла платит.' },
    rubber: { n: 'Резина и шины', i: '⚫', col: '#2b2d30', unit: 'ед.', pay: .6, d: 'Старые шины и резинки. Переработчик забирает за небольшую плату нам.' },
    plast:  { n: 'Пластик и картон', i: '📦', col: '#b08d57', unit: 'ед.', pay: .4, d: 'Коробки от новых деталей, бамперы, обшивка.' },
    oil:    { n: 'Отработанное масло', i: '🛢', col: '#4a3524', unit: 'л', pay: .08, fluid: 1, d: 'Масло, АКПП, ГУР. Утилизатор берёт бесплатно и ещё доплачивает — или жги в печи на отработке.' },
    chem:   { n: 'Антифриз и тормозная', i: '🧪', col: '#4f9a6a', unit: 'л', pay: -.3, fluid: 1, d: 'Ядовито. Утилизация платная. Слить в канаву — дёшево и очень рискованно.' }
  };
  Object.assign(D.build, {
    bin_gen:   { n: 'Мусорный бак (общий)', i: '🗑', cost: 90, w: 1, h: 1, solid: 1, bin: 'gen', cap: 18, g: 'Отходы', d: 'Всё подряд, без разделения. Вывоз — платный, раз в неделю или по вызову.' },
    bin_press: { n: 'Пресс-контейнер (общий)', i: '🗜', cost: 640, w: 2, h: 1, solid: 1, bin: 'gen', cap: 60, cheap: .6, g: 'Отходы', d: 'Грейд выше: втрое больше и вывоз на 40% дешевле.' },
    bin_metal: { n: 'Контейнер металлолома', i: '🔩', cost: 160, w: 2, h: 1, solid: 1, bin: 'metal', cap: 30, g: 'Отходы', d: 'Старые железки — в деньги, а не в общий бак.' },
    bin_rubber:{ n: 'Клетка для шин', i: '⚫', cost: 120, w: 1, h: 1, solid: 1, bin: 'rubber', cap: 16, g: 'Отходы', d: 'Шины и резина отдельно — переработчик заберёт.' },
    bin_plast: { n: 'Контейнер пластика и картона', i: '📦', cost: 110, w: 1, h: 1, solid: 1, bin: 'plast', cap: 20, g: 'Отходы', d: 'Коробки от деталей и пластик отдельно.' },
    tank_oil:  { n: 'Ёмкость отработки 200 л', i: '🛢', cost: 180, w: 1, h: 1, solid: 1, bin: 'oil', cap: 200, g: 'Отходы', d: 'Сюда сливают масло. Нет ёмкости — масло на полу.' },
    tank_oil2: { n: 'Ёмкость 600 л + печь на отработке', i: '🔥', cost: 950, w: 2, h: 1, solid: 1, bin: 'oil', cap: 600, stove: 1, g: 'Отходы', d: 'Грейд выше: втрое больше, и печь каждый день сжигает 12 л — коммуналка дешевле на $6 в день.' },
    tank_chem: { n: 'Бочка для антифриза и тормозной', i: '🧪', cost: 140, w: 1, h: 1, solid: 1, bin: 'chem', cap: 120, g: 'Отходы', d: 'Ядовитые жидкости — отдельно от масла.' }
  });
  D.zones.store.need = D.zones.store.need; // без изменений

  // ---------- миграция машины на 30 узлов ----------
  D.migrateCar = function (car) {
    const nd = car.nodes; if (!nd || nd.pads) return;
    const cp = (src, t) => src ? Object.assign({}, src, { t: Math.max(1, Math.min(100, src.t + t)), lo: Math.max(0, src.lo - 5), hi: Math.min(100, src.hi + 5) }) : null;
    if (nd.brakes) { nd.pads = cp(nd.brakes, -5); nd.discs = cp(nd.brakes, 5); }
    if (nd.exh) nd.intake = cp(nd.exh, 8);
    if (nd.lights) { for (const l of D.LAMPS) nd[l] = cp(nd.lights, (Math.random() - .5) * 20); delete nd.lights; }
    const o = {}; for (const id of D.nodeIds) if (nd[id]) o[id] = nd[id]; car.nodes = o;
    for (const f of car.faults || []) if (f.node === 'lights') f.node = 'hl_fl';
    if (car.mods) { const conv = { intake: ['intake'], exhaust: ['exh'], carb: ['fuel'], susp: ['fsusp', 'rsusp'], tires: ['wheels'] }; for (const m of car.mods.slice()) if (conv[m]) { for (const id of conv[m]) if (car.nodes[id]) { car.nodes[id].grade = 'sport'; car.nodes[id].orig = false; } car.mods = car.mods.filter(x => x !== m); } }
  };
})(globalThis.WW);
