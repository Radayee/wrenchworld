// Сезон клубной серии: подготовленная машина проходит 8 этапов. Проверяет движок заезда, очки, износ, спонсоров.
const path = require('path');
for (const f of ['util', 'data', 'map', 'car', 'sim', 'pawns', 'orders', 'market', 'events', 'race']) require(path.join(__dirname, '..', 'js', f + '.js'));
const WW = globalThis.WW, { G, O, P, M, C, D, RC } = WW;
G.newGame('heir', 99); const S = WW.S; S.set.tut = false; S.money = 50000; S.upg.trailer = true;
const car = Object.values(S.cars).find(c => c.owner === 'player'); car.mods.push('cage', 'susp', 'tires');
const fixCar = () => { for (const id in car.nodes) if (!car.nodes[id].gone) car.nodes[id].t = Math.max(car.nodes[id].t, 78); car.order = null; for (const id in S.orders) if (S.orders[id].car === car.id) delete S.orders[id]; C.refreshFaults(car); };
const ch = RC.champ(); for (const k in D.spares) { ch.spares[k] = 3; } ch.load = { tires: 1, hoses: 1, pads: 1, ignit: 1, tools: 1 }; ch.crew = [];
P.hire(S.cands.find(c => c.role === 'mech').id); ch.crew = [S.pawns[1].id];
const out = [];
while (S.day < 56) {
  if (S.race && S.race.day === S.day && !S.race.entry && S.phase === 'day' && !S.race.tried) { S.race.tried = 1; fixCar(); if (!M.raceEnter(car.id, S.pawns[0].id)) out.push(S.race.round + '. ' + S.race.name.padEnd(30) + ' заявку не приняли: ' + RC.check(car, S.race).filter(x => !x.ok).map(x => x.t).join(', ')); }
  if (S.phase === 'day') { for (const id in S.orders) { const o = S.orders[id]; if (o.type !== 'own' && o.stage === 'diag' && o.decide) O.autoEstimate(o); } G.step(1); continue; }
  if (S.phase === 'race') { const r = S.race, res = M.raceSim(); out.push(r.round + '. ' + r.name.padEnd(30) + ' ' + res.text.padEnd(28) + ' очки ' + (res.pts || 0) + (res.used && Object.keys(res.used).length ? ' исп.' + JSON.stringify(res.used) : '')); M.raceFinish(); if (ch.offers.length) RC.signSponsor(ch.offers[ch.offers.length - 1]); continue; }
  if (S.phase === 'summary') G.nextDay(); else break;
}
console.log(out.join('\n'));
console.log('Таблица:', RC.table().slice(0, 5).map(t => t.n + ' ' + t.pts).join(' | '), '· стартов', ch.starts, '· побед', S.stats.wins, '· спонсор', ch.sponsor && ch.sponsor.n);
// статистика: подготовка решает больше случая
const st = { good: [], bad: [] };
for (let i = 0; i < 60; i++) for (const k of ['good', 'bad']) {
  G.newGame('heir', 1000 + i); const T = WW.S; T.upg.trailer = true; M.mkRace(); const r = T.race; r.track = 'oval'; r.type = 'circuit'; r.opt = { gear: 70, susp: 65, tyre: 55 };
  const c = Object.values(T.cars).find(x => x.owner === 'player'); c.mods.push('cage'); for (const id in c.nodes) c.nodes[id].t = k === 'good' ? 88 : 38; c.faults = [];
  r.entry = { car: c.id, p: T.pawns[0].id, crew: [], load: k === 'good' ? { tires: 1, hoses: 1, pads: 1 } : {} }; RC.champ().spares = { tires: 1, hoses: 1, pads: 1 };
  r.setup = k === 'good' ? { gear: 70, susp: 65, tyre: 55 } : { gear: 20, susp: 20, tyre: 90 }; r.practice = [1];
  const st0 = RC.newRace(r, c, T.pawns[0], true); let n = 0; while (!st0.over && n++ < 100000) RC.step(st0, 1); st[k].push(RC.resultCircuit(r, st0).place);
}
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log('Средняя позиция на овале: подготовлена', avg(st.good), '· запущена', avg(st.bad), '(одна и та же машина, 60 гонок)');
if (!(avg(st.good) < avg(st.bad) - 1.5)) throw new Error('подготовка должна решать сильнее случая');
