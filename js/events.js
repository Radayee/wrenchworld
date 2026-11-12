// WRENCHWORLD — рассказчик «Старина Мак», события, обучение с Попсом, цели и достижения.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, E = WW.E = {};
  const G = () => WW.G, P = () => WW.P;
  const px = () => WW.G.px();
  const staff = () => WW.S.pawns.filter(p => !p.owner && p.state === 'work');

  // kind: bad | good | neutral; cd — пауза в днях; morning — срабатывает до открытия
  // choices: [{t, d, run}] — модальное решение; иначе run() и уведомление
  E.defs = {
    blizzard: { kind: 'bad', cd: 6, w: 3, morning: 1, cond: S => G().season() === 3, run() { WW.S.weather = 'blizzard'; G().addMod('clients', 1.25, 2, 'После метели'); return 'Метель накрыла город. Клиентов почти нет, зато завтра все приедут с севшими аккумуляторами.'; }, radio: 'Штормовое предупреждение: до 10 дюймов снега. Сидите дома, если можете.' },
    heat: { kind: 'bad', cd: 6, w: 2, morning: 1, cond: S => G().season() === 1, run() { WW.S.weather = 'heat'; return 'Жара за 95°F. В боксах душно, зато едут с перегревами.'; }, radio: 'Жара бьёт рекорды. Проверьте антифриз — эвакуаторы уже нарасхват.' },
    compressor: { kind: 'bad', cd: 14, w: 2, cond: S => S.upg.air, title: 'Компрессор умер в понедельник', text: 'Из угла бокса — хлопок и запах горелой обмотки. Пневмоинструмент молчит.',
      choices: [{ t: 'Срочный ремонт', d: () => 'Заплатить ' + U.money(180 * px()), run() { G().money(-Math.round(180 * px()), 'misc'); return 'Мастер перемотал мотор компрессора за два часа.'; } }, { t: 'Работать руками', d: () => '3 дня f_tools ×1.3', run() { G().addMod('tools', 1.3, 3, 'Компрессор сломан'); return 'Три дня баллонник вместо гайковёрта.'; } }] },
    osha: { kind: 'bad', cd: 20, w: 1.5, cond: S => S.day > 6, title: 'Проверка охраны труда', text: 'Инспектор в каске ходит по боксам и что-то пишет в планшет. «Огнетушитель просрочен, подставки без маркировки…»',
      choices: [{ t: 'Оплатить штраф', d: () => U.money(140 * px()), run() { G().money(-Math.round(140 * px()), 'fine'); return 'Штраф оплачен, замечания закрыты.'; } }, { t: '«Может, договоримся?»', d: () => '50%: без штрафа · 50%: штраф ×2 и −Честность', run() { if (U.chance(.5)) return 'Инспектор оказался клиентом — ты чинил его пикап. Обошлось предупреждением.'; G().money(-Math.round(280 * px()), 'fine'); G().repAdd('h', -4); return 'Инспектор оскорбился. Штраф удвоен, а слух пошёл по району.'; } }] },
    breakin: { kind: 'bad', cd: 12, w: 1.5, morning: 1, cond: S => S.day > 4 && S.money > 600 * px(), run() { const S = WW.S; if (S.upg.alarm) return 'Ночью кто-то лез через забор, но сигнализация спугнула. Не зря ставили.'; const v = Math.round(Math.min(420 * px(), S.money * U.rf(.05, .12))); G().money(-v, 'misc'); return 'Ночной взлом: вынесли кассу и ящик с инструментом. Минус ' + U.money(v) + '. Забор и сигнализация спасли бы.'; } },
    bigal: { kind: 'bad', cd: 16, w: 2, cond: S => S.day > 5, title: 'Big Al’s Auto демпингует', text: 'Сеть Big Al’s повесила через дорогу растяжку: «Замена масла за $9.99! Тормоза — полцены!» Твои клиенты поглядывают в ту сторону.',
      choices: [{ t: 'Скидка 15% на 4 дня', d: () => 'ставка ×0.85, поток сохранится', run() { G().addMod('rate', .85, 4, 'Скидка против Big Al’s'); return 'Ты ответил скидкой. Клиенты остались, маржа похудела.'; } }, { t: 'Держать цену', d: () => 'клиентов −30% на 4 дня', run() { G().addMod('clients', .7, 4, 'Демпинг Big Al’s'); return 'Ты держишь цену. Четыре дня будет потише — зато их брак потом приедет к тебе.'; } }, { t: 'Реклама в ответ', d: () => U.money(90 * px()), run() { G().money(-Math.round(90 * px()), 'marketing'); G().addMod('clients', .92, 4, 'Демпинг Big Al’s'); return '«Мы чиним, а не меняем масло наперегонки». Почти без потерь.'; } }] },
    scandal: { kind: 'bad', cd: 5, w: 2, cond: S => staff().length > 0, run() { const p = U.pick(staff()); P().think(p, 'yell', 'Клиент наорал', -6, 1); return 'Скандалист у стойки наорал на ' + p.name + ': «Вы мне лишнего насчитали!» Осадок остался.'; } },
    badcheck: { kind: 'bad', cd: 9, w: 1.5, cond: S => S.stats.orders > 6, run() { const v = Math.round(U.rf(40, 130) * px()); G().money(-v, 'misc'); return 'Банк вернул чек одного из клиентов: «недостаточно средств». Минус ' + U.money(v) + '.'; } },
    pricehike: { kind: 'bad', cd: 14, w: 1.5, run() { G().addMod('parts', 1.15, 5, 'Подорожание прайса'); return 'Дистрибьютор прислал новый прайс: детали +15% на ближайшие 5 дней.'; }, radio: 'Забастовка на сталелитейном: запчасти дорожают.' },
    scam: { kind: 'neutral', cd: 18, w: 1.2, cond: S => S.day > 3, title: 'Просьба «сделать бумажку»', text: 'Мужик в кожанке кладёт на стойку сотню: «Мне бы наклейку техосмотра. Машину смотреть не надо, она… далеко».',
      choices: [{ t: 'Выставить за дверь', d: () => 'Честность +3', run() { G().repAdd('h', 3); return 'Ты показал на дверь. Попс бы одобрил.'; } }, { t: 'Взять деньги', d: () => '+' + U.money(100 * px()) + ', Честность −6, риск штрафа', run() { G().money(Math.round(100 * px()), 'misc'); G().repAdd('h', -6); if (U.chance(.3)) { G().money(-Math.round(400 * px()), 'fine'); return 'Через неделю машину остановил патруль. Наклейку отследили до тебя: штраф ' + U.money(400 * px()) + '.'; } return 'Сотня в кассе. Осадочек остался.'; } }] },
    fuel: { kind: 'neutral', cd: 20, w: 1.2, run() { const S = WW.S, up = U.chance(.5); for (const id in D.models) { const m = D.models[id]; if (/V8/.test(m.eng)) S.trend[id] *= up ? .93 : 1.06; else if (m.wt < 2800) S.trend[id] *= up ? 1.07 : .96; } return up ? 'Бензин подорожал на 20 центов. Большие V8 дешевеют, малолитражки в цене.' : 'Бензин подешевел. Народ снова смотрит на большие V8.'; }, radio: 'Цены на заправках снова скачут. Эксперты советуют… ничего они не советуют.' },
    hail: { kind: 'neutral', cd: 15, w: 1, cond: S => G().season() < 2, run() { G().addMod('clients', 1.3, 2, 'После града'); return 'Град размером с мяч для гольфа. Завтра-послезавтра поток клиентов +30%.'; }, radio: 'Град побил машины на парковке молла. Страховые в панике.' },
    barn: { kind: 'good', cd: 9, w: 2.5, cond: S => S.day > 1, run() { const S = WW.S; const m = U.wpick(WW.M.pool().filter(m => m.curve !== 'mass'), m => m.curve === 'cult' ? 2 : 1); const l = WW.M.addListing({ seller: 'farmer', model: m.id, quality: 'barn', askK: .55, days: 3, barn: 1 }); l.text = 'Наводка от клиента: «У дяди в сарае под сеном стоит ' + m.make + ' ' + m.name + '. Он про неё забыл, отдаст недорого. Только едь быстрее, пока другие не узнали».'; return 'Наводка на сарай! В объявлениях появился ' + C.name(S.cars[l.car]) + ' — 3 дня, пока не узнали перекупы.'; }, act: ['panel', 'market'] },
    closing: { kind: 'good', cd: 14, w: 1.5, run() { G().addMod('parts', .7, 3, 'Распродажа склада'); return 'Старый магазин запчастей на углу закрывается: 3 дня все детали −30%.'; }, radio: 'Магазин «Эрл и сыновья» закрывается после 40 лет. Распродажа всего склада.' },
    referral: { kind: 'good', cd: 6, w: 2.5, cond: S => S.stats.orders > 3, run() { G().addMod('clients', 1.4, 2, 'Сарафанное радио'); return 'Постоянный клиент рассказал о тебе в смене на заводе. Два дня поток +40%.'; } },
    article: { kind: 'good', cd: 20, w: 1.2, cond: S => G().rep() > 42, run() { G().repAdd('q', 3); G().repAdd('s', 2); G().addMod('clients', 1.25, 3, 'Статья в газете'); return 'Местная газета написала про «заправку, где ещё чинят по совести». Репутация +, клиенты +25% на 3 дня.'; }, radio: 'В свежем номере «Курьера» — репортаж о старой заправке на Мейпл-стрит.' },
    cookies: { kind: 'good', cd: 8, w: 1.5, cond: S => staff().length > 0 && S.stats.orders > 4, run() { for (const p of staff()) P().think(p, 'cookie', 'Клиентка принесла печенье', 4, 2); return 'Миссис ' + U.pick(D.last) + ' принесла команде коробку печенья: «За то, что не обманули». Настроение +.'; } },
    legend: { kind: 'good', cd: 30, w: 1, cond: S => S.day > 8 && P().staff().length < 6 && G().rep() > 38, run() { const S = WW.S, c = P().mk('mech', true); c.legend = 1; S.cands.unshift(c); return 'На пороге — ' + c.name + ', легендарный моторист. Тридцать лет на заводе, руки золотые. Пахнет от него… ну, пахнет. Просится на работу (вкладка «Люди»).'; }, act: ['panel', 'people'] },
    tooltruck: { kind: 'good', cd: 10, w: 1.5, cond: S => staff().length > 0, title: 'Грузовик с инструментом', text: 'Во двор въехал красный фургон: «Свежие трещотки, парни! Рассрочка на полгода!» Команда облепила прилавок.',
      choices: [{ t: 'Купить команде набор', d: () => U.money(120 * px()) + ' · настроение +6 на 5 дней, работа ×0.95 на неделю', run() { G().money(-Math.round(120 * px()), 'upgrade'); for (const p of staff()) P().think(p, 'tools', 'Шеф купил новый инструмент', 6, 5); G().addMod('tools', .95, 7, 'Новый инструмент'); return 'Новые трещотки блестят. Команда довольна.'; } }, { t: 'Не сегодня', d: () => '', run() { return 'Фургон уехал. Парни вздохнули.'; } }] },
    movie: { kind: 'good', cd: 40, w: .8, run() { const S = WW.S; const ids = ['stallion', 'firebolt', 'n240', 'civa', 'sora'].filter(id => D.models[id].y[0] <= S.year); for (const id of ids) S.trend[id] *= 1.12; return 'В кино вышел боевик про ночные гонки. Спрос на спортивные купе подскочил на 12%.'; }, radio: 'Кассовый хит недели — кино про уличных гонщиков. Подростки штурмуют авторынок.' },
    insight: { kind: 'good', cd: 7, w: 1.5, cond: S => S.pawns.length > 0, run() { const S = WW.S, p = U.pick(S.pawns.filter(p => p.state === 'work')); if (!p) return null; p.insight = S.day; return 'Озарение: ' + p.name + ' сегодня слышит моторы как музыкант — диагностика почти без погрешности.'; } },
    fleet: { kind: 'good', cd: 18, w: 1.3, cond: S => G().rep() > 40, title: 'Таксопарк ищет сервис', text: 'Менеджер «Жёлтого кэба» предлагает неделю пробного контракта: объём гарантирован, но ставка — со скидкой 12%.',
      choices: [{ t: 'Подписать', d: () => 'клиентов +35%, ставка ×0.88 на 7 дней', run() { G().addMod('clients', 1.35, 7, 'Контракт с таксопарком'); G().addMod('rate', .88, 7, 'Контракт с таксопарком'); return 'Контракт подписан. Неделю будет тесно.'; } }, { t: 'Отказаться', d: () => '', run() { return 'Ты отказался: боксы нужнее для своих клиентов.'; } }] },
    pops: { kind: 'good', cd: 12, w: 1.5, cond: S => Object.values(S.cars).some(c => c.owner === 'player'), run() { const S = WW.S, car = U.pick(Object.values(S.cars).filter(c => c.owner === 'player')); const sp = { nodes: {}, rust: {} }; for (const id in car.nodes) sp.nodes[id] = 9; for (const z of D.rustIds) sp.rust[z] = 9; C.reveal(car, sp, 12); for (const p of staff()) P().think(p, 'pops', 'Попс заходил с пончиками', 3, 2); return 'Попс заехал с пончиками, обошёл ' + C.short(car) + ', постучал по порогам, послушал мотор: «Записывай…» Состояние машины теперь известно почти точно.'; }, act: ['panel', 'cars'] },
    recall: { kind: 'good', cd: 25, w: 1, cond: S => S.day > 10, run() { G().addMod('clients', 1.2, 4, 'Отзывная кампания'); return 'Массовый отзыв популярной модели: дилеры не справляются, работа идёт к независимым. +20% клиентов на 4 дня.'; }, radio: 'Производитель отзывает 200 тысяч машин. Очереди у дилеров — на месяц.' }
  };
  const era = {
    1979: ['Топливный шок 1979 года: очереди на заправках. Большие V8 дешевеют, малолитражки дорожают.', S => { for (const id in D.models) { if (/V8/.test(D.models[id].eng)) S.trend[id] *= .8; else if (D.models[id].wt < 2800) S.trend[id] *= 1.2; } }],
    1984: ['Инжектор приходит на конвейер: первые ЭБУ с мигающими кодами. «Старая школа» ворчит.', S => { }],
    1989: ['Родстер возвращается: лёгкие двухместные машины снова в моде.', S => { S.trend.roadster = 1.15; }],
    1996: ['OBD-II обязателен для всех новых машин. Без сканера диагностика становится лотереей.', S => { }],
    2001: ['«Культовый фильм про стритрейсеров» вышел в прокат. Спрос на японские купе ×1.5.', S => { for (const id of ['n240', 'civa', 'sora', 'roadster']) S.trend[id] *= 1.5; }],
    2008: ['Финансовый кризис. Люди чинят старое вместо покупки нового — сервису хорошо, флипу плохо.', S => { for (const id in S.trend) S.trend[id] *= .85; G().addMod('clients', 1.15, 56, 'Кризис: чинят старое'); }],
    2009: ['Программа «деньги за развалюхи»: тысячи старых машин уходят под пресс. Дешёвых доноров всё меньше.', S => { for (const id in D.models) if (D.models[id].curve === 'mass') S.trend[id] *= 1.15; }]
  };

  E.planDay = function () {
    const S = WW.S, g = G();
    if (era[S.year] && !S.evLast['era' + S.year] && S.day > 0) { S.evLast['era' + S.year] = S.day; era[S.year][1](S); g.note(era[S.year][0], 'story'); g.radio(era[S.year][0]); }
    S.evq = [];
    // напряжение: деньги, просрочка, настроение, недавние беды
    const late = Object.values(S.orders).filter(o => o.due && S.day > o.due.day).length;
    const st = P().staff(), mood = st.length ? st.reduce((s, p) => s + p.mood, 0) / st.length : 60;
    S.tension = U.clamp((S.money < 500 * g.px() ? .4 : 0) + late * .12 + (mood < 40 ? .25 : 0) + (S.badStreak || 0) * .15, 0, 1);
    if (S.day < 1 || !U.chance(.62)) { S.calm = (S.calm || 0) + 1; return; }
    let kind = U.r() < U.clamp(.34 + (S.calm || 0) * .07 - S.tension * .3, .12, .65) ? 'bad' : (U.chance(.22) ? 'neutral' : 'good');
    if (S.day < 3 && kind === 'bad') kind = 'good';
    if ((S.badStreak || 0) >= 3) kind = 'good'; // таймер жалости
    const pool = Object.keys(E.defs).filter(id => { const d = E.defs[id]; return d.kind === kind && (S.evLast[id] == null || S.day - S.evLast[id] >= d.cd) && (!d.cond || d.cond(S)); });
    if (!pool.length) return;
    const id = U.wpick(pool, x => E.defs[x].w), d = E.defs[id];
    S.evLast[id] = S.day; S.calm = 0; S.badStreak = kind === 'bad' ? (S.badStreak || 0) + 1 : 0;
    if (d.morning) E.fire(id); else S.evq.push({ min: U.rf(480, 880), id });
  };
  E.fire = function (id) {
    const S = WW.S, d = E.defs[id], g = G();
    if (d.radio) g.radio(d.radio);
    if (d.choices) {
      S.pendingEv = id;
      if (WW.hasUI) { WW.emit('event', id); return; }
      E.choose(0); return;
    }
    const t = d.run(); if (t) g.note(t, d.kind === 'bad' ? 'bad' : d.kind === 'good' ? 'good' : 'info', d.act);
  };
  E.choose = function (i) {
    const S = WW.S, id = S.pendingEv; if (!id) return; S.pendingEv = null;
    const d = E.defs[id], c = d.choices[i] || d.choices[0], t = c.run();
    G().log(d.title + ': ' + c.t + '. ' + (t || ''), d.kind === 'bad' ? 'bad' : 'good'); if (t) G().toast(t, 'info');
  };
  E.tick = function () {
    const S = WW.S;
    while (S.evq.length && S.evq[0].min <= S.min && !S.pendingEv) E.fire(S.evq.shift().id);
    const mi = Math.floor(S.min); if (mi === S.tutMin) return; S.tutMin = mi;
    if (S.set.tut && !S.tut.cur) for (const st of E.tut) if (!S.tut.seen[st.id] && st.cond(S)) { S.tut.cur = st.id; S.tut.seen[st.id] = 1; WW.emit('tut', st); break; }
    if (mi % 30 === 0) radioIdle();
  };
  E.night = function () { };
  function radioIdle() {
    const S = WW.S; if (U.chance(.5)) return;
    const up = Object.keys(S.trend).filter(id => D.models[id].y[0] <= S.year).sort((a, b) => S.trend[b] - S.trend[a]);
    const lines = ['WRNC 98.7 FM: в эфире только рок и прогноз погоды. Сегодня — ' + D.weather[S.weather].n + '.',
      'Биржа подержанных: растёт ' + D.models[up[0]].make + ' ' + D.models[up[0]].name + ' (×' + S.trend[up[0]].toFixed(2) + '), падает ' + D.models[up[up.length - 1]].make + ' ' + D.models[up[up.length - 1]].name + ' (×' + S.trend[up[up.length - 1]].toFixed(2) + ').',
      'Аукцион штрафстоянки — по средам и субботам с часу дня.', 'По субботам — заезды на стрипе «Норвок» и автокросс у молла. Привози, что есть.',
      'Говорят, соль на дорогах в этом году съела больше порогов, чем налоговая — зарплат.', 'Реклама: «Big Al’s Auto — быстрее только бесплатно!»', 'Слушатель спрашивает: стучит на холодную, потом проходит. Диджей советует сделать радио погромче.'];
    G().radio(U.pick(lines));
  }

  // ---------- обучение: Попс подсказывает внутри мира ----------
  const ords = S => Object.values(S.orders);
  E.tut = [
    { id: 'hi', cond: S => true, text: 'Ну, здравствуй, хозяин. Заправка теперь твоя — вместе с ипотекой, уж извини. Время идёт, пока не нажмёшь паузу (Пробел). Колёсико — зум, перетаскивание — карта. Сейчас приедет первый клиент: встреть его у стойки.' },
    { id: 'client', cond: S => ords(S).some(o => o.type !== 'own'), text: 'Вон он, заезжает. Приём оформляет тот, у кого в «Людях» включена «Приёмка» — пока это ты сам. Открой «Наряды» (клавиша 1): там вся работа течёт слева направо, от приёма до оплаты.', hl: 'orders' },
    { id: 'diag', cond: S => ords(S).some(o => o.stage === 'diag' && o.type !== 'own'), text: 'Клиент описал симптом — а что сломано, знает только машина. Кликни наряд: увидишь гипотезы с вероятностями. Каждый тест стоит времени и сужает туман. Не угадал — поменяешь не то, и клиент вернётся злой.', hl: 'orders' },
    { id: 'est', cond: S => ords(S).some(o => o.decide && o.type !== 'own'), text: 'Диагностика готова. Жми «Предложить по диагнозу» или выбери узлы сам, выбери грейд детали — б/у дёшево, но лотерея — и отправляй смету клиенту. Он может согласиться на всё, часть или ничего.', hl: 'orders' },
    { id: 'parts', cond: S => ords(S).some(o => o.stage === 'parts'), text: 'Детали заказаны. Срочно из магазина — час-три и розница; у дистрибьютора — завтра, зато на 20% дешевле. Пока ждём, машина занимает место. Половина простоев сервиса — вот это самое.' },
    { id: 'paid', cond: S => S.stats.orders > 0, text: 'Первые деньги в кассе! Глянь на звёзды: репутация — это Качество, Честность, Скорость и Цена. От неё зависит, сколько народу приедет завтра. Нормо-час и наценку меняй в «Финансах».', hl: 'fin' },
    { id: 'cars', cond: S => S.stats.orders > 0 && S.min > 600 && Object.values(S.cars).some(c => c.owner === 'player'), text: 'Теперь про дедовы машины слева во дворе. Открой «Машины» (2): чертёж показывает узлы — заливка это состояние, штриховка — то, чего ты ещё не знаешь. Создай наряд, осмотри, почини, отмой — и на витрину у дороги.', hl: 'cars' },
    { id: 'market', cond: S => S.day >= 1, text: 'Свежая газета! В «Рынке» (4) — объявления. Покупка — это покер: продавец знает о машине больше тебя. Съезди на осмотр, найди дефекты — каждый станет рычагом в торге. А по средам и субботам — аукцион штрафстоянки.', hl: 'market' },
    { id: 'hire', cond: S => S.day >= 2 && S.pawns.length === 1, text: 'Один ты долго не протянешь: пока ты у стойки — подъёмник простаивает. В «Людях» (3) есть кандидаты. У каждого видна одна черта, остальные вылезут через неделю. Пьющий гений или аккуратный ученик — решать тебе.', hl: 'people' },
    { id: 'build', cond: S => S.money > 1200 * WW.G.px() && S.day >= 2, text: 'Завелись деньги? В «Стройке» (5) — компрессор с пневмоинструментом: все работы станут на четверть быстрее. А компрессометр за копейки откроет тест, без которого мотор — чёрный ящик.', hl: 'build' },
    { id: 'race', cond: S => S.race && S.race.day === S.day, text: 'Суббота! Вечером заезды. Если есть своя машина на ходу — заявляйся во вкладке «Гонки». За руль сядет тот, у кого лучше «Вождение». Победил в субботу — продал в понедельник.', hl: 'race' },
    { id: 'payday', cond: S => WW.G.dow() === 4 && S.pawns.length > 1, text: 'Пятница — день зарплаты, воскресенье — платёж по ипотеке. Деньги в стоке зарплату не платят: следи за «Финансами», там прогноз.', hl: 'fin' }
  ];
  E.tutDone = function () { WW.S.tut.cur = null; };

  // ---------- ступень мастерской и цели акта I ----------
  E.stage = function () {
    const S = WW.S, bays = G().slotList().filter(s => s.kind === 'bay').length, rep = G().rep(), n = P().staff().length;
    if (bays >= 4 && rep >= 60 && S.pawns.some(p => p.role === 'recep')) return { n: 3, name: 'Сервис-центр' };
    if (rep >= 45 && n >= 1) return { n: 2, name: 'Мастерская' };
    return { n: 1, name: 'Гараж' };
  };
  E.goals = function () {
    const S = WW.S, st = S.stats;
    return [
      { t: 'Закрой 10 нарядов', v: Math.min(10, st.orders), m: 10 }, { t: 'Найми первого сотрудника', v: Math.min(1, st.hired), m: 1 },
      { t: 'Продай машину с прибылью', v: st.best > 0 ? 1 : 0, m: 1 }, { t: 'Репутация 50', v: Math.min(50, Math.round(G().rep())), m: 50 },
      { t: 'Купи компрессор и построй бокс 3', v: (S.upg.air ? 1 : 0) + (S.upg.bay3 ? 1 : 0), m: 2 }, { t: 'Выиграй любую гонку', v: Math.min(1, st.wins), m: 1 },
      { t: 'Ступень «Сервис-центр»: 4 бокса, приёмщик, репутация 60', v: E.stage().n >= 3 ? 1 : 0, m: 1 }, { t: 'Выплати ипотеку', v: S.loan.bal <= 0 ? 1 : 0, m: 1 }
    ];
  };
  const ach = {
    first: ['Первый клиент', S => S.stats.orders >= 1], fifty: ['Пятьдесят нарядов', S => S.stats.orders >= 50], flip: ['Первый флип', S => S.stats.best > 0], bigflip: ['Перекуп: +$1000 с одной машины', S => S.stats.best >= 1000 * px()],
    boss: ['Работодатель', S => S.stats.hired >= 1], crew: ['Полная бригада: 6 человек', S => P().staff().length >= 6], rich: ['Десять тысяч в кассе', S => S.money >= 10000 * px()],
    racer: ['Победил в субботу', S => S.stats.wins >= 1], collector: ['Коллекционер: 5 разных моделей', S => new Set(Object.values(S.cars).filter(c => c.owner === 'player').map(c => c.model)).size >= 5],
    master: ['Мастер-механик: своя машина класса 1', S => Object.values(S.cars).some(c => c.owner === 'player' && C.cls(C.score(c)) === 1)], free: ['Свободен от банка', S => S.loan.bal <= 0 && S.day > 0],
    stars: ['Пять звёзд пять раз подряд', S => S.stats.stars.length >= 5 && S.stats.stars.slice(-5).every(x => x === 5)], center: ['Сервис-центр', S => E.stage().n >= 3], junkwin: ['Пять сотен: победа в Junkyard 24', S => !!S.ach.junkwin]
  };
  E.achNames = ach;
  E.achievements = function () {
    const S = WW.S;
    for (const id in ach) if (!S.ach[id] && ach[id][1](S)) { S.ach[id] = S.day + 1; G().note('Достижение: «' + ach[id][0] + '»', 'story'); }
    if (!S.act1 && E.goals().every(g => g.v >= g.m)) { S.act1 = S.day; G().note('Акт I «Заправка Попса» пройден: все цели выполнены. Мастерская встала на ноги — дальше песочница.', 'story'); WW.emit('act1'); }
  };
})(globalThis.WW);
