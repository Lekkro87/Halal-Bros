/* Halal Haram Detector – Sound & Musik (komplett synthetisiert) + Detector-Stimme („HALAL“ / „HARAM“) */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});

  let ctx = null, master = null, sfxBus = null, musicBus = null, ambBus = null, voiceBus = null, noiseBuf = null, distCurve = null;
  const settings = { volume: 0.8, music: true, sfx: true, voice: true };
  const MUSIC_LEVEL = 0.55;
  let pitchMul = 1;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain();
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.connect(master);
    // Detector-Stimme: eigener Bus, klingt wie aus dem Lautsprecher des Geräts
    voiceBus = ctx.createGain();
    const vHp = ctx.createBiquadFilter(); vHp.type = 'highpass'; vHp.frequency.value = 160;
    const vPk = ctx.createBiquadFilter(); vPk.type = 'peaking'; vPk.frequency.value = 2600; vPk.Q.value = 0.9; vPk.gain.value = 4;
    voiceBus.connect(vHp); vHp.connect(vPk); vPk.connect(master);
    // Hall für die dramatische Variante
    const echo = ctx.createDelay(0.5); echo.delayTime.value = 0.14;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(voiceBus);
    voice.echo = echo;
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    distCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; distCurve[i] = Math.tanh(x * 4); }
    applyVolumes();
    loadVoice();
    return ctx;
  }

  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(settings.volume * 0.9, t, 0.02);
    sfxBus.gain.setTargetAtTime(settings.sfx ? 1 : 0, t, 0.02);
    ambBus.gain.setTargetAtTime(settings.sfx ? 0.55 : 0, t, 0.05);
    voiceBus.gain.setTargetAtTime(settings.voice ? 1 : 0, t, 0.02);
    musicBus.gain.cancelScheduledValues(t); // laufendes Ducking der Stimme verwerfen
    musicBus.gain.setTargetAtTime(settings.music ? MUSIC_LEVEL : 0, t, 0.05);
  }

  /* ---------------- Detector-Stimme („HALAL“ / „HARAM“) ---------------- */
  const voice = { bufs: {}, srcs: [], out: null, loading: false, echo: null };

  /** Eingebettete MP3s (js/voicedata.js) einmalig dekodieren */
  function loadVoice() {
    const data = HHD.VOICE;
    if (!ctx || !data || voice.loading) return;
    voice.loading = true;
    Object.keys(data).forEach((word) => Object.keys(data[word]).forEach((mood) => {
      try {
        const bin = atob(data[word][mood]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const p = ctx.decodeAudioData(bytes.buffer, (b) => { voice.bufs[word + '_' + mood] = b; }, () => {});
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ohne Stimme geht's auch */ }
    }));
  }

  /** Vorherige Ansage kurz ausblenden (kein Knacksen) und stoppen */
  function stopVoice(t) {
    if (voice.out) voice.out.gain.setTargetAtTime(0, t, 0.008);
    voice.srcs.forEach((s) => { try { s.stop(t + 0.05); } catch (e) { /* schon beendet */ } });
    voice.srcs = [];
  }

  /** Musik kurz leiser, solange der Detector spricht */
  function duck(t, dur) {
    if (!settings.music) return;
    const g = musicBus.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_LEVEL * 0.35, t, 0.03);
    g.setTargetAtTime(MUSIC_LEVEL, t + dur, 0.15);
  }

  /**
   * Der Detector sagt „HALAL“ oder „HARAM“.
   * o.mood: 'n' normal · 'd' dramatisch (tiefer, mit Hall) · 'h' Hype
   * o.delay: Verzögerung in s · o.rate: Tempo · o.glitch: „HA-HA-HALAL“ (überhitzter Detector)
   */
  function say(word, o) {
    o = o || {};
    if (!ctx || !settings.voice || ctx.state !== 'running') return false;
    const buf = voice.bufs[word + '_' + (o.mood || 'n')] || voice.bufs[word + '_n'];
    if (!buf) return false;
    const t = ctx.currentTime + (o.delay || 0);
    stopVoice(t); // immer nur eine Ansage gleichzeitig
    // Skins klingen leicht unterschiedlich (wie bei den Beeps), aber nie zu verzerrt
    const rate = Math.min(1.12, Math.max(0.9, 1 + (pitchMul - 1) * 0.45)) * (o.rate || 1);
    const out = ctx.createGain();
    out.gain.value = 0.95;
    out.connect(voiceBus);
    voice.out = out;
    if (o.mood === 'd' && voice.echo) out.connect(voice.echo);
    const part = (at, dur) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.playbackRate.value = rate;
      s.connect(out);
      if (dur) s.start(at, 0, dur); else s.start(at);
      voice.srcs.push(s);
    };
    let start = t;
    if (o.glitch) { part(t, 0.1); part(t + 0.11, 0.1); start = t + 0.22; }
    part(start);
    duck(t, start - t + buf.duration / rate);
    return true;
  }

  function env(g, t, vol, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  /** Einzelner Ton */
  function tone(freq, dur, o) {
    o = o || {};
    if (!ctx) return;
    const t = o.at || ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    env(g, t, o.vol != null ? o.vol : 0.2, o.a || 0.004, dur);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); f.Q.value = o.q || 0.8;
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
      node.connect(f); node = f;
    }
    if (o.dist) {
      const w = ctx.createWaveShaper(); w.curve = distCurve;
      node.connect(w); node = w;
    }
    if (o.vib) {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = o.vib; lg.gain.value = o.vibDepth || 12;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    node.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  /** Rauschen (gefiltert) */
  function noise(dur, o) {
    o = o || {};
    if (!ctx) return;
    const t = o.at || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.vol != null ? o.vol : 0.2, o.a || 0.003, dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- Soundeffekte ---------------- */
  const SFX = {
    beep(p) { tone(1760 * (p || 1) * pitchMul, 0.07, { type: 'square', vol: 0.09, lp: 5000 }); },
    scan() {
      tone(420 * pitchMul, 0.28, { type: 'triangle', to: 1900 * pitchMul, vol: 0.06 });
      noise(0.25, { ft: 'bandpass', f: 1500, fTo: 6000, q: 4, vol: 0.03 });
    },
    click() { tone(1100, 0.03, { type: 'square', vol: 0.05, lp: 3000 }); },
    accept() {
      const t = ctx ? ctx.currentTime : 0;
      for (let i = 0; i < 3; i++) tone(1568 * pitchMul, 0.06, { at: t + i * 0.075, vol: 0.08, type: 'square', lp: 6000 });
    },
    correct(streak) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const base = 72 + Math.min(12, Math.floor((streak || 0) / 3));
      tone(midi(base), 0.09, { at: t, type: 'square', vol: 0.1, lp: 4000 });
      tone(midi(base + 7), 0.14, { at: t + 0.06, type: 'square', vol: 0.1, lp: 4000 });
      tone(midi(base + 12), 0.18, { at: t + 0.12, type: 'triangle', vol: 0.12 });
    },
    wrong() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(300, 0.16, { at: t, type: 'sawtooth', vol: 0.14, lp: 1800 });
      tone(200, 0.3, { at: t + 0.14, type: 'sawtooth', to: 120, vol: 0.15, lp: 1400, vib: 9, vibDepth: 10 });
      noise(0.12, { at: t, ft: 'lowpass', f: 600, vol: 0.12 });
    },
    error404() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [0, 0.18, 0.36].forEach((d, i) => tone([311, 294, 277][i], i === 2 ? 0.6 : 0.2, { at: t + d, type: 'sawtooth', vol: 0.09, lp: 1500, vib: i === 2 ? 6 : 0, vibDepth: 8 }));
    },
    overcheck() { tone(520, 0.12, { type: 'triangle', to: 260, vol: 0.12 }); },
    combo(n) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [60, 64, 67, 72, 76, 79, 84];
      const k = Math.min(notes.length, 3 + Math.floor(n / 10));
      for (let i = 0; i < k; i++) tone(midi(notes[i] + 12), 0.12, { at: t + i * 0.05, type: 'square', vol: 0.07, lp: 5000 });
      noise(0.4, { at: t, ft: 'highpass', f: 6000, vol: 0.05 });
    },
    levelUp() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [60, 64, 67, 72, 67, 72, 76].forEach((m, i) => tone(midi(m + 12), i === 6 ? 0.5 : 0.12, { at: t + i * 0.09, type: i % 2 ? 'square' : 'triangle', vol: 0.1, lp: 5000 }));
    },
    boom() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(90, 1.1, { at: t, type: 'sine', to: 36, slide: 0.9, vol: 0.55, dist: true, a: 0.005 });
      noise(0.25, { at: t, ft: 'lowpass', f: 300, vol: 0.35 });
    },
    crowd(kind) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (kind === 'ooh') {
        for (let i = 0; i < 4; i++) noise(0.9, { at: t + i * 0.02, ft: 'bandpass', f: 380 + i * 70, fTo: 620 + i * 60, q: 6, vol: 0.09, a: 0.12 });
      } else {
        for (let i = 0; i < 5; i++) noise(1.1, { at: t + i * 0.03, ft: 'bandpass', f: 1500 + i * 400, q: 1.5, vol: 0.05, a: 0.08 });
        tone(midi(84), 0.08, { at: t + 0.1, type: 'square', vol: 0.04 });
      }
    },
    rustle() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 5; i++) noise(0.05, { at: t + i * 0.045 + Math.random() * 0.02, ft: 'highpass', f: 3000 + Math.random() * 3000, vol: 0.07 });
    },
    sizzle() { noise(0.7, { ft: 'highpass', f: 5000, vol: 0.06, a: 0.05 }); },
    tick(u) { tone(u ? 2400 : 1800, 0.025, { type: 'square', vol: 0.04 }); },
    coin() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(midi(83), 0.07, { at: t, type: 'square', vol: 0.07 });
      tone(midi(88), 0.25, { at: t + 0.07, type: 'square', vol: 0.07 });
    },
    tapBad() { tone(180, 0.1, { type: 'square', vol: 0.08, lp: 900 }); },
    found() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(midi(79), 0.07, { at: t, type: 'square', vol: 0.09 });
      tone(midi(86), 0.07, { at: t + 0.06, type: 'square', vol: 0.09 });
      tone(midi(91), 0.2, { at: t + 0.12, type: 'triangle', vol: 0.11 });
    },
    bossHit() {
      noise(0.25, { ft: 'lowpass', f: 1200, vol: 0.25 });
      tone(120, 0.25, { type: 'square', to: 50, vol: 0.18, lp: 800 });
    },
    bossLaugh() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) tone(260 - i * 20, 0.1, { at: t + i * 0.14, type: 'sawtooth', vol: 0.08, lp: 1200, vib: 25, vibDepth: 30 });
    },
    overload() {
      tone(200, 1.2, { type: 'sawtooth', to: 1400, slide: 1.1, vol: 0.08, lp: 3000, vib: 14, vibDepth: 60 });
      noise(1.1, { ft: 'bandpass', f: 800, fTo: 5000, q: 2, vol: 0.05 });
    },
    swoosh() { noise(0.22, { ft: 'bandpass', f: 600, fTo: 3500, q: 1.2, vol: 0.06 }); },
    pigeon() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(420, 0.25, { at: t, type: 'sine', vol: 0.12, vib: 18, vibDepth: 40 });
      tone(380, 0.35, { at: t + 0.3, type: 'sine', vol: 0.12, vib: 18, vibDepth: 40 });
      noise(0.4, { at: t, ft: 'bandpass', f: 2500, q: 0.8, vol: 0.05 });
    },
    bus() { tone(110, 1.0, { type: 'sawtooth', vol: 0.05, lp: 400, vib: 7, vibDepth: 6 }); noise(1, { ft: 'lowpass', f: 400, vol: 0.06, a: 0.2 }); },
    honk() { tone(370, 0.25, { type: 'square', vol: 0.06, lp: 1500 }); tone(466, 0.25, { type: 'square', vol: 0.05, lp: 1500 }); },
    gameOver() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [67, 66, 65, 64].forEach((m, i) => tone(midi(m - 12), i === 3 ? 0.9 : 0.28, { at: t + 0.35 + i * 0.3, type: 'sawtooth', vol: 0.1, lp: 1400, vib: i === 3 ? 6 : 0, vibDepth: 10 }));
    },
    lifeUp() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 76, 79, 84].forEach((m, i) => tone(midi(m), 0.1, { at: t + i * 0.06, type: 'triangle', vol: 0.1 }));
    },
    legendary() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 76, 79, 83, 86, 91].forEach((m, i) => tone(midi(m), 0.35, { at: t + i * 0.06, type: 'triangle', vol: 0.07 }));
      noise(1.2, { at: t, ft: 'highpass', f: 7000, vol: 0.05, a: 0.3 });
    },
    /* --- 2.0 --- */
    ring() { // altes Telefon: schnelles Trillern
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 8; i++) tone(i % 2 ? 900 : 700, 0.045, { at: t + i * 0.045, type: 'square', vol: 0.05, lp: 3000 });
    },
    slap() { // KLATSCH!
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(0.09, { at: t, ft: 'highpass', f: 1800, vol: 0.45, a: 0.001 });
      noise(0.18, { at: t, ft: 'lowpass', f: 500, vol: 0.3 });
      tone(160, 0.12, { at: t, type: 'sine', to: 70, vol: 0.3 });
    },
    siren() { // Halal-Polizei: wii-wuu
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        tone(740, 0.22, { at: t + i * 0.44, type: 'square', vol: 0.045, lp: 2200 });
        tone(587, 0.22, { at: t + i * 0.44 + 0.22, type: 'square', vol: 0.045, lp: 2200 });
      }
    },
    rush() { // Iftar-Fanfare in Hijaz
      if (!ctx) return;
      const t = ctx.currentTime;
      [62, 63, 66, 67, 69, 74].forEach((m, i) => tone(midi(m + 12), i === 5 ? 0.5 : 0.13, { at: t + i * 0.08, type: 'square', vol: 0.07, lp: 3200, vib: i === 5 ? 6 : 0, vibDepth: 12 }));
      noise(0.6, { at: t, ft: 'highpass', f: 7000, vol: 0.05 });
    },
    mashallah() { // glitzerndes Hijaz-Arpeggio
      if (!ctx) return;
      const t = ctx.currentTime;
      [74, 75, 78, 79, 81, 86].forEach((m, i) => tone(midi(m), 0.3, { at: t + i * 0.05, type: 'triangle', vol: 0.06 }));
      for (let i = 0; i < 6; i++) noise(0.05, { at: t + i * 0.06, ft: 'highpass', f: 8000, vol: 0.05 });
    },
    eid() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => tone(midi(m), i === 6 ? 0.8 : 0.16, { at: t + i * 0.09, type: i % 2 ? 'square' : 'triangle', vol: 0.08, lp: 5000 }));
      SFX.crowd('cheer');
    },
    powerup() {
      tone(400, 0.3, { type: 'triangle', to: 1600, slide: 0.25, vol: 0.08 });
      noise(0.3, { ft: 'highpass', f: 6000, vol: 0.04 });
    },
    clink() { // Teeglas
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(2637, 0.25, { at: t, type: 'sine', vol: 0.05 });
      tone(3520, 0.18, { at: t + 0.07, type: 'sine', vol: 0.035 });
    },
  };

  /* ---------------- Musik-Sequencer ---------------- */
  const PROG = {
    normal: [[48, 55, 60, 64], [43, 50, 59, 62], [45, 52, 60, 64], [41, 48, 57, 60]], // C G Am F
    boss: [[45, 52, 57, 60], [41, 48, 57, 60], [43, 50, 55, 59], [40, 47, 56, 59]], // Am F G E
    menu: [[48, 55, 60, 64], [45, 52, 57, 64], [41, 48, 57, 60], [43, 50, 55, 62]],
  };

  function kick(t, v) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, v || 0.7, 0.002, 0.26);
    osc.connect(g); g.connect(musicBus); osc.start(t); osc.stop(t + 0.3);
  }
  function snare(t, v) {
    noise(0.14, { at: t, ft: 'bandpass', f: 1900, q: 0.7, vol: v || 0.22, dest: musicBus });
    tone(190, 0.08, { at: t, type: 'triangle', vol: 0.12, dest: musicBus });
  }
  function hat(t, open, v) { noise(open ? 0.12 : 0.03, { at: t, ft: 'highpass', f: 7500, vol: v || 0.06, dest: musicBus }); }
  function bass(t, m, len, boss) { tone(midi(m), len, { at: t, type: boss ? 'sawtooth' : 'square', vol: 0.12, lp: boss ? 900 : 650, lpTo: 300, dest: musicBus }); }
  function lead(t, m, len, v) { tone(midi(m), len, { at: t, type: 'square', vol: v || 0.035, lp: 3500, dest: musicBus }); }

  /* Darbuka & Hijaz-Skala für den Orient-Musikstil */
  const HIJAZ = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78]; // D Eb F# G A Bb C D Eb F#
  const MELODY = [
    [4, null, 5, null, 4, 3, 2, null, 1, null, 2, null, 0, null, null, null],
    [0, null, 1, 2, 3, null, 4, null, 5, 4, 3, null, 2, null, 1, null],
    [3, null, 4, null, 5, null, 6, 5, 4, null, 3, null, 4, null, null, null],
    [4, null, 3, 2, 1, null, 2, null, 1, null, 0, null, 0, null, null, null],
  ];
  const DRONE = [38, 38, 43, 45]; // D D G A
  function doum(t, v) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    env(g, t, v || 0.6, 0.003, 0.32);
    osc.connect(g); g.connect(musicBus); osc.start(t); osc.stop(t + 0.35);
    noise(0.06, { at: t, ft: 'lowpass', f: 400, vol: 0.12, dest: musicBus });
  }
  function tek(t, v) {
    noise(0.05, { at: t, ft: 'bandpass', f: 3300, q: 2.5, vol: v || 0.16, dest: musicBus });
    tone(1150, 0.025, { at: t, type: 'triangle', vol: 0.05, dest: musicBus });
  }
  function ka(t, v) { noise(0.035, { at: t, ft: 'bandpass', f: 2300, q: 2, vol: v || 0.07, dest: musicBus }); }
  function reed(t, m, len, v) { // Zurna/Ney-artige Melodiestimme
    tone(midi(m), len, { at: t, type: 'sawtooth', vol: v || 0.035, lp: 2400, vib: 5.5, vibDepth: 9, a: 0.02, dest: musicBus });
  }

  const Music = {
    playing: false, step: 0, nextTime: 0, timer: null,
    st: { mode: 'menu', level: 1, combo: 0, boss: false, panic: false, area: 'street', style: 'arcade', rush: false, slow: false },
    bpm() {
      const s = this.st;
      let b;
      if (s.mode === 'menu') b = s.style === 'orient' ? 96 : 100;
      else if (s.boss) b = 156;
      else b = Math.min(172, 116 + (s.level - 1) * 7 + Math.min(s.combo, 60) * 0.3);
      if (s.rush) b += 16;
      if (s.slow) b *= 0.8;
      return b;
    },
    start(mode) {
      if (!ensure()) return;
      if (mode) this.st.mode = mode;
      if (this.playing) return;
      this.playing = true; this.step = 0;
      this.nextTime = ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.tick(), 25);
    },
    stop() { this.playing = false; clearInterval(this.timer); this.timer = null; },
    set(o) { Object.assign(this.st, o); },
    tick() {
      if (!ctx || !this.playing) return;
      if (ctx.state !== 'running') { this.nextTime = ctx.currentTime + 0.05; return; }
      if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.02; // Tab war im Hintergrund
      while (this.nextTime < ctx.currentTime + 0.12) {
        this.play(this.step, this.nextTime);
        this.nextTime += 60 / this.bpm() / 4;
        this.step = (this.step + 1) % 64;
      }
    },
    play(step, t) {
      const s = this.st;
      const st16 = step % 16;
      const bar = Math.floor(step / 16) % 4;
      const prog = s.boss ? PROG.boss : s.mode === 'menu' ? PROG.menu : PROG.normal;
      const chord = prog[bar];
      const stepLen = 60 / this.bpm() / 4;
      if (st16 === 0) Ambience.onBar(t);
      if (!settings.music) return;
      if (s.style === 'orient') return this.playOrient(step, t, stepLen);

      if (s.mode === 'menu') {
        if (st16 === 0 || st16 === 10) kick(t, 0.45);
        if (st16 === 4 || st16 === 12) snare(t, 0.12);
        if (st16 % 2 === 0) hat(t, false, 0.035);
        if ([0, 3, 6, 10, 12].includes(st16)) bass(t, chord[0] - (st16 === 12 ? -12 : 0), stepLen * 1.8, false);
        if (st16 % 4 === 2) lead(t, chord[1 + ((st16 / 4) | 0) % 3] + 12, stepLen * 1.5, 0.03);
        return;
      }

      const combo = s.combo;
      const four = combo >= 10 || s.boss || s.level >= 5;
      if (four ? st16 % 4 === 0 : (st16 === 0 || st16 === 8 || st16 === 10)) kick(t, 0.7);
      if (st16 === 4 || st16 === 12) snare(t);
      if (s.boss && (st16 === 14 || st16 === 15)) snare(t, 0.1);
      const hatDense = combo >= 5 || s.level >= 3 || s.boss;
      if (hatDense || st16 % 2 === 0) hat(t, st16 % 8 === 6, 0.05);
      if (s.panic) { hat(t + stepLen / 2, false, 0.07); if (st16 % 2 === 0) lead(t, 96, stepLen * 0.5, 0.02); }

      const bassSteps = s.boss ? [0, 2, 3, 6, 8, 10, 11, 14] : [0, 3, 6, 8, 11, 14];
      if (bassSteps.includes(st16)) bass(t, chord[0] + (st16 === 6 || st16 === 14 ? 12 : 0), stepLen * 1.6, s.boss);

      const arpOn = combo >= 10 || s.level >= 4 || s.boss;
      const dense = combo >= 20 || s.level >= 6;
      if (arpOn && (dense || st16 % 2 === 0)) {
        const notes = [chord[1], chord[2], chord[3], chord[2] + 12];
        lead(t, notes[(step >> (dense ? 0 : 1)) % 4] + 12, stepLen * 0.9);
      }
      if (s.boss && st16 === 0) chord.slice(1).forEach((m) => tone(midi(m + 12), stepLen * 6, { at: t, type: 'sawtooth', vol: 0.025, lp: 2200, dest: musicBus }));
      if (combo >= 30 && st16 === 0) noise(stepLen * 8, { at: t, ft: 'highpass', f: 5000, vol: 0.025, a: stepLen * 6, dest: musicBus });
    },
  };

  /** Orient-Stil: Darbuka im Maqsum-Rhythmus, Bordun, Hijaz-Melodie */
  Music.playOrient = function (step, t, stepLen) {
    const s = this.st;
    const st16 = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const menu = s.mode === 'menu';
    const hot = s.boss || s.rush || s.combo >= 20 || s.level >= 6;
    // Maqsum: DUM tek . tek DUM . tek .
    if (st16 === 0 || st16 === 8) doum(t, menu ? 0.4 : 0.6);
    if (s.boss && (st16 === 3 || st16 === 11)) doum(t, 0.45);
    if (st16 === 2 || st16 === 6 || st16 === 12) tek(t, menu ? 0.1 : 0.16);
    if (!menu && (st16 === 4 || st16 === 10 || st16 === 14) && (s.combo >= 5 || s.level >= 3 || hot)) ka(t);
    if (hot && st16 % 2 === 1) ka(t, 0.05);
    if (s.rush) noise(0.03, { at: t, ft: 'highpass', f: 8500, vol: 0.05, dest: musicBus }); // Tamburin
    if (s.panic) { tek(t + stepLen / 2, 0.1); }
    // Bordun
    if (st16 === 0) {
      const root = DRONE[bar];
      tone(midi(root), stepLen * 15, { at: t, type: 'sawtooth', vol: menu ? 0.05 : 0.07, lp: 520, dest: musicBus });
      tone(midi(root + 7), stepLen * 15, { at: t, type: 'triangle', vol: 0.03, dest: musicBus });
    }
    // Melodie
    const melodyOn = menu ? bar % 2 === 0 : s.combo >= 3 || s.level >= 2 || s.boss || s.rush;
    const idx = MELODY[bar][st16];
    if (melodyOn && idx != null) {
      let len = stepLen * 1.8;
      if (MELODY[bar][(st16 + 1) % 16] == null) len = stepLen * 2.6;
      const octave = hot && !menu ? 12 : 0;
      reed(t, HIJAZ[idx] + octave, len, menu ? 0.028 : 0.036);
    }
    if (!menu && hot && st16 % 2 === 0 && idx == null) reed(t, HIJAZ[(step >> 1) % 5] + 12, stepLen * 0.8, 0.018);
  };

  /* ---------------- Ambience pro Bereich ---------------- */
  const Ambience = {
    area: 'menu', active: false,
    set(area, active) { this.area = area; this.active = active; },
    onBar(t) {
      if (!this.active || !settings.sfx) return;
      const a = this.area;
      const r = Math.random();
      const o = (x) => Object.assign({ at: t + Math.random() * 0.8, dest: ambBus }, x);
      if (a === 'doener') {
        if (r < 0.7) for (let i = 0; i < 6; i++) noise(0.03, o({ ft: 'highpass', f: 4000 + Math.random() * 3000, vol: 0.05 }));
        if (r < 0.25) noise(1.4, o({ ft: 'highpass', f: 6000, vol: 0.03, a: 0.3 }));
      } else if (a === 'market') {
        if (r < 0.12) { tone(midi(79), 0.5, o({ type: 'sine', vol: 0.08 })); tone(midi(75), 0.7, { at: t + 0.5, type: 'sine', vol: 0.08, dest: ambBus }); }
        if (r > 0.6) noise(0.05, o({ ft: 'bandpass', f: 2600, q: 8, vol: 0.04 })); // Scanner an der Kasse
      } else if (a === 'airport') {
        if (r < 0.12) [76, 72, 79].forEach((m, i) => tone(midi(m), 0.45, { at: t + i * 0.35, type: 'sine', vol: 0.06, dest: ambBus }));
      } else if (a === 'night') {
        if (r < 0.6) for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 300, 0.04, o({ type: 'sine', vol: 0.02 }));
      } else if (a === 'mall') {
        if (r < 0.5) noise(1.6, o({ ft: 'bandpass', f: 500, q: 1.2, vol: 0.035, a: 0.5 }));
      } else if (a === 'mega') {
        if (r < 0.2) tone(700, 1.6, o({ type: 'sine', vol: 0.03, vib: 1.5, vibDepth: 140 }));
      } else if (a === 'street') {
        if (r < 0.07) SFX.honk();
      } else if (a === 'ramadan') {
        if (r < 0.35) SFX.clink();
        if (r > 0.75) noise(1.4, o({ ft: 'bandpass', f: 520, q: 1.2, vol: 0.03, a: 0.5 }));
      }
    },
  };

  HHD.Audio = {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    configure(s) {
      settings.volume = s.volume; settings.music = s.music; settings.sfx = s.sfx; settings.voice = s.voice !== false;
      applyVolumes();
    },
    /** Detector-Stimme: gibt true zurück, wenn wirklich gesprochen wird */
    say(word, o) {
      try { return say(word, o); } catch (e) { return false; }
    },
    voiceReady() { return Object.keys(voice.bufs).length; },
    setSkinPitch(p) { pitchMul = p || 1; },
    play(name, arg) {
      if (!ctx || !settings.sfx || ctx.state !== 'running') return;
      const f = SFX[name];
      if (f) { try { f(arg); } catch (e) { /* Audio darf das Spiel nie crashen */ } }
    },
    music: Music,
    ambience: Ambience,
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
  };
})();
