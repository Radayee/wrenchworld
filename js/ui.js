// WRENCHWORLD — интерфейс: HUD, панели, тултипы «почему?». DOM строится из состояния, действия — через data-a.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, O = WW.O, P = WW.P, M = WW.M, E = WW.E, R = WW.R;
  const UI = WW.UI = { view: null, speed: 1, prev: 1, hold: false, last: 0, sub: {} };
  const $ = id => document.getElementById(id), h = U.esc, $m = U.money;
  const A = UI.act = {}, V = UI.views = {};
  const NAV = [['orders', 'Наряды'], ['cars', 'Машины'], ['people', 'Люди'], ['market', 'Рынок'], ['build', 'Стройка'], ['fin', 'Финансы'], ['race', 'Гонки'], ['log', 'Летопись'], ['goals', 'Цели']];
  const TITLES = { orders: 'Доска нарядов', order: 'Заказ-наряд', cars: 'Машины', car: 'Карточка машины', people: 'Люди', market: 'Рынок: объявления и аукцион', build: 'Стройка и оборудование', fin: 'Финансы', race: 'Гонки', log: 'Летопись мастерской', goals: 'Цели, достижения, энциклопедия' };
  const tip = t => ' data-tip="' + h(t) + '"';
  const btn = (label, a, data, cls, dis) => `<button class="btn ${cls || ''}" data-a="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${h(v)}"`).join(' ')} ${dis ? 'disabled' + tip(dis === true ? '' : dis) : ''}>${label}</button>`;
  const rbar = (lo, hi, inv) => { const mid = (lo + hi) / 2, c = D.condOf(inv ? 100 - mid : mid).c; return `<div class="bar"><i style="left:0;width:${lo}%;background:${c}"></i><i class="fog" style="left:${lo}%;width:${Math.max(0, hi - lo)}%"></i>${inv ? '' : '<u></u>'}</div>`; };
  const rtxt = (lo, hi) => hi - lo <= 3 ? Math.round((lo + hi) / 2) + '%' : hi - lo >= 95 ? '?' : lo + '–' + hi + '%';
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const when = e => e ? (e.day > WW.S.day ? (e.day - WW.S.day === 1 ? 'завтра ' : 'через ' + (e.day - WW.S.day) + ' дн. ') : '') + U.time(e.min) : '';
  UI.fmtWhen = when;

  // ---------- каркас ----------
  UI.init = function () {
    $('nav').innerHTML = NAV.map((n, i) => `<button data-a="panel" data-p="${n[0]}" id="nav_${n[0]}">${n[1]}<kbd>${i + 1}</kbd></button>`).join('');
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-a]'); UI.hold = false; if (!el || el.disabled) return;
      const f = A[el.dataset.a]; if (f) { WW.A.play('click'); f(el.dataset, el, e); UI.render(); UI.hud(true); }
    });
    document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (!el) return; const f = A[el.dataset.c]; if (f) { f(el.dataset, el); el.blur(); UI.render(); } });
    document.addEventListener('input', e => { const el = e.target.closest('[data-i]'); if (el) { const f = A[el.dataset.i]; if (f) f(el.dataset, el); } });
    $('panel').addEventListener('mousedown', () => { UI.hold = true; });
    document.addEventListener('mouseup', () => { setTimeout(() => { UI.hold = false; }, 50); });
    const tp = $('tip');
    document.addEventListener('mousemove', e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el || !el.dataset.tip) { tp.classList.add('hidden'); return; }
      tp.textContent = el.dataset.tip; tp.classList.remove('hidden');
      const w = tp.offsetWidth, hh = tp.offsetHeight; tp.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px'; tp.style.top = (e.clientY + 18 + hh > window.innerHeight ? e.clientY - hh - 10 : e.clientY + 18) + 'px';
    });
    WW.on('toast', t => UI.toast(t)); WW.on('radio', t => { const el = $('radioText'); el.textContent = t; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
    WW.on('tut', st => UI.pops(st));
    WW.on('money', m => { UI.moneyFlash = (UI.moneyFlash || 0) + m.amt; });
  };
  UI.open = function (p, id) { UI.view = { p, id: id == null ? null : +id }; UI.scroll = 0; R.sel = p === 'car' ? 'c' + id : null; if (p === 'order') { const o = WW.S.orders[id]; if (o) R.sel = 'c' + o.car; } UI.render(true); WW.A.play('tab'); };
  UI.close = function () { UI.view = null; R.sel = null; $('panel').classList.add('hidden'); UI.hud(true); };
  UI.go = function (act) {
    if (!act) return; const [k, id] = act;
    if (k === 'panel') UI.open(id); else if (k === 'order') { if (WW.S.orders[id]) UI.open('order', id); else UI.open('orders'); }
    else if (k === 'car') { if (WW.S.cars[id]) UI.open('car', id); } else if (k === 'pawn') { UI.sub.pawn = id; UI.open('people'); } else if (k === 'lst') UI.open('market');
  };
  UI.render = function (force) {
    const S = WW.S, v = UI.view, el = $('panel'); if (!S || !v) { el.classList.add('hidden'); return; }
    if (!force) { const ae = document.activeElement; if (UI.hold || (ae && el.contains(ae) && /INPUT|SELECT/.test(ae.tagName))) return; }
    if (v.p === 'order' && !S.orders[v.id]) { v.p = 'orders'; v.id = null; } if (v.p === 'car' && !S.cars[v.id]) { v.p = 'cars'; v.id = null; }
    const pb = el.querySelector('.pb'), sc = pb ? pb.scrollTop : 0, same = el.dataset.key === v.p + ':' + v.id;
    const back = v.p === 'order' ? btn('← Доска', 'panel', { p: 'orders' }, 'sm') : v.p === 'car' ? btn('← Машины', 'panel', { p: 'cars' }, 'sm') : '';
    el.innerHTML = `<div class="ph">${back}<h2>${TITLES[v.p]}</h2><button class="x" data-a="close">✕</button></div><div class="pb">${V[v.p](v.id)}</div>`;
    el.classList.remove('hidden'); el.classList.toggle('wide', v.p === 'orders'); el.dataset.key = v.p + ':' + v.id;
    if (same) el.querySelector('.pb').scrollTop = sc;
    el.querySelectorAll('canvas[data-bp]').forEach(cv => { const car = S.cars[cv.dataset.bp]; if (car) R.drawBlueprint(cv, car); });
    el.querySelectorAll('canvas[data-th]').forEach(cv => { const car = S.cars[cv.dataset.th]; if (car) R.drawThumb(cv, car); });
    UI.last = performance.now();
  };
  UI.tick = function () { const now = performance.now(); if (UI.view && now - UI.last > 650) UI.render(); if (now - (UI.hudT || 0) > 180) UI.hud(); };
  let shown = 0;
  UI.hud = function (force) {
    const S = WW.S; if (!S) return; UI.hudT = performance.now();
    $('tDate').textContent = G.date(); $('tClock').textContent = U.time(S.min); const w = D.weather[S.weather]; $('tWeather').textContent = w.i + ' ' + w.n;
    const st = E.stage(); $('tStage').innerHTML = `Ступень ${st.n}: <b>${st.name}</b>`;
    const rp = G.rep(), r = S.rep; $('tRep').innerHTML = `<span class="st">${stars(U.clamp(Math.round(rp / 20), 0, 5))}</span> ${Math.round(rp)}`;
    $('tRep').dataset.tip = `Репутация ${Math.round(rp)} из 100\nКачество ${Math.round(r.q)} · Честность ${Math.round(r.h)}\nСкорость ${Math.round(r.s)} · Цена ${Math.round(r.p)}\nОт неё зависит поток клиентов и покупателей.`;
    shown += (S.money - shown) * .25; if (Math.abs(S.money - shown) < 1) shown = S.money;
    const me = $('tMoney'); me.textContent = $m(shown); me.classList.toggle('neg', S.money < 0);
    document.querySelectorAll('#tSpeed button').forEach(b => b.classList.toggle('on', +b.dataset.v === UI.speed));
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', !!UI.view && (b.dataset.p === UI.view.p || (UI.view.p === 'order' && b.dataset.p === 'orders') || (UI.view.p === 'car' && b.dataset.p === 'cars'))));
    if (force || !UI.alT || performance.now() - UI.alT > 900) {
      UI.alT = performance.now(); const al = G.alerts(); UI.alerts = al;
      $('alerts').innerHTML = al.slice(0, 7).map((a, i) => `<div class="al s${a.sev}" data-a="alert" data-i="${i}">${h(a.text)}</div>`).join('') + (al.length > 7 ? `<div class="al mut">…и ещё ${al.length - 7}</div>` : '');
      const n = Object.values(S.orders).filter(o => o.type !== 'own' && ((o.stage === 'diag' && (o.decide || !o.tests.length)) || (o.findings && o.findings.length))).length;
      badge('orders', n); badge('cars', S.offers.length); badge('market', S.auction && S.auction.day === S.day && !S.auction.done && S.min >= S.auction.open ? '!' : 0); badge('race', S.race && S.race.day === S.day && !S.race.entry ? '!' : 0);
    }
  };
  function badge(p, n) { const b = $('nav_' + p); let s = b.querySelector('.bd'); if (!n) { if (s) s.remove(); return; } if (!s) { s = document.createElement('span'); s.className = 'bd'; b.appendChild(s); } s.textContent = n; }
  UI.toast = function (t) {
    const el = document.createElement('div'); el.className = 'toast ' + t.kind; el.textContent = t.text; if (t.act) el.onclick = () => UI.go(t.act);
    const box = $('toasts'); box.prepend(el); while (box.children.length > 5) box.lastChild.remove();
    setTimeout(() => el.remove(), 7500); if (t.kind === 'bad') WW.A.play('bad');
  };
  UI.pops = function (st) {
    const el = $('pops'); document.querySelectorAll('#nav button.hl').forEach(b => b.classList.remove('hl'));
    if (!st) { el.classList.add('hidden'); return; }
    el.innerHTML = `<div class="av">👴</div><b>Попс</b>${h(st.text)}<div><button data-a="tutOk">Понял</button> <button class="skip" data-a="tutOff">Отключить подсказки</button></div>`; el.classList.remove('hidden');
    if (st.hl) $('nav_' + st.hl).classList.add('hl'); WW.A.play('ping');
  };
  A.tutOk = () => { E.tutDone(); UI.pops(null); }; A.tutOff = () => { WW.S.set.tut = false; E.tutDone(); UI.pops(null); };
  A.panel = d => { if (UI.view && UI.view.p === d.p) UI.close(); else UI.open(d.p); };
  A.close = () => UI.close(); A.alert = d => UI.go(UI.alerts[+d.i] && UI.alerts[+d.i].act);
  A.go = d => UI.go([d.k, isNaN(+d.id) ? d.id : +d.id]);
  A.speed = d => UI.setSpeed(+d.v);
  UI.setSpeed = v => { if (v > 0) UI.prev = v; UI.speed = v; };
  A.mute = (d, el) => { WW.A.on = !WW.A.on; $('bMute').textContent = WW.A.on ? '🔊' : '🔇'; };

  // ---------- наряды ----------
  function ostatus(o) {
    const S = WW.S, car = S.cars[o.car], pw = o.busy != null ? P.byId(o.busy) : null, dk = o.desk != null ? P.byId(o.desk) : null;
    if (!o.arrived) return 'заезжает на площадку';
    if (o.stage === 'intake') return dk ? 'оформляет ' + dk.name.split(' ')[0] : 'ждёт у стойки ' + Math.round(S.min - o.t0) + ' мин';
    if (o.stage === 'diag') { if (pw && pw.task && pw.task.test) return D.tests[pw.task.test].n + ' — ' + pw.name.split(' ')[0]; if (o.tests.length) return (D.tests[o.tests[0]].bay && !G.inBay(car) ? 'ждёт бокс: ' : 'в очереди: ') + D.tests[o.tests[0]].n; return o.decide ? 'нужна смета' : 'выбери тесты'; }
    if (o.stage === 'approval') return dk ? dk.name.split(' ')[0] + ' звонит клиенту' : 'надо позвонить клиенту';
    if (o.stage === 'parts') { const j = o.jobs.filter(x => x.status === 'ordered').sort((a, b) => (b.eta.day - a.eta.day) || (b.eta.min - a.eta.min))[0]; return 'детали: ' + when(j && j.eta); }
    if (o.stage === 'work') { const j = o.jobs.find(x => x.status === 'doing'); if (j && pw) return (j.interv === 'wait' ? '⚠ ждёт мастера: ' : '') + j.name.replace(/^(Замена|Ремонт): /, '') + ' — ' + pw.name.split(' ')[0] + (j.tot && j.left != null ? ' ' + Math.round((1 - j.left / j.tot) * 100) + '%' : ''); return G.inBay(car) ? 'ждёт свободные руки' : car.mv ? 'едет в бокс' : 'очередь в бокс'; }
    if (o.stage === 'qc') return pw ? 'проверяет ' + pw.name.split(' ')[0] : 'ждёт ОТК';
    if (o.stage === 'ready') return o.clientHere ? (dk ? 'расчёт у стойки' : 'клиент ждёт расчёта') : 'клиент приедет ' + when({ day: o.pickDay, min: o.pickAt });
    return '';
  }
  UI.ostatus = ostatus;
  const late = o => o.due && (WW.S.day > o.due.day || (WW.S.day === o.due.day && WW.S.min > o.due.min));
  V.orders = function () {
    const S = WW.S, os = Object.values(S.orders), cl = os.filter(o => o.type !== 'own'), own = os.filter(o => o.type === 'own');
    let s = `<div class="row" style="margin-bottom:8px"><label${tip('Стандартный набор тестов по симптому ставится в очередь сам.')}><input type="checkbox" data-c="set" data-k="autoDiag" ${S.set.autoDiag ? 'checked' : ''}> Автодиагностика</label>
      <label${tip('Смета по самой вероятной гипотезе уходит клиенту без тебя. Удобно, но «пушка запчастей» стреляет чаще.')}><input type="checkbox" data-c="set" data-k="autoEst" ${S.set.autoEst ? 'checked' : ''}> Автосмета</label>
      <label${tip('Срочно из магазина (1–3 ч, розница) или дистрибьютор (завтра утром, −20%).')}><input type="checkbox" data-c="set" data-k="fast" ${S.set.fast ? 'checked' : ''}> Детали срочно</label>
      <span class="sp" style="flex:1"></span><span class="mut">Боксов: ${G.slotList().filter(x => x.kind === 'bay').length} · мест во дворе свободно: ${G.countFree('yard') + G.countFree('park')}</span></div><div class="kan">`;
    for (const st of O.stages) {
      const list = cl.filter(o => o.stage === st[0]);
      s += `<div class="kcol"><div class="kh"><span>${st[1]}</span><span class="mut">${list.length || ''}</span></div>` + list.map(o => {
        const car = S.cars[o.car], att = (o.stage === 'diag' && (o.decide || !o.tests.length) && !o.busy) || (o.findings && o.findings.length);
        return `<div class="kc ${att ? 'att' : ''} ${late(o) ? 'late' : ''} ${o.type === 'comeback' ? 'cb' : ''}" data-a="go" data-k="order" data-id="${o.id}"><div class="n">№${o.id} ${h(C.short(car))}${o.urgent ? ' ⚡' : ''}</div><div>${h(o.client.name)}${o.type === 'comeback' ? ' · <span class="bad">возврат</span>' : ''}</div><div class="s">${h(ostatus(o))}</div>${o.due ? `<div class="s ${late(o) ? 'bad' : ''}">срок: ${when(o.due)}</div>` : ''}</div>`;
      }).join('') + '</div>';
    }
    s += '</div>';
    if (!cl.length) s += '<p class="mut">Нарядов нет. Клиенты приезжают с 07:30 до 15:30 — чем выше репутация, тем их больше.</p>';
    s += '<h3>Свои машины в работе</h3>' + (own.length ? own.map(o => { const car = S.cars[o.car]; return `<div class="kc" style="margin:4px 0" data-a="go" data-k="order" data-id="${o.id}"><span class="n">№${o.id} ${h(C.name(car))}</span> · <span class="s">${h(ostatus(o))} · работ: ${o.jobs.filter(j => j.status === 'done').length}/${o.jobs.length}</span></div>`; }).join('') : '<p class="mut">Открой наряд на свою машину во вкладке «Машины».</p>');
    return s;
  };
  function jobRow(o, j, editable) {
    const S = WW.S; let st = '', c = '';
    if (j.status === 'prop') st = 'в смете' + (j.pA != null ? '' : ''); else if (j.status === 'declined') { st = 'клиент отказался'; c = 'mut'; }
    else if (j.status === 'ordered') st = '🚚 ' + when(j.eta); else if (j.status === 'ready') st = j.left != null ? 'пауза, осталось ' + U.dur(j.left) : (j.cons || !j.cost ? 'можно начинать' : '📦 деталь на складе');
    else if (j.status === 'doing') st = `<div class="pbar" style="width:90px"><i style="width:${j.tot ? Math.round((1 - (j.left || 0) / j.tot) * 100) : 0}%"></i></div>`; else if (j.status === 'done') st = `<span class="good">✔ качество ${j.q}</span>`;
    const pw = (o.assign && P.byId(o.assign)) || (j.by && P.byId(j.by)) || S.pawns[0];
    const tf = j.tf || P.tfact(pw, o, j);
    const tt = 'Почему столько времени? (' + pw.name + ')\nНорма по справочнику: ' + j.h.toFixed(1) + ' ч\n' + tf.f.map(x => x[0] + ': ×' + x[1].toFixed(2)).join('\n') + '\n= фактически ' + tf.h.toFixed(1) + ' ч' + (j.qa ? '\n\nКачество ' + j.q + ':\n' + j.qa.map(x => x[0] + ': ' + (x[1] >= 0 ? '+' : '') + Math.round(x[1])).join('\n') + '\n± случайность 8' : '');
    const grade = (j.kind === 'replace' && j.status === 'prop' && editable) ? `<select data-c="grade" data-o="${o.id}" data-j="${j.id}">${['used', 'econ', 'oem', 'sport'].map(g => `<option value="${g}" ${j.grade === g ? 'selected' : ''}>${D.grades[g].icon} ${D.grades[g].short}</option>`).join('')}</select>` : (j.grade ? `<span class="pill" style="border-color:${D.grades[j.grade].c}">${D.grades[j.grade].icon} ${D.grades[j.grade].short}</span>` : '');
    const price = o.type === 'own' ? $m(j.cost) : (j.free ? '<span class="acc">за наш счёт</span>' : `<span${tip('Счёт клиенту по позиции\nРабота: ' + j.h.toFixed(1) + ' ч × ' + $m(o.rate) + ' = ' + $m(j.labor) + '\nДеталь: ' + $m(j.cost) + ' + наценка ' + Math.round(S.set.markup * 100) + '% = ' + $m(j.pp) + '\nРасходники 5%: ' + $m(j.sup) + '\nСправедливая цена на рынке: ' + $m(j.fair) + (j.pA != null ? '\nШанс согласия был: ' + Math.round(j.pA * 100) + '%' : ''))}>${$m(j.total)}</span>`);
    let ac = '';
    if (j.status === 'prop' || j.status === 'declined') ac += btn('✕', 'jobDel', { o: o.id, j: j.id }, 'sm');
    if (o.type !== 'own' && o.type !== 'comeback' && j.status !== 'declined') ac += ' ' + btn(j.free ? 'выставить' : 'за наш счёт', 'jobFree', { o: o.id, j: j.id }, 'sm');
    return `<tr class="${c}"><td>${h(j.name)}</td><td>${grade}</td><td class="r"${tip(tt)}>${j.h.toFixed(1)} ч <span class="mut">→ ${tf.h.toFixed(1)}</span></td><td class="r">${price}</td><td>${st}</td><td class="r">${ac}</td></tr>`;
  }
  V.order = function (id) {
    const S = WW.S, o = S.orders[id], car = S.cars[o.car], m = C.model(car), own = o.type === 'own';
    const edit = own || o.stage === 'diag' || o.stage === 'work' || o.stage === 'parts';
    const si = O.stages.findIndex(x => x[0] === o.stage);
    let s = `<div class="row"><span class="big" style="font-size:18px">№${o.id}</span> <a class="acc" data-a="go" data-k="car" data-id="${car.id}" style="cursor:pointer;font-weight:700;font-size:15px">${h(C.name(car))}</a> <span class="mut">${h(car.colorName)} · ${car.miles.toLocaleString('en-US')} миль · ${car.slot ? (G.slot(car.slot).n || ({ yard: 'двор', park: 'парковка', proj: 'проекты', sale: 'витрина' })[G.kindOf(car)]) : 'в пути'}</span><span style="flex:1"></span>${btn('Показать на карте', 'focus', { id: car.id }, 'sm')}</div>`;
    if (!own) {
      s += `<div class="steps">${O.stages.map((x, i) => `<span class="${i === si ? 'on' : i < si ? 'dn' : ''}">${x[1]}</span>`).join('')}</div>`;
      s += `<div class="row"><b>${h(o.client.name)}</b> <span class="pill">${D.arch[o.client.arch].n}</span>${o.type === 'comeback' ? '<span class="pill r">возврат по гарантии</span>' : ''} ${o.due ? `<span class="pill ${late(o) ? 'r' : ''}">срок: ${when(o.due)}</span>` : ''}${o.client.waits ? '<span class="pill y">ждёт в зоне ожидания</span>' : ''}<span class="mut">${h(ostatus(o))}</span></div>`;
      s += `<div class="quote" style="margin:6px 0">${h(o.complaint)}</div>`;
    } else s += `<p class="mut">Свой проект: клиента нет, детали оплачиваются сразу, работа идёт, когда свободны боксы и руки. ${h(ostatus(o))}</p>`;
    s += `<div class="row"><label><input type="checkbox" data-c="oflag" data-o="${o.id}" data-k="urgent" ${o.urgent ? 'checked' : ''}> ⚡ Срочно${own ? ' (не уступать бокс клиентам)' : ''}</label> <span>Исполнитель: <select data-c="assign" data-o="${o.id}"><option value="">любой свободный</option>${S.pawns.map(p => `<option value="${p.id}" ${o.assign === p.id ? 'selected' : ''}>${h(p.name)}</option>`).join('')}</select></span></div>`;
    for (const n of o.notes) s += `<div class="sm bad">• ${h(n)}</div>`;
    // гипотезы
    if (o.syms.length) {
      s += '<h3>Гипотезы</h3>';
      for (const hy of O.hyp(o)) {
        s += `<div class="sm b" style="margin-top:4px">${h(D.sym[hy.sym].n)}</div>`;
        for (const x of hy.list) s += `<div class="hyp"><span>${R.nodeNums[x.node]}. ${h(D.nodes[x.node].n)}${x.sig && S.enc[car.model] ? `<span class="acc"${tip('Фирменная болячка модели: ' + x.sig)}> ⚠</span>` : ''}</span><div class="hb"><i style="width:${Math.round(x.p * 100)}%"></i></div><span class="r">${Math.round(x.p * 100)}%</span></div>`;
      }
      s += `<div class="sm mut" style="margin-top:3px">Вероятности — из симптома, болячек модели и того, что уже известно об узлах. Тесты сужают туман.</div>`;
    }
    // тесты
    if (o.stage === 'diag' || own) {
      s += '<h3>Тесты</h3><div class="tests">';
      for (const t in D.tests) {
        const d = D.tests[t], why = O.testWhy(o, t), q = o.tests.includes(t), dn = o.done.includes(t);
        const cov = Object.keys(d.nodes).filter(n => car.nodes[n]).map(n => D.nodes[n].n + ' ±' + d.nodes[n]).join('\n');
        s += `<button class="btn sm ${q ? 'on' : ''}" data-a="${q ? 'testOff' : 'test'}" data-o="${o.id}" data-t="${t}" ${why && !q ? 'disabled' : ''}${tip(d.n + ' · ' + d.min + ' мин' + (d.bay ? ' · нужен подъёмник' : '') + (why && !q ? '\n⛔ ' + why : '') + '\n\nСужает туман:\n' + cov)}>${dn ? '✔ ' : ''}${q ? '⏳ ' : ''}${d.n} <span class="mut">${d.min}м</span></button>`;
      }
      s += '</div>';
    }
    // узлы
    s += '<h3>Узлы: известное состояние</h3><div class="nodes">';
    for (const nid of C.nodeIds(car)) {
      const n = car.nodes[nid], nd = D.nodes[nid]; let b = '';
      if (edit && o.stage !== 'approval') { if (nd.rep && n.reps > 0) b += `<button class="btn sm" data-a="job" data-o="${o.id}" data-kind="repair" data-node="${nid}"${tip('Ремонт: ' + nd.rep + ' ч, ремкомплект. Восстановит ' + D.grades[n.grade].gain[0] + '–' + D.grades[n.grade].gain[1] + '% (зависит от качества). Осталось ремонтов: ' + n.reps + '. Дёшево, но может не хватить.')}>Р</button>`; if (nd.repl) b += `<button class="btn sm" data-a="job" data-o="${o.id}" data-kind="replace" data-node="${nid}"${tip('Замена: ' + nd.repl + ' ч, деталь OEM ≈ ' + $m(nd.part * m.pm * G.px()))}>З</button>`; }
      s += `<div class="nd"><span class="num">${R.nodeNums[nid]}</span><span${n.orig ? '' : tip('Заменён, грейд: ' + D.grades[n.grade].n)}>${h(nd.n)}${n.orig ? '' : ' <span style="color:' + D.grades[n.grade].c + '">' + D.grades[n.grade].icon + '</span>'}</span>${rbar(n.lo, n.hi)}<span class="v">${rtxt(n.lo, n.hi)}</span><span>${b}</span></div>`;
    }
    s += '</div>';
    if (own) {
      s += '<h3>Кузов, подача и тюнинг</h3><div class="row">' + btn('Детейлинг', 'job', { o: o.id, kind: 'own', key: 'detail' }, 'sm') + btn('Покраска', 'job', { o: o.id, kind: 'own', key: 'paint' }, 'sm');
      for (const z of D.rustIds) { const rz = car.rust[z]; s += `<button class="btn sm" data-a="job" data-o="${o.id}" data-kind="rust" data-zone="${z}"${tip('Заплатка ржавчины: ' + D.rust[z].n + '\nИзвестно: ' + rtxt(rz.lo, rz.hi) + (D.rust[z].struct ? '\nСиловой элемент: влияет на класс состояния сильнее всего.' : ''))}>Заплатка: ${D.rust[z].n.toLowerCase()} <span class="mut">${rtxt(rz.lo, rz.hi)}</span></button>`; }
      s += '</div><div class="row" style="margin-top:5px">';
      for (const t in D.tune) { const d = D.tune[t]; s += btn('⚙ ' + d.n.split(':')[0], 'job', { o: o.id, kind: 'tune', key: t }, 'sm', car.mods.includes(t) ? 'уже стоит' : null).replace('<button', '<button' + (car.mods.includes(t) ? '' : tip(d.n + '\n' + (d.hp ? '+' + Math.round(d.hp * 100) + '% мощности ' : '') + (d.grip ? '+сцепление ' : '') + (d.wt ? Math.round(d.wt * 100) + '% массы ' : '') + '\nЦена культовой машины ' + (d.val >= 0 ? '+' : '') + Math.round(d.val * 100) + '%'))); }
      s += '</div>';
    }
    if (o.findings.length && o.stage !== 'ready') s += '<h3>Попутные находки</h3>' + o.findings.map(n => `<div class="row sm">${h(D.nodes[n].n)}: ${rtxt(car.nodes[n].lo, car.nodes[n].hi)} ${btn('Добавить в смету', 'job', { o: o.id, kind: 'replace', node: n, finding: 1 }, 'sm')} ${btn('Не предлагать', 'findSkip', { o: o.id, node: n }, 'sm')}</div>`).join('');
    // смета
    s += '<h3>Смета и работы</h3>';
    if (o.jobs.length) {
      s += `<table><tr><th>Работа</th><th>Грейд</th><th class="r">Норма → факт</th><th class="r">${own ? 'Детали' : 'Клиенту'}</th><th>Статус</th><th></th></tr>${o.jobs.map(j => jobRow(o, j, edit)).join('')}</table>`;
      if (!own) { const inv = O.invoice(o), est = o.jobs.filter(j => j.status !== 'declined').reduce((a, j) => a + j.total, 0); s += `<div class="row" style="margin-top:6px"><span>Смета: <b>${$m(est)}</b></span><span class="mut">выполнено на ${$m(inv.labor + inv.parts + inv.sup)} · диагностика ${$m(inv.diag)} · налог 6%</span><span class="mut"${tip('Чем дороже смета относительно бюджета клиента и цены машины, тем чаще отказ.')}>машина стоит ≈ ${$m(C.value(car, 'lo'))}–${$m(C.value(car, 'hi'))}</span></div>`; }
      else s += `<div class="row" style="margin-top:6px"><span>Детали в смете: <b>${$m(o.jobs.filter(j => j.status === 'prop').reduce((a, j) => a + j.cost, 0))}</b></span><span class="mut">уже вложено в машину: ${$m(car.cost)}</span></div>`;
    } else s += '<p class="mut">Пока пусто. Добавь работы кнопками «Р» (ремонт) и «З» (замена) у узлов.</p>';
    s += '<div class="row" style="margin-top:8px">';
    const hasProp = o.jobs.some(j => j.status === 'prop');
    if (!own) {
      if (o.stage === 'diag') s += btn('Предложить по диагнозу', 'suggest', { o: o.id }) + btn('Отправить смету клиенту →', 'send', { o: o.id }, 'pri', hasProp ? null : 'Сначала добавь работы') + btn('Не берёмся (только диагностика)', 'giveUp', { o: o.id }, 'red');
      else if ((o.stage === 'work' || o.stage === 'parts') && hasProp) s += btn('Согласовать доп. работы →', 'send', { o: o.id }, 'pri');
      s += `<label${tip('Срочно: магазин, 1–3 часа, розница. Иначе дистрибьютор: завтра утром, −20%.')}><input type="checkbox" data-c="ofast" data-o="${o.id}" ${o.fast ? 'checked' : ''}> детали срочно</label>`;
      if (o.stage !== 'ready' && o.stage !== 'intake' && !o.buyTried) { const v = Math.round(C.value(car, 't') * .5 / 25) * 25; s += `<span style="margin-left:auto"${tip('Смета дороже машины? Предложи купить «как есть». Ты знаешь о ней больше всех — лучший источник машин. Слишком низкая цена бьёт по «Честности».')}>Выкупить за <input type="number" id="buy_${o.id}" value="${v}" step="25"> ${btn('Предложить', 'buyout', { o: o.id }, 'sm')}</span>`; }
    } else {
      s += btn('Заказать детали и в работу →', 'send', { o: o.id }, 'pri', hasProp ? null : 'Нет новых работ в смете') + btn('Предложить по известным дефектам', 'ownSuggest', { o: o.id }) + btn('Закрыть наряд', 'closeOwn', { o: o.id }, 'red', o.jobs.some(j => j.status === 'doing') ? 'Сначала дождись окончания текущей работы' : null);
      s += `<label><input type="checkbox" data-c="ofast" data-o="${o.id}" ${o.fast ? 'checked' : ''}> детали срочно</label>`;
    }
    s += '</div>';
    return s;
  };
  const ord = d => WW.S.orders[+d.o];
  A.test = d => { const o = ord(d); if (o) O.queueTest(o, d.t); }; A.testOff = d => { const o = ord(d); if (o) O.unqueueTest(o, d.t); };
  A.job = d => { const o = ord(d); if (!o) return; const sp = { kind: d.kind, node: d.node, zone: d.zone, key: d.key, grade: d.kind === 'replace' ? 'oem' : null, finding: d.finding ? 1 : 0 }; if (!O.addJob(o, sp)) G.toast('Эта работа уже в смете или недоступна.', 'bad'); };
  A.jobDel = d => { const o = ord(d); if (o) O.delJob(o, +d.j); }; A.jobFree = d => { const o = ord(d); if (o) O.toggleFree(o, +d.j); };
  A.grade = (d, el) => { const o = ord(d); if (o) O.setGrade(o, +d.j, el.value); };
  A.suggest = d => { const o = ord(d); if (o && !O.suggest(o)) G.toast('Нечего предложить: ни одна гипотеза не подтверждается. Сделай ещё тесты.', 'bad'); };
  A.ownSuggest = d => { const o = ord(d), car = WW.S.cars[o.car]; let n = 0; for (const id of C.nodeIds(car)) if (car.nodes[id].hi < D.FAULT && O.addJob(o, { kind: D.nodes[id].repl ? 'replace' : 'repair', node: id, grade: 'oem' })) n++; if (!n) G.toast('Известных дефектов нет. Сначала осмотри машину тестами.', 'info'); };
  A.send = d => { const o = ord(d); if (!o) return; if (o.type !== 'own' && o.stage !== 'diag') { o.stage = 'approval'; return; } O.send(o); };
  A.giveUp = d => { const o = ord(d); if (o) O.giveUp(o); }; A.closeOwn = d => { const o = ord(d); if (o && O.closeOwn(o)) UI.open('cars'); };
  A.findSkip = d => { const o = ord(d); if (o) o.findings = o.findings.filter(n => n !== d.node); };
  A.oflag = (d, el) => { const o = ord(d); if (o) o[d.k] = el.checked; }; A.assign = (d, el) => { const o = ord(d); if (o) o.assign = el.value ? +el.value : null; };
  A.ofast = (d, el) => { const o = ord(d); if (o) O.setFast(o, el.checked); };
  A.buyout = d => { const o = ord(d), el = $('buy_' + d.o); if (o && el && O.buyout(o, Math.max(0, +el.value || 0))) UI.open('cars'); };
  A.set = (d, el) => { WW.S.set[d.k] = el.type === 'checkbox' ? el.checked : +el.value; };
  A.focus = d => { const c = WW.S.cars[+d.id]; if (c) { R.focus(c.x, c.y); R.sel = 'c' + c.id; } };

  // ---------- машины ----------
  function carLine(car) { const S = WW.S, v = C.valueRange(car), k = G.kindOf(car); return `<div class="card click lst" data-a="go" data-k="car" data-id="${car.id}"><canvas data-th="${car.id}" width="300" height="148"></canvas><div><b>${h(C.name(car))}</b> <span class="mut">${h(car.colorName)} · ${car.miles.toLocaleString('en-US')} миль</span><div class="row sm">${car.sale ? `<span class="pill g">на продаже ${$m(car.sale.ask)}</span>` : ''}${car.order ? `<span class="pill y">наряд №${car.order}</span>` : ''}${C.runs(car) ? '' : '<span class="pill r">не на ходу</span>'}<span class="pill">${D.titles[car.title].n}</span></div><div class="sm">Оценка: <b>${$m(v[0])} – ${$m(v[1])}</b> · известно ${Math.round(C.known(car) * 100)}% · вложено ${$m(car.cost)} · ${car.days || 0} дн. на площадке</div>${S.offers.filter(o => o.car === car.id).map(o => `<div class="sm good">💵 ${h(o.who)}: ${$m(o.price)}</div>`).join('')}</div></div>`; }
  V.cars = function () {
    const S = WW.S, mine = Object.values(S.cars).filter(c => c.owner === 'player'), cl = Object.values(S.cars).filter(c => c.owner === 'client' && c.slot && !c.away);
    let s = `<div class="row mut sm" style="margin-bottom:6px">Места: проекты ${G.slotList().filter(x => x.kind === 'proj').length - G.countFree('proj')}/${G.slotList().filter(x => x.kind === 'proj').length} · витрина ${G.slotList().filter(x => x.kind === 'sale').length - G.countFree('sale')}/${G.slotList().filter(x => x.kind === 'sale').length}. Сток стоит денег: каждый день на улице — аккумулятор, шины, ржавчина.</div><h3>Свой сток</h3><div class="col">`;
    s += mine.length ? mine.map(carLine).join('') : '<p class="mut">Своих машин нет. Загляни в «Рынок» или выкупи машину у клиента.</p>';
    s += '</div><h3>Клиентские на площадке</h3><div class="col">' + (cl.length ? cl.map(car => `<div class="kc" data-a="go" data-k="car" data-id="${car.id}"><b>${h(C.name(car))}</b> <span class="s">${car.order && S.orders[car.order] ? '№' + car.order + ' · ' + h(ostatus(S.orders[car.order])) : ''}</span></div>`).join('') : '<p class="mut">Пусто.</p>') + '</div>';
    return s;
  };
  V.car = function (id) {
    const S = WW.S, car = S.cars[id], m = C.model(car), mine = car.owner === 'player', vl = C.valueParts(car, 'lo'), vh = C.valueParts(car, 'hi'), sl = C.score(car, 'lo'), sh = C.score(car, 'hi'), lst = S.listings.find(l => l.car === car.id);
    const why = p => p.parts.map(x => x[0] + ': ' + x[1]).join('\n');
    let s = `<div class="row"><span class="big" style="font-size:19px">${h(C.name(car))}</span><span class="pill">${D.curveName[m.curve]}</span><span class="pill">${D.titles[car.title].n}</span>${C.runs(car) ? '<span class="pill g">на ходу</span>' : '<span class="pill r">не на ходу</span>'}${car.sale ? `<span class="pill g">на продаже</span>` : ''}<span style="flex:1"></span>${car.slot ? btn('На карте', 'focus', { id: car.id }, 'sm') : ''}</div>`;
    s += `<div class="mut sm">${h(car.colorName)} · ${m.eng} · ${m.layout} · ${car.manual ? 'МКПП' : 'АКПП'} · одометр ${car.miles.toLocaleString('en-US')} миль${car.known.rollback ? ' <span class="bad">(скручен! реально ≈ ' + Math.round(car.milesTrue / 1000) + ' тыс.)</span>' : ''} · ${h(m.role)}</div>`;
    if (car.note) s += `<div class="quote" style="margin:6px 0">${h(car.note)}</div>`;
    s += `<canvas class="bp" data-bp="${car.id}" width="700" height="250" style="margin:8px 0"></canvas>`;
    s += `<div class="grid3"><div class="card"${tip('Класс состояния (по мотивам ценовых гайдов классики):\n1 Конкурс · 2 Отличный · 3 Хороший · 4 Удовлетворительный · 5 Проект/донор\nСчитается из взвешенного состояния узлов и худшего силового элемента кузова.\nБалл: ' + Math.round(sl) + '–' + Math.round(sh))}><div class="mut sm">Класс состояния</div><b>${C.cls(sh) === C.cls(sl) ? C.cls(sl) + ' · ' + C.clsName[C.cls(sl)] : C.cls(sh) + '–' + C.cls(sl)}</b></div>
      <div class="card"${tip('Почему столько? Пессимистичная оценка:\n' + why(vl) + '\n= ' + $m(vl.V) + '\n\nОптимистичная:\n' + why(vh) + '\n= ' + $m(vh.V))}><div class="mut sm">Оценка стоимости · «почему?»</div><b>${$m(vl.V)} – ${$m(vh.V)}</b></div>
      <div class="card"><div class="mut sm">${mine ? 'Вложено · дней на площадке' : 'Известно о машине'}</div><b>${mine ? $m(car.cost) + ' · ' + (car.days || 0) : Math.round(C.known(car) * 100) + '%'}</b></div></div>`;
    // действия
    if (mine) {
      s += '<h3>Действия</h3><div class="row">';
      if (car.order) s += btn('Перейти к наряду №' + car.order, 'go', { k: 'order', id: car.order }, 'pri'); else if (!car.sale) s += btn('Открыть наряд: осмотр, ремонт, тюнинг', 'ownOrder', { id: car.id }, 'pri');
      const def = Math.round((vl.V + vh.V) / 2 * 1.06 / 25) * 25;
      if (!car.order) s += `<span>Цена: <input type="number" id="ask_${car.id}" value="${car.sale ? car.sale.ask : def}" step="25"> ${btn(car.sale ? 'Изменить цену' : 'Выставить на продажу', 'list', { id: car.id })}</span>`;
      if (car.sale) s += btn('Снять с продажи', 'unlist', { id: car.id });
      if (!car.known.vin) s += btn('Отчёт по VIN ' + $m(15 * G.px()), 'vinOwn', { id: car.id }, 'sm');
      s += '</div>';
      if (!car.order) s += `<div class="row" style="margin-top:6px">${btn('Сдать оптом дилеру: ' + $m(M.wholesale(car)), 'quick', { id: car.id }, 'sm')}${btn('В металлолом: ' + $m(M.scrapValue(car)), 'scrap', { id: car.id }, 'sm red')}</div>`;
      const ofs = S.offers.filter(o => o.car === car.id);
      if (ofs.length) s += '<h3>Предложения покупателей</h3>' + ofs.map(o => `<div class="row card" style="margin-bottom:4px"><b>${h(o.who)}</b> даёт <b class="good">${$m(o.price)}</b> <span class="mut">(просишь ${$m(car.sale.ask)}; прибыль ${$m(o.price - car.cost)}; ждёт до конца ${o.until > S.day ? 'завтрашнего дня' : 'дня'})</span><span style="flex:1"></span>${btn('Продать', 'accept', { id: o.id }, 'pri')}${btn('Отказать', 'decline', { id: o.id })}</div>`).join('');
      else if (car.sale) s += `<p class="mut sm">Покупатели заглядывают ночью. Чем ближе цена к реальной стоимости, тем чаще. Стоит уже ${S.day - car.sale.day} дн.</p>`;
    } else if (lst) s += `<div class="row" style="margin-top:6px">${btn('← К объявлению', 'panel', { p: 'market' }, 'pri')}</div>`;
    else if (car.order) s += `<div class="row" style="margin-top:6px">${btn('Перейти к наряду №' + car.order, 'go', { k: 'order', id: car.order }, 'pri')}</div>`;
    // узлы
    s += '<h3>Узлы: рамка — грейд, заливка — состояние, штриховка — туман</h3>';
    for (const g of D.groups) {
      const ids = C.nodeIds(car).filter(i => D.nodes[i].g === g); if (!ids.length) continue;
      s += `<div class="sm mut" style="margin-top:4px">${g}</div><div class="nodes">` + ids.map(nid => { const n = car.nodes[nid], sg = m.sig.find(x => x.n === nid); return `<div class="nd"><span class="num" style="border:2px solid ${D.grades[n.grade].c}">${R.nodeNums[nid]}</span><span>${h(D.nodes[nid].n)}${sg && S.enc[car.model] ? `<span class="acc"${tip('Болячка модели: ' + sg.t)}> ⚠</span>` : ''}</span>${rbar(n.lo, n.hi)}<span class="v">${rtxt(n.lo, n.hi)}</span><span class="mut sm">${n.hi - n.lo <= 3 ? D.condOf(n.t).n : ''}</span></div>`; }).join('') + '</div>';
    }
    s += '<h3>Ржавчина по зонам</h3><div class="nodes">' + D.rustIds.map(z => { const rz = car.rust[z]; return `<div class="nd"><span></span><span>${D.rust[z].n}${D.rust[z].struct ? ' <span class="mut">(силовой)</span>' : ''}</span>${rbar(rz.lo, rz.hi, true)}<span class="v">${rtxt(rz.lo, rz.hi)}</span><span class="mut sm">${rz.hi - rz.lo <= 6 ? (rz.r >= 80 ? 'структурная' : rz.r >= 60 ? 'сквозная' : rz.r >= 30 ? 'пузыри' : 'чисто') : ''}</span></div>`; }).join('') + '</div>';
    // тюнинг и ТТХ
    const pf = C.perf(car);
    s += `<h3>ТТХ сейчас</h3><div class="row sm"><span class="pill">${pf.hp} л.с. <span class="mut">(завод ${m.hp})</span></span><span class="pill">${pf.wt} фунтов</span><span class="pill"${tip('Оценка времени на четверть мили: зависит от мощности, массы, шин и подвески.')}>¼ мили ≈ ${pf.et.toFixed(2)} с</span><span class="pill">стабильность ${Math.round(pf.stab * 100)}%</span>${car.mods.map(t => `<span class="pill b">⚙ ${h(D.tune[t].n.split(':')[0])}</span>`).join('')}${car.wins ? `<span class="pill y">🏆 побед: ${car.wins}</span>` : ''}</div>`;
    // история
    s += '<h3>История и документы</h3>';
    const knowHist = mine && (car.known.vin || car.docs.book) || car.owner === 'client' || (!mine && car.known.vin);
    s += `<div class="sm">${knowHist ? h(C.story(car, car.known.accident)) : '<span class="mut">Прошлое машины — со слов продавца. Отчёт по VIN покажет владельцев, пробеги и заявленные ДТП.</span>'}</div>`;
    s += `<div class="row sm" style="margin-top:4px">${car.docs.book ? '<span class="pill g">сервисная книжка</span>' : ''}${car.docs.receipts ? '<span class="pill g">чеки</span>' : ''}${car.docs.sticker ? '<span class="pill y">заводская наклейка</span>' : ''}${car.docs.keys ? '<span class="pill">два ключа</span>' : ''}${car.known.vin ? (car.matching ? '<span class="pill g">matching numbers</span>' : '<span class="pill r">мотор не родной</span>') : ''}${car.known.accident && car.hidden.accident ? '<span class="pill r">было ДТП</span>' : ''}<span class="pill">VIN ${car.vin}</span></div>`;
    if (car.hist.length) s += '<div style="margin-top:6px">' + car.hist.slice().reverse().map(x => `<div class="logl"><span class="d">${x.y}, день ${x.d + 1}</span>${h(x.t)}${x.by ? ' — ' + h(x.by) : ''}${x.q != null ? ' · качество ' + x.q : ''}</div>`).join('') + '</div>';
    return s;
  };
  const car = d => WW.S.cars[+d.id];
  A.ownOrder = d => { const c = car(d), o = c && O.newOwn(c); if (o) UI.open('order', o.id); };
  A.list = d => { const c = car(d), el = $('ask_' + d.id); if (c && el) M.list(c, Math.max(50, +el.value || 0)); };
  A.unlist = d => { const c = car(d); if (c) M.unlist(c); }; A.accept = d => { M.accept(+d.id); if (!WW.S.cars[UI.view.id]) UI.open('cars'); }; A.decline = d => M.decline(+d.id);
  A.quick = d => { const c = car(d); if (c && confirm('Сдать ' + C.name(c) + ' дилеру за ' + $m(M.wholesale(c)) + '?')) { M.quickSell(c); UI.open('cars'); } };
  A.scrap = d => { const c = car(d); if (c && confirm('Сдать ' + C.name(c) + ' в металлолом за ' + $m(M.scrapValue(c)) + '? Это навсегда.')) { M.scrap(c); UI.open('cars'); } };
  A.vinOwn = d => { const c = car(d), cost = Math.round(15 * G.px()); if (!c || WW.S.money < cost) return; G.money(-cost, 'misc'); c.known.vin = true; if (c.hidden.rollback) c.known.rollback = true; if (c.hidden.accident) c.known.accident = true; G.toast('Отчёт по VIN получен: история владельцев открыта.', 'info'); };

  // ---------- люди ----------
  function pawnCard(p, cand) {
    const S = WW.S, role = D.roles[p.role], sel = UI.sub.pawn === p.id;
    let s = `<div class="card" style="${sel ? 'border-color:var(--acc)' : ''}"><div class="row"><span style="width:14px;height:14px;border-radius:50%;background:${role.col};display:inline-block"></span><b>${h(p.name)}</b><span class="pill">${role.n}</span>${p.legend ? '<span class="pill y">легенда</span>' : ''}<span style="flex:1"></span>${p.owner ? '' : `<span class="b">${$m(p.wage)}/ч</span><span class="mut sm">(${$m(p.wage * 10)}/день)</span>`}</div>`;
    if (!cand && !p.owner) { const mp = P.moodParts(p); s += `<div class="row sm" style="margin:4px 0"${tip('Настроение ' + Math.round(p.mood) + ':\n' + mp.map(x => x[0] + ': ' + (x[1] >= 0 ? '+' : '') + x[1]).join('\n') + '\n\n>70 — шанс вдохновения · <35 — срывы · <18 два дня подряд — уйдёт')}><span>Настроение</span><div class="pbar" style="flex:1;max-width:160px"><i style="width:${p.mood}%;background:${p.mood < 30 ? '#E53935' : p.mood < 50 ? '#FB8C00' : '#6fcf6f'}"></i></div><span>${Math.round(p.mood)}</span><span class="mut">${p.state === 'absent' ? 'отсутствует' : p.state === 'away' ? 'уехал на осмотр' : p.arriveAt ? 'опаздывает' : p.task ? taskName(p) : 'свободен'}</span></div>`; }
    if (p.owner) s += `<div class="sm mut" style="margin:4px 0">Это ты. ${p.state === 'away' ? 'Уехал на осмотр до ' + U.time(p.awayUntil) : p.task ? taskName(p) : 'Свободен'}. Хозяин на подъёмнике не торгуется на аукционе и не встречает клиентов.</div>`;
    s += '<div class="grid2" style="gap:2px 14px;margin:4px 0">' + D.skillIds.map(k => { const v = p.skills[k], ps = p.pas[k] || 0; return `<div class="sk"${tip(D.skills[k] + ' ' + v + '/20' + (ps ? '\nСтрасть: ' + (ps === 2 ? 'огонь (опыт ×2)' : 'интерес (опыт ×1.5)') : ''))}><span>${D.skills[k]}${ps ? (ps === 2 ? ' 🔥' : ' ✦') : ''}</span><div class="sb"><i class="p${ps}" style="width:${v * 5}%"></i></div><span class="r">${v}</span></div>`; }).join('') + '</div>';
    if (!p.owner) s += '<div class="row sm">' + p.traits.map((t, i) => i < p.known ? `<span class="pill y"${tip(D.traits[t].d)}>${D.traits[t].n}</span>` : `<span class="pill"${tip('Раскроется через несколько дней работы')}>?</span>`).join('') + '</div>';
    if (cand) s += `<div class="row" style="margin-top:6px">${btn('Нанять', 'hire', { id: p.id }, 'pri')}</div>`;
    else {
      s += `<div class="row sm" style="margin-top:6px"${tip('Приоритеты работ, как в RimWorld: 1 — в первую очередь, 3 — когда больше нечего делать, «–» — никогда.')}>` + Object.keys(D.priKeys).map(k => `<span class="pri"><b>${D.priKeys[k]}</b><button class="p${p.pri[k]}" data-a="pri" data-id="${p.id}" data-k="${k}">${p.pri[k] || '–'}</button></span>`).join('') + (p.owner ? '' : `<span style="flex:1"></span>${btn('Премия ' + $m(50 * G.px()), 'bonus', { id: p.id }, 'sm')}${btn('Уволить', 'fire', { id: p.id }, 'sm red')}`) + '</div>';
    }
    return s + '</div>';
  }
  function taskName(p) { const t = p.task, o = t.o && WW.S.orders[t.o], c = o && WW.S.cars[o.car]; const cn = c ? ' — ' + C.short(c) : ''; return t.type === 'lunch' ? 'обедает' : t.type === 'desk' ? ({ intake: 'принимает клиента', call: 'звонит клиенту', payout: 'рассчитывает клиента' })[t.sub] : t.type === 'test' ? 'диагностика' + cn : t.type === 'qc' ? 'ОТК' + cn : t.type === 'job' ? (t.ph === 'store' || t.ph === 'pick' ? 'идёт на склад за деталью' : 'работает' + cn) : ''; }
  UI.taskName = taskName;
  V.people = function () {
    const S = WW.S, owed = S.pawns.reduce((a, p) => a + (p.owed || 0), 0);
    let s = `<div class="row mut sm" style="margin-bottom:6px">В штате ${P.staff().length}/6. Зарплата — по пятницам${owed ? ': к выплате уже ' + $m(owed * 1.0765) + ' (с налогами работодателя 7.65%)' : ''}. Рабочий день 07:00–19:00, обед в 12:00.</div><h3>Команда</h3><div class="col">${S.pawns.map(p => pawnCard(p, false)).join('')}</div>`;
    s += `<h3>Кандидаты</h3><div class="row sm mut" style="margin-bottom:6px">Список обновляется раз в три дня. На собеседовании видна одна черта — остальные раскроются в работе. ${btn('Объявление в газете ' + $m(40 * G.px()), 'ad', {}, 'sm')}</div><div class="col">${S.cands.length ? S.cands.map(p => pawnCard(p, true)).join('') : '<p class="mut">Никого. Дай объявление.</p>'}</div>`;
    return s;
  };
  A.hire = d => P.hire(+d.id); A.fire = d => { const p = P.byId(+d.id); if (p && confirm('Уволить ' + p.name + '?')) P.fire(p.id); };
  A.pri = d => { const p = P.byId(+d.id); if (p) p.pri[d.k] = (p.pri[d.k] + 1) % 4; };
  A.ad = () => { const S = WW.S, c = Math.round(40 * G.px()); if (S.money < c) return G.toast('Не хватает денег.', 'bad'); G.money(-c, 'marketing'); P.refreshCands(true); G.toast('Объявление вышло: пришли новые кандидаты.', 'info'); };
  A.bonus = d => { const S = WW.S, p = P.byId(+d.id), c = Math.round(50 * G.px()); if (!p || S.money < c) return G.toast('Не хватает денег на премию.', 'bad'); if (p.bonusDay != null && S.day - p.bonusDay < 5) return G.toast('Премию давали совсем недавно — эффекта не будет.', 'info'); G.money(-c, 'wages'); p.bonusDay = S.day; P.think(p, 'bonus', 'Премия', 10, 5); G.toast(p.name + ' получил премию. +10 к настроению на 5 дней.', 'good'); };

  // ---------- рынок ----------
  V.market = function () {
    const S = WW.S, a = S.auction; let s = '';
    if (a && a.day === S.day && !a.done) s += `<div class="card" style="border-color:var(--acc);margin-bottom:8px"><div class="row"><b>🔨 Аукцион окружной штрафстоянки</b><span class="mut">сегодня ${U.time(a.open)}–${U.time(a.close)} · ${a.lots.length} лота · осмотр только глазами</span><span style="flex:1"></span>${S.min >= a.open ? btn('Войти в зал', 'auction', {}, 'pri', G.freeSlot(['proj']) ? null : 'Нет свободного места под проект') : '<span class="pill">ещё не открыт</span>'}</div></div>`;
    else s += `<div class="mut sm" style="margin-bottom:8px">Аукцион штрафстоянки — по средам и субботам, 13:00–16:00. Свободных мест под проекты: ${G.countFree('proj')}.</div>`;
    s += '<h3>Частные объявления</h3><div class="col">';
    for (const l of S.listings) {
      const car = S.cars[l.car], v = C.valueRange(car), lv = M.levers(l), trip = S.trips.find(t => t.lst === l.id), rd = M.read(l);
      s += `<div class="card lst" style="${l.barn ? 'border-color:var(--acc)' : ''}"><div><canvas data-th="${car.id}" width="300" height="148"></canvas><div class="sm mut" style="margin-top:3px">ещё ${l.days} дн.</div></div><div>
        <div class="row"><b style="font-size:14px">${h(C.name(car))}</b>${l.barn ? '<span class="pill y">наводка на сарай</span>' : ''}<span class="mut sm">${h(car.colorName)} · ${car.miles.toLocaleString('en-US')} миль${car.known.rollback ? ' <span class="bad">скручен</span>' : ''}</span>${l.runs ? '' : '<span class="pill r">не на ходу</span>'}${car.title !== 'clean' ? `<span class="pill r">${D.titles[car.title].n}</span>` : ''}</div>
        <div class="quote sm" style="margin:4px 0">${h(l.text)} <span class="mut">— ${h(l.name)}</span></div>
        <div class="row"><span>Просит <b>${$m(l.ask)}</b>${l.cur < l.ask ? ` → уступил до <b class="good">${$m(l.cur)}</b>` : ''}</span><span${tip('Оценка по тому, что известно. Чем больше тумана — тем шире вилка.\nИзвестно о машине: ' + Math.round(C.known(car) * 100) + '%')}>наша оценка: <b>${$m(v[0])} – ${$m(v[1])}</b></span></div>
        <div class="row" style="margin-top:5px">${l.insp ? '<span class="pill g">осмотрена</span>' : trip ? `<span class="pill y">осмотр, вернётся к ${U.time(trip.until)}</span>` : `<select id="who_${l.id}">${S.pawns.filter(p => p.state === 'work').map(p => `<option value="${p.id}">${h(p.name.split(' ')[0])} (диагн. ${p.skills.diag})</option>`).join('')}</select>${btn('Съездить на осмотр ~75 мин', 'inspect', { id: l.id }, 'sm')}`}
          ${car.known.vin ? '<span class="pill g">VIN проверен</span>' : btn('Отчёт по VIN ' + $m(15 * G.px()), 'vin', { id: l.id }, 'sm')}${btn('Карточка', 'go', { k: 'car', id: car.id }, 'sm')}</div>
        ${lv.length ? `<div class="sm" style="margin-top:4px">Рычаги торга: ${lv.map(x => `<span class="pill y">${h(x.t)} ≈ ${$m(x.v)}</span>`).join(' ')}</div>` : (l.insp ? '<div class="sm mut" style="margin-top:4px">Явных дефектов не нашли — торговаться нечем.</div>' : '')}
        <div class="row" style="margin-top:6px"><input type="number" id="off_${l.id}" value="${Math.round(l.cur * .85 / 25) * 25}" step="25">${btn('Предложить', 'offer', { id: l.id })}${btn('Купить за ' + $m(l.final || l.cur), 'buy', { id: l.id }, 'pri')}<span class="sm mut"${tip('Навык «Торговля» (' + rd.trade + ') показывает температуру продавца и сужает оценку его минимума.')}>терпения на ${Math.max(0, l.rounds)} ${U.plural(l.rounds, 'раунд', 'раунда', 'раундов')} · минимум ≈ ${$m(rd.lo)}–${$m(rd.hi)}</span></div>
        ${l.said.length ? `<div class="sm acc" style="margin-top:3px">${h(l.said[l.said.length - 1])}</div>` : ''}</div></div>`;
    }
    s += '</div><h3>Биржа подержанных: тренды моделей</h3><div class="grid3">';
    for (const mm of M.pool().sort((a, b) => S.trend[b.id] - S.trend[a.id])) { const t = S.trend[mm.id]; s += `<div class="sm row" style="justify-content:space-between"><span>${mm.make} ${mm.name}</span><span class="${t > 1.03 ? 'good' : t < .97 ? 'bad' : 'mut'}">${t > 1.03 ? '▲' : t < .97 ? '▼' : '•'} ×${t.toFixed(2)}</span></div>`; }
    return s + '</div>';
  };
  A.inspect = d => { const el = $('who_' + d.id); M.inspect(+d.id, el ? +el.value : WW.S.pawns[0].id); }; A.vin = d => M.vin(+d.id);
  A.offer = d => { const el = $('off_' + d.id); if (!el) return; const r = M.offer(+d.id, +el.value || 0); if (r && r.res === 'offend') G.toast('Продавец обиделся: слишком низко. Терпения осталось меньше.', 'bad'); if (r && r.res === 'deal') UI.open('cars'); };
  A.buy = d => { const l = M.lst(+d.id); if (l && M.buy(l.id, l.final || l.cur)) UI.open('cars'); };
  A.auction = () => WW.MOD.auction();

  // ---------- стройка ----------
  V.build = function () {
    const S = WW.S; let s = '<p class="mut sm">Планировка = прибыль: склад рядом с боксами, пневматика на всех постах, место под каждую машину. В v1 мастерская растёт готовыми модулями — они появляются на карте.</p>';
    const gs = {}; for (const id in D.upg) (gs[D.upg[id].g] = gs[D.upg[id].g] || []).push(id);
    for (const g in gs) { s += `<h3>${g}</h3><div class="col">`; for (const id of gs[g]) { const u = D.upg[id], cost = Math.round(u.cost * G.px() / 5) * 5, has = S.upg[id], lock = u.req && !S.upg[u.req]; s += `<div class="card row"><div style="flex:1"><b>${h(u.n)}</b><div class="sm mut">${h(u.d)}</div></div>${has ? '<span class="pill g">есть</span>' : btn($m(cost), 'upg', { id }, 'pri', lock ? 'Сначала: ' + D.upg[u.req].n : S.money < cost ? 'Не хватает денег' : null)}</div>`; } s += '</div>'; }
    s += `<h3>Реклама</h3><div class="card row"><div style="flex:1"><b>Газета и радио</b><div class="sm mut">+35% клиентов на 5 дней.${S.adDays > 0 ? ' Идёт кампания: ещё ' + S.adDays + ' дн.' : ''}</div></div>${btn($m(80 * G.px()), 'buyAd', {}, 'pri', S.adDays > 0 ? 'Кампания уже идёт' : null)}</div>`;
    return s;
  };
  A.upg = d => G.buyUpg(d.id); A.buyAd = () => G.buyAd();

  // ---------- финансы ----------
  V.fin = function () {
    const S = WW.S, t = S.fin.today, px = G.px(); let inc = 0, exp = 0, rows = '';
    for (const c in G.catName) { const v = t[c]; if (!v) continue; if (c !== 'taxHeld') { if (v > 0) inc += v; else exp += v; } rows += `<tr><td>${G.catName[c]}</td><td class="r ${v > 0 ? 'good' : 'bad'}">${$m(v)}</td><td class="r mut">${$m(S.fin.total[c] || 0)}</td></tr>`; }
    const hist = S.fin.hist.slice(-28), mx = Math.max(1, ...hist.map(x => Math.abs(x.money))), owed = S.pawns.reduce((a, p) => a + (p.owed || 0), 0), wk = hist.slice(-7);
    const riv = k => wk.reduce((a, x) => a + (x.riv[k] || 0), 0) + G.rivers[k].reduce((a, c) => a + (t[c] || 0), 0);
    const util = Math.round((20 + 7 * G.slotList().filter(x => x.kind === 'bay').length + (S.upg.air ? 5 : 0) + (S.upg.alarm ? 9 : 13)) * px), daily = S.pawns.reduce((a, p) => a + p.wage * 10, 0);
    let s = `<div class="grid3"><div class="card"><div class="mut sm">Касса</div><div class="big ${S.money < 0 ? 'bad' : 'good'}">${$m(S.money)}</div></div><div class="card"><div class="mut sm">Сегодня</div><b class="good">+${$m(inc)}</b> / <b class="bad">${$m(exp)}</b><div class="sm">итог ${$m(inc + exp)}</div></div><div class="card"><div class="mut sm">Ипотека</div><b>${$m(S.loan.bal)}</b><div class="sm mut">платёж ${$m(S.loan.pay)} по воскресеньям</div></div></div>`;
    s += `<h3>Три реки денег · за 7 дней</h3><div class="grid3">${[['service', 'Сервис', 'ежедневный поток'], ['flip', 'Флип', 'маржа со сделок'], ['race', 'Мотоспорт', 'слава и призовые']].map(x => { const v = riv(x[0]); return `<div class="card"><div class="mut sm">${x[1]} · ${x[2]}</div><b class="${v >= 0 ? 'good' : 'bad'}">${$m(v)}</b></div>`; }).join('')}</div>`;
    if (hist.length > 1) s += `<h3>Касса по дням</h3><svg viewBox="0 0 ${hist.length * 20} 60" style="width:100%;height:70px;background:#15171a;border-radius:5px" preserveAspectRatio="none"><line x1="0" x2="${hist.length * 20}" y1="30" y2="30" stroke="#3a3f46"/><polyline fill="none" stroke="#6fcf6f" stroke-width="1.5" points="${hist.map((x, i) => (i * 20 + 10) + ',' + (30 - x.money / mx * 26)).join(' ')}"/>${hist.map((x, i) => `<rect x="${i * 20 + 6}" y="${x.net >= 0 ? 30 - Math.min(26, x.net / mx * 26 * 4) : 30}" width="8" height="${Math.min(26, Math.abs(x.net) / mx * 26 * 4)}" fill="${x.net >= 0 ? 'rgba(111,207,111,.35)' : 'rgba(229,57,53,.4)'}"/>`).join('')}</svg>`;
    s += `<h3>Сегодня по статьям</h3><table><tr><th>Статья</th><th class="r">Сегодня</th><th class="r">За всё время</th></tr>${rows || '<tr><td class="mut" colspan="3">Движений пока нет.</td></tr>'}</table>`;
    s += `<h3>Что впереди</h3><div class="sm col"><div>Каждый день: коммуналка и страховка <b>${$m(util)}</b>, начисление зарплаты <b>${$m(daily)}</b></div><div>Пятница: зарплата — накоплено <b>${$m(owed * 1.0765)}</b></div><div>Воскресенье: ипотека <b>${$m(Math.min(S.loan.pay, S.loan.bal))}</b>${S.loan.missed ? ' <span class="bad">(пропущено платежей: ' + S.loan.missed + '/2)</span>' : ''}</div><div>Раз в 14 дней: налог с продаж — собрано <b>${$m(S.taxOwed)}</b></div></div>`;
    if (S.loan.bal > 0) s += `<div class="row" style="margin-top:6px">${btn('Погасить досрочно $500', 'payLoan', { v: 500 }, 'sm', S.money < 500 ? 'Мало денег' : null)}${btn('Погасить $2,000', 'payLoan', { v: 2000 }, 'sm', S.money < 2000 ? 'Мало денег' : null)}${btn('Погасить всё', 'payLoan', { v: S.loan.bal }, 'sm', S.money < S.loan.bal ? 'Мало денег' : null)}</div>`;
    const mr = D.marketRate(S.year);
    s += `<h3>Ценообразование</h3><div class="col"><div class="row"><span style="width:170px">Нормо-час: <b>${$m(S.set.rate)}</b></span><input type="range" min="${Math.round(mr * .6)}" max="${Math.round(mr * 1.6)}" value="${S.set.rate}" data-c="set" data-k="rate"><span class="mut sm">рынок ≈ ${$m(mr)}. Дороже рынка — чаще отказы и ниже «Цена».</span></div>
      <div class="row"><span style="width:170px">Наценка на детали: <b>${Math.round(S.set.markup * 100)}%</b></span><input type="range" min="0" max="120" step="5" value="${Math.round(S.set.markup * 100)}" data-c="markup"><span class="mut sm">клиент сравнивает с ценой OEM +40%.</span></div>
      <div class="row"><span style="width:170px">Диагностика: <b>${$m(S.set.diagFee)}</b></span><input type="range" min="0" max="${Math.round(60 * px)}" step="5" value="${S.set.diagFee}" data-c="set" data-k="diagFee"><span class="mut sm">0 — бесплатная диагностика как маркетинг.</span></div></div>`;
    const mods = S.mods.filter(m => m.until >= S.day);
    if (mods.length) s += '<h3>Действующие эффекты</h3>' + mods.map(m => `<div class="sm">• ${h(m.label || m.k)}: ${({ clients: 'клиенты', rate: 'ставка', parts: 'цены деталей', tools: 'время работ', delivery: 'доставка' })[m.k] || m.k} ×${m.v} — ещё ${m.until - S.day + 1} дн.</div>`).join('');
    s += `<h3>Правила игры</h3><div class="row"><label><input type="checkbox" data-c="set" data-k="interv" ${S.set.interv ? 'checked' : ''}> «Вмешательство мастера» на критических работах</label><label><input type="checkbox" data-c="set" data-k="tut" ${S.set.tut ? 'checked' : ''}> Подсказки Попса</label></div>`;
    return s;
  };
  A.markup = (d, el) => { WW.S.set.markup = +el.value / 100; }; A.payLoan = d => G.payLoan(Math.round(+d.v));

  // ---------- гонки ----------
  V.race = function () {
    const S = WW.S, r = S.race; let s = '<p class="mut sm">За руль ты не садишься: гонка — экзамен для всей мастерской. Машина едет на реально установленных деталях. Расписание: по субботам брекеты и автокросс через неделю, в последнюю субботу сезона — Junkyard 24.</p>';
    if (r && r.day === S.day) {
      s += `<div class="card" style="border-color:var(--acc)"><b>Сегодня вечером: ${h(r.name)}</b><div class="sm mut">Взнос ${$m(r.fee)}. ${({ drag: 'Брекеты: назначаешь прогноз времени (dial-in) и должен приехать как можно ближе к нему, но не быстрее. Побеждает стабильность, а не мощность. Три раунда на вылет.', autox: 'Три попытки по конусам на парковке. В зачёт — лучшая. Решают шины, подвеска, масса и руки пилота.', junk: 'Сутки на трассе на машине не дороже лимита. Решает надёжность: каждый слабый узел — кандидат на остановку. Нужен прицеп.' })[r.type]}</div>`;
      if (r.entry) { const c = S.cars[r.entry.car], p = P.byId(r.entry.p); s += `<div class="good" style="margin-top:6px">Заявлены: ${c ? h(C.name(c)) : '—'}, пилот ${p ? h(p.name) : '—'}${r.entry.dial ? ', dial-in ' + r.entry.dial.toFixed(2) + ' с' : ''}. Старт после закрытия в 19:00.</div>`; }
      else {
        const cars = M.raceCars();
        if (!cars.length) s += '<div class="bad" style="margin-top:6px">Нет своей машины на ходу без открытого наряда.</div>';
        else {
          const sel = S.cars[UI.sub.rcar] && cars.includes(S.cars[UI.sub.rcar]) ? S.cars[UI.sub.rcar] : cars[0], pf = C.perf(sel), drv = S.pawns.filter(p => p.state === 'work').sort((a, b) => b.skills.drive - a.skills.drive);
          s += `<div class="row" style="margin-top:8px">Машина: <select data-c="rcar">${cars.map(c => `<option value="${c.id}" ${c === sel ? 'selected' : ''}>${h(C.name(c))}</option>`).join('')}</select> Пилот: <select id="rdrv">${drv.map(p => `<option value="${p.id}">${h(p.name)} (вождение ${p.skills.drive})</option>`).join('')}</select></div>
            <div class="row sm" style="margin-top:6px"><span class="pill">${pf.hp} л.с.</span><span class="pill">${pf.wt} фунтов</span><span class="pill">стабильность ${Math.round(pf.stab * 100)}%</span><span class="pill">сцепление ${Math.round(pf.grip * 100)}%</span></div>`;
          if (r.type === 'drag') s += `<div class="row" style="margin-top:6px"${tip('Тренировочный заезд показал это время. Поставишь прогноз слишком смело — не дотянешь; слишком осторожно — приедешь быстрее и вылетишь за «брейкаут».')}>Тренировка: ≈ <b>${pf.et.toFixed(2)} с</b> ± ${(.05 + (1 - pf.stab) * .3).toFixed(2)}. Dial-in: <input type="number" id="rdial" step="0.01" value="${(pf.et + .04).toFixed(2)}"></div>`;
          const weak = ['gearbox', 'clutch', 'drive', 'block', 'cool', 'wheels', 'brakes'].filter(id => sel.nodes[id] && sel.nodes[id].hi < 50);
          if (weak.length) s += `<div class="sm bad" style="margin-top:4px">Слабые места: ${weak.map(id => D.nodes[id].n).join(', ')} — могут не пережить гонку.</div>`;
          s += `<div class="row" style="margin-top:8px">${btn('Заявиться — ' + $m(r.fee), 'raceEnter', { id: sel.id }, 'pri')}</div>`;
        }
      }
      s += '</div>';
    } else { const dl = (5 - G.dow() + 7) % 7; s += `<div class="card">Ближайшая гонка — в субботу (${dl === 0 ? 'сегодня уже прошла или не объявлена' : 'через ' + dl + ' дн.'}). Подготовь машину: шины, сцепление, коробка, зажигание.</div>`; }
    s += `<h3>Команда</h3><div class="row sm"><span class="pill">стартов: ${S.stats.races}</span><span class="pill y">побед: ${S.stats.wins}</span></div>`;
    s += '<h3>Гараж для гонок</h3>' + (M.raceCars().length ? M.raceCars().map(c => { const pf = C.perf(c); return `<div class="kc" data-a="go" data-k="car" data-id="${c.id}"><b>${h(C.name(c))}</b> <span class="s">${pf.hp} л.с. · ${pf.wt} фунтов · ¼ мили ≈ ${pf.et.toFixed(2)} с · моды: ${c.mods.length}</span></div>`; }).join('') : '<p class="mut">Нужна своя машина на ходу.</p>');
    return s;
  };
  A.rcar = (d, el) => { UI.sub.rcar = +el.value; };
  A.raceEnter = d => { const dv = $('rdrv'), dl = $('rdial'); M.raceEnter(+d.id, dv ? +dv.value : WW.S.pawns[0].id, dl ? +dl.value : null); };

  // ---------- летопись, цели ----------
  V.log = function () {
    const S = WW.S, f = UI.sub.logf || 'all', list = S.log.filter(l => f === 'all' || l.k === f).slice(0, 150);
    let s = `<div class="row" style="margin-bottom:6px">${[['all', 'Всё'], ['story', 'Истории'], ['good', 'Хорошее'], ['bad', 'Плохое']].map(x => btn(x[1], 'logf', { f: x[0] }, 'sm ' + (f === x[0] ? 'on' : ''))).join('')}</div>`;
    s += '<h3>Последние отзывы</h3>' + (S.reviews.length ? S.reviews.slice(0, 5).map(r => `<div class="logl"><span class="acc">${stars(r.stars)}</span> ${h(r.name)}: «${h(r.t)}»</div>`).join('') : '<p class="mut">Отзывов пока нет.</p>');
    s += '<h3>Хроника</h3>' + list.map(l => `<div class="logl ${l.k}"><span class="d">${l.y}, д.${l.d + 1} ${U.time(l.m)}</span>${h(l.t)}</div>`).join('');
    return s;
  };
  A.logf = d => { UI.sub.logf = d.f; };
  V.goals = function () {
    const S = WW.S, st = E.stage(), gl = E.goals();
    let s = `<div class="card"><b>Ступень ${st.n}: ${st.name}</b><div class="sm mut">Гараж → Мастерская (репутация 45, первый сотрудник) → Сервис-центр (4 бокса, приёмщик, репутация 60) → дальше — после v1.</div></div><h3>Акт I · «Заправка Попса»${S.act1 != null ? ' — пройден ✔' : ''}</h3>`;
    s += gl.map(g => `<div class="row" style="margin:3px 0"><span style="width:20px">${g.v >= g.m ? '✅' : '⬜'}</span><span style="flex:1">${h(g.t)}</span><div class="pbar" style="width:120px"><i style="width:${Math.round(g.v / g.m * 100)}%"></i></div><span class="mut sm" style="width:50px;text-align:right">${g.v}/${g.m}</span></div>`).join('');
    s += '<h3>Достижения</h3><div class="row">' + Object.keys(E.achNames).map(id => `<span class="pill ${S.ach[id] ? 'y' : ''}" style="${S.ach[id] ? '' : 'opacity:.45'}">${S.ach[id] ? '🏆' : '🔒'} ${h(E.achNames[id][0])}</span>`).join('') + '</div>';
    s += `<h3>Статистика</h3><div class="row sm"><span class="pill">нарядов: ${S.stats.orders}</span><span class="pill">средняя оценка: ${S.stats.stars.length ? (S.stats.stars.reduce((a, b) => a + b, 0) / S.stats.stars.length).toFixed(2) : '—'} ★</span><span class="pill">возвратов: ${S.stats.comebacks}</span><span class="pill">куплено / продано: ${S.stats.bought} / ${S.stats.sold}</span><span class="pill">прибыль с флипа: ${$m(S.stats.flipProfit)}</span><span class="pill">лучшая сделка: ${$m(S.stats.best)}</span></div>`;
    s += '<h3>Энциклопедия гаража</h3><p class="mut sm">Наполняется по мере работы: болячки модели открываются после первого закрытого наряда на ней.</p><table><tr><th>Модель</th><th>Годы</th><th>Мотор, привод</th><th>Кривая цены</th><th>Нарядов</th><th>Фирменные болячки</th></tr>';
    for (const m of Object.values(D.models)) { if (m.y[0] > S.year) continue; const n = S.enc[m.id] || 0; s += `<tr><td><b>${m.make} ${m.name}</b></td><td>${m.y[0]}–${m.y[1]}</td><td>${m.eng}, ${m.layout}</td><td>${D.curveName[m.curve]}</td><td>${n}</td><td class="sm">${n ? m.sig.map(x => D.nodes[x.n].n + ': ' + x.t).join('; ') : '<span class="mut">ещё не знаем</span>'}</td></tr>`; }
    return s + '</table>';
  };
})(globalThis.WW);
