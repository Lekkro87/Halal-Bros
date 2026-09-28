/* Halal Haram Detector – Gameplay-Kern
 * Ablauf: Produkt erscheint → Detector scannt → Spieler entscheidet (HALAL / INGREDIENTS / HARAM)
 * → Feedback → nächstes Produkt, immer schneller.
 * 2.0: Modi (Normal, Ramadan, Hardcore, Üben), Iftar Rush, Mama-Anruf, Halal-Polizei,
 *      Terlik-Wurf, Boss „Mamas Terlik“, Endlos-Bosse, Power-ups, Missionen & Erfolge.
 * 3.0: Zeitjagd, Chaos (Störungen), Zutaten-Profi, Boss-Marathon, Kiosk-Schicht, Tages-Challenge,
 *      Bosse Automat/Tante/Hochzeit, Stromausfall, Blitzangebot, Hochzeitskorso, Eiszeit & Joker.
 */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;
  const D = HHD.DATA;
  const A = HHD.Audio;
  const FX = HHD.FX;
  const Art = HHD.Art;
  const W = HHD.World;
  const Meta = HHD.Meta;

  const ENTER = 0.18; // Flug-Animation des Produkts (in der Entscheidungszeit enthalten)
  const CHOICE_LABEL = { halal: '✅ HALAL', haram: '❌ HARAM', check: '🔎 INGREDIENTS' };
  const RAMADAN_PLACES = ['iftar', 'basar', 'zuhause'];
  const ORDER = ['halal', 'check', 'haram'];
  const KEY_HINTS = ['← A', '↓ S', '→ D'];

  const G = {
    el: {},
    state: 'idle',
    run: null,
    cur: null,
    chk: null,
    call: null,
    timers: [],
    gameTime: 0,
    paused: false,
    tutorial: null,

    init() {
      const $ = (id) => document.getElementById(id);
      const e = this.el;
      ['stage', 'det-slot', 'item-slot', 'queue', 'loc-tag', 'presenter', 'meme', 'disrupt', 'bubbles', 'floaters', 'banner',
        'ing', 'ing-pack', 'ing-title', 'ing-sub', 'ing-bar', 'ing-window', 'ing-list', 'ing-tag', 'controls',
        'hud-score', 'hud-combo', 'hud-mult', 'hud-aura', 'hud-time', 'hud-timebar', 'hud-lives', 'hud-level',
        'boss-hud', 'boss-hp', 'boss-hp-text', 'boss-name', 'boss', 'boss-say', 'pause', 'tut-hint', 'scr-game', 'app',
        'call', 'call-text', 'pu-bar', 'xray-hint'].forEach((id) => { e[id] = $(id); });
      e.btns = {};
      document.querySelectorAll('#controls .dbtn').forEach((b) => { e.btns[b.dataset.choice] = b; });
      FX.floatLayer = e.floaters;
      FX.banner = e.banner;
      FX.shakeEl = e['scr-game'];
      e['ing-list'].addEventListener('click', (ev) => {
        const li = ev.target.closest('.ing-chip');
        if (li) this.tapIngredient(+li.dataset.i, li);
      });
      const win = e['ing-window'];
      const stopAuto = () => { if (this.chk) this.chk.user = true; };
      win.addEventListener('wheel', stopAuto, { passive: true });
      win.addEventListener('touchstart', stopAuto, { passive: true });
      e['pu-bar'].addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-pu]');
        if (b) this.usePowerup(b.dataset.pu);
      });
    },

    /* ---------- interne Timer (pausierbar) ---------- */
    after(sec, fn) { this.timers.push({ t: sec, fn }); },
    clearTimers() { this.timers.length = 0; },

    /* ---------- Detector-Anzeige ---------- */
    det(text, sub, cls) {
      const d = this.el['det-slot'].querySelector('.det');
      if (!d) return;
      d.querySelector('.det-text').textContent = text;
      d.querySelector('.det-sub').textContent = sub || '';
      d.classList.remove('ok', 'err', 'scan', 'warn');
      if (cls) d.classList.add(cls);
    },
    renderDetector() {
      this.el['det-slot'].innerHTML = Art.detectorHTML(HHD.Store.data.skin);
    },

    /** Tracking nur außerhalb des Übungsmodus (sonst ließen sich Aufgaben „farmen“) */
    track(stat, n) { if (this.run && this.run.mode !== 'zen' && !this.tutorial) Meta.add(stat, n); },
    trackMax(stat, v) { if (this.run && this.run.mode !== 'zen' && !this.tutorial) Meta.max(stat, v); },

    /** Einstellungen des aktuellen Spielmodus (D.MODES) */
    cfg() { return (this.run && D.MODES[this.run.mode]) || D.MODES.normal; },
    /** Aktueller Schauplatz – im Chaos-Modus wechselt er mit jeder Störung */
    areaId() { const r = this.run; return r ? r.areaOverride || r.level.area : 'street'; },
    /** Ist gerade diese Chaos-Störung aktiv? */
    mut(id) { const r = this.run; return !!(r && r.mutator && r.mutator.id === id); },
    /** Detector-Stimme: kurzer Satz (Level, Boss, Zeit …) */
    voiceLine(key, delay) { if (A.sayLine) A.sayLine(key, { delay: delay || 0 }); },

    musicStyle() {
      const s = HHD.Store.settings.musicStyle || 'auto';
      if (s !== 'auto') return s;
      const run = this.run;
      if (!run) return 'arcade';
      if (run.mode === 'ramadan' || run.rush || (run.boss && D.BOSSES[run.boss.kind].orient)) return 'orient';
      return ['doener', 'night', 'mega', 'wedding'].includes(this.areaId()) ? 'orient' : 'arcade';
    },

    /* ================= RUNDE STARTEN ================= */
    newRun(area, mode) {
      const M = D.MODES[mode] || D.MODES.normal;
      const levelIdx = area.level - 1;
      return {
        mode, areaId: area.id, startArea: area, levelIdx, level: D.LEVELS[levelIdx],
        lives: M.lives || 3, maxLives: M.maxLives || 5, score: 0, combo: 0, maxCombo: 0, aura: 0,
        correct: 0, wrong: 0, total: 0, checks: 0, fastest: 0, fastestCheck: 0, reactSum: 0, reactN: 0,
        itemsInLevel: 0, wrongStreak: 0, overchecks: [], boss: null, bossesDone: {}, bosses: 0, legendary: 0,
        queue: [], recent: [], lastTpl: null, updateJoke: false, heat: 0,
        rush: null, rushPending: false, slowmo: 0, shield: false, xray: false, day: 1, eid: false,
        calls: 0, lastEndlessBoss: 0, achBefore: Meta.achCount(),
        // 3.0
        clock: M.clock || 0, clockMax: M.clock || 0, tenSec: false, areaOverride: null,
        mutator: null, mutLeft: 0, mutCount: 0, order: ORDER.slice(), bossIdx: 0,
        served: 0, tips: 0, dailyIdx: 0, rng: null, sale: 0, blackout: 0, frozen: false, skipped: 0, result: null,
      };
    },

    start(areaId, mode) {
      mode = D.MODES[mode] ? mode : 'normal';
      const M = D.MODES[mode];
      const area = D.AREAS.find((a) => a.id === (M.area || areaId)) || D.AREAS[0];
      this.clearTimers();
      this.gameTime = 0;
      this.tutorial = null;
      this.run = this.newRun(area, mode);
      const run = this.run;
      if (M.daily) run.rng = U.seeded('hhd-daily-' + U.today());
      this.cur = null;
      this.chk = null;
      this.call = null;
      this.renderDetector();
      this.resetStage();
      this.el['scr-game'].dataset.mode = mode;
      W.setTheme(mode === 'ramadan' ? 'ramadan' : null);
      W.setArea(this.areaId());
      W.setIntensity(run.level.n);
      W.setScan(false); W.setOverview(false);
      this.el['scr-game'].classList.toggle('ramadan', mode === 'ramadan');
      A.music.set({ mode: 'game', level: run.level.n, combo: 0, boss: false, panic: false, rush: false, slow: false, style: this.musicStyle() });
      A.music.start('game');
      A.ambience.set(mode === 'ramadan' ? 'ramadan' : this.areaId(), true);
      this.hud();
      this.renderPowerups();
      this.state = 'cinematic';
      const L = run.level;
      const intro = {
        ramadan: ['RAMADAN MUBARAK 🌙', 'Sahur vorbei – Bismillah, los geht’s! · LEVEL ' + L.n, 'ramadan'],
        hardcore: ['💀 HARDCORE', 'EIN LEBEN. DOPPELTE PUNKTE. KEIN ERBARMEN.', 'bad'],
        zen: ['🧘 ÜBUNGSMODUS', 'Keine Zeit, keine Leben. Einfach lernen.', 'level'],
        daily: ['📅 TAGES-CHALLENGE', U.today().split('-').reverse().join('.') + ' · 30 Produkte · heute für alle gleich', 'level'],
        zeit: ['⏱️ ZEITJAGD', '60 SEKUNDEN · RICHTIG +0,5 s · CHECK +1,5 s · FEHLER −3 s', 'combo'],
        chaos: ['🌀 CHAOS-MODUS', 'Alle 6 Produkte eine neue Störung!', 'event'],
        profi: ['📜 ZUTATEN-PROFI', 'Nur Zutatenlisten. Lesen, finden, entscheiden.', 'level'],
        bossrush: ['👑 BOSS-MARATHON', '5 Bosse · 3 Leben · kein Zurück', 'boss'],
        kiosk: ['🏪 KIOSK-SCHICHT', '25 Kunden · 5 Sterne · Trinkgeld für schnelle Antworten', 'level'],
      }[mode];
      if (intro) FX.showBanner(intro[0], intro[1], intro[2], 1600);
      else this.levelBanner();
      if (mode === 'ramadan') { FX.emojiRain(['🌙', '⭐', '✨'], 30); this.track('ramadanRun'); }
      if (M.daily) this.track('dailyRun');
      if (mode !== 'normal') { A.play('levelUp'); this.el['scr-game'].classList.toggle('apoc', L.n === 7); }
      // Welche Modi schon gespielt wurden (Erfolg „Allrounder“)
      if (!this.tutorial && mode !== 'zen') {
        const S = HHD.Store.data;
        S.modesPlayed[mode] = 1;
        Meta.max('modesPlayed', Object.keys(S.modesPlayed).length, true);
      } else if (mode === 'zen') {
        HHD.Store.data.modesPlayed.zen = 1;
      }
      this.det('BISMILLAH', M.clock ? 'UHR LÄUFT GLEICH' : 'DETECTOR BEREIT', 'ok');
      this.after(mode === 'normal' ? 1.35 : 1.65, () => this.next());
    },

    resetStage() {
      const e = this.el;
      if (this.cur && this.cur.el) Art.releaseItemEl(this.cur.el);
      e['item-slot'].innerHTML = '';
      e.queue.innerHTML = '';
      e.disrupt.innerHTML = '';
      e.bubbles.innerHTML = '';
      e.presenter.className = 'presenter';
      e['loc-tag'].className = 'loc-tag';
      e.meme.className = 'meme';
      e.ing.hidden = true;
      e.ing.className = 'ing';
      e['boss-hud'].hidden = true;
      e.boss.className = 'boss';
      e['tut-hint'].hidden = true;
      e.call.hidden = true;
      e['xray-hint'].hidden = true;
      e['pu-bar'].hidden = true;
      e['scr-game'].classList.remove('frozen', 'zoomout', 'boss-mode', 'apoc', 'slowmo', 'ramadan', 'rush', 'blackout', 'ice');
      D.MUTATORS.forEach((m) => e['scr-game'].classList.remove('mut-' + m.id));
      delete e['scr-game'].dataset.mode;
      W.setRush(false);
      this.applyOrder(ORDER);
      this.setControlsMode('decide');
      FX.hideBanner();
    },

    /* ---------- Tasten-Reihenfolge (Chaos: Spiegel & Mischmasch) ---------- */
    applyOrder(order) {
      order = order || (this.run && this.run.order) || ORDER;
      const b = this.el.btns;
      if (!b || !b.halal) return;
      order.forEach((k, i) => {
        b[k].style.order = i;
        const kb = b[k].querySelector('kbd');
        if (kb) kb.textContent = KEY_HINTS[i];
      });
    },
    /** Entscheidung an einer Tasten-Position (0 = links, 1 = Mitte, 2 = rechts) – für Tastatur & Swipe */
    choiceAt(pos) {
      const o = (this.run && !this.tutorial && this.run.order) || ORDER;
      return o[pos] || ORDER[pos];
    },

    levelBanner() {
      const L = this.run.level;
      const area = D.AREAS.find((a) => a.id === this.areaId());
      FX.showBanner('LEVEL ' + L.n + ' – ' + L.name, '📍 ' + area.name + (L.n === 7 ? ' · ALLES IST CHAOS' : ''), 'level', 1300);
      this.det('LEVEL ' + L.n, L.name);
      A.play('levelUp');
      this.el['scr-game'].classList.toggle('apoc', L.n === 7);
    },

    /* ================= PRODUKT-AUSWAHL ================= */
    areaPlaces() {
      const area = D.AREAS.find((a) => a.id === this.areaId());
      const places = area ? area.places : [];
      return this.run.mode === 'ramadan' ? places.concat(RAMADAN_PLACES) : places;
    },

    pickTemplate(opts) {
      const run = this.run, L = run.level, M = this.cfg();
      opts = opts || {};
      // Zwilling (ähnlich aussehendes Produkt direkt danach)
      const last = run.lastTpl;
      if (!opts.boss && last && last.twin && U.chance(L.twin)) {
        const tw = D.ITEMS.find((i) => i.id === last.twin);
        if (tw && tw.tier <= L.n + 1 && !run.recent.slice(-2).includes(tw.id) && (!M.checkOnly || tw.ans === 'check')) return tw;
      }
      const wantCheck = M.checkOnly || U.chance(opts.boss ? 0.35 : L.checkShare);
      let places = this.areaPlaces();
      if (opts.boss && run.boss) places = D.BOSSES[run.boss.kind].places;
      let cands = D.ITEMS.filter((i) => i.tier <= L.n && (wantCheck ? i.ans === 'check' : i.ans !== 'check') && !run.recent.includes(i.id));
      if (!cands.length) cands = D.ITEMS.filter((i) => i.tier <= L.n);
      const weights = cands.map((i) => {
        let w = i.places.some((p) => places.includes(p)) ? 3 : 1;
        if (i.tier >= L.n - 1) w *= 1.5;
        if (run.mode === 'ramadan' && i.iftar) w *= 2.5;
        return w;
      });
      return U.weighted(cands, weights);
    },

    /** Baut aus einer Vorlage eine konkrete Produkt-Instanz (Variante, Ort, NPC, Störung, Zeit) */
    makeInstance(tpl, extra) {
      const run = this.run, L = run.level;
      extra = extra || {};
      const M = this.cfg();
      const inst = { tpl, id: tpl.id, name: tpl.name, ans: tpl.ans, art: tpl.art, legend: !!tpl.legend, event: extra.event || null };
      const places = this.areaPlaces();
      const inArea = tpl.places.filter((p) => places.includes(p));
      inst.place = U.pick(inArea.length ? inArea : tpl.places);
      if (tpl.ans === 'check') inst.variant = this.buildVariant(tpl, extra.forceVerdict);
      inst.isTwin = !!(run.lastTpl && run.lastTpl.twin === tpl.id);
      // Präsentierender NPC
      if (tpl.npc) { inst.npc = tpl.npc; inst.npcLine = tpl.npcLine; }
      else if (extra.npc) { inst.npc = extra.npc; inst.npcLine = extra.npcLine; }
      else if (M.kiosk) {
        // Kiosk-Schicht: jeder Kunde fragt nach
        inst.npc = U.pick(D.KIOSK.customers);
        inst.npcLine = U.pick(D.KIOSK.ask[inst.npc]);
      } else {
        const family = run.mode === 'ramadan' && U.chance(0.35);
        const pool = family ? ['mama', 'tante', 'onkel', 'bruder'] : D.PLACE_NPCS[inst.place] || ['shopper'];
        const p = family ? 1 : inst.place === 'doener' ? 0.65 : 0.28;
        if (U.chance(p)) {
          inst.npc = U.pick(pool);
          const n = D.NPCS[inst.npc];
          inst.npcLine = inst.npc === 'meister' && U.chance(0.5) ? 'BRUDER, WAS WILLST DU?' : U.pick(n.lines);
        }
      }
      // Zufällige Störungen
      if (!extra.noDisrupt && !inst.event && !inst.legend && U.chance(L.events)) {
        const opts = ['bus', 'npc', 'hand'];
        if (L.n >= 2) opts.push('cat', 'corso');
        if (L.n >= 3) opts.push('flip', 'partial');
        if (L.n >= 4) opts.push('fly');
        inst.disrupt = U.pick(opts);
      }
      // Entscheidungszeit
      const prog = L.items === Infinity ? Math.min(1, run.itemsInLevel / 60) : Math.min(1, run.itemsInLevel / L.items);
      let t = U.lerp(L.time, L.minTime, prog);
      if (tpl.art.t !== 'emoji') t *= 1.15;
      if (inst.isTwin) t *= 1.1;
      if (inst.disrupt) t *= inst.disrupt === 'flip' || inst.disrupt === 'partial' ? 1.25 : 1.15;
      if (inst.event) t *= 1.5;
      if (inst.legend) t *= 1.3;
      if (extra.boss) t *= 0.95;
      inst.time = t + ENTER;
      return inst;
    },

    /** Wählt eine Zutaten-Variante und füllt sie je nach Level mit harmlosen Zutaten auf */
    buildVariant(tpl, forceVerdict) {
      const L = this.run.level;
      if (tpl.id === 'doener17') return this.buildDoener17();
      let vs = tpl.v;
      if (forceVerdict) vs = vs.filter((v) => v[0] === forceVerdict);
      const v = U.pick(vs.length ? vs : tpl.v);
      const list = v[1].map((x) => {
        if (Array.isArray(x)) { const flag = x[0][0] === '!'; return { ar: flag ? x[0].slice(1) : x[0], text: x[1], flag }; }
        const flag = x[0] === '!';
        return { text: flag ? x.slice(1) : x, flag };
      });
      if (!tpl.arabic && tpl.fill !== 'none' && !this.tutorial) {
        const target = U.randInt(L.listLen[0], L.listLen[1]);
        const pool = U.shuffle((D.FILL[tpl.fill] || D.FILL.savory).concat(L.n >= 6 ? D.FILL.weird : []));
        for (const f of pool) {
          if (list.length >= target) break;
          if (list.some((x) => x.text === f)) continue;
          list.splice(U.randInt(0, list.length), 0, { text: f, flag: false });
        }
        // In höheren Levels versteckt sich das Problem gern weiter unten
        const fi = list.findIndex((x) => x.flag);
        if (fi >= 0 && L.n >= 4 && U.chance(0.55)) {
          const [f] = list.splice(fi, 1);
          list.splice(U.randInt(Math.floor(list.length * 0.6), list.length), 0, f);
        }
      }
      return { verdict: v[0], list, note: v[2] || null };
    },

    buildDoener17() {
      const list = [{ text: 'Fladenbrot', flag: false }, { text: 'Kalbfleisch (halal-zertifiziert)', flag: false }];
      const sauces = U.shuffle(D.SAUCES17).slice(0, 17).map((s) => ({ text: s, flag: false }));
      let verdict = 'halal';
      if (U.chance(0.5)) {
        verdict = 'haram';
        sauces[U.randInt(6, 16)] = { text: 'Whiskey-BBQ-Soße (mit Whiskey)', flag: true };
      }
      return { verdict, list: list.concat(sauces), note: verdict === 'halal' ? '17 SOSSEN. ALLE OKAY. DER DETECTOR BRAUCHT EINE PAUSE.' : null };
    },

    /** Seltene Events würfeln */
    rollSpecial() {
      const run = this.run, n = run.level.n, area = this.areaId();
      const ram = run.mode === 'ramadan';
      const onlyCheck = this.cfg().checkOnly;
      if (!onlyCheck && U.chance(0.008)) return this.makeInstance(U.pick(D.LEGENDARY), { noDisrupt: true });
      if (n >= 2 && U.chance(area === 'doener' ? 0.015 : 0.005)) return this.makeInstance(D.EVENTS.doener17, { event: 'doener17' });
      if (n >= 2 && U.chance(0.01)) return this.makeInstance(D.EVENTS.mystery, { event: 'mystery' });
      if (n >= 2 && U.chance(ram ? 0.025 : 0.012)) {
        const c = U.pick(D.EVENTS.grandma.cooks);
        const tpl = Object.assign({}, D.EVENTS.grandma, { name: c.name, art: c.art, npc: c.npc, npcLine: c.line });
        return this.makeInstance(tpl, { event: 'grandma' });
      }
      if (n >= 3 && U.chance(0.01)) return this.makeInstance(D.EVENTS.arabic, { event: 'arabic' });
      if (n >= 2 && U.chance(0.012)) {
        const cands = D.ITEMS.filter((i) => i.ans === 'check' && i.tier <= n);
        return this.makeInstance(U.pick(cands), { event: 'trust', npc: 'bro', npcLine: U.pick(D.NPCS.bro.lines) });
      }
      if (!onlyCheck && n >= 2 && U.chance(0.011)) {
        const cands = D.ITEMS.filter((i) => i.ans === 'halal' && i.cat !== 'zert' && i.tier <= n);
        return this.makeInstance(U.pick(cands), { event: 'police', npc: 'polizei', npcLine: U.pick(D.NPCS.polizei.lines), noDisrupt: true });
      }
      return null;
    },

    /** Tages-Challenge: gleicher Tag = gleiche Produkte (Zufall wird dafür kurz „festgenagelt“) */
    generate(opts) {
      const rng = this.run.rng;
      if (!rng) return this.generateItem(opts);
      const orig = Math.random;
      Math.random = rng;
      try { return this.generateItem(opts); } finally { Math.random = orig; }
    },
    generateItem(opts) {
      const run = this.run;
      let inst = !opts.boss ? this.rollSpecial() : null;
      if (!inst) inst = this.makeInstance(this.pickTemplate(opts), opts);
      if (!inst.event && !opts.boss && run.level.n >= 2 && U.chance(0.008)) inst.pigeon = true;
      this.remember(inst);
      return inst;
    },
    remember(inst) {
      const run = this.run;
      run.lastTpl = inst.tpl;
      run.recent.push(inst.id);
      if (run.recent.length > 7) run.recent.shift();
    },

    /* ================= NÄCHSTES PRODUKT ================= */
    next() {
      const run = this.run;
      if (!run || this.state === 'over') return;
      const L = run.level, M = this.cfg();
      const zen = run.mode === 'zen';
      if (run.rush) {
        if (run.rush.left <= 0) return this.endRush();
      } else if (!run.boss) {
        // Modus-Ziele
        if (M.bossRush) return this.nextBossRush();
        if (M.daily && run.dailyIdx >= M.items) return this.finish('daily');
        if (M.kiosk && run.served >= M.customers) return this.finish('kiosk');
        if (run.itemsInLevel >= (M.perLevel || L.items)) {
          if (L.boss && !run.bossesDone[L.n] && !zen && !M.noBoss) return this.startBoss(L.n >= 6 ? 'terlik' : 'market');
          return this.levelUp();
        }
        // Level 7: alle 25 Produkte ein Endlos-Boss (reihum alle Bosse)
        if (L.n === 7 && !zen && !M.noBoss && run.itemsInLevel > 0 && run.itemsInLevel % 25 === 0 && run.lastEndlessBoss !== run.itemsInLevel) {
          run.lastEndlessBoss = run.itemsInLevel;
          return this.startBoss(U.pick(Object.keys(D.BOSSES)), 150);
        }
        if (M.chaos && run.mutLeft <= 0) return this.newMutator();
        if (!zen && !M.noExtras) {
          if (run.rushPending) { run.rushPending = false; return this.startRush(); }
          if (L.n >= 2 && U.chance(run.mode === 'ramadan' ? 0.008 : 0.005)) return this.startRush();
          if (L.n >= 2 && U.chance(0.009)) return this.mamaCall();
          if (L.n >= 3 && !run.updateJoke && U.chance(0.006)) return this.updateJoke();
          this.rollWorldEvent();
        }
      }

      this.clearItem();
      const e = this.el;
      if (e.stage.scrollTop) e.stage.scrollTop = 0;
      if (e['scr-game'].scrollTop) e['scr-game'].scrollTop = 0;
      let inst;
      if (run.rush) {
        inst = this.generateRush();
      } else if (run.boss) {
        inst = this.generate({ boss: true });
        inst.from = run.boss.side = run.boss.side === 'left' ? 'right' : 'left';
      } else {
        const want = L.preview;
        while (run.queue.length < want + 1) run.queue.push(this.generate({}));
        inst = run.queue.shift();
        while (run.queue.length < want) run.queue.push(this.generate({}));
        if (M.daily) run.dailyIdx++;
        if (M.kiosk) run.served++;
        if (M.chaos) run.mutLeft--;
      }
      // Entscheidungszeit je Modus / Störung
      if (zen || M.clock) inst.time = Infinity;
      else {
        if (this.mut('turbo')) inst.time = (inst.time - ENTER) * 0.7 + ENTER;
        if (this.mut('slow')) inst.time = (inst.time - ENTER) * 1.35 + ENTER;
        if (run.slowmo > 0) { inst.time = (inst.time - ENTER) * 1.8 + ENTER; run.slowmo--; }
      }
      // Blitzangebot & Stromausfall zählen Produkte herunter
      if (run.sale > 0) { inst.sale = true; run.sale--; }
      if (run.blackout > 0) { inst.dark = true; run.blackout--; }
      if (this.mut('blackout')) inst.dark = true;
      e['scr-game'].classList.toggle('blackout', !!inst.dark);
      run.frozen = false;
      e['scr-game'].classList.remove('ice');
      if (this.mut('shuffle')) { run.order = U.shuffle(ORDER); this.applyOrder(); }
      this.cur = inst;
      inst.left = inst.time;
      inst.shownAt = this.gameTime;
      inst.decided = false;
      Meta.see(inst.id);

      // Produkt ins Bild bringen
      const el = Art.makeItemEl(inst, inst.from ? 'enter-' + inst.from : 'enter');
      if (inst.disrupt === 'flip') el.classList.add('flipped');
      if (inst.disrupt === 'partial') el.classList.add('partial');
      inst.el = el;
      e['item-slot'].appendChild(el);
      this.renderQueue();
      e['xray-hint'].hidden = true;

      // Ort
      e['loc-tag'].textContent = '📍 ' + (D.PLACES[inst.place] || '');
      U.restartAnim(e['loc-tag'], 'show');

      // NPC
      if (inst.npc) this.showPresenter(inst.npc, inst.npcLine);
      else e.presenter.className = 'presenter';

      e.meme.className = 'meme';
      this.setControlsMode('decide');
      this.renderPowerups();

      // Detector-Sequenz: BEEP → SCANNING... → ???
      A.play('beep');
      this.det('BEEP', '', 'scan');
      this.scanFx();
      this.after(0.08, () => { if (this.cur === inst && !inst.decided) { this.det('SCANNING...', '', 'scan'); A.play('scan'); } });
      this.after(0.3, () => {
        if (this.cur !== inst || inst.decided) return;
        if (inst.event === 'trust') this.det('TRUST LEVEL: 0%', 'SELBST PRÜFEN!', 'warn');
        else if (inst.event === 'police') this.det('HALAL-POLIZEI?!', 'SELBST PRÜFEN!', 'warn');
        else if (inst.event === 'doener17') { this.det('SYSTEM OVERLOAD', '17 SOSSEN ERKANNT', 'warn'); A.play('overload'); FX.shake('big'); }
        else if (inst.event === 'mystery') this.det('???', 'INHALT: UNBEKANNT', 'warn');
        else if (inst.event === 'arabic') this.det('???', 'SPRACHE: ARABISCH', 'warn');
        else if (inst.event === 'grandma') this.det('???', 'HAUSGEMACHT – TROTZDEM PRÜFEN', 'warn');
        else if (inst.legend) this.det('LEGENDARY!', 'SELTENHEIT: 0,8%', 'ok');
        else if (inst.rush) this.det('???', 'IFTAR RUSH · ×2', 'ok');
        else if (this.mut('liar')) {
          // Lügen-Anzeige: rät nur – in der Hälfte der Fälle falsch
          const guess = U.chance(0.5) ? inst.ans : U.pick(ORDER.filter((c) => c !== inst.ans));
          this.det(guess === 'check' ? 'CHECKEN?!' : guess.toUpperCase() + '!!', 'ANZEIGE UNZUVERLÄSSIG', 'warn');
        } else if (inst.sale) this.det('???', 'BLITZANGEBOT ×2', 'ok');
        else if (inst.dark) this.det('???', 'AKKU-BETRIEB', 'warn');
        else this.det('???', run.boss ? 'BOSS-PRODUKT' : M.kiosk ? 'KUNDE WARTET' : '');
      });

      if (inst.legend) { A.play('legendary'); FX.showBanner('✦ LEGENDARY ITEM ✦', inst.name, 'legend', 1000); }
      if (inst.event === 'mystery') FX.showBanner('MYSTERY BOX', 'BROTHER… WHAT IS INSIDE?', 'event', 1100);
      if (inst.event === 'grandma') FX.showBanner(inst.npc === 'oma' ? 'GRANDMA MODE' : inst.npc === 'mama' ? 'MAMA MODE' : 'TANTEN-ALARM', inst.npcLine, 'event', 1100);
      if (inst.event === 'arabic') FX.showBanner('INGREDIENTS IN ARABIC', 'Genauer prüfen?', 'event', 1100);
      if (inst.event === 'trust') FX.showBanner('BROTHER TRUST ME', 'TRUST LEVEL: 0%', 'event', 1000);
      if (inst.event === 'police') { FX.showBanner('🚨 HALAL-POLIZEI!', 'Sagt: „HARAM!“ – stimmt das wirklich?', 'event', 1000); A.play('siren'); }
      if (inst.event === 'doener17') FX.showBanner('DÖNER MIT 17 SOSSEN', 'SYSTEM OVERLOAD', 'event overload', 1200);
      if (inst.art.t !== 'emoji') A.play('rustle');
      if (inst.place === 'doener' && U.chance(0.3)) A.play('sizzle');

      if (inst.disrupt) this.after(U.rand(0.15, 0.35), () => this.disrupt(inst));
      if (inst.pigeon) this.after(0.35, () => this.pigeon(inst));
      if (run.boss) this.bossTaunt();
      // Chaos-Stufen: Hintergrund-Action
      if (L.n >= 4 && U.chance(0.35 + (L.n - 4) * 0.15)) W.flyPackage();
      if (L.n >= 7) { this.chatter(); run.heat = Math.min(100, run.heat + 2.5); this.updateHeat(); }
      if (L.n >= 2 && U.chance(0.12)) W.npcSay(U.pick(D.NPCS[U.pick(Object.keys(D.NPCS))].lines).slice(0, 26));
      if (inst.disrupt === 'bus' || U.chance(0.06)) W.spawnBus();
      if (M.kiosk && U.chance(0.35)) A.play('bell');
      this.hud();
      // Zutaten-Profi: die Liste geht sofort auf
      if (M.checkOnly && inst.ans === 'check' && !run.boss) {
        this.state = 'cinematic';
        this.after(0.45, () => { if (this.cur === inst && !inst.decided) this.openCheck(0); });
        return;
      }
      this.state = 'decide';
    },

    renderQueue() {
      const q = this.el.queue;
      q.innerHTML = '';
      if (this.run.boss || this.run.rush) return;
      this.run.queue.forEach((it, i) => {
        const d = document.createElement('div');
        d.className = 'q-item';
        d.style.setProperty('--i', i);
        d.innerHTML = '<div class="q-art">' + Art.itemArt(it) + '</div><div class="q-name">' + U.esc(it.name) + '</div>';
        q.appendChild(d);
      });
    },

    showPresenter(npc, line) {
      const p = this.el.presenter;
      p.innerHTML = Art.npcHTML(npc, line);
      p.className = 'presenter';
      void p.offsetWidth;
      p.classList.add('show');
    },

    scanFx() { U.restartAnim(this.el.stage, 'scanning'); },

    clearItem() {
      const e = this.el;
      if (this.cur && this.cur.el) {
        const old = this.cur.el;
        this.cur.el = null;
        Art.releaseItemEl(old);
      }
      e['item-slot'].innerHTML = '';
      e.disrupt.innerHTML = '';
      e['xray-hint'].hidden = true;
    },
    clearScene() {
      this.clearItem();
      this.el.queue.innerHTML = '';
      this.el.presenter.className = 'presenter';
      this.el.meme.className = 'meme';
    },

    /* ================= STÖRUNGEN ================= */
    disrupt(inst) {
      if (this.cur !== inst || inst.decided) return;
      const d = this.el.disrupt;
      const k = inst.disrupt;
      let html = '';
      if (k === 'bus') { html = '<div class="dz dz-bus"><span>🚌</span><b>LINIE 17</b></div>'; A.play('bus'); }
      else if (k === 'npc') html = '<div class="dz dz-npc">' + U.pick(['🚶🏽‍♂️', '🚶🏻‍♀️', '🧍🏿', '🏃🏼', '🚶🏾']) + '</div>';
      else if (k === 'hand') html = '<div class="dz dz-hand">✋</div>';
      else if (k === 'fly') { html = '<div class="dz dz-fly">' + U.pick(['📦', '🛒', '🥫', '📦']) + '</div>'; A.play('swoosh'); }
      else if (k === 'cat') { html = '<div class="dz dz-cat">🐈</div>'; A.play('meow'); }
      else if (k === 'corso') {
        html = '<div class="dz dz-corso"><span>🚗</span><span>🚙</span><span>🚘</span></div>';
        A.play('honk');
        if (U.chance(0.4)) FX.toast('🚗 HOCHZEITSKORSO! DÜT DÜT DÜÜÜT!', 1100);
      }
      else return; // flip/partial sind reine Klassen am Produkt
      d.innerHTML = html;
    },

    pigeon(inst) {
      if (this.cur !== inst || inst.decided || this.state !== 'decide') return;
      inst.decided = true;
      this.state = 'feedback';
      this.el.disrupt.innerHTML = '<div class="dz dz-pigeon">🐦</div>';
      A.play('pigeon');
      if (inst.el) inst.el.classList.add('stolen');
      this.det('OBJEKT ENTFERNT', 'TÄTER: TAUBE', 'warn');
      this.memeText('TAUBE HAT DAS PRODUKT GEKLAUT 🐦', 'Keine Entscheidung nötig. +50 AURA (Mitleid).', 'info');
      this.addAura(50);
      this.after(1.2, () => this.next());
    },

    updateJoke() {
      const run = this.run;
      run.updateJoke = true;
      this.clearItem();
      this.state = 'cinematic';
      this.det('UPDATE 1/1 …', '0%', 'warn');
      let p = 0;
      const step = () => {
        p += U.randInt(9, 27);
        if (p >= 100) {
          this.det('FERTIG.', 'NICHTS HAT SICH GEÄNDERT.', 'ok');
          this.memeText('DETECTOR-UPDATE INSTALLIERT', 'Changelog: „Bugfixes und Leistungsverbesserungen“.', 'info');
          this.after(1.1, () => this.next());
          return;
        }
        this.det('UPDATE 1/1 …', p + '%', 'warn');
        A.play('tick');
        this.after(0.12, step);
      };
      this.after(0.2, step);
    },

    /* ================= WELT-EVENTS (3.0) ================= */
    rollWorldEvent() {
      const run = this.run, n = run.level.n;
      if (n >= 3 && !run.blackout && U.chance(0.012)) {
        run.blackout = 4;
        FX.showBanner(D.EVENTS3.blackout.title, D.EVENTS3.blackout.sub, 'event', 1100);
        A.play('powerdown');
        this.voiceLine('power');
      } else if (n >= 2 && !run.sale && U.chance(0.012)) {
        run.sale = 5;
        FX.showBanner(D.EVENTS3.sale.title, D.EVENTS3.sale.sub, 'combo', 1100);
        A.play('kaching');
      } else if (n >= 2 && U.chance(0.01)) {
        FX.toast(U.pick(D.EVENTS3.voicemsg), 1800);
        A.play('notify');
      }
    },

    /* ================= CHAOS-STÖRUNGEN ================= */
    newMutator() {
      const run = this.run;
      const prev = run.mutator;
      if (prev) { run.mutCount++; this.trackMax('chaosMut', run.mutCount); }
      const m = U.pick(D.MUTATORS.filter((x) => !prev || x.id !== prev.id));
      run.mutator = m;
      run.mutLeft = 6;
      this.clearScene();
      this.state = 'cinematic';
      // Der Schauplatz wechselt gleich mit
      const areas = D.AREAS.filter((a) => a.id !== 'kioskshift' && a.id !== this.areaId());
      run.areaOverride = U.pick(areas).id;
      W.setArea(run.areaOverride);
      A.ambience.set(run.areaOverride, true);
      A.music.set({ style: this.musicStyle() });
      this.applyMutator();
      FX.showBanner('🌀 ' + m.icon + ' ' + m.name, m.desc, 'event', 1500);
      A.play('mutate');
      this.voiceLine('mutator', 0.2);
      this.det('STÖRUNG!', m.name, 'warn');
      this.hud();
      this.after(1.7, () => this.next());
    },
    applyMutator() {
      const run = this.run, scr = this.el['scr-game'];
      D.MUTATORS.forEach((x) => scr.classList.remove('mut-' + x.id));
      if (run.mutator) scr.classList.add('mut-' + run.mutator.id);
      run.order = this.mut('mirror') ? ['haram', 'check', 'halal'] : ORDER.slice();
      this.applyOrder();
    },

    /* ================= BOSS-MARATHON ================= */
    nextBossRush() {
      const run = this.run;
      if (run.bossIdx >= D.BOSS_ORDER.length) return this.finish('bossrush');
      const kind = D.BOSS_ORDER[run.bossIdx];
      run.levelIdx = Math.min(D.LEVELS.length - 1, 2 + run.bossIdx);
      run.level = D.LEVELS[run.levelIdx];
      W.setIntensity(run.level.n);
      return this.startBoss(kind, 80 + run.bossIdx * 10);
    },

    /* ================= RUNDE GESCHAFFT (Tages-Challenge, Schicht, Marathon, Zeitjagd) ================= */
    finish(kind) {
      const run = this.run;
      if (!run || this.state === 'over') return;
      run.result = kind;
      this.state = 'over';
      this.clearTimers();
      this.clearScene();
      A.music.stop();
      A.ambience.set('menu', false);
      const T = {
        daily: ['CHALLENGE GESCHAFFT!', run.correct + ' VON ' + this.cfg().items + ' RICHTIG'],
        kiosk: ['SCHICHT VORBEI!', 'FEIERABEND · ' + '⭐'.repeat(Math.max(0, run.lives)) + ' · 💰 ' + run.tips],
        bossrush: ['ALLE BOSSE BESIEGT!', 'DER DETECTOR IST LEGENDE.'],
        zeit: ['ZEIT!', run.correct + ' RICHTIGE ENTSCHEIDUNGEN'],
      }[kind];
      A.play(kind === 'zeit' ? 'timeUp' : 'win');
      this.voiceLine(kind === 'zeit' ? 'time' : kind === 'kiosk' ? 'shift' : 'win', 0.3);
      FX.confettiRain(kind === 'zeit' ? 60 : 140);
      if (kind !== 'zeit') A.play('crowd', 'cheer');
      FX.showBanner(T[0], T[1], kind === 'zeit' ? 'level' : 'boss win', 1800);
      this.det(T[0], kind === 'zeit' ? 'UHR ABGELAUFEN' : 'MISSION ERFÜLLT', 'ok');
      this.hud();
      setTimeout(() => HHD.UI.showGameOver(this.summary()), 1900);
    },

    chatter() {
      const b = this.el.bubbles;
      b.innerHTML = '';
      const n = U.randInt(2, 3);
      const keys = U.shuffle(Object.keys(D.NPCS)).slice(0, n);
      keys.forEach((k, i) => {
        const npc = D.NPCS[k];
        const d = document.createElement('div');
        d.className = 'chat';
        d.style.left = U.rand(2, 58) + '%';
        d.style.top = U.rand(18, 62) + '%';
        d.style.animationDelay = (i * 0.12) + 's';
        d.innerHTML = '<span>' + npc.face + '</span>' + U.esc(U.pick(npc.lines));
        b.appendChild(d);
      });
    },

    updateHeat() {
      const d = this.el['det-slot'].querySelector('.det');
      if (!d) return;
      const h = this.run.heat;
      d.style.setProperty('--heat', (h / 100).toFixed(2));
      d.classList.toggle('hot', h >= 70);
      W.overheat = h >= 85 ? 0.3 : 0;
    },

    /* ================= IFTAR RUSH ================= */
    startRush() {
      const run = this.run;
      this.clearScene();
      this.state = 'cinematic';
      run.rush = { left: 8, errors: 0 };
      this.el['scr-game'].classList.add('rush');
      W.setRush(true);
      A.music.set({ rush: true, style: this.musicStyle() });
      A.play('rush');
      FX.showBanner('🌙 IFTAR RUSH', 'ALLES ×2 – SCANNEN, BEVOR DIE SUPPE KALT WIRD!', 'ramadan', 1500);
      FX.emojiRain(['🌙', '⭐', '✨', '🥛', '🫖'], 40);
      this.det('IFTAR RUSH', '8 PRODUKTE · ×2', 'ok');
      this.hud();
      this.after(1.6, () => this.next());
    },
    generateRush() {
      const run = this.run;
      let tpl;
      if (U.chance(0.15)) tpl = D.ITEMS.find((i) => i.id === U.pick(D.RUSH_TRAPS));
      if (!tpl) {
        const pool = D.ITEMS.filter((i) => i.iftar && !run.recent.includes(i.id));
        tpl = U.pick(pool.length ? pool : D.ITEMS.filter((i) => i.iftar));
      }
      const fam = U.chance(0.5);
      const inst = this.makeInstance(tpl, { noDisrupt: true, npc: fam ? U.pick(['mama', 'tante', 'onkel']) : null, npcLine: fam ? U.pick(D.LINES.rush) : null });
      inst.time = (inst.time - ENTER) * 0.85 + ENTER;
      inst.rush = true;
      this.remember(inst);
      run.rush.left--;
      return inst;
    },
    endRush() {
      const run = this.run, r = run.rush;
      run.rush = null;
      this.clearScene();
      this.state = 'cinematic';
      this.el['scr-game'].classList.remove('rush');
      W.setRush(false);
      A.music.set({ rush: false, style: this.musicStyle() });
      if (r.errors === 0) {
        this.addAura(500);
        this.grantPowerup();
        this.track('rushPerfect');
        A.play('crowd', 'cheer');
        FX.showBanner('ALHAMDULILLAH – SATT! 🌙', 'PERFEKTER IFTAR RUSH · +500 AURA · 🎁 POWER-UP', 'ramadan', 1600);
        FX.confettiRain(70);
      } else {
        this.addAura(200);
        FX.showBanner('ALHAMDULILLAH – SATT!', r.errors + ' FEHLER · +200 AURA', 'ramadan', 1400);
      }
      this.det('IFTAR', 'BEENDET', 'ok');
      this.hud(true);
      this.after(1.7, () => this.next());
    },

    /* ================= MAMA RUFT AN ================= */
    mamaCall() {
      const run = this.run, e = this.el;
      FX.hideBanner();
      this.clearItem();
      e.presenter.className = 'presenter';
      e.meme.className = 'meme';
      run.calls++;
      this.call = { left: 3.2, total: 3.2, ring: 0 };
      e.call.hidden = false;
      e.call.className = 'call ringing';
      e['call-text'].textContent = 'MAMA RUFT AN…';
      this.setControlsMode('call');
      this.det('📞 ANRUF', 'MAMA ❤️', 'warn');
      A.play('ring');
      this.state = 'call';
    },
    answerCall(accept) {
      const c = this.call, e = this.el;
      if (!c) return;
      this.call = null;
      this.state = 'feedback';
      if (accept) {
        e.call.className = 'call talking';
        e['call-text'].textContent = U.pick(D.LINES.mamaCall);
        this.addAura(150);
        this.track('mamaOk');
        A.play('correct', 5);
        this.memeText('MAMA-LIEBLING ❤️', '+150 AURA. Mama ist zufrieden. Vorerst.', 'ok');
        this.det('ANRUF BEENDET', 'MAMA: ZUFRIEDEN', 'ok');
        this.after(1.7, () => { e.call.hidden = true; this.next(); });
      } else {
        e.call.className = 'call declined';
        e['call-text'].textContent = 'MAMA HAT AUFGELEGT…';
        this.addAura(-300);
        this.memeText('DU HAST MAMA WEGGEDRÜCKT?!', '−300 AURA. Das gibt Ärger…', 'err');
        this.det('ANRUF ABGELEHNT', 'TERLIK INCOMING', 'err');
        this.after(0.45, () => this.terlikThrow());
        this.after(2.0, () => { e.call.hidden = true; this.next(); });
      }
      this.setControlsMode('decide');
      this.hud(true);
    },

    /* ================= TERLIK ================= */
    terlikThrow(light) {
      FX.terlik(light);
      A.play('swoosh');
      setTimeout(() => { A.play('slap'); if (!light) FX.crack(); }, 430);
      this.track('terlikHit');
    },

    /* ================= RAMADAN: TAGE & EID ================= */
    ramadanDay() {
      const run = this.run;
      const day = Math.min(30, 1 + Math.floor(run.correct / 3));
      if (day === run.day) return false;
      run.day = day;
      if (day === 30 && !run.eid) { run.eid = true; this.eid(); return true; }
      if (day % 10 === 0) FX.toast('🌙 TAG ' + day + ' VON 30 – MASHALLAH!', 1600);
      return false;
    },
    eid() {
      const S = HHD.Store.data;
      S.coins += 500;
      const skinNew = !S.owned.includes('sultan');
      if (skinNew) S.owned.push('sultan');
      HHD.Store.save();
      this.track('eid');
      this.trackMax('skins', S.owned.length);
      this.addAura(1000);
      A.play('eid');
      FX.confettiRain(150);
      FX.emojiRain(['🎉', '🌙', '⭐', '🍬', '🎁'], 50);
      FX.showBanner('EID MUBARAK! 🎉', 'BAYRAM-GELD +500 🪙' + (skinNew ? ' · SULTAN-SKIN FREI' : '') + ' · AB JETZT ×1,5', 'ramadan', 2400);
      this.det('EID MUBARAK', 'BAYRAM-BONUS AKTIV', 'ok');
    },

    /* ================= POWER-UPS ================= */
    renderPowerups() {
      const bar = this.el['pu-bar'];
      const run = this.run;
      if (!run || run.mode === 'zen' || this.tutorial) { bar.hidden = true; return; }
      const inv = HHD.Store.data.pu;
      bar.innerHTML = Object.keys(D.POWERUPS).map((k) => {
        const p = D.POWERUPS[k];
        const n = inv[k] || 0;
        const active = (k === 'slowmo' && run.slowmo > 0) || (k === 'dua' && run.shield) || (k === 'xray' && run.xray) || (k === 'freeze' && run.frozen);
        return '<button type="button" class="pu-btn' + (n ? '' : ' empty') + (active ? ' active' : '') + '" data-pu="' + k + '" aria-label="' + p.name + '" title="' + U.esc(p.name + ': ' + p.desc) + '">' +
          '<span>' + p.icon + '</span><b>' + n + '</b>' + (k === 'slowmo' && run.slowmo > 0 ? '<i>' + run.slowmo + '</i>' : '') + '</button>';
      }).join('');
      bar.hidden = false;
      this.el['scr-game'].classList.toggle('slowmo', run.slowmo > 0);
      A.music.set({ slow: run.slowmo > 0 });
    },
    grantPowerup(k) {
      const S = HHD.Store.data;
      k = k || U.pick(Object.keys(D.POWERUPS));
      S.pu[k] = (S.pu[k] || 0) + 1;
      HHD.Store.save();
      const p = D.POWERUPS[k];
      FX.toast('🎁 POWER-UP: ' + p.icon + ' ' + p.name, 1800);
      this.renderPowerups();
    },
    usePowerup(k) {
      const run = this.run, S = HHD.Store.data, p = D.POWERUPS[k];
      if (!p || this.paused || this.tutorial || !run || run.mode === 'zen') return;
      if (!['decide', 'check', 'feedback', 'cinematic'].includes(this.state)) return;
      if (!S.pu[k]) { FX.toast('Keine ' + p.icon + ' ' + p.name + ' mehr – gibt’s im Shop!'); A.play('tapBad'); return; }
      if (k === 'xray') {
        if (this.state === 'decide' && this.cur && !this.cur.decided) {
          if (this.cur.ans === 'check') { run.xray = true; this.consume(k); return this.input('check'); }
          this.xrayHint();
        } else if (this.state === 'check' && this.chk) {
          this.xrayCheck();
        } else { FX.toast('🔍 Röntgen geht nur, wenn gerade ein Produkt da ist.'); return; }
      } else if (k === 'slowmo') {
        if (run.slowmo > 0) { FX.toast('⏳ Die Zeitlupe läuft schon.'); return; }
        run.slowmo = 6;
        if (this.state === 'decide' && this.cur && !this.cur.decided && isFinite(this.cur.time)) { this.cur.left += 1.2; this.cur.time += 1.2; }
        FX.showBanner('⏳ ZEITLUPE', 'Die nächsten 6 Produkte: fast doppelte Zeit', 'level', 900);
      } else if (k === 'dua') {
        if (run.shield) { FX.toast('🤲 Mamas Dua schützt dich schon.'); return; }
        run.shield = true;
        FX.showBanner('🤲 MAMAS DUA', 'Der nächste Fehler kostet kein Leben', 'ramadan', 1000);
      } else if (k === 'freeze') {
        if (this.cfg().clock) { FX.toast('❄️ In der Zeitjagd läuft die Uhr immer weiter.'); return; }
        const live = (this.state === 'decide' && this.cur && !this.cur.decided && isFinite(this.cur.time)) || (this.state === 'check' && this.chk && isFinite(this.chk.total));
        if (!live) { FX.toast('❄️ Eiszeit geht nur, wenn gerade die Zeit läuft.'); return; }
        if (run.frozen) { FX.toast('❄️ Die Zeit ist schon eingefroren.'); return; }
        run.frozen = true;
        this.el['scr-game'].classList.add('ice');
        FX.showBanner('❄️ EISZEIT', 'Die Zeit steht – bis zu deiner Entscheidung', 'level', 900);
      } else if (k === 'joker') {
        if (!this.skipItem()) { FX.toast('⏭️ Joker geht nur, wenn gerade ein Produkt da ist.'); return; }
      }
      this.consume(k);
    },
    consume(k) {
      const S = HHD.Store.data;
      S.pu[k] = Math.max(0, (S.pu[k] || 0) - 1);
      HHD.Store.save();
      A.play('powerup');
      this.track('puUsed');
      this.renderPowerups();
      this.hud();
    },
    /** Joker: Produkt überspringen – keine Strafe, Combo bleibt */
    skipItem() {
      const run = this.run, cur = this.cur;
      const inCheck = this.state === 'check' && this.chk;
      if (!cur || !(inCheck || (this.state === 'decide' && !cur.decided))) return false;
      cur.decided = true;
      if (inCheck) { this.chk = null; this.closeCheck(); }
      this.state = 'feedback';
      run.skipped++;
      if (!cur.rush) run.itemsInLevel++;
      this.el['xray-hint'].hidden = true;
      this.det('ÜBERSPRUNGEN', 'JOKER EINGESETZT', 'warn');
      if (cur.el) cur.el.classList.add('exit-bad');
      if (this.cfg().kiosk && cur.npc) this.showPresenter(cur.npc, 'SCHON GUT, ICH FRAG WOANDERS.');
      this.memeText('⏭️ JOKER', 'Übersprungen – keine Strafe, die Combo bleibt.', 'info');
      A.play('swoosh');
      this.after(0.6, () => this.next());
      return true;
    },
    xrayHint() {
      const cur = this.cur, h = this.el['xray-hint'];
      h.innerHTML = '🔍 RÖNTGEN: <b>' + U.esc(CHOICE_LABEL[cur.ans]) + '</b>';
      h.className = 'xray-hint ' + cur.ans;
      h.hidden = false;
    },
    xrayCheck() {
      const chk = this.chk;
      if (!chk) return;
      let first = null;
      this.el['ing-list'].querySelectorAll('.ing-chip').forEach((b) => {
        const it = chk.list[+b.dataset.i];
        if (it && it.flag) { b.classList.add('xray'); if (!first) first = b; }
      });
      chk.user = true;
      if (first) { this.scrollIng(first); this.el['ing-sub'].textContent = '🔍 RÖNTGEN: Das Leuchtende ist das Problem → antippen!'; }
      else this.el['ing-sub'].textContent = '🔍 RÖNTGEN: Kein Problem gefunden → ✅ HALAL';
      this.el['ing-sub'].classList.add('xray-note');
    },

    /* ================= EINGABE ================= */
    input(choice) {
      if (this.paused) return;
      if (this.tutorial) return this.tutorialInput(choice);
      if (this.state === 'call') {
        if (choice === 'halal') return this.answerCall(true);
        if (choice === 'haram') return this.answerCall(false);
        return;
      }
      const cur = this.cur;
      if (this.state === 'decide' && cur && !cur.decided) {
        A.play('click');
        this.pressFx(choice);
        const rt = this.gameTime - cur.shownAt;
        if (choice === 'check') {
          if (cur.ans === 'check') return this.openCheck(rt);
          return this.overcheck(rt);
        }
        cur.decided = true;
        if (cur.ans === 'check') return this.guessed(choice, rt);
        if (choice === cur.ans) return this.correct(rt, {});
        return this.wrong(choice, rt, 'wrong');
      }
      if (this.state === 'check' && this.chk && (choice === 'halal' || choice === 'haram')) {
        A.play('click');
        this.pressFx(choice);
        this.resolveCheck(choice, null);
      }
    },

    pressFx(choice) {
      const b = this.el.btns[choice];
      if (b) U.restartAnim(b, 'pressed');
    },

    itemCenter() {
      const el = (this.cur && this.cur.el) || this.el['item-slot'];
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.42 };
    },

    /* ================= ERGEBNISSE ================= */
    points(frac, o) {
      const run = this.run, cur = this.cur;
      const base = 100 * (1 + (run.level.n - 1) * 0.25);
      const combo = 1 + Math.min(run.combo, 50) * 0.1;
      let p = base * (1 + frac) * combo;
      if (o.check) p *= 1.5;
      if (o.found) p *= 1.2;
      if (cur && cur.legend) p *= 5;
      if (cur && cur.rush) p *= 2;
      if (run.boss) p *= 1.2;
      if (run.mode === 'hardcore') p *= 2;
      if (run.eid) p *= 1.5;
      if (cur && cur.sale) p *= 2;
      if (this.mut('double')) p *= 2;
      if (run.mode === 'zen') p *= 0.25;
      return Math.round(p / 10) * 10;
    },

    /** Detector-Stimme: sagt das echte Ergebnis („HALAL“ / „HARAM“). true = es wurde gesprochen */
    announce(verdict, mood, delay) {
      if (verdict !== 'halal' && verdict !== 'haram') return false;
      const n = this.run ? this.run.level.n : 1;
      return A.say(verdict, { mood, delay, rate: n >= 5 ? 1.06 : 1, glitch: n >= 7 && U.chance(0.3) });
    },
    /** Echtes Urteil eines Produkts – bei Zutaten-Produkten erst, wenn die Zutaten aufgedeckt sind */
    verdictOf(cur, revealed) {
      if (cur.ans !== 'check') return cur.ans;
      return revealed && cur.variant ? cur.variant.verdict : null;
    },

    correct(rt, o) {
      const run = this.run, cur = this.cur;
      cur.decided = true;
      this.state = 'feedback';
      this.el['xray-hint'].hidden = true;
      run.correct++; run.total++; run.combo++;
      if (!cur.rush) run.itemsInLevel++;
      run.maxCombo = Math.max(run.maxCombo, run.combo);
      run.wrongStreak = 0;
      if (cur.legend) run.legendary++;
      const M = this.cfg();
      let frac;
      if (o.check) {
        frac = this.chk && isFinite(this.chk.total) ? U.clamp(this.chk.left / this.chk.total, 0, 1) : M.clock ? U.clamp(1 - o.dur / 6, 0, 1) : 0.5;
        if (!run.fastestCheck || o.dur < run.fastestCheck) run.fastestCheck = +o.dur.toFixed(3);
      } else {
        frac = isFinite(cur.time) ? U.clamp(1 - (rt - ENTER) / (cur.time - ENTER), 0, 1) : M.clock ? U.clamp(1 - rt / 2.2, 0, 1) : 0.5;
        const r = Math.max(0.05, rt);
        if (!run.fastest || r < run.fastest) run.fastest = +r.toFixed(3);
        run.reactSum += r; run.reactN++;
      }
      const pts = this.points(frac, o);
      run.score += pts;

      // Tracking (Missionen & Erfolge)
      this.track('correct');
      this.trackMax('combo', run.combo);
      if (o.check) this.track('checkOk');
      if (o.found) { this.track('found'); if (/gelatine/i.test(o.found.text) && /schwein/i.test(o.found.text)) this.track('gelatineFound'); }
      if (!o.check && rt < 0.6) this.track('fast');
      if (!o.check && rt < 0.45) this.track('blitz');
      if (cur.place === 'doener') this.track('doenerOk');
      if (cur.isTwin) this.track('twinOk');
      if (cur.legend) this.track('legend');
      if (cur.event === 'doener17') this.track('sauce17');
      if (cur.dark) this.track('blackoutOk');
      if (M.checkOnly && o.check) this.track('profiOk');
      if (M.clock) this.trackMax('zeitCorrect', run.correct);

      // Aura & Sprüche
      let aura = 0, line, sub = '';
      const tier = o.check ? 'correctCheck' : cur.ans === 'haram' ? 'correctHaram' : 'correctHalal';
      line = U.pick(D.LINES[tier]);
      if (o.found) { line = U.pick(D.LINES.found); aura += 150; sub = 'Gefunden: ' + o.found.text; }
      if (o.check && this.chk && this.chk.list.length >= 10) aura += 200;
      if (!o.check && rt < 0.35) { aura += 250; line = U.fmtSec(rt).replace('s', '') + ' SEKUNDEN?!'; }
      else if (!o.check && rt < 0.55) { aura += 100; line = U.pick(D.LINES.instant); }
      else if (!o.check && frac < 0.12) { aura -= 50; line = 'KNAPP… ZU LANGE GEZÖGERT.'; }
      if (cur.legend) { aura += 500; line = 'LEGENDARY GESICHERT ✦'; }
      if (cur.event === 'police') {
        aura += 200;
        line = 'EIGENE MEINUNG. RESPEKT. 🧠';
        sub = 'Halal-Polizei sagt HARAM – aber ' + cur.name + ' ist eindeutig halal.';
        this.track('policeOk');
      }
      if (o.check && cur.variant && cur.variant.note) sub = cur.variant.note;
      else if (o.check && !sub) sub = cur.variant.verdict === 'haram' ? 'Drin war: ' + this.flagText(cur) + ' → HARAM' : 'Alle Zutaten unproblematisch → HALAL';
      else if (!sub) sub = this.explain(cur);
      if (aura) this.addAura(aura);

      // Präsentation
      this.det('BEEP BEEP BEEP', 'CLASSIFICATION ACCEPTED', 'ok');
      const spoke = this.announce(this.verdictOf(cur, true), run.combo >= 10 ? 'h' : 'n', 0.04);
      A.play('correct', run.combo);
      if (!spoke) A.play('accept');
      const c = this.itemCenter();
      const skin = D.SKINS.find((s) => s.id === HHD.Store.data.skin) || D.SKINS[0];
      FX.burst(c.x, c.y, { n: 18 + Math.min(40, run.combo), colors: [skin.laser, '#ffffff', '#ffe45e', '#5ec8ff'] });
      if (cur.legend) FX.burst(c.x, c.y, { n: 30, text: '✦', colors: ['#ffd700'], smin: 5, smax: 9 });
      if (cur.rush || run.mode === 'ramadan') FX.burst(c.x, c.y, { n: 6, text: U.pick(['🌙', '⭐', '✨']), smin: 5, smax: 8, colors: ['#fff'] });
      FX.flash('rgba(61,255,139,0.28)');
      FX.float('+' + U.fmt(pts), c.x, c.y - 30, 'pts');
      if (aura) FX.float(U.fmtSigned(aura) + ' AURA', c.x + 40, c.y + 10, aura > 0 ? 'aura' : 'neg');
      this.memeText(line, sub, 'ok');
      if (cur.el) cur.el.classList.add('exit-ok');
      // Zeitjagd: Sekunden gutschreiben
      if (M.clock) {
        const add = o.check ? 1.5 : 0.5;
        run.clock = Math.min(run.clockMax, run.clock + add);
        FX.float('+' + String(add).replace('.', ',') + ' s ⏱️', c.x + 60, c.y - 50, 'aura');
      }
      // Kiosk: Trinkgeld und ein zufriedener Kunde
      if (M.kiosk) {
        const tip = Math.round(4 + 16 * frac);
        run.tips += tip;
        this.track('tips', tip);
        FX.float('+' + tip + ' 🪙 TRINKGELD', c.x - 60, c.y + 30, 'aura');
        A.play('kaching');
        if (cur.npc) this.showPresenter(cur.npc, U.pick(D.KIOSK.happy));
      }

      this.hud(true);
      A.music.set({ combo: run.combo, panic: false });

      // Boss
      if (run.boss) {
        run.boss.hp = Math.max(0, run.boss.hp - 10);
        this.bossHit();
        if (run.boss.hp <= 0) { this.after(0.5, () => this.bossDefeated()); return; }
      }
      if (this.comboMilestone()) return;
      if (run.mode === 'ramadan' && this.ramadanDay()) { this.state = 'cinematic'; this.after(2.6, () => this.next()); this.hud(); return; }
      this.after(this.fbDelay(true), () => this.next());
    },

    fbDelay(ok) {
      const n = this.run.level.n;
      return ok ? Math.max(0.3, 0.46 - n * 0.02) : 1.3;
    },

    /** Leben abziehen – außer im Übungsmodus oder wenn Mamas Dua schützt */
    loseLife() {
      const run = this.run;
      if (run.mode === 'zen') return 'zen';
      if (run.shield) { run.shield = false; return 'shield'; }
      if (this.cfg().clock) { run.clock = Math.max(0, run.clock - 3); return 'time'; }
      run.lives--;
      return 'lost';
    },

    /** Falsch – inkl. Raten, Timeout, falsches Zutaten-Urteil */
    wrong(choice, rt, kind, info) {
      const run = this.run, cur = this.cur;
      cur.decided = true;
      this.state = 'feedback';
      this.el['xray-hint'].hidden = true;
      run.wrong++; run.total++;
      if (!cur.rush) run.itemsInLevel++;
      else if (run.rush) run.rush.errors++;
      run.wrongStreak++;
      run.lvlErr = (run.lvlErr || 0) + 1;
      const broke = this.breakCombo();
      const life = this.loseLife();
      let aura, line, sub;
      if (kind === 'timeout') {
        aura = -200; line = U.pick(D.LINES.timeout);
        sub = cur.ans === 'check' ? 'Unklar → Zutaten checken.' : this.explain(cur);
      } else if (kind === 'guess') {
        aura = -300; line = U.pick(D.LINES.guessed);
        sub = this.checkReveal(cur);
      } else if (kind === 'checkwrong') {
        aura = -300; line = U.pick(D.LINES.wrong);
        sub = cur.variant.verdict === 'haram' ? 'Da stand: ' + this.flagText(cur) + ' → HARAM' : 'Alles war unproblematisch → HALAL';
      } else if (kind === 'checktimeout') {
        aura = -250; line = 'ZU LANGSAM GELESEN 🐢';
        sub = cur.variant.verdict === 'haram' ? 'Das Problem war: ' + this.flagText(cur) : 'Es war alles okay → HALAL';
      } else if (kind === 'overcheck') {
        aura = -150; line = info.line; sub = info.sub;
      } else if (cur.event === 'police') {
        aura = -400; line = 'DU HAST DER HALAL-POLIZEI GEGLAUBT 💀';
        sub = cur.name + ' ist halal. Selbst prüfen statt nachplappern.';
      } else {
        const obvious = cur.tpl.tier <= 2;
        aura = obvious ? -500 : -300;
        line = obvious ? '-500 AURA' : U.pick(D.LINES.wrong);
        sub = this.explain(cur);
        if (obvious && U.chance(0.5)) line = U.pick(['WIE HAST DU DAS NICHT GESEHEN?', 'BRO…', '-500 AURA']);
        if (choice === 'halal' && cur.ans === 'haram') line = U.pick(D.LINES.haramAsHalal);
      }
      let big = false;
      if (run.wrongStreak >= 3 && run.mode !== 'zen') { aura -= 900; big = true; }
      this.addAura(aura);

      this.det('ERROR 404', 'COMMON SENSE NOT FOUND', 'err');
      A.play('wrong');
      // Timeout bei einem Zutaten-Produkt: Zutaten wurden nie gelesen → nichts verraten
      const spoke = this.announce(this.verdictOf(cur, kind !== 'timeout'), 'd', 0.3);
      if (big) { A.play('boom'); A.play('crowd', 'ooh'); this.terlikThrow(); }
      else if (!spoke && U.chance(0.4)) A.play('error404');
      FX.flash('rgba(255,40,70,0.35)');
      FX.shake(big ? 'big' : 'small');
      const c = this.itemCenter();
      FX.burst(c.x, c.y, { n: 14, colors: ['#ff3b5c', '#1d1433', '#ff9f1c'], min: 80, max: 260 });
      FX.float(U.fmtSigned(aura) + ' AURA' + (big ? ' 💀' : ''), c.x, c.y - 20, 'neg');
      const kiosk = this.cfg().kiosk;
      if (life === 'lost') FX.float(kiosk ? '−1 ⭐' : '−1 ❤️', c.x - 50, c.y + 20, 'neg');
      else if (life === 'time') FX.float('−3 s ⏱️', c.x - 50, c.y + 20, 'neg');
      else if (life === 'shield') { FX.float('🤲 GESCHÜTZT', c.x - 50, c.y + 20, 'aura'); FX.toast('🤲 MAMAS DUA HAT DICH GESCHÜTZT!', 1600); }
      if (kiosk && cur.npc) { this.showPresenter(cur.npc, U.pick(D.KIOSK.angry)); A.play('starLose'); }
      const chip = kind === 'checkwrong' || kind === 'checktimeout' ? CHOICE_LABEL[cur.variant.verdict] : CHOICE_LABEL[cur.ans];
      this.memeText(line, sub, 'err', chip);
      if (big) FX.showBanner('🩴 TERLIK INCOMING', '3× FALSCH – MAMA HAT ES GESEHEN · −900 AURA', 'bad', 1200);
      else if (broke) FX.showBanner('COMBO BROKEN 💀', '', 'bad small', 800);
      if (cur.el) cur.el.classList.add('exit-bad');
      if (run.boss) { run.boss.hp = Math.min(run.boss.max, run.boss.hp + 5); this.bossLaugh(); }
      this.hud(true);
      this.renderPowerups();
      if (run.lives <= 0) { this.after(0.9, () => this.gameOver()); return; }
      this.after(this.fbDelay(false), () => this.next());
    },

    guessed(choice, rt) {
      const cur = this.cur;
      if (choice === cur.variant.verdict) {
        // Glück gehabt: kein Leben weg, aber Combo & Aura
        const run = this.run;
        this.state = 'feedback';
        run.total++;
        if (!cur.rush) run.itemsInLevel++;
        else if (run.rush) run.rush.errors++;
        run.lvlErr = (run.lvlErr || 0) + 1;
        const broke = this.breakCombo();
        this.addAura(-300);
        this.det('GERATEN ERKANNT', 'TRUST LEVEL: 12%', 'warn');
        A.play('overcheck');
        this.announce(cur.variant.verdict, 'n', 0.12);
        const c = this.itemCenter();
        FX.float('−300 AURA', c.x, c.y - 20, 'neg');
        this.memeText(U.pick(D.LINES.lucky), this.checkReveal(cur), 'warn', CHOICE_LABEL.check);
        if (broke) FX.showBanner('COMBO BROKEN 💀', 'Unklar → erst checken!', 'bad small', 900);
        if (cur.el) cur.el.classList.add('exit-bad');
        this.hud(true);
        this.after(1.25, () => this.next());
        return;
      }
      this.wrong(choice, rt, 'guess');
    },

    overcheck(rt) {
      const run = this.run, cur = this.cur;
      cur.decided = true;
      const name = cur.name.toUpperCase();
      let line = 'ZUTATEN: ' + name + '. NUR ' + name + '. 💀';
      if (cur.tpl.cat === 'zert') line = 'DA STEHT „HALAL ✓“ DRAUF, BRO. 💀';
      else if (cur.tpl.cat === 'schwein') line = 'ES IST LITERALLY SCHWEIN. 💀';
      else if (cur.tpl.cat === 'alkohol') line = 'ES IST ALKOHOL, BRUDER. 💀';
      if (cur.event === 'police') line = 'DIE POLIZEI HAT DICH VERUNSICHERT. 💀';
      const sub = 'Offensichtlich → ' + CHOICE_LABEL[cur.ans] + '. Nicht alles checken!';
      const now = run.total;
      run.overchecks = run.overchecks.filter((t) => now - t < 5);
      run.overchecks.push(now);
      if (run.overchecks.length >= 2) {
        // Wiederholtes Über-Checken kostet ein Leben
        run.overchecks = [];
        return this.wrong('check', rt, 'overcheck', { line: 'BRUDER CHECKT EINFACH ALLES. 💀', sub });
      }
      this.state = 'feedback';
      run.total++;
      if (!cur.rush) run.itemsInLevel++;
      else if (run.rush) run.rush.errors++;
      run.lvlErr = (run.lvlErr || 0) + 1;
      const broke = this.breakCombo();
      this.addAura(-100);
      this.det('OVERTHINKING', 'DETECTED', 'warn');
      A.play('overcheck');
      this.announce(cur.ans, 'n', 0.12);
      const c = this.itemCenter();
      FX.float('−100 AURA', c.x, c.y - 20, 'neg');
      this.memeText(line, sub + ' (Nächstes Mal kostet’s ein ❤️)', 'warn', CHOICE_LABEL[cur.ans]);
      if (broke) FX.showBanner('COMBO BROKEN 💀', '', 'bad small', 800);
      if (cur.el) cur.el.classList.add('exit-bad');
      this.hud(true);
      this.after(1.05, () => this.next());
    },

    timeout() {
      const cur = this.cur;
      if (!cur || cur.decided) return;
      this.wrong(null, cur.time, 'timeout');
    },

    explain(cur) {
      if (cur.tpl.why) return cur.tpl.why;
      if (cur.ans === 'check') return 'Unklar → Zutaten checken.';
      return D.WHY[cur.tpl.cat] || '';
    },
    flagText(cur) {
      const f = cur.variant.list.filter((x) => x.flag).map((x) => x.text);
      return f.join(', ') || '?';
    },
    checkReveal(cur) {
      const v = cur.variant;
      return v.verdict === 'haram' ? 'Drin war: ' + this.flagText(cur) + ' → HARAM.' : 'Zutaten waren okay → HALAL.';
    },

    breakCombo() {
      const run = this.run;
      const had = run.combo;
      run.combo = 0;
      A.music.set({ combo: 0 });
      const d = this.el['det-slot'].querySelector('.det');
      if (d) d.classList.remove('overclock');
      W.setScan(false);
      return had >= 5;
    },

    addAura(n) { this.run.aura += n; },

    memeText(line, sub, cls, correctLabel) {
      const m = this.el.meme;
      m.innerHTML = '<div class="m-line">' + U.esc(line) + '</div>' +
        (correctLabel ? '<div class="m-correct">RICHTIG WÄRE: <b>' + U.esc(correctLabel) + '</b></div>' : '') +
        (sub ? '<div class="m-sub">' + U.esc(sub) + '</div>' : '');
      m.className = 'meme';
      void m.offsetWidth;
      m.classList.add('show', cls || 'ok');
    },

    /* ================= COMBO-MEILENSTEINE ================= */
    comboMilestone() {
      const run = this.run, c = run.combo;
      const ms = D.COMBOS.find((x) => x[0] === c);
      if (!ms && c > 100 && c % 25 === 0) { FX.showBanner('COMBO ' + c, 'ES HÖRT NICHT AUF', 'combo', 900); A.play('combo', c); return false; }
      if (!ms) return false;
      const aura = c >= 50 ? 1000 : 250;
      this.addAura(aura);
      A.play('combo', c);
      FX.float('+' + aura + ' AURA', window.innerWidth / 2, window.innerHeight * 0.3, 'aura big');
      if ([10, 25, 50, 75, 100].includes(c) && run.lives < run.maxLives) {
        run.lives++;
        A.play('lifeUp');
        FX.toast('❤️ +1 LEBEN');
      }
      if ([15, 40, 60].includes(c) && run.mode !== 'zen') this.grantPowerup();
      if (c === 15) { FX.emojiRain(['🌙', '⭐', '✨'], 35); A.play('mashallah'); }
      const d = this.el['det-slot'].querySelector('.det');
      if (c >= 50 && d) d.classList.add('overclock');
      if (c === 75) W.setScan(true);
      if (c >= 30) A.play('crowd', 'cheer');
      this.hud(true);
      if (c === 100) { this.cityScan(); return true; }
      FX.showBanner(ms[1], ms[2], 'combo c' + Math.min(c, 50), 1100);
      if (c >= 20) FX.confettiRain(60);
      return false;
    },

    cityScan() {
      this.state = 'cinematic';
      const scr = this.el['scr-game'];
      scr.classList.add('zoomout');
      W.setOverview(true);
      A.play('boom');
      FX.showBanner('THE DETECTOR SEES EVERYTHING', 'SUPERMARKT · DÖNERLADEN · RESTAURANT · KIOSK · FOOD TRUCK', 'combo c100', 1900);
      this.after(2.0, () => {
        FX.showBanner('BROTHER HAS BECOME THE DETECTOR.', 'COMBO 100', 'combo c100', 2000);
        A.play('crowd', 'cheer');
        FX.confettiRain(140);
      });
      this.after(4.2, () => {
        scr.classList.remove('zoomout');
        W.setOverview(false);
        this.after(0.4, () => this.next());
      });
    },

    /* ================= LEVEL ================= */
    levelUp(fromBoss) {
      const run = this.run;
      if (run.levelIdx >= D.LEVELS.length - 1) { run.itemsInLevel = 0; return this.next(); }
      const perfect = !run.lvlErr && run.itemsInLevel > 0;
      run.lvlErr = 0;
      let life = false;
      if (!fromBoss && run.lives < run.maxLives && !this.cfg().kiosk) { run.lives++; life = true; A.play('lifeUp'); }
      if (perfect) { this.addAura(500); A.play('crowd', 'cheer'); FX.toast('✨ PERFEKTES LEVEL: +500 AURA' + (life ? ' · ❤️ +1' : ''), 2000); }
      else if (life) FX.toast('❤️ +1 LEBEN – LEVEL GESCHAFFT', 1800);
      run.levelIdx++;
      run.level = D.LEVELS[run.levelIdx];
      run.itemsInLevel = 0;
      run.queue = [];
      this.trackMax('level', run.level.n);
      if (run.mode === 'hardcore') this.trackMax('hardcoreLevel', run.level.n);
      if (run.mode === 'ramadan') run.rushPending = true;
      this.clearScene();
      this.state = 'cinematic';
      const M = this.cfg();
      if (!M.fixedArea && !run.areaOverride) W.setArea(run.level.area);
      W.setIntensity(run.level.n);
      A.music.set({ level: run.level.n, style: this.musicStyle() });
      A.ambience.set(run.mode === 'ramadan' ? 'ramadan' : this.areaId(), true);
      if (M.kiosk) {
        FX.showBanner(['', '', '☕ VORMITTAGS-ANSTURM', '🏫 SCHULSCHLUSS', '🚗 FEIERABEND-VERKEHR', '🌙 NACHTSCHICHT'][Math.min(5, run.levelIdx)] || '🏪 MEHR KUNDEN', 'Kunde ' + (run.served + 1) + '/' + M.customers + ' · es wird voller im Laden', 'level', 1300);
        A.play('levelUp');
        this.det('LEVEL ' + run.level.n, 'MEHR KUNDEN');
      } else this.levelBanner();
      this.voiceLine('level', 0.25);
      FX.confettiRain(50);
      this.hud();
      this.after(1.5, () => this.next());
    },

    /* ================= BOSSE: DER SUPERMARKT & MAMAS TERLIK ================= */
    startBoss(kind, hp) {
      const run = this.run, M = this.cfg();
      const B = D.BOSSES[kind] || D.BOSSES.market;
      kind = B.id;
      hp = hp || 100;
      this.clearScene();
      this.state = 'cinematic';
      if (run.rush) { run.rush = null; this.el['scr-game'].classList.remove('rush'); W.setRush(false); }
      run.boss = { hp, max: hp, side: 'right', n: run.bosses + 1, kind };
      run.queue = [];
      // Im Boss-Marathon zieht jeder Boss in seine eigene Kulisse um
      if (M.bossRush) { run.areaOverride = B.area; W.setArea(B.area); A.ambience.set(B.area, true); }
      else if (B.area === 'wedding') W.setArea('wedding');
      this.el['scr-game'].classList.add('boss-mode');
      this.renderBoss(B);
      this.el.boss.className = 'boss show ' + kind + ' ' + B.style;
      this.el['boss-hud'].hidden = false;
      this.el['boss-name'].textContent = B.icon + ' ' + B.short;
      this.updateBossHud();
      A.music.set({ boss: true, rush: false, style: this.musicStyle() });
      A.play('boom');
      A.play(kind === 'automat' ? 'vending' : kind === 'hochzeit' ? 'wedding' : 'bossLaugh');
      FX.shake('big');
      let title = B.name;
      if (kind === 'market' && run.boss.n > 1 && !M.bossRush) title = 'DER SUPERMARKT 2: NACHTSCHICHT';
      FX.showBanner('BOSS' + (M.bossRush ? ' ' + (run.bossIdx + 1) + '/' + D.BOSS_ORDER.length : '') + ': ' + title, B.intro, 'boss', 1900);
      this.det('WARNUNG', kind === 'terlik' ? 'MAMA IST SAUER' : B.short + ' ERKANNT', 'err');
      this.bossSay(B.start);
      this.voiceLine('boss', 0.35);
      this.hud();
      this.after(2.1, () => this.next());
    },
    /** Boss-Grafik: Gebäude/Automat (box) oder Emoji-Figur mit Augen (emoji) */
    renderBoss(B) {
      const el = this.el.boss;
      el.style.setProperty('--boss-c', B.color || '#ff3b5c');
      const sign = el.querySelector('.boss-sign');
      if (sign) sign.textContent = B.sign || B.short;
      const emo = el.querySelector('.eb-emo');
      if (emo) emo.textContent = B.emoji || '';
      const tag = el.querySelector('.eb-tag');
      if (tag) tag.textContent = B.tag || B.short;
    },

    updateBossHud() {
      const b = this.run.boss;
      if (!b) return;
      const pct = Math.round((b.hp / b.max) * 100);
      this.el['boss-hp'].style.width = pct + '%';
      this.el['boss-hp-text'].textContent = pct + '%';
    },
    bossSay(text) {
      const s = this.el['boss-say'];
      s.textContent = text;
      U.restartAnim(s, 'show');
    },
    bossLines(type) {
      const B = D.BOSSES[this.run.boss ? this.run.boss.kind : 'market'];
      return D.LINES[type === 'Hurt' ? B.hurt : B.taunt];
    },
    bossTaunt() { if (U.chance(0.45)) this.bossSay(U.pick(this.bossLines('Taunt'))); },
    bossHit() {
      this.updateBossHud();
      U.restartAnim(this.el.boss, 'hit');
      A.play('bossHit');
      if (U.chance(0.5)) this.bossSay(U.pick(this.bossLines('Hurt')));
    },
    bossLaugh() {
      this.updateBossHud();
      U.restartAnim(this.el.boss, 'laugh');
      A.play('bossLaugh');
      const kind = this.run.boss.kind;
      this.bossSay(D.BOSSES[kind].laugh);
      if (kind === 'terlik') this.terlikThrow(true);
      else if (kind === 'hochzeit') FX.emojiRain(['💐', '🎊', '💸'], 12);
      else if (kind === 'automat') A.play('vending');
    },
    bossDefeated() {
      const run = this.run, M = this.cfg();
      const lvl = run.level.n;
      const kind = run.boss.kind, B = D.BOSSES[kind];
      run.bossesDone[lvl] = true;
      run.bosses++;
      run.boss = null;
      this.clearItem();
      this.state = 'cinematic';
      this.el.boss.className = 'boss show dead ' + kind + ' ' + B.style;
      this.track('boss');
      this.track(B.stat);
      this.voiceLine('bossWin', 0.2);
      A.music.set({ boss: false, style: this.musicStyle() });
      A.play('boom');
      A.play('crowd', 'cheer');
      const bonus = 2500 * run.bosses;
      run.score += bonus;
      this.addAura(500);
      if (run.lives < run.maxLives) run.lives++;
      FX.confettiRain(120);
      FX.showBanner(B.win, B.winSub + ' · +' + U.fmt(bonus) + ' · +500 AURA · ❤️ +1', 'boss win', 1500);
      this.det(B.short, kind === 'terlik' ? 'ENTSCHÄRFT' : 'BESIEGT', 'ok');
      if (kind === 'hochzeit') FX.emojiRain(['💐', '🎊', '💍', '🎉'], 40);
      this.hud(true);
      const last = M.bossRush && run.bossIdx + 1 >= D.BOSS_ORDER.length;
      this.after(1.6, () => {
        if (last) return;
        FX.showBanner(M.bossRush ? 'NÄCHSTER BOSS …' : 'HALAL DETECTOR LEVEL UP', M.bossRush ? D.BOSSES[D.BOSS_ORDER[run.bossIdx + 1]].name + ' wartet schon.' : kind === 'terlik' ? 'Alhamdulillah. Weiter geht’s.' : 'Weiter geht’s. Schneller.', 'level', 1200);
        A.play('levelUp');
        this.det('LEVEL UP', 'DETECTOR v' + (run.bosses + 1) + '.0', 'ok');
      });
      this.after(2.9, () => {
        this.el['scr-game'].classList.remove('boss-mode');
        this.el.boss.className = 'boss';
        this.el['boss-hud'].hidden = true;
        if (M.bossRush) { run.bossIdx++; return this.next(); }
        W.setArea(this.areaId());
        this.levelUp(true);
      });
    },

    /* ================= ZUTATEN-MINISPIEL ================= */
    openCheck(rt) {
      const run = this.run, cur = this.cur, L = run.level, e = this.el;
      cur.decided = true; // Hauptentscheidung getroffen
      this.state = 'check';
      run.checks++;
      e['xray-hint'].hidden = true;
      const v = cur.variant;
      let total = this.tutorial || run.mode === 'zen' || this.cfg().clock ? Infinity : L.checkTime + Math.max(0, v.list.length - 6) * 0.22;
      if (cur.event === 'doener17') total = Math.max(total, 9);
      if (cur.event === 'arabic') total += 1.2;
      if (run.slowmo > 0 && isFinite(total)) total *= 1.4;
      this.chk = { left: total, total, list: v.list, opened: this.gameTime, user: false, translated: !cur.tpl.arabic, auto: 0 };
      e['ing-pack'].innerHTML = Art.itemArt(cur);
      e['ing-title'].textContent = cur.name;
      e['ing-tag'].textContent = cur.event === 'doener17' ? 'SYSTEM OVERLOAD' : cur.event === 'grandma' ? 'HANDSCHRIFTLICH' : cur.event === 'arabic' ? 'INGREDIENTS IN ARABIC' : cur.event === 'mystery' ? 'INHALT DER BOX' : 'ZUTATEN';
      e['ing-sub'].textContent = cur.event === 'mystery' ? 'Was ist drin? Tippe auf das Problem – oder entscheide.' : 'Tippe auf das Problem – oder entscheide unten.';
      e['ing-sub'].classList.remove('xray-note');
      this.renderIngredients();
      e['ing-window'].scrollTop = 0;
      e.ing.className = 'ing' + (cur.event === 'grandma' ? ' hand' : '') + (cur.event === 'doener17' ? ' overload' : '') + (cur.event === 'arabic' ? ' arabic' : '');
      e.ing.hidden = false;
      void e.ing.offsetWidth;
      e.ing.classList.add('open');
      this.setControlsMode('check');
      this.det('INGREDIENTS', 'LESEMODUS', 'scan');
      A.play('rustle');
      if (cur.tpl.arabic) {
        this.after(1.0, () => {
          if (!this.chk || this.cur !== cur) return;
          this.det('ÜBERSETZE…', 'AR → DE', 'scan');
          this.after(0.5, () => {
            if (this.chk && this.cur === cur) {
              this.chk.translated = true;
              this.renderIngredients();
              this.det('ÜBERSETZT', 'JETZT LESEN', 'ok');
              if (run.xray) { run.xray = false; this.xrayCheck(); this.renderPowerups(); }
            }
          });
        });
      } else if (run.xray) {
        run.xray = false;
        this.after(0.25, () => { if (this.chk && this.cur === cur) { this.xrayCheck(); this.renderPowerups(); } });
      }
    },

    renderIngredients() {
      const chk = this.chk, e = this.el;
      e['ing-list'].innerHTML = chk.list.map((x, i) => {
        const txt = x.ar != null && !chk.translated ? '<span class="ar" dir="rtl" lang="ar">' + U.esc(x.ar) + '</span>' :
          (x.ar != null ? '<span class="ar-small" dir="rtl" lang="ar">' + U.esc(x.ar) + '</span>' : '') + U.esc(x.text);
        return '<li><button type="button" class="ing-chip" data-i="' + i + '">' + txt + '</button></li>';
      }).join('');
    },

    tapIngredient(i, li) {
      if (this.tutorial && this.state === 'check') return this.tutorialTap(i, li);
      if (this.state !== 'check' || !this.chk || this.paused) return;
      const ing = this.chk.list[i];
      if (!ing) return;
      if (!this.chk.translated) { FX.toast('Moment – der Detector übersetzt noch…'); return; }
      if (ing.flag) {
        li.classList.add('flagged');
        A.play('found');
        return this.resolveCheck('haram', { found: ing });
      }
      // Harmlose Zutat angetippt: kostet Zeit
      this.chk.left -= 0.6;
      li.classList.remove('nope'); void li.offsetWidth; li.classList.add('nope');
      A.play('tapBad');
      const trap = D.TRAPS.find((t) => t[0].test(ing.text));
      FX.toast(trap ? trap[1] : ing.text.toUpperCase() + '? NICHT DAS PROBLEM, BRO.', 1300);
    },

    resolveCheck(choice, o) {
      const cur = this.cur, chk = this.chk;
      if (!chk) return;
      const dur = this.gameTime - chk.opened;
      const v = cur.variant;
      const ok = choice === v.verdict;
      this.state = 'feedback';
      if (ok) {
        this.closeCheck();
        this.correct(dur, { check: true, found: o && o.found, dur });
      } else {
        this.revealCheck();
        this.wrong(choice, dur, 'checkwrong');
        this.after(1.1, () => this.closeCheck());
      }
      this.chk = null;
    },

    checkTimeout() {
      if (!this.chk) return;
      this.state = 'feedback';
      this.revealCheck();
      this.chk = null;
      this.wrong(null, 0, 'checktimeout');
      this.after(1.1, () => this.closeCheck());
    },

    revealCheck() {
      const e = this.el;
      e.ing.classList.add('reveal');
      e['ing-list'].querySelectorAll('.ing-chip').forEach((b) => {
        const it = this.cur.variant.list[+b.dataset.i];
        if (it && it.flag) b.classList.add('flagged');
      });
      const f = e['ing-list'].querySelector('.flagged');
      if (f) this.scrollIng(f);
    },
    /** Nur die Zutatenliste scrollen (scrollIntoView würde auch die Bühne verschieben) */
    scrollIng(el) {
      const win = this.el['ing-window'];
      if (!win || !el) return;
      const r = el.getBoundingClientRect(), w = win.getBoundingClientRect();
      const top = win.scrollTop + (r.top - w.top) - (w.height - r.height) / 2;
      try { win.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); } catch (e) { win.scrollTop = Math.max(0, top); }
    },

    closeCheck() {
      const e = this.el;
      e.ing.classList.remove('open');
      e.ing.hidden = true;
      e.ing.className = 'ing';
      this.setControlsMode('decide');
    },

    setControlsMode(mode) {
      const c = this.el.controls, b = this.el.btns;
      c.classList.toggle('mode-check', mode === 'check');
      c.classList.toggle('mode-call', mode === 'call');
      const L = {
        decide: [['✅', 'HALAL'], ['🔎', 'INGREDIENTS'], ['❌', 'HARAM']],
        check: [['✅', 'HALAL'], ['🔎', 'LESEN…'], ['❌', 'HARAM']],
        call: [['📞', 'ANNEHMEN'], ['🔔', 'KLINGELT…'], ['📵', 'WEGDRÜCKEN']],
      }[mode] || null;
      if (!L || !b.halal) return;
      ['halal', 'check', 'haram'].forEach((k, i) => {
        b[k].querySelector('.ic').textContent = L[i][0];
        b[k].querySelector('.lb').textContent = L[i][1];
      });
      b.check.setAttribute('aria-disabled', mode === 'decide' ? 'false' : 'true');
    },

    /* ================= GAME OVER ================= */
    gameOver() {
      const run = this.run;
      if (this.state === 'over') return;
      this.state = 'over';
      run.result = 'dead';
      this.clearTimers();
      A.music.stop();
      A.ambience.set('menu', false);
      A.play('gameOver');
      A.play('boom');
      this.voiceLine('over', 0.5);
      const kiosk = this.cfg().kiosk;
      this.det(kiosk ? 'GEFEUERT.' : 'SYSTEM FAILURE.', kiosk ? '0 STERNE' : 'GAME OVER', 'err');
      this.el['scr-game'].classList.add('frozen');
      FX.showBanner(kiosk ? 'DER CHEF HAT DICH GEFEUERT 😤' : 'SYSTEM FAILURE.', kiosk ? '0 Sterne. Schicht vorzeitig beendet.' : '', 'bad over', 1400);
      setTimeout(() => HHD.UI.showGameOver(this.summary()), 1500);
    },

    /** Runde auswerten und speichern (auch beim Beenden im Übungsmodus) */
    summary() {
      const run = this.run;
      const S = HHD.Store;
      const zen = run.mode === 'zen';
      const acc = run.total ? Math.min(100, Math.round((run.correct / run.total) * 100)) : 0;
      const rank = D.RANKS.filter((r) => run.score >= r[0]).pop();
      const M = this.cfg();
      let xp = Math.round(run.score / 20 + run.correct * 5 + run.bosses * 200);
      let coins = Math.round(run.score / 25 + run.correct * 2) + run.tips;
      if (run.mode === 'hardcore') coins = Math.round(coins * 1.5);
      if (run.result && run.result !== 'dead' && run.result !== 'zeit') { xp = Math.round(xp * 1.2); coins += 150; }
      if (zen) { xp = Math.round(run.correct * 2); coins = Math.round(run.correct); }
      const area = D.AREAS.find((a) => a.id === this.areaId());
      const summary = {
        mode: run.mode, score: run.score, maxCombo: run.maxCombo, fastest: run.fastest, correct: run.correct, wrong: run.wrong,
        aura: run.aura, fastestCheck: run.fastestCheck, checks: run.checks, bosses: run.bosses, legendary: run.legendary,
        accuracy: acc, xp, coins, areaName: area ? area.name : '', level: run.level.n, rank, total: run.total,
        avg: run.reactN ? run.reactSum / run.reactN : 0, day: run.day, eid: run.eid,
        comment: U.pick(D.LINES.gameover),
        // 3.0
        result: run.result || 'dead', served: run.served, tips: run.tips, stars: M.kiosk ? Math.max(0, run.lives) : null,
        bossIdx: run.bossIdx, mutCount: run.mutCount, dailyIdx: run.dailyIdx, skipped: run.skipped,
      };
      if (M.kiosk) {
        const rv = D.KIOSK.reviews.find((r) => summary.stars >= r[0]);
        summary.review = rv ? rv[1] : '';
      }
      const prevXp = S.data.xp;
      if (zen) {
        S.data.xp += xp; S.data.coins += coins; S.save();
        summary.news = {};
      } else {
        summary.news = S.recordRun(summary);
        Meta.add('games');
        Meta.max('score', run.score);
        Meta.max('aura', run.aura);
        // Modus-Ziele
        if (run.result === 'kiosk') { Meta.add('kioskDone'); if (summary.stars >= 5) Meta.add('kiosk5'); }
        if (run.result === 'bossrush') Meta.add('bossrushWin');
        if (run.result === 'daily') Meta.add('dailyDone');
        if (M.daily) summary.dailyBest = S.recordDaily(run.score);
      }
      // Freischaltbare Skins
      const unlock = (id) => {
        if (S.data.owned.includes(id)) return;
        S.data.owned.push(id);
        summary.unlockSkin = (summary.unlockSkin ? summary.unlockSkin + ', ' : '') + D.SKINS.find((k) => k.id === id).name;
        Meta.max('skins', S.data.owned.length);
      };
      if (!zen && run.result === 'kiosk' && summary.stars >= 5) unlock('kiosk');
      if (!zen && run.result === 'bossrush') unlock('hochzeit');
      summary.unlockedAreas = D.AREAS.filter((a) => a.xp > prevXp && a.xp <= S.data.xp).map((a) => a.name);
      if (run.maxCombo >= 75 && !S.data.owned.includes('forbidden')) {
        S.data.owned.push('forbidden');
        summary.forbidden = true;
        Meta.max('skins', S.data.owned.length);
      }
      summary.newAch = Meta.achCount() - run.achBefore;
      summary.missionsDone = Meta.missionsDone();
      summary.title = Meta.title(S.playerLevel().lvl);
      S.save();
      return summary;
    },

    quit() {
      const run = this.run;
      // Übungsmodus: Fortschritt (Lexikon/XP) trotzdem verbuchen
      if (run && run.mode === 'zen' && !this.tutorial && run.total > 0 && this.state !== 'over') this.summary();
      this.clearTimers();
      this.state = 'idle';
      this.paused = false;
      this.tutorial = null;
      this.call = null;
      A.music.stop();
      A.ambience.set('menu', false);
      this.el.pause.hidden = true;
      this.resetStage();
      HHD.Store.save();
    },

    /* ================= PAUSE ================= */
    pause() {
      if (this.paused || !['decide', 'check', 'feedback', 'cinematic', 'call'].includes(this.state)) return;
      this.paused = true;
      this.el.pause.hidden = false;
      if (HHD.UI) HHD.UI.renderSettings();
      A.music.stop();
    },
    resume() {
      if (!this.paused) return;
      this.paused = false;
      this.el.pause.hidden = true;
      if (this.state !== 'over') A.music.start('game');
    },

    /* ================= HUD ================= */
    hud(bump) {
      const run = this.run, e = this.el;
      if (!run) return;
      e['hud-score'].textContent = U.fmt(run.score);
      e['hud-combo'].textContent = 'x' + run.combo;
      e['hud-mult'].textContent = '×' + (1 + Math.min(run.combo, 50) * 0.1).toFixed(1).replace('.', ',');
      e['hud-aura'].textContent = U.fmtSigned(run.aura);
      e['hud-aura'].classList.toggle('neg', run.aura < 0);
      const M = this.cfg();
      let hearts = '';
      if (run.mode === 'zen') hearts = '<i class="on">🧘</i><i class="on">∞</i>';
      else if (M.clock) hearts = '<i class="on">⏱️</i><b class="hud-clock">' + Math.ceil(Math.max(0, run.clock)) + ' s</b>';
      else if (M.kiosk) for (let i = 0; i < run.maxLives; i++) hearts += '<i class="star ' + (i < run.lives ? 'on' : 'off') + '">⭐</i>';
      else for (let i = 0; i < run.maxLives; i++) hearts += '<i class="' + (i < run.lives ? 'on' : 'off') + '">' + (i < run.lives ? '❤️' : '🖤') + '</i>';
      if (run.shield) hearts += '<i class="on shield" title="Mamas Dua">🤲</i>';
      e['hud-lives'].innerHTML = hearts;
      const area = D.AREAS.find((a) => a.id === this.areaId());
      let lbl = 'LVL ' + run.level.n + ' · ' + (area ? area.name : '');
      if (run.mode === 'ramadan') lbl = '🌙 TAG ' + run.day + '/30 · LVL ' + run.level.n;
      else if (run.mode === 'hardcore') lbl = '💀 ' + lbl;
      else if (run.mode === 'zen') lbl = '🧘 ÜBEN · ' + lbl;
      else if (M.clock) lbl = '⏱️ ZEITJAGD · ' + run.correct + ' RICHTIG';
      else if (M.kiosk) lbl = '🏪 KUNDE ' + Math.max(1, run.served) + '/' + M.customers + ' · 💰 ' + run.tips;
      else if (M.daily) lbl = '📅 ' + Math.max(1, run.dailyIdx) + '/' + M.items + ' · LVL ' + run.level.n;
      else if (M.checkOnly) lbl = '📜 PROFI · LVL ' + run.level.n;
      else if (M.chaos) lbl = (run.mutator ? run.mutator.icon + ' ' + run.mutator.name : '🌀 CHAOS') + ' · LVL ' + run.level.n;
      if (run.rush) lbl = '🌙 IFTAR RUSH · ' + Math.max(1, 8 - run.rush.left) + '/8';
      if (run.boss) {
        const B = D.BOSSES[run.boss.kind];
        lbl = B.icon + ' ' + B.short + (M.bossRush ? ' · BOSS ' + (run.bossIdx + 1) + '/' + D.BOSS_ORDER.length : ' · LVL ' + run.level.n);
      }
      e['hud-level'].textContent = lbl;
      const tier = run.combo >= 50 ? 4 : run.combo >= 20 ? 3 : run.combo >= 10 ? 2 : run.combo >= 5 ? 1 : 0;
      e['scr-game'].dataset.combo = tier;
      if (bump) {
        U.restartAnim(e['hud-score'], 'bump');
        U.restartAnim(e['hud-combo'], 'bump');
      }
    },

    updateTimerUI(left, total) {
      const e = this.el;
      if (!isFinite(left) || !isFinite(total)) {
        e['hud-time'].textContent = '∞';
        e['hud-timebar'].style.transform = 'scaleX(1)';
        if (e['hud-timebar'].dataset.s !== 'hi') { e['hud-timebar'].dataset.s = 'hi'; e['hud-time'].dataset.s = 'hi'; }
        return;
      }
      const l = Math.max(0, left);
      e['hud-time'].textContent = U.fmtSec(l);
      const frac = U.clamp(l / total, 0, 1);
      e['hud-timebar'].style.transform = 'scaleX(' + frac.toFixed(3) + ')';
      const cls = frac > 0.5 ? 'hi' : frac > 0.25 ? 'mid' : 'lo';
      if (e['hud-timebar'].dataset.s !== cls) { e['hud-timebar'].dataset.s = cls; e['hud-time'].dataset.s = cls; }
    },

    /* ================= FRAME-UPDATE ================= */
    update(dt) {
      if (this.paused || this.state === 'idle') return;
      this.gameTime += dt;
      // Timer
      for (let i = 0; i < this.timers.length; i++) {
        const t = this.timers[i];
        t.t -= dt;
        if (t.t <= 0) { this.timers.splice(i, 1); i--; t.fn(); }
      }
      if (this.tutorial) return;
      const run = this.run;
      // Zeitjagd: eine Uhr für die ganze Runde (pausiert in Zwischensequenzen)
      if (run && run.clockMax && this.state !== 'over') {
        if (['decide', 'check', 'feedback', 'call'].includes(this.state)) {
          const before = run.clock;
          // Die Uhr läuft mit jedem Level etwas schneller
          run.clock = Math.max(0, run.clock - dt * (1 + (run.level.n - 1) * 0.12));
          if (run.clock <= 10 && !run.tenSec) { run.tenSec = true; this.voiceLine('ten'); FX.toast('⏱️ NOCH 10 SEKUNDEN!', 1200); }
          if (run.clock <= 5 && Math.ceil(run.clock) !== Math.ceil(before)) A.play('tick', true);
          if (Math.ceil(run.clock) !== Math.ceil(before)) this.hud();
          if (run.clock <= 0) { this.finish('zeit'); return; }
        }
        this.updateTimerUI(run.clock, run.clockMax);
        const panic = run.clock < 6;
        if (panic !== this._panic) { this._panic = panic; A.music.set({ panic }); }
        return;
      }
      if (this.state === 'decide' && this.cur && !this.cur.decided) {
        const cur = this.cur;
        if (!isFinite(cur.time)) { this.updateTimerUI(Infinity, Infinity); return; }
        if (!run.frozen) cur.left -= dt;
        this.updateTimerUI(cur.left, cur.time);
        const panic = cur.left < 0.35;
        if (panic !== this._panic) { this._panic = panic; A.music.set({ panic }); }
        const tk = Math.ceil(cur.left * 4);
        if (cur.left < 0.8 && tk !== this._tick) { this._tick = tk; A.play('tick', cur.left < 0.3); }
        if (cur.left <= 0) this.timeout();
      } else if (this.state === 'check' && this.chk) {
        const chk = this.chk;
        const finite = isFinite(chk.total);
        if (finite && !run.frozen) chk.left -= dt;
        this.updateTimerUI(chk.left, chk.total);
        this.el['ing-bar'].style.transform = 'scaleX(' + (finite ? U.clamp(chk.left / chk.total, 0, 1) : 1).toFixed(3) + ')';
        // Auto-Scroll (bis ~65 % der Zeit ist alles einmal sichtbar gewesen)
        if (!chk.user && chk.translated && finite) {
          const win = this.el['ing-window'];
          const max = win.scrollHeight - win.clientHeight;
          if (max > 2) {
            const speed = max / Math.max(0.8, chk.total * 0.62 * (1.4 - this.run.level.scroll * 0.4));
            chk.auto = Math.min(max, chk.auto + speed * dt);
            win.scrollTop = chk.auto;
          }
        }
        const panic = finite && chk.left < 0.8;
        if (panic !== this._panic) { this._panic = panic; A.music.set({ panic }); }
        if (finite && chk.left <= 0) this.checkTimeout();
      } else if (this.state === 'call' && this.call) {
        const c = this.call;
        c.left -= dt;
        this.updateTimerUI(c.left, c.total);
        const r = Math.floor((c.total - c.left) / 0.95);
        if (r !== c.ring) { c.ring = r; A.play('ring'); }
        if (c.left <= 0) this.answerCall(false);
      } else if (this._panic) {
        this._panic = false;
        A.music.set({ panic: false });
      }
    },

    /* ================= TUTORIAL ================= */
    startTutorial(onDone) {
      this.clearTimers();
      this.gameTime = 0;
      this.run = this.newRun(D.AREAS[0], 'normal');
      this.run.maxLives = 3;
      this.tutorial = { step: 0, onDone };
      this.renderDetector();
      this.resetStage();
      W.setTheme(null);
      W.setArea('street');
      W.setIntensity(1);
      A.music.set({ mode: 'game', level: 1, combo: 0, boss: false, panic: false, rush: false, slow: false, style: 'arcade' });
      A.music.start('game');
      this.hud();
      this.updateTimerUI(Infinity, Infinity);
      this.state = 'cinematic';
      FX.showBanner('TUTORIAL', 'Der Döner-Meister erklärt.', 'level', 1100);
      this.after(1.1, () => this.tutorialStep());
    },

    TUT: [
      { id: 'apfel', expect: 'halal', say: 'WHAT IS THIS?', hint: 'Obst? Tippe ✅ HALAL', ok: 'GOOD.' },
      { id: 'schweinefleisch', expect: 'haram', say: 'UND DAS?', hint: 'Schwein. Tippe ❌ HARAM', ok: 'EASY.' },
      { id: 'gummibaerchen', expect: 'check', say: "NOW DON'T GUESS.", hint: 'Unklar! Tippe 🔎 INGREDIENTS', ok: 'WHEN YOU DON’T KNOW, CHECK.' },
    ],

    tutorialStep() {
      const t = this.tutorial;
      const s = this.TUT[t.step];
      this.clearItem();
      const tpl = D.ITEMS.find((i) => i.id === s.id);
      const inst = this.makeInstance(tpl, { noDisrupt: true, forceVerdict: 'haram' });
      inst.npc = 'meister'; inst.npcLine = s.say;
      inst.time = Infinity; inst.left = Infinity; inst.shownAt = this.gameTime; inst.decided = false;
      if (inst.variant) inst.variant = { verdict: 'haram', list: [{ text: 'Glukosesirup', flag: false }, { text: 'Zucker', flag: false }, { text: 'Gelatine (Schwein)', flag: true }, { text: 'Säuerungsmittel: Citronensäure', flag: false }, { text: 'Fruchtsaftkonzentrat', flag: false }], note: null };
      this.cur = inst;
      Meta.see(inst.id);
      const el = Art.makeItemEl(inst, 'enter');
      inst.el = el;
      this.el['item-slot'].appendChild(el);
      this.el['loc-tag'].textContent = '📍 DÖNERLADEN';
      U.restartAnim(this.el['loc-tag'], 'show');
      this.showPresenter('meister', s.say);
      this.el.presenter.classList.add('pointing');
      this.tutHint(s.hint, s.expect);
      A.play('beep');
      this.det('???', 'TUTORIAL');
      this.scanFx();
      this.state = 'decide';
    },

    tutHint(text, expect) {
      const h = this.el['tut-hint'];
      h.textContent = text;
      h.hidden = false;
      U.restartAnim(h, 'show');
      Object.entries(this.el.btns).forEach(([k, b]) => { b.classList.toggle('tut-glow', k === expect); b.classList.toggle('tut-dim', !!expect && k !== expect); });
    },
    tutClear() {
      this.el['tut-hint'].hidden = true;
      Object.values(this.el.btns).forEach((b) => b.classList.remove('tut-glow', 'tut-dim'));
    },

    tutorialInput(choice) {
      const t = this.tutorial;
      const s = this.TUT[t.step];
      A.play('click');
      this.pressFx(choice);
      if (this.state === 'check') {
        if (choice === 'haram') return this.tutorialCheckDone();
        if (choice === 'halal') { A.play('wrong'); FX.shake(); this.showPresenter('meister', 'BRO… DA STEHT GELATINE (SCHWEIN)!'); }
        return;
      }
      if (this.state !== 'decide') return;
      if (choice !== s.expect) {
        A.play('wrong');
        FX.shake();
        this.showPresenter('meister', s.expect === 'check' ? 'NICHT RATEN! 🔎 CHECKEN!' : 'BRO… NOCHMAL.');
        this.el.presenter.classList.add('pointing');
        return;
      }
      if (s.expect === 'check') {
        this.openCheck(0);
        this.el['ing-sub'].textContent = 'LIES DIE ZUTATEN. Tippe auf das Problem – oder drücke ❌ HARAM.';
        this.tutHint('Finde das Problem in der Liste!', 'haram');
        this.updateTimerUI(Infinity, Infinity);
        return;
      }
      this.state = 'feedback';
      this.cur.decided = true;
      if (!this.announce(s.expect, 'n', 0.04)) A.play('accept');
      A.play('correct', 1);
      this.det('BEEP BEEP BEEP', 'CLASSIFICATION ACCEPTED', 'ok');
      const c = this.itemCenter();
      FX.burst(c.x, c.y, { n: 24 });
      FX.flash('rgba(61,255,139,0.28)');
      if (this.cur.el) this.cur.el.classList.add('exit-ok');
      this.showPresenter('meister', s.ok);
      this.memeText(s.ok, this.explain(this.cur), 'ok');
      this.tutClear();
      this.after(1.2, () => { t.step++; this.tutorialStep(); });
    },

    tutorialTap(i, li) {
      const ing = this.chk.list[i];
      if (ing.flag) { li.classList.add('flagged'); A.play('found'); return this.tutorialCheckDone(); }
      li.classList.remove('nope'); void li.offsetWidth; li.classList.add('nope');
      A.play('tapBad');
      FX.toast(ing.text.toUpperCase() + '? NICHT DAS PROBLEM, BRO.', 1200);
    },

    tutorialCheckDone() {
      this.state = 'feedback';
      this.chk = null;
      this.closeCheck();
      this.tutClear();
      if (!this.announce('haram', 'h', 0.04)) A.play('accept');
      A.play('correct', 3); A.play('crowd', 'cheer');
      this.det('BEEP BEEP BEEP', 'CLASSIFICATION ACCEPTED', 'ok');
      const c = this.itemCenter();
      FX.burst(c.x, c.y, { n: 40 });
      if (this.cur.el) this.cur.el.classList.add('exit-ok');
      this.showPresenter('meister', 'WHEN YOU DON’T KNOW, CHECK.');
      this.memeText('WHEN YOU DON’T KNOW, CHECK.', 'Gelatine vom Schwein gefunden → HARAM.', 'ok');
      FX.showBanner('WHEN YOU DON’T KNOW, CHECK.', 'Tutorial geschafft!', 'combo', 1700);
      this.after(1.9, () => {
        FX.showBanner('LOS GEHT’S!', 'Ab jetzt läuft die Zeit.', 'level', 1000);
        this.after(1.0, () => {
          const done = this.tutorial.onDone;
          this.tutorial = null;
          if (done) done();
        });
      });
    },
  };

  HHD.Game = G;
})();
