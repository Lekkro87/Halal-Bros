/* Halal Haram Detector – lokale Speicherung (localStorage) */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const KEY = 'hhd_save_v1';

  const DEFAULTS = () => ({
    version: 1,
    name: 'BRUDER',
    xp: 0,
    coins: 0,
    owned: ['default'],
    skin: 'default',
    area: 'street',
    mode: 'normal',
    tutorialDone: false,
    eggFound: false,
    settings: {
      volume: 0.8,
      music: true,
      sfx: true,
      voice: true,
      swipe: false,
      reduceMotion: false,
      reduceFx: false,
      bigButtons: false,
      patterns: false,
      musicStyle: 'auto',
    },
    bests: { score: 0, combo: 0, fastest: 0, correct: 0, aura: 0, fastestCheck: 0 },
    daily: { date: '', score: 0 },
    boards: {},
    stats: { games: 0, correct: 0, wrong: 0, checks: 0, bosses: 0, legendary: 0, maxCombo: 0 },
    // 2.0
    pu: { xray: 1, slowmo: 1, dua: 1, freeze: 1, joker: 1 },
    seen: {},
    st2: {},
    ach: {},
    missions: { date: '', list: [] },
    bonusDate: '',
    // 3.0
    modeBests: {},
    modesPlayed: {},
    dailyCh: { date: '', best: 0, tries: 0 },
  });
  const DYNAMIC = ['boards', 'seen', 'st2', 'ach', 'modeBests', 'modesPlayed'];

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in saved)) continue;
      const b = base[k];
      const s = saved[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && s && typeof s === 'object' && !Array.isArray(s)) {
        base[k] = merge(b, s);
      } else if (s !== null && (Array.isArray(b) ? Array.isArray(s) : typeof s === typeof b)) {
        base[k] = s;
      }
    }
    // Maps mit dynamischen Keys (Ranglisten, Lexikon, Statistiken, Erfolge) komplett übernehmen
    for (const k of DYNAMIC) {
      if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k])) base[k] = saved[k];
    }
    return base;
  }

  const Store = {
    data: DEFAULTS(),
    available: true,

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.fresh = !raw;
        this.data = raw ? merge(DEFAULTS(), JSON.parse(raw)) : DEFAULTS();
      } catch (e) {
        this.available = false;
        this.data = DEFAULTS();
      }
      if (this.data.daily.date !== HHD.U.today()) this.data.daily = { date: HHD.U.today(), score: 0 };
      return this.data;
    },

    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        this.available = false;
      }
    },

    reset() {
      const keepSettings = this.data.settings;
      this.data = DEFAULTS();
      this.data.settings = keepSettings;
      this.save();
    },

    get settings() { return this.data.settings; },

    /* Spieler-Level aus XP (für die Anzeige) */
    playerLevel() {
      const xp = this.data.xp;
      let lvl = 1, need = 300, acc = 0;
      while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
      return { lvl, into: xp - acc, need };
    },

    areaUnlocked(area) { return !area.hidden && this.data.xp >= area.xp; },

    /** Tages-Challenge: bester Wert des heutigen Tages (gibt true zurück, wenn neu) */
    recordDaily(score) {
      const c = this.data.dailyCh, today = HHD.U.today();
      if (c.date !== today) { c.date = today; c.best = 0; c.tries = 0; }
      c.tries++;
      const isNew = score > c.best;
      if (isNew) c.best = score;
      this.save();
      return isNew;
    },
    dailyToday() {
      const c = this.data.dailyCh;
      return c.date === HHD.U.today() ? c : { date: HHD.U.today(), best: 0, tries: 0 };
    },

    /**
     * Speichert eine beendete Runde. Gibt zurück, welche Rekorde neu sind.
     */
    recordRun(run) {
      const d = this.data;
      const news = {};
      const B = d.bests;
      if (run.score > B.score) { B.score = run.score; news.score = true; }
      if (run.maxCombo > B.combo) { B.combo = run.maxCombo; news.combo = true; }
      if (run.fastest > 0 && (B.fastest === 0 || run.fastest < B.fastest)) { B.fastest = run.fastest; news.fastest = true; }
      if (run.correct > B.correct) { B.correct = run.correct; news.correct = true; }
      if (run.aura > B.aura) { B.aura = run.aura; news.aura = true; }
      if (run.fastestCheck > 0 && (B.fastestCheck === 0 || run.fastestCheck < B.fastestCheck)) { B.fastestCheck = run.fastestCheck; news.fastestCheck = true; }

      const today = HHD.U.today();
      if (d.daily.date !== today) d.daily = { date: today, score: 0 };
      if (run.score > d.daily.score) { d.daily.score = run.score; news.daily = true; }
      // Bestwert je Spielmodus
      if (run.mode && run.score > (d.modeBests[run.mode] || 0)) { d.modeBests[run.mode] = run.score; news.modeBest = true; }

      // Ranglisten (Top 10 je Kategorie)
      const entry = { name: d.name, date: today, score: run.score, area: run.areaName };
      for (const b of HHD.DATA.BOARDS) {
        const val = { score: run.score, combo: run.maxCombo, fastest: run.fastest, correct: run.correct, aura: run.aura, fastestCheck: run.fastestCheck }[b.id];
        if (!val || val <= 0) continue;
        const list = (d.boards[b.id] = d.boards[b.id] || []);
        list.push(Object.assign({ value: val, fresh: Date.now() }, entry));
        list.sort((x, y) => (b.asc ? x.value - y.value : y.value - x.value));
        list.length = Math.min(list.length, 10);
      }

      d.stats.games++;
      d.stats.correct += run.correct;
      d.stats.wrong += run.wrong;
      d.stats.checks += run.checks;
      d.stats.bosses += run.bosses;
      d.stats.legendary += run.legendary;
      d.stats.maxCombo = Math.max(d.stats.maxCombo, run.maxCombo);
      d.xp += run.xp;
      d.coins += run.coins;
      this.save();
      return news;
    },
  };

  HHD.Store = Store;
})();
