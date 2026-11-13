// Headless-прогон: бот играет N дней без рендера. Ловит исключения, тупики и развал экономики.
// Запуск: node tests/headless.js [дней] [стратегия: honest|idle|flipper|boss] [сценарий] [сид]
const path = require('path');
for (const f of ['util', 'data', 'data2', 'map', 'car', 'sim', 'pawns', 'orders', 'market', 'events', 'race', 'waste', 'body', 'city']) require(path.join(__dirname, '..', 'js', f + '.js'));
const WW = globalThis.WW, { G, O, P, M, C, D, U, E } = WW;
const cityBot = S => { if (S.day % 5 === 2 && S.junk.length && S.money > 600) { M.buyJunk(S.junk[0].id); } if (S.parts.length >= 2 && !S.bench.length) { const a = S.parts[0], b = S.parts.find(x => x !== a && x.node === a.node && x.model === a.model); if (b) O.benchAdd('merge', a.id, b.id); else if (D.nodes[a.node].rep && a.reps > 0 && a.t < 80) O.benchAdd('fix', a.id, null, 'econ'); } if (S.deliveries.length > 1 && S.min < 900 && G.pickupCars().length && S.day % 2) G.pickup(S.pawns[0].id, G.pickupCars()[0].id); };

function inv(where) { const S = WW.S; for (const sid in S.slotCar) { const c = S.cars[S.slotCar[sid]]; if (!c) throw new Error('место ' + sid + ' занято удалённой машиной ' + S.slotCar[sid] + ' (' + where + ', день ' + S.day + '): ' + S.log.slice(0, 5).map(l => l.t).join(' | ')); } }
function run(days, strat, scn, seed, quiet, site) {
  G.newGame(scn || 'legacy', seed || 12345, site);
  const S0 = WW.S; S0.set.tut = false;
  let stuck = {}, maxStuck = 0, steps = 0;
  while (WW.S.day < days && WW.S.phase !== 'over') {
    const S = WW.S;
    if (S.phase === 'summary') { bot(strat, true); inv('ночь, бот'); G.nextDay(); inv('утро'); continue; }
    if (S.phase === 'race') { M.raceSim(); M.raceFinish(); continue; }
    G.step(1); steps++;
    if (Math.floor(S.min) % 15 === 0) bot(strat, false);
    // тупики: наряд не двигается больше 3 игровых дней
    for (const id in S.orders) { const o = S.orders[id]; const age = (S.day - o.t0d); if (age > maxStuck) maxStuck = age; if (age >= 4 && !stuck[id]) { stuck[id] = 1; if (!quiet) console.log('  ! наряд висит', age, 'дн.:', o.id, o.type, o.stage, JSON.stringify({ tests: o.tests, decide: o.decide, jobs: o.jobs.map(j => j.kind + ':' + j.status), busy: o.busy, car: !!S.cars[o.car], slot: S.cars[o.car] && S.cars[o.car].slot })); } }
    // инварианты
    for (const sid in S.slotCar) { const c = S.cars[S.slotCar[sid]]; if (!c) throw new Error('slot ' + sid + ' -> missing car'); if (c.slot !== sid && c.dest !== sid && c.home !== sid) throw new Error('slot mismatch ' + sid); }
    if (!isFinite(S.money)) throw new Error('money NaN');
  }
  return { S: WW.S, maxStuck, steps };
}

