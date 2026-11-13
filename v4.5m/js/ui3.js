// WRENCHWORLD — интерфейс v5: заказ-наряд с 5 проекциями и слоями, кузов по панелям, тюнинг грейдами,
// мини-игры хозяина, поиск б/у по телефону, дебаг-меню.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, O = WW.O, P = WW.P, R = WW.R, N = WW.N, B = WW.B, UI = WW.UI, MOD = WW.MOD;
  const A = UI.act, V = UI.views, $ = id => document.getElementById(id), h = U.esc, $m = U.money;
  const tip = t => ' data-tip="' + h(t) + '"';
  const btn = (label, a, data, cls, dis) => `<button class="btn ${cls || ''}" data-a="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${h(v)}"`).join(' ')} ${dis ? 'disabled' + tip(dis === true ? '' : dis) : ''}>${label}</button>`;

  // =====================================================================
  // заказ-наряд: 5 проекций, слои, состояние узлов цветом (как в Project Zomboid)
  // =====================================================================
  const BOX = {
    block: [[.08, .24, .3, .7, .28, .55]], head: [[.08, .24, .3, .7, .56, .66]], gasket: [[.08, .24, .3, .7, .54, .57]], intake: [[.1, .22, .62, .82, .5, .68]],
    fuel: [[.12, .2, .2, .38, .55, .68], [.74, .88, .3, .7, .16, .26]], ign: [[.05, .11, .25, .75, .5, .62]], cool: [[.005, .05, .15, .85, .3, .6]], lube: [[.08, .24, .32, .68, .19, .27]],
    exh: [[.2, .99, .36, .46, .1, .16]], turbo: [[.18, .24, .14, .3, .4, .55]], clutch: [[.24, .29, .38, .62, .25, .45]], gearbox: [[.29, .42, .4, .6, .2, .4]],
    drive: [[.42, .82, .46, .54, .15, .22], [.8, .88, .4, .6, .14, .28]], transfer: [[.42, .48, .4, .6, .18, .3]],
    fsusp: [[.12, .24, .06, .18, .15, .45], [.12, .24, .82, .94, .15, .45]], rsusp: [[.76, .88, .06, .18, .15, .45], [.76, .88, .82, .94, .15, .45]], steer: [[.16, .24, .2, .8, .25, .32]],
    pads: [[.16, .2, .02, .07, .17, .3], [.16, .2, .93, .98, .17, .3], [.8, .84, .02, .07, .17, .3], [.8, .84, .93, .98, .17, .3]],
    discs: [[.14, .22, .01, .04, .1, .36], [.14, .22, .96, .99, .1, .36], [.78, .86, .01, .04, .1, .36], [.78, .86, .96, .99, .1, .36]],
    brakes: [[.3, .36, .2, .3, .55, .62], [.2, .8, .08, .1, .2, .22]], wheels: [[.12, .26, 0, .1, 0, .3], [.12, .26, .9, 1, 0, .3], [.76, .9, 0, .1, 0, .3], [.76, .9, .9, 1, 0, .3]],
    start: [[.04, .1, .7, .86, .4, .55]], wiring: [[.3, .4, .2, .8, .55, .68], [.05, .95, .48, .52, .3, .32]],
    hl_fl: [[0, .04, .05, .2, .4, .5]], hl_fr: [[0, .04, .8, .95, .4, .5]], tl_rl: [[.96, 1, .05, .2, .42, .52]], tl_rr: [[.96, 1, .8, .95, .42, .52]],
    frame: [[.05, .95, .15, .25, .07, .13], [.05, .95, .75, .85, .07, .13]], interior: [[.34, .72, .14, .86, .3, .78]]
  };
  const PBOX = { hood: [0, .3, .08, .92, .6, .65], roof: [.36, .72, .12, .88, .93, 1], trunk: [.82, 1, .1, .9, .6, .67], fl: [0, .3, 0, .07, .25, .62], fr: [0, .3, .93, 1, .25, .62],
    rl: [.72, 1, 0, .07, .25, .66], rr: [.72, 1, .93, 1, .25, .66], dfl: [.3, .51, 0, .06, .2, .72], dfr: [.3, .51, .94, 1, .2, .72], drl: [.51, .72, 0, .06, .2, .72], drr: [.51, .72, .94, 1, .2, .72], fbump: [0, .03, .04, .96, .14, .3], rbump: [.97, 1, .04, .96, .14, .3] };
  const LAYER = { 'Двигатель': 'eng', 'Трансмиссия': 'trans', 'Ходовая': 'susp', 'Колёса': 'susp', 'Электрика': 'elec', 'Кузов': 'body' };
  const LAYERS = [['body', 'Кузов'], ['eng', 'Двигатель'], ['trans', 'Трансмиссия'], ['susp', 'Подвеска и тормоза'], ['elec', 'Электрика']];
  const VIEWS = [['left', 'Слева'], ['right', 'Справа'], ['top', 'Сверху'], ['front', 'Спереди'], ['rear', 'Сзади']];
  const col = (mid, fog, gone) => gone ? '#1b1b1b' : fog > 60 ? '#6b7280' : 'hsl(' + Math.round(U.clamp(mid, 0, 100) * 1.2) + ',72%,46%)';
  UI.sub.bpView = UI.sub.bpView || 'left'; UI.sub.bpL = UI.sub.bpL || { body: 1, eng: 1, trans: 1, susp: 1, elec: 1 };
  R.drawBlueprint = function (cv, car) {
    const c = cv.getContext('2d'), w = cv.width, hh = cv.height, m = D.models[car.model], view = UI.sub.bpView, L = UI.sub.bpL;
    c.fillStyle = '#1E3A5F'; c.fillRect(0, 0, w, hh); c.strokeStyle = 'rgba(207,227,247,.06)'; c.lineWidth = 1; for (let x = 0; x < w; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); } for (let y = 0; y < hh; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const Hm = /pickup|suv|van|jeep/.test(m.body) ? 1.8 : m.body === 'roadster' ? 1.25 : 1.4, dims = { left: [m.L, Hm], right: [m.L, Hm], top: [m.L, m.W], front: [m.W, Hm], rear: [m.W, Hm] }[view];
    const sc = Math.min((w - 60) / dims[0], (hh - 50) / dims[1]), ox = (w - dims[0] * sc) / 2, oy = (hh - dims[1] * sc) / 2 + 8;
    // проекция бокса [x0,x1,y0,y1,z0,z1] в прямоугольник экрана
    const proj = b => { let a0, a1, b0, b1; if (view === 'left') { a0 = b[0] * m.L; a1 = b[1] * m.L; b0 = (1 - b[5]) * Hm; b1 = (1 - b[4]) * Hm; } else if (view === 'right') { a0 = (1 - b[1]) * m.L; a1 = (1 - b[0]) * m.L; b0 = (1 - b[5]) * Hm; b1 = (1 - b[4]) * Hm; } else if (view === 'top') { a0 = b[0] * m.L; a1 = b[1] * m.L; b0 = b[2] * m.W; b1 = b[3] * m.W; } else if (view === 'front') { a0 = (1 - b[3]) * m.W; a1 = (1 - b[2]) * m.W; b0 = (1 - b[5]) * Hm; b1 = (1 - b[4]) * Hm; } else { a0 = b[2] * m.W; a1 = b[3] * m.W; b0 = (1 - b[5]) * Hm; b1 = (1 - b[4]) * Hm; } return [ox + a0 * sc, oy + b0 * sc, Math.max(2, (a1 - a0) * sc), Math.max(2, (b1 - b0) * sc)]; };
    const depth = b => view === 'left' ? -(b[2] + b[3]) : view === 'right' ? (b[2] + b[3]) : view === 'top' ? (b[4] + b[5]) : view === 'front' ? -(b[0] + b[1]) : (b[0] + b[1]);
    // силуэт
    c.strokeStyle = '#CFE3F7'; c.lineWidth = 2; c.fillStyle = 'rgba(207,227,247,.07)';
    if (view === 'left' || view === 'right') { const sp = (R.SIDE && R.SIDE[m.body]) || [[0, .55], [.02, .74], [.27, .84], [.38, 1.34], [.68, 1.36], [.8, .9], [.98, .88], [1, .6]]; c.beginPath(); sp.forEach((p, i) => { const fx = view === 'left' ? p[0] : 1 - p[0], X = ox + fx * m.L * sc, Y = oy + (Hm - p[1] * Hm / 1.45) * sc; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.lineTo(ox + (view === 'left' ? 1 : 0) * m.L * sc, oy + Hm * sc * .85); c.lineTo(ox + (view === 'left' ? 0 : 1) * m.L * sc, oy + Hm * sc * .85); c.closePath(); c.fill(); c.stroke(); }
    else if (view === 'top') { c.beginPath(); c.roundRect(ox, oy, m.L * sc, m.W * sc, 18); c.fill(); c.stroke(); }
    else { c.beginPath(); c.moveTo(ox, oy + Hm * sc * .85); c.lineTo(ox, oy + Hm * sc * .45); c.lineTo(ox + m.W * sc * .14, oy + Hm * sc * .08); c.lineTo(ox + m.W * sc * .86, oy + Hm * sc * .08); c.lineTo(ox + m.W * sc, oy + Hm * sc * .45); c.lineTo(ox + m.W * sc, oy + Hm * sc * .85); c.closePath(); c.fill(); c.stroke(); }
    // узлы и панели
    const items = [];
    for (const id in car.nodes) { if (id === 'panels' || !BOX[id]) continue; const nd = D.nodes[id]; if (!L[LAYER[nd.g]]) continue; const n = car.nodes[id]; for (const b of BOX[id]) items.push({ b, id, n, name: nd.n, mid: (n.lo + n.hi) / 2, fog: n.hi - n.lo, gone: n.gone, body: id === 'frame' || id === 'interior' }); }
    if (L.body && car.body) for (const pid in car.body) { const p = car.body[pid], cnd = B.cond(p); items.push({ b: PBOX[pid] || PBOX.hood, id: pid, name: D.panels[pid].n, mid: cnd, fog: 0, panel: p, body: 1 }); }
    items.sort((a, b2) => (a.panel ? 0 : 1) - (b2.panel ? 0 : 1) || depth(a.b) - depth(b2.b));
    UI.bpHits = [];
    for (const it of items) {
      const r = proj(it.b); c.globalAlpha = it.panel ? .38 : .9; c.fillStyle = col(it.mid, it.fog, it.gone); c.fillRect(r[0], r[1], r[2], r[3]);
      if (it.fog > 25 && it.fog <= 60) { c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; for (let x = r[0] - r[3]; x < r[0] + r[2]; x += 5) { c.beginPath(); c.moveTo(x, r[1] + r[3]); c.lineTo(x + r[3], r[1]); c.stroke(); } c.restore(); }
      c.globalAlpha = 1; c.strokeStyle = 'rgba(10,20,35,.7)'; c.lineWidth = 1; c.strokeRect(r[0] + .5, r[1] + .5, r[2] - 1, r[3] - 1);
      if (it.gone) { c.strokeStyle = '#ff5a4d'; c.beginPath(); c.moveTo(r[0], r[1]); c.lineTo(r[0] + r[2], r[1] + r[3]); c.moveTo(r[0] + r[2], r[1]); c.lineTo(r[0], r[1] + r[3]); c.stroke(); }
      UI.bpHits.push({ r, it });
    }
    c.fillStyle = '#CFE3F7'; c.font = '11px system-ui'; c.textAlign = 'left'; c.fillText(m.make.toUpperCase() + ' ' + m.name.toUpperCase() + ' · ' + car.year + ' · ' + VIEWS.find(v => v[0] === view)[1].toUpperCase(), 10, 15);
    c.textAlign = 'right'; c.fillText('VIN ' + car.vin, w - 10, 15);
    // легенда
    const lg = [['#6b7280', 'неизвестно'], ['hsl(0,72%,46%)', '0%'], ['hsl(60,72%,46%)', '50%'], ['hsl(120,72%,46%)', '100%']]; let lx = 10; c.textAlign = 'left';
    for (const g of lg) { c.fillStyle = g[0]; c.fillRect(lx, hh - 16, 12, 10); c.fillStyle = '#CFE3F7'; c.fillText(g[1], lx + 16, hh - 7); lx += 26 + g[1].length * 6; }
    if (!cv.dataset.hov) { cv.dataset.hov = 1; cv.addEventListener('mousemove', e => { const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * cv.width / rc.width, y = (e.clientY - rc.top) * cv.height / rc.height; let hit = null; for (const k of UI.bpHits || []) if (x >= k.r[0] && x <= k.r[0] + k.r[2] && y >= k.r[1] && y <= k.r[1] + k.r[3]) hit = k; if (!hit) { cv.dataset.tip = ''; return; } const it = hit.it; cv.dataset.tip = it.panel ? it.name + ' — ' + Math.round(it.mid) + '%\nВмятины: ' + Math.round(100 - it.panel.dent) + '% · краска ' + Math.round(it.panel.paint) + '% · ржавчина ' + Math.round(it.panel.rust) + '%' : it.name + ' — ' + (it.gone ? 'снят' : it.fog > 60 ? 'состояние неизвестно' : it.n.lo + '–' + it.n.hi + '%') + (it.n && it.n.grade ? '\nГрейд: ' + D.grades[it.n.grade].n : ''); }); }
  };
  UI.bpControls = function () {
    return `<div class="row sm" style="margin:6px 0 4px">${VIEWS.map(v => `<button class="btn sm ${UI.sub.bpView === v[0] ? 'on' : ''}" data-a="bpView" data-v="${v[0]}">${v[1]}</button>`).join('')}<span style="width:10px"></span><span class="mut">Слои:</span>${LAYERS.map(l => `<button class="btn sm ${UI.sub.bpL[l[0]] ? 'on' : ''}" data-a="bpLayer" data-v="${l[0]}">${l[1]}</button>`).join('')}</div>`;
  };
  A.bpView = d => { UI.sub.bpView = d.v; }; A.bpLayer = d => { UI.sub.bpL[d.v] = UI.sub.bpL[d.v] ? 0 : 1; };
  const baseCar = V.car; V.car = function (id) { return baseCar(id).replace(/<canvas class="bp" data-bp="(\d+)" width="700" height="250"[^>]*><\/canvas>/, (s0, cid) => UI.bpControls() + `<canvas class="bp" data-bp="${cid}" width="760" height="300" style="margin:2px 0 8px"></canvas>`); };

  // =====================================================================
  // наряд: проекции, кузов по панелям, тюнинг грейдами, б/у по телефону
  // =====================================================================
  const baseOrder = V.order;
  V.order = function (id) {
    const S = WW.S, o = S.orders[id]; let s = baseOrder(id); if (!o) return s; const car = S.cars[o.car];
    s = s.replace('<h3>Гипотезы</h3>', `<h3>Заказ-наряд: схема машины</h3>${UI.bpControls()}<canvas class="bp" data-bp="${car.id}" width="760" height="280" style="margin:2px 0 6px"></canvas><h3>Гипотезы</h3>`);
    if (!o.syms.length && s.indexOf('data-bp=') < 0) s = s.replace('<h3>Узлы: известное состояние</h3>', `<h3>Заказ-наряд: схема машины</h3>${UI.bpControls()}<canvas class="bp" data-bp="${car.id}" width="760" height="280"></canvas><h3>Узлы: известное состояние</h3>`);
    if (s.indexOf('data-bp=') < 0) s = s.replace('<h3>Узлы', `<h3>Заказ-наряд: схема машины</h3>${UI.bpControls()}<canvas class="bp" data-bp="${car.id}" width="760" height="280"></canvas><h3>Узлы`);
    const edit = o.type === 'own' || o.stage === 'diag' || o.stage === 'work' || o.stage === 'parts';
    // кузов
    if (car.body && edit) {
      s += `<h3>Кузов по панелям</h3><table class="sm"><tr><th>Панель</th><th>Вмятины</th><th>Краска</th><th>Ржавчина</th><th>Итог</th><th>Работы</th></tr>`;
      for (const pid of B.panelIds(car)) { const p = car.body[pid]; if (!p) continue; const cnd = B.cond(p), bar = (v, good) => `<div class="bar" style="width:56px"><i style="left:0;width:${v}%;background:${good ? D.condOf(v).c : D.condOf(100 - v).c}"></i></div>`;
        const b2 = (key, lbl) => { const why = O.why(o, { kind: 'body', key, panel: pid }); return `<button class="btn sm" data-a="bjob" data-o="${o.id}" data-k="${key}" data-p="${pid}" ${why ? 'disabled' : ''}${tip(D.bodyWork[key].n + ': ' + D.bodyWork[key].d + (why ? '\n⛔ ' + why : '') + (D.bodyWork[key].mg ? '\nЕсли работает хозяин — мини-игра, за хороший результат бонус к качеству.' : ''))}>${lbl}</button>`; };
        s += `<tr><td>${h(D.panels[pid].n)}${p.orig ? '' : ' <span class="mut"' + tip('Не родная: ' + D.grades[p.grade || 'oem'].n) + '>◇</span>'}</td><td>${bar(100 - p.dent, false)}</td><td>${bar(p.paint, true)}</td><td>${bar(p.rust, false)}</td><td><b style="color:${D.condOf(cnd).c}">${Math.round(cnd)}%</b></td><td>${b2('dent', '🔨')}${b2('derust', '🧽')}${b2('paint', '🎨')}${b2('swap', '⇄')}</td></tr>`; }
      s += `</table><div class="sm mut">🔨 рихтовка · 🧽 зачистка ржавчины · 🎨 покраска (без покрасочного поста не выше ${B.paintCap()}%) · ⇄ замена панели. Мини-игры: ${WW.S.set.mg === false ? 'выключены' : 'включены'} — ${btn(WW.S.set.mg === false ? 'включить' : 'выключить', 'mgToggle', {}, 'sm')}</div>`;
    }
    // тюнинг — детали другого грейда
    if (o.type === 'own') {
      s += '<h3>Тюнинг: детали премиум и гоночного грейда</h3><div class="sm mut" style="margin-bottom:4px">Тюнинг — это не «плюс к мощности», а другие детали для этой же машины: премиум даёт +4% мощности или сцепления на узел, гоночный — +8%, но жёстче, громче и дороже.</div><table class="sm">';
      for (const nid in D.perfNode) { const n = car.nodes[nid]; if (!n) continue; const pr = gr => Math.round(D.nodes[nid].part * C.model(car).pm * G.px() * D.grades[gr].price); s += `<tr><td>${h(D.nodes[nid].n)}</td><td><span class="pill" style="border-color:${D.grades[n.grade].c}">${D.grades[n.grade].icon} ${D.grades[n.grade].short}</span></td><td class="mut">${{ hp: 'мощность', grip: 'сцепление', brake: 'торможение' }[D.perfNode[nid]]}</td><td>${['sport', 'race'].map(gr => btn(D.grades[gr].short + ' ' + $m(pr(gr)), 'tuneJob', { o: o.id, n: nid, g: gr }, 'sm', n.grade === gr ? 'уже стоит' : O.why(o, { kind: 'replace', node: nid }) || null)).join(' ')}</td></tr>`; }
      s += '</table>';
    }
    // б/у по телефону
    if (edit) s += `<h3>Б/у по телефону</h3><div class="row sm">Нужна деталь: <select id="useNode">${C.nodeIds(car).filter(nid => D.nodes[nid].repl).map(nid => `<option value="${nid}">${h(D.nodes[nid].n)}</option>`).join('')}</select>${btn('📞 Обзвонить разборки и объявления', 'usedOpen', { o: o.id }, 'sm pri')}<span class="mut">по телефону могут и приврать — в обе стороны</span></div>`;
    return s;
  };
  A.bjob = d => { const o = WW.S.orders[+d.o]; if (!o) return; const sp = { kind: 'body', key: d.k, panel: d.p, grade: d.k === 'swap' ? (o.type === 'own' ? 'oem' : O.defGrade(o)) : null }; const why = O.why(o, sp); if (why || !O.addJob(o, sp)) G.toast('Нельзя: ' + (why || 'недоступно на этой стадии') + '.', 'bad'); };
  A.tuneJob = d => { const o = WW.S.orders[+d.o]; if (!o) return; const sp = { kind: 'replace', node: d.n, grade: d.g }; const why = O.why(o, sp); if (why || !O.addJob(o, sp)) G.toast('Нельзя: ' + (why || 'недоступно') + '.', 'bad'); };
  A.mgToggle = () => { WW.S.set.mg = WW.S.set.mg === false; };
  A.usedOpen = d => { const o = WW.S.orders[+d.o], el = $('useNode'); if (o && el) MOD.used(o, el.value); };

  // ---------- модалка поиска б/у ----------
  MOD.used = function (o, node) {
    const S = WW.S, car = S.cars[o.car], offers = B.offers(car.model, node), ppl = S.pawns.filter(p => p.state === 'work' && !p.arriveAt);
    const job = o.jobs.find(j => j.node === node && j.kind === 'replace' && (j.status === 'prop' || j.status === 'ready'));
    const draw = () => {
      let s = `<h2>📞 Б/у: ${h(D.nodes[node].n)} на ${h(C.short(car))}</h2><p class="sm mut">Звонок — бесплатно. Продавцы называют состояние на глаз, а некоторые — врут. «Торговля» хозяина помогает услышать фальшь. Забирает деталь тот, кого пошлёшь: его не будет в мастерской, пока ездит.${job ? ' Найденная деталь заменит позицию в наряде.' : ''}</p><table class="sm"><tr><th>Кто</th><th>Езды</th><th>Состояние со слов</th><th>Цена</th><th></th></tr>`;
      for (const of of offers) {
        s += `<tr><td><b>${h(of.who)}</b>${of.called ? `<div class="mut">«${h(of.line)}» — <i>${h(of.read)}</i></div>` : ''}</td><td>${of.dist} мин</td><td>${of.called ? '<b>' + of.stated + '%</b>' : '—'}</td><td>${of.called ? $m(of.price) : '—'}</td><td>${of.called ? btn('Сбить цену', 'uHag', { id: of.id }, 'sm', of.haggled ? 'уже торговались' : null) + ' ' + btn('Забрать', 'uGet', { id: of.id }, 'sm pri', !ppl.length ? 'некого послать' : null) : btn('📞 Позвонить', 'uCall', { id: of.id }, 'sm')}</td></tr>`;
      }
      s += `</table><div class="row" style="margin-top:8px">Кто поедет: <select id="uWho">${ppl.map(p => `<option value="${p.id}">${h(p.name)}</option>`).join('')}</select><span style="flex:1"></span>${btn('Закрыть', 'mResume')}</div>`;
      MOD.show(s, 'mwide', 'used');
    };
    A.uCall = d => { const of = offers.find(x => x.id === +d.id); if (of) { of.called = true; of.read = B.read(of); WW.A.play('ping'); } draw(); };
    A.uHag = d => { const of = offers.find(x => x.id === +d.id); if (of) G.toast(B.haggle(of) ? 'Уступили: теперь ' + $m(of.price) + '.' : '«Не, дешевле не отдам».', 'info'); draw(); };
    A.uGet = d => { const of = offers.find(x => x.id === +d.id), w = $('uWho'); if (of && w && B.fetch(of, +w.value, o.id, job && job.id)) MOD.hide(); };
    draw();
  };

  // =====================================================================
  // мини-игры хозяина: покраска, ржавчина, рихтовка
  // =====================================================================
  const GW = 64, GH = 36;
  WW.on('minigame', e => {
    const S = WW.S, o = S.orders[e.o], j = o && o.jobs.find(x => x.id === e.j); if (!j) return; const car = S.cars[o.car];
    const title = { paint: '🎨 Покраска', rust: '🧽 Зачистка ржавчины', dent: '🔨 Рихтовка' }[e.type];
    const how = { paint: 'Зажми мышь и води пистолетом. Нужен ровный слой: зелёные клетки — в самый раз, тёмные — мало, красные — потёки. 12 секунд.', rust: 'Зажми мышь и води болгаркой по рыжим пятнам. Не задерживайся на чистом металле — прожжёшь насквозь. 14 секунд.', dent: 'Бей молотком (клик) в центр вмятины. Удар мимо вмятины выбивает горб. 12 секунд.' }[e.type];
    MOD.show(`<div class="row"><h2 style="flex:1">${title}: ${h(j.name)}</h2><span class="pill">${h(C.short(car))}</span></div><p class="sm mut">${how} Это делает хозяин сам — за чистую работу бонус к качеству и скорости. Выключить мини-игры можно в наряде или в «Финансах».</p><canvas id="mg" width="768" height="432" style="width:100%;border-radius:8px;background:#22252a;cursor:crosshair;touch-action:none"></canvas><div class="timer"><i id="mgT" style="width:100%"></i></div><div class="row"><span id="mgS" class="b"></span><span style="flex:1"></span>${btn('Пропустить (без бонуса)', 'mgSkip', {}, 'sm')}</div>`, 'mwide', 'mg');
    const cv = $('mg'), c = cv.getContext('2d'), cw = cv.width / GW, ch = cv.height / GH, cells = new Float32Array(GW * GH), heat = new Float32Array(GW * GH), tl = e.type === 'rust' ? 14 : 12;
    let down = false, mx = 0, my = 0, t0 = performance.now(), done = false, holes = 0, bulges = 0, hits = 0;
    const r = Math.random; const color = car.color || '#b4322b';
    // форма панели — скруглённый прямоугольник с «окном»; клетки вне формы не считаются
    const inside = (gx, gy) => { const x = (gx + .5) / GW, y = (gy + .5) / GH; return x > .06 && x < .94 && y > .08 && y < .92 && !(e.type !== 'rust' && x > .62 && x < .86 && y > .16 && y < .44 && j.panel && /^d/.test(j.panel)); };
    const dents = [];
    if (e.type === 'rust') for (let k = 0; k < 7; k++) { const cx = .12 + r() * .76, cy = .15 + r() * .7, rad = .05 + r() * .08; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const dx = (gx + .5) / GW - cx, dy = ((gy + .5) / GH - cy) * .56, d2 = Math.hypot(dx, dy); if (d2 < rad && inside(gx, gy)) cells[gy * GW + gx] = Math.max(cells[gy * GW + gx], 1 - d2 / rad * .5); } }
    if (e.type === 'dent') for (let k = 0; k < 5; k++) dents.push({ x: .15 + r() * .7, y: .2 + r() * .6, d: .6 + r() * .4, rad: .06 + r() * .05 });
    const total = (() => { let n = 0; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (inside(gx, gy)) n++; return n; })(), rust0 = cells.reduce((a, b) => a + b, 0);
    const pos = ev => { const rc = cv.getBoundingClientRect(); mx = (ev.clientX - rc.left) / rc.width; my = (ev.clientY - rc.top) / rc.height; };
    cv.addEventListener('pointerdown', ev => { down = true; pos(ev); if (e.type === 'dent') hammer(); }); window.addEventListener('pointerup', () => { down = false; }); cv.addEventListener('pointermove', pos);
    function hammer() {
      hits++; WW.A.play('stamp'); let any = false;
      for (const dn of dents) { const d = Math.hypot(mx - dn.x, (my - dn.y) * .56); if (d < dn.rad * 1.4) { any = true; dn.d = Math.max(0, dn.d - (.42 * (1 - d / (dn.rad * 1.4))) - .05); } }
      if (!any) { bulges++; dents.push({ x: mx, y: my, d: -.35, rad: .03 }); }
    }
    const score = () => {
      if (e.type === 'paint') { let good = 0, runs = 0; for (let i = 0; i < cells.length; i++) { const gx = i % GW, gy = Math.floor(i / GW); if (!inside(gx, gy)) continue; if (cells[i] > .75 && cells[i] < 1.45) good++; if (cells[i] > 1.7) runs++; } return U.clamp(good / total - runs / total * 2, 0, 1); }
      if (e.type === 'rust') { const left = cells.reduce((a, b) => a + b, 0); return U.clamp(1 - left / Math.max(1, rust0) - holes * .07, 0, 1); }
      let res = 0; for (const dn of dents) res += Math.abs(dn.d); return U.clamp(1 - res / 4 - bulges * .06, 0, 1);
    };
    const finish = sc => { if (done) return; done = true; B.mgResult(e.o, e.j, sc); const tx = sc > .85 ? 'Шедевр!' : sc > .65 ? 'Хорошо' : sc > .4 ? 'Сойдёт' : 'Так себе'; $('mgS').textContent = tx + ' — ' + Math.round(sc * 100) + '%. Качество +' + Math.round(sc * 22); WW.A.play(sc > .65 ? 'win' : 'done'); setTimeout(() => MOD.hide(), 1100); };
    A.mgSkip = () => { if (done) return; done = true; const o2 = WW.S.orders[e.o], j2 = o2 && o2.jobs.find(x => x.id === e.j); if (j2) j2.interv = 'done'; MOD.hide(); };
    MOD.timers.push(setInterval(() => {
      if (done) return; const el = (performance.now() - t0) / 1000, dt = .033; $('mgT').style.width = Math.max(0, 100 - el / tl * 100) + '%';
      const gx = Math.floor(mx * GW), gy = Math.floor(my * GH);
      if (down && e.type !== 'dent') for (let yy = gy - 4; yy <= gy + 4; yy++) for (let xx = gx - 6; xx <= gx + 6; xx++) { if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || !inside(xx, yy)) continue; const d = Math.hypot((xx - gx) / 6, (yy - gy) / 4); if (d > 1) continue; const i = yy * GW + xx;
        if (e.type === 'paint') cells[i] += dt * 2.6 * (1 - d * .7);
        else { if (cells[i] > 0) cells[i] = Math.max(0, cells[i] - dt * 2.2 * (1 - d * .6)); else if (d < .5) { heat[i] += dt * 1.3; if (heat[i] > 1 && heat[i] < 50) { heat[i] = 99; holes++; WW.A.play('bad'); } } } }
      if (e.type === 'rust' && down && Math.random() < .5) WW.A.play('weld');
      // рисование
      c.fillStyle = '#22252a'; c.fillRect(0, 0, cv.width, cv.height);
      for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) { if (!inside(xx, yy)) continue; const i = yy * GW + xx, v = cells[i];
        if (e.type === 'paint') c.fillStyle = v > 1.7 ? '#c0392b' : v > 1.45 ? '#e6a23c' : v > .75 ? color : v > .3 ? 'rgba(160,165,170,' + (.4 + v * .5) + ')' : '#8a8f94';
        else if (e.type === 'rust') c.fillStyle = heat[i] > 50 ? '#0c0c0c' : v > 0 ? 'rgb(' + (110 + v * 60 | 0) + ',' + (60 + v * 20 | 0) + ',22)' : heat[i] > .5 ? '#b0b5ba' : '#9ea3a8';
        else { let hgt = 0; for (const dn of dents) { const d = Math.hypot((xx + .5) / GW - dn.x, ((yy + .5) / GH - dn.y) * .56); if (d < dn.rad * 1.4) hgt -= dn.d * (1 - d / (dn.rad * 1.4)); } const l = U.clamp(55 + hgt * 60, 10, 90); c.fillStyle = 'hsl(210,8%,' + l + '%)'; }
        c.fillRect(xx * cw, yy * ch, cw + .5, ch + .5); }
      if (e.type === 'paint' && down) { c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(mx * cv.width, my * cv.height, 6 * cw, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(mx * cv.width, my * cv.height, e.type === 'dent' ? 10 : 6 * cw, 0, 7); c.stroke();
      const sc = score(); $('mgS').textContent = (e.type === 'paint' ? 'Ровный слой: ' : e.type === 'rust' ? 'Зачищено: ' : 'Выправлено: ') + Math.round(sc * 100) + '%' + (holes ? ' · прожогов ' + holes : '') + (bulges ? ' · горбов ' + bulges : '');
      if (el >= tl || (e.type === 'dent' && dents.every(dn => Math.abs(dn.d) < .06))) finish(sc);
    }, 33));
    MOD.onKey = k => { if (k === ' ') down = !down; };
  });

  // =====================================================================
  // дебаг-меню: ` или Ё, пароль 1234
  // =====================================================================
  const DBG = WW.DBG = {};
  DBG.ok = () => { try { return sessionStorage.getItem('ww_dbg') === '1'; } catch (e) { return !!DBG.mem; } };
  DBG.open = function () {
    if (!WW.S || !WW.started) return;
    if (!DBG.ok()) { MOD.show(`<h2>🔧 Дебаг-меню</h2><p class="sm mut">Только для тестирования. Введи пароль.</p><div class="row"><input type="password" id="dbgPw" style="width:140px" autofocus> ${btn('Открыть', 'dbgPw', {}, 'pri')}</div><div id="dbgErr" class="bad sm"></div>`, '', 'dbg'); setTimeout(() => { const el = $('dbgPw'); if (el) { el.focus(); el.addEventListener('keydown', ev => { if (ev.key === 'Enter') A.dbgPw(); }); } }, 30); return; }
    const S = WW.S, sel = WW.R.sel && WW.R.sel[0] === 'c' ? S.cars[+WW.R.sel.slice(1)] : null;
    const b = (t, a, data) => btn(t, a, data || {}, 'sm');
    MOD.show(`<h2>🔧 Дебаг-меню</h2><div class="col">
      <div class="row"><b style="width:90px">Деньги</b>${b('+$1 000', 'dbg', { k: 'm1' })}${b('+$10 000', 'dbg', { k: 'm10' })}${b('Долг = 0', 'dbg', { k: 'loan' })}</div>
      <div class="row"><b style="width:90px">Время</b>${b('→ 12:00', 'dbg', { k: 't12' })}${b('→ 18:55', 'dbg', { k: 't19' })}${b('Следующий день', 'dbg', { k: 'day' })}${b('→ суббота', 'dbg', { k: 'sat' })}</div>
      <div class="row"><b style="width:90px">Клиенты</b>${Object.keys(D.arch).map(k => b(D.arch[k].n.split(' ')[0], 'dbg', { k: 'cl', a: k })).join('')}</div>
      <div class="row"><b style="width:90px">Симптом</b><select id="dbgSym">${Object.keys(D.sym).map(k => `<option value="${k}">${h(D.sym[k].n)}</option>`).join('')}</select>${b('Клиент с этим', 'dbg', { k: 'sym' })}</div>
      <div class="row"><b style="width:90px">Машины</b>${b('Своя машина в проекты', 'dbg', { k: 'car' })}${b('Наводка на сарай', 'dbg', { k: 'barn' })}${b('Аукцион сейчас', 'dbg', { k: 'auc' })}</div>
      <div class="row"><b style="width:90px">Выбранная</b>${sel ? h(C.short(sel)) : '<span class="mut">кликни машину на карте</span>'} ${b('Всё известно', 'dbg', { k: 'reveal' })}${b('Узлы 100%', 'dbg', { k: 'fix' })}${b('Узлы 15%', 'dbg', { k: 'wreck' })}</div>
      <div class="row"><b style="width:90px">Люди</b>${b('Навыки 20', 'dbg', { k: 'skills' })}${b('+3 кандидата', 'dbg', { k: 'cands' })}${b('Настроение 90', 'dbg', { k: 'mood' })}</div>
      <div class="row"><b style="width:90px">Репутация</b>${b('100', 'dbg', { k: 'rep' })}${b('Событие', 'dbg', { k: 'ev' })}</div>
      <div class="row"><b style="width:90px">Склад</b>${b('+5 б/у деталей', 'dbg', { k: 'parts' })}${b('+все запчасти в трейлер', 'dbg', { k: 'spares' })}${b('Отходы ×20', 'dbg', { k: 'waste' })}</div>
      <div class="row"><b style="width:90px">Мини-игры</b>${b('Покраска', 'dbg', { k: 'mg', a: 'paint' })}${b('Ржавчина', 'dbg', { k: 'mg', a: 'rust' })}${b('Рихтовка', 'dbg', { k: 'mg', a: 'dent' })}</div>
      <div class="row"><b style="width:90px">Прочее</b>${b('Гонка сегодня', 'dbg', { k: 'race' })}${b('Бесплатная стройка: ' + (S.freeBuild ? 'вкл' : 'выкл'), 'dbg', { k: 'free' })}${b('Пропустить обучение', 'dbg', { k: 'tut' })}</div>
      </div><div class="row" style="margin-top:10px"><span class="mut sm">Горячая клавиша: \` или Ё</span><span style="flex:1"></span>${btn('Закрыть', 'mResume')}</div>`, 'mwide', 'dbg');
    DBG.sel = sel;
  };
  A.dbgPw = () => { const el = $('dbgPw'); if (el && el.value === '1234') { try { sessionStorage.setItem('ww_dbg', '1'); } catch (e) { DBG.mem = 1; } DBG.open(); } else { const er = $('dbgErr'); if (er) er.textContent = 'Неверный пароль.'; } };
  A.dbg = d => {
    const S = WW.S, k = d.k, car = DBG.sel, px = G.px();
    if (k === 'm1') G.money(1000, 'misc'); if (k === 'm10') G.money(10000, 'misc'); if (k === 'loan') S.loan.bal = 0;
    if (k === 't12') S.min = Math.max(S.min, 720); if (k === 't19') S.min = 1135; if (k === 'day') { MOD.hide(); S.min = 1139.9; return; }
    if (k === 'sat') { while (G.dow() !== 5) { S.day++; } WW.M.mkRace(); G.toast('Перемотали на субботу (день ' + (S.day + 1) + ').', 'info'); }
    if (k === 'cl') O.arrive({ type: 'client', min: S.min, arch: d.a });
    if (k === 'sym') { const sym = $('dbgSym').value, nd = Object.keys(D.sym[sym].c)[0]; O.arrive({ type: 'client', min: S.min, fault: { node: nd, sym } }); }
    if (k === 'car') { const sl = G.freeSlot(['proj', 'yard']); if (sl) { const c2 = C.gen({ model: U.pick(Object.keys(D.models).filter(id => D.models[id].y[0] <= S.year)), quality: 'private', owner: 'player' }); c2.cost = 0; G.send(c2, sl.id); } }
    if (k === 'barn') WW.E.defs.barn.run(); if (k === 'auc') { WW.M.mkAuction(); S.auction.open = S.min; S.auction.close = S.min + 180; }
    if (car && k === 'reveal') { for (const id in car.nodes) C.exact(car, id); for (const z of D.rustIds) { car.rust[z].lo = Math.floor(car.rust[z].r); car.rust[z].hi = Math.ceil(car.rust[z].r); } car.known.vin = car.known.accident = car.known.rollback = true; }
    if (car && (k === 'fix' || k === 'wreck')) { for (const id in car.nodes) { if (car.nodes[id].gone) continue; car.nodes[id].t = k === 'fix' ? 100 : 15; C.exact(car, id); } if (car.body) for (const pid in car.body) Object.assign(car.body[pid], k === 'fix' ? { dent: 100, paint: 100, rust: 0 } : { dent: 30, paint: 20, rust: 60 }); B.sync(car); C.refreshFaults(car); }
    if (k === 'skills') for (const p of S.pawns) for (const s in p.skills) p.skills[s] = 20;
    if (k === 'cands') { for (let i = 0; i < 3; i++) S.cands.push(P.mk(U.pick(['mech', 'body', 'recep', 'appr']))); }
    if (k === 'mood') for (const p of S.pawns) P.think(p, 'dbg', 'Дебаг-радость', 40, 3);
    if (k === 'rep') for (const r in S.rep) S.rep[r] = 100;
    if (k === 'ev') { const ids = Object.keys(WW.E.defs); WW.E.fire(U.pick(ids)); }
    if (k === 'parts') for (let i = 0; i < 5; i++) S.parts.push({ id: S.nextId++, node: U.pick(D.nodeIds.filter(n => D.nodes[n].repl)), model: U.pick(Object.keys(D.models)), grade: 'used', t: U.rf(10, 80), reps: 2, from: 'дебаг' });
    if (k === 'spares') { const ch = WW.RC.champ(); for (const s2 in D.spares) ch.spares[s2] = (ch.spares[s2] || 0) + 3; }
    if (k === 'waste') for (const t in D.waste) WW.X.add(t, 20);
    if (k === 'mg') { MOD.hide(); const o = Object.values(S.orders)[0] || O.create(Object.values(S.cars).find(c2 => c2.owner === 'player') || Object.values(S.cars)[0], null, 'own'); const j = { id: S.nextId++, kind: 'body', key: d.a, name: 'Тест мини-игры', panel: 'dfl', status: 'doing', sk: 'body' }; o.jobs.push(j); WW.emit('minigame', { o: o.id, j: j.id, type: d.a }); setTimeout(() => { o.jobs = o.jobs.filter(x => x !== j); if (!o.jobs.length && o.type === 'own') O.drop(o, false); }, 60000); return; }
    if (k === 'race') { const r = S.race || (WW.M.mkRace(), S.race); r.day = S.day; G.toast('Этап клубной серии перенесён на сегодня.', 'info'); }
    if (k === 'free') S.freeBuild = !S.freeBuild;
    if (k === 'tut') { S.tutor = null; S.set.tut = false; WW.emit('tutorEnd'); }
    G.toast('Дебаг: готово.', 'info'); DBG.open();
  };
  document.addEventListener('keydown', e => { if ((e.key === '`' || e.key === 'ё' || e.key === 'Ё') && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); e.stopPropagation(); if (MOD.open && MOD.key === 'dbg') MOD.hide(); else if (!MOD.open) DBG.open(); } }, true);
  // бесплатная стройка из дебага
  const basePlace = N.place; N.place = function (t, x, y, r) { if (WW.S && WW.S.freeBuild) { const m = WW.S.money; WW.S.money = 1e9; const w = basePlace(t, x, y, r); WW.S.money = m; return w; } return basePlace(t, x, y, r); };
})(globalThis.WW);
