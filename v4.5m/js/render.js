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
  const minZoom = () => Math.max(2, Math.min(8, W / (MAP.W + 1), H / (MAP.H + .5)));
  R.fit = function () { cam.z = U.clamp(Math.min(W / (MAP.W + 1), H / (MAP.H + .5)), minZoom(), 64); cam.x = MAP.W / 2; cam.y = MAP.H / 2 + .3; };
  R.toWorld = (px, py) => [(px - W / 2) / cam.z + cam.x, (py - H / 2) / cam.z + cam.y];
  R.toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  R.zoom = function (f, px, py) { const a = R.toWorld(px, py); cam.z = U.clamp(cam.z * f, minZoom(), 64); const b = R.toWorld(px, py); cam.x += a[0] - b[0]; cam.y += a[1] - b[1]; clampCam(); };
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
  R.SIDE = SIDE;
  const NPOS = { block: [.14, .52], head: [.14, .7], gasket: [.19, .62], fuel: [.22, .76], ign: [.09, .68], cool: [.04, .58], lube: [.14, .36], exh: [.55, .24], turbo: [.23, .56], clutch: [.3, .44], gearbox: [.37, .4], drive: [.8, .3], transfer: [.46, .36],
    fsusp: [.17, .48], rsusp: [.8, .5], steer: [.25, .5], brakes: [.21, .3], pads: [.13, .26], discs: [.17, .22], intake: [.2, .82], hl_fl: [.01, .7], hl_fr: [.03, .62], tl_rl: [.99, .76], tl_rr: [.97, .68], start: [.07, .48], wiring: [.31, .82], lights: [.01, .62], panels: [.6, .72], frame: [.5, .19], interior: [.5, 1.0], wheels: [.8, .12] };
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
    const rear = m.layout === 'RR' || m.layout === 'MR', ff = m.layout === 'FF';
    c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const id in car.nodes) {
      let p = NPOS[id].slice(); const n = car.nodes[id];
      if (rear && /block|head|gasket|fuel|ign|cool|lube|turbo|start|clutch|gearbox/.test(id)) p[0] = 1 - p[0] - (id === 'gearbox' || id === 'clutch' ? .12 : 0);
      if (rear && id === 'exh') p[0] = .93; if (ff && id === 'drive') p[0] = .17, p[1] = .16;
      const x = X(p[0]), y = Y(p[1] * (m.body === 'roadster' && p[1] > .9 ? .75 : 1)), fog = n.hi - n.lo, mid = (n.lo + n.hi) / 2;
      if (n.gone) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = '#16304f'; c.fill(); c.strokeStyle = 'rgba(207,227,247,.5)'; c.lineWidth = 1.5; c.setLineDash([2, 3]); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(207,227,247,.5)'; c.fillText('×', x, y + .5); continue; }
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

  // ---------- мир: рисуется из S.map, всё по сетке ----------
  const NN = () => WW.N;
  R.build = null;   // {t, r, x, y} — призрак режима стройки; t: тип объекта, 'demolish', 'zone:<тип>' или 'zone:'
  R.overlay = null; // 'zones' | 'roads' | 'dirt'
  function label(c, t, x, y, s, col, al) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.font = '600 100px system-ui'; c.textAlign = al || 'center'; c.textBaseline = 'middle'; c.fillStyle = col || 'rgba(255,255,255,.3)'; c.fillText(t, 0, 0); c.restore(); }
  function lift(c) { c.fillStyle = '#6E6A62'; rr(c, -1.3, -2.2, 2.6, 4.4, .1); c.fill(); c.fillStyle = '#E3B23C'; for (const sx of [-1, 1]) { rr(c, sx * 1.2 - .14, -.32, .28, .64, .05); c.fill(); c.fillRect(sx * 1.2 - (sx > 0 ? .9 : -.04), -1.05, .86, .1); c.fillRect(sx * 1.2 - (sx > 0 ? .9 : -.04), .95, .86, .1); } }
  const slotCol = { park: '#E8D36A', yard: '#cfd3d6', proj: '#c9a76a', sale: '#9bd0a0', bay: '#E3B23C' }, slotTxt = { park: 'КЛИЕНТ', yard: 'ДВОР', proj: 'ПРОЕКТ', sale: 'ПРОДАЖА' };
  const benchCol = { eng: '#8a3d2f', trans: '#5d4a8a', chassis: '#3d6f8a', elec: '#b58a1f', body: '#6f7479' }, benchTxt = { eng: 'МОТОР', trans: 'КПП', chassis: 'ХОД', elec: 'ЭЛ', body: 'КУЗОВ' };
  const DEC = {
    shelf(c) { c.fillStyle = '#5d584f'; rr(c, -.42, -.95, .84, 1.9, .05); c.fill(); c.fillStyle = '#b08d57'; c.fillRect(-.3, -.8, .6, .5); c.fillRect(-.3, -.15, .6, .45); c.fillStyle = '#8a6a48'; c.fillRect(-.3, .42, .6, .4); },
    toolbox(c) { c.fillStyle = '#B8392E'; rr(c, -.42, -.42, .84, .84, .08); c.fill(); c.fillStyle = '#8f2a22'; c.fillRect(-.35, -.15, .7, .06); c.fillRect(-.35, .12, .7, .06); },
    desk(c) { c.fillStyle = '#6b4a2e'; rr(c, -1.45, -.4, 2.9, .8, .08); c.fill(); c.fillStyle = '#d8d2c2'; c.fillRect(-1.1, -.22, .5, .4); c.fillStyle = '#2a2c30'; c.fillRect(.7, -.25, .6, .45); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(.2, 0, .12, 0, 7); c.fill(); },
    chairs(c) { c.fillStyle = '#57534c'; for (const y of [-.95, 0, .95]) { rr(c, -.35, y - .35, .7, .7, .12); c.fill(); } c.fillStyle = '#7fd0ff'; c.fillRect(.22, -1.4, .2, .4); },
    sofa(c) { c.fillStyle = '#7a4b3a'; rr(c, -.95, -.42, 1.9, .84, .18); c.fill(); c.fillStyle = '#946050'; rr(c, -.8, -.2, 1.6, .5, .12); c.fill(); },
    vending(c) { c.fillStyle = '#b3261e'; rr(c, -.4, -.42, .8, .84, .06); c.fill(); c.fillStyle = '#f2f2f2'; c.fillRect(-.28, -.3, .56, .3); c.fillStyle = '#17181a'; c.fillRect(-.2, .12, .4, .16); },
    lamp(c) { c.fillStyle = '#2b2d30'; c.beginPath(); c.arc(0, 0, .14, 0, 7); c.fill(); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(0, 0, .08, 0, 7); c.fill(); c.strokeStyle = 'rgba(43,45,48,.8)'; c.lineWidth = .05; c.beginPath(); c.moveTo(0, 0); c.lineTo(.3, .3); c.stroke(); },
    billboard(c, o, S) { c.fillStyle = '#2b2d30'; c.fillRect(-1.3, -.1, .14, .5); c.fillRect(1.16, -.1, .14, .5); c.fillStyle = S.upg.sign ? '#c0392b' : '#7a3f38'; rr(c, -1.45, -.45, 2.9, .7, .1); c.fill(); label(c, 'POPS AUTO', 0, -.1, .34, S.upg.sign ? '#ffe9a8' : 'rgba(255,255,255,.55)'); },
    pump(c) { c.fillStyle = '#6E6A62'; rr(c, -.48, -.98, .96, 1.96, .25); c.fill(); c.fillStyle = '#b8392e'; rr(c, -.3, -.6, .6, 1.2, .1); c.fill(); c.fillStyle = '#e8e2d0'; c.fillRect(-.2, -.45, .4, .36); c.fillStyle = '#17181a'; c.fillRect(-.06, .1, .12, .35); },
    plant(c) { c.fillStyle = '#8a6a48'; c.beginPath(); c.arc(0, 0, .3, 0, 7); c.fill(); c.fillStyle = '#3f7a4a'; c.beginPath(); c.arc(0, 0, .24, 0, 7); c.fill(); c.fillStyle = '#56995f'; c.beginPath(); c.arc(-.06, -.06, .12, 0, 7); c.fill(); },
    tree(c) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.arc(.15, .15, .95, 0, 7); c.fill(); c.fillStyle = '#35603c'; c.beginPath(); c.arc(0, 0, .95, 0, 7); c.fill(); c.fillStyle = '#427a4a'; c.beginPath(); c.arc(-.2, -.2, .6, 0, 7); c.fill(); c.fillStyle = '#4f8f57'; c.beginPath(); c.arc(.25, -.05, .32, 0, 7); c.fill(); },
    bench(c) { c.fillStyle = '#7a5a3a'; rr(c, -.9, -.25, 1.8, .5, .06); c.fill(); c.strokeStyle = '#5b4028'; c.lineWidth = .04; c.beginPath(); c.moveTo(-.9, 0); c.lineTo(.9, 0); c.stroke(); },
    flags(c) { c.strokeStyle = '#d8d2c2'; c.lineWidth = .04; c.beginPath(); c.moveTo(-1.45, 0); c.lineTo(1.45, 0); c.stroke(); const cols = ['#c0392b', '#E3B23C', '#3B82F6', '#f2f2f2', '#4CAF50', '#c0392b', '#E3B23C']; for (let i = 0; i < 7; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(-1.35 + i * .43, 0); c.lineTo(-1.1 + i * .43, 0); c.lineTo(-1.22 + i * .43, .32 + Math.sin(T * 3 + i) * .04); c.fill(); } },
    tires(c) { for (const p of [[-.15, -.12], [.14, .1], [-.02, .02]]) { c.fillStyle = '#17181a'; c.beginPath(); c.arc(p[0], p[1], .3, 0, 7); c.fill(); c.fillStyle = '#3a3d42'; c.beginPath(); c.arc(p[0], p[1], .13, 0, 7); c.fill(); } },
    barrel(c) { c.fillStyle = '#2f5d9e'; c.beginPath(); c.arc(0, 0, .36, 0, 7); c.fill(); c.strokeStyle = '#1d3e6b'; c.lineWidth = .06; c.beginPath(); c.arc(0, 0, .24, 0, 7); c.stroke(); c.fillStyle = '#17181a'; c.beginPath(); c.arc(.12, -.1, .06, 0, 7); c.fill(); },
    oldcar(c) { c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -.85, -1.85, 1.9, 3.9, .3); c.fill(); c.fillStyle = '#7a4a2a'; rr(c, -.9, -1.9, 1.8, 3.8, .3); c.fill(); c.fillStyle = '#5b3a22'; rr(c, -.7, -.9, 1.4, 1.6, .2); c.fill(); c.fillStyle = '#a0522d'; for (const p of [[-.5, -1.5], [.3, 1.2], [.5, -1.2], [-.4, 1.4]]) { c.beginPath(); c.arc(p[0], p[1], .22, 0, 7); c.fill(); } c.fillStyle = '#8a8d90'; for (const p of [[-.95, -1.3], [.75, -1.3], [-.95, 1.1], [.75, 1.1]]) c.fillRect(p[0], p[1], .2, .3); }
  };
  function drawBin(c, o, S, d) {
    const s = N2().size(o.t, 0), w = s[0], h = s[1], wd = D.waste[d.bin], lv = S.waste ? Math.min(1.2, (S.waste[d.bin] || 0) / Math.max(1, WW.X.cap(d.bin))) : 0;
    if (wd.fluid) { c.fillStyle = '#3b3f43'; c.beginPath(); c.arc(-w / 2 + .5, 0, .44, 0, 7); c.fill(); c.fillStyle = wd.col; c.beginPath(); c.arc(-w / 2 + .5, 0, .36 * Math.sqrt(Math.max(.05, lv)), 0, 7); c.fill(); if (d.stove) { c.fillStyle = '#2b2d30'; rr(c, .05, -.4, .85, .8, .1); c.fill(); c.fillStyle = Math.sin(T * 6) > 0 ? '#ff8a3d' : '#d9662b'; c.beginPath(); c.arc(.48, 0, .16, 0, 7); c.fill(); } }
    else { c.fillStyle = d.bin === 'gen' ? '#3f5a3f' : d.bin === 'metal' ? '#5d6166' : d.bin === 'rubber' ? '#2b2d30' : '#8a6a48'; rr(c, -w / 2 + .06, -h / 2 + .06, w - .12, h - .12, .08); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -w / 2 + .14, -h / 2 + .14, w - .28, h - .28, .05); c.fill(); c.fillStyle = lv > 1 ? '#E53935' : wd.col; c.globalAlpha = .9; const f = Math.min(1, lv); c.fillRect(-w / 2 + .16, h / 2 - .16 - (h - .32) * f, w - .32, (h - .32) * f); c.globalAlpha = 1; }
    if (cam.z > 18) label(c, wd.i, 0, 0, .45, '#fff');
  }
  const N2 = () => WW.N;
  function drawObj(c, o, S, ghost) {
    const d = D.build[o.t], r = o.r || 0;
    c.save(); c.translate(o.x, o.y); if (r % 2) c.rotate(Math.PI / 2);
    if (d.slot) {
      if (o.t === 'lift') lift(c);
      c.strokeStyle = slotCol[d.slot]; c.globalAlpha = ghost ? .95 : (o.t === 'lift' ? .4 : .7); c.lineWidth = .1;
      c.strokeRect(-1.42, -2.42, 2.84, 4.84);
      c.globalAlpha = 1;
      if (slotTxt[d.slot] && cam.z > 14) { c.rotate(r % 2 ? 0 : -Math.PI / 2); label(c, slotTxt[d.slot], 0, 0, .48, 'rgba(255,255,255,.13)'); }
      c.restore(); return;
    }
    if (d.bench) { const w = 2, h = 1; c.fillStyle = '#4b4f54'; rr(c, -w / 2 + .05, -h / 2 + .08, w - .1, h - .16, .06); c.fill(); c.fillStyle = benchCol[d.bench]; rr(c, -w / 2 + .15, -h / 2 + .18, w - .3, h - .36, .05); c.fill(); c.fillStyle = '#c9ccd0'; c.beginPath(); c.arc(-w / 2 + .45, 0, .16, 0, 7); c.fill(); c.fillRect(.1, -.12, .55, .24); if (cam.z > 16) { if (r % 2) c.rotate(-Math.PI / 2); label(c, benchTxt[d.bench], r % 2 ? .0 : .1, r % 2 ? .35 : 0, .26, 'rgba(255,255,255,.8)'); } }
    else if (d.bin) drawBin(c, o, S, d);
    else if (DEC[o.t]) DEC[o.t](c, o, S);
    else { const s2 = WW.N.size(o.t, 0); c.fillStyle = '#4b4f54'; rr(c, -s2[0] / 2 + .06, -s2[1] / 2 + .06, s2[0] - .12, s2[1] - .12, .08); c.fill(); if (cam.z > 14) label(c, d.i || '▪', 0, 0, .5, '#fff'); }
    c.restore();
  }
  function world(c, S) {
    const m = S.map, Wd = MAP.W, Nn = NN(), L = m.lot, ST = Nn.STREET;
    c.fillStyle = '#46513f'; c.fillRect(-40, -40, Wd + 80, MAP.H + 80);
    // участок: утрамбованный грунт
    c.fillStyle = '#6a6455'; c.fillRect(L[0], L[1], L[2] - L[0], L[3] - L[1]);
    c.fillStyle = 'rgba(0,0,0,.05)'; for (let y = L[1]; y < L[3]; y++) for (let x = L[0] + (y % 2); x < L[2]; x += 2) c.fillRect(x, y, 1, 1);
    // улица
    c.fillStyle = '#2d2e31'; c.fillRect(-40, ST, Wd + 80, 4); c.fillStyle = '#8b8d86'; c.fillRect(-40, ST - .18, Wd + 80, .18);
    c.strokeStyle = '#E8D36A'; c.lineWidth = .12; c.setLineDash([1.4, 1.2]); c.beginPath(); c.moveTo(-40, ST + 2); c.lineTo(Wd + 40, ST + 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#4f5a48'; c.fillRect(-40, ST + 4, Wd + 80, 40);
    if (R.drawNeighbors) R.drawNeighbors(c, S);
    // пол под крышей
    for (const k in m.roof) { const i = +k, x = i % Wd, y = Math.floor(i / Wd); c.fillStyle = (x + y) % 2 ? '#8F8A80' : '#8a857b'; c.fillRect(x - .01, y - .01, 1.02, 1.02); }
    // асфальт
    c.fillStyle = '#3E4043'; for (const k in m.road) { const i = +k; c.fillRect(i % Wd - .01, Math.floor(i / Wd) - .01, 1.02, 1.02); }
    for (const o of m.objs) if (D.build[o.t].slot) { const q = Nn.rect(o); c.fillStyle = '#44474a'; c.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); }
    c.strokeStyle = 'rgba(232,211,106,.22)'; c.lineWidth = .06; c.beginPath();
    for (const k in m.road) { const i = +k, x = i % Wd, y = Math.floor(i / Wd); if (!Nn.isRoad(x, y - 1)) { c.moveTo(x, y + .04); c.lineTo(x + 1, y + .04); } if (!Nn.isRoad(x, y + 1)) { c.moveTo(x, y + .96); c.lineTo(x + 1, y + .96); } if (!Nn.isRoad(x - 1, y)) { c.moveTo(x + .04, y); c.lineTo(x + .04, y + 1); } if (!Nn.isRoad(x + 1, y)) { c.moveTo(x + .96, y); c.lineTo(x + .96, y + 1); } }
    c.stroke();
    // грязь и масло
    for (const k in m.dirt) { const i = +k, v = m.dirt[k], x = i % Wd, y = Math.floor(i / Wd); c.fillStyle = 'rgba(42,34,26,' + Math.min(.6, v * .6) + ')'; c.beginPath(); c.ellipse(x + .5, y + .5, .3 + v * .35, .22 + v * .25, (i % 7), 0, 7); c.fill(); }
    for (const sp of S.spills || []) { c.globalAlpha = .55 * (1 - sp.age / 7); c.fillStyle = sp.col; c.beginPath(); c.ellipse(sp.x, sp.y, sp.r, sp.r * .7, sp.x, 0, 7); c.fill(); c.globalAlpha = 1; }
    // граница участка
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .06; c.setLineDash([.5, .4]); c.strokeRect(L[0], L[1], L[2] - L[0], L[3] - L[1]); c.setLineDash([]);
    if (R.build) { c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = .03; c.beginPath(); for (let x = L[0]; x <= L[2]; x++) { c.moveTo(x, L[1]); c.lineTo(x, L[3]); } for (let y = L[1]; y <= L[3]; y++) { c.moveTo(L[0], y); c.lineTo(L[2], y); } c.stroke(); }
    // зоны: в режиме стройки и в оверлее
    if (R.overlay === 'zones' || (R.build && String(R.build.t).startsWith('zone'))) {
      for (const k in m.zone) { const i = +k; c.fillStyle = D.zones[m.zone[k]].c; c.globalAlpha = .3; c.fillRect(i % Wd, Math.floor(i / Wd), 1, 1); } c.globalAlpha = 1;
      for (const rm of Nn.rooms()) { label(c, (rm.ok ? '✔ ' : '✖ ') + D.zones[rm.t].n, rm.x, rm.y - .3, .5, rm.ok ? '#b9f0b9' : '#ffb3ab'); if (!rm.ok) label(c, 'нужно: ' + rm.miss.join(', '), rm.x, rm.y + .4, .34, '#ffd6d1'); }
    }
    label(c, '← ВЫЕЗД', 6, ST + 1.1, .7, 'rgba(255,255,255,.22)'); label(c, 'ВЪЕЗД ←', 40, ST + 1.1, .7, 'rgba(255,255,255,.22)');
    for (const o of m.objs) drawObj(c, o, S);
    for (const s of Nn.slots()) if (s.n && cam.z > 12) label(c, s.n.toUpperCase(), s.x, s.y + (s.r % 2 ? 1.1 : 2.1), .4, 'rgba(0,0,0,.4)');
    if (R.overlay === 'roads') for (const s of Nn.slots()) { const r0 = Nn.roadIn(), ok = S.slotCar[s.id] ? !G().blocked(S.cars[S.slotCar[s.id]] || {}) : Nn.reach(r0[0], r0[1], null, s.id); c.fillStyle = ok ? 'rgba(76,175,80,.28)' : 'rgba(229,57,53,.45)'; const q = s.rect; c.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); if (!ok) label(c, 'НЕТ ПРОЕЗДА', s.x, s.y, .36, '#fff'); }
    if (S.upg.air) { const sh = Nn.objs('shelf')[0]; if (sh) { c.fillStyle = '#2f6a9e'; rr(c, sh.x + .55, sh.y - .4, 1.3, .8, .35); c.fill(); c.fillStyle = '#1d4468'; c.beginPath(); c.arc(sh.x + .9, sh.y, .24, 0, 7); c.fill(); } }
    // стены
    const hasW = (x, y) => !!m.walls[y * Wd + x];
    c.fillStyle = '#3b3f43'; for (const k in m.walls) { const i = +k, x = i % Wd, y = Math.floor(i / Wd); c.fillRect(x + .22, y + .22, .56, .56); if (hasW(x + 1, y)) c.fillRect(x + .77, y + .22, .46, .56); if (hasW(x, y + 1)) c.fillRect(x + .22, y + .77, .56, .46); }
    c.fillStyle = '#6a7076'; for (const k in m.walls) { const i = +k, x = i % Wd, y = Math.floor(i / Wd); c.fillRect(x + .36, y + .36, .28, .28); if (hasW(x + 1, y)) c.fillRect(x + .63, y + .36, .74, .28); if (hasW(x, y + 1)) c.fillRect(x + .36, y + .63, .28, .74); }
    if (S.upg.alarm) { c.strokeStyle = '#9a9da0'; c.lineWidth = .1; c.setLineDash([.18, .22]); c.strokeRect(L[0] - .15, L[1] - .15, L[2] - L[0] + .3, L[3] - L[1] + .1); c.setLineDash([]); }
    if (S.upg.trailer) { const x = L[2] - 3.2, y = L[1] + .6; c.fillStyle = '#2a2c30'; rr(c, x, y, 2.3, 5, .1); c.fill(); c.fillStyle = '#55585c'; rr(c, x + .2, y + .2, 1.9, 4.6, .05); c.fill(); }
  }
  function ghost(c, S) {
    const b = R.build, Nn = NN(); if (!b || b.x == null) return;
    if (b.t === 'demolish') { const o = Nn.objAt(b.x, b.y); c.strokeStyle = '#ff5a4d'; c.lineWidth = .12; c.fillStyle = 'rgba(229,57,53,.25)'; if (o) { const q = Nn.rect(o); c.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); c.strokeRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); } else { c.fillRect(Math.floor(b.x), Math.floor(b.y), 1, 1); c.strokeRect(Math.floor(b.x), Math.floor(b.y), 1, 1); } return; }
    if (String(b.t).startsWith('zone')) { const z = b.t.slice(5), x = Math.floor(b.x), y = Math.floor(b.y); c.fillStyle = z ? D.zones[z].c : '#ff5a4d'; c.globalAlpha = .55; c.fillRect(x, y, 1, 1); c.globalAlpha = 1; b.why = Nn.inLot(x, y) ? '' : 'за границей участка'; return; }
    const d = D.build[b.t], p = Nn.snap(b.t, b.x, b.y, b.r), why = Nn.canPlace(b.t, p[0], p[1], b.r); b.sx = p[0]; b.sy = p[1]; b.why = why;
    c.globalAlpha = .8;
    if (d.paint) { c.fillStyle = why ? 'rgba(229,57,53,.55)' : (b.t === 'wall' ? 'rgba(106,112,118,.95)' : b.t === 'road' ? 'rgba(62,64,67,.95)' : 'rgba(143,138,128,.85)'); c.fillRect(p[0] + .04, p[1] + .04, .92, .92); }
    else { const o = { t: b.t, x: p[0], y: p[1], r: b.r }, q = Nn.rect(o); c.fillStyle = why ? 'rgba(229,57,53,.3)' : 'rgba(76,175,80,.25)'; c.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); drawObj(c, o, S, true); c.strokeStyle = why ? '#ff5a4d' : '#7be37f'; c.lineWidth = .07; c.strokeRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); }
    c.globalAlpha = 1;
  }
  function vehicle(c, v) {
    c.save(); c.translate(v.x, v.y); c.rotate(v.ang);
    c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -3.3, -1.0, 6.9, 2.2, .3); c.fill();
    c.fillStyle = '#17181a'; for (const sx of [2.2, -2.0]) for (const sy of [-1, 1]) { rr(c, sx - .4, sy * 1.0 - .14, .8, .28, .08); c.fill(); }
    if (v.kind === 'tow') { c.fillStyle = '#3a3d42'; rr(c, -3.4, -1.05, 5.2, 2.1, .12); c.fill(); c.fillStyle = '#d9a21c'; rr(c, 1.6, -1.05, 2, 2.1, .3); c.fill(); c.fillStyle = '#1d2a33'; rr(c, 2.5, -.85, .7, 1.7, .1); c.fill(); c.fillStyle = Math.sin(T * 14) > 0 ? '#ffb300' : '#7a5a10'; c.fillRect(1.9, -.5, .25, 1); }
    else { c.fillStyle = v.src === 'junk' ? '#6b7a3a' : v.src === 'dist' ? '#2e5d8f' : '#e9e7e0'; rr(c, -2.9, -1.0, 4.4, 2.0, .15); c.fill(); c.fillStyle = v.src === 'store' ? '#b8392e' : '#d8d2c2'; rr(c, 1.4, -.95, 1.7, 1.9, .3); c.fill(); c.fillStyle = '#1d2a33'; rr(c, 2.2, -.8, .6, 1.6, .1); c.fill(); c.rotate(-v.ang); label(c, v.src === 'junk' ? 'PULL-A-PART' : v.src === 'dist' ? 'MIDWEST' : 'EARL & SONS', -Math.cos(v.ang) * .7, -Math.sin(v.ang) * .7, .3, v.src === 'store' ? '#b8392e' : '#fff'); }
    c.restore();
  }
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
    const cars = Object.values(S.cars).filter(x => x.lot && !x.away).sort((a, b) => a.y - b.y);
    for (const v of S.veh) if (v.kind === 'tow') vehicle(c, v);
    for (const car of cars) { const f = car.faults.find(f => D.sym[f.sym].puddle); if (f && !car.mv && car.owner !== 'seller') { c.fillStyle = 'rgba(40,28,18,.5)'; c.beginPath(); c.ellipse(car.x + .3, car.y - .9, .5, .32, 0, 0, 7); c.fill(); } }
    for (const car of cars) {
      const o = car.order && S.orders[car.order], busyP = o && o.busy != null, lifted = !car.mv && G().kindOf(car) === 'bay' && (car.work || (o && o.busy != null && o.stage === 'diag'));
      car.lift = U.lerp(car.lift || 0, lifted ? 1 : 0, .12);
      c.save(); c.translate(car.x, car.y); let sh = 0; if (car.faults.some(f => D.sym[f.sym].shake) && (car.mv || car.work)) sh = Math.sin(T * 40) * .015; c.rotate(car.ang + sh); const k = 1 + car.lift * .07; c.scale(k, k);
      R.drawCarTop(c, car, { lift: car.lift > .5, hood: car.hood && !car.mv }); c.restore();
      if (R.sel === 'c' + car.id || R.hover === 'c' + car.id) { c.strokeStyle = R.sel === 'c' + car.id ? '#E3B23C' : 'rgba(255,255,255,.6)'; c.lineWidth = 2 / cam.z; c.beginPath(); c.arc(car.x, car.y, 3, 0, 7); c.stroke(); }
      if (car.mv && !car.mv.tow && !car.mv.push) {
        const sm = car.faults.find(f => D.sym[f.sym].smoke); if (Math.random() < (sm ? .5 : .12)) R.spawn({ t: 'smoke', x: car.x - Math.cos(car.ang) * 2.4, y: car.y - Math.sin(car.ang) * 2.4, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, life: 1.6, col: sm ? D.sym[sm.sym].smoke : '#9a9a9a', r: sm ? .35 : .18 });
      } else if (car.faults.some(f => D.sym[f.sym].steam) && o && Math.random() < .06) R.spawn({ t: 'smoke', x: car.x, y: car.y - 1.8, vx: (Math.random() - .5) * .3, vy: -.5, life: 1.4, col: '#f2f2f2', r: .25 });
    }
    for (const v of S.veh) if (v.kind === 'van') vehicle(c, v);
    ghost(c, S);
    // люди
    for (const v of S.visitors) person(c, v.x, v.y, v.dir, v.col || '#888', { skin: v.id % 8, hair: v.id % 10, f: v.f, hat: 9 }, { walk: !!v.pts });
    for (const p of S.pawns) {
      if (p.state !== 'work' || p.arriveAt) continue; const t = p.task, working = t && t.ph === 'do' && !p.path;
      person(c, p.x, p.y, working && t.o && S.orders[t.o] && S.cars[S.orders[t.o].car] && t.type !== 'desk' ? Math.atan2(S.cars[S.orders[t.o].car].y - p.y, S.cars[S.orders[t.o].car].x - p.x) : (working && t.type === 'desk' ? Math.PI / 2 : p.dir), WW.P.col(p), p.look, { walk: !!p.path, work: working && t.type !== 'lunch', carry: p.carry });
      if (R.sel === 'p' + p.id || R.hover === 'p' + p.id) { c.strokeStyle = R.sel === 'p' + p.id ? '#E3B23C' : 'rgba(255,255,255,.7)'; c.lineWidth = 2 / cam.z; c.beginPath(); c.arc(p.x, p.y, .55, 0, 7); c.stroke(); }
      const ic = !t ? null : t.type === 'lunch' ? '☕' : t.type === 'push' ? '💪' : t.type === 'bench' ? '⚙' : t.type === 'desk' ? '☎' : t.type === 'test' || t.type === 'qc' ? '🔍' : t.type === 'job' ? (p.carry || t.ph === 'store' || t.ph === 'pick' ? '📦' : '🔧') : null;
      if (ic && cam.z > 13) { c.save(); c.translate(p.x, p.y - .62); const s = Math.max(.42, 11 / cam.z); c.scale(s, s); c.font = '.7px system-ui'; c.textAlign = 'center'; c.fillText(ic, 0, 0); c.restore(); }
      if (cam.z > 20 || R.hover === 'p' + p.id) { c.save(); c.translate(p.x, p.y + .62); const s = Math.max(.4, 11 / cam.z); c.scale(s, s); c.font = '600 .5px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(p.name.split(' ')[0], .03, .03); c.fillStyle = '#fff'; c.fillText(p.name.split(' ')[0], 0, 0); c.restore(); }
    }
    // статус нарядов над машинами
    for (const car of cars) {
      const o = car.order && S.orders[car.order]; if (car.mv && !car.mv.push) continue;
      if (o) {
        let txt = '№' + o.id + ' ' + WW.O.stageName(o.stage), prog = null; const j = o.jobs.find(x => x.status === 'doing');
        if (j && j.left != null && j.tot) prog = 1 - j.left / j.tot; if (o.stage === 'diag' && o.decide) txt = '№' + o.id + ' ❓ смета'; if (o.stage === 'ready') txt = '№' + o.id + ' ✔ готово'; if (o.type === 'own') txt = '🔧 проект'; if (o.duePending) txt = '№' + o.id + ' ⏱ срок?'; if (o.hold) txt += ' ⏸'; if (o.now) txt = '⚡ ' + txt;
        bubble(c, car.x, car.y - 3.05, txt, o.type === 'own' ? 'rgba(90,70,40,.9)' : stageCol[o.stage]);
        if (prog != null) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(car.x - 1, car.y + 2.75, 2, .22); c.fillStyle = '#E3B23C'; c.fillRect(car.x - 1, car.y + 2.75, 2 * U.clamp(prog, 0, 1), .22); }
      } else if (car.sale) bubble(c, car.x, car.y - 3.05, U.money(car.sale.ask), 'rgba(46,125,50,.92)');
      if (car.push && !(car.mv && car.mv.push)) bubble(c, car.x, car.y + 3.3, '💪 ждёт, пока перекатят', 'rgba(120,70,30,.9)');
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
    if (m > 1020) { c.globalCompositeOperation = 'lighter'; const a = Math.min(.32, (m - 1020) / 120 * .32); for (const p of NN().objs('lamp').map(o => [o.x, o.y]).concat(NN().slots().filter(q => q.kind === 'bay' && q.indoor).map(q => [q.x, q.y]), NN().objs('desk').map(o => [o.x, o.y]), NN().objs('billboard').map(o => [o.x, o.y]))) { const s = R.toScreen(p[0], p[1]), g = c.createRadialGradient(s[0], s[1], 0, s[0], s[1], cam.z * 5.5); g.addColorStop(0, 'rgba(255,180,107,' + a + ')'); g.addColorStop(1, 'rgba(255,180,107,0)'); c.fillStyle = g; c.fillRect(s[0] - cam.z * 6, s[1] - cam.z * 6, cam.z * 12, cam.z * 12); } c.globalCompositeOperation = 'source-over'; }
    if (S.weather === 'rain') { c.strokeStyle = 'rgba(190,210,235,.35)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 90; i++) { const x = (i * 97 + T * 240) % (W + 60) - 30, y = (i * 53 + T * 900) % (H + 40) - 20; c.moveTo(x, y); c.lineTo(x - 4, y + 14); } c.stroke(); }
    if (S.weather === 'snow' || S.weather === 'blizzard') { c.fillStyle = 'rgba(255,255,255,.8)'; const n = S.weather === 'blizzard' ? 220 : 90; for (let i = 0; i < n; i++) { const x = (i * 131 + T * (S.weather === 'blizzard' ? 160 : 25) + Math.sin(T + i) * 20) % (W + 20), y = (i * 71 + T * 60) % (H + 20); c.fillRect(x, y, 2, 2); } }
  };

  // что под курсором
  R.pick = function (px, py) {
    const S = WW.S, w = R.toWorld(px, py);
    for (const p of S.pawns) if (p.state === 'work' && !p.arriveAt && U.dist(p.x, p.y, w[0], w[1]) < .6) return { t: 'p', id: p.id, o: p };
    for (const id in S.cars) { const car = S.cars[id]; if (!car.lot || car.away) continue; const dx = w[0] - car.x, dy = w[1] - car.y, ca = Math.cos(-car.ang), sa = Math.sin(-car.ang), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca, m = D.models[car.model]; if (Math.abs(lx) < m.L / 2 + .1 && Math.abs(ly) < m.W / 2 + .1) return { t: 'c', id: car.id, o: car }; }
    for (const v of S.visitors) if (U.dist(v.x, v.y, w[0], w[1]) < .6) return { t: 'v', id: v.id, o: v };
    return null;
  };

  WW.on('fx', function (e) {
    const weld = e.sk === 'body', k = e.small ? .3 : 1;
    for (let i = 0; i < (weld ? 7 : 2); i++) R.spawn({ t: 'spark', x: e.x + (Math.random() - .5) * 2 * k, y: e.y + (Math.random() - .5) * 3 * k, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2.5, life: .35 + Math.random() * .4 });
    if (weld && Math.random() < .5) R.spawn({ t: 'flash', x: e.x, y: e.y, life: .15 });
    if (Math.random() < .35) WW.emit('sound', weld ? 'weld' : 'ratchet');
  });
  WW.on('paid', function (e) { if (e.x == null) return; R.spawn({ t: 'text', x: e.x, y: e.y - 1, vy: -.9, life: 2.4, text: '+' + U.money(e.total), col: 'rgba(140,230,120,A)' }); if (e.stars) R.spawn({ t: 'stamp', x: e.x, y: e.y, life: 2.2 }); });
})(globalThis.WW);
