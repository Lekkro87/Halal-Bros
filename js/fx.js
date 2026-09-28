/* Halal Haram Detector – Effekte: Partikel, Floating-Texte, Flash, Shake, Banner, Toasts */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;

  const MAX = 260;
  const parts = [];
  for (let i = 0; i < MAX; i++) parts.push({ on: false });

  const FX = {
    cv: null, g: null, dpr: 1, w: 0, h: 0,
    reduceMotion: false, reduceFx: false,
    floatLayer: null, banner: null, toastEl: null, flashEl: null, shakeEl: null,
    floatPool: [],

    init(canvas) {
      this.cv = canvas;
      this.g = canvas.getContext('2d');
      this.flashEl = document.getElementById('flash');
      this.toastEl = document.getElementById('toast');
      window.addEventListener('resize', () => this.resize());
      this.resize();
    },
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.cv.width = Math.round(this.w * this.dpr);
      this.cv.height = Math.round(this.h * this.dpr);
    },

    /* Partikel aus dem Pool */
    burst(x, y, opts) {
      opts = opts || {};
      let n = opts.n || 24;
      if (this.reduceMotion) n = Math.ceil(n / 3);
      const colors = opts.colors || ['#3dff8b', '#ffe45e', '#ffffff', '#5ec8ff'];
      for (let i = 0; i < n; i++) {
        const p = parts.find((q) => !q.on);
        if (!p) return;
        const a = opts.angle != null ? opts.angle + U.rand(-opts.spread, opts.spread) : Math.random() * Math.PI * 2;
        const sp = U.rand(opts.min || 120, opts.max || 420);
        p.on = true; p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - (opts.up || 120);
        p.g = opts.gravity != null ? opts.gravity : 700;
        p.life = p.max = U.rand(0.5, opts.life || 1.0);
        p.s = U.rand(opts.smin || 4, opts.smax || 9);
        p.c = U.pick(colors);
        p.r = Math.random() * 6; p.vr = U.rand(-10, 10);
        p.shape = opts.shape || (Math.random() < 0.5 ? 'rect' : 'circle');
        p.text = opts.text || null;
      }
    },
    confettiRain(n) {
      for (let i = 0; i < (this.reduceMotion ? 20 : n || 80); i++) {
        const p = parts.find((q) => !q.on);
        if (!p) return;
        p.on = true; p.x = Math.random() * this.w; p.y = -20 - Math.random() * 200;
        p.vx = U.rand(-40, 40); p.vy = U.rand(80, 220); p.g = 60; p.life = p.max = U.rand(2, 3.4);
        p.s = U.rand(5, 10); p.c = U.pick(['#ff3b5c', '#3dff8b', '#ffe45e', '#5ec8ff', '#b44dff', '#ff9f1c']);
        p.r = Math.random() * 6; p.vr = U.rand(-8, 8); p.shape = 'rect'; p.text = null;
      }
    },

    /** Emoji-Regen von oben (Iftar Rush, Eid, Mashallah) */
    emojiRain(list, n) {
      const count = this.reduceMotion ? Math.ceil((n || 40) / 4) : n || 40;
      for (let i = 0; i < count; i++) {
        const p = parts.find((q) => !q.on);
        if (!p) return;
        p.on = true; p.x = Math.random() * this.w; p.y = -30 - Math.random() * 260;
        p.vx = U.rand(-30, 30); p.vy = U.rand(90, 200); p.g = 40; p.life = p.max = U.rand(2.4, 3.6);
        p.s = U.rand(6, 11); p.c = '#fff'; p.r = 0; p.vr = 0; p.shape = 'rect'; p.text = U.pick(list);
      }
    },

    /** Mamas Terlik fliegt ins Bild – KLATSCH! */
    terlik(light) {
      if (!this.terlikEl) {
        this.terlikEl = document.createElement('div');
        this.terlikEl.className = 'terlik-fly';
        this.terlikEl.setAttribute('aria-hidden', 'true');
        this.terlikEl.textContent = '🩴';
        this.klatschEl = document.createElement('div');
        this.klatschEl.className = 'klatsch';
        this.klatschEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.terlikEl);
        document.body.appendChild(this.klatschEl);
      }
      const t = this.terlikEl, k = this.klatschEl;
      t.classList.toggle('light', !!light);
      U.restartAnim(t, 'go');
      clearTimeout(this._kt);
      this._kt = setTimeout(() => {
        k.textContent = U.pick(light ? ['KLATSCH!', 'PATSCH!'] : ['KLATSCH!', 'BAM!', 'TERLIK!', 'KLATSCH!!']);
        k.classList.toggle('light', !!light);
        U.restartAnim(k, 'go');
        if (!light) this.shake('big');
      }, 420);
    },

    /** Bildschirm-Riss bei großen Fehlern */
    crack() {
      if (this.reduceFx) return;
      if (!this.crackEl) {
        this.crackEl = document.createElement('div');
        this.crackEl.className = 'crack';
        this.crackEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.crackEl);
      }
      U.restartAnim(this.crackEl, 'on');
    },

    frame(dt) {
      const g = this.g;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        const a = Math.min(1, p.life / p.max * 1.6);
        g.globalAlpha = a;
        g.fillStyle = p.c;
        if (p.text) {
          g.font = Math.round(p.s * 3) + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(p.text, p.x, p.y);
        } else if (p.shape === 'rect') {
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
        } else {
          g.beginPath(); g.arc(p.x, p.y, p.s / 2, 0, 7); g.fill();
        }
      }
      g.globalAlpha = 1;
    },

    /* Schwebender Text (DOM, gepoolt) an Bildschirmposition */
    float(text, x, y, cls) {
      if (!this.floatLayer) return;
      const el = this.floatPool.pop() || document.createElement('div');
      el.className = 'floater ' + (cls || '');
      el.textContent = text;
      const r = this.floatLayer.getBoundingClientRect();
      el.style.left = (x - r.left) + 'px';
      el.style.top = (y - r.top) + 'px';
      this.floatLayer.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (this.floatPool.length < 20) this.floatPool.push(el);
      }, 1150);
    },

    flash(color) {
      if (this.reduceFx || !this.flashEl) return;
      this.flashEl.style.background = color;
      U.restartAnim(this.flashEl, 'on');
    },

    shake(strength) {
      if (this.reduceFx || !this.shakeEl) return;
      const cls = strength === 'big' ? 'shake-big' : 'shake';
      this.shakeEl.classList.remove('shake', 'shake-big');
      void this.shakeEl.offsetWidth;
      this.shakeEl.classList.add(cls);
    },

    /** Großer Banner-Text in der Bildmitte */
    showBanner(title, sub, cls, ms) {
      const b = this.banner;
      if (!b) return;
      b.className = 'banner ' + (cls || '');
      b.innerHTML = '<div class="bn-title">' + U.esc(title) + '</div>' + (sub ? '<div class="bn-sub">' + U.esc(sub) + '</div>' : '');
      void b.offsetWidth;
      b.classList.add('show');
      clearTimeout(this._bt);
      this._bt = setTimeout(() => b.classList.remove('show'), ms || 1300);
    },
    hideBanner() { if (this.banner) this.banner.classList.remove('show'); },

    toast(text, ms) {
      const t = this.toastEl;
      if (!t) return;
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(this._tt);
      this._tt = setTimeout(() => t.classList.remove('show'), ms || 1800);
    },
  };

  HHD.FX = FX;
})();
