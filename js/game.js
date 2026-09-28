/* Halal Haram Detector – Gameplay-Kern
 * Ablauf: Produkt erscheint → Detector scannt → Spieler entscheidet (HALAL / INGREDIENTS / HARAM)
 * → Feedback → nächstes Produkt, immer schneller.
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

  const ENTER = 0.18; // Flug-Animation des Produkts (in der Entscheidungszeit enthalten)
  const CHOICE_LABEL = { halal: '✅ HALAL', haram: '❌ HARAM', check: '🔎 INGREDIENTS' };

  const G = {
    el: {},
    state: 'idle',
    run: null,
    cur: null,
    chk: null,
    timers: [],
    gameTime: 0,
    paused: false,
    lastTick: 0,
    tutorial: null,

    init() {
      const $ = (id) => document.getElementById(id);
      const e = this.el;
      ['stage', 'det-slot', 'item-slot', 'queue', 'loc-tag', 'presenter', 'meme', 'disrupt', 'bubbles', 'floaters', 'banner',
        'ing', 'ing-pack', 'ing-title', 'ing-sub', 'ing-bar', 'ing-window', 'ing-list', 'ing-tag', 'controls',
        'hud-score', 'hud-combo', 'hud-mult', 'hud-aura', 'hud-time', 'hud-timebar', 'hud-lives', 'hud-level',
        'boss-hud', 'boss-hp', 'boss-hp-text', 'boss', 'boss-say', 'pause', 'tut-hint', 'scr-game', 'app'].forEach((id) => { e[id] = $(id); });
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

    /* ================= RUNDE STARTEN ================= */
    start(areaId) {
      const area = D.AREAS.find((a) => a.id === areaId) || D.AREAS[0];
      const levelIdx = area.level - 1;
      this.clearTimers();
      this.gameTime = 0;
      this.tutorial = null;
      this.run = {
        areaId: area.id, startArea: area, levelIdx, level: D.LEVELS[levelIdx],
        lives: 3, maxLives: 5, score: 0, combo: 0, maxCombo: 0, aura: 0,
        correct: 0, wrong: 0, total: 0, checks: 0, fastest: 0, fastestCheck: 0, reactSum: 0, reactN: 0,
        itemsInLevel: 0, wrongStreak: 0, overchecks: [], boss: null, bossesDone: {}, bosses: 0, legendary: 0,
        queue: [], recent: [], lastTpl: null, updateJoke: false, heat: 0,
      };
      this.cur = null;
      this.chk = null;
      this.renderDetector();
      this.resetStage();
      W.setArea(this.run.level.area);
      W.setIntensity(this.run.level.n);
      W.setScan(false); W.setOverview(false);
      A.music.set({ mode: 'game', level: this.run.level.n, combo: 0, boss: false, panic: false });
      A.music.start('game');
      A.ambience.set(this.run.level.area, true);
      this.hud();
      this.state = 'cinematic';
      this.levelBanner();
      this.after(1.35, () => this.next());
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
      e['scr-game'].classList.remove('frozen', 'zoomout', 'boss-mode', 'apoc');
      this.setControlsMode('decide');
      FX.hideBanner();
    },

    levelBanner() {
      const L = this.run.level;
      const area = D.AREAS.find((a) => a.id === L.area);
      FX.showBanner('LEVEL ' + L.n + ' – ' + L.name, '📍 ' + area.name + (L.n === 7 ? ' · ALLES IST CHAOS' : ''), 'level', 1300);
      this.det('LEVEL ' + L.n, L.name);
      A.play('levelUp');
      this.el['scr-game'].classList.toggle('apoc', L.n === 7);
    },

    /* ================= PRODUKT-AUSWAHL ================= */
    areaPlaces() {
      const area = D.AREAS.find((a) => a.id === this.run.level.area);
      return area ? area.places : [];
    },

    pickTemplate(opts) {
      const run = this.run, L = run.level;
      opts = opts || {};
      // Zwilling (ähnlich aussehendes Produkt direkt danach)
      const last = run.lastTpl;
      if (!opts.boss && last && last.twin && U.chance(L.twin)) {
        const tw = D.ITEMS.find((i) => i.id === last.twin);
        if (tw && tw.tier <= L.n + 1 && !run.recent.slice(-2).includes(tw.id)) return tw;
      }
      const wantCheck = U.chance(opts.boss ? 0.35 : L.checkShare);
      const places = opts.boss ? ['supermarkt'] : this.areaPlaces();
      let cands = D.ITEMS.filter((i) => i.tier <= L.n && (wantCheck ? i.ans === 'check' : i.ans !== 'check') && !run.recent.includes(i.id));
      if (!cands.length) cands = D.ITEMS.filter((i) => i.tier <= L.n);
      const weights = cands.map((i) => {
        let w = i.places.some((p) => places.includes(p)) ? 3 : 1;
        if (i.tier >= L.n - 1) w *= 1.5;
        return w;
      });
      return U.weighted(cands, weights);
    },

    /** Baut aus einer Vorlage eine konkrete Produkt-Instanz (Variante, Ort, NPC, Störung, Zeit) */
    makeInstance(tpl, extra) {
      const run = this.run, L = run.level;
      extra = extra || {};
      const inst = { tpl, id: tpl.id, name: tpl.name, ans: tpl.ans, art: tpl.art, legend: !!tpl.legend, event: extra.event || null };
      const places = this.areaPlaces();
      const inArea = tpl.places.filter((p) => places.includes(p));
      inst.place = U.pick(inArea.length ? inArea : tpl.places);
      if (tpl.ans === 'check') inst.variant = this.buildVariant(tpl, extra.forceVerdict);
      // Präsentierender NPC
      if (tpl.npc) { inst.npc = tpl.npc; inst.npcLine = tpl.npcLine; }
      else if (extra.npc) { inst.npc = extra.npc; inst.npcLine = extra.npcLine; }
      else {
        const pool = D.PLACE_NPCS[inst.place] || ['shopper'];
        const p = inst.place === 'doener' ? 0.65 : 0.28;
        if (U.chance(p)) {
          inst.npc = U.pick(pool);
          const n = D.NPCS[inst.npc];
          inst.npcLine = inst.npc === 'meister' && U.chance(0.5) ? 'BRUDER, WAS WILLST DU?' : U.pick(n.lines);
        }
      }
      // Zufällige Störungen
      if (!extra.noDisrupt && !inst.event && !inst.legend && U.chance(L.events)) {
        const opts = ['bus', 'npc', 'hand'];
        if (L.n >= 3) opts.push('flip', 'partial');
        if (L.n >= 4) opts.push('fly');
        inst.disrupt = U.pick(opts);
      }
      // Entscheidungszeit
      const prog = L.items === Infinity ? Math.min(1, run.itemsInLevel / 60) : Math.min(1, run.itemsInLevel / L.items);
      let t = U.lerp(L.time, L.minTime, prog);
      if (tpl.art.t !== 'emoji') t *= 1.15;
      if (run.lastTpl && run.lastTpl.twin === tpl.id) t *= 1.1;
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
      let vs = tpl.v;
      if (tpl.id === 'doener17') return this.buildDoener17();
      if (forceVerdict) vs = vs.filter((v) => v[0] === forceVerdict) || vs;
      const v = U.pick(vs.length ? vs : tpl.v);
      let list = v[1].map((x) => {
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
      const run = this.run, n = run.level.n, area = run.level.area;
      if (U.chance(0.008)) {
        const tpl = U.pick(D.LEGENDARY);
        return this.makeInstance(tpl, { noDisrupt: true });
      }
      if (n >= 2 && U.chance(area === 'doener' ? 0.015 : 0.005)) return this.makeInstance(D.EVENTS.doener17, { event: 'doener17' });
      if (n >= 2 && U.chance(0.01)) return this.makeInstance(D.EVENTS.mystery, { event: 'mystery' });
      if (n >= 2 && U.chance(0.01)) return this.makeInstance(D.EVENTS.grandma, { event: 'grandma' });
      if (n >= 3 && U.chance(0.01)) return this.makeInstance(D.EVENTS.arabic, { event: 'arabic' });
      if (n >= 2 && U.chance(0.012)) {
        const cands = D.ITEMS.filter((i) => i.ans === 'check' && i.tier <= n);
        return this.makeInstance(U.pick(cands), { event: 'trust', npc: 'bro', npcLine: "BROTHER TRUST ME, IT'S HALAL." });
      }
      return null;
    },

    generate(opts) {
      const run = this.run;
      let inst = !opts.boss ? this.rollSpecial() : null;
      if (!inst) inst = this.makeInstance(this.pickTemplate(opts), opts);
      if (!inst.event && !opts.boss && run.level.n >= 2 && U.chance(0.008)) inst.pigeon = true;
      run.lastTpl = inst.tpl;
      run.recent.push(inst.id);
      if (run.recent.length > 7) run.recent.shift();
      return inst;
    },

    /* ================= NÄCHSTES PRODUKT ================= */
    next() {
      const run = this.run;
      if (!run || this.state === 'over') return;
      const L = run.level;
      if (!run.boss && run.itemsInLevel >= L.items) {
        if (L.boss && !run.bossesDone[L.n]) return this.startBoss();
        return this.levelUp();
      }
      if (run.level.n >= 3 && !run.updateJoke && !run.boss && U.chance(0.006)) return this.updateJoke();

      this.clearItem();
      const e = this.el;
      let inst;
      if (run.boss) {
        inst = this.generate({ boss: true });
        inst.from = run.boss.side = run.boss.side === 'left' ? 'right' : 'left';
      } else {
        const want = L.preview;
        while (run.queue.length < want + 1) run.queue.push(this.generate({}));
        inst = run.queue.shift();
        while (run.queue.length < want) run.queue.push(this.generate({}));
      }
      this.cur = inst;
      inst.left = inst.time;
      inst.shownAt = this.gameTime;
      inst.decided = false;

      // Produkt ins Bild bringen
      const el = Art.makeItemEl(inst, inst.from ? 'enter-' + inst.from : 'enter');
      if (inst.disrupt === 'flip') el.classList.add('flipped');
      if (inst.disrupt === 'partial') el.classList.add('partial');
      inst.el = el;
      e['item-slot'].appendChild(el);
      this.renderQueue();

      // Ort
      e['loc-tag'].textContent = '📍 ' + (D.PLACES[inst.place] || '');
      U.restartAnim(e['loc-tag'], 'show');

      // NPC
      if (inst.npc) this.showPresenter(inst.npc, inst.npcLine);
      else e.presenter.className = 'presenter';

      e.meme.className = 'meme';
      this.setControlsMode('decide');

      // Detector-Sequenz: BEEP → SCANNING... → ???
      A.play('beep');
      this.det('BEEP', '', 'scan');
      this.scanFx();
      this.after(0.08, () => { if (this.cur === inst && !inst.decided) { this.det('SCANNING...', '', 'scan'); A.play('scan'); } });
      this.after(0.3, () => {
        if (this.cur !== inst || inst.decided) return;
        if (inst.event === 'trust') this.det('TRUST LEVEL: 0%', 'SELBST PRÜFEN!', 'warn');
        else if (inst.event === 'doener17') { this.det('SYSTEM OVERLOAD', '17 SOSSEN ERKANNT', 'warn'); A.play('overload'); FX.shake('big'); }
        else if (inst.event === 'mystery') this.det('???', 'INHALT: UNBEKANNT', 'warn');
        else if (inst.event === 'arabic') this.det('???', 'SPRACHE: ARABISCH', 'warn');
        else if (inst.legend) this.det('LEGENDARY!', 'SELTENHEIT: 0,8%', 'ok');
        else this.det('???', this.run.boss ? 'BOSS-PRODUKT' : '');
      });

      if (inst.legend) { A.play('legendary'); FX.showBanner('✦ LEGENDARY ITEM ✦', inst.name, 'legend', 1000); }
      if (inst.event === 'mystery') FX.showBanner('MYSTERY BOX', 'BROTHER… WHAT IS INSIDE?', 'event', 1100);
      if (inst.event === 'grandma') FX.showBanner('GRANDMA MODE', 'ICH HABE DAS SELBST GEMACHT.', 'event', 1100);
      if (inst.event === 'arabic') FX.showBanner('INGREDIENTS IN ARABIC', 'Genauer prüfen?', 'event', 1100);
      if (inst.event === 'trust') FX.showBanner('BROTHER TRUST ME', 'TRUST LEVEL: 0%', 'event', 1000);
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
      this.state = 'decide';
    },

    renderQueue() {
      const q = this.el.queue;
      q.innerHTML = '';
      if (this.run.boss) return;
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

    scanFx() {
      const s = this.el.stage;
      U.restartAnim(s, 'scanning');
    },

    clearItem() {
      const e = this.el;
      if (this.cur && this.cur.el) {
        const old = this.cur.el;
        this.cur.el = null;
        Art.releaseItemEl(old);
      }
      e['item-slot'].innerHTML = '';
      e.disrupt.innerHTML = '';
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

    /* ================= EINGABE ================= */
    input(choice) {
      if (this.paused) return;
      if (this.tutorial) return this.tutorialInput(choice);
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
      const run = this.run;
      const base = 100 * (1 + (run.level.n - 1) * 0.25);
      const combo = 1 + Math.min(run.combo, 50) * 0.1;
      let p = base * (1 + frac) * combo;
      if (o.check) p *= 1.5;
      if (o.found) p *= 1.2;
      if (this.cur && this.cur.legend) p *= 5;
      if (run.boss) p *= 1.2;
      return Math.round(p / 10) * 10;
    },

    correct(rt, o) {
      const run = this.run, cur = this.cur;
      cur.decided = true;
      this.state = 'feedback';
      run.correct++; run.total++; run.combo++; run.itemsInLevel++;
      run.maxCombo = Math.max(run.maxCombo, run.combo);
      run.wrongStreak = 0;
      if (cur.legend) run.legendary++;
      let frac;
      if (o.check) {
        frac = this.chk ? U.clamp(this.chk.left / this.chk.total, 0, 1) : 0.5;
        if (!run.fastestCheck || o.dur < run.fastestCheck) run.fastestCheck = +o.dur.toFixed(3);
      } else {
        frac = U.clamp(1 - (rt - ENTER) / (cur.time - ENTER), 0, 1);
        const r = Math.max(0.05, rt);
        if (!run.fastest || r < run.fastest) run.fastest = +r.toFixed(3);
        run.reactSum += r; run.reactN++;
      }
      const pts = this.points(frac, o);
      run.score += pts;

      // Aura
      let aura = 0, line, sub = '';
      const tier = o.check ? 'correctCheck' : cur.ans === 'haram' ? 'correctHaram' : 'correctHalal';
      line = U.pick(D.LINES[tier]);
      if (o.found) { line = U.pick(D.LINES.found); aura += 150; sub = 'Gefunden: ' + o.found.text; }
      if (o.check && this.chk && this.chk.list.length >= 10) aura += 200;
      if (!o.check && rt < 0.35) { aura += 250; line = U.fmtSec(rt).replace('s', '') + ' SEKUNDEN?!'; }
      else if (!o.check && rt < 0.55) { aura += 100; line = U.pick(D.LINES.instant); }
      else if (!o.check && frac < 0.12) { aura -= 50; line = 'KNAPP… ZU LANGE GEZÖGERT.'; }
      if (cur.legend) { aura += 500; line = 'LEGENDARY GESICHERT ✦'; }
      if (o.check && cur.variant && cur.variant.note) sub = cur.variant.note;
      else if (o.check && !sub) sub = cur.variant.verdict === 'haram' ? 'Drin war: ' + this.flagText(cur) + ' → HARAM' : 'Alle Zutaten unproblematisch → HALAL';
      else if (!sub) sub = this.explain(cur);
      if (aura) this.addAura(aura);

      // Präsentation
      this.det('BEEP BEEP BEEP', 'CLASSIFICATION ACCEPTED', 'ok');
      A.play('correct', run.combo);
      A.play('accept');
      const c = this.itemCenter();
      const skin = D.SKINS.find((s) => s.id === HHD.Store.data.skin) || D.SKINS[0];
      FX.burst(c.x, c.y, { n: 18 + Math.min(40, run.combo), colors: [skin.laser, '#ffffff', '#ffe45e', '#5ec8ff'] });
      if (cur.legend) FX.burst(c.x, c.y, { n: 30, text: '✦', colors: ['#ffd700'], smin: 5, smax: 9 });
      FX.flash('rgba(61,255,139,0.28)');
      FX.float('+' + U.fmt(pts), c.x, c.y - 30, 'pts');
      if (aura) FX.float(U.fmtSigned(aura) + ' AURA', c.x + 40, c.y + 10, aura > 0 ? 'aura' : 'neg');
      this.memeText(line, sub, 'ok');
      if (cur.el) cur.el.classList.add('exit-ok');

      this.hud(true);
      A.music.set({ combo: run.combo, panic: false });

      // Boss
      if (run.boss) {
        run.boss.hp = Math.max(0, run.boss.hp - 10);
        this.bossHit();
        if (run.boss.hp <= 0) { this.after(0.5, () => this.bossDefeated()); return; }
      }
      if (this.comboMilestone()) return;
      this.after(this.fbDelay(true), () => this.next());
    },

    fbDelay(ok) {
      const n = this.run.level.n;
      return ok ? Math.max(0.3, 0.46 - n * 0.02) : 1.3;
    },

    /** Falsch – inkl. Raten, Timeout, falsches Zutaten-Urteil */
    wrong(choice, rt, kind, info) {
      const run = this.run, cur = this.cur;
      cur.decided = true;
      this.state = 'feedback';
      run.wrong++; run.total++; run.itemsInLevel++;
      run.wrongStreak++;
      run.lvlErr = (run.lvlErr || 0) + 1;
      const broke = this.breakCombo();
      run.lives--;
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
      } else {
        const obvious = cur.tpl.tier <= 2;
        aura = obvious ? -500 : -300;
        line = obvious ? '-500 AURA' : U.pick(D.LINES.wrong);
        sub = this.explain(cur);
        if (obvious && U.chance(0.5)) line = U.pick(['WIE HAST DU DAS NICHT GESEHEN?', 'BRO…', '-500 AURA']);
      }
      let big = false;
      if (run.wrongStreak >= 3) { aura -= 900; big = true; }
      this.addAura(aura);

      this.det('ERROR 404', 'COMMON SENSE NOT FOUND', 'err');
      A.play('wrong');
      if (big) { A.play('boom'); A.play('crowd', 'ooh'); }
      else if (U.chance(0.4)) A.play('error404');
      FX.flash('rgba(255,40,70,0.35)');
      FX.shake(big ? 'big' : 'small');
      const c = this.itemCenter();
      FX.burst(c.x, c.y, { n: 14, colors: ['#ff3b5c', '#1d1433', '#ff9f1c'], min: 80, max: 260 });
      FX.float(U.fmtSigned(aura) + ' AURA' + (big ? ' 💀' : ''), c.x, c.y - 20, 'neg');
      if (kind !== 'overcheck') FX.float('−1 ❤️', c.x - 50, c.y + 20, 'neg');
      const chip = kind === 'checkwrong' || kind === 'checktimeout' ? CHOICE_LABEL[cur.variant.verdict] : CHOICE_LABEL[cur.ans];
      this.memeText(line, sub, 'err', chip);
      if (big) FX.showBanner('-900 AURA 💀', '3× HINTEREINANDER FALSCH', 'bad', 1100);
      else if (broke) FX.showBanner('COMBO BROKEN 💀', '', 'bad small', 800);
      if (cur.el) cur.el.classList.add('exit-bad');
      if (run.boss) { run.boss.hp = Math.min(run.boss.max, run.boss.hp + 5); this.bossLaugh(); }
      this.hud(true);
      if (run.lives <= 0) { this.after(0.9, () => this.gameOver()); return; }
      this.after(this.fbDelay(false), () => this.next());
    },

    guessed(choice, rt) {
      const cur = this.cur;
      if (choice === cur.variant.verdict) {
        // Glück gehabt: kein Leben weg, aber Combo & Aura
        const run = this.run;
        this.state = 'feedback';
        run.total++; run.itemsInLevel++;
        run.lvlErr = (run.lvlErr || 0) + 1;
        const broke = this.breakCombo();
        this.addAura(-300);
        this.det('GERATEN ERKANNT', 'TRUST LEVEL: 12%', 'warn');
        A.play('overcheck');
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
      run.total++; run.itemsInLevel++;
      run.lvlErr = (run.lvlErr || 0) + 1;
      const broke = this.breakCombo();
      this.addAura(-100);
      this.det('OVERTHINKING', 'DETECTED', 'warn');
      A.play('overcheck');
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
      const s = v.verdict === 'haram' ? 'Drin war: ' + this.flagText(cur) + ' → HARAM.' : 'Zutaten waren okay → HALAL.';
      return s;
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
      if (!fromBoss && run.lives < run.maxLives) { run.lives++; life = true; A.play('lifeUp'); }
      if (perfect) { this.addAura(500); A.play('crowd', 'cheer'); FX.toast('✨ PERFEKTES LEVEL: +500 AURA' + (life ? ' · ❤️ +1' : ''), 2000); }
      else if (life) FX.toast('❤️ +1 LEBEN – LEVEL GESCHAFFT', 1800);
      run.levelIdx++;
      run.level = D.LEVELS[run.levelIdx];
      run.itemsInLevel = 0;
      run.queue = [];
      this.clearItem();
      this.el.queue.innerHTML = '';
      this.el.presenter.className = 'presenter';
      this.el.meme.className = 'meme';
      this.state = 'cinematic';
      W.setArea(run.level.area);
      W.setIntensity(run.level.n);
      A.music.set({ level: run.level.n });
      A.ambience.set(run.level.area, true);
      this.levelBanner();
      FX.confettiRain(50);
      this.hud();
      this.after(1.5, () => this.next());
    },

    /* ================= BOSS: DER SUPERMARKT ================= */
    startBoss() {
      const run = this.run;
      this.clearItem();
      this.el.queue.innerHTML = '';
      this.el.presenter.className = 'presenter';
      this.el.meme.className = 'meme';
      this.state = 'cinematic';
      run.boss = { hp: 100, max: 100, side: 'right', n: run.bosses + 1 };
      run.queue = [];
      this.el['scr-game'].classList.add('boss-mode');
      this.el.boss.className = 'boss show';
      this.el['boss-hud'].hidden = false;
      this.updateBossHud();
      A.music.set({ boss: true });
      A.play('boom');
      A.play('bossLaugh');
      FX.shake('big');
      const title = run.boss.n > 1 ? 'DER SUPERMARKT 2: NACHTSCHICHT' : 'DER SUPERMARKT';
      FX.showBanner('BOSS: ' + title, 'Produkte fliegen von links und rechts!', 'boss', 1900);
      this.det('WARNUNG', 'BOSS ERKANNT', 'err');
      this.bossSay('ZUTATEN? HAHA!');
      this.after(2.1, () => this.next());
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
    bossTaunt() { if (U.chance(0.45)) this.bossSay(U.pick(D.LINES.bossTaunt)); },
    bossHit() {
      this.updateBossHud();
      U.restartAnim(this.el.boss, 'hit');
      A.play('bossHit');
      if (U.chance(0.5)) this.bossSay(U.pick(D.LINES.bossHurt));
    },
    bossLaugh() {
      this.updateBossHud();
      U.restartAnim(this.el.boss, 'laugh');
      A.play('bossLaugh');
      this.bossSay('HAHAHA! +5 HP');
    },
    bossDefeated() {
      const run = this.run;
      const lvl = run.level.n;
      run.bossesDone[lvl] = true;
      run.bosses++;
      run.boss = null;
      this.clearItem();
      this.state = 'cinematic';
      this.el.boss.className = 'boss show dead';
      A.music.set({ boss: false });
      A.play('boom');
      A.play('crowd', 'cheer');
      const bonus = 2500 * run.bosses;
      run.score += bonus;
      this.addAura(500);
      if (run.lives < run.maxLives) run.lives++;
      FX.confettiRain(120);
      FX.showBanner('SUPERMARKET CLEARED', '+' + U.fmt(bonus) + ' · +500 AURA · ❤️ +1', 'boss win', 1500);
      this.det('SUPERMARKET', 'CLEARED', 'ok');
      this.hud(true);
      this.after(1.6, () => {
        FX.showBanner('HALAL DETECTOR LEVEL UP', 'Weiter geht’s. Schneller.', 'level', 1200);
        A.play('levelUp');
        this.det('LEVEL UP', 'DETECTOR v' + (run.bosses + 1) + '.0', 'ok');
      });
      this.after(2.9, () => {
        this.el['scr-game'].classList.remove('boss-mode');
        this.el.boss.className = 'boss';
        this.el['boss-hud'].hidden = true;
        this.levelUp(true);
      });
    },

    /* ================= ZUTATEN-MINISPIEL ================= */
    openCheck(rt) {
      const run = this.run, cur = this.cur, L = run.level, e = this.el;
      cur.decided = true; // Hauptentscheidung getroffen
      this.state = 'check';
      run.checks++;
      const v = cur.variant;
      let total = this.tutorial ? Infinity : L.checkTime + Math.max(0, v.list.length - 6) * 0.22;
      if (cur.event === 'doener17') total = Math.max(total, 9);
      if (cur.event === 'arabic') total += 1.2;
      this.chk = { left: total, total, list: v.list, opened: this.gameTime, user: false, translated: !cur.tpl.arabic, auto: 0 };
      e['ing-pack'].innerHTML = Art.itemArt(cur);
      e['ing-title'].textContent = cur.name;
      e['ing-tag'].textContent = cur.event === 'doener17' ? 'SYSTEM OVERLOAD' : cur.event === 'grandma' ? 'OMAS HANDSCHRIFT' : cur.event === 'arabic' ? 'INGREDIENTS IN ARABIC' : cur.event === 'mystery' ? 'INHALT DER BOX' : 'ZUTATEN';
      e['ing-sub'].textContent = cur.event === 'mystery' ? 'Was ist drin? Tippe auf das Problem – oder entscheide.' : 'Tippe auf das Problem – oder entscheide unten.';
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
          this.after(0.5, () => { if (this.chk && this.cur === cur) { this.chk.translated = true; this.renderIngredients(); this.det('ÜBERSETZT', 'JETZT LESEN', 'ok'); } });
        });
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
      const cur = this.cur;
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
      if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },

    closeCheck() {
      const e = this.el;
      e.ing.classList.remove('open');
      e.ing.hidden = true;
      e.ing.className = 'ing';
      this.setControlsMode('decide');
    },

    setControlsMode(mode) {
      const c = this.el.controls;
      c.classList.toggle('mode-check', mode === 'check');
      const chkBtn = this.el.btns.check;
      if (chkBtn) {
        chkBtn.querySelector('.lb').textContent = mode === 'check' ? 'LESEN…' : 'INGREDIENTS';
        chkBtn.setAttribute('aria-disabled', mode === 'check' ? 'true' : 'false');
      }
    },

    /* ================= GAME OVER ================= */
    gameOver() {
      const run = this.run;
      this.state = 'over';
      this.clearTimers();
      A.music.stop();
      A.ambience.set('menu', false);
      A.play('gameOver');
      A.play('boom');
      this.det('SYSTEM FAILURE.', 'GAME OVER', 'err');
      this.el['scr-game'].classList.add('frozen');
      FX.showBanner('SYSTEM FAILURE.', '', 'bad over', 1400);
      const acc = run.total ? Math.round((run.correct / run.total) * 100) : 0;
      const rank = D.RANKS.filter((r) => run.score >= r[0]).pop();
      const xp = Math.round(run.score / 20 + run.correct * 5 + run.bosses * 200);
      const coins = Math.round(run.score / 25 + run.correct * 2);
      const area = D.AREAS.find((a) => a.id === run.level.area);
      const summary = {
        score: run.score, maxCombo: run.maxCombo, fastest: run.fastest, correct: run.correct, wrong: run.wrong,
        aura: run.aura, fastestCheck: run.fastestCheck, checks: run.checks, bosses: run.bosses, legendary: run.legendary,
        accuracy: acc, xp, coins, areaName: area ? area.name : '', level: run.level.n, rank, total: run.total,
        avg: run.reactN ? run.reactSum / run.reactN : 0,
        comment: U.pick(D.LINES.gameover),
      };
      const S = HHD.Store;
      const prevXp = S.data.xp;
      summary.news = S.recordRun(summary);
      summary.unlockedAreas = D.AREAS.filter((a) => a.xp > prevXp && a.xp <= S.data.xp).map((a) => a.name);
      if (run.maxCombo >= 75 && !S.data.owned.includes('forbidden')) {
        S.data.owned.push('forbidden');
        S.save();
        summary.forbidden = true;
      }
      setTimeout(() => HHD.UI.showGameOver(summary), 1500);
    },

    quit() {
      this.clearTimers();
      this.state = 'idle';
      this.paused = false;
      this.tutorial = null;
      A.music.stop();
      A.ambience.set('menu', false);
      this.el.pause.hidden = true;
      this.resetStage();
    },

    /* ================= PAUSE ================= */
    pause() {
      if (this.paused || !['decide', 'check', 'feedback', 'cinematic'].includes(this.state)) return;
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
      let hearts = '';
      for (let i = 0; i < run.maxLives; i++) hearts += '<i class="' + (i < run.lives ? 'on' : 'off') + '">' + (i < run.lives ? '❤️' : '🖤') + '</i>';
      e['hud-lives'].innerHTML = hearts;
      const area = D.AREAS.find((a) => a.id === run.level.area);
      e['hud-level'].textContent = 'LVL ' + run.level.n + ' · ' + (area ? area.name : '');
      const tier = run.combo >= 50 ? 4 : run.combo >= 20 ? 3 : run.combo >= 10 ? 2 : run.combo >= 5 ? 1 : 0;
      e['scr-game'].dataset.combo = tier;
      if (bump) {
        U.restartAnim(e['hud-score'], 'bump');
        U.restartAnim(e['hud-combo'], 'bump');
      }
    },

    updateTimerUI(left, total) {
      const e = this.el;
      const l = Math.max(0, left);
      e['hud-time'].textContent = U.fmtSec(l);
      const frac = total === Infinity ? 1 : U.clamp(l / total, 0, 1);
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
      if (this.state === 'decide' && this.cur && !this.cur.decided) {
        const cur = this.cur;
        cur.left -= dt;
        this.updateTimerUI(cur.left, cur.time);
        const panic = cur.left < 0.35;
        if (panic !== this._panic) { this._panic = panic; A.music.set({ panic }); }
        const tk = Math.ceil(cur.left * 4);
        if (cur.left < 0.8 && tk !== this._tick) { this._tick = tk; A.play('tick', cur.left < 0.3); }
        if (cur.left <= 0) this.timeout();
      } else if (this.state === 'check' && this.chk) {
        const chk = this.chk;
        chk.left -= dt;
        this.updateTimerUI(chk.left, chk.total);
        this.el['ing-bar'].style.transform = 'scaleX(' + U.clamp(chk.left / chk.total, 0, 1).toFixed(3) + ')';
        // Auto-Scroll (bis ~65 % der Zeit ist alles einmal sichtbar gewesen)
        if (!chk.user && chk.translated) {
          const win = this.el['ing-window'];
          const max = win.scrollHeight - win.clientHeight;
          if (max > 2) {
            const speed = max / Math.max(0.8, chk.total * 0.62 * (1.4 - this.run.level.scroll * 0.4));
            chk.auto = Math.min(max, chk.auto + speed * dt);
            win.scrollTop = chk.auto;
          }
        }
        const panic = chk.left < 0.8;
        if (panic !== this._panic) { this._panic = panic; A.music.set({ panic }); }
        if (chk.left <= 0) this.checkTimeout();
      } else if (this._panic) {
        this._panic = false;
        A.music.set({ panic: false });
      }
    },

    /* ================= TUTORIAL ================= */
    startTutorial(onDone) {
      this.clearTimers();
      this.gameTime = 0;
      this.run = {
        areaId: 'street', levelIdx: 0, level: D.LEVELS[0], lives: 3, maxLives: 3, score: 0, combo: 0, maxCombo: 0, aura: 0,
        correct: 0, wrong: 0, total: 0, checks: 0, fastest: 0, fastestCheck: 0, reactSum: 0, reactN: 0, itemsInLevel: 0,
        wrongStreak: 0, overchecks: [], boss: null, bossesDone: {}, bosses: 0, legendary: 0, queue: [], recent: [], lastTpl: null, heat: 0,
      };
      this.tutorial = { step: 0, onDone };
      this.renderDetector();
      this.resetStage();
      W.setArea('street');
      W.setIntensity(1);
      A.music.set({ mode: 'game', level: 1, combo: 0, boss: false, panic: false });
      A.music.start('game');
      this.hud();
      this.updateTimerUI(0, Infinity);
      this.el['hud-time'].textContent = '∞';
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
        this.updateTimerUI(0, Infinity);
        this.el['hud-time'].textContent = '∞';
        return;
      }
      this.state = 'feedback';
      this.cur.decided = true;
      A.play('correct', 1); A.play('accept');
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
      A.play('correct', 3); A.play('accept'); A.play('crowd', 'cheer');
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