function bot(strat, night) {
  const S = WW.S;
  if (strat === 'idle') { S.pawns[0].pri = { desk: 0, diag: 0, mech: 0, body: 0 }; return; }
  S.set.autoDiag = true;
  for (const id in S.orders) {
    const o = S.orders[id];
    if (o.type !== 'own' && o.stage === 'diag' && o.decide) { O.autoEstimate(o); }
    if (o.findings && o.findings.length && o.stage !== 'ready' && o.stage !== 'qc') { const n = o.findings[0]; if (O.addJob(o, { kind: 'replace', node: n, grade: 'econ', finding: 1 })) { if (o.stage !== 'diag') { o.stage = 'approval'; } else O.send(o); } else o.findings.shift(); }
  }
  if (strat !== 'idle' && !night) cityBot(S);
  for (const of of S.offers.slice()) { const car = S.cars[of.car]; if (car && of.price >= car.sale.ask * .85) M.accept(of.id); }
  if (strat === 'honest' || strat === 'boss' || strat === 'flipper') {
    if (night) {
      // найм и апгрейды
      const px = G.px();
      if (S.money > 1500 * px && P.staff().length < (strat === 'boss' ? 5 : 2)) { const c = S.cands.find(c => c.role === 'mech') || S.cands[0]; if (c) P.hire(c.id); }
      if (S.money > 2500 * px && !S.pawns.some(p => p.role === 'recep') && P.staff().length >= 2) { const c = S.cands.find(c => c.role === 'recep'); if (c) P.hire(c.id); }
      for (const u of ['compr', 'air', 'shelf', 'tester', 'sign']) if (!S.upg[u] && S.money > D.upg[u].cost * px * 1.8 + 800) { G.buyUpg(u); break; }
      const N = WW.N;
      const want = [['b_eng', 9.5, 8, 1], ['b_trans', 15.5, 8, 1], ['chairs', 32.5, 7.5, 0], ['sofa', 28, 3.5, 0], ['lift', 23.5, 6.5, 0], ['vending', 31.5, 3.5, 0], ['plant', 34.5, 15.5, 0]];
      if (S.site === 'gas') for (const b of want) if (!N.has(b[0]) || (b[0] === 'lift' && N.objs('lift').length < 3)) { if (S.money > D.build[b[0]].cost * px * 1.8 + 1200) { if (b[0] === 'lift') for (let y = 9; y <= 10; y++) for (let x = 22; x <= 24; x++) N.place('road', x, y, 0); const q = N.snap(b[0], b[1], b[2], b[3]), w = N.place(b[0], q[0], q[1], b[3]); if (w && w !== 'не хватает денег') throw new Error('build ' + b[0] + ': ' + w); } break; }
      // свой сток: починить и продать
      for (const id in S.cars) {
        const car = S.cars[id]; if (car.owner !== 'player' || car.mv) continue;
        if (!car.order && !car.sale) {
          if (!car.botDone) {
            const o = O.newOwn(car); if (!o) continue; car.botDone = 1;
            for (const f of car.faults) O.addJob(o, { kind: D.nodes[f.node].repl ? 'replace' : 'repair', node: f.node, grade: 'econ' });
            O.addJob(o, { kind: 'own', key: 'detail' });
            if (S.money > 400) O.send(o); else O.closeOwn(o);
          } else M.list(car, Math.round(C.value(car, 't') * 1.05));
        } else if (car.sale && S.day - car.sale.day > 8) car.sale.ask = Math.round(car.sale.ask * .93);
      }
    }
  }
  if (strat === 'flipper' && night && S.money > 1200) {
    const l = S.listings.find(l => { const c = S.cars[l.car]; return l.cur < S.money * .5 && l.cur < C.value(c, 't') * .8; });
    if (l && G.freeSlot(['proj'])) M.buy(l.id, l.cur);
  }
  if (!night && S.race && S.race.day === S.day && !S.race.entry && strat !== 'idle') { const c = M.raceCars()[0]; if (c && S.race.type !== 'junk') M.raceEnter(c.id, S.pawns[0].id); }
}

if (require.main === module) {
  const days = +process.argv[2] || 30, strat = process.argv[3] || 'honest', scn = process.argv[4] || 'legacy', seed = +process.argv[5] || 12345;
  const site = process.argv.find(a => a.startsWith('--site=')), t0 = Date.now(), r = run(days, strat, scn, seed, false, site ? site.slice(7) : 'gas'), S = r.S;
  const stars = S.stats.stars, avg = stars.length ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(2) : '-';
  console.log(`[${strat}/${scn}/${S.site}] дней ${S.day}, фаза ${S.phase}, касса ${Math.round(S.money)}, ипотека ${Math.round(S.loan.bal)}, реп ${G.rep().toFixed(1)} (q${S.rep.q.toFixed(0)} h${S.rep.h.toFixed(0)} s${S.rep.s.toFixed(0)} p${S.rep.p.toFixed(0)})`);
  console.log(`  наряды ${S.stats.orders}, ср.★ ${avg}, возвраты ${S.stats.comebacks}, куплено ${S.stats.bought}, продано ${S.stats.sold}, флип ${Math.round(S.stats.flipProfit)}, гонки ${S.stats.races}/${S.stats.wins}, люди ${S.pawns.length}, макс. возраст наряда ${r.maxStuck} дн.`);
  console.log('  по дням net:', S.fin.hist.map(h => Math.round(h.net)).join(' '));
  console.log('  итог по статьям:', Object.entries(S.fin.total).map(([k, v]) => k + ':' + Math.round(v)).join(' '));
  console.log('  открытых нарядов', Object.keys(S.orders).length, 'машин', Object.keys(S.cars).length, 'сейв', (G.save().length / 1024).toFixed(0) + 'кБ', 'время', Date.now() - t0, 'мс');
  if (process.argv.includes('--log')) console.log(S.log.slice(0, 60).map(l => 'д' + (l.d + 1) + ' ' + U.time(l.m) + ' ' + l.t).reverse().join('\n'));
}
module.exports = { run };
