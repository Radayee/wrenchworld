// WRENCHWORLD — город: генератор, жители, соседи. Основа для полного мира.
// Улицы растут органически: магистрали от центра с дрейфом, кольцо, ветвящиеся переулки с примыканием к уже построенным, река с мостами.
// Участки нарезаются вдоль улиц, зоны — по расстоянию до центра. У каждого дома своя машина: утром на работу, вечером домой.
// Город детерминирован от сида — в сейве хранится только сид.
(function (WW) {
  const U = WW.U, D = WW.D, CT = WW.CITY = {};
  const SZ = [260, 180];
  CT.gen = function (seed) {
    const r = U.mk(seed >>> 0), W = SZ[0], H = SZ[1], cx = W / 2 + (r() - .5) * 20, cy = H / 2 + (r() - .5) * 14;
    const V = [], E = [], vgrid = {}, key = (x, y) => Math.floor(x / 5) + ',' + Math.floor(y / 5);
    const addV = (x, y) => { const id = V.length; V.push({ x, y, e: [] }); (vgrid[key(x, y)] = vgrid[key(x, y)] || []).push(id); return id; };
    const near = (x, y, rad, skip) => { let best = -1, bd = rad; const gx = Math.floor(x / 5), gy = Math.floor(y / 5); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const id of vgrid[(gx + i) + ',' + (gy + j)] || []) { if (skip && skip.has(id)) continue; const d = Math.hypot(V[id].x - x, V[id].y - y); if (d < bd) { bd = d; best = id; } } return best; };
    const addE = (a, b, w) => { if (a === b || V[a].e.some(e => (E[e].a === b || E[e].b === b))) return; E.push({ a, b, w }); V[a].e.push(E.length - 1); V[b].e.push(E.length - 1); };
    const inside = (x, y) => x > 2 && y > 2 && x < W - 2 && y < H - 2;
    // река
    const river = []; { let y = H * (.62 + r() * .2); for (let x = -5; x <= W + 5; x += 6) { y += (r() - .5) * 6; y = U.clamp(y, H * .45, H * .9); river.push([x, y]); } }
    const riverY = x => { for (let i = 1; i < river.length; i++) if (river[i][0] >= x) { const a = river[i - 1], b = river[i], k = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; } return river[river.length - 1][1]; };
    // магистрали
    const center = addV(cx, cy), seeds = [], NA = 5 + Math.floor(r() * 2);
    for (let k = 0; k < NA; k++) { let ang = k / NA * Math.PI * 2 + (r() - .5) * .5, x = cx, y = cy, prev = center; while (true) { ang += (r() - .5) * .28; const nx = x + Math.cos(ang) * 7, ny = y + Math.sin(ang) * 7; if (!inside(nx, ny)) break; const v = addV(nx, ny); addE(prev, v, 2.4); seeds.push({ v, ang, d: 0 }); prev = v; x = nx; y = ny; } }
    // кольцо
    { const R0 = Math.min(W, H) * .36, pts = []; for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, rr = R0 * (1 + (r() - .5) * .16); const x = cx + Math.cos(a) * rr * 1.25, y = cy + Math.sin(a) * rr; if (!inside(x, y)) { pts.push(-1); continue; } const ex = near(x, y, 4); pts.push(ex >= 0 ? ex : addV(x, y)); } for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if (a >= 0 && b >= 0) { addE(a, b, 2); seeds.push({ v: a, ang: Math.atan2(V[a].y - cy, V[a].x - cx), d: 0 }); } } }
    // улицы: ветвятся перпендикулярно, примыкают к соседним, не лезут друг на друга
    const segNear = (x, y, skip) => { const id = near(x, y, 3.2, skip); return id; };
    let budget = 620;
    while (seeds.length && budget > 0) {
      const s = seeds.splice(Math.floor(r() * seeds.length), 1)[0]; if (s.d > 3) continue;
      for (const side of [1, -1]) {
        if (r() < (s.d ? .55 : .35)) continue;
        let ang = s.ang + side * Math.PI / 2 + (r() - .5) * .3, prev = s.v, x = V[s.v].x, y = V[s.v].y; const len = 3 + Math.floor(r() * 6), skip = new Set([s.v]);
        for (let st = 0; st < len && budget > 0; st++) {
          ang += (r() - .5) * .22; const nx = x + Math.cos(ang) * 7, ny = y + Math.sin(ang) * 7;
          if (!inside(nx, ny)) break;
          const hit = near(nx, ny, 4, skip);
          if (hit >= 0) { addE(prev, hit, 1.3); budget--; break; }
          const v = addV(nx, ny); addE(prev, v, 1.3); budget--; skip.add(v);
          if (r() < .3) seeds.push({ v, ang, d: s.d + 1 }); prev = v; x = nx; y = ny;
        }
      }
    }
    // сетка занятости: дороги и река
    const occ = new Uint8Array(W * H), mark = (x, y, v) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) occ[y * W + x] = Math.max(occ[y * W + x], v); };
    for (const e of E) { const a = V[e.a], b = V[e.b], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2); for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; const rw = e.w * .7; for (let dy = -Math.ceil(rw); dy <= rw; dy++) for (let dx = -Math.ceil(rw); dx <= rw; dx++) if (dx * dx + dy * dy <= rw * rw) mark(x + dx, y + dy, 1); } }
    for (let x = 0; x < W; x++) { const ry = riverY(x); for (let y = Math.floor(ry - 3); y <= ry + 3; y++) mark(x, y, 2); }
    // участки вдоль улиц
    const lots = [];
    for (const e of E) {
      const a = V[e.a], b = V[e.b], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 4) continue;
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy, ny = ux, ang = Math.atan2(uy, ux);
      for (let t = 1.6; t < L - 1.6; t += 3.4 + r() * 1.2) for (const sd of [1, -1]) {
        const dcen = Math.hypot(a.x + ux * t - cx, a.y + uy * t - cy), zone = dcen < 26 ? 'down' : dcen < 62 ? 'res' : (r() < .5 ? 'ind' : 'farm');
        const lw = zone === 'down' ? 3.2 + r() * 1.6 : zone === 'res' ? 2.9 + r() * .9 : 4 + r() * 3, ld = zone === 'down' ? 4 + r() * 2.5 : zone === 'res' ? 3.6 + r() * 1.4 : 5 + r() * 4;
        const px = a.x + ux * t + nx * sd * (e.w * .7 + .5 + ld / 2), py = a.y + uy * t + ny * sd * (e.w * .7 + .5 + ld / 2);
        // проверка прямоугольника
        let ok = true; const cells = [];
        for (let i = -lw / 2; i <= lw / 2 && ok; i += .6) for (let j = -ld / 2; j <= ld / 2 && ok; j += .6) { const qx = px + ux * i + nx * j, qy = py + uy * i + ny * j, gx = Math.floor(qx), gy = Math.floor(qy); if (gx < 0 || gy < 0 || gx >= W || gy >= H || occ[gy * W + gx]) ok = false; else cells.push(gy * W + gx); }
        if (!ok) continue; for (const c0 of cells) occ[c0] = 3;
        lots.push({ id: lots.length, x: px, y: py, w: lw, d: ld, ang, face: sd, zone, e: lots.length, road: [a.x + ux * t, a.y + uy * t], v: e.a, kind: zone === 'down' ? (r() < .5 ? 'shop' : 'office') : zone === 'res' ? (r() < .9 ? 'house' : 'shop') : zone === 'ind' ? 'factory' : 'farm', col: ['#a65d4a', '#8a7a62', '#6d7f8c', '#9a8f6a', '#7a6a8a', '#b07a4a', '#5f7a5f'][Math.floor(r() * 7)] });
      }
    }
    // места сюжета: наша мастерская и точки интереса
    const pick = (f, sc) => { let best = null, bs = -1e9; for (const l of lots) { if (l.poi || !f(l)) continue; const s = sc(l) + r() * 3; if (s > bs) { bs = s; best = l; } } return best; };
    const dc = l => Math.hypot(l.x - cx, l.y - cy);
    const home = pick(l => l.zone !== 'farm' && dc(l) > 30 && dc(l) < 50, l => -Math.abs(dc(l) - 38)); home.poi = 'home'; home.kind = 'service';
    const near2 = (l, m) => Math.hypot(l.x - m.x, l.y - m.y);
    const want = { store: [l => l.zone !== 'farm', l => -near2(l, home)], bigal: [l => l.zone !== 'farm' && near2(l, home) > 6, l => -near2(l, home) * 2], dist: [l => l.zone === 'ind', l => -dc(l) * .2], junk: [l => l.zone === 'ind' || l.zone === 'farm', l => dc(l)], pound: [l => l.zone === 'ind', l => -Math.abs(dc(l) - 70)],
      dealer: [l => l.zone === 'down' || l.zone === 'res', l => -Math.abs(dc(l) - 30)], strip: [l => l.zone === 'farm' || l.zone === 'ind', l => dc(l) * 1.5], mall: [l => l.zone !== 'down', l => -Math.abs(dc(l) - 50)], bank: [l => l.zone === 'down', l => -dc(l)], paper: [l => l.zone === 'down', l => -dc(l) + 5], school: [l => l.zone === 'res', l => -Math.abs(dc(l) - 40)] };
    for (const k in want) { const l = pick(want[k][0], want[k][1]) || pick(() => true, () => 0); if (l) { l.poi = k; l.kind = 'poi'; if (k === 'strip' || k === 'mall' || k === 'junk') { l.w *= 1.4; l.d *= 1.4; } } }
    // жители
    const work = lots.filter(l => l.kind === 'shop' || l.kind === 'office' || l.kind === 'factory' || l.poi && l.poi !== 'home');
    const cars = []; const cols = ['#b4322b', '#2e5d8f', '#e9e7e0', '#1f2226', '#6b7a3a', '#c9a227', '#7a2331', '#b5b9bd', '#1f4d3a'];
    for (const l of lots) if (l.kind === 'house' && r() < .75 && work.length) { const w = work[Math.floor(r() * work.length)]; cars.push({ home: l.id, work: w.id, dep: 405 + r() * 95, ret: 990 + r() * 120, col: cols[Math.floor(r() * cols.length)], model: ['caprio', 'meridian', 'camria', 'wagonette', 'square', 'kay', 'concord'][Math.floor(r() * 7)] }); }
    return { seed, W, H, cx, cy, V, E, lots, river, cars, home: home.id };
  };
  CT.get = function () { const S = WW.S; if (!S) return null; if (!S.world) S.world = { seed: (S.rng ^ 0x5bd1e995) >>> 0 }; if (!CT.c || CT.c.seed !== S.world.seed) { CT.c = CT.gen(S.world.seed); CT.paths = {}; } return CT.c; };
  CT.poi = id => { const c = CT.get(); return c.lots.find(l => l.poi === id); };
  // путь по графу улиц (A*), кэш
  CT.path = function (fromLot, toLot) {
    const c = CT.get(), k = fromLot + '>' + toLot; if (CT.paths[k]) return CT.paths[k];
    const s = c.lots[fromLot].v, t = c.lots[toLot].v, V = c.V, E = c.E, g = new Map([[s, 0]]), f = new Map(), open = [s], from = new Map();
    while (open.length) { let bi = 0; for (let i = 1; i < open.length; i++) if ((g.get(open[i]) + Math.hypot(V[open[i]].x - V[t].x, V[open[i]].y - V[t].y)) < (g.get(open[bi]) + Math.hypot(V[open[bi]].x - V[t].x, V[open[bi]].y - V[t].y))) bi = i; const cur = open.splice(bi, 1)[0]; if (cur === t) break; if (f.get(cur)) continue; f.set(cur, 1);
      for (const ei of V[cur].e) { const e = E[ei], nb = e.a === cur ? e.b : e.a, ng = g.get(cur) + Math.hypot(V[nb].x - V[cur].x, V[nb].y - V[cur].y) / (e.w > 2 ? 1.4 : 1); if (!g.has(nb) || ng < g.get(nb)) { g.set(nb, ng); from.set(nb, cur); open.push(nb); } } }
    const pts = []; let cur = t; if (cur !== s && !from.has(cur)) { CT.paths[k] = [[c.lots[fromLot].x, c.lots[fromLot].y], [c.lots[toLot].x, c.lots[toLot].y]]; return CT.paths[k]; }
    while (cur !== undefined) { pts.push([V[cur].x, V[cur].y]); if (cur === s) break; cur = from.get(cur); }
    pts.reverse(); pts.unshift([c.lots[fromLot].x, c.lots[fromLot].y]); pts.push([c.lots[toLot].x, c.lots[toLot].y]);
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); pts.len = L;
    CT.paths[k] = pts; return pts;
  };
  CT.at = function (pts, f) { const L = pts.len || 1; let tg = U.clamp(f, 0, 1) * L; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (tg <= d) { const k = d ? tg / d : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])]; } tg -= d; } const z = pts[pts.length - 1]; return [z[0], z[1], 0]; };
  // где сейчас машина жителя: дома, в пути или у работы (всё от игрового времени — без состояния в сейве)
  CT.carPos = function (car, min) {
    const tr = 25; // минут в пути
    if (min < car.dep || min >= car.ret + tr) return { at: 'home' };
    if (min < car.dep + tr) return { at: 'go', p: CT.at(CT.path(car.home, car.work), (min - car.dep) / tr) };
    if (min < car.ret) return { at: 'work' };
    return { at: 'back', p: CT.at(CT.path(car.work, car.home), (min - car.ret) / tr) };
  };
  // сотрудники в разъездах: откуда-куда и когда
  CT.trips = function () {
    const S = WW.S, c = CT.get(), out = [], home = c.home, lotOf = k => (CT.poi(k) || c.lots[home]).id, hashLot = id => { const ls = c.lots.filter(l => l.kind === 'house'); return ls.length ? ls[(id * 2654435761 >>> 0) % ls.length].id : home; };
    for (const t of S.trips || []) { const l = S.listings.find(x => x.id === t.lst); out.push({ p: t.p, until: t.until, total: 35 + ((l && l.dist) || 15) * 2, to: hashLot(t.lst), what: 'осмотр машины' }); }
    for (const t of S.usedTrips || []) out.push({ p: t.p, until: t.until, total: t.of.dist * 2 + 15, to: /Pull-A-Part/.test(t.of.who) ? lotOf('junk') : hashLot(t.of.id), what: 'забирает б/у деталь' });
    for (const t of S.runs || []) out.push({ p: t.p, until: t.until, total: 40, to: lotOf((t.cargo[0] && t.cargo[0].src) || 'store'), what: 'самовывоз деталей' });
    return out.map(t => { const st = t.until - t.total, f = (S.min - st) / t.total, leg = .35; t.f = f; t.state = f < leg ? 'go' : f < 1 - leg ? 'there' : 'back'; t.pts = t.state === 'back' ? CT.path(t.to, home) : CT.path(home, t.to); t.pos = t.state === 'go' ? CT.at(t.pts, f / leg) : t.state === 'back' ? CT.at(t.pts, (f - 1 + leg) / leg) : null; return t; });
  };
  // соседи вокруг мастерской: дома через дорогу и по бокам, их машины уезжают утром и возвращаются вечером
  CT.neighbors = function () {
    const S = WW.S, r = U.mk((S.world && S.world.seed || 1) + 99), out = [], cols = ['#b4322b', '#2e5d8f', '#e9e7e0', '#1f2226', '#6b7a3a', '#7a2331', '#b5b9bd'];
    const xs = [[2, 13], [16, 27], [30, 41]];
    for (const xr of xs) out.push({ kind: r() < .8 ? 'house' : 'shop', x0: xr[0], x1: xr[1], y0: 31, y1: 42, roof: ['#7a4a3a', '#5d6166', '#8a6a48', '#4a5a6a'][Math.floor(r() * 4)], car: r() < .85 ? { col: cols[Math.floor(r() * cols.length)], model: ['caprio', 'camria', 'wagonette', 'square', 'meridian', 'kay'][Math.floor(r() * 6)], dep: 420 + r() * 70, ret: 1000 + r() * 90, dir: r() < .5 ? -1 : 1 } : null });
    out.push({ kind: 'shop', x0: -16, x1: -2, y0: 4, y1: 24, roof: '#5d6166', car: null, name: 'Хозтовары' });
    out.push({ kind: 'house', x0: 48, x1: 60, y0: 8, y1: 22, roof: '#7a4a3a', car: { col: '#c9a227', model: 'square', dep: 450, ret: 1050, dir: 1 } });
    return out;
  };
})(globalThis.WW);
