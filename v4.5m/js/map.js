// WRENCHWORLD — карта как данные, строго по сетке (тайл = 1 м):
// стены, крыша, дорога и зоны по тайлам; объекты и места под машины; пути людей и машин; стройка; участки.
// Машины ездят ТОЛЬКО по тайлам дороги. Место под машину — тоже проезжий тайл, пока оно пустое.
(function (WW) {
  const U = WW.U, D = WW.D, MAP = D.MAP, N = WW.N = {};
  const W = MAP.W, H = MAP.H, I = (x, y) => y * W + x, STREET = 26;
  let cache = null;
  N.dirty = () => { cache = null; };
  N.W = W; N.H = H; N.STREET = STREET;
  const M = () => WW.S.map;

  // размеры объекта в тайлах с учётом поворота
  N.size = function (t, r) { const d = D.build[t]; let w = d.slot ? 3 : (d.w || 1), h = d.slot ? 5 : (d.h || 1); if ((r || 0) % 2) { const q = w; w = h; h = q; } return [w, h]; };
  N.rect = function (o) { const s = N.size(o.t, o.r); return [o.x - s[0] / 2, o.y - s[1] / 2, o.x + s[0] / 2, o.y + s[1] / 2]; };
  const tiles = function (o, f) { const q = N.rect(o); for (let y = Math.round(q[1]); y < Math.round(q[3]); y++) for (let x = Math.round(q[0]); x < Math.round(q[2]); x++) f(x, y); };

  // ---------- стартовые участки ----------
  function kit(m) {
    const k = {
      wall(x, y) { m.walls[I(x, y)] = 1; },
      box(x0, y0, x1, y1, gaps) { for (let x = x0; x <= x1; x++) { k.wall(x, y0); k.wall(x, y1); } for (let y = y0; y <= y1; y++) { k.wall(x0, y); k.wall(x1, y); } for (const g of gaps || []) delete m.walls[I(g[0], g[1])]; k.fill('roof', x0, y0, x1, y1); },
      vwall(x, y0, y1, gap) { for (let y = y0; y <= y1; y++) if (y !== gap) k.wall(x, y); },
      fill(layer, x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[layer][I(x, y)] = v || 1; },
      obj(t, tx, ty, r) { const s = N.size(t, r || 0); m.objs.push({ id: m.nid++, t, x: tx + s[0] / 2, y: ty + s[1] / 2, r: r || 0 }); }
    };
    return k;
  }
  const gate = (x0, x1, y) => { const a = []; for (let x = x0; x <= x1; x++) a.push([x, y]); return a; };
  const SITES = {
    gas(m, k) { // старая заправка: два бокса, склад, офис, колонки
      k.box(3, 2, 20, 10, gate(10, 12, 10).concat(gate(16, 18, 10), [[6, 10]])); k.vwall(8, 3, 9, 6); k.vwall(14, 3, 9, 6);
      k.box(26, 2, 33, 10, [[29, 10]]);
      k.fill('road', 3, 11, 44, 14); k.fill('road', 10, 9, 12, 10); k.fill('road', 16, 9, 18, 10); k.fill('road', 30, 15, 32, 25); k.fill('road', 34, 10, 44, 10);
      k.obj('lift', 10, 4); k.obj('lift', 16, 4);
      for (const x of [35, 38, 41]) { k.obj('yard', x, 5); k.obj('park', x, 15); }
      for (const x of [3, 6, 9]) { k.obj('proj', x, 15); k.obj('sale', x, 21); }
      k.obj('shelf', 4, 3); k.obj('shelf', 4, 5); k.obj('shelf', 4, 7); k.obj('shelf', 7, 3); k.obj('shelf', 7, 8);
      k.obj('desk', 28, 5); k.obj('toolbox', 13, 3); k.obj('toolbox', 19, 3); k.obj('b_chassis', 9, 4, 1); k.obj('b_elec', 15, 4, 1);
      k.obj('pump', 17, 17); k.obj('pump', 22, 17); k.obj('bin_gen', 1, 9); k.obj('tank_oil', 7, 5); k.obj('billboard', 34, 22); k.obj('tires', 21, 4); k.obj('barrel', 22, 3); k.obj('lamp', 2, 20); k.obj('lamp', 34, 20); k.obj('tree', 40, 22); k.obj('bench', 27, 22); k.obj('lamp', 25, 15);
      k.fill('zone', 9, 3, 13, 9, 'service'); k.fill('zone', 15, 3, 19, 9, 'service'); k.fill('zone', 4, 3, 7, 9, 'store'); k.fill('zone', 27, 3, 32, 9, 'office');
    },
    home(m, k) { // гараж за домом: один бокс, тесный двор
      m.lot = [12, 4, 35, STREET];
      k.box(18, 6, 25, 14, gate(20, 22, 14)); k.fill('road', 20, 13, 22, 25); k.fill('road', 13, 23, 33, 24);
      k.obj('lift', 20, 8); k.obj('proj', 14, 18); k.obj('park', 17, 18); k.obj('park', 23, 18); k.obj('lift', 26, 18); k.obj('sale', 29, 18); k.obj('proj', 32, 18);
      k.obj('shelf', 19, 7); k.obj('desk', 22, 7); k.obj('toolbox', 19, 10); k.obj('b_chassis', 24, 9, 1); k.obj('b_elec', 24, 11, 1);
      k.obj('tree', 13, 5); k.obj('tree', 31, 6); k.obj('bin_gen', 13, 15); k.obj('plant', 26, 15); k.obj('billboard', 30, 16); k.obj('barrel', 17, 15); k.obj('lamp', 27, 15);
      k.fill('zone', 19, 7, 24, 13, 'service');
    },
    depot(m, k) { // склад в промзоне: большая пустая коробка
      k.box(6, 3, 30, 17, gate(10, 12, 17).concat(gate(20, 22, 17), [[26, 17]]));
      k.fill('road', 10, 11, 12, 25); k.fill('road', 20, 11, 22, 25); k.fill('road', 10, 19, 41, 20);
      k.obj('lift', 10, 6); k.obj('lift', 20, 6); for (const x of [32, 35, 38]) { k.obj('park', x, 14); k.obj('proj', x, 21); } k.obj('yard', 24, 21); k.obj('yard', 27, 21); k.obj('sale', 14, 21); k.obj('sale', 17, 21);
      k.obj('shelf', 7, 4); k.obj('shelf', 7, 6); k.obj('shelf', 7, 8); k.obj('desk', 25, 5); k.obj('toolbox', 13, 6); k.obj('b_chassis', 14, 4); k.obj('b_elec', 17, 4);
      k.obj('barrel', 28, 15); k.obj('barrel', 29, 15); k.obj('bin_gen', 5, 20); k.obj('tank_oil', 8, 15); k.obj('tires', 28, 13); k.obj('lamp', 31, 18); k.obj('billboard', 42, 22); k.obj('lamp', 5, 18);
      k.fill('zone', 9, 5, 13, 11, 'service'); k.fill('zone', 19, 5, 23, 11, 'service'); k.obj('toolbox', 23, 6); k.fill('zone', 7, 4, 8, 10, 'store'); k.fill('zone', 23, 4, 29, 8, 'office');
    },
    barn(m, k) { // амбар на ферме: грунт, асфальта почти нет
      k.box(8, 4, 20, 15, gate(13, 15, 15)); k.fill('road', 13, 12, 15, 25); k.fill('road', 9, 17, 31, 18);
      k.obj('lift', 13, 7); k.obj('proj', 9, 19); k.obj('park', 17, 19); k.obj('park', 20, 19); k.obj('sale', 23, 19); k.obj('lift', 22, 12); k.obj('proj', 26, 12); k.obj('proj', 26, 19); k.obj('yard', 29, 12);
      k.obj('shelf', 9, 5); k.obj('shelf', 9, 7); k.obj('desk', 17, 5); k.obj('toolbox', 16, 8); k.obj('b_chassis', 18, 8, 1); k.obj('b_elec', 18, 11, 1);
      k.obj('tree', 3, 5); k.obj('tree', 30, 4); k.obj('bin_gen', 7, 16); k.obj('tree', 36, 14); k.obj('barrel', 10, 10); k.obj('oldcar', 34, 20); k.obj('billboard', 30, 23); k.obj('tree', 40, 21);
      k.fill('zone', 12, 6, 16, 12, 'service');
    }
  };
  N.mk = function (site) {
    const m = { ver: 1, site: SITES[site] ? site : 'gas', lot: [1, 1, W - 1, STREET], walls: {}, roof: {}, road: {}, zone: {}, dirt: {}, objs: [], nid: 1 };
    SITES[m.site](m, kit(m)); return m;
  };

  // ---------- кэш производных данных ----------
  function get() {
    const S = WW.S; if (cache && cache.S === S && cache.ver === S.map.ver) return cache;
    const m = S.map, slots = [], walk = new Uint8Array(W * H), car = new Uint8Array(W * H), slotAt = new Int16Array(W * H); let nb = 0;
    for (const k in m.walls) walk[+k] = 1;
    const wallN = (x, y) => m.walls[I(x, y)] || (x > 0 && m.walls[I(x - 1, y)]) || (x < W - 1 && m.walls[I(x + 1, y)]) || (y > 0 && m.walls[I(x, y - 1)]) || (y < H - 1 && m.walls[I(x, y + 1)]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = I(x, y); if ((y >= STREET || m.road[i] || m.roof[i]) && !wallN(x, y)) car[i] = 1; }
    for (const o of m.objs) {
      const d = D.build[o.t];
      if (d.slot) {
        const s = { id: 's' + o.id, obj: o.id, kind: d.slot, x: o.x, y: o.y, r: o.r || 0, tx: Math.floor(o.x), ty: Math.floor(o.y), n: d.slot === 'bay' ? 'Бокс ' + (++nb) : null, rect: N.rect(o), indoor: !!m.roof[I(Math.floor(o.x), Math.floor(o.y))] };
        slots.push(s); tiles(o, (x, y) => { if (!m.walls[I(x, y)]) { car[I(x, y)] = 1; slotAt[I(x, y)] = slots.length; } }); s.axis = (o.r || 0) % 2 ? [1, 0] : [0, 1];
      }
    }
    for (const o of m.objs) if (!D.build[o.t].slot) tiles(o, (x, y) => { car[I(x, y)] = 0; if (D.build[o.t].solid) walk[I(x, y)] = 1; });
    // края дороги чуть «дороже»: машины держатся середины
    const edge = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (car[I(x, y)] && (!car[I(x + 1, y)] || !car[I(x - 1, y)] || !car[I(x, y + 1)] || !car[I(x, y - 1)])) edge[I(x, y)] = 1;
    let beauty = 0; for (const o of m.objs) beauty += D.build[o.t].beauty || 0;
    cache = { S, ver: m.ver, slots, walk, car, slotAt, edge, beauty: Math.min(12, beauty), rooms: null };
    return cache;
  }
  N.slots = () => get().slots;
  N.slot = id => get().slots.find(s => s.id === id);
  N.has = t => M().objs.some(o => o.t === t);
  N.objs = t => M().objs.filter(o => o.t === t);
  N.indoor = (x, y) => !!M().roof[I(Math.floor(x), Math.floor(y))];
  N.wall = (x, y) => !!M().walls[I(x, y)];
  N.isRoad = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!get().car[I(x, y)];
  N.beauty = () => get().beauty;
  N.bench = function (sk, x, y) { const l = N.objs(D.benchOf(sk)); if (!l.length) return null; if (x == null) return l[0]; return l.slice().sort((a, b) => U.dist(a.x, a.y, x, y) - U.dist(b.x, b.y, x, y))[0]; };
  N.nearTool = (x, y) => N.objs('toolbox').some(o => U.dist(o.x, o.y, x, y) <= 5.5);
  N.inLot = function (x, y) { const l = M().lot; return x >= l[0] && y >= l[1] && x < l[2] && y < l[3]; };

  // ---------- зоны-комнаты: требования как в Prison Architect ----------
  N.rooms = function () {
    const c = get(); if (c.rooms) return c.rooms;
    const m = M(), seen = {}, rooms = [];
    for (const k in m.zone) {
      if (seen[k]) continue; const t = m.zone[k], q = [+k], ts = []; seen[k] = 1;
      while (q.length) { const i = q.pop(), x = i % W, y = Math.floor(i / W); ts.push(i); for (const v of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + v[0], ny = y + v[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = I(nx, ny); if (!seen[ni] && m.zone[ni] === t) { seen[ni] = 1; q.push(ni); } } }
      const set = new Set(ts), inside = m.objs.filter(o => set.has(I(Math.floor(o.x), Math.floor(o.y)))), def = D.zones[t], miss = [];
      if (!def) continue;
      for (const rq of def.need) { const n = inside.filter(o => rq.t.includes(o.t)).length; if (n < (rq.n || 1)) miss.push(rq.label); }
      if (def.roof && ts.some(i => !m.roof[i])) miss.push('крыша над всей зоной');
      if (ts.length < 4) miss.push('минимум 4 клетки');
      let sx = 0, sy = 0; for (const i of ts) { sx += i % W + .5; sy += Math.floor(i / W) + .5; }
      rooms.push({ t, tiles: ts, set, ok: !miss.length, miss, x: sx / ts.length, y: sy / ts.length });
    }
    c.rooms = rooms; return rooms;
  };
  N.roomAt = function (x, y) { const i = I(Math.floor(x), Math.floor(y)); return N.rooms().find(r => r.set.has(i)) || null; };
  N.roomOk = function (x, y, t) { const r = N.roomAt(x, y); return !!(r && r.t === t && r.ok); };
  N.anyRoom = t => N.rooms().some(r => r.t === t && r.ok);

  // ---------- грязь ----------
  N.addDirt = function (x, y, amt) { const m = M(); for (let k = 0; k < 3; k++) { const tx = Math.floor(x + (U.r() - .5) * 4), ty = Math.floor(y + (U.r() - .5) * 5); if (tx < 0 || ty < 0 || tx >= W || ty >= STREET || m.walls[I(tx, ty)]) continue; m.dirt[I(tx, ty)] = Math.min(1, (m.dirt[I(tx, ty)] || 0) + amt); } };
  N.dirtAround = function (x, y, r) { const m = M(); let s = 0, n = 0; for (let ty = Math.floor(y - r); ty <= y + r; ty++) for (let tx = Math.floor(x - r); tx <= x + r; tx++) { n++; s += m.dirt[I(tx, ty)] || 0; } return n ? s / n : 0; };
  N.dirtiest = function () { const m = M(); let b = null, bv = .25; for (const k in m.dirt) if (m.dirt[k] > bv) { bv = m.dirt[k]; b = +k; } return b == null ? null : [b % W + .5, Math.floor(b / W) + .5, bv]; };
  N.clean = function (x, y) { const m = M(); for (let ty = Math.floor(y) - 1; ty <= Math.floor(y) + 1; ty++) for (let tx = Math.floor(x) - 1; tx <= Math.floor(x) + 1; tx++) delete m.dirt[I(tx, ty)]; };
  N.dirtTotal = () => Object.values(M().dirt).reduce((a, b) => a + b, 0);

  // ---------- точки, куда ходят люди ----------
  function freeNear(x, y) { const g = get().walk; for (const d of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]]) { const tx = Math.floor(x + d[0]), ty = Math.floor(y + d[1]); if (tx >= 0 && ty >= 0 && tx < W && ty < H && !g[I(tx, ty)]) return [tx + .5, ty + .5]; } return [x, y]; }
  N.spot = function (name, x, y, k) {
    const desk = N.objs('desk')[0], gt = MAP.spots.gate;
    if (name === 'desk') return desk ? freeNear(desk.x, desk.y - 1) : gt.slice();
    if (name === 'client') return desk ? freeNear(desk.x + ((k || 0) % 3 - 1), desk.y + 1) : [gt[0] + 1, gt[1] - 1];
    if (name === 'chair') { const c = N.objs('chairs')[0]; if (c) return [c.x, c.y + ((k || 0) % 3 - 1) * .9]; return desk ? freeNear(desk.x + 2, desk.y + 2) : gt.slice(); }
    if (name === 'rest') { const s = N.objs('sofa')[0] || N.objs('vending')[0]; if (s) return freeNear(s.x + ((k || 0) % 3 - 1) * .7, s.y + 1); return desk ? freeNear(desk.x - 2 + (k || 0) % 3, desk.y - 1) : gt.slice(); }
    if (name === 'store') { const l = N.objs('shelf'); if (!l.length) return N.spot('desk'); const s = l.slice().sort((a, b) => U.dist(a.x, a.y, x, y) - U.dist(b.x, b.y, x, y))[0]; const g = get().walk; for (const dx of [1, -1]) { const tx = Math.floor(s.x + dx), ty = Math.floor(s.y); if (tx >= 0 && tx < W && !g[I(tx, ty)]) return [tx + .5, ty + .5]; } return freeNear(s.x, s.y + 1.5); }
    if (name === 'bench') { const b = N.bench(k, x, y); if (!b) return N.spot('store', x, y); const g = get().walk; for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const s = N.size(b.t, b.r), tx = Math.floor(b.x + d[0] * (s[0] / 2 + .5)), ty = Math.floor(b.y + d[1] * (s[1] / 2 + .5)); if (tx >= 0 && ty >= 0 && tx < W && ty < H && !g[I(tx, ty)]) return [tx + .5, ty + .5]; } return [b.x, b.y]; }
    return gt.slice();
  };

  // ---------- A* ----------
  function astar(ok, cost, sx, sy, tx, ty) {
    const Nn = W * H, gs = new Float32Array(Nn).fill(1e9), from = new Int32Array(Nn).fill(-1), closed = new Uint8Array(Nn), open = [];
    const s = I(sx, sy), t = I(tx, ty); gs[s] = 0; open.push(s);
    const h = i => { const dx = Math.abs(i % W - tx), dy = Math.abs(Math.floor(i / W) - ty); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
    let found = false;
    while (open.length) {
      let bi = 0, bf = 1e9; for (let i = 0; i < open.length; i++) { const f = gs[open[i]] + h(open[i]); if (f < bf) { bf = f; bi = i; } }
      const cur = open.splice(bi, 1)[0]; if (cur === t) { found = true; break; }
      if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % W, cy = Math.floor(cur / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = I(nx, ny); if (closed[ni] || (!ok(ni) && ni !== t)) continue;
        if (dx && dy && (!ok(I(nx, cy)) || !ok(I(cx, ny)))) continue;
        const ng = gs[cur] + (dx && dy ? 1.414 : 1) + (cost ? cost(ni) : 0); if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push(ni); }
      }
    }
    if (!found) return null;
    const pts = []; let c = t; while (c !== -1 && c !== s) { pts.push([c % W + .5, Math.floor(c / W) + .5]); c = from[c]; }
    return pts.reverse();
  }
  const cl = (v, m) => U.clamp(Math.floor(v), 0, m - 1);
  N.path = function (ax, ay, bx, by) {
    const g = get().walk, sx = cl(ax, W), sy = cl(ay, H), tx = cl(bx, W), ty = cl(by, H);
    if (sx === tx && sy === ty) return [[bx, by]];
    const p = astar(i => !g[i], null, sx, sy, tx, ty); if (!p) return [[bx, by]];
    p[p.length - 1] = [bx, by]; return p;
  };
  // проезжаемость тайла: дорога или пустое место; allow — места, сквозь которые можно (откуда и куда едем)
  function carOk(allow) { const c = get(), S = WW.S; return i => { if (!c.car[i]) return false; const si = c.slotAt[i]; if (!si) return true; const s = c.slots[si - 1]; return !S.slotCar[s.id] || !!allow[s.id]; }; }
  function smooth(pts, ok) {
    const los = (a, b) => { const d = U.dist(a[0], a[1], b[0], b[1]), n = Math.ceil(d / .3); for (let i = 1; i < n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n; if (x < 0 || x >= W) continue; if (!ok(I(Math.floor(x), cl(y, H)))) return false; } return true; };
    const out = [pts[0]]; let i = 0; while (i < pts.length - 1) { let j = Math.min(pts.length - 1, i + 12); while (j > i + 1 && !los(pts[i], pts[j])) j--; out.push(pts[j]); i = j; } return out;
  }
  // маршрут машины: from — id места или null (тогда от x,y; x > W — въезд с улицы); dest — id места или 'exit'. null — проезда нет.
  N.route = function (x, y, from, dest) {
    const c = get(), allow = {}; if (from) allow[from] = 1; if (dest !== 'exit') allow[dest] = 1;
    const ok = carOk(allow), cost = i => (c.slotAt[i] ? 2.5 : 0) + (c.edge[i] ? .35 : 0), off = x > W - 1;
    let sx, sy, pre = [];
    if (off) { sx = W - 1; sy = MAP.roadY; } else { sx = cl(x, W); sy = cl(y, H); }
    let tx, ty, post = [];
    if (dest === 'exit') { tx = 0; ty = MAP.roadY; post = [[-6, MAP.roadY + .5]]; } else { const s = N.slot(dest); if (!s) return null; tx = s.tx; ty = s.ty; }
    if (!off && !ok(I(sx, sy))) { // стоим не на дороге — до ближайшей дороги по прямой
      let best = null, bd = 1e9; for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (ok(I(xx, yy))) { const d = U.dist(xx, yy, sx, sy); if (d < bd) { bd = d; best = [xx, yy]; } }
      if (!best) return null; pre.push([best[0] + .5, best[1] + .5]); sx = best[0]; sy = best[1];
    }
    const p = (sx === tx && sy === ty) ? [] : astar(ok, cost, sx, sy, tx, ty); if (!p) return null;
    let all = [off ? [W - .5, MAP.roadY + .5] : [x, y]].concat(pre, p);
    // выезд из места — вдоль его оси; заезд — с прямого подхода вдоль оси места
    const axisPt = (s0, near) => { if (!s0) return null; const ax = s0.axis || [0, 1]; let best = null, bd = 1e9; for (const sg of [-1, 1]) { const px = s0.x + ax[0] * sg * 3.6, py = s0.y + ax[1] * sg * 3.6, tx2 = Math.floor(px), ty2 = Math.floor(py); if (tx2 < 0 || ty2 < 0 || tx2 >= W || ty2 >= H || !ok(I(tx2, ty2))) continue; const d = near ? U.dist(px, py, near[0], near[1]) : 0; if (d < bd) { bd = d; best = [px, py]; } } return best; };
    if (from) { const s0 = N.slot(from), ap = axisPt(s0, all[Math.min(2, all.length - 1)]); if (ap) all.splice(1, 0, ap); }
    if (dest !== 'exit') { const s1 = N.slot(dest), ap = axisPt(s1, all[Math.max(0, all.length - 3)]); if (ap) { all.splice(all.length - 1, 0, ap); all[all.length - 1] = [s1.x, s1.y]; } }
    let out = smooth(all, ok);
    // плавные дуги вместо ломаных: два прохода Чайкина, концы и подходы к местам сохраняем
    for (let k = 0; k < 2; k++) { const nn = [out[0]]; for (let i2 = 0; i2 < out.length - 1; i2++) { const a = out[i2], b = out[i2 + 1]; if (i2 === out.length - 2) { nn.push(b); break; } const q = [a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], r2 = [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]; if (i2 > 0) nn.push(q); nn.push(r2); } out = nn; }
    return (off ? out : out.slice(1)).concat(post);
  };
  N.reach = (x, y, from, dest) => !!N.route(x, y, from, dest);
  N.roadIn = () => [W + 4, MAP.roadY + .5];
  // куда подъезжает фургон: ближайший к складу тайл дороги
  N.dropPoint = function () { const c = get(), sh = N.objs('shelf')[0] || N.objs('desk')[0] || { x: W / 2, y: 12 }; let best = null, bd = 1e9; for (let y = 1; y < STREET; y++) for (let x = 0; x < W; x++) if (c.car[I(x, y)] && !c.slotAt[I(x, y)]) { const d = U.dist(x, y, sh.x, sh.y); if (d < bd) { bd = d; best = [x + .5, y + .5]; } } return best || [W - 3, MAP.roadY + .5]; };
  // маршрут техники до тайла дороги (или 'exit'); allow — места, в которые можно заехать
  N.vehRoute = function (x, y, tx, ty, allow) {
    const c = get(), ok = carOk(allow || {}), cost = i => (c.slotAt[i] ? 2.5 : 0) + (c.edge[i] ? .35 : 0), off = x > W - 1;
    const sx = off ? W - 1 : cl(x, W), sy = off ? MAP.roadY : cl(y, H), st = off ? [W - .5, MAP.roadY + .5] : [x, y];
    if (tx === 'exit') { const p = astar(ok, cost, sx, sy, 0, MAP.roadY) || []; return smooth([st].concat(p), ok).slice(off ? 0 : 1).concat([[-7, MAP.roadY + .5]]); }
    const gx = cl(tx, W), gy = cl(ty, H), p = (sx === gx && sy === gy) ? [] : astar(ok, cost, sx, sy, gx, gy); if (!p) return null;
    return smooth([st].concat(p), ok).slice(off ? 0 : 1);
  };

  // ---------- стройка ----------
  N.objAt = function (x, y) { const m = M(); for (let i = m.objs.length - 1; i >= 0; i--) { const q = N.rect(m.objs[i]); if (x >= q[0] && x < q[2] && y >= q[1] && y < q[3]) return m.objs[i]; } return null; };
  N.snap = function (t, x, y, r) { const d = D.build[t]; if (!d || d.paint) return [Math.floor(x), Math.floor(y)]; const s = N.size(t, r); return [Math.round(x - s[0] / 2) + s[0] / 2, Math.round(y - s[1] / 2) + s[1] / 2]; };
  N.canPlace = function (t, x, y, r) {
    const S = WW.S, m = M(), d = D.build[t]; r = r || 0;
    if (d.paint) {
      if (!N.inLot(x, y)) return 'за границей участка';
      const i = I(x, y);
      if (t === 'wall') { if (m.walls[i]) return 'здесь уже стена'; if (N.objAt(x + .5, y + .5)) return 'мешает объект'; for (const id in S.cars) { const c = S.cars[id]; if (c.lot && Math.abs(c.x - x - .5) < 1.6 && Math.abs(c.y - y - .5) < 2.6) return 'здесь машина'; } }
      if (t === 'roof' && m.roof[i]) return 'здесь уже крыша';
      if (t === 'road') { if (m.road[i]) return 'здесь уже дорога'; if (m.walls[i]) return 'здесь стена'; const o = N.objAt(x + .5, y + .5); if (o && !D.build[o.t].slot) return 'мешает объект'; }
      return '';
    }
    const o = { t, x, y, r }; let why = '';
    tiles(o, (tx, ty) => { if (why) return; if (!N.inLot(tx, ty)) why = 'за границей участка'; else if (m.walls[I(tx, ty)]) why = 'мешает стена'; else if (N.objAt(tx + .5, ty + .5)) why = 'место занято'; });
    if (why) return why;
    if (d.slot) { /* подъезд не обязателен: проезд видно в оверлее «Проезд» */ }
    else for (const id in S.cars) { const c = S.cars[id]; if (c.lot && Math.abs(c.x - x) < 2 && Math.abs(c.y - y) < 3 && N.isRoad(Math.floor(x), Math.floor(y))) return 'здесь машина'; }
    return '';
  };
  N.cost = t => { const d = D.build[t], px = WW.G.px(); return d.paint ? Math.round(d.cost * px) : Math.round(d.cost * px / 5) * 5; };
  function sync() { const S = WW.S; S.map.ver++; cache = null; S.upg.waiting = N.has('chairs'); S.upg.rest = N.has('sofa'); WW.emit('mapchange'); }
  N.sync = sync;
  N.place = function (t, x, y, r) {
    const S = WW.S, m = M(), why = N.canPlace(t, x, y, r); if (why) return why;
    const c = N.cost(t); if (S.money < c) return 'не хватает денег';
    WW.G.money(-c, 'upgrade'); WW.emit('q', 'build');
    if (D.build[t].paint) m[t === 'wall' ? 'walls' : t][I(x, y)] = 1; else m.objs.push({ id: m.nid++, t, x, y, r: r || 0 });
    if (t === 'wall') delete m.road[I(x, y)];
    sync(); return '';
  };
  N.setZone = function (x, y, t) { const m = M(); if (!N.inLot(x, y)) return; if (t) m.zone[I(x, y)] = t; else delete m.zone[I(x, y)]; m.ver++; cache = null; };
  // снос: объект под курсором, иначе стена, дорога, крыша; за объекты возвращается половина цены
  N.removeAt = function (x, y) {
    const S = WW.S, m = M(), o = N.objAt(x, y), G = WW.G;
    if (o) {
      const d = D.build[o.t];
      if (d.slot) { const sid = 's' + o.id; if (S.slotCar[sid]) return 'место занято или забронировано машиной'; if (d.slot === 'bay' && N.slots().filter(s => s.kind === 'bay').length <= 1) return 'последний пост сносить нельзя'; }
      if (o.t === 'desk' && N.objs('desk').length <= 1) return 'нужна хотя бы одна стойка';
      if (d.bench && S.bench && S.bench.some(b => b.sk === d.bench && b.status === 'doing')) return 'на станке идёт работа';
      m.objs = m.objs.filter(q => q !== o); G.money(Math.round(N.cost(o.t) * .5), 'upgrade'); sync(); return '';
    }
    const tx = Math.floor(x), ty = Math.floor(y), i = I(tx, ty);
    if (!N.inLot(tx, ty)) return 'за границей участка';
    if (m.walls[i]) { delete m.walls[i]; sync(); return ''; }
    if (m.road[i]) { for (const id in S.cars) { const c = S.cars[id]; if (c.lot && Math.abs(c.x - tx - .5) < 1.2 && Math.abs(c.y - ty - .5) < 1.2) return 'здесь машина'; } delete m.road[i]; sync(); return ''; }
    if (m.roof[i]) { delete m.roof[i]; sync(); return ''; }
    return 'здесь нечего сносить';
  };
  N.expand = function () { const m = M(); m.lot = [1, 1, W - 1, STREET]; sync(); };
  N.lotFull = () => { const l = M().lot; return l[0] <= 1 && l[1] <= 1 && l[2] >= W - 1 && l[3] >= STREET; };

  // старые сейвы (v2, v3): карта была не по сетке — заправка строится заново, машины пересаживаются, докупленное ставится на свободные места
  N.migrate = function (S) {
    const old = S.map, oldSlots = [], extra = {};
    if (old && old.objs) { for (const o of old.objs) { const d = D.build[o.t]; if (!d) continue; if (d.slot) oldSlots.push({ id: 's' + o.id, kind: d.slot }); else extra[o.t] = (extra[o.t] || 0) + 1; } }
    else for (const s of D.MAP.slots) if (!s.upg || S.upg[s.upg]) oldSlots.push({ id: s.id, kind: s.kind });
    const cnt = kk => oldSlots.filter(s => s.kind === kk).length, lifts = cnt('bay');
    if (S.upg.waiting) extra.chairs = Math.max(1, extra.chairs || 0); if (S.upg.rest) extra.sofa = Math.max(1, extra.sofa || 0);
    const m = S.map = N.mk('gas'), k = kit(m); cache = null;
    const have = t => m.objs.filter(o => o.t === t).length;
    if (lifts >= 3) { k.obj('lift', 22, 4); k.fill('road', 22, 9, 24, 10); m.objs = m.objs.filter(o => !(o.t === 'tires' || o.t === 'barrel')); }
    if (lifts >= 4) { m.objs = m.objs.filter(o => !(o.t === 'pump' && o.x < 19)); k.obj('lift', 16, 16); k.fill('road', 16, 15, 18, 15); }
    const spots = { b_eng: [21, 3, 0], b_trans: [24, 3, 0], b_body: [25, 5, 1], chairs: [32, 6, 0], sofa: [27, 3, 0] };
    for (const t in spots) if ((extra[t] || 0) > have(t)) k.obj(t, spots[t][0], spots[t][1], spots[t][2]);
    if (cnt('proj') > 3) k.obj('proj', 12, 15); if (cnt('sale') > 3) k.obj('sale', 12, 21);
    cache = null; S.slotCar = {};
    const fresh = {}; for (const s of N.slots()) (fresh[s.kind] = fresh[s.kind] || []).push(s);
    const take = kinds => { for (const kk of kinds) for (const s of fresh[kk] || []) if (!S.slotCar[s.id]) return s; return null; };
    const kindOf = {}; for (const s of oldSlots) kindOf[s.id] = s.kind;
    for (const id in S.cars) {
      const c = S.cars[id], kk = c.slot ? kindOf[c.slot] : (c.dest && c.dest !== 'exit' ? kindOf[c.dest] : null), was = c.lot || c.slot || c.mv;
      c.mv = null; c.push = null; c.dest = null; c.home = null; c.slot = null;
      if (!((was || kk) && !c.away && (c.owner === 'player' || c.owner === 'client'))) { c.lot = false; continue; }
      const order = { bay: ['bay', 'yard', 'park', 'proj'], yard: ['yard', 'park', 'proj'], park: ['park', 'yard', 'proj'], proj: ['proj', 'yard', 'park', 'sale'], sale: ['sale', 'proj', 'yard'] }[kk || (c.owner === 'player' ? 'proj' : 'park')];
      const s = take(order);
      if (s) { c.slot = s.id; S.slotCar[s.id] = c.id; c.x = s.x; c.y = s.y; c.ang = s.r ? 0 : -Math.PI / 2; c.lot = true; const o = c.order && S.orders[c.order]; if (o) o.arrived = true; }
      else { if (c.order && S.orders[c.order]) delete S.orders[c.order]; if (c.owner === 'client') delete S.cars[id]; else c.lot = false; }
    }
    delete S.upg.bay3; delete S.upg.bay4; delete S.upg.lot2; S.upg.waiting = N.has('chairs'); S.upg.rest = N.has('sofa');
  };
})(globalThis.WW);
