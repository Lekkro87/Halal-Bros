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
      this.applySettings();
      this.refreshStart();
      this.show('start');
    },

    /* ---------- Screens ---------- */
    show(name) {
      this.screen = name;
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + name));
      document.body.dataset.screen = name;
      const menu = ['start', 'map', 'shop', 'board', 'settings', 'help', 'over'].includes(name);
      if (menu) {
        HHD.World.setArea(name === 'over' && G.run ? G.run.level.area : S.data.area || 'street');
        HHD.World.setIntensity(1);
        HHD.World.setScan(false);
        HHD.World.setOverview(false);
        HHD.World.overheat = 0;
        if (name !== 'over') { A.music.set({ mode: 'menu', boss: false, panic: false, combo: 0 }); A.music.start('menu'); }
      }
      if (name === 'start') this.refreshStart();
      if (name === 'map') this.renderMap();
      if (name === 'shop') this.renderShop();
      if (name === 'board') this.renderBoard();
      if (name === 'settings') this.renderSettings();
      const scr = document.getElementById('scr-' + name);
      if (scr) scr.scrollTop = 0;
    },

    action(act, el) {
      switch (act) {
        case 'play': return this.play();
        case 'map': return this.show('map');
        case 'shop': return this.show('shop');
        case 'leaderboard': return this.show('board');
        case 'settings': return this.show('settings');
        case 'help': return this.show('help');
        case 'duel': A.music.stop(); this.show('duel'); return HHD.Duel.start();
        case 'duel-again': return HHD.Duel.start();
        case 'duel-quit': HHD.Duel.stop(); return this.show('start');
        case 'back': return this.show('start');
        case 'start-area': return this.startArea(el.dataset.area);
        case 'again': return this.startArea(S.data.area);
        case 'pause': return G.pause();
        case 'resume': return G.resume();
        case 'restart': G.quit(); return this.startArea(S.data.area);
        case 'quit': G.quit(); return this.show('start');
        case 'buy': return this.buy(el.dataset.skin);
        case 'equip': return this.equip(el.dataset.skin);
        case 'tab': this.boardTab = el.dataset.tab; return this.renderBoard();
        case 'toggle': return this.toggle(el.dataset.key);
        case 'tutorial': S.data.tutorialDone = false; S.save(); return this.play();
        case 'reset': return this.resetProgress(el);
        case 'share': return this.share();
        case 'pause-toggle': return this.toggle(el.dataset.key, true);
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
          G.start('street');
        });
        return;
      }
      const unlocked = D.AREAS.filter((a) => S.areaUnlocked(a));
      if (unlocked.length > 1) return this.show('map');
      this.startArea('street');
    },

    startArea(id) {
      const area = D.AREAS.find((a) => a.id === id);
      if (!area || !S.areaUnlocked(area)) id = 'street';
      S.data.area = id;
      S.save();
      A.music.stop();
      this.show('game');
      G.start(id);
    },

    /* ---------- Startbildschirm ---------- */
    refreshStart() {
      const d = S.data;
      const pl = S.playerLevel();
      document.getElementById('st-coins').textContent = U.fmt(d.coins);
      document.getElementById('st-plevel').textContent = pl.lvl;
      document.getElementById('st-xpbar').style.transform = 'scaleX(' + (pl.into / pl.need).toFixed(3) + ')';
      document.getElementById('st-best').textContent = U.fmt(d.bests.score);
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

    /* ---------- Stadtkarte ---------- */
    renderMap() {
      const xp = S.data.xp;
      document.getElementById('map-xp').textContent = U.fmt(xp) + ' XP';
      document.getElementById('map-list').innerHTML = D.AREAS.map((a) => {
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
      document.getElementById('shop-list').innerHTML = D.SKINS.map((s) => {
        const owned = d.owned.includes(s.id);
        const eq = d.skin === s.id;
        let btn;
        if (eq) btn = '<button class="btn small eq" disabled>✓ AUSGERÜSTET</button>';
        else if (owned) btn = '<button class="btn small" data-action="equip" data-skin="' + s.id + '">AUSRÜSTEN</button>';
        else if (s.price == null) btn = '<button class="btn small locked" disabled>🔒 COMBO ' + s.unlockCombo + '</button>';
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

    /* ---------- Rangliste ---------- */
    renderBoard() {
      const d = S.data;
      const B = d.bests;
      document.getElementById('board-bests').innerHTML = D.BOARDS.map((b) => {
        const v = B[b.id];
        return '<div class="pb"><span>' + b.icon + '</span><b>' + (v ? (b.sec ? U.fmtSec(v) : U.fmt(v)) : '–') + '</b><small>' + b.name + '</small></div>';
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
      document.getElementById('storage-note').textContent = S.available ? 'Fortschritt wird lokal auf diesem Gerät gespeichert.' : '⚠️ Lokaler Speicher ist nicht verfügbar – Fortschritt geht beim Schließen verloren.';
    },
    toggle(key) {
      const s = S.settings;
      s[key] = !s[key];
      S.save();
      this.applySettings();
      this.renderSettings();
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
      $('go-rank').textContent = r.rank[1];
      $('go-rank-sub').textContent = r.rank[2];
      $('go-comment').textContent = '„' + r.comment + '“';
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
      if (r.news.daily) badges.push('📅 TAGESREKORD');
      $('go-badges').innerHTML = badges.map((b) => '<span>' + b + '</span>').join('');
      let extra = '+' + U.fmt(r.xp) + ' XP · +' + U.fmt(r.coins) + ' 🪙';
      if (r.unlockedAreas && r.unlockedAreas.length) extra += '<br>🗺️ NEUER BEREICH: ' + r.unlockedAreas.map(U.esc).join(', ');
      if (r.forbidden) extra += '<br>💀 ULTRA RARE FREIGESCHALTET: THE FORBIDDEN SCANNER';
      $('go-rewards').innerHTML = extra;
      A.play('coin');
      if (r.news.score) { FX.confettiRain(100); A.play('crowd', 'cheer'); }
    },

    share() {
      const r = this.lastResult;
      if (!r) return;
      const text = 'HALAL HARAM DETECTOR 🔎\nScore: ' + U.fmt(r.score) + ' · Combo: ' + r.maxCombo + ' · Accuracy: ' + r.accuracy + '% · Aura: ' + U.fmtSigned(r.aura) +
        '\nRang: ' + r.rank[1] + '\n„BROTHER… CHECK THE INGREDIENTS.“';
      if (navigator.share) {
        navigator.share({ title: 'Halal Haram Detector', text, url: location.href.split('#')[0] }).catch(() => {});
      } else if (navigator.clipboard) {
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
      const KEYS = { ArrowLeft: 'halal', KeyA: 'halal', ArrowRight: 'haram', KeyD: 'haram', ArrowDown: 'check', ArrowUp: 'check', KeyS: 'check', KeyW: 'check', Space: 'check' };
      const DUEL = { KeyA: [1, 'halal'], KeyS: [1, 'check'], KeyD: [1, 'haram'], KeyJ: [2, 'halal'], KeyK: [2, 'check'], KeyL: [2, 'haram'], ArrowLeft: [2, 'halal'], ArrowDown: [2, 'check'], ArrowRight: [2, 'haram'] };
      document.addEventListener('keydown', (ev) => {
        if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
        A.unlock();
        if (this.screen === 'game') {
          if (ev.code === 'Escape' || ev.code === 'KeyP') { ev.preventDefault(); return G.paused ? G.resume() : G.pause(); }
          const c = KEYS[ev.code];
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
          this.startArea(S.data.area);
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
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) G.input(dx < 0 ? 'halal' : 'haram');
        else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) G.input('check');
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
