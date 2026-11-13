// Диагностика зависит от навыка; характер клиента решает судьбу допов; комплексные поломки встречаются.
const path = require('path');
for (const f of ['util', 'data', 'map', 'car', 'sim', 'pawns', 'orders', 'market', 'events', 'race']) require(path.join(__dirname, '..', 'js', f + '.js'));
const WW = globalThis.WW, { G, O, C, D, U, P } = WW;
G.newGame('heir', 11, 'gas'); const S = WW.S;
// 1) точность теста от навыка
for (const sk of [0, 10, 20]) { let miss = 0, width = 0; for (let i = 0; i < 2000; i++) { const car = C.gen({ model: 'caprio', quality: 'private', owner: 'world' }); const n = car.nodes.block; n.lo = 0; n.hi = 100; C.reveal(car, { nodes: { block: 8 } }, sk); if (n.t < n.lo || n.t > n.hi) miss++; width += n.hi - n.lo; delete S.cars[car.id]; }
  console.log('навык диагностики', String(sk).padStart(2), '→ ширина интервала', (width / 2000).toFixed(1), '%, неверных показаний', (miss / 20).toFixed(1) + '%'); }
// 2) характер и допы: смета из одной нужной работы и трёх рекомендаций
const res = {};
for (const tm of Object.keys(D.temper)) { let acc = 0, all = 0, scenes = 0; for (let i = 0; i < 300; i++) {
  const car = C.gen({ model: 'caprio', quality: 'client', owner: 'client' }); C.addFault(car, 'brakes', 'brake_bad', 20);
  const o = O.create(car, { name: 'тест', arch: 'mom', pat: 50, know: .1, temper: tm }, 'fault'); o.syms = ['brake_bad']; o.stage = 'diag';
  for (const id of ['brakes', 'fsusp', 'rsusp', 'steer']) { car.nodes[id].lo = 30; car.nodes[id].hi = 50; if (id !== 'brakes') car.nodes[id].t = 45; O.addJob(o, { kind: 'replace', node: id, grade: 'oem' }); }
  O.send(o); const before = S.log.length; o.desk = 1; O.deskDone(o, 'call', S.pawns[0]); if (S.log.length > before && /скандал/.test(S.log[0].t)) scenes++;
  const ex = o.jobs.filter(j => j.node !== 'brakes'); acc += ex.filter(j => j.status !== 'declined').length; all += ex.length; O.drop(o, false); delete S.cars[car.id]; }
  res[tm] = { 'допы приняты': Math.round(acc / all * 100) + '%', 'скандалов': Math.round(scenes / 3) + '%' }; }
console.log('Допы сверх жалобы (3 рекомендации к тормозам):'); for (const k in res) console.log('  ', D.temper[k].n.padEnd(24), JSON.stringify(res[k]));
// 3) комплексные поломки на потоке клиентов
let multi = 0, hidden = 0, n = 0; for (let i = 0; i < 600; i++) { const o = O.arrive({ type: 'client', min: 500 }); if (!o) continue; n++; if (o.multi) multi++; if (o.hidden) hidden++; S.orders = {}; S.cars = {}; S.slotCar = {}; S.veh = []; S.visitors = []; }
console.log('Клиентов', n, '· две причины одного симптома', (multi / n * 100).toFixed(0) + '%', '· скрытый каскад до разборки', (hidden / n * 100).toFixed(0) + '%');
