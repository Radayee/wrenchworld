// WRENCHWORLD — модальные окна: меню, итоги дня, события, аукцион, гонка, «вмешательство мастера».
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, O = WW.O, P = WW.P, M = WW.M, E = WW.E, R = WW.R, UI = WW.UI;
  const MOD = WW.MOD = { open: false, timers: [], key: null };
  const $ = id => document.getElementById(id), h = U.esc, $m = U.money, A = UI.act;
  const KEY = 'ww_release_v45m_';
  MOD.show = function (html, cls, key) { MOD.clear(); const b = $('modalBox'); b.className = cls || ''; b.innerHTML = html; $('modal').classList.remove('hidden'); MOD.open = true; MOD.key = key || null; b.scrollTop = 0; };
  MOD.hide = function () { MOD.clear(); $('modal').classList.add('hidden'); MOD.open = false; MOD.key = null; MOD.onKey = null; };
  MOD.clear = function () { MOD.timers.forEach(t => { clearInterval(t); clearTimeout(t); cancelAnimationFrame(t); }); MOD.timers = []; };
  const every = (f, ms) => { const t = setInterval(f, ms); MOD.timers.push(t); return t; };
  const later = (f, ms) => { const t = setTimeout(f, ms); MOD.timers.push(t); return t; };

  // ---------- сейвы ----------
  MOD.saveTo = function (slot) {
    const S = WW.S; if (!S) return false;
    try { localStorage.setItem(KEY + 'save_' + slot, G.save()); localStorage.setItem(KEY + 'meta_' + slot, JSON.stringify({ date: G.date(), money: Math.round(S.money), rep: Math.round(G.rep()), scn: D.scenarios[S.scn] ? D.scenarios[S.scn].n : '', at: Date.now() })); return true; }
    catch (e) { G.toast('Не удалось сохранить: ' + e.message, 'bad'); return false; }
  };
  MOD.meta = function (slot) { try { return JSON.parse(localStorage.getItem(KEY + 'meta_' + slot)); } catch (e) { return null; } };
  MOD.loadFrom = function (slot) {
    try { const j = localStorage.getItem(KEY + 'save_' + slot); if (!j || !G.load(j)) return false; WW.started = true; MOD.hide(); UI.close(); UI.setSpeed(0); R.fit(); UI.pops(null); UI.hud(true); if (WW.S.phase === 'summary') MOD.summary(); else if (WW.S.phase === 'over') MOD.over(); else if (WW.S.phase === 'race') MOD.race(); G.toast('Игра загружена. Стоит на паузе — жми Пробел.', 'info'); return true; }
    catch (e) { return false; }
  };
  WW.on('save', () => MOD.saveTo('auto'));

  // ---------- меню ----------
  MOD.menu = function () {
    const run = WW.started && WW.S && WW.S.phase !== 'over', am = MOD.meta('auto');
    let s = `<h1>WRENCH<span class="acc">WORLD</span></h1><div class="mut" style="margin-bottom:14px">Колони-сим про собственный автосервис · Rust Belt · v4.5m (ранний доступ)</div><div class="menu">`;
    if (run) s += `<button class="btn pri" data-a="mResume">▶ Вернуться в игру</button>`;
    else if (am) s += `<button class="btn pri" data-a="mLoad" data-s="auto">▶ Продолжить <span class="mut sm">— ${h(am.date)} · ${$m(am.money)}</span></button>`;
    s += `<button class="btn" data-a="mNew">Новая игра</button>`;
    if (run) s += `<button class="btn" data-a="mSaves" data-m="save">Сохранить</button>`;
    s += `<button class="btn" data-a="mSaves" data-m="load">Загрузить</button><button class="btn" data-a="mHelp">Как играть</button></div>
      <div class="row" style="margin-top:14px"><span class="mut">Громкость</span><input type="range" min="0" max="100" value="${Math.round(WW.A.vol * 100)}" data-i="vol"><span class="mut sm" style="margin-left:auto">Автосохранение — каждое игровое утро</span></div>`;
    MOD.show(s, '', 'menu');
  };
  A.menu = () => { if (MOD.open && MOD.key === 'menu') { if (WW.started) MOD.hide(); } else if (!MOD.open) MOD.menu(); };
  A.mResume = () => MOD.hide(); A.vol = (d, el) => WW.A.setVol(+el.value / 100);
  A.mLoad = d => { if (!MOD.loadFrom(d.s)) G.toast && WW.S && G.toast('Сейв не найден или повреждён.', 'bad'); };
  A.mSaves = d => {
    const mode = d.m; let s = `<h2>${mode === 'save' ? 'Сохранить игру' : 'Загрузить игру'}</h2><div class="menu">`;
    for (const sl of (mode === 'save' ? ['1', '2', '3'] : ['auto', '1', '2', '3'])) { const m = MOD.meta(sl); s += `<button class="btn" data-a="${mode === 'save' ? 'mSave' : 'mLoad'}" data-s="${sl}" ${!m && mode === 'load' ? 'disabled' : ''}>${sl === 'auto' ? 'Автосейв' : 'Слот ' + sl}: ${m ? h(m.scn) + ' · ' + h(m.date) + ' · ' + $m(m.money) + ' · реп. ' + m.rep + ' <span class="mut sm">(' + new Date(m.at).toLocaleString('ru-RU') + ')</span>' : '<span class="mut">пусто</span>'}</button>`; }
    MOD.show(s + `</div><div class="row" style="margin-top:12px">${btnB('← Назад', 'mBack')}</div>`, '', 'sub');
  };
  A.mSave = d => { if (MOD.saveTo(d.s)) { MOD.hide(); G.toast('Сохранено в слот ' + d.s + '.', 'good'); } };
  A.mBack = () => MOD.menu();
  const btnB = (t, a, cls, data) => `<button class="btn ${cls || ''}" data-a="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${h(v)}"`).join(' ')}>${t}</button>`;
  const trainingScenario = () => Object.keys(D.scenarios).find(id => D.scenarios[id].tutor);
  const isTraining = id => !!(D.scenarios[id] && D.scenarios[id].tutor);
  MOD.hasSaves = () => {
    try { return ['auto', '1', '2', '3'].some(slot => !!(localStorage.getItem(KEY + 'save_' + slot) || '').trim()); }
    catch (e) { return false; }
  };
  const recommendTraining = () => !MOD.hasSaves() && !!trainingScenario();
  MOD.confirmNoTraining = (s, site, start) => {
    MOD.pendingScenario = { s, site, start };
    MOD.show(`<h2>Уверен? Может, сначала обучение?</h2>
      <p>У тебя ещё нет сохранений. Обучение покажет, как принимать клиентов, ремонтировать машины и управлять автосервисом.</p>
      <p class="mut">Можно сразу играть в выбранный сценарий — решать тебе.</p>
      <div class="menu">${btnB('Выбрать обучение', 'mChooseTraining', 'pri')}${btnB(start ? 'Играть без обучения' : 'Всё равно выбрать', 'mWithoutTraining')}${btnB('Назад к сценариям', 'mScenarioBack')}</div>`, '', 'sub');
  };
  A.mChooseTraining = () => { const pending = MOD.pendingScenario; MOD.pendingScenario = null; MOD.approvedScenario = null; A.mNew({ s: trainingScenario(), site: pending && pending.site }); };
  A.mWithoutTraining = () => { const pending = MOD.pendingScenario; if (!pending) return; MOD.pendingScenario = null; MOD.approvedScenario = pending.s; if (pending.start) A.mStart(pending); else A.mNew(pending); };
  A.mScenarioBack = () => { MOD.pendingScenario = null; A.mNew(); };
  A.mNew = d => {
    const first = recommendTraining();
    const sel = (d && d.s) || MOD.selScn || (first ? trainingScenario() : 'legacy'), site = (d && d.site) || MOD.selSite || 'gas';
    if (first && !isTraining(sel) && MOD.approvedScenario !== sel) { MOD.confirmNoTraining(sel, site, false); return; }
    if (isTraining(sel)) MOD.approvedScenario = null;
    MOD.selScn = sel; MOD.selSite = site;
    let s = '<h2>Новая игра</h2><div class="grid2"><div><h3>Сценарий</h3><div class="col">';
    for (const id in D.scenarios) { const sc = D.scenarios[id]; s += `<div class="card scn ${first && !isTraining(id) ? 'scn-softgate' : ''} ${first && isTraining(id) ? 'scn-recommended' : ''} ${id === sel ? 'on' : ''}" data-a="mNew" data-s="${id}"><b>${h(sc.n)}</b>${first && isTraining(id) ? ' <span class="pill y">Рекомендуем</span>' : ''} <span class="pill">${sc.year}</span> <span class="pill g">${$m(sc.money)}</span>${sc.loan ? `<span class="pill r">ипотека ${$m(sc.loan)}</span>` : ''}<div class="sm mut">${h(sc.d)}</div></div>`; }
    s += '</div></div><div><h3>Участок</h3><div class="col">';
    for (const id in D.sites) { const st = D.sites[id]; s += `<div class="card scn ${id === site ? 'on' : ''}" data-a="mNew" data-s="${sel}" data-site="${id}"><b>${st.i} ${h(st.n)}</b> <span class="pill">клиенты ×${st.clients}</span><span class="pill ${st.loan > 1 ? 'r' : 'g'}">кредит ×${st.loan}</span><div class="sm mut">${h(st.d)}</div></div>`; }
    s += `</div></div></div><div class="row" style="margin-top:12px">${btnB('← Назад', 'mBack')}<span style="flex:1"></span>${btnB('Начать →', 'mStart', 'pri', { s: sel, site })}</div>`;
    MOD.show(s, 'mwide', 'sub');
  };
  A.mStart = d => {
    if (recommendTraining() && !isTraining(d.s) && MOD.approvedScenario !== d.s) { MOD.confirmNoTraining(d.s, d.site, true); return; }
    MOD.pendingScenario = null; MOD.approvedScenario = null;
    G.newGame(d.s, null, d.site); WW.started = true; UI.buildOff && UI.buildOff(); MOD.hide(); UI.close(); UI.pops(null); R.fit(); UI.setSpeed(1); UI.hud(true); WW.A.play('bell');
  };
  A.mHelp = () => MOD.show(`<h2>Как играть</h2>
    <p>Ты — хозяин гаража, а не механик с ключом. Время идёт само: <kbd>Пробел</kbd> — пауза, <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> — скорость ×1/×8/×16/×32. Карта: колёсико — зум, перетаскивание — сдвиг, клик по машине или человеку — карточка. <kbd>1</kbd>–<kbd>9</kbd> — панели, <kbd>Esc</kbd> — закрыть.</p>
    <h3>Три реки денег</h3>
    <p><b>Сервис.</b> Клиент приезжает с жалобой. Наряд идёт: приём → диагностика → смета → согласование → детали → работа → ОТК → выдача. Что сломано — скрыто туманом: тесты сужают диапазон состояния узлов. Ошибся с диагнозом — поменял не то, клиент вернётся по гарантии.</p>
    <p><b>Флип.</b> В «Рынке» объявления и аукцион. Продавец знает о машине больше тебя: осмотр и отчёт по VIN дают рычаги для торга. Чини, отмывай, выставляй на витрину у дороги. Сток на улице деградирует каждый день.</p>
    <p><b>Склад и станки.</b> Со своих машин детали снимаются (кнопка «С» в наряде) и ложатся на склад. На станке деталь можно починить ремкомплектом или собрать одну из двух дохлых. У ремонта есть шанс успеха — зависит от навыка. Ремонт узла на машине тоже требует станка нужного типа.</p>
    <p><b>Боксы и стройка.</b> Автоматика сама гоняет машины между боксом и стоянкой, но ты можешь приказать: «Взять в работу сейчас» или «На стоянку». Машину не на ходу по участку катят люди с приоритетом «Перегон» — медленно; привозит и увозит её эвакуатор. В «Стройке» ставь подъёмники, места, стены, крышу и станки где хочешь.</p>
    <p><b>Дороги и зоны.</b> Машины ездят только по асфальту, места под машины — тоже проезжие клетки, пока пустые: место за местом запирает дальнюю машину. Зоны красятся по клеткам и работают, когда внутри есть всё нужное (как комнаты в Prison Architect). Кнопки «Зоны» и «Проезд» справа внизу подсвечивают, что не так.</p>
    <p><b>Клиенты.</b> Один доверяет мастеру и согласится обновить полмашины, другой считает каждый цент, а редкий скандалист решит, что его дурят, и откажется от всех допов. Характер видно, если у того, кто принимает, хорошее «Общение».</p>
    <p><b>Гонки.</b> По субботам — брекеты, автокросс, раз в сезон — Junkyard 24. Едет машина из реально установленных деталей и пилот из твоей команды.</p>
    <h3>Люди</h3>
    <p>У каждого навыки 0–20, страсти, 2–3 черты (видна одна), настроение. В «Людях» задаются приоритеты работ 1–3. Время работы = нормо-часы × навык × инструмент × ржавчина × знакомство с платформой × настроение × усталость. Наведи на любую цифру — увидишь «почему?».</p>
    <h3>Деньги</h3>
    <p>Каждый день — коммуналка, по пятницам — зарплата, по воскресеньям — ипотека. Три дня подряд в глубоком минусе или два пропущенных платежа — банкротство.</p>
    <div class="row" style="margin-top:12px">${btnB('← Назад', 'mBack')}</div>`, '', 'sub');

  // ---------- итоги дня ----------
  MOD.summary = function () {
    const S = WW.S, m = S.summary; if (!m) return; UI.close();
    let rows = ''; for (const c in G.catName) { const v = m.fin[c]; if (v && c !== 'taxHeld') rows += `<tr><td>${G.catName[c]}</td><td class="r ${v > 0 ? 'good' : 'bad'}">${$m(v)}</td></tr>`; }
    const st = m.stars, avg = st.length ? (st.reduce((a, b) => a + b, 0) / st.length).toFixed(1) : null, dw = m.day % 7;
    let s = `<div class="row"><h1 style="flex:1">Итоги дня ${m.day + 1}</h1>${m.net >= 0 ? '<span class="stamp">В ПЛЮСЕ</span>' : ''}</div><div class="mut">${D.dow[dw]} · мастерская закрыта, сигнализация включена.</div>
      <div class="grid3" style="margin:12px 0"><div class="card"><div class="mut sm">Доход</div><b class="good big" style="font-size:20px">${$m(m.inc)}</b></div><div class="card"><div class="mut sm">Расход</div><b class="bad big" style="font-size:20px">${$m(m.exp)}</b></div><div class="card"><div class="mut sm">Итог дня</div><b class="big ${m.net >= 0 ? 'good' : 'bad'}" style="font-size:20px">${$m(m.net)}</b></div></div>
      <div class="grid2"><div><h3>По статьям</h3><table>${rows || '<tr><td class="mut">Движений не было.</td></tr>'}</table></div><div><h3>Три реки</h3><table><tr><td>Сервис</td><td class="r">${$m(m.riv.service)}</td></tr><tr><td>Флип</td><td class="r">${$m(m.riv.flip)}</td></tr><tr><td>Мотоспорт</td><td class="r">${$m(m.riv.race)}</td></tr></table>
      <h3>Мастерская</h3><div class="sm col"><div>Закрыто нарядов: <b>${m.closed}</b>${avg ? ' · средняя оценка <span class="acc">' + avg + ' ★</span>' : ''}</div><div>Репутация: <b>${Math.round(m.rep)}</b> · касса: <b class="${m.money < 0 ? 'bad' : ''}">${$m(m.money)}</b></div>${m.wages ? `<div>Пятница: выплачена зарплата ${$m(m.wages * 1.22)}</div>` : ''}${m.mort ? `<div>Воскресенье: платёж по ипотеке ${$m(m.mort)}, остаток ${$m(S.loan.bal)}</div>` : ''}<div>В работе осталось нарядов: ${Object.keys(S.orders).length} · машин на продаже: ${Object.values(S.cars).filter(c => c.sale).length}</div></div></div></div>`;
    const news = S.log.filter(l => l.d === m.day && (l.k === 'story' || l.k === 'bad')).slice(0, 5).reverse();
    if (news.length) s += '<h3>Что запомнилось</h3>' + news.map(l => `<div class="logl ${l.k}">${h(l.t)}</div>`).join('');
    const dw2 = (dw + 1) % 7, tm = []; if (dw2 === 2 || dw2 === 5) tm.push('аукцион штрафстоянки в 13:00'); if (dw2 === 5) tm.push('вечером гонки'); if (dw2 === 4) tm.push('зарплата'); if (dw2 === 6) tm.push('платёж по ипотеке'); if (S.offers.length) tm.push('покупатели ждут ответа по ' + S.offers.length + ' ' + U.plural(S.offers.length, 'машине', 'машинам', 'машинам'));
    s += `<div class="row" style="margin-top:14px"><span class="mut sm">Завтра: ${D.dow[dw2]}${tm.length ? ' — ' + tm.join(', ') : ''}.</span><span style="flex:1"></span>${btnB('Следующий день → <kbd>Enter</kbd>', 'nextDay', 'pri')}</div>`;
    MOD.show(s, '', 'summary'); MOD.onKey = k => { if (k === 'Enter' || k === ' ') A.nextDay(); };
  };
  A.nextDay = () => { MOD.hide(); G.nextDay(); if (UI.speed === 0) UI.setSpeed(UI.prev || 1); if (WW.pendingAct1) { WW.pendingAct1 = false; MOD.act1(); } };
  WW.on('dayend', () => MOD.summary());
  WW.on('act1', () => { WW.pendingAct1 = true; });
  MOD.act1 = () => MOD.show(`<h1>Акт I пройден 🏆</h1><p>«Заправка Попса» встала на ноги: команда, боксы, репутация, ни цента долга. Попс молча жмёт руку и уходит к своему пикапу. На зеркале у него болтается старый брелок деда.</p><p class="mut">Игра продолжается в режиме песочницы: время течёт, новые модели выходят на рынок, эпохи меняются.</p><div class="row" style="margin-top:12px">${btnB('Продолжить', 'mResume', 'pri')}</div>`);
  MOD.over = function () { const S = WW.S; MOD.show(`<h1 class="bad">Банкротство</h1><p>На ${S.day + 1}-й день банк забрал заправку. Попс молча снял вывеску.</p><p class="mut">Закрыто нарядов: ${S.stats.orders} · продано машин: ${S.stats.sold} · лучшая сделка: ${$m(S.stats.best)}</p><div class="menu" style="margin-top:12px">${btnB('Новая игра', 'mNew', 'pri')}${btnB('Загрузить', 'mSaves', '', { m: 'load' })}</div>`, '', 'over'); };
  WW.on('over', () => MOD.over());


  // ---------- какой срок назвать клиенту ----------
  MOD.due = function (id) {
    const S = WW.S, o = S.orders[id]; if (!o || !o.duePending) return; const car = S.cars[o.car], arch = D.arch[o.client.arch], op = O.dueOpts(o), base = op.norm.base;
    const row = (k, extra) => { const d = D.due[k], lc = O.leaveChance(o, d.k); return `<button class="btn" data-a="duePick" data-k="${k}" style="text-align:left"><div class="row"><b style="width:150px">${d.n}</b><span class="pill ${k === 'opt' ? 'g' : k === 'pess' ? 'y' : ''}">${k === 'opt' ? '−25%' : k === 'pess' ? '+50%' : '100%'}</span><b>${UI.fmtWhen(op[k].at)}</b><span class="mut sm">≈ ${U.dur(op[k].mins)} рабочего времени</span></div><div class="sm mut" style="margin-top:2px">${h(d.d)}${lc > 0 ? ' <span class="bad">Шанс, что этот клиент уедет: ' + Math.round(lc * 100) + '%.</span>' : ''}</div></button>`; };
    MOD.show(`<h2>Какой срок назвать?</h2><div class="row"><b>${h(o.client.name)}</b><span class="pill">${arch.n}</span><span class="mut">${h(C.name(car))}</span><span class="pill ${arch.pat < 30 ? 'r' : ''}">терпение: ${arch.pat < 30 ? 'низкое' : arch.pat < 60 ? 'среднее' : 'высокое'}</span></div>
      <div class="quote" style="margin:8px 0">${h(o.complaint)}</div>
      <p class="sm mut">Нормальный срок посчитан из очереди в боксы, типа работы и доставки деталей: ≈ ${U.dur(base)}. Уложился в названный срок — «Скорость» растёт, сделал заметно раньше — бонус. Опоздал — клиент запомнит именно обещание.</p>
      <div class="menu">${row('opt')}${row('norm')}${row('pess')}
      <div class="btn" style="cursor:default"><div class="row"><b style="width:150px">Свой срок</b><input type="number" id="duePct" min="40" max="400" step="5" value="${S.set.duePct || 100}" style="width:70px"> % от нормального <span id="dueCus" class="mut sm"></span><span style="flex:1"></span><button class="btn pri sm" data-a="duePick" data-k="custom">Назвать</button></div></div></div>
      <div class="row" style="margin-top:10px"><label${tip2('Этот вариант будет называться всем следующим клиентам без вопроса. Поменять можно на доске нарядов: «Сроки».')}><input type="checkbox" id="dueRem"> запомнить выбор и больше не спрашивать</label><span style="flex:1"></span><span class="mut sm"><kbd>Enter</kbd> — нормальный</span></div>`, '', 'due');
    const upd = () => { const el = $('duePct'), out = $('dueCus'); if (el && out) { const pc = U.clamp(+el.value || 100, 40, 400); out.textContent = '→ ' + UI.fmtWhen(G.addWork(base * pc / 100)); } };
    upd(); const el = $('duePct'); if (el) el.addEventListener('input', upd);
    A.duePick = d => { const rem = $('dueRem'), pe = $('duePct'), pct = U.clamp(pe ? (+pe.value || 100) : 100, 40, 400); if (rem && rem.checked) { S.set.due = d.k; S.set.duePct = pct; } if (d.k === 'custom') S.set.duePct = pct; MOD.hide(); O.setDue(o, d.k, pct); nextDue(); };
    MOD.onKey = k => { if (k === 'Enter') A.duePick({ k: 'norm' }); };
    WW.A.play('ping');
  };
  const tip2 = t => ' data-tip="' + h(t) + '"';
  function nextDue() { const S = WW.S; for (const id in S.orders) if (S.orders[id].duePending) { MOD.due(+id); return; } }
  WW.on('due', id => { if (!MOD.open) MOD.due(id); });

  // ---------- события с выбором ----------
  WW.on('event', id => {
    const d = E.defs[id];
    MOD.show(`<h2>${h(d.title)}</h2><p>${h(d.text)}</p><div class="menu">${d.choices.map((c, i) => `<button class="btn" data-a="evPick" data-i="${i}"><b>${h(c.t)}</b>${c.d && c.d() ? ' <span class="mut sm">— ' + h(c.d()) + '</span>' : ''}</button>`).join('')}</div>`, '', 'event'); WW.A.play('ping');
  });
  A.evPick = d => { MOD.hide(); E.choose(+d.i); nextDue(); };

  // ---------- «вмешательство мастера»: скилл-чек на тайминг ----------
  WW.on('interv', e => {
    const S = WW.S, o = S.orders[e.o]; if (!o) return; const j = o.jobs.find(x => x.id === e.j), car = S.cars[o.car]; if (!j) return;
    const zc = .38 + Math.random() * .24;
    MOD.show(`<h2>Вмешательство мастера</h2><p><b>${h(j.name)}</b> — ${h(C.name(car))}. Критический шаг: метки ГРМ, момент затяжки, последний слой. Останови маркер в зелёной зоне.</p><div class="ivb"><div class="z1" style="left:${(zc - .17) * 100}%;width:34%"></div><div class="z2" style="left:${(zc - .055) * 100}%;width:11%"></div><div class="mk" id="ivm"></div></div><div class="row"><span class="mut sm">Зелёная зона: +20 к качеству · жёлтая: +10 · мимо: +5. Отключается в «Финансах».</span><span style="flex:1"></span>${btnB('СТОП <kbd>Пробел</kbd>', 'ivStop', 'pri')}</div><div id="ivr" class="big" style="margin-top:10px;min-height:34px"></div>`, '', 'interv');
    const t0 = performance.now(); let pos = 0, done = false;
    const tick = () => { if (done) return; const t = (performance.now() - t0) / 1000; pos = .5 + .5 * Math.sin(t * 3.4 - 1.57); const mk = $('ivm'); if (mk) mk.style.left = 'calc(' + pos * 100 + '% - 2px)'; MOD.timers.push(requestAnimationFrame(tick)); };
    tick();
    A.ivStop = () => { if (done) return; done = true; const d = Math.abs(pos - zc), b = d < .055 ? 20 : d < .17 ? 10 : 5; O.intervDone(e.o, e.j, b); $('ivr').innerHTML = `<span class="${b === 20 ? 'good' : b === 10 ? 'acc' : 'mut'}">+${b} к качеству${b === 20 ? ' — рука мастера!' : ''}</span>`; WW.A.play(b === 20 ? 'win' : 'done'); later(() => MOD.hide(), 900); };
    MOD.onKey = k => { if (k === ' ' || k === 'Enter') A.ivStop(); };
  });

  // ---------- аукцион ----------
  MOD.auction = function () {
    const S = WW.S, a = S.auction; if (!a || a.done) return;
    let li = a.lots.findIndex(l => !l.done); if (li < 0) { M.aucEnd(); return; }
    const feed = []; let left = 7, lot, nextAI = 0;
    const draw = () => {
      lot = a.lots[li]; const car = S.cars[lot.car], v = C.valueRange(car), you = lot.leader === 'you';
      $('modalBox').innerHTML = `<div class="row"><h2 style="flex:1">🔨 Аукцион штрафстоянки · лот ${li + 1} из ${a.lots.length}</h2><span class="mut">в кассе ${$m(S.money)}</span></div>
        <div class="auc"><div><canvas id="aucCv" width="520" height="240"></canvas><div class="sm mut" style="margin-top:4px">${lot.runs ? 'едет' : '<span class="bad">не едет</span>'} · ${D.titles[car.title].n} · ${car.miles.toLocaleString('en-US')} миль</div><div class="sm">Наша оценка вслепую: <b>${$m(v[0])} – ${$m(v[1])}</b></div><div class="sm mut">Кузов ${car.nodes.panels.lo}–${car.nodes.panels.hi}%, салон ${car.nodes.interior.lo}–${car.nodes.interior.hi}%. Остальное — после покупки.</div></div>
        <div><b style="font-size:16px">${h(C.name(car))}</b> <span class="mut">${h(car.colorName)}</span><div style="margin:6px 0">Текущая ставка: <span class="big ${you ? 'good' : ''}">${$m(lot.cur)}</span> <span class="mut">${lot.leader == null ? 'ставок нет' : you ? '— твоя' : '— ' + h(D.bidders[lot.leader].n)}</span></div>
        <div class="timer"><i id="aucT" style="width:${left / 7 * 100}%"></i></div><div class="bids" id="aucF">${feed.slice(-9).map(x => `<div>${x}</div>`).join('')}</div>
        <div class="row" style="margin-top:8px">${btnB('Ставка ' + $m(lot.cur + lot.inc), 'aucBid', 'pri')}${btnB('Пропустить лот', 'aucSkip')}<span style="flex:1"></span>${btnB('Уйти с аукциона', 'aucLeave', 'red')}</div></div></div>`;
      R.drawThumb($('aucCv'), car); const f = $('aucF'); f.scrollTop = 9999;
    };
    const closeLot = () => {
      const who = lot.leader === 'you' ? 'Продано тебе' : lot.leader == null ? 'Нет ставок — лот снят' : 'Продано: ' + D.bidders[lot.leader].n;
      WW.A.play('gavel'); feed.push('<b class="acc">— ' + who + ' за ' + $m(lot.cur) + '!</b>'); M.aucClose(lot);
      li = a.lots.findIndex(l => !l.done); if (li < 0) { M.aucEnd(); MOD.hide(); G.toast('Аукцион окончен.', 'info'); UI.render(true); return; }
      left = 7; nextAI = 1 + Math.random() * 2; feed.push('<span class="mut">Следующий лот…</span>'); draw();
    };
    MOD.show('', 'mwide', 'auction'); nextAI = 1 + Math.random() * 1.5; draw();
    every(() => {
      left -= .1; nextAI -= .1; const t = $('aucT'); if (t) t.style.width = Math.max(0, left / 7 * 100) + '%';
      if (nextAI <= 0) { nextAI = .7 + Math.random() * 2.6; const b = M.aucAI(lot); if (b) { feed.push(`<span style="color:${b.col}">${h(b.n)}</span>: ${$m(lot.cur)}${Math.random() < .3 ? ' <span class="mut">«' + h(b.q) + '»</span>' : ''}`); left = 7; WW.A.play('tab'); draw(); } }
      if (left <= 0) closeLot();
    }, 100);
    A.aucBid = () => { if (M.aucBid(lot)) { feed.push('<b class="good">Ты: ' + $m(lot.cur) + '</b>'); left = 7; nextAI = .6 + Math.random() * 2; draw(); } };
    A.aucSkip = () => { if (lot.leader === 'you') { G.toast('Твоя ставка лидирует — отступать поздно.', 'bad'); return; } while (M.aucAI(lot)) { } feed.push('<span class="mut">Ты пропустил лот.</span>'); closeLot(); };
    A.aucLeave = () => { if (a.lots.some(l => !l.done && l.leader === 'you')) { G.toast('Твоя ставка лидирует — дождись молотка.', 'bad'); return; } MOD.hide(); };
  };

  // ---------- гонка ----------
  MOD.race = function () {
    const S = WW.S, r = S.race; UI.close(); const res = r.res || M.raceSim();
    const fin = () => `<div class="row" style="margin-top:12px"><span class="big ${res.win ? 'good' : ''}">${h(res.text)}</span>${res.prize ? `<span class="pill y">призовые ${$m(res.prize)}</span>` : ''}<span style="flex:1"></span>${btnB('В мастерскую →', 'raceDone', 'pri')}</div>`;
    A.raceDone = () => { MOD.hide(); M.raceFinish(); };
    if (res.type === 'drag') {
      let ri = 0;
      const play = () => {
        const rd = res.rounds[ri], you = rd.you, opp = rd.opp;
        MOD.show(`<h2>${h(r.name)} · ${rd.name}</h2><div class="row sm"><span class="pill b">Ты: ${h(res.car)} — ${h(res.driver)}, dial-in ${you.dial.toFixed(2)}</span><span class="pill r">${h(opp.name)}: ${h(opp.car)}, dial-in ${opp.dial.toFixed(2)}</span></div><canvas class="race" id="rcv" width="900" height="260" style="margin-top:8px"></canvas><div id="rres"></div>`, 'mwide', 'race');
        const cv = $('rcv'), c = cv.getContext('2d'), t0 = performance.now(), K = 2.6, hd = opp.dial - you.dial; // фора: медленный уходит раньше
        const sy = Math.max(0, hd) + 2.2, so = Math.max(0, -hd) + 2.2; let shown = false, lastTree = -1;
        const frame = () => {
          const t = (performance.now() - t0) / 1000 * K; c.fillStyle = '#22252a'; c.fillRect(0, 0, 900, 260); c.fillStyle = '#34383d'; c.fillRect(0, 50, 900, 160);
          c.strokeStyle = '#E8D36A'; c.setLineDash([18, 14]); c.beginPath(); c.moveTo(0, 130); c.lineTo(900, 130); c.stroke(); c.setLineDash([]); c.fillStyle = '#fff'; c.fillRect(70, 50, 3, 160); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#111'; c.fillRect(840, 50 + i * 20, 8, 20); }
          const lane = (st, o, y, col, isYou) => {
            const tg = t - st; const lit = tg < -1.5 ? 0 : tg < -1 ? 1 : tg < -.5 ? 2 : tg < 0 ? 3 : 4; if (isYou && lit !== lastTree) { lastTree = lit; if (lit > 0) WW.A.play(lit === 4 ? 'go' : 'tree'); }
            for (let i = 0; i < 3; i++) { c.fillStyle = lit > i && lit < 4 ? '#FBC02D' : '#3a3a30'; c.beginPath(); c.arc(40, y - 16 + i * 12, 4.5, 0, 7); c.fill(); } c.fillStyle = lit === 4 ? (o.red ? '#E53935' : '#4CAF50') : '#2a3a2a'; c.beginPath(); c.arc(40, y + 22, 5.5, 0, 7); c.fill();
            const run = tg - (o.rt - .5); let f = run <= 0 ? 0 : Math.min(1, Math.pow(run / o.et, 1.75)); if (o.dnf) f = Math.min(f, .45);
            const x = 74 + f * 770; c.save(); c.translate(x, y); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-26, -9, 54, 22); c.fillStyle = col; c.beginPath(); c.roundRect(-28, -11, 54, 22, 6); c.fill(); c.fillStyle = '#1d2a33'; c.fillRect(-8, -8, 16, 16); c.restore();
            if (o.dnf && f >= .45) { c.fillStyle = 'rgba(200,200,200,.5)'; c.beginPath(); c.arc(x - 30 - (t * 20) % 30, y, 10 + (t * 9) % 12, 0, 7); c.fill(); }
            if (run > 0 && f < 1 && f < .12) { c.fillStyle = 'rgba(220,220,220,.4)'; c.beginPath(); c.arc(x - 34, y, 9, 0, 7); c.fill(); }
            return run >= o.et || (o.dnf && run > o.et);
          };
          const a = lane(sy, you, 92, '#3B82F6', true), b = lane(so, opp, 168, '#b0563c', false);
          c.fillStyle = '#fff'; c.font = '12px system-ui'; c.fillText('ТЫ', 8, 96); c.fillText('СОПЕРНИК', 8, 240);
          if ((a && b || t > Math.max(sy, so) + Math.max(you.et, opp.et) + 1.5) && !shown) {
            shown = true; WW.A.play(rd.win ? 'win' : 'bad'); const slip = (o, me) => `<td>${me ? 'Ты' : h(opp.name)}</td><td class="r ${o.red ? 'bad' : ''}">${o.rt.toFixed(3)}${o.red ? ' фальстарт' : ''}</td><td class="r">${o.dnf ? 'сход: ' + h(o.dnf) : o.et.toFixed(3)}</td><td class="r">${o.dial.toFixed(2)}</td><td class="r ${o.bo ? 'bad' : ''}">${o.dnf ? '—' : (o.et - o.dial >= 0 ? '+' : '') + (o.et - o.dial).toFixed(3) + (o.bo ? ' брейкаут' : '')}</td><td class="r">${o.dnf ? '—' : o.mph + ' миль/ч'}</td>`;
            $('rres').innerHTML = `<table style="margin-top:8px"><tr><th>Тайм-слип</th><th class="r">Реакция</th><th class="r">Время</th><th class="r">Dial-in</th><th class="r">От прогноза</th><th class="r">Финиш</th></tr><tr>${slip(you, 1)}</tr><tr>${slip(opp, 0)}</tr></table>` + (ri < res.rounds.length - 1 ? `<div class="row" style="margin-top:10px"><span class="big good">Проходим дальше!</span><span style="flex:1"></span>${btnB('Следующий заезд →', 'raceNext', 'pri')}</div>` : fin());
            return;
          }
          MOD.timers.push(requestAnimationFrame(frame));
        };
        frame();
      };
      A.raceNext = () => { ri++; play(); }; play();
    } else if (res.type === 'autox') {
      MOD.show(`<h2>${h(r.name)}</h2><p class="mut">${h(res.car)} · пилот ${h(res.driver)}. Три попытки, в зачёт — лучшая. Сбитый конус: +2 секунды.</p><table id="rt"><tr><th>Попытка</th><th class="r">Время</th><th class="r">Конусы</th><th class="r">В зачёт</th></tr></table><div id="rres"></div>`, '', 'race');
      res.runs.forEach((x, i) => later(() => { $('rt').insertAdjacentHTML('beforeend', `<tr><td>№${i + 1}</td><td class="r">${x.t.toFixed(3)}</td><td class="r ${x.cones ? 'bad' : ''}">${x.cones || '—'}</td><td class="r ${x.tot === res.best ? 'good b' : ''}">${x.tot.toFixed(3)}</td></tr>`); WW.A.play(x.cones ? 'bad' : 'done'); }, 700 + i * 1100));
      later(() => { $('rres').innerHTML = '<h3>Протокол</h3><table>' + res.field.map((f, i) => `<tr class="${f.you ? 'good b' : ''}"><td>${i + 1}</td><td>${h(f.name)}</td><td class="mut">${h(f.car)}</td><td class="r">${f.t.toFixed(3)}</td></tr>`).join('') + '</table>' + fin(); WW.A.play(res.win ? 'win' : 'ping'); }, 700 + 3 * 1100 + 500);
    } else {
      MOD.show(`<h2>${h(r.name)}</h2><p class="mut">${h(res.car)} · за рулём ${h(res.driver)} и вся команда по очереди. 24 часа, 20 экипажей на машинах «за пятьсот долларов».</p><div class="bids" id="jl" style="height:260px"></div><div id="rres"></div>`, '', 'race');
      const lg = [{ t: '10:00 — зелёный флаг! Двадцать вёдер с болтами уходят на первый круг.' }].concat(res.log);
      lg.forEach((x, i) => later(() => { const el = $('jl'); el.insertAdjacentHTML('beforeend', `<div class="${x.bad ? 'bad' : ''}" style="margin:3px 0">${h(x.t)}</div>`); el.scrollTop = 9999; if (x.bad) WW.A.play('bad'); }, 500 + i * 650));
      later(() => { $('rres').innerHTML = `<div class="row sm" style="margin-top:8px"><span class="pill">кругов: ${res.laps}</span><span class="pill">остановок на ремонт: ${res.stops}</span><span class="pill y">место: ${res.place} из 20</span></div>` + fin(); WW.A.play(res.win ? 'win' : 'ping'); }, 700 + lg.length * 650);
    }
  };
  WW.on('race', () => MOD.race());
})(globalThis.WW);
