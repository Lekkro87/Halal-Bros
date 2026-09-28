/* Halal Haram Detector – Menüs, Screens & Eingabe */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;
  const D = HHD.DATA;
  const A = HHD.Audio;
  const FX = HHD.FX;
  const Art = HHD.Art;
  const S = HHD.Store;
  const G = HHD.Game;

  const SHOWCASE = ['apfel', 'bier', 'gummibaerchen', 'halalchips', 'speck', 'baconchips', 'falafel', 'wein', 'doener', 'schweineohr'];
  const VERDICT = { halal: ['✅', 'HALAL'], haram: ['❌', 'HARAM'], check: ['🔎', 'CHECK!'] };

  const UI = {
    screen: 'start',
    boardTab: 'score',
    showT: 0, showIdx: 0,
    eggTaps: 0,
    lastResult: null,

    init() {
      document.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-action]');
        if (!b) return;
        A.unlock();
        A.play('click');
        this.action(b.dataset.action, b);
      });
      this.bindDecisionButtons();
      this.bindKeys();
      this.bindSwipe();
      document.getElementById('start-det').addEventListener('click', () => this.easterEgg());
      HHD.Meta.init();
      const lexModal = document.getElementById('lex-modal');
      lexModal.addEventListener('click', (ev) => { if (ev.target === lexModal) lexModal.hidden = true; });
      this.applySettings();
      this.refreshStart();
      this.show('start');
      // Tagesbonus: Harçlık vom Onkel
      const bonus = HHD.Meta.dailyBonus();
      if (bonus) setTimeout(() => { FX.toast('🎁 HARÇLIK VOM ONKEL: +' + bonus + ' 🪙 (Tagesbonus)', 2600); this.refreshStart(); }, 900);
    },

    menuStyle() { return (S.settings.musicStyle || 'auto') === 'arcade' ? 'arcade' : 'orient'; },

    /* ---------- Screens ---------- */
    show(name) {
      this.screen = name;
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + name));
      document.body.dataset.screen = name;
      const menu = ['start', 'modes', 'map', 'shop', 'board', 'settings', 'help', 'over', 'lexikon', 'missions'].includes(name);
      if (menu) {
        HHD.World.setTheme(S.data.mode === 'ramadan' ? 'ramadan' : null);
        HHD.World.setArea(name === 'over' && G.run ? G.areaId() : S.data.area || 'street');
        HHD.World.setIntensity(1);
        HHD.World.setScan(false);
        HHD.World.setOverview(false);
        HHD.World.overheat = 0;
        if (name !== 'over') { A.music.set({ mode: 'menu', boss: false, panic: false, combo: 0, rush: false, slow: false, style: this.menuStyle() }); A.music.start('menu'); }
      }
      if (name === 'start') this.refreshStart();
      if (name === 'map') this.renderMap();
      if (name === 'modes') this.renderModes();
      if (name === 'shop') this.renderShop();
      if (name === 'board') this.renderBoard();
      if (name === 'settings') this.renderSettings();
      if (name === 'lexikon') this.renderLexikon();
      if (name === 'missions') this.renderMissions();
      const scr = document.getElementById('scr-' + name);
      if (scr) scr.scrollTop = 0;
    },

    action(act, el) {
      switch (act) {
        case 'play': return this.play();
        case 'map': return this.show('map');
        case 'modes': return this.show('modes');
        case 'pick-mode': return this.pickMode(el.dataset.mode);
        case 'daily': return this.pickMode('daily');
        case 'shop': return this.show('shop');
        case 'leaderboard': return this.show('board');
        case 'settings': return this.show('settings');
        case 'help': return this.show('help');
        case 'duel': A.music.stop(); this.show('duel'); return HHD.Duel.start();
        case 'duel-again': return HHD.Duel.start();
        case 'duel-quit': HHD.Duel.stop(); return this.show('start');
        case 'back': return this.show(this.screen === 'map' ? 'modes' : 'start');
        case 'start-area': return this.startArea(el.dataset.area);
        case 'again': return this.replay();
        case 'pause': return G.pause();
        case 'resume': return G.resume();
        case 'restart': G.quit(); return this.replay();
        case 'quit': G.quit(); return this.show('start');
        case 'buy': return this.buy(el.dataset.skin);
        case 'equip': return this.equip(el.dataset.skin);
        case 'tab': this.boardTab = el.dataset.tab; return this.renderBoard();
        case 'toggle': return this.toggle(el.dataset.key);
        case 'tutorial': S.data.tutorialDone = false; S.save(); return this.play();
        case 'reset': return this.resetProgress(el);
        case 'share': return this.share();
        case 'pause-toggle': return this.toggle(el.dataset.key, true);
        case 'lexikon': return this.show('lexikon');
        case 'missions': return this.show('missions');
        case 'mode': return this.setMode(el.dataset.mode);
        case 'lex-filter': this.lexFilter = el.dataset.f; return this.renderLexikon();
        case 'lex-item': return this.showLexDetail(el.dataset.id);
        case 'lex-close': document.getElementById('lex-modal').hidden = true; return;
        case 'buy-pu': return this.buyPowerup(el.dataset.pu);
        case 'music-style': return this.setMusicStyle(el.dataset.style);
      }
    },

    play() {
      A.unlock();
      if (!S.data.tutorialDone) {
        A.music.stop();
        this.show('game');
        G.startTutorial(() => {
          S.data.tutorialDone = true;
          S.save();
          G.start('street', 'normal');
        });
        return;
      }
      this.show('modes');
    },

    startArea(id) {
      const area = D.AREAS.find((a) => a.id === id);
      if (!area || !S.areaUnlocked(area)) id = 'street';
      S.data.area = id;
      S.save();
      A.music.stop();
      this.show('game');
      const M = D.MODES[S.data.mode];
      G.start(id, M && M.map ? S.data.mode : 'normal');
    },

    /** Modus gewählt: mit Stadtkarte (Normal, Ramadan, Hardcore, Üben, Chaos) oder direkt los */
    pickMode(mode) {
      const M = D.MODES[mode];
      if (!M) return;
      A.unlock();
      S.data.mode = mode;
      S.save();
      if (M.map) { HHD.World.setTheme(mode === 'ramadan' ? 'ramadan' : null); return this.show('map'); }
      this.startMode(mode);
    },
    startMode(mode) {
      A.music.stop();
      this.show('game');
      G.start(D.MODES[mode].area || 'street', mode);
    },
    /** „Nochmal“: gleicher Modus, gleicher Bereich */
    replay() {
      const M = D.MODES[S.data.mode];
      if (M && !M.map) return this.startMode(S.data.mode);
      this.startArea(S.data.area);
    },

    setMode(mode) {
      if (!D.MODES[mode]) return;
      S.data.mode = mode;
      S.save();
      HHD.World.setTheme(mode === 'ramadan' ? 'ramadan' : null);
      A.play('beep');
      this.renderMap();
    },
    setMusicStyle(style) {
      S.settings.musicStyle = style;
      S.save();
      A.music.set({ style: this.menuStyle() });
      this.renderSettings();
    },

    /* ---------- Startbildschirm ---------- */
    refreshStart() {
      const d = S.data;
      const pl = S.playerLevel();
      document.getElementById('st-coins').textContent = U.fmt(d.coins);
      document.getElementById('st-plevel').textContent = pl.lvl;
      document.getElementById('st-title').textContent = HHD.Meta.title(pl.lvl);
      const done = HHD.Meta.missionsDone();
      const mEl = document.getElementById('st-missions');
      mEl.textContent = done + '/3';
      mEl.classList.toggle('all', done === 3);
      document.getElementById('st-lex').textContent = HHD.Meta.lexPct() + '%';
      document.getElementById('st-xpbar').style.transform = 'scaleX(' + (pl.into / pl.need).toFixed(3) + ')';
      document.getElementById('st-best').textContent = U.fmt(d.bests.score);
      const dc = S.dailyToday();
      const dh = document.getElementById('st-daily-ch');
      dh.hidden = !d.tutorialDone;
      dh.innerHTML = dc.tries ? '📅 TAGES-CHALLENGE: <b>' + U.fmt(dc.best) + '</b> · nochmal?' : '📅 TAGES-CHALLENGE: <b>heute noch offen!</b>';
      dh.classList.toggle('done', !!dc.tries);
      document.getElementById('st-daily').textContent = U.fmt(d.daily.date === U.today() ? d.daily.score : 0);
      document.getElementById('start-det').innerHTML = Art.detectorHTML(d.skin, true);
      this.showIdx = 0; this.showT = 0;
      this.renderShowcase();
    },

    renderShowcase() {
      const id = SHOWCASE[this.showIdx % SHOWCASE.length];
      const tpl = D.ITEMS.find((i) => i.id === id);
      const box = document.getElementById('showcase-item');
      if (!tpl || !box) return;
      const v = VERDICT[tpl.ans];
      box.innerHTML = '<div class="sc-art">' + Art.itemArt(tpl) + '</div><div class="sc-name">' + U.esc(tpl.name) + '</div><div class="stamp st-' + tpl.ans + '">' + v[0] + ' ' + v[1] + '</div>';
      U.restartAnim(box, 'in');
      const det = document.querySelector('#start-det .det');
      if (det) {
        det.querySelector('.det-text').textContent = 'SCANNING...';
        det.classList.add('scan');
        clearTimeout(this._sc);
        this._sc = setTimeout(() => {
          det.classList.remove('scan');
          det.querySelector('.det-text').textContent = tpl.ans === 'check' ? '???' : v[1] + ' DETECTED';
          det.querySelector('.det-sub').textContent = tpl.ans === 'check' ? 'CHECK THE INGREDIENTS' : '';
          box.classList.add('stamped');
        }, 700);
      }
    },

    easterEgg() {
      A.unlock();
      this.eggTaps++;
      A.play('beep', 1 + this.eggTaps * 0.05);
      const det = document.querySelector('#start-det .det');
      if (this.eggTaps === 5 && det) { det.querySelector('.det-text').textContent = 'HÖR AUF.'; det.querySelector('.det-sub').textContent = 'ICH BIN EIN DETECTOR.'; }
      if (this.eggTaps >= 10) {
        this.eggTaps = 0;
        if (!S.data.eggFound) {
          S.data.eggFound = true;
          S.data.coins += 150;
          S.save();
          A.play('coin');
          FX.toast('🥚 EASTER EGG: DER DETECTOR MAG DICH. +150 🪙', 2600);
          FX.confettiRain(60);
          this.refreshStart();
        } else {
          FX.toast('DER DETECTOR HAT DICH SCHON ERKANNT. 👀');
        }
      }
    },

    /* ---------- Spielmodi ---------- */
    renderModes() {
      const d = S.data;
      const dc = S.dailyToday();
      document.getElementById('modes-count').textContent = D.MODE_ORDER.length + ' MODI';
      document.getElementById('mode-grid').innerHTML = D.MODE_ORDER.map((id) => {
        const m = D.MODES[id];
        const best = d.modeBests[id] || 0;
        let foot = best ? '🏆 ' + U.fmt(best) : 'Noch nicht gespielt';
        if (id === 'daily') foot = dc.tries ? '📅 Heute: ' + U.fmt(dc.best) + ' · ' + dc.tries + '×' : '📅 Heute noch offen!';
        if (id === 'zen') foot = 'Ohne Rangliste';
        const played = !!d.modesPlayed[id];
        return '<button type="button" class="mode-card m-' + id + (d.mode === id ? ' sel' : '') + '" data-action="pick-mode" data-mode="' + id + '">' +
          (m.isNew && !played ? '<i class="mc-new">NEU</i>' : '') +
          '<span class="mc-icon">' + m.icon + '</span><b>' + U.esc(m.name) + '</b><small>' + U.esc(m.desc) + '</small><em>' + foot + (m.map ? ' · 🗺️' : '') + '</em></button>';
      }).join('');
    },

    /* ---------- Stadtkarte ---------- */
    renderMap() {
      const xp = S.data.xp;
      const mode = D.MODES[S.data.mode] && D.MODES[S.data.mode].map ? S.data.mode : 'normal';
      const M = D.MODES[mode];
      document.getElementById('map-xp').textContent = U.fmt(xp) + ' XP';
      document.getElementById('map-mode-pill').textContent = M.icon + ' ' + M.name;
      document.getElementById('map-mode-desc').textContent = M.desc;
      document.getElementById('scr-map').dataset.mode = mode;
      document.getElementById('map-list').innerHTML = D.AREAS.filter((a) => !a.hidden).map((a) => {
        const un = S.areaUnlocked(a);
        const L = D.LEVELS[a.level - 1];
        const pct = un ? 100 : Math.round((xp / a.xp) * 100);
        return '<button class="area-card ' + (un ? '' : 'locked') + (S.data.area === a.id ? ' sel' : '') + '" ' + (un ? 'data-action="start-area" data-area="' + a.id + '"' : 'disabled') + '>' +
          '<span class="ac-emo">' + (un ? a.emoji : '🔒') + '</span>' +
          '<span class="ac-txt"><b>LEVEL ' + a.level + ' – ' + U.esc(a.name) + '</b><small>' + U.esc(L.name) + ' · ' + U.esc(a.desc) + '</small>' +
          (un ? '' : '<span class="ac-bar"><i style="width:' + pct + '%"></i></span><small>' + U.fmt(a.xp) + ' XP benötigt</small>') + '</span>' +
          (un ? '<span class="ac-go">▶</span>' : '') + '</button>';
      }).join('');
    },

    /* ---------- Shop ---------- */
    renderShop() {
      const d = S.data;
      document.getElementById('shop-coins').textContent = U.fmt(d.coins);
      document.getElementById('shop-pu').innerHTML = Object.keys(D.POWERUPS).map((k) => {
        const p = D.POWERUPS[k];
        return '<div class="pu-card"><span class="pu-ic">' + p.icon + '</span><span class="pu-txt"><b>' + U.esc(p.name) + '</b><small>' + U.esc(p.desc) + '</small><em>Im Besitz: ' + (d.pu[k] || 0) + ' · Taste ' + p.key + '</em></span>' +
          '<button class="btn small buy' + (d.coins >= p.price ? '' : ' poor') + '" data-action="buy-pu" data-pu="' + k + '">🪙 ' + U.fmt(p.price) + '</button></div>';
      }).join('');
      document.getElementById('shop-list').innerHTML = D.SKINS.map((s) => {
        const owned = d.owned.includes(s.id);
        const eq = d.skin === s.id;
        let btn;
        if (eq) btn = '<button class="btn small eq" disabled>✓ AUSGERÜSTET</button>';
        else if (owned) btn = '<button class="btn small" data-action="equip" data-skin="' + s.id + '">AUSRÜSTEN</button>';
        else if (s.price == null) btn = '<button class="btn small locked" disabled>🔒 ' + (s.unlockText || (s.unlockEid ? 'EID (RAMADAN)' : 'COMBO ' + s.unlockCombo)) + '</button>';
        else btn = '<button class="btn small buy' + (d.coins >= s.price ? '' : ' poor') + '" data-action="buy" data-skin="' + s.id + '">🪙 ' + U.fmt(s.price) + '</button>';
        return '<div class="skin-card' + (eq ? ' eq' : '') + (s.id === 'forbidden' ? ' rare' : '') + '">' +
          '<div class="skin-prev">' + Art.detectorHTML(s.id, true) + '</div>' +
          '<div class="skin-info"><b>' + U.esc(s.name) + '</b><small>' + U.esc(s.device) + '</small><p>' + U.esc(s.desc) + '</p>' + btn + '</div></div>';
      }).join('');
    },
    buy(id) {
      const s = D.SKINS.find((k) => k.id === id);
      const d = S.data;
      if (!s || s.price == null || d.owned.includes(id)) return;
      if (d.coins < s.price) { A.play('wrong'); FX.toast('ZU WENIG COINS, BRUDER. 🪙 ' + U.fmt(s.price - d.coins) + ' FEHLEN.'); return; }
      d.coins -= s.price;
      d.owned.push(id);
      d.skin = id;
      S.save();
      HHD.Meta.max('skins', d.owned.length);
      A.setSkinPitch(s.pitch);
      A.play('coin');
      A.play('crowd', 'cheer');
      FX.toast('GEKAUFT: ' + s.device + ' 🎉', 2200);
      FX.confettiRain(50);
      this.renderShop();
    },
    equip(id) {
      const s = D.SKINS.find((k) => k.id === id);
      if (!s || !S.data.owned.includes(id)) return;
      S.data.skin = id;
      S.save();
      A.setSkinPitch(s.pitch);
      A.play('beep');
      this.renderShop();
    },

    buyPowerup(k) {
      const p = D.POWERUPS[k];
      const d = S.data;
      if (!p) return;
      if (d.coins < p.price) { A.play('wrong'); FX.toast('ZU WENIG COINS, BRUDER. 🪙 ' + U.fmt(p.price - d.coins) + ' FEHLEN.'); return; }
      d.coins -= p.price;
      d.pu[k] = (d.pu[k] || 0) + 1;
      S.save();
      A.play('coin');
      FX.toast('GEKAUFT: ' + p.icon + ' ' + p.name, 1600);
      this.renderShop();
    },

    /* ---------- Lexikon ---------- */
    renderLexikon() {
      const all = HHD.Meta.lexEntries();
      const seen = S.data.seen;
      const f = this.lexFilter || 'all';
      const found = all.filter((i) => seen[i.id]).length;
      document.getElementById('lex-count').textContent = found + ' / ' + all.length;
      document.getElementById('lex-bar').style.width = Math.round((found / all.length) * 100) + '%';
      document.getElementById('lex-filters').innerHTML = [['all', 'ALLE'], ['halal', '✅ HALAL'], ['check', '🔎 CHECKEN'], ['haram', '❌ HARAM']].map(([k, l]) =>
        '<button type="button" class="tab' + (f === k ? ' on' : '') + '" data-action="lex-filter" data-f="' + k + '">' + l + '</button>').join('');
      const list = all.filter((i) => f === 'all' || i.ans === f);
      document.getElementById('lex-grid').innerHTML = list.map((i) => {
        const known = !!seen[i.id];
        return '<button type="button" class="lex-tile' + (known ? ' v-' + i.ans : ' unknown') + '" data-action="lex-item" data-id="' + i.id + '">' +
          '<span class="lx-art">' + (known ? Art.itemArt(i) : '<span class="lx-q">?</span>') + '</span>' +
          '<span class="lx-name">' + (known ? U.esc(i.name) : '???') + '</span></button>';
      }).join('');
    },
    showLexDetail(id) {
      const i = HHD.Meta.lexEntries().find((x) => x.id === id);
      if (!i) return;
      if (!S.data.seen[id]) { FX.toast('Noch nicht entdeckt – spiel weiter, Akhi! 🔎'); return; }
      const V = { halal: '✅ HALAL', haram: '❌ HARAM', check: '🔎 ZUTATEN CHECKEN' };
      let why = i.why || (i.ans !== 'check' ? D.WHY[i.cat] : '') || '';
      if (i.ans === 'check') {
        const flags = new Set();
        (i.v || []).forEach((v) => v[1].forEach((x) => { const t = Array.isArray(x) ? x[0] + ' (' + x[1] + ')' : x; if (t[0] === '!') flags.add(t.slice(1)); }));
        if (i.id === 'doener17') flags.add('Whiskey-BBQ-Soße (mit Whiskey)');
        why = (why ? why + ' ' : 'Unklar am Bild → Zutaten checken. ') + (flags.size ? 'Mögliche Probleme: ' + Array.from(flags).join(', ') + '. Ohne diese Zutaten: HALAL.' : '');
      }
      const where = (i.places || []).map((p) => D.PLACES[p]).filter(Boolean).join(', ');
      document.getElementById('lex-detail').innerHTML =
        '<div class="ld-art">' + Art.itemArt(i) + '</div>' +
        '<h3>' + U.esc(i.name) + '</h3>' +
        '<div class="ld-verdict v-' + i.ans + '">' + V[i.ans] + '</div>' +
        '<p>' + U.esc(why) + '</p>' +
        (where ? '<small>📍 ' + U.esc(where) + '</small>' : '') +
        '<small>Gescannt: ' + S.data.seen[id] + '×</small>';
      document.getElementById('lex-modal').hidden = false;
    },

    /* ---------- Aufgaben & Erfolge ---------- */
    renderMissions() {
      const ms = HHD.Meta.missions();
      document.getElementById('mis-list').innerHTML = ms.map((m) => {
        const pct = Math.round((Math.min(m.prog, m.goal) / m.goal) * 100);
        return '<li class="mis' + (m.done ? ' done' : '') + '"><span class="mis-ic">' + (m.done ? '✅' : '📅') + '</span><span class="mis-txt"><b>' + U.esc(m.text) + '</b>' +
          '<span class="mis-bar"><i style="width:' + pct + '%"></i></span><small>' + U.fmt(Math.min(m.prog, m.goal)) + ' / ' + U.fmt(m.goal) + '</small></span><em>+' + m.reward + ' 🪙</em></li>';
      }).join('');
      const st = S.data.st2, ach = S.data.ach;
      document.getElementById('ach-count').textContent = HHD.Meta.achCount() + ' / ' + D.ACHIEVEMENTS.length;
      document.getElementById('ach-grid').innerHTML = D.ACHIEVEMENTS.map((a) => {
        const got = !!ach[a.id];
        const prog = Math.min(st[a.stat] || 0, a.goal);
        return '<div class="ach' + (got ? ' got' : '') + '"><span class="ach-ic">' + (got ? a.icon : '🔒') + '</span><b>' + U.esc(a.name) + '</b><small>' + U.esc(a.desc) + '</small>' +
          (got ? '<em>✓ ' + U.esc(ach[a.id]) + '</em>' : '<span class="mis-bar"><i style="width:' + Math.round((prog / a.goal) * 100) + '%"></i></span><em>' + U.fmt(prog) + ' / ' + U.fmt(a.goal) + ' · +' + a.reward + ' 🪙</em>') + '</div>';
      }).join('');
    },

    /* ---------- Rangliste ---------- */
    renderBoard() {
      const d = S.data;
      const B = d.bests;
      document.getElementById('board-bests').innerHTML = D.BOARDS.map((b) => {
        const v = B[b.id];
        return '<div class="pb"><span>' + b.icon + '</span><b>' + (v ? (b.sec ? U.fmtSec(v) : U.fmt(v)) : '–') + '</b><small>' + b.name + '</small></div>';
      }).join('');
      document.getElementById('board-modes').innerHTML = D.MODE_ORDER.filter((id) => id !== 'zen').map((id) => {
        const m = D.MODES[id], v = d.modeBests[id] || 0;
        return '<div class="bm' + (v ? '' : ' empty') + '"><span>' + m.icon + '</span><small>' + U.esc(m.name) + '</small><b>' + (v ? U.fmt(v) : '–') + '</b></div>';
      }).join('');
      document.getElementById('board-tabs').innerHTML = D.BOARDS.map((b) =>
        '<button class="tab' + (b.id === this.boardTab ? ' on' : '') + '" data-action="tab" data-tab="' + b.id + '">' + b.icon + ' ' + b.name + '</button>').join('');
      const def = D.BOARDS.find((b) => b.id === this.boardTab);
      const list = d.boards[this.boardTab] || [];
      document.getElementById('board-list').innerHTML = list.length
        ? list.map((r, i) => '<li class="' + (i < 3 ? 'top' + (i + 1) : '') + '"><span class="rk">' + (['🥇', '🥈', '🥉'][i] || (i + 1) + '.') + '</span><span class="nm">' + U.esc(r.name) + '<small>' + U.esc(r.date) + (r.area ? ' · ' + U.esc(r.area) : '') + '</small></span><b>' + (def.sec ? U.fmtSec(r.value) : U.fmt(r.value)) + '</b></li>').join('')
        : '<li class="empty">Noch keine Einträge. Spiel eine Runde! 🔎</li>';
      const st = d.stats;
      document.getElementById('board-stats').textContent = 'Runden: ' + U.fmt(st.games) + ' · Richtige Entscheidungen: ' + U.fmt(st.correct) + ' · Ingredients-Checks: ' + U.fmt(st.checks) + ' · Bosse besiegt: ' + U.fmt(st.bosses) + ' · Legendary: ' + U.fmt(st.legendary);
    },

    /* ---------- Einstellungen ---------- */
    renderSettings() {
      const s = S.settings;
      document.getElementById('set-name').value = S.data.name;
      document.getElementById('set-volume').value = Math.round(s.volume * 100);
      document.querySelectorAll('#scr-settings [data-key], #pause [data-key]').forEach((b) => {
        const on = !!s[b.dataset.key];
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const style = s.musicStyle || 'auto';
      document.querySelectorAll('[data-action="music-style"]').forEach((b) => { b.classList.toggle('on', b.dataset.style === style); b.setAttribute('aria-pressed', b.dataset.style === style ? 'true' : 'false'); });
      document.getElementById('storage-note').textContent = S.available ? 'Fortschritt wird lokal auf diesem Gerät gespeichert.' : '⚠️ Lokaler Speicher ist nicht verfügbar – Fortschritt geht beim Schließen verloren.';
    },
    toggle(key) {
      const s = S.settings;
      s[key] = !s[key];
      S.save();
      this.applySettings();
      this.renderSettings();
      // Stimme gleich zum Anhören
      if (key === 'voice' && s.voice) { A.unlock(); A.say(U.pick(['halal', 'haram']), { delay: 0.05 }); }
    },
    applySettings() {
      const s = S.settings;
      const b = document.body.classList;
      b.toggle('reduce-motion', s.reduceMotion);
      b.toggle('reduce-fx', s.reduceFx);
      b.toggle('big-buttons', s.bigButtons);
      b.toggle('patterns', s.patterns);
      b.toggle('swipe-on', s.swipe);
      FX.reduceMotion = s.reduceMotion;
      FX.reduceFx = s.reduceFx;
      if (HHD.World.reduce !== s.reduceMotion) { HHD.World.reduce = s.reduceMotion; if (HHD.World.area) HHD.World.build(); }
      A.configure(s);
      const sk = D.SKINS.find((k) => k.id === S.data.skin);
      A.setSkinPitch(sk ? sk.pitch : 1);
    },
    resetProgress(el) {
      if (!el.dataset.armed) {
        el.dataset.armed = '1';
        el.textContent = '⚠️ WIRKLICH? NOCHMAL TIPPEN';
        setTimeout(() => { delete el.dataset.armed; el.textContent = '🗑️ FORTSCHRITT ZURÜCKSETZEN'; }, 3000);
        return;
      }
      S.reset();
      delete el.dataset.armed;
      el.textContent = '🗑️ FORTSCHRITT ZURÜCKSETZEN';
      FX.toast('Fortschritt gelöscht. Neuer Detector, neues Glück.');
      this.applySettings();
      this.renderSettings();
    },

    /* ---------- Game Over ---------- */
    showGameOver(r) {
      this.lastResult = r;
      this.show('over');
      const $ = (id) => document.getElementById(id);
      const TITLES = { daily: 'CHALLENGE GESCHAFFT!', kiosk: 'SCHICHT VORBEI!', bossrush: 'ALLE BOSSE BESIEGT!', zeit: 'ZEIT!' };
      $('go-title').textContent = r.mode === 'kiosk' && r.result === 'dead' ? 'GEFEUERT!' : TITLES[r.result] || 'GAME OVER';
      $('go-title').classList.toggle('win', !!TITLES[r.result] && r.result !== 'zeit');
      $('go-title').classList.toggle('long', $('go-title').textContent.length > 11);
      $('go-rank').textContent = r.rank[1];
      $('go-rank-sub').textContent = r.rank[2];
      $('go-comment').textContent = '„' + r.comment + '“';
      $('go-review').hidden = !r.review;
      $('go-review').textContent = r.review ? '⭐'.repeat(r.stars || 0) + (r.stars ? ' ' : '') + r.review : '';
      const stat = (label, val, isNew) => '<div class="go-stat' + (isNew ? ' new' : '') + '"><small>' + label + '</small><b>' + val + '</b>' + (isNew ? '<em>NEU!</em>' : '') + '</div>';
      $('go-stats').innerHTML =
        stat('SCORE', U.fmt(r.score), r.news.score) +
        stat('ACCURACY', r.accuracy + '%') +
        stat('HIGHEST COMBO', r.maxCombo, r.news.combo) +
        stat('FASTEST REACTION', r.fastest ? U.fmtSec(r.fastest) : '–', r.news.fastest) +
        stat('AURA', U.fmtSigned(r.aura), r.news.aura) +
        stat('RICHTIG', r.correct + ' / ' + r.total, r.news.correct) +
        stat('FASTEST CHECK', r.fastestCheck ? U.fmtSec(r.fastestCheck) : '–', r.news.fastestCheck) +
        stat('BOSSE', r.bosses);
      const badges = [];
      if (r.news.score) badges.push('🏅 NEW PERSONAL BEST');
      if (r.news.modeBest && r.mode !== 'normal') badges.push(D.MODES[r.mode].icon + ' MODUS-REKORD');
      if (r.news.daily) badges.push('📅 TAGESREKORD');
      if (r.dailyBest) badges.push('📅 CHALLENGE-BESTWERT');
      $('go-badges').innerHTML = badges.map((b) => '<span>' + b + '</span>').join('');
      let extra = '+' + U.fmt(r.xp) + ' XP · +' + U.fmt(r.coins) + ' 🪙';
      if (r.mode && r.mode !== 'normal') {
        const M = D.MODES[r.mode];
        let info = '';
        if (r.mode === 'ramadan') info = ' · TAG ' + r.day + '/30' + (r.eid ? ' · EID MUBARAK 🎉' : '');
        else if (r.mode === 'kiosk') info = ' · ' + Math.min(r.served, M.customers) + '/' + M.customers + ' KUNDEN · 💰 ' + U.fmt(r.tips) + ' TRINKGELD';
        else if (r.mode === 'bossrush') info = ' · ' + (r.result === 'bossrush' ? D.BOSS_ORDER.length : r.bossIdx) + '/' + D.BOSS_ORDER.length + ' BOSSE';
        else if (r.mode === 'chaos') info = ' · ' + r.mutCount + ' STÖRUNGEN ÜBERSTANDEN';
        else if (r.mode === 'daily') info = ' · ' + Math.min(r.dailyIdx, M.items) + '/' + M.items + ' PRODUKTE';
        else if (r.mode === 'zeit') info = ' · ' + r.correct + ' RICHTIG, BEVOR DIE UHR ABLIEF';
        extra = M.icon + ' ' + M.name + info + '<br>' + extra;
      }
      extra += '<br>⭐ RANG: ' + U.esc(r.title || '') + ' · 📅 AUFGABEN ' + (r.missionsDone || 0) + '/3';
      if (r.newAch) extra += '<br>🏅 ' + r.newAch + (r.newAch === 1 ? ' NEUER ERFOLG' : ' NEUE ERFOLGE');
      if (r.unlockedAreas && r.unlockedAreas.length) extra += '<br>🗺️ NEUER BEREICH: ' + r.unlockedAreas.map(U.esc).join(', ');
      if (r.forbidden) extra += '<br>💀 ULTRA RARE FREIGESCHALTET: THE FORBIDDEN SCANNER';
      if (r.unlockSkin) extra += '<br>🎨 SKIN FREIGESCHALTET: ' + U.esc(r.unlockSkin);
      $('go-rewards').innerHTML = extra;
      A.play('coin');
      if (r.news.score || (r.result && r.result !== 'dead' && r.result !== 'zeit')) { FX.confettiRain(100); A.play('crowd', 'cheer'); }
    },

    share() {
      const r = this.lastResult;
      if (!r) return;
      const text = 'HALAL HARAM DETECTOR 🔎' + (r.mode && r.mode !== 'normal' ? ' · ' + D.MODES[r.mode].name + (r.mode === 'daily' ? ' ' + U.today() : '') : '') + '\nScore: ' + U.fmt(r.score) + ' · Combo: ' + r.maxCombo + ' · Accuracy: ' + r.accuracy + '% · Aura: ' + U.fmtSigned(r.aura) +
        '\nRang: ' + r.rank[1] + '\n„BROTHER… CHECK THE INGREDIENTS.“';
      let top = true;
      try { top = window.self === window.top; } catch (e) { top = false; }
      if (navigator.share && top) {
        navigator.share({ title: 'Halal Haram Detector', text, url: location.href.split('#')[0] }).catch(() => {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => FX.toast('Ergebnis kopiert! 📋'), () => FX.toast(text, 4000));
      } else {
        FX.toast(text, 4000);
      }
    },

    /* ---------- Eingabe ---------- */
    bindDecisionButtons() {
      document.querySelectorAll('#controls .dbtn').forEach((b) => {
        let last = 0;
        b.addEventListener('pointerdown', (ev) => {
          if (ev.button > 0) return;
          ev.preventDefault();
          last = performance.now();
          A.unlock();
          G.input(b.dataset.choice);
        });
        // Tastatur-Aktivierung (Enter/Leertaste auf fokussiertem Button)
        b.addEventListener('click', () => { if (performance.now() - last > 400) G.input(b.dataset.choice); });
      });
      document.getElementById('set-volume').addEventListener('input', (ev) => {
        S.settings.volume = ev.target.value / 100;
        A.configure(S.settings);
      });
      document.getElementById('set-volume').addEventListener('change', () => { S.save(); A.play('beep'); });
      document.getElementById('set-name').addEventListener('change', (ev) => {
        const v = ev.target.value.trim().toUpperCase().slice(0, 14);
        S.data.name = v || 'BRUDER';
        S.save();
      });
    },

    bindKeys() {
      // Tasten wirken nach Position (links/Mitte/rechts) – wichtig, wenn Chaos die Buttons vertauscht
      const KEYS = { ArrowLeft: 0, KeyA: 0, ArrowRight: 2, KeyD: 2, ArrowDown: 1, ArrowUp: 1, KeyS: 1, KeyW: 1, Space: 1 };
      const DUEL = { KeyA: [1, 'halal'], KeyS: [1, 'check'], KeyD: [1, 'haram'], KeyJ: [2, 'halal'], KeyK: [2, 'check'], KeyL: [2, 'haram'], ArrowLeft: [2, 'halal'], ArrowDown: [2, 'check'], ArrowRight: [2, 'haram'] };
      document.addEventListener('keydown', (ev) => {
        if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
        A.unlock();
        if (this.screen === 'game') {
          if (ev.code === 'Escape' || ev.code === 'KeyP') { ev.preventDefault(); return G.paused ? G.resume() : G.pause(); }
          const pu = { Digit1: 'xray', Digit2: 'slowmo', Digit3: 'dua', Digit4: 'freeze', Digit5: 'joker', Numpad1: 'xray', Numpad2: 'slowmo', Numpad3: 'dua', Numpad4: 'freeze', Numpad5: 'joker' }[ev.code];
          if (pu && !ev.repeat) { ev.preventDefault(); return G.usePowerup(pu); }
          const pos = KEYS[ev.code];
          const c = pos != null ? G.choiceAt(pos) : null;
          if (c && !ev.repeat) {
            // Leertaste/Enter nicht doppelt auslösen, wenn ein Button fokussiert ist
            if (ev.code === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON') return;
            ev.preventDefault();
            G.input(c);
            const b = G.el.btns[c];
            if (b) U.restartAnim(b, 'pressed');
          }
        } else if (this.screen === 'duel') {
          const m = DUEL[ev.code];
          if (m && !ev.repeat) { ev.preventDefault(); HHD.Duel.input(m[0], m[1]); }
          if (ev.code === 'Escape') { HHD.Duel.stop(); this.show('start'); }
        } else if (this.screen === 'start' && ev.code === 'Enter' && document.activeElement === document.body) {
          this.play();
        } else if (this.screen === 'over' && ev.code === 'Enter' && document.activeElement === document.body) {
          this.replay();
        } else if (ev.code === 'Escape' && this.screen !== 'start') {
          this.show('start');
        }
      });
    },

    bindSwipe() {
      const stage = document.getElementById('stage');
      let sx = 0, sy = 0, st = 0, tracking = false;
      stage.addEventListener('pointerdown', (ev) => {
        if (!S.settings.swipe || ev.target.closest('button, .ing')) return;
        tracking = true; sx = ev.clientX; sy = ev.clientY; st = performance.now();
      });
      stage.addEventListener('pointerup', (ev) => {
        if (!tracking) return;
        tracking = false;
        const dx = ev.clientX - sx, dy = ev.clientY - sy, dt = performance.now() - st;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) G.input(G.choiceAt(dx < 0 ? 0 : 2));
        else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) G.input(G.choiceAt(1));
      });
      stage.addEventListener('pointercancel', () => { tracking = false; });
    },

    update(dt) {
      if (this.screen !== 'start') return;
      this.showT += dt;
      if (this.showT > 1.9) {
        this.showT = 0;
        this.showIdx++;
        this.renderShowcase();
      }
    },
  };

  HHD.UI = UI;
})();
