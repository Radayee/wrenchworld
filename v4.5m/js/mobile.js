// Fit the visible viewport and give canvas maps native touch gestures.
(function (WW) {
  const { R, UI } = WW, doc = document, root = doc.documentElement;
  const viewport = window.visualViewport;
  function syncViewport() {
    root.style.setProperty('--app-height', Math.round(viewport ? viewport.height : window.innerHeight) + 'px');
    R.resize();
  }
  WW.MOBILE = { syncViewport };
  window.addEventListener('resize', syncViewport);
  if (viewport) viewport.addEventListener('resize', syncViewport);
  if (window.ResizeObserver) new window.ResizeObserver(() => R.resize()).observe(doc.getElementById('stage'));
  syncViewport();
  requestAnimationFrame(() => { R.resize(); R.fit(); });

  const tools = doc.createElement('div');
  tools.id = 'mobileMapTools'; tools.setAttribute('aria-label', 'Масштаб карты');
  tools.innerHTML = '<button data-a="mobileZoom" data-f="1.25" aria-label="Приблизить">+</button><button data-a="mobileZoom" data-f="0.8" aria-label="Отдалить">−</button><button data-a="mobileFit" aria-label="Вся карта">⊡</button>';
  doc.getElementById('stage').appendChild(tools);
  UI.act.mobileZoom = d => { const cv = doc.getElementById('world'); R.zoom(+d.f, cv.clientWidth / 2, cv.clientHeight / 2); };
  UI.act.mobileFit = () => R.fit();
  UI.act.mobileRotate = () => { if (R.build) { R.build.r = ((R.build.r || 0) + 1) % 4; UI.buildBar(); } };
  const buildBar = UI.buildBar;
  UI.buildBar = function () {
    buildBar.apply(UI, arguments);
    const bar = doc.getElementById('buildBar');
    if (bar && R.build) bar.insertAdjacentHTML('beforeend', '<button class="btn mobile-rotate" data-a="mobileRotate" aria-label="Повернуть объект">↻ Повернуть</button>');
  };

  let gesture = null, suppressClickUntil = 0;
  const points = new Map();
  const midpoint = () => {
    const p = [...points.values()];
    return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
  };
  function pan(dx, dy) {
    if (gesture.canvas.id === 'world') R.pan(dx, dy);
    else if (UI.sub.ccam) {
      const cam = UI.sub.ccam, scale = gesture.canvas.width / gesture.canvas.getBoundingClientRect().width;
      cam.x -= dx * scale / cam.z; cam.y -= dy * scale / cam.z;
    }
  }
  function zoom(factor, x, y) {
    const cv = gesture.canvas, rect = cv.getBoundingClientRect();
    if (cv.id === 'world') R.zoom(factor, x - rect.left, y - rect.top);
    else if (UI.sub.ccam) {
      const cam = UI.sub.ccam, scale = cv.width / rect.width;
      const px = (x - rect.left) * scale - cv.width / 2, py = (y - rect.top) * scale - cv.height / 2;
      const z = WW.U.clamp(cam.z * factor, 1.2, 30);
      cam.x += px / cam.z - px / z; cam.y += py / cam.z - py / z; cam.z = z;
    }
  }
  function tap(cv, x, y) {
    if (!WW.started || !WW.S) return;
    const rect = cv.getBoundingClientRect();
    if (cv.id === 'world') {
      if (R.build) {
        const pos = R.toWorld(x - rect.left, y - rect.top);
        R.build.x = pos[0]; R.build.y = pos[1]; UI.buildClick(true); return;
      }
      const hit = R.pick(x - rect.left, y - rect.top); if (!hit) return;
      if (hit.t === 'c') { const car = hit.o; UI.open(car.order && WW.S.orders[car.order] ? 'order' : 'car', car.order && WW.S.orders[car.order] ? car.order : car.id); }
      else if (hit.t === 'p') UI.go(['pawn', hit.id]);
      else if (hit.t === 'v' && hit.o.order) UI.go(['order', hit.o.order]);
    } else if (UI.sub.ccam && WW.CITY) {
      const cam = UI.sub.ccam, k = cv.width / rect.width;
      const wx = ((x - rect.left) * k - cv.width / 2) / cam.z + cam.x;
      const wy = ((y - rect.top) * k - cv.height / 2) / cam.z + cam.y;
      let best = null, distance = 28 * k / cam.z;
      for (const lot of WW.CITY.get().lots) if (lot.poi) {
        const d = Math.hypot(lot.x - wx, lot.y - wy);
        if (d < distance) { distance = d; best = lot; }
      }
      if (best) { UI.sub.poi = best.poi; UI.render(true); }
    }
  }
  doc.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || !['world', 'cityCv'].includes(e.target.id)) return;
    if (gesture && gesture.canvas !== e.target) return;
    e.preventDefault(); WW.A.unlock();
    if (!gesture) gesture = { canvas: e.target, moved: 0, pinched: false };
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
    if (points.size >= 2) { gesture.pinched = true; gesture.mid = midpoint(); }
  }, { capture: true, passive: false });
  doc.addEventListener('pointermove', e => {
    if (!gesture || !points.has(e.pointerId)) return;
    e.preventDefault();
    const previous = points.get(e.pointerId), dx = e.clientX - previous.x, dy = e.clientY - previous.y;
    gesture.moved += Math.abs(dx) + Math.abs(dy);
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.size >= 2) {
      const mid = midpoint(), old = gesture.mid;
      pan(mid.x - old.x, mid.y - old.y);
      if (old.distance > 0) zoom(mid.distance / old.distance, mid.x, mid.y);
      gesture.mid = mid;
    } else pan(dx, dy);
  }, { capture: true, passive: false });
  function end(e) {
    if (!gesture || !points.has(e.pointerId)) return;
    const finished = gesture;
    points.delete(e.pointerId); suppressClickUntil = Date.now() + 750;
    if (!points.size) {
      gesture = null;
      if (e.type !== 'pointercancel' && !finished.pinched && finished.moved < 10) tap(finished.canvas, e.clientX, e.clientY);
    }
  }
  doc.addEventListener('pointerup', end, true);
  doc.addEventListener('pointercancel', end, true);
  // A handled canvas tap must not also generate the compatibility mouse click.
  doc.addEventListener('click', e => {
    if (['world', 'cityCv'].includes(e.target.id) && Date.now() < suppressClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})(globalThis.WW);
