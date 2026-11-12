// WRENCHWORLD — процедурный звук на WebAudio: всё синтезируется, файлов нет.
(function (WW) {
  const A = WW.A = { on: true, vol: .5 };
  let ac = null, master = null, last = {};
  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = A.vol; master.connect(ac.destination); return ac;
  }
  A.unlock = function () { const c = ctx(); if (c && c.state === 'suspended') c.resume(); };
  A.setVol = v => { A.vol = v; if (master) master.gain.value = v; };
  function tone(f, t0, d, type, g, f2) {
    const o = ac.createOscillator(), gn = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g || .2, t0 + .008); gn.gain.exponentialRampToValueAtTime(.0008, t0 + d);
    o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + d + .02);
  }
  function noise(t0, d, g, fq, q, type) {
    const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = fq || 1200; f.Q.value = q || 1;
    const gn = ac.createGain(); gn.gain.setValueAtTime(g || .2, t0); gn.gain.exponentialRampToValueAtTime(.0008, t0 + d);
    s.connect(f); f.connect(gn); gn.connect(master); s.start(t0);
  }
  const S = {
    click: t => tone(880, t, .04, 'square', .05), tab: t => tone(520, t, .05, 'triangle', .08),
    cash: t => { tone(1320, t, .09, 'square', .07); tone(1760, t + .07, .16, 'square', .07); noise(t, .05, .12, 5000, 2); },
    bell: t => { tone(1175, t, .5, 'sine', .14); tone(1568, t + .12, .6, 'sine', .1); },
    ping: t => tone(990, t, .2, 'triangle', .12), bad: t => { tone(220, t, .22, 'sawtooth', .09, 150); tone(160, t + .12, .25, 'sawtooth', .08, 110); },
    done: t => { tone(660, t, .09, 'triangle', .1); tone(880, t + .08, .14, 'triangle', .1); },
    ratchet: t => { for (let i = 0; i < 5; i++) noise(t + i * .035, .02, .09, 3200, 4); },
    weld: t => noise(t, .25, .07, 6500, .7, 'highpass'),
    engine: t => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(95, t + .5); o.frequency.linearRampToValueAtTime(70, t + 1.1); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .1); g.gain.linearRampToValueAtTime(0, t + 1.2); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3); noise(t, .9, .03, 180, .8, 'lowpass'); },
    push: t => noise(t, .5, .04, 300, .6, 'lowpass'), box: t => { noise(t, .08, .15, 400, 1, 'lowpass'); tone(140, t, .1, 'sine', .12); },
    build: t => { for (let i = 0; i < 3; i++) { noise(t + i * .14, .05, .2, 900, 2); tone(180, t + i * .14, .08, 'square', .06); } },
    gavel: t => { noise(t, .07, .3, 700, 2); tone(120, t, .12, 'sine', .2); },
    tree: t => tone(440, t, .12, 'square', .08), go: t => tone(880, t, .35, 'square', .1),
    win: t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .11, .25, 'triangle', .12)); },
    stamp: t => { noise(t, .09, .3, 250, 1, 'lowpass'); tone(90, t, .12, 'sine', .2); }
  };
  A.play = function (name) {
    if (!A.on) return; const c = ctx(); if (!c || c.state !== 'running' || !S[name]) return;
    const now = performance.now(); if (last[name] && now - last[name] < (name === 'ratchet' || name === 'weld' ? 260 : 60)) return; last[name] = now;
    try { S[name](c.currentTime + .005); } catch (e) { /* звук не критичен */ }
  };
  WW.on('sound', n => A.play(n));
})(globalThis.WW);
