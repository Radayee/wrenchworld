// Regression: tutorial guidance must not cancel unrelated controls or camera input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const listeners = new Map();
const elements = new Map();
function element(id) {
  const classes = new Set();
  const el = {
    id, dataset: {}, style: {}, innerHTML: '',
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    closest: () => null, contains: node => node === el,
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 50, bottom: 80 }),
    remove: () => elements.delete(el.id)
  };
  return el;
}
const target = element('speed8');
const unrelated = element('other-control');
const doc = {
  getElementById: id => elements.get(id) || null,
  querySelector: selector => selector === '#tSpeed [data-v="8"]' ? target : null,
  querySelectorAll: () => [...elements.values(), target].filter(e => e.classList.contains('tut-hl')),
  createElement: () => element(''),
  body: { appendChild: el => elements.set(el.id, el) },
  addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) || []), fn])
};
const WW = {
  U: { esc: String, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) },
  D: { scenarios: {} }, C: {}, O: {}, N: {}, R: {}, P: {},
  G: { newGame() {} }, MOD: { open: false },
  UI: { act: {}, speed: 0, setSpeed(v) { this.speed = v; } },
  S: { tutor: { i: 1, prep: 1, at: 1000 } }, started: true,
  on() {}, A: { play() {} }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/tutorial.js'), 'utf8'), {
  WW, document: doc, window: { innerWidth: 1200, innerHeight: 800 },
  performance: { now: () => 1000 }, setInterval() {}
});
WW.TUT.tick();
assert(target.classList.contains('tut-hl'), 'next action stays highlighted');

for (const type of ['click', 'mousedown', 'pointerdown', 'change', 'input', 'contextmenu', 'dblclick', 'keydown', 'wheel']) {
  const event = {
    type, key: 'Escape', target: type === 'wheel' ? { id: 'world' } : unrelated,
    preventDefault() { this.cancelled = true; },
    stopPropagation() { this.stopped = true; }
  };
  for (const listener of listeners.get(type) || []) listener(event);
  assert(!event.cancelled && !event.stopped, `${type} remains available outside the tutorial target`);
}
assert.equal(WW.S.tutor.i, 1, 'unrelated input does not complete the current step');
WW.UI.speed = 8;
WW.TUT.next = () => { WW.S.tutor.i++; };
WW.TUT.tick();
assert.equal(WW.S.tutor.i, 2, 'performing the requested action still advances the tutorial');
WW.S.tutor.i = 6; // A running diagnosis step.
WW.S.tutor.prep = 0;
WW.S.orders = {};
WW.TUT.tick();
assert.equal(WW.UI.speed, 8, 'running step sets its initial suggested pace');
WW.UI.speed = 0;
WW.TUT.tick();
assert.equal(WW.UI.speed, 0, 'player pause remains in effect during a running step');
WW.started = false;
WW.TUT.tick();
assert(!target.classList.contains('tut-hl'), 'highlight is removed when the tutorial stops');
console.log('Tutorial input regression passed: 9 event types stay usable, target highlights and progression still work.');
