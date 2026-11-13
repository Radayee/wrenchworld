// WRENCHWORLD — «Школа Попса»: обучающий сценарий. Пока он идёт, игра пускает только туда, куда показывает Попс,
// и ведёт по всем механикам: время, приём и сроки, диагностика и схема, грейды и смета, работа и оплата,
// старые детали и отходы, люди, стройка и зоны, свои машины и кузов с мини-игрой, б/у по телефону, рынок, город, гонки, финансы.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, O = WW.O, N = WW.N, R = WW.R, UI = WW.UI, MOD = WW.MOD, P = WW.P;
  const $ = id => document.getElementById(id), h = U.esc, A = UI.act;
  const T = WW.TUT = {};
  D.scenarios = Object.assign({ tutor: { n: '«Школа Попса» — обучение', d: 'Рекомендуем начать с него. Старая заправка, 1988 год. Попс за руку проведёт по всем механикам: пока обучение не пройдено, жать можно только то, что он показывает.', year: 1988, money: 3000, loan: 20000, cars: 3, skill: 10, tut: 0, tutor: 1 } }, D.scenarios);
  const q = s => document.querySelector(s);
  const ord = () => Object.values(WW.S.orders).find(o => o.type !== 'own' && o.tutor);
  const own = () => Object.values(WW.S.orders).find(o => o.type === 'own');
  const qf = k => !!(WW.S.qf && WW.S.qf[k]);
  // шаг: t — текст; el — что подсветить; done — когда шаг выполнен; run — скорость времени; next — кнопка «Далее»; prep — подготовка; map — разрешить карту
  T.steps = [
    { t: 'Ну, здравствуй, хозяин! Я Попс. Эта заправка теперь твоя — вместе с кредитом. Сейчас я покажу всё, что нужно знать. Пока учимся, жми только то, что я подсвечиваю — остальное заблокировано.', next: 1 },
    { t: 'Время в мастерской идёт само. Наверху — дата, часы, погода, деньги и скорость. Запусти время: нажми «×8».', el: '#tSpeed [data-v="8"]', done: () => UI.speed === 8, prep: () => { UI.setSpeed(0); } },
    { t: 'Слышишь колокольчик? Едет первый клиент. Подождём, пока он дойдёт до стойки и я его выслушаю.', run: 8, done: () => MOD.key === 'due', prep: () => { if (!ord()) { const o = O.arrive({ type: 'client', min: WW.S.min, arch: 'retiree', model: 'caprio', fault: { node: 'pads', sym: 'brake_bad' } }); if (o) { o.tutor = 1; o.client.temper = 'normal'; o.client.read = true; } } } },
    { t: 'Клиент ждёт, когда починим. Срок называешь ты: оптимистичный радует, но опоздание бьёт сильнее; пессимистичный — с запасом, но нетерпеливые уезжают. Сейчас выбери «Нормальный».', el: '[data-a="duePick"][data-k="norm"]', done: () => ord() && ord().due },
    { t: 'Вся работа — на доске нарядов. Открой «Наряды». Следующим клиентам срок я буду называть сам — «нормальный»; поменять можно на доске.', el: '#nav_orders', done: () => UI.view && UI.view.p === 'orders', prep: () => { UI.setSpeed(0); WW.S.set.due = 'norm'; } },
    { t: 'Вот карточка клиента. Нажми на неё.', el: () => ord() && q('.kc[data-id="' + ord().id + '"]'), done: () => UI.view && UI.view.p === 'order' },
    { t: 'Клиент говорит симптом, а что сломано — знает только машина. Я сам гоняю тесты: подождём результатов диагностики.', run: 8, done: () => ord() && ord().decide, map: 1 },
    { t: 'Это заказ-наряд. Схема машины показывает состояние узлов цветом: серое — неизвестно, от красного к зелёному — от убитого к целому. Посмотри машину сверху.', el: '[data-a="bpView"][data-v="top"]', done: () => UI.sub.bpView === 'top', prep: () => UI.setSpeed(0) },
    { t: 'Слои включают и выключают кузов, двигатель, трансмиссию, подвеску и электрику. Выключи «Кузов», чтобы заглянуть внутрь.', el: '[data-a="bpLayer"][data-v="body"]', done: () => !UI.sub.bpL.body },
    { t: 'Ниже — гипотезы: какие узлы вероятнее всего виноваты. Точность зависит от навыка «Диагностика»: новичок может прочитать прибор неверно. Нажми «Предложить по диагнозу».', el: '[data-a="suggest"]', done: () => ord() && ord().jobs.some(j => j.status === 'prop') },
    { t: 'Грейд детали решает всё: Б/у, эконом-аналог, аналог, OEM, премиум, гоночный. Смайлик рядом — как клиент на него посмотрит: пенсионер хочет оригинал, студент — подешевле, а OEM на ведро за $500 его возмутит. Наведи на смайлик, потом жми «Далее».', el: () => q('select[data-c="grade"]'), next: 1 },
    { t: 'Отправляй смету клиенту.', el: '[data-a="send"]', done: () => ord() && ord().stage !== 'diag' },
    { t: 'Дальше всё сами: согласование, детали едут фургоном, механик меняет, ОТК, расчёт. Старые детали по умолчанию кладём клиенту в коробку — это доверие. Включаю ×16, смотри на мастерскую.', run: 16, done: () => WW.S.stats.orders >= 1, map: 1, prep: () => UI.close() },
    { t: 'Первые деньги! Теперь склад: открой «Склад».', el: '#nav_stock', done: () => UI.view && UI.view.p === 'stock', prep: () => UI.setSpeed(0) },
    { t: 'Здесь отходы и жидкости. Общий мусор вывозят за деньги, а металлолом, шины и пластик — сдают за деньги, если есть свои контейнеры. Отработку — в ёмкость, иначе лужа и штраф. Можно и слить в канаву — но соседи смотрят.', el: () => q('[data-c="set"][data-k="oldParts"]'), next: 1 },
    { t: 'Одному не справиться. Открой «Люди».', el: '#nav_people', done: () => UI.view && UI.view.p === 'people' },
    { t: 'Найми кого-нибудь — видна одна черта, остальные вылезут в работе.', el: () => q('[data-a="hire"]'), done: () => WW.S.stats.hired >= 1 },
    { t: 'Специализация — готовый набор приоритетов: моторист, ходовик, электрик, кузовщик, приёмщик. Цифры 1–3 в таблице — что он делает в первую очередь. Выбери специализацию новенькому.', el: () => q('select[data-c="spec"]:not([data-id="' + WW.S.pawns[0].id + '"])'), next: 1 },
    { t: 'Теперь стройка: открой «Стройка».', el: '#nav_build', done: () => UI.view && UI.view.p === 'build' },
    { t: 'Поставим контейнер для металлолома — за старые железки нам будут платить. Выбери его.', el: () => q('.bcard[data-t="bin_metal"]'), done: () => R.build && R.build.t === 'bin_metal' },
    { t: 'Кликни на свободное место на участке — например, у ворот склада. R поворачивает, Esc — выход. Всё строится строго по клеткам.', map: 1, done: () => N.has('bin_metal'), prep: () => { if (WW.S.money < 500) G.money(500, 'misc'); } },
    { t: 'Готово. Выйди из стройки.', el: '#buildBar [data-a="buildOff"]', done: () => !R.build },
    { t: 'Зоны — как комнаты: работают, когда внутри всё нужное. Нажми «Зоны» справа внизу.', el: '#ovl [data-k="zones"]', done: () => R.overlay === 'zones' },
    { t: 'Видишь подписи: сервисный бокс, склад, офис. Красятся в «Стройке». А теперь — дедовы машины. Открой «Машины».', el: '#nav_cars', done: () => UI.view && UI.view.p === 'cars', prep: () => { R.overlay = null; UI.ovl && UI.ovl(); } },
    { t: 'Открой карточку первой машины.', el: () => q('#panel .lst[data-a="go"]'), done: () => UI.view && UI.view.p === 'car' },
    { t: 'Открой на неё наряд.', el: '[data-a="ownOrder"]', done: () => UI.view && UI.view.p === 'order' && own() },
    { t: 'Сначала осмотр: поставь тест «Осмотр вокруг машины».', el: '[data-a="test"][data-t="walk"]', done: () => own() && (own().tests.includes('walk') || own().done.includes('walk')) },
    { t: 'Кузов разобран по панелям: вмятины, краска, ржавчина. Работы на кузове, которые делает сам хозяин, — это мини-игры с бонусом к качеству. Нажми 🎨 у любой панели, и я дам тебе её покрасить.', el: () => q('[data-a="bjob"][data-k="paint"]:not([disabled])') || q('[data-a="bjob"][data-k="dent"]:not([disabled])'), done: () => own() && own().jobs.some(j => j.kind === 'body') },
    { t: 'Отправь работы в дело: «Заказать детали и в работу».', el: '[data-a="send"]', done: () => own() && own().stage === 'work' },
    { t: 'Когда хозяин дойдёт до кузова, откроется мини-игра. Не хочешь — пропусти, бонуса не будет. Время пошло!', run: 8, done: () => qf('mg') || (own() && own().jobs.every(j => j.kind !== 'body' || j.status === 'done')), map: 1, free: () => MOD.key === 'mg' },
    { t: 'Отлично. Б/у детали ищут по телефону: обзвони продавцов, послушай, кто врёт, и пошли человека забрать. Открой наряд и нажми «Обзвонить».', el: '[data-a="usedOpen"]', done: () => MOD.key === 'used', prep: () => { UI.setSpeed(0); const o = own(); if (o) UI.open('order', o.id); } },
    { t: 'Позвони кому-нибудь.', el: () => q('[data-a="uCall"]'), done: () => !!q('[data-a="uGet"]') },
    { t: 'Состояние «со слов» — не факт: могут сказать 80%, а там 30%. Или наоборот. Закрой окно — покупать сейчас не будем.', el: () => q('#modalBox [data-a="mResume"]'), done: () => !MOD.open },
    { t: 'Перекуп — в «Рынке»: объявления, осмотр, торг, аукцион штрафстоянки. Открой.', el: '#nav_market', done: () => UI.view && UI.view.p === 'market' },
    { t: 'Город: магазины, свалка, банк, конкурент — и живущие своей жизнью соседи. Открой «Город».', el: '#nav_city', done: () => UI.view && UI.view.p === 'city' },
    { t: 'По субботам — гонки клубной серии: сетап, трейлер с запчастями, живой заезд. Открой «Гонки».', el: '#nav_race', done: () => UI.view && UI.view.p === 'race' },
    { t: 'И последнее — «Финансы»: прибыль по трём рекам, ставки, кредит в банке.', el: '#nav_fin', done: () => UI.view && UI.view.p === 'fin' },
    { t: 'Всё, хозяин. Ты знаешь всё, что знаю я. Блокировки сняты, мастерская твоя. Держи $500 на удачу — и не забывай: деньги в стоке зарплату не платят!', next: 1, fin: 1 }
  ];
  T.on = () => WW.S && WW.S.tutor && WW.started;
  T.cur = () => T.on() ? T.steps[WW.S.tutor.i] : null;
  T.target = function (st) { if (!st || !st.el) return null; const e = typeof st.el === 'function' ? st.el() : q(st.el); return e || null; };
  // Guidance highlights the next action without intercepting normal input.
  T.tick = function () {
    let b = $('tutBubble');
    if (!T.on()) { if (b) b.remove(); document.querySelectorAll('.tut-hl').forEach(x => x.classList.remove('tut-hl')); return; }
    const S = WW.S, st = T.cur(); if (!st) return;
    if (!S.tutor.prep) {
      S.tutor.prep = 1; S.tutor.at = performance.now(); if (st.prep) st.prep();
      // Set the suggested pace once; respect subsequent player speed/pause changes.
      if (st.run) { if (!MOD.open) UI.setSpeed(st.run); }
      else if (!st.el || !/tSpeed/.test(st.el)) { if (UI.speed && !(st.done && st.done.toString().includes('UI.speed'))) UI.setSpeed(0); }
    }
    const t = T.target(st);
    document.querySelectorAll('.tut-hl').forEach(x => { if (x !== t) x.classList.remove('tut-hl'); }); if (t) t.classList.add('tut-hl');
    if (!b) { b = document.createElement('div'); b.id = 'tutBubble'; document.body.appendChild(b); }
    const stuck = performance.now() - (S.tutor.at || 0) > 90000;
    const html = `<div class="av">👴</div><div><div class="qh">Школа Попса · ${S.tutor.i + 1}/${T.steps.length}</div>${h(st.t)}${st.next ? `<div><button class="btn pri sm" id="tutNext">${st.fin ? 'Начать играть' : 'Далее →'}</button></div>` : ''}${stuck ? '<div><a href="#" id="tutSkip" class="sm">застрял? пропустить шаг</a></div>' : ''}</div>`;
    if (b.dataset.k !== S.tutor.i + ':' + stuck) { b.innerHTML = html; b.dataset.k = S.tutor.i + ':' + stuck; const nb = $('tutNext'); if (nb) nb.onclick = () => T.next(); const sk = $('tutSkip'); if (sk) sk.onclick = ev => { ev.preventDefault(); T.next(); }; }
    // позиция: рядом с целью, но не поверх неё
    const vw = window.innerWidth, vh = window.innerHeight, bw = 380; let x = vw / 2 - bw / 2, y = vh - 200;
    if (t) { const r = t.getBoundingClientRect(); x = U.clamp(r.left + r.width / 2 - bw / 2, 10, vw - bw - 10); y = r.bottom + 14; if (y + 150 > vh) y = Math.max(10, r.top - 160); }
    b.style.left = x + 'px'; b.style.top = y + 'px';
    if (st.done && st.done()) T.next();
  };
  T.next = function () {
    const S = WW.S, st = T.cur(); if (!st) return; WW.A.play('ping');
    if (st.fin) { S.tutor = null; G.money(Math.round(500 * G.px()), 'misc'); G.note('Обучение «Школа Попса» пройдено. Мастерская твоя!', 'story'); S.ach.tutor = S.day; UI.setSpeed(1); const b = $('tutBubble'); if (b) b.remove(); document.querySelectorAll('.tut-hl').forEach(x => x.classList.remove('tut-hl')); return; }
    S.tutor.i++; S.tutor.prep = 0;
  };
  WW.on('minigame', () => { if (WW.S) { WW.S.qf = WW.S.qf || {}; WW.S.qf.mg = 1; } });
  WW.on('tutorEnd', () => { const b = $('tutBubble'); if (b) b.remove(); });
  setInterval(T.tick, 150);
  // старт сценария
  const baseNew = G.newGame; G.newGame = function (scn, seed, site) { const tut = scn === 'tutor'; const S = baseNew(tut ? 'legacy' : scn, seed, tut ? 'gas' : site); if (tut) { S.scn = 'tutor'; S.tutor = { i: 0 }; S.set.tut = false; S.set.due = 'ask'; S.set.mg = true; } return S; };
})(globalThis.WW);
