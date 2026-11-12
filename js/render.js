// WRENCHWORLD — рендер мира (Canvas 2D): строгий вид сверху, машины стопкой слоёв, люди, эффекты, свет.
(function (WW) {
  const U = WW.U, D = WW.D, C = WW.C, MAP = D.MAP, R = WW.R = {};
  const cam = R.cam = { x: 23, y: 15, z: 24 };
  let cv, ctx, W = 0, H = 0, dpr = 1, T = 0;
  const fx = R.fx = [];
  R.hover = null; R.sel = null;

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  R.shade = shade;
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }

  R.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); R.resize(); };
  R.resize = function () { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  R.fit = function () { cam.z = U.clamp(Math.min(W / (MAP.W + 1), H / (MAP.H + .5)), 8, 64); cam.x = MAP.W / 2; cam.y = MAP.H / 2 + .3; };
  R.toWorld = (px, py) => [(px - W / 2) / cam.z + cam.x, (py - H / 2) / cam.z + cam.y];
  R.toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  R.zoom = function (f, px, py) { const a = R.toWorld(px, py); cam.z = U.clamp(cam.z * f, 8, 64); const b = R.toWorld(px, py); cam.x += a[0] - b[0]; cam.y += a[1] - b[1]; clampCam(); };
  R.pan = function (dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); };
  function clampCam() { cam.x = U.clamp(cam.x, 0, MAP.W); cam.y = U.clamp(cam.y, 0, MAP.H); }
  R.focus = function (x, y) { cam.x = x; cam.y = y; if (cam.z < 26) cam.z = 26; clampCam(); };

  // ---------- машина сверху: +x — вперёд, единицы — метры ----------
  const BT = {
    sedan: { hood: .27, trunk: .19, r: .32, cab: .8, ws: .5, rw: .42 }, coupe: { hood: .33, trunk: .15, r: .4, cab: .76, ws: .55, rw: .6 }, hatch: { hood: .3, trunk: .05, r: .36, cab: .8, ws: .5, rw: .7 },
    wagon: { hood: .26, trunk: .02, r: .28, cab: .84, ws: .48, rw: .25, rack: 1 }, van: { hood: .11, trunk: .01, r: .3, cab: .88, ws: .55, rw: .2 }, suv: { hood: .25, trunk: .02, r: .22, cab: .86, ws: .42, rw: .22, rack: 1 },
    pickup: { hood: .25, trunk: .46, r: .2, cab: .86, ws: .42, rw: .16, bed: 1 }, fin: { hood: .28, trunk: .23, r: .34, cab: .8, ws: .5, rw: .5 }, roadster: { hood: .4, trunk: .2, r: .46, cab: .7, ws: .3, rw: 0, open: 1 }
  };
  R.drawCarTop = function (c, car, o) {
    o = o || {}; const m = D.models[car.model], L = m.L, Wd = m.W, hl = L / 2, hw = Wd / 2, col = car.color, dk = shade(col, -.32), lt = shade(col, .16);
    const rnd = U.mk(car.seed);
    c.lineJoin = 'round';
    if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,' + (o.lift ? .2 : .3) + ')'; const so = o.lift ? .34 : .13; rr(c, -hl + so, -hw + so, L, Wd, .5); c.fill(); }
    const wx = L * .31, glass = '#1d2a33';
    const wheels = () => { c.fillStyle = '#17181a'; for (const sx of [wx, -wx]) for (const sy of [-1, 1]) { rr(c, sx - .34, sy * (hw - .06) - .12, .68, .24, .08); c.fill(); } };
    if (m.body === 'prewar') {
      wheels(); c.fillStyle = '#1b1c1f'; for (const sx of [wx, -wx]) for (const sy of [-1, 1]) { rr(c, sx - .55, sy * (hw - .16) - .2, 1.1, .4, .2); c.fill(); }
      c.fillStyle = '#26282c'; c.fillRect(-wx + .5, -hw + .04, wx * 2 - 1, .2); c.fillRect(-wx + .5, hw - .24, wx * 2 - 1, .2);
      c.fillStyle = col; c.strokeStyle = dk; c.lineWidth = .04; c.beginPath(); c.moveTo(hl - .25, -.3); c.lineTo(hl - .25, .3); c.lineTo(.5, .52); c.lineTo(.5, -.52); c.closePath(); c.fill(); c.stroke();
      rr(c, -hl + .25, -.56, hl + .3, 1.12, .12); c.fill(); c.stroke();
      c.fillStyle = glass; c.fillRect(.2, -.5, .26, 1); c.fillStyle = '#1a1b1e'; rr(c, -hl + .45, -.5, 1.55, 1, .1); c.fill();
      c.fillStyle = '#c9c9c0'; c.fillRect(hl - .28, -.28, .08, .56); c.fillStyle = '#f4e9b0'; for (const sy of [-1, 1]) { c.beginPath(); c.arc(hl - .35, sy * .52, .13, 0, 7); c.fill(); }
      c.fillStyle = '#17181a'; rr(c, -hl + .02, -.3, .22, .6, .08); c.fill();
    } else if (m.body === 'bug') {
      wheels(); c.fillStyle = col; c.strokeStyle = dk; c.lineWidth = .04;
      for (const sx of [wx, -wx]) for (const sy of [-1, 1]) { c.beginPath(); c.ellipse(sx, sy * (hw - .2), .62, .26, 0, 0, 7); c.fill(); c.stroke(); }
      c.beginPath(); c.ellipse(0, 0, hl - .05, hw - .12, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = glass; c.beginPath(); c.ellipse(-.15, 0, 1.12, hw - .22, 0, 0, 7); c.fill();
      c.fillStyle = lt; c.beginPath(); c.ellipse(-.2, 0, .8, hw - .32, 0, 0, 7); c.fill();
      c.strokeStyle = dk; c.lineWidth = .03; c.beginPath(); c.moveTo(-hl + .15, -.25); c.lineTo(-1.25, -.3); c.moveTo(-hl + .15, .25); c.lineTo(-1.25, .3); c.stroke();
      c.fillStyle = '#f4e9b0'; for (const sy of [-1, 1]) { c.beginPath(); c.arc(wx + .5, sy * (hw - .3), .13, 0, 7); c.fill(); }
      c.fillStyle = '#b3261e'; for (const sy of [-1, 1]) c.fillRect(-wx - .62, sy * (hw - .3) - .07, .08, .14);
    } else if (m.body === 'jeep') {
      wheels(); c.fillStyle = col; c.strokeStyle = dk; c.lineWidth = .04;
      for (const sy of [-1, 1]) { rr(c, wx - .5, sy * (hw - .02) - (sy > 0 ? .3 : 0), 1.05, .3, .05); c.fill(); c.stroke(); }
      rr(c, -hl + .2, -hw + .14, L - .75, Wd - .28, .1); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(hl - .2, -.42); c.lineTo(hl - .2, .42); c.lineTo(.55, hw - .2); c.lineTo(.55, -hw + .2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#1b1c1f'; rr(c, -hl + .32, -hw + .24, 1.85, Wd - .48, .06); c.fill();
      c.fillStyle = '#4a3f33'; for (const sy of [-1, 1]) { rr(c, -.15, sy * .36 - .22, .5, .44, .08); c.fill(); } rr(c, -hl + .45, -.5, .45, 1, .06); c.fill();
      c.strokeStyle = '#2a2b2e'; c.lineWidth = .07; c.beginPath(); c.moveTo(-.3, -hw + .22); c.lineTo(-.3, hw - .22); c.stroke();
      c.fillStyle = glass; c.fillRect(.45, -hw + .2, .08, Wd - .4);
      c.fillStyle = '#17181a'; rr(c, -hl - .05, -.33, .26, .66, .1); c.fill();
      c.fillStyle = '#f4e9b0'; for (const sy of [-1, 1]) { c.beginPath(); c.arc(hl - .22, sy * .5, .11, 0, 7); c.fill(); }
    } else {
      const p = BT[m.body] || BT.sedan; wheels();
      c.fillStyle = col; c.strokeStyle = dk; c.lineWidth = .045; rr(c, -hl, -hw, L, Wd, p.r); c.fill(); c.stroke();
      const hx = hl - p.hood * L, tx = -hl + p.trunk * L;
      if (p.bed) { c.fillStyle = shade(col, -.5); rr(c, -hl + .12, -hw + .14, p.trunk * L - .2, Wd - .28, .06); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .03; for (let x = -hl + .4; x < tx - .2; x += .32) { c.beginPath(); c.moveTo(x, -hw + .18); c.lineTo(x, hw - .18); c.stroke(); } }
      // остекление и крыша
      if (p.open) { c.fillStyle = '#1b1c1f'; rr(c, tx, -hw + .22, hx - tx - .25, Wd - .44, .25); c.fill(); c.fillStyle = '#3d342b'; for (const sy of [-1, 1]) { rr(c, tx + .25, sy * .36 - .24, .6, .48, .1); c.fill(); } c.fillStyle = glass; rr(c, hx - .3, -hw + .16, .12, Wd - .32, .05); c.fill(); }
      else {
        c.fillStyle = glass; rr(c, tx + .02, -hw + .1, hx - tx - .04, Wd - .2, .28); c.fill();
        const rx0 = tx + p.rw, rx1 = hx - p.ws, rw = Wd * p.cab;
        c.fillStyle = car.color2 || lt; c.strokeStyle = dk; c.lineWidth = .03; rr(c, rx0, -rw / 2, rx1 - rx0, rw, .22); c.fill(); c.stroke();
        c.strokeStyle = car.color2 || col; c.lineWidth = .07; for (const sy of [-1, 1]) for (const px of [.36, .7]) { const x = U.lerp(rx0, rx1, px); if (m.body === 'coupe' && px > .5) continue; c.beginPath(); c.moveTo(x, sy * rw / 2); c.lineTo(x, sy * (hw - .1)); c.stroke(); }
        if (m.ttop) { c.fillStyle = glass; for (const sy of [-1, 1]) { rr(c, rx0 + .25, sy * .08 + (sy < 0 ? -rw / 2 + .1 : 0), rx1 - rx0 - .45, rw / 2 - .18, .06); c.fill(); } }
        if (p.rack) { c.strokeStyle = 'rgba(20,20,20,.55)'; c.lineWidth = .05; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(rx0 + .2, sy * (rw / 2 - .12)); c.lineTo(rx1 - .5, sy * (rw / 2 - .12)); c.stroke(); } }
      }
      // капот, багажник
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = .03;
      c.beginPath(); c.moveTo(hx + .05, -hw + .3); c.lineTo(hl - .25, -hw + .34); c.moveTo(hx + .05, hw - .3); c.lineTo(hl - .25, hw - .34); c.stroke();
      if (!p.bed && p.trunk > .1) { c.beginPath(); c.moveTo(tx - .05, -hw + .25); c.lineTo(tx - .05, hw - .25); c.stroke(); }
      if (m.decal) { c.fillStyle = 'rgba(212,167,44,.85)'; c.beginPath(); c.ellipse(hx + p.hood * L * .5, 0, .5, .42, 0, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.ellipse(hx + p.hood * L * .5 + .12, 0, .2, .3, 0, 0, 7); c.fill(); }
      if (m.scoop) { c.fillStyle = dk; rr(c, hx + .5, -.25, .35, .5, .06); c.fill(); }
      if (m.spoiler) { c.fillStyle = dk; rr(c, -hl + .05, -hw + .12, .2, Wd - .24, .05); c.fill(); }
      if (m.body === 'fin') { c.fillStyle = '#d8d8d0'; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(-hl + .05, sy * (hw - .02)); c.lineTo(-hl + 1.5, sy * (hw - .02)); c.lineTo(-hl + .05, sy * (hw - .2)); c.fill(); } }
      // бамперы, свет
      const chrome = car.year < 1984;
      c.fillStyle = chrome ? '#d5d7d6' : shade(col, -.55); rr(c, hl - .1, -hw + .12, .13, Wd - .24, .05); c.fill(); rr(c, -hl - .03, -hw + .12, .13, Wd - .24, .05); c.fill();
      c.fillStyle = '#f6edc0';
      if (car.year < 1975 || m.sport) for (const sy of [-1, 1]) { c.beginPath(); c.arc(hl - .16, sy * (hw - .36), .12, 0, 7); c.fill(); if (m.sport) { c.beginPath(); c.arc(hl - .16, sy * (hw - .64), .1, 0, 7); c.fill(); } }
      else if (!m.popup) for (const sy of [-1, 1]) c.fillRect(hl - .2, sy * (hw - .38) - .17, .1, .34);
      c.fillStyle = '#b3261e'; for (const sy of [-1, 1]) c.fillRect(-hl + .08, sy * (hw - .4) - .2, .08, .4);
    }
    // ржавчина по зонам (видимые сверху) и грязь
    const blot = (x, y, R, n) => { const a = U.clamp((R - 14) / 70, 0, .9); if (a <= 0) { for (let i = 0; i < n * 3; i++) rnd(); return; } for (let i = 0; i < n; i++) { const bx = x + (rnd() - .5) * .7, by = y + (rnd() - .5) * .16, br = .08 + rnd() * .16 * (R / 60); c.fillStyle = 'rgba(' + (120 + rnd() * 30 | 0) + ',62,22,' + a + ')'; c.beginPath(); c.ellipse(bx, by, br * 1.4, br * .7, 0, 0, 7); c.fill(); } };
    for (const sy of [-1, 1]) { blot(wx, sy * (hw - .1), car.rust.farch.r, 3); blot(-wx, sy * (hw - .1), car.rust.rarch.r, 4); blot(0, sy * (hw - .05), car.rust.sills.r, 4); blot(-.3, sy * (hw - .16), car.rust.doors.r, 3); }
    if (car.detail < .35) { c.fillStyle = 'rgba(86,70,48,' + (.35 - car.detail) * .55 + ')'; rr(c, -hl, -hw, L, Wd, .35); c.fill(); }
    if (car.detail > .8 && !o.flat) { c.fillStyle = 'rgba(255,255,255,.13)'; c.beginPath(); c.ellipse(.2, -hw * .35, L * .3, .12, 0, 0, 7); c.fill(); }
    if (o.hood && m.body !== 'bug') { const hx = hl - (BT[m.body] ? BT[m.body].hood : .3) * L; c.fillStyle = '#15171a'; rr(c, hx + .08, -hw + .22, hl - hx - .3, Wd - .44, .08); c.fill(); c.fillStyle = '#6d7377'; rr(c, hx + .3, -.32, hl - hx - .75, .64, .06); c.fill(); c.fillStyle = '#c7772e'; c.fillRect(hx + .42, -.2, .2, .4); c.fillStyle = shade(col, -.15); rr(c, hx - .05, -hw + .2, .22, Wd - .4, .05); c.fill(); }
    if (o.hood && m.body === 'bug') { c.fillStyle = '#15171a'; rr(c, -hl + .15, -.4, .75, .8, .1); c.fill(); c.fillStyle = '#6d7377'; rr(c, -hl + .28, -.25, .45, .5, .05); c.fill(); }
  };

  // ---------- профиль сбоку для blueprint-карточки ----------
  const SIDE = {
    sedan: [[0, .55], [.02, .74], [.27, .84], [.38, 1.34], [.68, 1.36], [.8, .9], [.98, .88], [1, .6]], coupe: [[0, .5], [.02, .7], [.33, .8], [.45, 1.25], [.66, 1.25], [.85, .86], [.98, .84], [1, .58]],
    hatch: [[0, .5], [.02, .7], [.3, .8], [.42, 1.3], [.72, 1.3], [.93, .92], [1, .7]], wagon: [[0, .55], [.02, .74], [.26, .84], [.36, 1.38], [.93, 1.38], [.99, .92], [1, .6]],
    van: [[0, .6], [.02, .82], [.12, .98], [.22, 1.64], [.95, 1.66], [1, .9]], suv: [[0, .7], [.02, .97], [.25, 1.04], [.33, 1.62], [.93, 1.62], [.99, 1.06], [1, .75]],
    pickup: [[0, .7], [.02, .97], [.25, 1.04], [.33, 1.7], [.52, 1.7], [.54, 1.1], [.99, 1.1], [1, .75]], bug: [[0, .45], [.05, .72], [.2, .84], [.34, 1.32], [.5, 1.5], [.66, 1.42], [.85, .97], [.97, .72], [1, .5]],
    fin: [[0, .6], [.02, .8], [.28, .88], [.38, 1.44], [.64, 1.46], [.76, .94], [.9, .92], [.99, 1.05], [1, .62]], roadster: [[0, .45], [.02, .64], [.38, .74], [.45, 1.1], [.47, .8], [.7, .78], [.98, .76], [1, .5]],
    jeep: [[0, .75], [.02, 1.0], [.3, 1.04], [.33, 1.52], [.35, 1.04], [.95, 1.02], [1, .8]], prewar: [[0, .7], [.03, 1.07], [.32, 1.12], [.36, 1.72], [.72, 1.74], [.75, 1.12], [.9, 1.02], [1, .7]]
  };
  const NPOS = { block: [.14, .52], head: [.14, .7], gasket: [.19, .62], fuel: [.22, .76], ign: [.09, .68], cool: [.04, .58], lube: [.14, .36], exh: [.55, .24], turbo: [.23, .56], clutch: [.3, .44], gearbox: [.37, .4], drive: [.8, .3], transfer: [.46, .36],
    fsusp: [.17, .48], rsusp: [.8, .5], steer: [.25, .5], brakes: [.17, .3], start: [.07, .48], wiring: [.31, .82], lights: [.01, .62], panels: [.6, .72], frame: [.5, .19], interior: [.5, 1.0], wheels: [.8, .12] };
  R.nodeNums = {}; D.nodeIds.forEach((id, i) => R.nodeNums[id] = i + 1);
  R.drawBlueprint = function (canvas, car) {
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height, m = D.models[car.model];
    c.fillStyle = '#1E3A5F'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(207,227,247,.07)'; c.lineWidth = 1; for (let x = 0; x < w; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const sc = Math.min((w - 90) / m.L, (h - 60) / 1.9), ox = (w - m.L * sc) / 2, gy = h - 26;
    const X = f => ox + f * m.L * sc, Y = v => gy - v * sc;
    const pts = SIDE[m.body] || SIDE.sedan, wr = (/pickup|suv|jeep/.test(m.body) ? .38 : m.body === 'prewar' ? .4 : .33), wf = m.body === 'bug' ? .19 : .17, wb = m.body === 'van' ? .78 : .8;
    c.strokeStyle = 'rgba(207,227,247,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(10, gy); c.lineTo(w - 10, gy); c.stroke();
    // кузов
    c.beginPath(); c.moveTo(X(0), Y(.3));
    for (const p of pts) c.lineTo(X(p[0]), Y(p[1]));
    c.lineTo(X(1), Y(.3)); c.lineTo(X(wb) + (wr + .08) * sc, Y(.24)); c.arc(X(wb), Y(wr), (wr + .08) * sc, 0, Math.PI, true); c.lineTo(X(wf) + (wr + .08) * sc, Y(.22)); c.arc(X(wf), Y(wr), (wr + .08) * sc, 0, Math.PI, true); c.lineTo(X(0), Y(.3)); c.closePath();
    c.fillStyle = 'rgba(207,227,247,.08)'; c.fill(); c.strokeStyle = '#CFE3F7'; c.lineWidth = 2; c.stroke();
    // окна
    if (!/roadster|jeep/.test(m.body)) { const top = pts.filter(p => p[1] > 1.2); if (top.length >= 2) { const a = top[0], b = top[top.length - 1], belt = (pts.find(p => p[0] > .2) || [0, .84])[1] + .04; c.beginPath(); c.moveTo(X(a[0] - .07), Y(belt)); c.lineTo(X(a[0] + .01), Y(a[1] - .07)); c.lineTo(X(b[0] - .01), Y(b[1] - .07)); c.lineTo(X(Math.min(.97, b[0] + (m.body === 'pickup' ? 0 : .08))), Y(belt)); c.closePath(); c.fillStyle = 'rgba(207,227,247,.12)'; c.fill(); c.lineWidth = 1.2; c.stroke(); const mid = (a[0] + b[0]) / 2; c.beginPath(); c.moveTo(X(mid), Y(belt)); c.lineTo(X(mid), Y(a[1] - .07)); c.stroke(); } }
    for (const f of [wf, wb]) { c.beginPath(); c.arc(X(f), Y(wr), wr * sc, 0, 7); c.fillStyle = '#16304f'; c.fill(); c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(X(f), Y(wr), wr * sc * .5, 0, 7); c.lineWidth = 1; c.stroke(); }
    // ржавчина штриховкой: видимая истина для зон, которые игрок осмотрел
    const hatch = (x0, y0, x1, y1, R, known) => { if (!known) { c.strokeStyle = 'rgba(207,227,247,.25)'; c.setLineDash([3, 4]); c.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); c.setLineDash([]); return; } const a = U.clamp(R / 80, 0, 1); if (a < .12) return; c.save(); c.beginPath(); c.rect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); c.clip(); c.strokeStyle = 'rgba(251,140,0,' + (.25 + a * .7) + ')'; c.lineWidth = 1.5; for (let x = X(x0) - 60; x < X(x1) + 10; x += 6) { c.beginPath(); c.moveTo(x, Y(y0)); c.lineTo(x + 40, Y(y0) - 40); c.stroke(); } c.restore(); };
    const kz = z => car.rust[z].hi - car.rust[z].lo < 45, mz = z => (car.rust[z].lo + car.rust[z].hi) / 2;
    hatch(wf - .11, .3, wf + .11, .8, mz('farch'), kz('farch')); hatch(wb - .11, .3, wb + .11, .82, mz('rarch'), kz('rarch'));
    hatch(wf + .12, .2, wb - .12, .34, mz('sills'), kz('sills')); hatch(wf + .14, .36, wb - .14, .5, mz('doors'), kz('doors'));
    hatch(wf + .1, .08, wb - .1, .17, Math.max(mz('floor'), mz('frame')), kz('floor') || kz('frame'));
    // узлы: номер в кружке, цвет — известное состояние, пунктир — туман
    const rear = m.layout === 'RR', ff = m.layout === 'FF';
    c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const id in car.nodes) {
      let p = NPOS[id].slice(); const n = car.nodes[id];
      if (rear && /block|head|gasket|fuel|ign|cool|lube|turbo|start|clutch|gearbox/.test(id)) p[0] = 1 - p[0] - (id === 'gearbox' || id === 'clutch' ? .12 : 0);
      if (rear && id === 'exh') p[0] = .93; if (ff && id === 'drive') p[0] = .17, p[1] = .16;
      const x = X(p[0]), y = Y(p[1] * (m.body === 'roadster' && p[1] > .9 ? .75 : 1)), fog = n.hi - n.lo, mid = (n.lo + n.hi) / 2;
      c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = fog > 60 ? '#2b4a72' : D.condOf(mid).c; c.fill();
      c.strokeStyle = D.grades[n.grade].c; c.lineWidth = 2; if (fog > 25) c.setLineDash([3, 2]); c.stroke(); c.setLineDash([]);
      c.fillStyle = fog > 60 ? '#CFE3F7' : (mid < 20 || (mid >= 40 && mid < 85) ? '#111' : '#fff'); if (fog <= 60 && mid < 1) c.fillStyle = '#fff'; c.fillText(R.nodeNums[id], x, y + .5);
    }
    c.fillStyle = '#CFE3F7'; c.font = '11px system-ui'; c.textAlign = 'left'; c.fillText(m.make.toUpperCase() + ' ' + m.name.toUpperCase() + ' · ' + car.year + ' · ' + m.eng + ' · ' + m.layout, 12, 14);
    c.textAlign = 'right'; c.fillText('VIN ' + car.vin, w - 12, 14); c.fillText(m.L.toFixed(2) + ' м × ' + m.W.toFixed(2) + ' м', w - 12, h - 10);
  };
  R.drawThumb = function (canvas, car) {
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height, m = D.models[car.model];
    c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); const s = Math.min((w - 10) / m.L, (h - 8) / m.W); c.scale(s, s); R.drawCarTop(c, car, { flat: 1 }); c.restore();
  };

  // ---------- мир ----------
  const stains = []; { const r = U.mk(77); for (let i = 0; i < 46; i++) stains.push([r() < .55 ? 9 + r() * 17 : r() * 46, r() < .55 ? 3 + r() * 7 : 11 + r() * 15, .25 + r() * .6, r()]); }
  function wallsDraw(c, S) {
    const b3 = S.upg.bay3;
    c.lineCap = 'butt';
    const seg = (x0, y0, x1, y1) => { c.strokeStyle = '#4A4E52'; c.lineWidth = .42; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = '#62676C'; c.lineWidth = .16; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
    const hz = (y, xs) => { for (let i = 0; i < xs.length; i += 2) seg(xs[i], y, xs[i + 1], y); };
    if (b3) { hz(2.5, [3.3, 33.7]); hz(10.5, [3.3, 6, 7, 10, 13, 16, 19, 22, 25, 29, 30, 33.7]); }
    else { hz(2.5, [3.3, 20.7, 26.3, 33.7]); hz(10.5, [3.3, 6, 7, 10, 13, 16, 19, 20.7, 26.3, 29, 30, 33.7]); }
    const vt = (x, gaps) => { let y = 2.5; for (const g of gaps) { seg(x, y, x, g); y = g + 1; } seg(x, y, x, 10.5); };
    vt(3.5, []); vt(33.5, []); vt(8.5, [6]); vt(14.5, [6]); vt(20.5, b3 ? [6] : []); vt(26.5, b3 ? [7] : []);
    // ворота боксов — подняты
    c.strokeStyle = 'rgba(227,178,60,.55)'; c.lineWidth = .1; c.setLineDash([.3, .2]); for (const x of b3 ? [10, 16, 22] : [10, 16]) { c.beginPath(); c.moveTo(x, 10.5); c.lineTo(x + 3, 10.5); c.stroke(); } c.setLineDash([]);
  }
  function label(c, t, x, y, s, col, al) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.font = '600 100px system-ui'; c.textAlign = al || 'center'; c.textBaseline = 'middle'; c.fillStyle = col || 'rgba(255,255,255,.3)'; c.fillText(t, 0, 0); c.restore(); }
  function world(c, S) {
    // земля, асфальт, дорога
    c.fillStyle = '#4b5246'; c.fillRect(-30, -30, MAP.W + 60, MAP.H + 60);
    c.fillStyle = '#3E4043'; c.fillRect(0, .8, MAP.W, 25.6);
    c.fillStyle = '#2d2e31'; c.fillRect(-30, 26.4, MAP.W + 60, 3.6); c.fillStyle = '#55585c'; c.fillRect(-30, 26.2, MAP.W + 60, .22);
    c.strokeStyle = '#E8D36A'; c.lineWidth = .12; c.setLineDash([1.4, 1.2]); c.beginPath(); c.moveTo(-30, 28.9); c.lineTo(MAP.W + 30, 28.9); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#515a4b'; c.fillRect(-30, 30, MAP.W + 60, 30);
    // полы
    const b3 = S.upg.bay3;
    c.fillStyle = '#8F8A80'; c.fillRect(3.5, 2.5, 17, 8); c.fillRect(26.5, 2.5, 7, 8);
    c.fillStyle = b3 ? '#8F8A80' : '#56585a'; c.fillRect(20.5, 2.5, 6, 8);
    c.fillStyle = '#7b766d'; c.fillRect(3.5, 2.5, 5, 8); c.fillStyle = '#9a8f7c'; c.fillRect(26.5, 2.5, 7, 8);
    c.fillStyle = 'rgba(0,0,0,.05)'; for (let x = 27; x < 33; x++) for (let y = 3; y < 10; y++) if ((x + y) % 2) c.fillRect(x - .5 + .5, y - .5 + .5, 1, 1);
    for (const s of stains) { c.fillStyle = 'rgba(59,54,49,' + (.18 + s[3] * .25) + ')'; c.beginPath(); c.ellipse(s[0], s[1], s[2], s[2] * .6, s[3] * 3, 0, 7); c.fill(); }
    if (!b3) { c.strokeStyle = 'rgba(232,211,106,.35)'; c.lineWidth = .08; c.setLineDash([.4, .4]); c.strokeRect(20.8, 2.8, 5.4, 7.4); c.setLineDash([]); label(c, 'место под бокс 3', 23.5, 6.5, .55, 'rgba(232,211,106,.45)'); }
    // разметка мест
    c.strokeStyle = '#E8D36A'; c.lineWidth = .09;
    for (const s of G().slotList()) {
      if (s.kind === 'bay') continue;
      const m = s.kind === 'sale' ? '#9bd0a0' : s.kind === 'proj' ? '#c9a76a' : '#E8D36A'; c.strokeStyle = m; c.globalAlpha = .55;
      c.beginPath(); c.moveTo(s.x - 1.25, s.y - 2.9); c.lineTo(s.x - 1.25, s.y + 2.9); c.moveTo(s.x + 1.25, s.y - 2.9); c.lineTo(s.x + 1.25, s.y + 2.9); if (s.lane < s.y) { c.moveTo(s.x - 1.25, s.y + 2.9); c.lineTo(s.x + 1.25, s.y + 2.9); } else { c.moveTo(s.x - 1.25, s.y - 2.9); c.lineTo(s.x + 1.25, s.y - 2.9); } c.stroke(); c.globalAlpha = 1;
    }
    label(c, 'ДВОР · ОЧЕРЕДЬ И ГОТОВЫЕ', 40, 2.2, .62); label(c, 'ПАРКОВКА КЛИЕНТОВ', 39.8, 21.4, .62); label(c, 'ПРОЕКТЫ И ДОНОРЫ', 6.4, 12.9, .6, 'rgba(201,167,106,.6)'); label(c, 'СТОК НА ПРОДАЖУ', 6.4, 25.35, .6, 'rgba(155,208,160,.6)');
    label(c, '← ВЫЕЗД', 6, 27.4, .7, 'rgba(255,255,255,.22)'); label(c, 'ВЪЕЗД ←', 38, 27.4, .7, 'rgba(255,255,255,.22)');
    // стрелки проезда
    c.strokeStyle = 'rgba(232,211,106,.25)'; c.lineWidth = .1; c.setLineDash([.6, .6]); c.beginPath(); c.moveTo(MAP.vx, 26.2); c.lineTo(MAP.vx, MAP.lane1); c.lineTo(34.5, MAP.lane1); c.moveTo(MAP.vx, MAP.lane1); c.lineTo(8, MAP.lane1); c.moveTo(MAP.vx, MAP.lane2); c.lineTo(2.5, MAP.lane2); c.stroke(); c.setLineDash([]);
    // остров бывших колонок / бокс 4
    c.fillStyle = '#6E6A62'; rr(c, 15.5, 16.4, 8, 2.2, .5); c.fill();
    if (S.upg.bay4) lift(c, 19.5, 17.5); else { for (const x of [17.3, 21.7]) { c.fillStyle = '#b8392e'; rr(c, x - .35, 17 - .1, .7, 1.2, .1); c.fill(); c.fillStyle = '#e8e2d0'; c.fillRect(x - .22, 17.1, .44, .4); } }
    // интерьер
    for (const id of ['bay1', 'bay2'].concat(b3 ? ['bay3'] : [])) { const s = G().slot(id); lift(c, s.x, s.y); const rx = s.x; c.fillStyle = '#B8392E'; rr(c, rx + 1.55, 3.1, .85, 1.3, .08); c.fill(); c.fillStyle = '#8f2a22'; c.fillRect(rx + 1.62, 3.5, .7, .06); c.fillRect(rx + 1.62, 3.9, .7, .06); c.fillStyle = '#8A6A48'; rr(c, rx - 2.4, 3.05, 1.7, .75, .05); c.fill(); c.fillStyle = '#6b5136'; c.fillRect(rx - 2.3, 3.15, .5, .3); label(c, s.n.toUpperCase(), s.x, 9.6, .5, 'rgba(0,0,0,.28)'); }
    c.fillStyle = '#5d584f'; for (const y of [3.1, 5.3, 7.5]) { rr(c, 3.9, y, .8, 1.9, .05); c.fill(); rr(c, 7.3, y, .8, 1.9, .05); c.fill(); } c.fillStyle = '#b08d57'; for (const y of [3.3, 4, 5.5, 6.3, 7.7, 8.5]) { c.fillRect(4, y, .6, .5); c.fillRect(7.4, y + .1, .6, .45); }
    if (S.upg.shelf) { c.fillStyle = '#5d584f'; rr(c, 5.1, 3, 1.9, .7, .05); c.fill(); c.fillStyle = '#3f7fbf'; c.fillRect(5.25, 3.1, .5, .5); c.fillStyle = '#c94c3a'; c.fillRect(5.9, 3.1, .5, .5); c.fillStyle = '#d9b23c'; c.fillRect(6.5, 3.12, .4, .46); }
    if (S.upg.air) { c.fillStyle = '#2f6a9e'; rr(c, 5.2, 8.6, 1.6, .9, .4); c.fill(); c.fillStyle = '#1d4468'; c.beginPath(); c.arc(5.55, 9.05, .28, 0, 7); c.fill(); c.strokeStyle = '#d9b23c'; c.lineWidth = .06; c.beginPath(); c.moveTo(6.8, 9.05); c.lineTo(8.5, 9.05); c.lineTo(8.5, 2.9); c.lineTo(b3 ? 26 : 20, 2.9); c.stroke(); }
    if (S.upg.tester) { c.fillStyle = '#d7d2c4'; rr(c, 14.9, 8.7, .8, .9, .08); c.fill(); c.fillStyle = '#2e8b57'; c.fillRect(15, 8.8, .6, .35); }
    label(c, 'СКЛАД', 6, 9.6, .5, 'rgba(0,0,0,.28)'); label(c, 'ОФИС', 30, 9.6, .5, 'rgba(0,0,0,.25)');
    c.fillStyle = '#6b4a2e'; rr(c, 28.6, 5.1, 3.6, .8, .08); c.fill(); c.fillStyle = '#d8d2c2'; c.fillRect(29, 5.25, .5, .4); c.fillStyle = '#2a2c30'; c.fillRect(31.2, 5.2, .6, .45);
    c.fillStyle = '#57534c'; for (const ch of MAP.spots.chairs) { rr(c, ch[0] - .1, ch[1] - .35, .7, .7, .12); c.fill(); }
    if (S.upg.waiting) { c.fillStyle = '#3a3d42'; rr(c, 32.2, 6.1, .7, .7, .08); c.fill(); c.fillStyle = '#7fd0ff'; c.fillRect(32.3, 6.2, .5, .35); c.fillStyle = '#d7d2c4'; c.beginPath(); c.arc(31.6, 9.3, .22, 0, 7); c.fill(); }
    c.fillStyle = S.upg.rest ? '#7a4b3a' : '#57534c'; rr(c, 27, 3, S.upg.rest ? 2.4 : .8, .8, .15); c.fill(); if (S.upg.rest) { c.fillStyle = '#e8e2d0'; rr(c, 27, 4.2, .7, .9, .06); c.fill(); }
    wallsDraw(c, S);
    // вывеска, забор, навес, прицеп
    c.fillStyle = '#2b2d30'; c.fillRect(33.9, 22.6, .25, 3.4); c.fillStyle = S.upg.sign ? '#c0392b' : '#6b3a34'; rr(c, 32.7, 21.6, 2.7, 1.2, .15); c.fill(); label(c, S.upg.sign ? 'POPS AUTO' : 'pops', 34.05, 22.2, S.upg.sign ? .42 : .4, S.upg.sign ? '#ffe9a8' : 'rgba(255,255,255,.4)');
    if (S.upg.alarm) { c.strokeStyle = '#8a8d90'; c.lineWidth = .08; c.setLineDash([.25, .25]); c.strokeRect(.5, 1.2, MAP.W - 1, 24.9); c.setLineDash([]); c.fillStyle = '#3E4043'; c.fillRect(MAP.vx - 2, 25.9, 4, .5); }
    if (S.upg.trailer) { c.fillStyle = '#2a2c30'; rr(c, 26.4, 20.6, 2.3, 5, .1); c.fill(); c.fillStyle = '#55585c'; rr(c, 26.6, 20.8, 1.9, 4.6, .05); c.fill(); c.fillStyle = '#17181a'; c.fillRect(26.2, 23.6, .25, .9); c.fillRect(28.65, 23.6, .25, .9); c.fillRect(27.45, 19.8, .2, .9); }
  }
  function lift(c, x, y) { c.fillStyle = '#6E6A62'; rr(c, x - 1.55, y - 2.3, 3.1, 4.6, .1); c.fill(); c.fillStyle = '#E3B23C'; for (const sx of [-1, 1]) { rr(c, x + sx * 1.42 - .16, y - .32, .32, .64, .05); c.fill(); c.fillRect(x + sx * 1.42 - (sx > 0 ? 1.0 : -.04), y - 1.05, .96, .1); c.fillRect(x + sx * 1.42 - (sx > 0 ? 1.0 : -.04), y + .95, .96, .1); } }
  const G = () => WW.G;
  const skins = ['#f1c9a5', '#e5b48b', '#d9a577', '#c68c5f', '#a8703f', '#8a5a34', '#6f4526', '#f6d5b8'], hairs = ['#2b1d12', '#4a3320', '#8a6a3a', '#c9a45a', '#1c1c1c', '#7a2a1a', '#9a9a9a', '#5b4028', '#d8d2c2', '#3a2a22'], hats = ['#b8392e', '#2f5d9e', '#2e2e2e', '#3f7a4a', '#d9b23c', '#7a4b9a'];
  function person(c, x, y, dir, col, look, st) {
    c.save(); c.translate(x, y); const bob = st.walk ? Math.sin(T * 13 + x * 3) * .04 : 0;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(.06, .08, .34, .28, 0, 0, 7); c.fill();
    c.rotate((dir || 0) + Math.PI / 2);
    const arm = st.work ? Math.sin(T * 18) * .1 : st.walk ? Math.sin(T * 13) * .12 : 0;
    c.fillStyle = shade(col, -.2); c.beginPath(); c.arc(-.3, -.05 - arm - (st.work ? .22 : 0), .11, 0, 7); c.arc(.3, -.05 + arm - (st.work ? .22 : 0), .11, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, bob, .34, .24, 0, 0, 7); c.fill(); c.strokeStyle = shade(col, -.35); c.lineWidth = .04; c.stroke();
    if (st.carry) { c.fillStyle = '#b08d57'; c.fillRect(-.2, -.48, .4, .3); }
    c.fillStyle = skins[look.skin || 0]; c.beginPath(); c.arc(0, bob, .17, 0, 7); c.fill();
    if (look.hat != null && look.hat < 4 && !look.f) { c.fillStyle = hats[look.hat]; c.beginPath(); c.arc(0, bob, .175, 0, 7); c.fill(); c.fillRect(-.14, bob - .3, .28, .16); }
    else { c.fillStyle = hairs[look.hair || 0]; c.beginPath(); c.arc(0, bob + .04, .165, 0, Math.PI); c.fill(); if (look.f) { c.beginPath(); c.arc(0, bob + .12, .12, 0, 7); c.fill(); } }
    c.restore();
  }
  function bubble(c, x, y, txt, bg) { c.save(); c.translate(x, y); const s = Math.max(.5, 14 / cam.z); c.scale(s, s); c.font = '600 .62px system-ui'; const w = c.measureText(txt).width + .5; c.fillStyle = bg || 'rgba(20,22,26,.86)'; rr(c, -w / 2, -.45, w, .9, .3); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, .03); c.restore(); }
  const stageCol = { intake: '#c77f2a', diag: '#3b82f6', approval: '#8a6fb0', parts: '#7a7f85', work: '#E3B23C', qc: '#2e9a8a', ready: '#4CAF50' };

  R.spawn = function (o) { if (fx.length < 400) fx.push(o); };
  R.frame = function (dtReal, speed) {
    const S = WW.S; if (!S || !ctx) return; T += dtReal * (speed ? 1 : .15);
    const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#4b5246'; c.fillRect(0, 0, W, H);
    c.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (W / 2 - cam.x * cam.z), dpr * (H / 2 - cam.y * cam.z));
    world(c, S);
    // лужи и машины
    const cars = Object.values(S.cars).filter(x => (x.slot || x.mv) && !x.away).sort((a, b) => a.y - b.y);
    for (const car of cars) { const f = car.faults.find(f => D.sym[f.sym].puddle); if (f && !car.mv && car.owner !== 'seller') { c.fillStyle = 'rgba(40,28,18,.5)'; c.beginPath(); c.ellipse(car.x + .3, car.y - .9, .5, .32, 0, 0, 7); c.fill(); } }
    for (const car of cars) {
      const o = car.order && S.orders[car.order], busyP = o && o.busy != null, lifted = !car.mv && car.slot && car.slot.startsWith('bay') && (car.work || (o && o.busy != null && o.stage === 'diag'));
      car.lift = U.lerp(car.lift || 0, lifted ? 1 : 0, .12);
      c.save(); c.translate(car.x, car.y); let sh = 0; if (car.faults.some(f => D.sym[f.sym].shake) && (car.mv || car.work)) sh = Math.sin(T * 40) * .015; c.rotate(car.ang + sh); const k = 1 + car.lift * .07; c.scale(k, k);
      R.drawCarTop(c, car, { lift: car.lift > .5, hood: car.hood && !car.mv }); c.restore();
      if (R.sel === 'c' + car.id || R.hover === 'c' + car.id) { c.strokeStyle = R.sel === 'c' + car.id ? '#E3B23C' : 'rgba(255,255,255,.6)'; c.lineWidth = 2 / cam.z; c.beginPath(); c.arc(car.x, car.y, 3, 0, 7); c.stroke(); }
      if (car.mv) {
        const sm = car.faults.find(f => D.sym[f.sym].smoke); if (Math.random() < (sm ? .5 : .12)) R.spawn({ t: 'smoke', x: car.x - Math.cos(car.ang) * 2.4, y: car.y - Math.sin(car.ang) * 2.4, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, life: 1.6, col: sm ? D.sym[sm.sym].smoke : '#9a9a9a', r: sm ? .35 : .18 });
      } else if (car.faults.some(f => D.sym[f.sym].steam) && o && Math.random() < .06) R.spawn({ t: 'smoke', x: car.x, y: car.y - 1.8, vx: (Math.random() - .5) * .3, vy: -.5, life: 1.4, col: '#f2f2f2', r: .25 });
    }
    // навесы поверх машин
    c.fillStyle = 'rgba(232,226,208,.16)'; c.strokeStyle = 'rgba(232,226,208,.5)'; c.lineWidth = .1; rr(c, 14.2, 14.6, 10.6, 5.8, .3); c.fill(); c.stroke(); c.fillStyle = '#d8d2c2'; for (const p of [[14.6, 15], [24.4, 15], [14.6, 20], [24.4, 20]]) { c.beginPath(); c.arc(p[0], p[1], .16, 0, 7); c.fill(); }
    if (S.upg.canopy) { const n = S.upg.lot2 ? 4 : 3, x1 = 2.1 + n * 2.8; c.fillStyle = 'rgba(80,120,90,.2)'; c.strokeStyle = 'rgba(155,208,160,.6)'; rr(c, 2.1, 19.4, x1 - 2.1, 5.7, .2); c.fill(); c.stroke(); c.strokeStyle = 'rgba(155,208,160,.2)'; for (let x = 2.8; x < x1; x += .7) { c.beginPath(); c.moveTo(x, 19.4); c.lineTo(x, 25.1); c.stroke(); } }
    // люди
    for (const v of S.visitors) person(c, v.x, v.y, v.dir, v.col || '#888', { skin: v.id % 8, hair: v.id % 10, f: v.f, hat: 9 }, { walk: !!v.pts });
    for (const p of S.pawns) {
      if (p.state !== 'work' || p.arriveAt) continue; const t = p.task, working = t && t.ph === 'do' && !p.path;
      person(c, p.x, p.y, working && t.o && S.orders[t.o] && S.cars[S.orders[t.o].car] && t.type !== 'desk' ? Math.atan2(S.cars[S.orders[t.o].car].y - p.y, S.cars[S.orders[t.o].car].x - p.x) : (working && t.type === 'desk' ? Math.PI / 2 : p.dir), D.roles[p.role].col, p.look, { walk: !!p.path, work: working && t.type !== 'lunch', carry: p.carry });
      if (R.sel === 'p' + p.id || R.hover === 'p' + p.id) { c.strokeStyle = R.sel === 'p' + p.id ? '#E3B23C' : 'rgba(255,255,255,.7)'; c.lineWidth = 2 / cam.z; c.beginPath(); c.arc(p.x, p.y, .55, 0, 7); c.stroke(); }
      const ic = !t ? null : t.type === 'lunch' ? '☕' : t.type === 'desk' ? '☎' : t.type === 'test' || t.type === 'qc' ? '🔍' : t.type === 'job' ? (p.carry || t.ph === 'store' || t.ph === 'pick' ? '📦' : '🔧') : null;
      if (ic && cam.z > 13) { c.save(); c.translate(p.x, p.y - .62); const s = Math.max(.42, 11 / cam.z); c.scale(s, s); c.font = '.7px system-ui'; c.textAlign = 'center'; c.fillText(ic, 0, 0); c.restore(); }
      if (cam.z > 20 || R.hover === 'p' + p.id) { c.save(); c.translate(p.x, p.y + .62); const s = Math.max(.4, 11 / cam.z); c.scale(s, s); c.font = '600 .5px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(p.name.split(' ')[0], .03, .03); c.fillStyle = '#fff'; c.fillText(p.name.split(' ')[0], 0, 0); c.restore(); }
    }
    // статус нарядов над машинами
    for (const car of cars) {
      const o = car.order && S.orders[car.order]; if (car.mv) continue;
      if (o) {
        let txt = '№' + o.id + ' ' + WW.O.stageName(o.stage), prog = null; const j = o.jobs.find(x => x.status === 'doing');
        if (j && j.left != null && j.tot) prog = 1 - j.left / j.tot; if (o.stage === 'diag' && o.decide) txt = '№' + o.id + ' ❓ смета'; if (o.stage === 'ready') txt = '№' + o.id + ' ✔ готово'; if (o.type === 'own') txt = '🔧 проект';
        bubble(c, car.x, car.y - 3.05, txt, o.type === 'own' ? 'rgba(90,70,40,.9)' : stageCol[o.stage]);
        if (prog != null) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(car.x - 1, car.y + 2.75, 2, .22); c.fillStyle = '#E3B23C'; c.fillRect(car.x - 1, car.y + 2.75, 2 * U.clamp(prog, 0, 1), .22); }
      } else if (car.sale) bubble(c, car.x, car.y - 3.05, U.money(car.sale.ask), 'rgba(46,125,50,.92)');
    }
    // эффекты
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.age = (f.age || 0) + dtReal; if (f.age > f.life) { fx.splice(i, 1); continue; } const a = 1 - f.age / f.life; f.x += (f.vx || 0) * dtReal; f.y += (f.vy || 0) * dtReal;
      if (f.t === 'spark') { f.vy += 4 * dtReal; c.fillStyle = 'rgba(255,' + (190 + Math.random() * 60 | 0) + ',90,' + a + ')'; c.fillRect(f.x, f.y, .07, .07); }
      else if (f.t === 'flash') { c.fillStyle = 'rgba(160,200,255,' + a * .35 + ')'; c.beginPath(); c.arc(f.x, f.y, 1.2, 0, 7); c.fill(); }
      else if (f.t === 'smoke') { c.globalAlpha = a * .5; c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, f.r * (1 + f.age * 1.5), 0, 7); c.fill(); c.globalAlpha = 1; }
      else if (f.t === 'text') { c.save(); c.translate(f.x, f.y); const s = Math.max(.7, 18 / cam.z); c.scale(s, s); c.font = '800 .7px system-ui'; c.textAlign = 'center'; c.lineWidth = .12; c.strokeStyle = 'rgba(0,0,0,' + a + ')'; c.strokeText(f.text, 0, 0); c.fillStyle = f.col.replace('A', a); c.fillText(f.text, 0, 0); c.restore(); }
      else if (f.t === 'stamp') { c.save(); c.translate(f.x, f.y); c.rotate(-.2); const s = Math.max(.8, 20 / cam.z) * (1 + Math.max(0, .25 - f.age) * 3); c.scale(s, s); c.globalAlpha = Math.min(1, a * 2); c.strokeStyle = '#d63a2f'; c.lineWidth = .08; rr(c, -1.5, -.42, 3, .84, .1); c.stroke(); c.font = '800 .52px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#d63a2f'; c.fillText('ОПЛАЧЕНО', 0, .03); c.restore(); c.globalAlpha = 1; }
    }
    // свет суток и погода
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = S.min; let tint = null;
    if (m < 480) tint = 'rgba(255,170,90,' + (.16 * (480 - m) / 60) + ')'; else if (m > 1020) tint = 'rgba(30,40,90,' + Math.min(.42, (m - 1020) / 120 * .42) + ')';
    if (S.weather === 'cloud' || S.weather === 'rain') { c.fillStyle = 'rgba(60,70,85,.14)'; c.fillRect(0, 0, W, H); } if (S.weather === 'snow' || S.weather === 'blizzard') { c.fillStyle = 'rgba(235,240,250,' + (S.weather === 'blizzard' ? .22 : .1) + ')'; c.fillRect(0, 0, W, H); } if (S.weather === 'heat') { c.fillStyle = 'rgba(255,190,90,.07)'; c.fillRect(0, 0, W, H); }
    if (tint) { c.fillStyle = tint; c.fillRect(0, 0, W, H); }
    if (m > 1020) { c.globalCompositeOperation = 'lighter'; const a = Math.min(.32, (m - 1020) / 120 * .32); for (const p of [[11.5, 6.5], [17.5, 6.5], [30, 6], [6, 6], [19.5, 17.5], [34, 22.5], [38, 12], [8, 21]]) { const s = R.toScreen(p[0], p[1]), g = c.createRadialGradient(s[0], s[1], 0, s[0], s[1], cam.z * 5.5); g.addColorStop(0, 'rgba(255,180,107,' + a + ')'); g.addColorStop(1, 'rgba(255,180,107,0)'); c.fillStyle = g; c.fillRect(s[0] - cam.z * 6, s[1] - cam.z * 6, cam.z * 12, cam.z * 12); } c.globalCompositeOperation = 'source-over'; }
    if (S.weather === 'rain') { c.strokeStyle = 'rgba(190,210,235,.35)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 90; i++) { const x = (i * 97 + T * 240) % (W + 60) - 30, y = (i * 53 + T * 900) % (H + 40) - 20; c.moveTo(x, y); c.lineTo(x - 4, y + 14); } c.stroke(); }
    if (S.weather === 'snow' || S.weather === 'blizzard') { c.fillStyle = 'rgba(255,255,255,.8)'; const n = S.weather === 'blizzard' ? 220 : 90; for (let i = 0; i < n; i++) { const x = (i * 131 + T * (S.weather === 'blizzard' ? 160 : 25) + Math.sin(T + i) * 20) % (W + 20), y = (i * 71 + T * 60) % (H + 20); c.fillRect(x, y, 2, 2); } }
  };

  // что под курсором
  R.pick = function (px, py) {
    const S = WW.S, w = R.toWorld(px, py);
    for (const p of S.pawns) if (p.state === 'work' && !p.arriveAt && U.dist(p.x, p.y, w[0], w[1]) < .6) return { t: 'p', id: p.id, o: p };
    for (const id in S.cars) { const car = S.cars[id]; if (!(car.slot || car.mv) || car.away) continue; const dx = w[0] - car.x, dy = w[1] - car.y, ca = Math.cos(-car.ang), sa = Math.sin(-car.ang), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca, m = D.models[car.model]; if (Math.abs(lx) < m.L / 2 + .1 && Math.abs(ly) < m.W / 2 + .1) return { t: 'c', id: car.id, o: car }; }
    for (const v of S.visitors) if (U.dist(v.x, v.y, w[0], w[1]) < .6) return { t: 'v', id: v.id, o: v };
    return null;
  };

  WW.on('fx', function (e) {
    const weld = e.sk === 'body';
    for (let i = 0; i < (weld ? 7 : 2); i++) R.spawn({ t: 'spark', x: e.x + (Math.random() - .5) * 2, y: e.y + (Math.random() - .5) * 3, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2.5, life: .35 + Math.random() * .4 });
    if (weld && Math.random() < .5) R.spawn({ t: 'flash', x: e.x, y: e.y, life: .15 });
    if (Math.random() < .35) WW.emit('sound', weld ? 'weld' : 'ratchet');
  });
  WW.on('paid', function (e) { if (e.x == null) return; R.spawn({ t: 'text', x: e.x, y: e.y - 1, vy: -.9, life: 2.4, text: '+' + U.money(e.total), col: 'rgba(140,230,120,A)' }); if (e.stars) R.spawn({ t: 'stamp', x: e.x, y: e.y, life: 2.2 }); });
})(globalThis.WW);
