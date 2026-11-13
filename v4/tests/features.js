// Проверка новых систем: эвакуатор, толкание, фургон, станок, миграция сейва v2.
const path = require('path');
for (const f of ['util', 'data', 'data2', 'map', 'car', 'sim', 'pawns', 'orders', 'market', 'events', 'race', 'waste', 'body', 'city']) require(path.join(__dirname, '..', 'js', f + '.js'));
const WW = globalThis.WW, { G, O, P, M, C, D, N } = WW;
const cnt = { towIn: 0, towOut: 0, van: 0, push: 0, late: 0 };
const _tow = G.tow, _van = G.van, _sp = G.startPush;
G.tow = (c, m, d) => { cnt[m === 'in' ? 'towIn' : 'towOut']++; return _tow(c, m, d); };
G.van = (c, s) => { cnt.van++; return _van(c, s); }; G.startPush = c => { if (c.push && !(c.mv && c.mv.push)) cnt.push++; return _sp(c); };
G.newGame('legacy', 777); const S = WW.S; S.set.tut = false; P.hire(S.cands.find(c => c.role === 'mech').id);
function day() { while (S.phase === 'day') { for (const id in S.orders) { const o = S.orders[id]; if (o.type !== 'own' && o.stage === 'diag' && o.decide) O.autoEstimate(o); } G.step(1); for (const sid in S.slotCar) { const c = S.cars[S.slotCar[sid]]; if (!c) throw new Error('slot ' + sid + ' -> нет машины'); } } if (S.phase === 'race') { M.raceSim(); M.raceFinish(); } }
for (let d = 0; d < 25; d++) { S.set.due = ['opt', 'norm', 'pess', 'custom'][d % 4]; S.set.duePct = 130; day(); if (S.phase !== 'summary') throw new Error('фаза ' + S.phase); G.nextDay(); }
const SAVE0 = JSON.parse(G.save());
console.log('25 дней:', JSON.stringify(cnt), 'нарядов', S.stats.orders, 'касса', Math.round(S.money), 'машин на участке без места:', Object.values(S.cars).filter(c => c.lot && !c.slot && !c.mv).length);
if (!cnt.towIn || !cnt.van || !cnt.push) throw new Error('не все системы сработали');
for (const st of ['home', 'depot', 'barn']) { G.newGame('legacy', 5, st); const T = WW.S; T.set.tut = false; for (let d = 0; d < 6; d++) { while (T.phase === 'day') { for (const id in T.orders) { const o = T.orders[id]; if (o.type !== 'own' && o.stage === 'diag' && o.decide) O.autoEstimate(o); } G.step(1); } if (T.phase === 'race') { M.raceSim(); M.raceFinish(); } G.nextDay(); } console.log('участок', st, ': 6 дней, нарядов', T.stats.orders, 'заперто', Object.values(T.orders).filter(o => o.blocked).length); }
G.load(JSON.stringify(SAVE0));
// миграция: грубо превращаем состояние в старый формат (v3: карта не по сетке) и загружаем
const j = JSON.parse(G.save()); j.v = 3; j.upg.waiting = true;
for (const o of j.map.objs) { o.x += .1; o.y -= .3; } delete j.map.road; delete j.map.zone; delete j.map.dirt; delete j.site; delete j.champ;
for (const p of j.pawns.concat(j.cands)) delete p.pri.clean;
if (!G.load(JSON.stringify(j))) throw new Error('миграция не загрузилась');
const S2 = WW.S; console.log('миграция v2→v3: боксов', N.slots().filter(s => s.kind === 'bay').length, 'зона ожидания', N.has('chairs'), 'машин с местом', Object.values(S2.cars).filter(c => c.slot).length, 'спецы', S2.pawns.map(p => p.spec).join(','));
for (let d = 0; d < 5; d++) { while (WW.S.phase === 'day') { for (const id in WW.S.orders) { const o = WW.S.orders[id]; if (o.type !== 'own' && o.stage === 'diag' && o.decide) O.autoEstimate(o); } G.step(1); } if (WW.S.phase === 'race') { M.raceSim(); M.raceFinish(); } G.nextDay(); }
console.log('после миграции отыграно 5 дней, нарядов', WW.S.stats.orders, '— OK');
