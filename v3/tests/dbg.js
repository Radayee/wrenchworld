const { run } = require('./headless.js'); const WW = globalThis.WW;
const days = +process.argv[2] || 3, upto = +process.argv[3] || 600;
// run to day N then step to minute
run(days, 'honest', 'legacy', 12345, true);
const S = WW.S; while (S.phase === 'day' && S.min < upto) WW.G.step(1);
for (const p of S.pawns) console.log(p.name, p.state, 'arr', p.arriveAt, 'xy', p.x.toFixed(1), p.y.toFixed(1), 'path', p.path && p.path.length, 'task', JSON.stringify(p.task), 'pri', JSON.stringify(p.pri), 'smoke', p.smoke, 'think', p.think);
for (const id in S.orders) { const o = S.orders[id], c = S.cars[o.car]; console.log(o.id, o.type, o.stage, 'desk', o.desk, 'busy', o.busy, 'arrived', o.arrived, 'tests', o.tests, 'decide', o.decide, 'jobs', o.jobs.map(j => j.status + ':' + (j.left|0)).join(','), 'car', c.slot, !!c.mv, c.dest, 'here', o.clientHere, 'pick', o.pickDay, o.pickAt|0); }
console.log('slots', JSON.stringify(S.slotCar), 'min', S.min);
