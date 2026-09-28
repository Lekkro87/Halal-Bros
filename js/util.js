/* Halal Haram Detector – kleine Helfer */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});

  const U = {
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },
    rand(a, b) { return a + Math.random() * (b - a); },
    randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    chance(p) { return Math.random() < p; },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    /** Gewichtete Auswahl: items[i] mit weights[i] */
    weighted(items, weights) {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) sum += weights[i];
      let r = Math.random() * sum;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    fmt(n) { return Math.round(n).toLocaleString('de-DE'); },
    fmtSigned(n) { return (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('de-DE'); },
    fmtSec(s) { return s.toFixed(2).replace('.', ',') + 's'; },
    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    today() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    now() { return performance.now(); },
    /** Deterministischer Zufall aus einem Text: gleicher Text = gleiche Zahlenfolge (Tages-Challenge) */
    seeded(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      let seed = h >>> 0;
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    /** Startet eine CSS-Animation neu (Klasse entfernen, Reflow, wieder setzen) */
    restartAnim(el, cls) {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    },
    el(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
  };

  HHD.U = U;
})();
