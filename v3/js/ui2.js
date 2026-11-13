// WRENCHWORLD — интерфейс новых систем: боксы вручную, режим стройки, склад и станки, город, специализации.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, G = WW.G, O = WW.O, P = WW.P, M = WW.M, E = WW.E, R = WW.R, N = WW.N, UI = WW.UI;
  const A = UI.act, V = UI.views, $ = id => document.getElementById(id), h = U.esc, $m = U.money;
  const tip = t => ' data-tip="' + h(t) + '"';
  const btn = (label, a, data, cls, dis) => `<button class="btn ${cls || ''}" data-a="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${h(v)}"`).join(' ')} ${dis ? 'disabled' + tip(dis === true ? '' : dis) : ''}>${label}</button>`;
  const when = e => UI.fmtWhen(e);
  const gpill = g => `<span class="pill" style="border-color:${D.grades[g].c}">${D.grades[g].icon} ${D.grades[g].short}</span>`;
  const tcol = t => D.condOf(t).c;

  // ---------- боксы: кто стоит и кнопки ----------
  UI.bayStrip = function () {
    const S = WW.S; let s = '<div class="row" style="margin-bottom:8px;align-items:stretch">';
    for (const b of N.slots().filter(x => x.kind === 'bay')) {
      const car = S.cars[S.slotCar[b.id]], o = car && car.order && S.orders[car.order], here = car && car.slot === b.id;
      s += `<div class="card" style="flex:1;min-width:170px;padding:5px 8px"><div class="row" style="gap:4px"><b>${b.n}</b>${b.indoor ? '' : `<span class="pill"${tip('Пост под открытым небом: в дождь, снег и жару работа ×1.15. Накрой крышей в «Стройке».')}>без крыши</span>`}${o && o.pin ? '<span class="pill y">закреплён</span>' : ''}</div>`;
      if (!car) s += '<div class="sm mut">свободен</div>';
      else s += `<div class="sm"><a class="acc" style="cursor:pointer" data-a="go" data-k="${o ? 'order' : 'car'}" data-id="${o ? o.id : car.id}">${h(C.short(car))}</a> ${here ? '' : '<span class="mut">(едет сюда)</span>'}</div><div class="sm mut">${o ? '№' + o.id + ' · ' + h(UI.ostatus(o)) : 'без наряда'}</div>${here ? `<div style="margin-top:3px">${o ? btn('⏸ На стоянку', 'toYard', { o: o.id }, 'sm') : btn('⏸ На стоянку', 'carTo', { id: car.id, k: car.owner === 'player' ? 'proj' : 'yard' }, 'sm')}</div>` : ''}`;
      s += '</div>';
    }
    return s + '</div>';
  };
  UI.bayCtl = function (o, car) {
    const inb = G.inBay(car);
    return `<div class="row card" style="margin:6px 0;padding:5px 8px"><b>${inb ? G.slotName(car) : 'Не в боксе'}</b>${btn('⚡ Взять в работу сейчас', 'takeNow', { o: o.id }, 'pri', o.now ? 'уже первый в очереди' : null).replace('<button', '<button' + (o.now ? '' : tip('Наряд встаёт первым в очередь. Если свободного бокса нет — из бокса выкатят наименее срочную машину. Те, кто занят своими проектами или станком, бросят и возьмутся за этот наряд.')))}${btn('⏸ На стоянку', 'toYard', { o: o.id }, '', o.hold ? 'уже отправлен на стоянку' : null).replace('<button', '<button' + (o.hold ? '' : tip('Убрать из бокса и не возвращать, пока не скажешь. Работа по наряду встаёт на паузу, прогресс сохраняется.')))}${btn('Авто', 'bayAuto', { o: o.id }, 'sm ' + (!o.hold && !o.pin && !o.now ? 'on' : ''))}<span class="mut sm">${o.hold ? 'стоит по твоей команде — сам в бокс не поедет' : o.now ? 'первый в очереди, бокс закреплён' : o.pin ? 'бокс закреплён' : 'боксы распределяет автоматика'}${C.runs(car) ? '' : ' · не на ходу: по участку её катят вручную'}</span></div>`;
  };
  UI.nodeBtns = function (o, car, nid) {
    const S = WW.S, n = car.nodes[nid], nd = D.nodes[nid], m = C.model(car), own = o.type === 'own'; let b = '';
    const mk = (lbl, sp, txt) => { const why = O.why(o, sp); return `<button class="btn sm" data-a="job" data-o="${o.id}" data-kind="${sp.kind}" data-node="${nid}" ${why ? 'disabled' : ''}${tip(txt + (why ? '\n⛔ ' + why : ''))}>${lbl}</button>`; };
    if (nd.rep) { const bp = P.best(nd.sk), ch = P.fixChance(bp, nd.sk, n.t), kg = O.kitGain(n.grade, 'oem'); b += mk('Р', { kind: 'repair', node: nid }, 'Ремонт на станке «' + D.build[D.benchOf(nd.sk)].n + '»: ' + nd.rep + ' ч + ремкомплект.\nШанс успеха у ' + bp.name + ': ' + Math.round(ch * 100) + '%.\nПрибавка комплектом OEM: +' + Math.round(kg.lo) + '…' + Math.round(kg.hi) + '%. Осталось ремонтов: ' + n.reps + '.\nДёшево, но может не хватить — а может и сломать деталь.'); }
    if (nd.repl) b += mk('З', { kind: 'replace', node: nid, grade: 'oem' }, (n.gone ? 'Поставить новую: ' : 'Замена на новую: ') + nd.repl + ' ч, деталь OEM ≈ ' + $m(nd.part * m.pm * G.px()) + (own && !n.gone ? '\nСтарая деталь уйдёт на склад.' : ''));
    if (own && nid !== 'frame') b += mk('С', { kind: 'remove', node: nid }, 'Снять на склад: ' + ((nd.repl || nd.rep) * .45).toFixed(1) + ' ч.\nДеталь можно починить на станке, собрать одну из двух, поставить на другую машину или продать.\nЕсть шанс повредить при снятии.');
    const fit = S.parts.filter(it => it.node === nid && C.fits(it, car) && !O.itemBusy(it.id));
    if (fit.length && !o.jobs.some(j => j.node === nid && j.status !== 'declined' && j.status !== 'done')) b += `<select data-c="jobItem" data-o="${o.id}" data-node="${nid}" style="padding:1px 2px"${tip('Поставить деталь со своего склада — без закупки и ожидания доставки.')}><option value="">📦${fit.length}</option>${fit.map(it => `<option value="${it.id}">${D.grades[it.grade].short} ${Math.round(it.t)}%</option>`).join('')}</select>`;
    return b;
  };

  // ---------- люди: специализации и матрица работ ----------
  const priSkill = { desk: p => p.skills.talk, diag: p => p.skills.diag, eng: p => Math.max(p.skills.eng, p.skills.trans), chassis: p => p.skills.chassis, elec: p => p.skills.elec, body: p => p.skills.body, haul: p => p.skills.drive, clean: p => 10 };
  function pcard(p, cand) {
    const S = WW.S, sel = UI.sub.pawn === p.id, sp = D.specs[p.spec] || D.specs.general;
    let s = `<div class="card" style="${sel ? 'border-color:var(--acc)' : ''}"><div class="row"><span style="width:14px;height:14px;border-radius:50%;background:${sp.col};display:inline-block"></span><b>${h(p.name)}</b><span class="pill">${sp.n}</span>${p.legend ? '<span class="pill y">легенда</span>' : ''}${p.poached ? '<span class="pill y">из Big Al’s</span>' : ''}<span style="flex:1"></span>${p.owner ? '' : `<span class="b">${$m(p.wage)}/ч</span><span class="mut sm">(${$m(p.wage * 10)}/день)</span>`}</div>`;
    if (!cand && !p.owner) { const mp = P.moodParts(p); s += `<div class="row sm" style="margin:4px 0"${tip('Настроение ' + Math.round(p.mood) + ':\n' + mp.map(x => x[0] + ': ' + (x[1] >= 0 ? '+' : '') + x[1]).join('\n') + '\n\n>70 — шанс вдохновения · <35 — срывы · <18 два дня подряд — уйдёт')}><span>Настроение</span><div class="pbar" style="flex:1;max-width:160px"><i style="width:${p.mood}%;background:${p.mood < 30 ? '#E53935' : p.mood < 50 ? '#FB8C00' : '#6fcf6f'}"></i></div><span>${Math.round(p.mood)}</span><span class="mut">${p.course ? 'на курсах до дня ' + (p.course.until + 1) : p.state === 'absent' ? 'отсутствует' : p.state === 'away' ? 'в отъезде до ' + U.time(p.awayUntil) : p.arriveAt ? 'опаздывает' : p.task ? UI.taskName(p) : 'свободен'}</span></div>`; }
    if (p.owner) s += `<div class="sm mut" style="margin:4px 0">Это ты. ${p.state === 'away' ? 'В отъезде до ' + U.time(p.awayUntil) : p.task ? UI.taskName(p) : 'Свободен'}.</div>`;
    s += '<div class="grid3" style="gap:2px 14px;margin:4px 0">' + D.skillIds.map(k => { const v = p.skills[k], ps = p.pas[k] || 0; return `<div class="sk"${tip(D.skills[k] + ' ' + v + '/20' + (ps ? '\nСтрасть: ' + (ps === 2 ? 'огонь (опыт ×2)' : 'интерес (опыт ×1.5)') : ''))}><span>${D.skills[k]}${ps ? (ps === 2 ? ' 🔥' : ' ✦') : ''}</span><div class="sb"><i class="p${ps}" style="width:${v * 5}%"></i></div><span class="r">${v}</span></div>`; }).join('') + '</div>';
    if (!p.owner) s += '<div class="row sm">' + p.traits.map((t, i) => i < p.known ? `<span class="pill y"${tip(D.traits[t].d)}>${D.traits[t].n}</span>` : `<span class="pill"${tip('Раскроется через несколько дней работы')}>?</span>`).join('') + (cand ? `<span style="flex:1"></span>${btn('Нанять', 'hire', { id: p.id }, 'pri')}` : `<span style="flex:1"></span>${btn('Премия ' + $m(50 * G.px()), 'bonus', { id: p.id }, 'sm')}${btn('Уволить', 'fire', { id: p.id }, 'sm red')}`) + '</div>';
    return s + '</div>';
  }
  V.people = function () {
    const S = WW.S, owed = S.pawns.reduce((a, p) => a + (p.owed || 0), 0), keys = Object.keys(D.priKeys);
    let s = `<div class="row mut sm" style="margin-bottom:6px">В штате ${P.staff().length}/6. Зарплата — по пятницам${owed ? ': к выплате уже ' + $m(owed * 1.22) + ' (с налогами и медстраховкой, +22%)' : ''}. Рабочий день 07:00–19:00, обед в 12:00.</div>`;
    s += `<h3>Кто чем занимается</h3><p class="sm mut">Специализация — готовый набор приоритетов. Клетки можно править вручную: 1 — в первую очередь, 3 — когда больше нечего делать, «–» — никогда. Мелкая цифра — навык человека в этой работе.</p><table><tr><th>Человек</th><th>Специализация</th>${keys.map(k => `<th style="text-align:center">${D.priKeys[k]}</th>`).join('')}<th>Сейчас</th></tr>`;
    for (const p of S.pawns) {
      s += `<tr><td><span style="width:10px;height:10px;border-radius:50%;background:${P.col(p)};display:inline-block;margin-right:5px"></span><b>${h(p.name)}</b></td><td><select data-c="spec" data-id="${p.id}">${Object.keys(D.specs).filter(k => k !== 'owner' || p.owner).map(k => `<option value="${k}" ${p.spec === k ? 'selected' : ''}>${D.specs[k].n}</option>`).join('')}</select></td>`;
      for (const k of keys) { const v = priSkill[k](p); s += `<td style="text-align:center"><span class="pri" style="margin:0"><button class="p${p.pri[k] || 0}" data-a="pri" data-id="${p.id}" data-k="${k}" style="min-width:30px">${p.pri[k] || '–'}</button></span>${k === 'clean' ? '' : `<div class="sm ${v >= 12 ? 'good' : v <= 4 ? 'bad' : 'mut'}">${v}</div>`}</td>`; }
      s += `<td class="sm mut">${p.state === 'absent' ? 'нет на работе' : p.state === 'away' ? 'в отъезде' : p.task ? h(UI.taskName(p)) : 'свободен'}</td></tr>`;
    }
    s += `</table><h3>Команда</h3><div class="grid2">${S.pawns.map(p => pcard(p, false)).join('')}</div>`;
    s += `<h3>Кандидаты</h3><div class="row sm mut" style="margin-bottom:6px">Список обновляется раз в три дня. На собеседовании видна одна черта — остальные раскроются в работе. ${btn('Объявление в газете ' + $m(40 * G.px()), 'ad', {}, 'sm')}</div><div class="grid2">${S.cands.length ? S.cands.map(p => pcard(p, true)).join('') : '<p class="mut">Никого. Дай объявление.</p>'}</div>`;
    return s;
  };
  A.spec = (d, el) => { const p = P.byId(+d.id); if (p) { P.setSpec(p, el.value); G.toast(p.name + ' теперь ' + D.specs[el.value].n.toLowerCase() + '.', 'info'); } };

  // ---------- склад и станки ----------
  V.stock = function () {
    const S = WW.S; let s = '';
    const inTr = S.deliveries, cars = G.pickupCars(), ppl = S.pawns.filter(p => p.state === 'work' && !p.arriveAt);
    s += '<h3>Доставка</h3>';
    if (S.runs.length) s += S.runs.map(r => `<div class="sm good">🚗 Самовывоз в пути: ${r.cargo.length} ${U.plural(r.cargo.length, 'позиция', 'позиции', 'позиций')}, вернётся к ${U.time(r.until)}.</div>`).join('');
    if (inTr.length) {
      s += '<table><tr><th>Что</th><th>Откуда</th><th>Привезут</th></tr>' + inTr.map(d => { const o = d.o && S.orders[d.o], j = o && o.jobs.find(x => x.id === d.j); return `<tr><td>${d.item ? h(O.partName(d.item)) + ' <span class="mut">(на склад)</span>' : j ? h(j.name) + ' <span class="mut">(№' + o.id + ')</span>' : '—'}</td><td>${h(D.city[d.src || 'store'].n)}</td><td>${when(d)}</td></tr>`; }).join('') + '</table>';
      s += `<div class="row" style="margin-top:6px"${tip('Человек берёт твою машину на ходу и сам забирает всё заказанное: без платы за доставку и не дожидаясь завтрашнего фургона. Но его и машины какое-то время нет в мастерской.')}>Самовывоз: <select id="pk_p">${ppl.map(p => `<option value="${p.id}">${h(p.name)}</option>`).join('')}</select> на <select id="pk_c">${cars.map(c => `<option value="${c.id}">${h(C.short(c))}</option>`).join('')}</select>${btn('Поехать за деталями', 'pickup', {}, 'pri', !cars.length ? 'Нужна своя машина на ходу без открытого наряда' : !ppl.length ? 'Некому ехать' : null)}</div>`;
    } else if (!S.runs.length) s += '<p class="mut sm">Заказов в пути нет. Детали привозит фургон магазина (1–3 часа), дистрибьютора и свалки (утром следующего дня). Если есть своя машина на ходу — можно съездить самому.</p>';
    // станки
    s += '<h3>Станки</h3><div class="row sm">' + ['eng', 'trans', 'chassis', 'elec', 'body'].map(k => { const has = N.bench(k); return `<span class="pill ${has ? 'g' : ''}" style="${has ? '' : 'opacity:.55'}"${tip(D.build['b_' + k].d + (has ? '' : '\nЕщё не куплен — «Стройка».'))}>${has ? '✔' : '✖'} ${D.build['b_' + k].n}</span>`; }).join('') + '</div>';
    if (S.bench.length) s += '<table style="margin-top:6px"><tr><th>Работа на станке</th><th>Норма</th><th>Статус</th><th></th></tr>' + S.bench.map(b => { const p = b.by != null && P.byId(b.by); return `<tr><td>${h(b.name)}</td><td>${b.h.toFixed(1)} ч</td><td>${b.status === 'doing' && p ? h(p.name.split(' ')[0]) + (b.tot ? ' · ' + Math.round((1 - b.left / b.tot) * 100) + '%' : ' идёт к станку') : 'в очереди' + (b.left != null ? ', осталось ' + U.dur(b.left) : '')}</td><td class="r">${b.status === 'wait' ? btn('✕', 'benchX', { id: b.id }, 'sm') : ''}</td></tr>`; }).join('') + '</table>';
    // склад
    s += `<h3>На складе: ${S.parts.length}</h3>`;
    if (!S.parts.length) s += '<p class="mut sm">Пусто. Детали попадают сюда, когда ты снимаешь их со своих машин (кнопка «С» в наряде), меняешь старые на новые, покупаешь на свалке или в магазине через «Город».</p>';
    else {
      s += '<table><tr><th>Деталь</th><th>Грейд</th><th>Состояние</th><th>Ресурс</th><th>Откуда</th><th>Действия</th></tr>';
      const parts = S.parts.slice().sort((a, b) => a.model.localeCompare(b.model) || a.node.localeCompare(b.node) || b.t - a.t);
      for (const it of parts) {
        const nd = D.nodes[it.node], busy = O.itemBusy(it.id), bp = P.best(nd.sk), ch = P.fixChance(bp, nd.sk, it.t), mates = S.parts.filter(x => x !== it && x.node === it.node && x.model === it.model && !O.itemBusy(x.id));
        let ac = '';
        if (busy) ac = '<span class="mut sm">занята работой</span>';
        else {
          const noB = !N.bench(nd.sk) ? 'Нужен станок: ' + D.build[D.benchOf(nd.sk)].n : null;
          if (nd.rep) { const kits = ['econ', 'oem', 'sport'].map(k => { const kg = O.kitGain(it.grade, k); return `<option value="${k}">${D.grades[k].short} ${$m(O.kitCost(it, k))} · +${Math.round(kg.lo)}…${Math.round(kg.hi)}%</option>`; }).join(''); ac += `<select id="kit_${it.id}"${tip('Ремкомплект. Грейд комплекта ниже грейда детали — прибавка меньше: «Премиум» можно чинить «Экономом», но выйдет вполовину.')}>${kits}</select>${btn('Чинить', 'benchFix', { id: it.id }, 'sm', noB || (it.reps <= 0 ? 'Ресурс ремонтов исчерпан' : null)).replace('<button', '<button' + (noB || it.reps <= 0 ? '' : tip('Шанс успеха у ' + bp.name + ': ' + Math.round(ch * 100) + '%\nНеудача: −3…10% и минус ресурс; изредка деталь ломается совсем.')))} `; }
          if (mates.length) ac += `<select id="mg_${it.id}">${mates.map(x => `<option value="${x.id}">+ ${Math.round(x.t)}% → ≈${Math.round(O.mergeT(it, x, bp.skills[nd.sk]))}%</option>`).join('')}</select>${btn('Собрать из двух', 'benchMerge', { id: it.id }, 'sm', noB).replace('<button', '<button' + (noB ? '' : tip('Из двух одинаковых деталей мастер собирает одну получше. Обе расходуются.\nШанс успеха у ' + bp.name + ': ' + Math.round(ch * 100) + '%. При неудаче пропадает худшая.')))} `;
          ac += btn('Продать ' + $m(O.partValue(it)), 'sellPart', { id: it.id }, 'sm');
        }
        s += `<tr><td><b>${h(nd.n)}</b><div class="sm mut">${D.models[it.model].make} ${D.models[it.model].name}</div></td><td>${gpill(it.grade)}</td><td><div class="row" style="gap:5px;flex-wrap:nowrap"><div class="bar" style="width:60px"><i style="left:0;width:${it.t}%;background:${tcol(it.t)}"></i></div>${Math.round(it.t)}%</div></td><td>${it.reps}</td><td class="sm mut">${h(it.from || '')}</td><td>${ac}</td></tr>`;
      }
      s += '</table><p class="sm mut">Поставить деталь на машину — в наряде, значок 📦 рядом с узлом. Подходит та же модель; электрика — в пределах марки.</p>';
    }
    return s;
  };
  A.pickup = () => { const p = $('pk_p'), c = $('pk_c'); if (p && c) G.pickup(+p.value, +c.value); };
  A.benchFix = d => { const k = $('kit_' + d.id), w = O.benchAdd('fix', +d.id, null, k ? k.value : 'oem'); if (w) G.toast('Нельзя: ' + w + '.', 'bad'); else G.toast('Поставлено в очередь на станок.', 'info'); };
  A.benchMerge = d => { const k = $('mg_' + d.id); if (!k) return; const w = O.benchAdd('merge', +d.id, +k.value); if (w) G.toast('Нельзя: ' + w + '.', 'bad'); else G.toast('Поставлено в очередь на станок.', 'info'); };
  A.benchX = d => O.benchCancel(+d.id); A.sellPart = d => O.sellPart(+d.id);

  // ---------- город ----------
  function buyForm(src) {
    const S = WW.S, sb = UI.sub, models = M.pool().sort((a, b) => (a.make + a.name).localeCompare(b.make + b.name));
    if (!sb.bm || !D.models[sb.bm] || D.models[sb.bm].y[0] > S.year) sb.bm = (Object.values(S.cars).find(c => c.owner === 'player') || {}).model || models[0].id;
    const m = D.models[sb.bm], nodes = D.nodeIds.filter(id => id !== 'frame' && C.hasNode(m, id)); if (!nodes.includes(sb.bn)) sb.bn = nodes[0]; if (!sb.bg) sb.bg = 'oem';
    const price = Math.round(M.newPartPrice(sb.bm, sb.bn, sb.bg) * (src === 'dist' ? .8 : 1));
    return `<div class="row" style="margin-top:8px">Купить на склад: <select data-c="sub" data-k="bm">${models.map(x => `<option value="${x.id}" ${x.id === sb.bm ? 'selected' : ''}>${x.make} ${x.name}</option>`).join('')}</select><select data-c="sub" data-k="bn">${nodes.map(id => `<option value="${id}" ${id === sb.bn ? 'selected' : ''}>${D.nodes[id].n}</option>`).join('')}</select><select data-c="sub" data-k="bg">${['econ', 'oem', 'sport'].map(g => `<option value="${g}" ${g === sb.bg ? 'selected' : ''}>${D.grades[g].n}</option>`).join('')}</select><b>${$m(price)}</b>${btn('Заказать', 'buyPart', { src }, 'pri')}</div>`;
  }
  const poiView = {
    home: S => `<p>Ступень ${E.stage().n}: ${E.stage().name}. Постов: ${N.slots().filter(s => s.kind === 'bay').length}, людей: ${S.pawns.length}, репутация ${Math.round(G.rep())}.</p>`,
    store: S => `<p class="sm">Розница, наличные. Фургон «Earl & Sons» привозит заказ за 1–3 часа (доставка ${$m(5 * G.px())} за рейс). Детали под наряд заказываются прямо из сметы.</p>` + buyForm('store'),
    dist: S => `<p class="sm">Счёт со скидкой 20%, синий фургон приезжает утром следующего дня, доставка бесплатно. Включается в наряде галочкой «детали срочно» (снять).</p>` + buyForm('dist'),
    junk: S => `<p class="sm">Обновляется каждую ночь. Привезут завтра утром (${$m(5 * G.px())} за рейс) — или забери самовывозом. Две одинаковые дохлые детали можно собрать в одну на станке.</p><table><tr><th>Деталь</th><th>Модель</th><th>Грейд</th><th>Состояние</th><th>Ресурс</th><th></th></tr>${S.junk.map(j => `<tr><td>${D.nodes[j.node].n}</td><td class="sm">${D.models[j.model].make} ${D.models[j.model].name}</td><td>${gpill(j.grade)}</td><td><span style="color:${tcol(j.t)}">${Math.round(j.t)}%</span></td><td>${j.reps}</td><td class="r">${btn($m(j.price), 'buyJunk', { id: j.id }, 'sm pri')}</td></tr>`).join('') || '<tr><td class="mut" colspan="6">Сегодня всё разобрали.</td></tr>'}</table><h3>Сдать в металлолом</h3>${ownCars(S, c => btn(C.short(c) + ' — ' + $m(M.scrapValue(c)), 'scrap', { id: c.id }, 'sm red'))}`,
    pound: S => { const a = S.auction; return `<p class="sm">Битые, брошенные и списанные. Осмотр только глазами: кузов и салон. Нужен свободный проектный слот.</p>` + (a && a.day === S.day && !a.done ? (S.min >= a.open ? btn('Войти в зал', 'auction', {}, 'pri', G.freeSlot(['proj']) ? null : 'Нет свободного места под проект') : `<span class="pill">откроется в ${U.time(a.open)}</span>`) : '<span class="pill">сегодня торгов нет</span>'); },
    dealer: S => `<p class="sm">Дилер заберёт машину сегодня же — за 70–80% её цены. Быстрые деньги, когда пятница близко.</p>${ownCars(S, c => btn(C.short(c) + ' — ' + $m(M.wholesale(c)), 'quick', { id: c.id }, 'sm'))}`,
    strip: S => `<p class="sm">${S.race && S.race.day === S.day && S.race.type !== 'autox' ? 'Сегодня: ' + h(S.race.name) + '.' : 'Заезды по субботам.'}</p>${btn('Открыть «Гонки»', 'panel', { p: 'race' })}`,
    mall: S => `<p class="sm">${S.race && S.race.day === S.day && S.race.type === 'autox' ? 'Сегодня автокросс!' : 'Автокросс — по субботам через неделю.'}</p>${btn('Открыть «Гонки»', 'panel', { p: 'race' })}`,
    bank: S => { const lim = G.loanLimit(); return `<p class="sm">Долг: <b>${$m(S.loan.bal)}</b>, платёж ${$m(S.loan.pay)} в неделю, проценты 0.4% остатка в неделю. Банк готов дать ещё <b>${$m(lim)}</b> — лимит растёт с репутацией.</p><div class="row">${[1000, 3000, lim].filter((v, i, a) => v > 0 && v <= lim && a.indexOf(v) === i).map(v => btn('Взять ' + $m(v), 'takeLoan', { v }, 'sm')).join('')}${S.loan.bal > 0 ? [500, 2000].map(v => btn('Погасить ' + $m(v), 'payLoan', { v }, 'sm', S.money < v ? 'Мало денег' : null)).join('') : ''}</div>`; },
    bigal: S => `<p class="sm">Ставка у них на 15% ниже рынка, очередь на неделю, брак возвращается к тебе. Переманить механика стоит «подъёмных» и трёх дней слухов о тебе.</p>${btn('Переманить механика — ' + $m(250 * G.px()), 'poach', {}, 'pri')}`,
    paper: S => `<p class="sm">Частных объявлений сегодня: ${S.listings.length} (домики на карте).</p><div class="row">${btn('Реклама мастерской ' + $m(80 * G.px()) + ' — +35% клиентов на 5 дней', 'buyAd', {}, '', S.adDays > 0 ? 'Кампания уже идёт' : null)}${btn('Объявление о найме ' + $m(40 * G.px()), 'ad', {})}${btn('Открыть объявления', 'panel', { p: 'market' })}</div>`,
    school: S => { const st = P.staff().filter(p => !p.course && p.state !== 'absent'); return `<p class="sm">Двухдневные курсы: +2 к навыку за ${$m(160 * G.px())}. Человека два дня нет на работе.</p>` + (st.length ? `<div class="row"><select id="cr_p">${st.map(p => `<option value="${p.id}">${h(p.name)}</option>`).join('')}</select><select id="cr_s">${D.skillIds.map(k => `<option value="${k}">${D.skills[k]}</option>`).join('')}</select>${btn('Отправить на курсы', 'course', {}, 'pri')}</div>` : '<p class="mut sm">Некого отправлять.</p>'); }
  };
  function ownCars(S, f) { const l = Object.values(S.cars).filter(c => c.owner === 'player' && c.lot && !c.order && !c.mv); return l.length ? '<div class="row">' + l.map(f).join('') + '</div>' : '<p class="mut sm">Нет своих машин без открытого наряда.</p>'; }
  V.city = function () {
    const S = WW.S, sel = UI.sub.poi || 'home', pc = D.city[sel];
    let svg = `<svg viewBox="0 0 100 70" style="width:100%;max-height:52vh;background:#2b3327;border-radius:8px;border:1px solid var(--ln)">
      <path d="M0 52 Q30 46 50 40 T100 30" stroke="#3d5f7a" stroke-width="5" fill="none" opacity=".55"/>
      <g stroke="#4a4d52" stroke-width="2.2" fill="none"><path d="M0 40 H100"/><path d="M50 0 V70"/><path d="M12 28 L50 40 L80 56"/><path d="M32 16 L46 20 L62 28 L84 18"/><path d="M18 58 L28 46 L38 32"/><path d="M62 28 L60 50"/><path d="M50 40 L92 40"/></g>
      <g stroke="#E8D36A" stroke-width=".25" stroke-dasharray="1.2 1.2" fill="none"><path d="M0 40 H100"/><path d="M50 0 V70"/></g>`;
    for (const b of [[6, 6, 12, 8], [66, 6, 10, 7], [70, 44, 8, 6], [4, 44, 9, 8], [86, 60, 10, 6], [22, 6, 6, 5]]) svg += `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" fill="#394034" rx="1"/>`;
    for (const l of S.listings) svg += `<g data-a="panel" data-p="market" style="cursor:pointer"${tip(C.name(S.cars[l.car]) + ' — ' + $m(l.cur) + '\n' + l.dist + ' мин езды')}><circle cx="${l.mx}" cy="${l.my}" r="1.7" fill="${l.barn ? '#E3B23C' : '#8fb8d8'}" stroke="#111" stroke-width=".3"/><text x="${l.mx}" y="${l.my + .8}" font-size="2" text-anchor="middle">🏠</text></g>`;
    for (const id in D.city) { const p = D.city[id], on = id === sel, hot = (id === 'pound' && S.auction && S.auction.day === S.day && !S.auction.done) || ((id === 'strip' || id === 'mall') && S.race && S.race.day === S.day && (S.race.type === 'autox') === (id === 'mall')); svg += `<g data-a="poi" data-id="${id}" style="cursor:pointer"><circle cx="${p.x}" cy="${p.y}" r="${on ? 4.2 : 3.4}" fill="${id === 'home' ? '#E3B23C' : '#1f2226'}" stroke="${on ? '#E3B23C' : hot ? '#ff5a4d' : '#9aa0a6'}" stroke-width="${on || hot ? .8 : .4}"/><text x="${p.x}" y="${p.y + 1.3}" font-size="3.6" text-anchor="middle">${p.i}</text><text x="${p.x}" y="${p.y + 6.6}" font-size="2.1" text-anchor="middle" fill="#e8e4da" style="paint-order:stroke" stroke="#17191c" stroke-width=".5">${h(p.n.replace(/«|»/g, ''))}</text></g>`; }
    svg += '</svg>';
    return `<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,1fr);gap:12px"><div>${svg}<p class="sm mut">Кликни точку. Домики — частные объявления. Время в пути считается от заправки.</p></div><div><div class="row"><span style="font-size:26px">${pc.i}</span><b style="font-size:15px">${h(pc.n)}</b>${pc.t ? `<span class="pill">${pc.t} мин езды</span>` : ''}</div><p class="mut sm">${h(pc.d)}</p>${poiView[sel](S)}</div></div>`;
  };
  A.poi = d => { UI.sub.poi = d.id; }; A.sub = (d, el) => { UI.sub[d.k] = el.value; };
  A.buyJunk = d => M.buyJunk(+d.id); A.buyPart = d => M.buyPart(UI.sub.bm, UI.sub.bn, UI.sub.bg, d.src);
  A.takeLoan = d => G.takeLoan(Math.round(+d.v)); A.poach = () => M.poach();
  A.course = () => { const p = $('cr_p'), s = $('cr_s'); if (p && s) M.course(+p.value, s.value); };

  // ---------- стройка ----------
  V.build = function () {
    const S = WW.S, b = R.build, m = S.map; let s = '';
    s += `<div class="card" style="border-color:${b ? 'var(--acc)' : 'var(--ln)'}"><b>🏗 Режим стройки</b><div class="sm mut">Выбери объект — карта перейдёт в режим стройки, всё ставится строго по клеткам. <kbd>ЛКМ</kbd> поставить (дорогу, стены, крышу и зоны можно тянуть), <kbd>R</kbd> повернуть, <kbd>ПКМ</kbd> или <kbd>Esc</kbd> выйти. Машины ездят только по дороге, а занятое место — препятствие: поставишь парковку за парковкой — дальнюю машину не достать.</div><div class="row" style="margin-top:6px">${btn('🧨 Снос', 'buildOn', { t: 'demolish' }, 'red').replace('<button', '<button' + tip('Объекты — возврат половины цены. Дорога, стены, крыша — бесплатно. Сносится всё: колонки, щиты, деревья.'))}${btn('🧽 Стереть зону', 'buildOn', { t: 'zone:' }, '')}${b ? btn('Выйти из режима стройки', 'buildOff', {}) : ''}</div></div>`;
    // зоны-комнаты
    s += '<h3>Зоны — как комнаты в Prison Architect</h3><p class="sm mut">Зона красится по клеткам и работает, только когда внутри есть всё нужное. Видно на карте в режиме зон (кнопка «Зоны» справа внизу).</p><div class="grid2">';
    const rooms = N.rooms();
    for (const z in D.zones) { const d = D.zones[z], rs = rooms.filter(r => r.t === z), ok = rs.filter(r => r.ok).length;
      s += `<div class="card row" style="align-items:flex-start;border-left:4px solid ${d.c}"><div style="flex:1"><b>${h(d.n)}</b> ${rs.length ? `<span class="pill ${ok ? 'g' : 'r'}">${ok ? '✔ работает' : '✖ не готова'}${rs.length > 1 ? ' ×' + rs.length : ''}</span>` : '<span class="mut sm">нет</span>'}<div class="sm mut">Нужно: ${d.need.map(x => x.label).join(', ')}${d.roof ? ', крыша' : ''}. ${h(d.fx)}</div>${rs.filter(r => !r.ok).map(r => `<div class="sm bad">не хватает: ${r.miss.join(', ')}</div>`).join('')}</div>${btn('Красить', 'buildOn', { t: 'zone:' + z }, 'pri')}</div>`; }
    s += '</div>';
    const gs = {}; for (const id in D.build) (gs[D.build[id].g] = gs[D.build[id].g] || []).push(id);
    const cnt = id => id === 'wall' ? Object.keys(m.walls).length : id === 'roof' ? Object.keys(m.roof).length : id === 'road' ? Object.keys(m.road).length : N.objs(id).length;
    for (const g in gs) {
      s += `<h3>${g}</h3><div class="grid3">`;
      for (const id of gs[g]) { const d = D.build[id]; s += `<div class="card bcard ${b && b.t === id ? 'on' : ''}" data-a="buildOn" data-t="${id}"${tip(d.d + (d.beauty ? '\nКрасота ' + (d.beauty > 0 ? '+' : '') + d.beauty : ''))}><div class="row"><span class="bi">${d.i || '▪'}</span><div style="flex:1"><b>${h(d.n)}</b><div class="sm mut">есть: ${cnt(id)}${d.paint ? '' : ' · ' + N.size(id, 0).join('×') + ' кл.'}</div></div><span class="acc b">${$m(N.cost(id))}${d.paint ? '<span class="mut sm">/кл</span>' : ''}</span></div></div>`; }
      s += '</div>';
    }
    const bt = N.beauty(); s += `<div class="sm mut" style="margin-top:6px">Красота участка: <b class="${bt >= 0 ? 'good' : 'bad'}">${bt >= 0 ? '+' : ''}${bt}</b> — клиенты чуть довольнее и чаще заезжают, команде приятнее работать. Грязь и масло на полу (убирают люди с приоритетом «Уборка») — наоборот.</div>`;
    const ug = {}; for (const id in D.upg) (ug[D.upg[id].g] = ug[D.upg[id].g] || []).push(id);
    s += '<h3>Оборудование и участок</h3><div class="grid2">';
    for (const g in ug) for (const id of ug[g]) { const u = D.upg[id], cost = Math.round(u.cost * G.px() / 5) * 5, has = S.upg[id] || (id === 'land' && N.lotFull()); s += `<div class="card row" style="align-items:flex-start"><div style="flex:1"><b>${h(u.n)}</b><div class="sm mut">${h(u.d)}</div></div>${has ? '<span class="pill g">есть</span>' : btn($m(cost), 'upg', { id }, 'pri', S.money < cost ? 'Не хватает денег' : null)}</div>`; }
    return s + '</div>';
  };
  UI.buildOn = function (t) {
    R.build = { t, r: (R.build && R.build.r) || 0 }; UI.close(); $('world').style.cursor = 'crosshair';
    let bar = $('buildBar'); if (!bar) { bar = document.createElement('div'); bar.id = 'buildBar'; $('stage').appendChild(bar); }
    UI.buildBar();
  };
  const bname = t => t === 'demolish' ? 'Снос' : t === 'zone:' ? 'Стереть зону' : t.startsWith('zone:') ? 'Зона «' + D.zones[t.slice(5)].n + '»' : D.build[t].n;
  UI.buildBar = function () {
    const bar = $('buildBar'), b = R.build; if (!bar) return; if (!b) { bar.remove(); return; }
    const paint = String(b.t).startsWith('zone') || (D.build[b.t] && D.build[b.t].paint);
    bar.innerHTML = `<b>🏗 ${h(bname(b.t))}${D.build[b.t] ? ' — ' + $m(N.cost(b.t)) + (D.build[b.t].paint ? ' за клетку' : '') : ''}</b><span class="mut sm">ЛКМ — ${b.t === 'demolish' ? 'снести' : paint ? 'красить (можно тянуть)' : 'поставить'}${paint || b.t === 'demolish' ? '' : ' · R — повернуть'} · ПКМ / Esc — выйти</span><span id="buildWhy" class="bad sm"></span>${btn('Другой объект', 'panel', { p: 'build' }, 'sm')}${btn('Готово', 'buildOff', {}, 'sm pri')}`;
  };
  UI.buildOff = function () { R.build = null; const bar = $('buildBar'); if (bar) bar.remove(); $('world').style.cursor = 'grab'; };
  UI.buildClick = function (first) {
    const b = R.build; if (!b) return;
    if (b.t === 'demolish') { if (!first) return; const w = N.removeAt(b.x, b.y); if (w) G.toast('Снос: ' + w + '.', 'bad'); else WW.A.play('build'); return; }
    if (String(b.t).startsWith('zone')) { const x = Math.floor(b.x), y = Math.floor(b.y), key = x + ',' + y; if (!first && b.last === key) return; b.last = key; N.setZone(x, y, b.t.slice(5) || null); return; }
    const d = D.build[b.t], p = N.snap(b.t, b.x, b.y, b.r);
    if (d.paint) { const key = p[0] + ',' + p[1]; if (!first && b.last === key) return; b.last = key; const w = N.place(b.t, p[0], p[1], 0); if (!w) WW.A.play('click'); else if (first || w === 'не хватает денег') { if (!/^здесь уже/.test(w)) G.toast('Нельзя: ' + w + '.', 'bad'); } return; }
    if (!first) return;
    const w = N.place(b.t, p[0], p[1], b.r); if (w) G.toast('Нельзя: ' + w + '.', 'bad'); else { WW.A.play('build'); G.log('Построено: ' + d.n + ' за ' + $m(N.cost(b.t)) + '.', 'info'); }
  };
  UI.quest = function () {
    const el = $('quest'), S = WW.S; if (!el || !S) return; const q = S.set.tut && E.quests[S.qn || 0];
    if (!q) { el.classList.add('hidden'); return; }
    const html = `<div class="qh">👴 Задание Попса · ${(S.qn || 0) + 1}/${E.quests.length}</div><b>${h(q.t)}</b><div class="sm">${h(q.g)}</div><div class="sm acc">награда ${$m(q.r * G.px())}</div>`;
    if (el.dataset.k !== q.id) { el.innerHTML = html; el.dataset.k = q.id; el.dataset.tip = q.p; }
    el.classList.remove('hidden');
  };
  // оверлеи карты
  UI.ovl = function () {
    const el = $('ovl'); if (!el || !WW.S) return;
    const b = (k, t, d) => `<button class="btn sm ${R.overlay === k ? 'on' : ''}" data-a="ovl" data-k="${k}"${tip(d)}>${t}</button>`;
    el.innerHTML = b('zones', '▦ Зоны', 'Показать зоны-комнаты и чего им не хватает') + b('roads', '🚗 Проезд', 'Подсветить места: зелёные — машина доедет, красные — заперты или нет дороги');
  };
  A.ovl = d => { R.overlay = R.overlay === d.k ? null : d.k; UI.ovl(); };
  A.buildOn = d => UI.buildOn(d.t); A.buildOff = () => UI.buildOff();
  setInterval(() => { const el = $('buildWhy'), b = R.build; if (el && b) el.textContent = b.why ? '⛔ ' + b.why : ''; }, 150);
})(globalThis.WW);
