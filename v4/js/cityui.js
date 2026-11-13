// WRENCHWORLD — отрисовка города: соседи на главной карте, карта города во вкладке «Город»,
// участок точки интереса рисуется подробно, когда туда приехал сотрудник.
(function (WW) {
  const U = WW.U, D = WW.D, R = WW.R, UI = WW.UI, CT = WW.CITY, $ = id => document.getElementById(id), h = U.esc;
  const fake = (model, col, seed) => ({ model, color: col, seed, year: 1985, detail: .6, rust: { farch: { r: 0 }, rarch: { r: 0 }, sills: { r: 0 }, floor: { r: 0 }, frame: { r: 0 }, doors: { r: 0 } } });
  // ---------- соседи на главной карте ----------
  R.drawNeighbors = function (c, S) {
    if (!S.world && !CT.get()) return; const ST = WW.N.STREET, m = S.min;
    for (const [i, nb] of CT.neighbors().entries()) {
      const x0 = nb.x0, x1 = nb.x1, y0 = nb.y0, y1 = nb.y1, w = x1 - x0, hgt = y1 - y0, across = y0 > ST;
      c.fillStyle = nb.kind === 'house' ? '#55704a' : '#5a5d60'; c.fillRect(x0, y0, w, hgt);
      if (nb.kind === 'house') { c.strokeStyle = 'rgba(230,230,220,.5)'; c.lineWidth = .08; c.setLineDash([.25, .2]); c.strokeRect(x0 + .2, y0 + .2, w - .4, hgt - .4); c.setLineDash([]); }
      const bx = x0 + w * .15, by = across ? y0 + hgt * .45 : y0 + hgt * .1, bw = w * .55, bh = hgt * .45;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(bx + .3, by + .3, bw, bh); c.fillStyle = nb.roof; c.fillRect(bx, by, bw, bh); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .06; c.beginPath(); c.moveTo(bx, by + bh / 2); c.lineTo(bx + bw, by + bh / 2); c.stroke();
      if (nb.kind === 'shop') { c.fillStyle = '#c0392b'; c.fillRect(bx + bw * .1, by + bh - .5, bw * .8, .4); c.fillStyle = '#3E4043'; c.fillRect(x0 + .5, across ? y0 + .5 : by + bh + .5, w - 1, 3.5); }
      // подъездная дорожка к улице
      const dx = x0 + w * .82; if (across) { c.fillStyle = '#4a4c4f'; c.fillRect(dx - 1.3, y0, 2.6, hgt * .9); }
      // машина: дома, уехала или едет
      const car = nb.car; if (!car) continue; const fc = fake(car.model, car.col, 77 + i);
      const tr = 2.2; let pos = null;
      if (m >= car.dep && m < car.dep + tr) { const f = (m - car.dep) / tr; pos = f < .35 ? [dx, U.lerp(y0 + 4, ST + 1, f / .35), -Math.PI / 2] : [dx + car.dir * (f - .35) / .65 * 60, ST + (car.dir > 0 ? 2.9 : 1.1), car.dir > 0 ? 0 : Math.PI]; }
      else if (m >= car.ret && m < car.ret + tr) { const f = (m - car.ret) / tr; pos = f < .65 ? [dx - car.dir * (1 - f / .65) * 60, ST + (car.dir > 0 ? 1.1 : 2.9), car.dir > 0 ? Math.PI : 0] : [dx, U.lerp(ST + 1, y0 + 4, (f - .65) / .35), Math.PI / 2]; }
      else if (m < car.dep || m >= car.ret + tr) pos = across ? [dx, y0 + 4, Math.PI / 2] : [dx, y1 - 3, -Math.PI / 2];
      if (pos) { c.save(); c.translate(pos[0], pos[1]); c.rotate(pos[2]); R.drawCarTop(c, fc, { flat: 1 }); c.restore(); }
    }
  };
  // ---------- карта города ----------
  const zoneCol = { down: '#4d5047', res: '#4a5b42', ind: '#4f4d48', farm: '#5a6440' }, kindCol = { house: '#8a6a58', shop: '#6d7f8c', office: '#7d8590', factory: '#6b6660', farm: '#8a7a50', service: '#E3B23C', poi: '#c9a76a' };
  UI.sub.ccam = UI.sub.ccam || null;
  function drawCity() {
    const cv = $('cityCv'); if (!cv || !WW.S) return; const c = cv.getContext('2d'), city = CT.get(), S = WW.S, w = cv.width, hh = cv.height;
    let cam = UI.sub.ccam; if (!cam) { const home = city.lots[city.home]; cam = UI.sub.ccam = { x: home.x, y: home.y, z: Math.min(w / city.W, hh / city.H) * 1.6 }; }
    const X = p => [(p[0] - cam.x) * cam.z + w / 2, (p[1] - cam.y) * cam.z + hh / 2];
    c.fillStyle = '#46513f'; c.fillRect(0, 0, w, hh);
    c.save(); c.translate(w / 2 - cam.x * cam.z, hh / 2 - cam.y * cam.z); c.scale(cam.z, cam.z);
    // река
    c.strokeStyle = '#3d5f7a'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); city.river.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    // участки и здания
    for (const l of city.lots) { c.save(); c.translate(l.x, l.y); c.rotate(l.ang); c.fillStyle = l.poi === 'home' ? '#6a6455' : zoneCol[l.zone]; c.fillRect(-l.w / 2, -l.d / 2, l.w, l.d); const k = l.kind === 'house' ? .55 : l.kind === 'farm' ? .3 : .75; c.fillStyle = l.poi ? (l.poi === 'home' ? '#E3B23C' : '#c9a76a') : l.col || kindCol[l.kind]; c.fillRect(-l.w * k / 2, -l.d * k / 2 - l.face * l.d * .08, l.w * k, l.d * k); c.restore(); }
    // улицы
    for (const e of city.E) { const a = city.V[e.a], b = city.V[e.b]; c.strokeStyle = '#2d2e31'; c.lineWidth = e.w * 1.1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    for (const e of city.E) if (e.w > 2) { const a = city.V[e.a], b = city.V[e.b]; c.strokeStyle = 'rgba(232,211,106,.5)'; c.lineWidth = .18; c.setLineDash([1, 1]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.setLineDash([]); }
    // мосты
    c.strokeStyle = '#8b8d86'; c.lineWidth = .35; for (const e of city.E) { const a = city.V[e.a], b = city.V[e.b], my = (a.y + b.y) / 2; let ry = 0; for (let i = 1; i < city.river.length; i++) if (city.river[i][0] >= (a.x + b.x) / 2) { ry = city.river[i][1]; break; } if (Math.abs(my - ry) < 4) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
    // машины жителей
    for (const car of city.cars) { const p = CT.carPos(car, S.min); if (!p.p) continue; c.save(); c.translate(p.p[0], p.p[1]); c.rotate(p.p[2]); c.fillStyle = car.col; c.fillRect(-.9, -.45, 1.8, .9); c.restore(); }
    // сотрудники в разъездах
    const trips = CT.trips();
    for (const t of trips) { if (!t.pos) continue; c.save(); c.translate(t.pos[0], t.pos[1]); c.rotate(t.pos[2]); c.fillStyle = '#E3B23C'; c.fillRect(-1.3, -.65, 2.6, 1.3); c.restore(); }
    c.restore();
    // подписи точек интереса
    c.font = 'bold 12px system-ui'; c.textAlign = 'center';
    for (const l of city.lots) if (l.poi) { const q = X([l.x, l.y]), d = D.city[l.poi] || { i: '🏠', n: 'Мастерская' }; c.font = '18px system-ui'; c.fillText(d.i, q[0], q[1] + 6); if (cam.z > 2 || l.poi === UI.sub.poi) { c.font = 'bold 11px system-ui'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 3; c.strokeText(d.n.replace(/«|»/g, ''), q[0], q[1] + 22); c.fillText(d.n.replace(/«|»/g, ''), q[0], q[1] + 22); } if (l.poi === UI.sub.poi) { c.strokeStyle = '#E3B23C'; c.lineWidth = 2; c.beginPath(); c.arc(q[0], q[1], 16, 0, 7); c.stroke(); } c.fillStyle = '#fff'; }
    for (const t of trips) { const p = t.pos || [city.lots[t.to].x, city.lots[t.to].y], q = X(p), pw = WW.P.byId(t.p); c.font = 'bold 11px system-ui'; c.fillStyle = '#ffe9a8'; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 3; const tx = (pw ? pw.name.split(' ')[0] : '?') + (t.state === 'there' ? ' 📍' : ''); c.strokeText(tx, q[0], q[1] - 12); c.fillText(tx, q[0], q[1] - 12); }
    // легенда
    const away = city.cars.filter(car => CT.carPos(car, S.min).at !== 'home').length;
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(8, hh - 28, 330, 22); c.fillStyle = '#e8e4da'; c.font = '12px system-ui'; c.textAlign = 'left'; c.fillText('Жителей с машинами: ' + city.cars.length + ' · сейчас не дома: ' + away + ' · ' + U.time(S.min), 16, hh - 13);
    // участок, где сейчас сотрудник
    const there = trips.find(t => t.state === 'there'); UI.cityThere = there || null;
    const inset = $('cityLot'); if (inset) { if (there) { inset.style.display = 'block'; drawLot($('cityLotCv'), city.lots[there.to], there); const pw = WW.P.byId(there.p); $('cityLotT').textContent = '📍 ' + (pw ? pw.name : 'Сотрудник') + ' на месте: ' + ((D.city[city.lots[there.to].poi] || {}).n || 'частный дом') + ' — ' + there.what; } else inset.style.display = 'none'; }
  }
  // подробный участок: рисуем, только когда туда приехал сотрудник
  function drawLot(cv, lot, trip) {
    if (!cv) return; const c = cv.getContext('2d'), w = cv.width, hh = cv.height, poi = lot.poi, r = U.mk(lot.id * 977 + 3);
    c.fillStyle = '#5a6440'; c.fillRect(0, 0, w, hh); c.fillStyle = '#2d2e31'; c.fillRect(0, hh - 40, w, 40); c.strokeStyle = '#E8D36A'; c.setLineDash([14, 10]); c.lineWidth = 2; c.beginPath(); c.moveTo(0, hh - 20); c.lineTo(w, hh - 20); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#3E4043'; c.fillRect(w * .05, hh * .45, w * .9, hh * .55 - 40);
    const bld = (x, y, bw, bh, col, sign) => { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x + 6, y + 6, bw, bh); c.fillStyle = col; c.fillRect(x, y, bw, bh); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, y, bw, 8); if (sign) { c.fillStyle = '#c0392b'; c.fillRect(x + bw * .15, y + bh - 18, bw * .7, 16); c.fillStyle = '#ffe9a8'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText(sign, x + bw / 2, y + bh - 6); } };
    const car = (x, y, col, a) => { c.save(); c.translate(x, y); c.rotate(a || -Math.PI / 2); c.scale(9, 9); R.drawCarTop(c, fake(U.pick(['caprio', 'square', 'kay', 'camria', 'meridian'], r), col), { flat: 1 }); c.restore(); };
    const cols = ['#b4322b', '#2e5d8f', '#e9e7e0', '#1f2226', '#6b7a3a', '#c9a227', '#b5b9bd'];
    if (poi === 'junk') { bld(w * .05, 20, w * .25, hh * .3, '#5d584f', 'PULL-A-PART'); for (let i = 0; i < 14; i++) car(w * .38 + (i % 7) * 52, 60 + Math.floor(i / 7) * 70, U.pick(['#7a4a2a', '#5d6166', '#6b5136', '#8a8d90'], r), r() * 3); }
    else if (poi === 'store' || poi === 'dist') { bld(w * .1, 20, w * .8, hh * .35, poi === 'store' ? '#7a4a3a' : '#4a5a6a', poi === 'store' ? 'EARL & SONS' : 'MIDWEST PARTS'); for (let i = 0; i < 5; i++) car(w * .15 + i * 70, hh * .62, U.pick(cols, r)); }
    else if (poi === 'pound') { c.strokeStyle = '#9a9da0'; c.lineWidth = 3; c.setLineDash([6, 6]); c.strokeRect(w * .05, 20, w * .9, hh - 70); c.setLineDash([]); bld(w * .06, 24, 90, 60, '#5d6166', 'ОКРУГ'); for (let i = 0; i < 10; i++) car(w * .3 + (i % 5) * 60, 60 + Math.floor(i / 5) * 80, U.pick(cols, r)); }
    else if (poi === 'mall' || poi === 'bank' || poi === 'paper' || poi === 'school' || poi === 'dealer' || poi === 'bigal') { bld(w * .1, 20, w * .8, hh * .38, poi === 'bigal' ? '#d9662b' : '#6d7f8c', (D.city[poi] || {}).n ? D.city[poi].n.replace(/«|».*/g, '').slice(0, 18).toUpperCase() : ''); for (let i = 0; i < 6; i++) car(w * .12 + i * 60, hh * .65, U.pick(cols, r)); }
    else if (poi === 'strip') { c.fillStyle = '#2d2e31'; c.fillRect(20, hh * .3, w - 40, 60); c.fillStyle = '#fff'; c.fillRect(60, hh * .3, 4, 60); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#111'; c.fillRect(w - 60, hh * .3 + i * 7.5, 8, 7.5); } car(90, hh * .3 + 15, '#b4322b', 0); car(90, hh * .3 + 45, '#2e5d8f', 0); bld(w * .7, 20, 120, 50, '#5d6166', 'NORWALK'); }
    else { c.fillStyle = '#55704a'; c.fillRect(0, 0, w, hh - 40); bld(w * .25, 30, w * .4, hh * .4, lot.col || '#7a4a3a', null); c.fillStyle = '#4a4c4f'; c.fillRect(w * .75, hh * .3, 50, hh * .7 - 40); car(w * .75 + 25, hh * .55, U.pick(cols, r)); }
    // наш человек
    car(w * .5, hh - 30, '#E3B23C', 0); c.fillStyle = '#ffe9a8'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('наша машина', w * .5, hh - 48);
  }
  // вкладка «Город»: карта вместо схемы
  const baseCity = UI.views.city;
  UI.views.city = function () {
    let s = baseCity(); const i = s.indexOf('<svg'), j = s.indexOf('</svg>');
    if (i >= 0 && j > i) s = s.slice(0, i) + `<div style="position:relative"><canvas id="cityCv" width="900" height="600" style="width:100%;border-radius:8px;border:1px solid var(--ln);cursor:grab;display:block"></canvas><div id="cityLot" style="display:none;position:absolute;right:8px;top:8px;width:46%;background:rgba(20,22,26,.92);border:1px solid var(--acc);border-radius:8px;padding:6px"><div id="cityLotT" class="sm acc b" style="margin-bottom:4px"></div><canvas id="cityLotCv" width="520" height="300" style="width:100%;border-radius:6px"></canvas></div></div>` + s.slice(j + 6);
    s = s.replace('Кликни точку. Домики — частные объявления. Время в пути считается от заправки.', 'Город сгенерирован: магистрали, кольцо, кварталы, река. Колёсико — зум, перетаскивание — сдвиг, клик по значку — точка интереса. Жёлтые машины — твои сотрудники в разъездах; когда кто-то приезжает на место, участок рисуется подробно.');
    return s;
  };
  // ввод на карте города
  let drag = null;
  document.addEventListener('mousedown', e => { if (e.target.id !== 'cityCv') return; drag = [e.clientX, e.clientY, 0]; });
  document.addEventListener('mousemove', e => { if (!drag || !UI.sub.ccam) return; const cv = $('cityCv'); if (!cv) return; const k = cv.width / cv.getBoundingClientRect().width; UI.sub.ccam.x -= (e.clientX - drag[0]) * k / UI.sub.ccam.z; UI.sub.ccam.y -= (e.clientY - drag[1]) * k / UI.sub.ccam.z; drag[2] += Math.abs(e.clientX - drag[0]) + Math.abs(e.clientY - drag[1]); drag[0] = e.clientX; drag[1] = e.clientY; });
  document.addEventListener('mouseup', e => {
    if (!drag) return; const moved = drag[2]; drag = null; if (moved > 5 || e.target.id !== 'cityCv') return;
    const cv = $('cityCv'), rc = cv.getBoundingClientRect(), k = cv.width / rc.width, mx = (e.clientX - rc.left) * k, my = (e.clientY - rc.top) * k, cam = UI.sub.ccam, city = CT.get();
    const wx = (mx - cv.width / 2) / cam.z + cam.x, wy = (my - cv.height / 2) / cam.z + cam.y; let best = null, bd = 18 / cam.z;
    for (const l of city.lots) if (l.poi) { const d = Math.hypot(l.x - wx, l.y - wy); if (d < bd) { bd = d; best = l; } }
    if (best) { UI.sub.poi = best.poi === 'home' ? 'home' : best.poi; UI.render(true); }
  });
  document.addEventListener('wheel', e => { if (e.target.id !== 'cityCv' || !UI.sub.ccam) return; e.preventDefault(); UI.sub.ccam.z = U.clamp(UI.sub.ccam.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1.2, 30); }, { passive: false });
  setInterval(() => { if (UI.view && UI.view.p === 'city') drawCity(); }, 60);
})(globalThis.WW);
