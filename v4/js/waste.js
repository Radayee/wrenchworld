// WRENCHWORLD — старые детали, мусор и жидкости.
// Старая деталь клиента: в коробку клиенту, себе на склад или в контейнер. Мусор: общий (платим за вывоз) и раздельный (платят нам).
// Жидкости сливают в ёмкости; без ёмкости — лужа на полу; можно слить «по-тихому» за забором — дёшево и рискованно.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, N = WW.N, X = WW.X = {};
  const G = () => WW.G, O = () => WW.O;
  const S = () => WW.S;
  X.types = () => Object.keys(D.waste);
  X.init = s => { if (!s.waste) s.waste = { gen: 0, metal: 0, rubber: 0, plast: 0, oil: 0, chem: 0, ground: 0 }; if (!s.spills) s.spills = []; if (!s.set.oldParts) s.set.oldParts = 'box'; if (s.eco == null) s.eco = 0; };
  X.migrate = s => X.init(s);
  X.bins = type => N.objs ? WW.S.map.objs.filter(o => D.build[o.t] && D.build[o.t].bin === type) : [];
  X.cap = type => X.bins(type).reduce((a, o) => a + D.build[o.t].cap, 0);
  X.level = type => U.clamp(S().waste[type] / Math.max(1, X.cap(type)), 0, 1.5);
  // положить отход: раздельные типы без своего контейнера уходят в общий бак; переполнение — на землю
  X.add = function (type, amt, x, y) {
    const s = S(); X.init(s); if (!amt) return;
    const def = D.waste[type];
    if (def.fluid) {
      const free = X.cap(type) - s.waste[type];
      if (free >= amt) { s.waste[type] += amt; return; }
      if (free > 0) { s.waste[type] += free; amt -= free; }
      X.spill(type, amt, x, y); return;
    }
    if (type !== 'gen' && X.cap(type) - s.waste[type] < amt) { const room = Math.max(0, X.cap(type) - s.waste[type]); s.waste[type] += room; amt -= room; type = 'gen'; }
    const free = X.cap('gen') - s.waste.gen;
    if (type === 'gen' && free < amt) { s.waste.gen += Math.max(0, free); s.waste.ground += amt - Math.max(0, free); if (x != null) N.addDirt(x, y, .25); return; }
    s.waste[type] += amt;
  };
  // лужа: видна на полу, пачкает, копит экориск
  X.spill = function (type, L, x, y) {
    const s = S(); if (x == null) { const d = N.objs('desk')[0] || { x: 20, y: 10 }; x = d.x; y = d.y + 3; }
    s.spills.push({ x: x + U.rf(-1.2, 1.2), y: y + U.rf(-1.5, 1.5), col: D.waste[type].col, r: Math.min(1.6, .35 + L / 14), age: 0 }); if (s.spills.length > 40) s.spills.shift();
    N.addDirt(x, y, Math.min(.6, L / 20)); s.eco += L * (type === 'chem' ? 2 : 1);
  };
  X.scrap = function (node, k, x, y) { const m = (D.nodes[node] || {}).mat || { metal: 1 }; for (const t in m) X.add(t, m[t] * (k || 1), x, y); };
  X.drain = function (node, car) { const f = D.FLUID[node]; if (!f) return; for (const t in f) X.add(t, f[t] * U.rf(.8, 1.2), car && car.x, car && car.y); };
  X.pack = function (car) { X.add('plast', .4, car && car.x, car && car.y); X.add('gen', .15, car && car.x, car && car.y); };
  // старая деталь при замене
  X.oldPart = function (o, car, node) {
    const n = car.nodes[node]; if (!n || n.gone) return;
    X.drain(node, car);
    if (o.type === 'own') { if (n.t > 3) O().toStock(car, node); else X.scrap(node, 1, car.x, car.y); return; }
    const pol = o.oldParts || S().set.oldParts;
    if (pol === 'box') { (o.box = o.box || []).push({ node, t: Math.round(n.t) }); return; }
    if (pol === 'keep' && n.t > 3) { const it = O().toStock(car, node, 'старая деталь клиента'); it.t = n.t; o.kept = (o.kept || 0) + 1; return; }
    X.scrap(node, 1, car.x, car.y);
  };
  X.trashPart = function (id) { const s = S(), it = s.parts.find(x => x.id === id); if (!it || O().itemBusy(id)) return; s.parts = s.parts.filter(x => x !== it); const sh = N.objs('shelf')[0] || {}; X.scrap(it.node, 1, sh.x, sh.y); G().toast(O().partName(it) + ' — в контейнер.', 'info'); };
  // вывоз
  X.rate = function (type) { const d = D.waste[type], cheap = type === 'gen' && N.has('bin_press') ? .6 : 1; return d.pay * G().px() * (d.pay < 0 ? cheap : 1); };
  X.pickup = function (manual) {
    const s = S(), g = G(); let sum = 0, parts = [];
    for (const t of X.types()) { const a = s.waste[t]; if (a < .5) continue; const v = a * X.rate(t); sum += v; parts.push(D.waste[t].i + ' ' + Math.round(a) + ' ' + D.waste[t].unit + ' ' + (v >= 0 ? '+' : '−') + U.money(Math.abs(v)).replace('−', '')); s.waste[t] = 0; }
    if (s.waste.ground > .5) { const v = -s.waste.ground * 6 * g.px(); sum += v; parts.push('куча на земле ' + Math.round(s.waste.ground) + ' ед. ' + U.money(v)); s.waste.ground = 0; }
    if (manual) sum -= 20 * g.px();
    if (!parts.length && !manual) return 0;
    g.money(Math.round(sum), sum >= 0 ? 'misc' : 'utilities');
    g.log('Вывоз отходов' + (manual ? ' по вызову' : '') + ': ' + (parts.join(', ') || 'нечего вывозить') + '. Итого ' + U.money(Math.round(sum)) + '.', sum >= 0 ? 'good' : 'info');
    if (manual) g.toast('Вывезли отходы: ' + U.money(Math.round(sum)) + '.', sum >= 0 ? 'good' : 'info');
    return sum;
  };
  // «по-тихому»: слить жидкости за забором или вывалить мусор в овраг
  X.dump = function (kind) {
    const s = S(), g = G(), fl = kind === 'fluids', amt = fl ? s.waste.oil + s.waste.chem : s.waste.gen + s.waste.ground;
    if (amt < 1) { g.toast('Сливать нечего.', 'info'); return; }
    if (fl) { s.eco += s.waste.oil * .5 + s.waste.chem * 2; s.waste.oil = 0; s.waste.chem = 0; } else { s.eco += amt * .6; s.waste.gen = 0; s.waste.ground = 0; }
    const p = U.clamp(.08 + s.eco / 900, .08, .6);
    if (U.chance(p)) { const fine = Math.round(U.rf(250, 600) * g.px() * (fl ? 1.5 : 1)); g.money(-fine, 'fine'); g.repAdd('h', -5); s.eco = Math.max(0, s.eco - 200); g.note('Соседи сфотографировали, как ' + (fl ? 'ты сливаешь отработку в канаву' : 'вываливаешь мусор в овраг') + '. Экологическая инспекция: штраф ' + U.money(fine) + ', «Честность» −5.', 'bad'); }
    else g.toast((fl ? 'Жидкости слиты в канаву за забором.' : 'Мусор вывален в овраг.') + ' Никто не видел… вроде бы.', 'info');
  };
  X.night = function () {
    const s = S(), g = G(); X.init(s);
    for (const o of s.map.objs) if (D.build[o.t] && D.build[o.t].stove && s.waste.oil > 1) { const b = Math.min(12, s.waste.oil); s.waste.oil -= b; g.money(Math.round(6 * g.px() * b / 12), 'utilities'); }
    for (const sp of s.spills) sp.age++; s.spills = s.spills.filter(sp => sp.age < 6);
    if (s.waste.ground > 2) for (const p of WW.P.staff()) WW.P.think(p, 'trash', 'Кругом мусор', -3, 1);
    s.eco = Math.max(0, s.eco - 4);
    if (s.eco > 120 && U.chance(.06 + s.eco / 3000)) { const fine = Math.round(U.rf(300, 800) * g.px()); g.money(-fine, 'fine'); g.repAdd('h', -3); s.eco = Math.max(0, s.eco - 150); g.note('Экологическая проверка нашла пятна масла и антифриза на участке. Штраф ' + U.money(fine) + '. Поставь ёмкости под отработку.', 'bad'); }
    if (g.dow() === 6) X.pickup(false);
  };
  WW.on('daystart', () => { if (S()) X.init(S()); });

  // ---------- как клиент смотрит на грейд детали ----------
  // предпочтение архетипа + удар «ремонт дороже машины» + безопасность тормозов для семей + оригинал для классики
  O().gradeX = function (o, j, car) {
    if (!j.grade || !(j.kind === 'replace' || j.kind === 'install') || !o.client) return 0;
    const pref = D.gradePref[o.client.arch] || {}, carV = C.value(car, 't');
    let x = pref[j.grade] || 0;
    if (j.grade !== 'used' && j.grade !== 'econ') x -= D.gradeCarShock(j.total, carV) * (o.client.arch === 'student' ? 1.4 : 1);
    if ((j.grade === 'used' || j.grade === 'econ') && /pads|discs|brakes|steer|wheels/.test(j.node) && (o.client.arch === 'mom' || o.client.arch === 'retiree')) x -= 1;
    if (j.grade === 'oem' && C.model(car).curve === 'cult' && WW.S.year - car.year > 20) x += .6;
    return x;
  };
  O().gradeWhy = function (o, j, car) {
    if (!o.client || !j.grade) return ''; const x = O().gradeX(o, j, car), pref = D.gradePref[o.client.arch] || {};
    const v = x > .8 ? 'обрадуется' : x > .2 ? 'скорее согласится' : x > -.6 ? 'засомневается' : x > -1.6 ? 'скорее откажет' : 'возмутится';
    return 'Как клиент посмотрит на «' + D.grades[j.grade].short + '»: ' + v + ' (' + (x >= 0 ? '+' : '') + x.toFixed(1) + ').\n' + (pref.say || '') + '\nМашина стоит ≈ ' + U.money(C.value(car, 't')) + ', позиция — ' + U.money(j.total) + '.';
  };
  // разумный грейд по умолчанию: лучший для этого клиента среди обычных
  O().defGrade = function (o) { if (!o.client) return 'oem'; const pref = D.gradePref[o.client.arch] || {}; return ['used', 'econ', 'analog', 'oem'].sort((a, b) => (pref[b] || 0) - (pref[a] || 0))[0]; };
})(globalThis.WW);
