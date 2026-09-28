/* Halal Haram Detector – Lokaler 2-Spieler-Modus: „WHO HAS THE FASTER DETECTOR?“
 * Beide Spieler sehen dasselbe Produkt und entscheiden gleichzeitig (ein Gerät, gegenüber sitzen
 * oder Tastatur: Spieler 1 = A/S/D, Spieler 2 = J/K/L bzw. Pfeiltasten).
 */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;
  const D = HHD.DATA;
  const A = HHD.Audio;
  const FX = HHD.FX;
  const Art = HHD.Art;

  const ROUNDS = 15;
  const LABEL = { halal: '✅ HALAL', haram: '❌ HARAM', check: '🔎 CHECK' };

  const Duel = {
    el: {},
    active: false,
    state: 'idle',
    round: 0,
    item: null,
    left: 0,
    time: 0,
    wait: 0,
    p: null,
    recent: [],

    init() {
      const $ = (id) => document.getElementById(id);
      ['duel-item', 'duel-bar', 'duel-round', 'duel-info', 'd1-score', 'd2-score', 'd1-res', 'd2-res', 'duel-results', 'duel-res-body'].forEach((id) => { this.el[id] = $(id); });
      document.querySelectorAll('#scr-duel .dbtn').forEach((b) => {
        let last = 0;
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); last = performance.now(); this.input(+b.dataset.p, b.dataset.choice); });
        b.addEventListener('click', () => { if (performance.now() - last > 400) this.input(+b.dataset.p, b.dataset.choice); });
      });
    },

    start() {
      this.active = true;
      this.round = 0;
      this.recent = [];
      this.p = [null, this.player(), this.player()];
      this.el['duel-results'].hidden = true;
      this.el['d1-score'].textContent = '0';
      this.el['d2-score'].textContent = '0';
      HHD.World.setArea('doener');
      HHD.World.setIntensity(2);
      A.music.set({ mode: 'game', level: 3, combo: 0, boss: false, panic: false });
      A.music.start('game');
      FX.showBanner('WHO HAS THE FASTER DETECTOR?', 'Gleiche Produkte. Gleichzeitig entscheiden.', 'level', 1600);
      this.state = 'wait';
      this.wait = 1.7;
    },
    player() { return { score: 0, correct: 0, times: [], choice: null, t: 0, fastest: 0 }; },

    stop() {
      this.active = false;
      this.state = 'idle';
      A.music.stop();
    },

    nextRound() {
      if (this.round >= ROUNDS) return this.finish();
      this.round++;
      const pool = D.ITEMS.filter((i) => i.tier <= 4 && !this.recent.includes(i.id));
      const tpl = U.pick(pool);
      this.recent.push(tpl.id);
      if (this.recent.length > 8) this.recent.shift();
      const variant = tpl.ans === 'check' ? U.pick(tpl.v) : null;
      this.item = { tpl, name: tpl.name, art: tpl.art, ans: tpl.ans, variant };
      this.time = U.lerp(2.5, 1.3, (this.round - 1) / (ROUNDS - 1)) * (tpl.art.t === 'emoji' ? 1 : 1.15);
      this.left = this.time;
      const holder = this.el['duel-item'];
      holder.innerHTML = '';
      const el = Art.makeItemEl(this.item, 'enter');
      holder.appendChild(el);
      this.el['duel-round'].textContent = 'RUNDE ' + this.round + '/' + ROUNDS;
      this.el['duel-info'].className = 'duel-info';
      this.el['duel-info'].textContent = '';
      [1, 2].forEach((i) => {
        const p = this.p[i];
        p.choice = null; p.t = 0;
        this.el['d' + i + '-res'].className = 'd-res';
        this.el['d' + i + '-res'].textContent = '';
        document.querySelectorAll('#scr-duel .dbtn[data-p="' + i + '"]').forEach((b) => b.classList.remove('picked'));
      });
      A.play('beep');
      A.play('scan');
      this.state = 'decide';
    },

    input(pi, choice) {
      if (!this.active || this.state !== 'decide') return;
      const p = this.p[pi];
      if (!p || p.choice) return;
      p.choice = choice;
      p.t = this.time - this.left;
      A.play('click');
      const b = document.querySelector('#scr-duel .dbtn[data-p="' + pi + '"][data-choice="' + choice + '"]');
      if (b) b.classList.add('picked');
      this.el['d' + pi + '-res'].textContent = '🔒 ' + U.fmtSec(p.t);
      this.el['d' + pi + '-res'].className = 'd-res locked';
      if (this.p[1].choice && this.p[2].choice) this.resolve();
    },

    resolve() {
      this.state = 'reveal';
      const it = this.item;
      const ok = [false, this.p[1].choice === it.ans, this.p[2].choice === it.ans];
      let first = 0;
      if (ok[1] && ok[2]) first = this.p[1].t <= this.p[2].t ? 1 : 2;
      else if (ok[1]) first = 1;
      else if (ok[2]) first = 2;
      [1, 2].forEach((i) => {
        const p = this.p[i];
        const r = this.el['d' + i + '-res'];
        if (ok[i]) {
          const pts = 100 + Math.round(100 * U.clamp(1 - p.t / this.time, 0, 1)) + (first === i ? 50 : 0);
          p.score += pts; p.correct++; p.times.push(p.t);
          if (!p.fastest || p.t < p.fastest) p.fastest = p.t;
          r.textContent = '✓ +' + pts + (first === i ? ' ⚡' : '');
          r.className = 'd-res ok';
        } else {
          r.textContent = p.choice ? '✗ ' + LABEL[p.choice] : '✗ ZU LANGSAM';
          r.className = 'd-res err';
        }
        this.el['d' + i + '-score'].textContent = U.fmt(p.score);
      });
      if (ok[1] || ok[2]) A.play('correct', 3); else A.play('wrong');
      let info = 'RICHTIG: ' + LABEL[it.ans];
      if (it.ans === 'check' && it.variant) {
        const flag = it.variant[1].find((x) => typeof x === 'string' && x[0] === '!');
        info += ' · Zutaten: ' + (it.variant[0] === 'haram' ? (flag ? flag.slice(1) : '?') + ' → HARAM' : 'alles okay → HALAL');
      }
      if (first) info = (first === 1 ? 'PLAYER 1' : 'PLAYER 2') + ' WAR SCHNELLER ⚡ · ' + info;
      this.el['duel-info'].textContent = info;
      this.el['duel-info'].className = 'duel-info show';
      this.wait = 1.35;
    },

    finish() {
      this.state = 'done';
      A.music.stop();
      A.play('levelUp');
      const [, a, b] = this.p;
      const acc = (p) => Math.round((p.correct / ROUNDS) * 100);
      const avg = (p) => (p.times.length ? p.times.reduce((x, y) => x + y, 0) / p.times.length : 0);
      let win;
      if (a.score === b.score) win = 'UNENTSCHIEDEN. ZWEI DETECTOREN, EIN GEHIRN.';
      else win = (a.score > b.score ? 'PLAYER 1' : 'PLAYER 2') + ' HAS THE FASTER DETECTOR';
      const row = (label, p) =>
        '<div class="dr-p"><h3>' + label + '</h3>' +
        '<div class="dr-big">' + acc(p) + '% <small>accuracy</small></div>' +
        '<div>Punkte: <b>' + U.fmt(p.score) + '</b></div>' +
        '<div>Ø Reaktion: <b>' + (avg(p) ? U.fmtSec(avg(p)) : '–') + '</b></div>' +
        '<div>Schnellste: <b>' + (p.fastest ? U.fmtSec(p.fastest) : '–') + '</b></div></div>';
      this.el['duel-res-body'].innerHTML =
        '<div class="dr-win">' + U.esc(win) + '</div>' +
        '<div class="dr-grid">' + row('PLAYER 1', a) + row('PLAYER 2', b) + '</div>' +
        '<p class="dr-note">Rein spielerisch: Wer hat den schnelleren Detector? 🔎</p>';
      this.el['duel-results'].hidden = false;
      FX.confettiRain(90);
    },

    update(dt) {
      if (!this.active) return;
      if (this.state === 'wait' || this.state === 'reveal') {
        this.wait -= dt;
        if (this.wait <= 0) this.nextRound();
        return;
      }
      if (this.state !== 'decide') return;
      this.left -= dt;
      this.el['duel-bar'].style.transform = 'scaleX(' + U.clamp(this.left / this.time, 0, 1).toFixed(3) + ')';
      if (this.left <= 0) this.resolve();
    },
  };

  HHD.Duel = Duel;
})();
