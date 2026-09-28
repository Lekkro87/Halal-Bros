/* Halal Haram Detector – Meta-Systeme: Tagesaufgaben, Erfolge, Lexikon, Ränge, Tagesbonus */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;
  const D = HHD.DATA;

  // Kleiner deterministischer Zufall für die Tagesaufgaben (gleicher Tag = gleiche Aufgaben)
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const Meta = {
    queue: [],
    showing: false,
    el: null,

    init() {
      this.el = document.getElementById('ach-pop');
      this.ensureMissions();
      // Lexikon-Stand einmal mit dem Erfolg abgleichen (z. B. nach einem Update)
      this.max('lexPct', this.lexPct(), true);
    },
    get S() { return HHD.Store.data; },

    /* ---------- Ränge ---------- */
    title(lvl) {
      let t = D.TITLES[0][1];
      for (const [l, n] of D.TITLES) if (lvl >= l) t = n;
      return t;
    },

    /* ---------- Tagesaufgaben ---------- */
    ensureMissions() {
      const S = this.S;
      const today = U.today();
      if (S.missions && S.missions.date === today && S.missions.list && S.missions.list.length === 3) return;
      const r = rng(hash('hhd-' + today));
      const pool = D.MISSIONS.slice();
      const list = [];
      while (list.length < 3 && pool.length) {
        const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
        list.push({ id: m.id, prog: 0, done: false });
      }
      S.missions = { date: today, list };
      HHD.Store.save();
    },
    missions() {
      this.ensureMissions();
      return this.S.missions.list.map((m) => Object.assign({}, D.MISSIONS.find((d) => d.id === m.id), { prog: m.prog, done: m.done }));
    },
    missionsDone() { return this.missions().filter((m) => m.done).length; },

    /* ---------- Statistik-Tracking ---------- */
    /** Zähler erhöhen (lebenslang + Tagesaufgaben) */
    add(stat, n) {
      n = n == null ? 1 : n;
      const S = this.S;
      S.st2[stat] = (S.st2[stat] || 0) + n;
      this.progress(stat, n, false);
      this.checkAch(stat);
    },
    /** Bestwert setzen (z. B. höchste Combo einer Runde) */
    max(stat, v, silent) {
      const S = this.S;
      if (v > (S.st2[stat] || 0)) S.st2[stat] = v;
      if (!silent) this.progress(stat, v, true);
      this.checkAch(stat);
    },
    progress(stat, n, isMax) {
      this.ensureMissions();
      for (const m of this.S.missions.list) {
        if (m.done) continue;
        const def = D.MISSIONS.find((d) => d.id === m.id);
        if (!def || def.stat !== stat || !!def.max !== isMax) continue;
        m.prog = isMax ? Math.max(m.prog, n) : m.prog + n;
        if (m.prog >= def.goal) {
          m.prog = def.goal;
          m.done = true;
          this.reward(def.reward);
          this.popup('📅 TAGESAUFGABE ERFÜLLT', def.text, '+' + def.reward + ' 🪙');
        }
      }
    },
    checkAch(stat) {
      const S = this.S;
      for (const a of D.ACHIEVEMENTS) {
        if (a.stat !== stat || S.ach[a.id]) continue;
        if ((S.st2[stat] || 0) >= a.goal) {
          S.ach[a.id] = U.today();
          this.reward(a.reward);
          this.popup('🏅 ERFOLG: ' + a.name, a.desc, '+' + a.reward + ' 🪙', a.icon);
        }
      }
    },
    achCount() { return Object.keys(this.S.ach).length; },
    reward(coins) {
      this.S.coins += coins;
      HHD.Store.save();
    },

    /* ---------- Lexikon ---------- */
    lexEntries() {
      const ev = D.EVENTS;
      return D.ITEMS.concat(D.LEGENDARY, [ev.mystery, ev.grandma, ev.arabic, ev.doener17]);
    },
    lexPct() {
      const all = this.lexEntries();
      const seen = all.filter((i) => this.S.seen[i.id]).length;
      return Math.floor((seen / all.length) * 100);
    },
    see(id) {
      const S = this.S;
      if (!S.seen[id]) {
        S.seen[id] = 1;
        this.max('lexPct', this.lexPct(), true);
      } else {
        S.seen[id]++;
      }
    },

    /* ---------- Tagesbonus ---------- */
    dailyBonus() {
      const S = this.S;
      const today = U.today();
      if (S.bonusDate === today) return 0;
      S.bonusDate = today;
      const amount = 50;
      S.coins += amount;
      HHD.Store.save();
      return amount;
    },

    /* ---------- Popups (nacheinander) ---------- */
    popup(title, sub, reward, icon) {
      this.queue.push({ title, sub, reward, icon });
      if (!this.showing) this.next();
    },
    next() {
      const el = this.el;
      const p = this.queue.shift();
      if (!el || !p) { this.showing = false; return; }
      this.showing = true;
      el.innerHTML = '<span class="ap-icon">' + (p.icon || '🎁') + '</span><span class="ap-txt"><b>' + U.esc(p.title) + '</b><small>' + U.esc(p.sub) + '</small></span><em>' + U.esc(p.reward || '') + '</em>';
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      if (HHD.Audio) HHD.Audio.play('coin');
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => this.next(), 350);
      }, 2400);
    },
  };

  HHD.Meta = Meta;
})();
