// Дороги: машины ездят только по тайлам дороги; место за местом блокирует дальнюю машину.
const path = require('path');
for (const f of ['util', 'data', 'data2', 'map', 'car', 'sim', 'pawns', 'orders', 'market', 'events', 'race', 'waste', 'body', 'city']) require(path.join(__dirname, '..', 'js', f + '.js'));
const WW = globalThis.WW, { G, N, C } = WW;
G.newGame('heir', 3, 'gas'); const S = WW.S; S.money = 1e5;
const ok = (c, m) => { if (!c) throw new Error(m); console.log('✔ ' + m); };
// 1) ставим парковку за парковкой: (35..37, 20..24) под существующей (35..37, 15..19)
const front = N.slots().find(s => s.kind === 'park' && s.tx === 36 && s.ty === 17);
ok(front, 'нашли переднее место');
ok(!N.removeAt(35.5, 22.5), 'рекламный щит сносится'); ok(!N.removeAt(17.5, 18), 'бензоколонка сносится');
const q = N.snap('park', 36, 22, 0); ok(!N.canPlace('park', q[0], q[1], 0), 'можно поставить место за местом'); N.place('park', q[0], q[1], 0);
const back = N.slots().find(s => s.kind === 'park' && s.ty === 22 && s.tx === 36); ok(back, 'заднее место появилось');
const r = N.roadIn();
ok(N.reach(r[0], r[1], null, back.id), 'пока переднее пустое — до заднего доехать можно (сквозь пустое место)');
// машина на переднем — заднее недоступно
const a = C.gen({ model: 'caprio', quality: 'good', owner: 'player' }); a.faults = []; for (const id in a.nodes) a.nodes[id].t = 90; G.place(a, front.id);
ok(!N.reach(r[0], r[1], null, back.id), 'переднее занято — заднее место недоступно');
const b = C.gen({ model: 'caprio', quality: 'good', owner: 'player' }); b.faults = []; for (const id in b.nodes) b.nodes[id].t = 90;
ok(!G.freeSlot(['park']) || G.freeSlot(['park']).id !== back.id, 'freeSlot не предлагает запертое место');
// 2) машина ставится на заднее (переднее пустое), потом переднее занимают — задняя заперта
delete S.slotCar[front.id]; a.slot = null; a.lot = false; delete S.cars[a.id];
G.place(b, back.id); const c2 = C.gen({ model: 'caprio', quality: 'good', owner: 'player' }); c2.faults = []; for (const id in c2.nodes) c2.nodes[id].t = 90; G.place(c2, front.id);
ok(G.blocked(b), 'задняя машина заперта передней');
ok(!G.send(b, 'exit') && b.wantExit, 'выезд не удался, машина ждёт, пока освободят');
G.send(c2, 'exit'); for (let i = 0; i < 400 && S.cars[c2.id]; i++) G.step(.25);
ok(!S.cars[c2.id], 'передняя уехала по дороге');
for (let i = 0; i < 40 && b.wantExit; i++) G.step(.25);
ok(!b.wantExit && b.mv, 'задняя сама поехала на выезд, когда путь открылся');
// 3) маршрут идёт только по дороге
G.newGame('heir', 4, 'gas'); const T = WW.S, car = C.gen({ model: 'caprio', quality: 'good', owner: 'player' }); car.faults = []; for (const id in car.nodes) car.nodes[id].t = 90;
const sl = N.slots().find(s => s.kind === 'yard'); G.send(car, sl.id); let off = 0, n = 0;
while (car.mv && n++ < 2000) { G.step(.1); if (car.mv && car.x < N.W - .5 && car.x > .5) { const tx = Math.floor(car.x), ty = Math.floor(car.y); if (!N.isRoad(tx, ty)) off++; } }
ok(car.slot === sl.id, 'машина доехала до места во дворе');
console.log('  кадров вне дороги:', off, '(углы при сглаживании траектории)'); ok(off < 6, 'машина едет по дороге, не по газону');
// 4) толкание: один человек у водительской двери
const dead = C.gen({ model: 'caprio', quality: 'good', owner: 'player' }); dead.faults = []; for (const id in dead.nodes) dead.nodes[id].t = 90; dead.nodes.start.t = 2; WW.C.refreshFaults(dead);
const pj = N.slots().find(s => s.kind === 'proj' && !T.slotCar[s.id]); G.place(dead, pj.id); const y2 = N.slots().find(s => s.kind === 'yard' && !T.slotCar[s.id]); G.send(dead, y2.id);
T.pawns[0].pri.haul = 1; let pushers = 0; for (let i = 0; i < 4000 && dead.slot !== y2.id; i++) { G.step(.25); pushers = Math.max(pushers, G.pushers(dead)); }
ok(dead.slot === y2.id, 'неходовую докатили до места'); ok(pushers === 1, 'толкал один человек');
