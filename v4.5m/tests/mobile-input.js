const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const handlers = {}, viewportHandlers = {}, props = {}, opened = [], pans = [], zooms = [];
let resized = 0, built = 0;
const world = { id: 'world', clientWidth: 320, clientHeight: 300, width: 320, height: 300,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 300 }), setPointerCapture() {} };
const stage = { appendChild() {} };
const viewport = { height: 620, width: 320, addEventListener: (k, fn) => { viewportHandlers[k] = fn; } };
const doc = {
  documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } },
  getElementById: id => id === 'world' ? world : id === 'stage' ? stage : null,
  createElement: () => ({ setAttribute() {} }),
  addEventListener: (k, fn) => { (handlers[k] ||= []).push(fn); }
};
const WW = { U: { clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) },
  R: { resize() { resized++; }, fit() {}, pan: (...p) => pans.push(p), zoom: (...p) => zooms.push(p),
    pick: () => ({ t: 'c', o: { id: 4 } }), toWorld: (x, y) => [x, y] },
  UI: { act: {}, sub: {}, buildBar() {}, open: (...p) => opened.push(p), buildClick() { built++; } },
  A: { unlock() {} }, S: { orders: {} }, started: true };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/mobile.js'), 'utf8'), {
  WW, document: doc, window: { visualViewport: viewport, addEventListener() {} }, requestAnimationFrame: fn => fn()
});
assert.equal(props['--app-height'], '620px');
viewport.height = 400; viewportHandlers.resize();
assert.equal(props['--app-height'], '400px', 'browser chrome / keyboard changes the app height');
assert(resized >= 3);
function fire(type, id, x, y, extra = {}) {
  const event = { type, pointerType: 'touch', pointerId: id, target: world, clientX: x, clientY: y,
    preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
  for (const fn of handlers[type] || []) fn(event);
  return event;
}
fire('pointerdown', 1, 40, 50); fire('pointerup', 1, 40, 50);
assert.equal(opened.length, 1, 'tap opens the picked car');
assert(fire('click', 1, 40, 50).stopped, 'compatibility click cannot open it twice');
fire('pointerdown', 2, 40, 50); fire('pointermove', 2, 100, 100); fire('pointerup', 2, 100, 100);
assert.equal(opened.length, 1, 'drag never selects a car'); assert(pans.length);
fire('pointerdown', 3, 50, 50); fire('pointerdown', 4, 100, 50);
fire('pointermove', 4, 150, 50); fire('pointerup', 4, 150, 50); fire('pointerup', 3, 50, 50);
assert.equal(zooms.at(-1)[0], 2, 'pinch zooms by the finger-distance ratio');
assert.equal(opened.length, 1, 'pinch never selects a car');
WW.R.build = { t: 'lift' };
fire('pointerdown', 5, 20, 30); fire('pointerup', 5, 20, 30);
assert.equal(built, 1, 'tap places a build object once');
fire('pointerdown', 6, 20, 30); fire('pointercancel', 6, 20, 30);
assert.equal(built, 1, 'cancelled touch does not build');
const cityCanvas = { id: 'cityCv', width: 900, height: 600, setPointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 }) };
WW.UI.sub.ccam = { x: 0, y: 0, z: 2 };
WW.CITY = { get: () => ({ lots: [{ x: 0, y: 0, poi: 'home' }] }) };
WW.UI.render = () => {};
fire('pointerdown', 7, 150, 100, { target: cityCanvas });
fire('pointerup', 7, 150, 100, { target: cityCanvas });
assert.equal(WW.UI.sub.poi, 'home', 'city tap selects the nearby place');
fire('pointerdown', 8, 150, 100, { target: cityCanvas });
fire('pointermove', 8, 170, 100, { target: cityCanvas });
fire('pointerup', 8, 170, 100, { target: cityCanvas });
assert.equal(WW.UI.sub.ccam.x, -30, 'city drag accounts for canvas display scaling');
const navTap = fire('pointerdown', 9, 0, 0, { target: { id: 'nav_orders' } });
assert(!navTap.prevented, 'navigation buttons keep their normal touch behavior');
console.log('Mobile input passed: visual viewport resize, tap, drag, pinch, duplicate-click suppression, building and cancellation.');

// Use the real renderer to verify full-map fit and zoom on a small stage.
const renderer = { U: WW.U, D: { MAP: { W: 47, H: 30 }, nodeIds: [] }, C: {}, on() {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/render.js'), 'utf8'), {
  WW: renderer, window: { devicePixelRatio: 2 }
});
world.getContext = () => ({}); world.clientHeight = 180;
renderer.R.init(world); renderer.R.fit();
assert(renderer.R.cam.z < 8, 'small stages can zoom out enough to see the map');
renderer.R.zoom(1, 160, 90);
assert(renderer.R.cam.z < 8, 'pinching does not jump back to the old desktop minimum zoom');
console.log('Mobile renderer passed: full map fits small viewports.');
