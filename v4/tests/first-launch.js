const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const saves = new Map();
const starts = [];
const UI = { act: {}, close() {}, pops() {}, setSpeed() {}, hud() {} };
const WW = {
  U: { esc: String, money: String },
  D: { scenarios: {
    tutor: { tutor: 1, n: 'Training', d: '', year: 1988, money: 3000 },
    legacy: { n: 'Legacy', d: '', year: 1988, money: 3000 },
    heir: { n: 'Heir', d: '', year: 1988, money: 60000 }
  }, sites: { gas: { i: '', n: 'Gas', d: '', clients: 1, loan: 1 } } },
  G: { newGame: (...args) => starts.push(args) }, UI,
  R: { fit() {} }, A: { play() {} }, on() {}
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/modals.js'), 'utf8'), {
  WW, localStorage: { getItem: key => saves.get(key) || null },
  document: {}, clearInterval() {}, clearTimeout() {}, cancelAnimationFrame() {}
});
const MOD = WW.MOD, A = UI.act;
MOD.show = (html, cls, key) => { MOD.html = html; MOD.key = key; };
MOD.hide = () => { MOD.key = null; };

A.mNew();
assert.equal(MOD.selScn, 'tutor', 'a new player defaults to training');
assert.equal((MOD.html.match(/scn-softgate/g) || []).length, 2, 'only non-training scenarios are dimmed');
assert(!MOD.html.includes('disabled'), 'dimmed options remain interactive');
A.mNew({ s: 'legacy', site: 'gas' });
assert(MOD.html.includes('Уверен?'), 'selecting a normal scenario asks for confirmation');
assert.equal(starts.length, 0, 'confirmation does not launch a game');
A.mScenarioBack();
assert.equal(MOD.selScn, 'tutor', 'cancel preserves the previous selection');
A.mNew({ s: 'heir', site: 'gas' });
A.mChooseTraining();
assert.equal(MOD.selScn, 'tutor', 'recommended action selects training');
A.mNew({ s: 'legacy', site: 'gas' });
A.mWithoutTraining();
assert.equal(MOD.selScn, 'legacy', 'confirmation allows a normal scenario');
A.mStart({ s: 'legacy', site: 'gas' });
assert.equal(starts.at(-1)[0], 'legacy', 'confirmed scenario can be started');

// Direct start paths must also offer the same reversible choice.
A.mStart({ s: 'heir', site: 'gas' });
assert(MOD.html.includes('Играть без обучения'));
assert.equal(starts.length, 1);
A.mWithoutTraining();
assert.equal(starts.at(-1)[0], 'heir');

for (const slot of ['auto', '1', '2', '3']) {
  saves.clear();
  saves.set('ww_release_v4_save_' + slot, '{"save":true}');
  A.mNew({ s: 'heir' });
  assert(!MOD.html.includes('scn-softgate'), `${slot} save removes first-launch dimming`);
  const count = starts.length;
  A.mStart({ s: 'heir', site: 'gas' });
  assert.equal(starts.length, count + 1, `${slot} save removes the confirmation`);
}
saves.clear();
A.mStart({ s: 'tutor', site: 'gas' });
assert.equal(starts.at(-1)[0], 'tutor', 'training launches without a warning');
console.log('First-launch regression passed: empty saves, all 4 save slots, cancel, training and confirmed bypass.');
