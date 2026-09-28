/* Halal Haram Detector – lebendige Cartoon-Stadt im Hintergrund (Canvas) */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;

  const OUT = '#1d1433'; // Cel-Shading-Outline
  const SKIES = {
    day: ['#5ec8ff', '#bfeeff', '#fff7d6'],
    sunset: ['#6a4bc4', '#ff8a65', '#ffd59b'],
    night: ['#070a26', '#1e1850', '#43307a'],
    apocalypse: ['#1a0526', '#7a1446', '#ff6a2b'],
    ramadan: ['#050b22', '#13265a', '#3a2c74'],
    indoor: ['#f6efe0', '#efe6d2', '#e7dcc4'],
  };
  const SHOP_COLORS = ['#ff6b6b', '#4ecdc4', '#ffd166', '#8e7dff', '#06d6a0', '#ff9f1c', '#ef476f', '#3a86ff', '#f78c6b', '#9bde7e'];
  const SHOP_EMO = {
    'KIOSK': '🍬', 'KIOSK 24/7': '🥤', 'BÄCKEREI': '🥨', 'SCHULE': '✏️', 'DÖNER': '🥙', 'DÖNER PALAST': '🥙', 'MEGA DÖNER': '🥙',
    'TELEFONLADEN': '📱', 'FOOD COURT': '🍔', 'RESTAURANT': '🍝', 'SUSHI BAR': '🍣', 'SUSHI XXL': '🍣', 'BURGER': '🍔',
    'GATE A12': '✈️', 'DUTY FREE': '🛍️', 'LOUNGE': '🛋️', 'NACHTMARKT': '🏮', 'STREET FOOD': '🍢', 'GRILL': '🍗', 'NUDELN': '🍜',
    'HYPERMARKT': '🛒',
  };

  const W = {
    cv: null, g: null, w: 0, h: 0, dpr: 1, t: 0, x: 0,
    area: null, scene: 'street', time: 'day',
    sprites: [], skyline: null, skyGrad: null, stars: [], clouds: [],
    walkers: [], bus: null, flyers: [], lanterns: false,
    speed: 26, intensity: 1, reduce: false,
    scan: 0, overview: 0, overviewTarget: 0, overheat: 0,
    theme: null, rush: false, fanous: false, lanternSprites: [], ramadanSign: null,
    groundY: 0,

    init(canvas) {
      this.cv = canvas;
      this.g = canvas.getContext('2d', { alpha: false });
      window.addEventListener('resize', () => this.resize());
      this.resize();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.area && this.build());
    },

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.cv.width = Math.round(this.w * this.dpr);
      this.cv.height = Math.round(this.h * this.dpr);
      this.groundY = Math.round(this.h * 0.64);
      if (this.area) this.build();
    },

    setArea(areaId) {
      const a = HHD.DATA.AREAS.find((x) => x.id === areaId) || HHD.DATA.AREAS[0];
      if (this.area === a) return;
      this.area = a; this.scene = a.scene;
      this.time = this.theme === 'ramadan' ? 'ramadan' : a.time;
      this.build();
    },

    /** Ramadan-Theme: jede Gegend wird nachts mit Laternen und Mondsichel dargestellt */
    setTheme(theme) {
      if (this.theme === theme) return;
      this.theme = theme;
      if (this.area) { this.time = theme === 'ramadan' ? 'ramadan' : this.area.time; this.build(); }
    },
    setRush(on) { this.rush = !!on; },

    setIntensity(level) { this.intensity = level; this.speed = 22 + level * 9; },

    /* ---------- Vorab-Rendering (Sprites werden wiederverwendet) ---------- */
    build() {
      const a = this.area;
      const g = this.g;
      const cols = SKIES[this.time] || SKIES.day;
      const grad = g.createLinearGradient(0, 0, 0, this.groundY);
      grad.addColorStop(0, cols[0]); grad.addColorStop(0.65, cols[1]); grad.addColorStop(1, cols[2]);
      this.skyGrad = grad;
      this.sprites = [];
      const H = this.groundY;
      const shopH = Math.max(150, Math.min(330, H * 0.5));
      if (this.scene === 'street') {
        this.skyline = this.makeSkyline(H);
        const names = a.shops;
        for (let i = 0; i < Math.max(6, names.length); i++) {
          const n = names[i % names.length];
          let kind = 'shop';
          if (n === 'PARK') kind = 'park';
          else if (n === 'TANKSTELLE') kind = 'tank';
          else if (n === 'MARKT' || n === 'NACHTMARKT' || n === 'STREET FOOD') kind = 'stall';
          else if (n === 'FOOD TRUCK') kind = 'truck';
          this.sprites.push(this.makeShop(n, kind, shopH * U.rand(0.9, 1.15)));
        }
      } else if (this.scene === 'shelves') {
        this.skyline = null;
        for (let i = 0; i < 5; i++) this.sprites.push(this.makeShelf(shopH * 1.25, i));
      } else {
        this.skyline = this.makeWindows(H);
        a.shops.forEach((n) => this.sprites.push(this.makeShop(n, 'glass', shopH * 0.95)));
        if (a.id === 'airport') this.sprites.splice(2, 0, this.makeBoard(shopH * 0.9));
      }
      this.stars = [];
      if (this.time === 'night' || this.time === 'apocalypse' || this.time === 'ramadan') {
        for (let i = 0; i < 70; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.6 + 0.3, p: Math.random() * 6 });
      }
      this.clouds = [];
      if (this.time === 'day' || this.time === 'sunset') {
        for (let i = 0; i < 5; i++) this.clouds.push({ x: Math.random() * this.w, y: U.rand(0.06, 0.32) * H, s: U.rand(0.6, 1.3), v: U.rand(4, 10) });
      }
      this.lanterns = this.time === 'night';
      this.fanous = this.time === 'ramadan';
      if (this.fanous) {
        this.lanternSprites = ['#ff4d6d', '#3dd6d0', '#ffd166', '#8e7dff', '#06d6a0'].map((c) => this.makeLantern(c));
        this.ramadanSign = this.makeRamadanSign();
      }
      // Laufende NPCs
      this.walkers = [];
      const n = this.reduce ? 3 : this.w > 900 ? 9 : 6;
      for (let i = 0; i < n; i++) this.walkers.push(this.makeWalker(Math.random() * this.w));
      this.layout = [];
      let x = -40;
      for (let i = 0; i < 40; i++) {
        const s = this.sprites[i % this.sprites.length];
        this.layout.push({ s, x });
        x += s.w + (this.scene === 'shelves' ? 6 : U.rand(14, 40));
      }
      this.layoutW = x;
    },

    canvas(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * this.dpr); c.height = Math.ceil(h * this.dpr);
      const g = c.getContext('2d');
      g.scale(this.dpr, this.dpr);
      return { c, g };
    },

    makeSkyline(H) {
      const tw = 900, th = H * 0.55;
      const { c, g } = this.canvas(tw, th);
      const night = this.time === 'night' || this.time === 'apocalypse' || this.time === 'ramadan';
      const base = { day: '#8fb8e8', sunset: '#8a5a9e', night: '#241d4d', apocalypse: '#3b0f33', ramadan: '#1f2a5c' }[this.time] || '#8fb8e8';
      const front = { day: '#6f9fd8', sunset: '#6d4488', night: '#1a1540', apocalypse: '#2a0a26', ramadan: '#151c45' }[this.time] || '#6f9fd8';
      [[base, 0.55], [front, 0.8]].forEach(([col, hm], layer) => {
        let x = 0;
        while (x < tw) {
          const bw = U.rand(40, 90), bh = U.rand(0.3, 1) * th * hm;
          g.fillStyle = col;
          g.fillRect(x, th - bh, bw, bh);
          if (layer === 1 && Math.random() < 0.3) { g.fillRect(x + bw / 2 - 2, th - bh - 18, 4, 18); }
          g.fillStyle = night ? 'rgba(255,220,120,0.75)' : 'rgba(255,255,255,0.35)';
          for (let wy = th - bh + 8; wy < th - 8; wy += 14) {
            for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (Math.random() < (night ? 0.35 : 0.5)) g.fillRect(wx, wy, 5, 7);
          }
          x += bw + U.rand(0, 8);
        }
      });
      return { c, w: tw, h: th };
    },

    makeWindows(H) {
      const tw = 600, th = H;
      const { c, g } = this.canvas(tw, th);
      const airport = this.area.id === 'airport';
      const sky = g.createLinearGradient(0, 0, 0, th);
      const dark = this.time === 'ramadan';
      sky.addColorStop(0, dark ? '#0b1640' : '#7ecbff'); sky.addColorStop(1, dark ? '#2a3a7a' : '#d9f3ff');
      g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, tw, th);
      for (let i = 0; i < 3; i++) {
        const x = 20 + i * 200;
        g.fillStyle = sky; g.fillRect(x, th * 0.08, 170, th * 0.55);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath(); g.moveTo(x + 20, th * 0.08); g.lineTo(x + 70, th * 0.08); g.lineTo(x + 20, th * 0.4); g.closePath(); g.fill();
        if (airport && i === 1) { g.font = '48px serif'; g.fillText('✈️', x + 50, th * 0.3); }
        g.strokeStyle = '#9d97a8'; g.lineWidth = 6; g.strokeRect(x, th * 0.08, 170, th * 0.55);
        g.lineWidth = 3; g.beginPath(); g.moveTo(x + 85, th * 0.08); g.lineTo(x + 85, th * 0.63); g.stroke();
      }
      g.fillStyle = '#d7cfbf'; g.fillRect(0, 0, tw, th * 0.05);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#fffbe8'; g.fillRect(40 + i * 100, th * 0.015, 50, 8); }
      return { c, w: tw, h: th };
    },

    makeBoard(h) {
      const w = h * 1.2;
      const { c, g } = this.canvas(w, h);
      g.fillStyle = '#9d97a8'; g.fillRect(w / 2 - 6, h * 0.55, 12, h * 0.45);
      g.fillStyle = '#12121a'; g.strokeStyle = OUT; g.lineWidth = 3;
      roundRect(g, 4, h * 0.08, w - 8, h * 0.5, 8); g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; g.font = 'bold ' + Math.round(h * 0.05) + 'px monospace';
      const rows = ['ABFLUG  GATE  STATUS', 'DÖNER-CITY  A12  ✓', 'GUMMIBÄR-INSEL  B7  ???', 'ZUTATEN-LAND  C3  LESEN', 'SNACK-STADT  D1  BOARDING'];
      rows.forEach((r, i) => { g.fillStyle = i === 0 ? '#9ad1ff' : '#ffd23f'; g.fillText(r, 16, h * 0.16 + i * h * 0.085); });
      return { c, w, h, kind: 'board' };
    },

    makeShop(name, kind, h) {
      const w = Math.round(kind === 'truck' ? h * 1.25 : kind === 'park' ? h * 1.1 : h * U.rand(0.78, 1.0));
      const { c, g } = this.canvas(w, h);
      const col = U.pick(SHOP_COLORS);
      const col2 = U.pick(SHOP_COLORS.filter((x) => x !== col));
      g.lineJoin = 'round';
      const night = this.time === 'night' || this.time === 'apocalypse' || this.time === 'ramadan';
      if (kind === 'park') {
        g.fillStyle = '#7a4b2a';
        for (let i = 0; i < 3; i++) {
          const tx = w * (0.2 + i * 0.3), th = h * U.rand(0.55, 0.8);
          g.fillRect(tx - 6, h - th * 0.45, 12, th * 0.45);
          g.fillStyle = ['#3fbf5f', '#2fa34f', '#56d06e'][i];
          g.strokeStyle = OUT; g.lineWidth = 3;
          g.beginPath(); g.arc(tx, h - th * 0.6, th * 0.28, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = '#7a4b2a';
        }
        g.fillStyle = '#b5651d'; g.strokeStyle = OUT; g.lineWidth = 3;
        roundRect(g, w * 0.3, h - h * 0.14, w * 0.4, h * 0.05, 3); g.fill(); g.stroke();
        this.sign(g, 'PARK', w * 0.5, h * 0.12, w * 0.5, h * 0.1, '#2fa34f', '#fff');
        return { c, w, h, kind };
      }
      if (kind === 'truck') {
        const ty = h * 0.35;
        g.fillStyle = col; g.strokeStyle = OUT; g.lineWidth = 3;
        roundRect(g, 6, ty, w * 0.72, h * 0.52, 12); g.fill(); g.stroke();
        roundRect(g, w * 0.72, ty + h * 0.14, w * 0.25, h * 0.38, 10); g.fill(); g.stroke();
        g.fillStyle = '#bde0fe'; roundRect(g, w * 0.76, ty + h * 0.18, w * 0.16, h * 0.12, 5); g.fill(); g.stroke();
        g.fillStyle = '#2b2d42'; roundRect(g, 20, ty + h * 0.1, w * 0.5, h * 0.2, 5); g.fill(); g.stroke();
        g.font = Math.round(h * 0.13) + 'px serif'; g.textAlign = 'center'; g.fillText(U.pick(['🌯', '🥙', '🍟']), w * 0.3, ty + h * 0.25);
        this.sign(g, name, w * 0.37, ty - h * 0.02, w * 0.55, h * 0.09, '#fff', OUT);
        g.fillStyle = OUT;
        [w * 0.18, w * 0.8].forEach((x) => { g.beginPath(); g.arc(x, h * 0.88, h * 0.07, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = '#ccc';
        [w * 0.18, w * 0.8].forEach((x) => { g.beginPath(); g.arc(x, h * 0.88, h * 0.03, 0, Math.PI * 2); g.fill(); });
        return { c, w, h, kind };
      }
      if (kind === 'stall') {
        g.fillStyle = '#8d5524'; g.fillRect(w * 0.1, h * 0.35, 8, h * 0.65); g.fillRect(w * 0.9 - 8, h * 0.35, 8, h * 0.65);
        const sw = (w * 0.9) / 8;
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#fff' : col;
          g.beginPath(); g.moveTo(w * 0.05 + i * sw, h * 0.3); g.lineTo(w * 0.05 + (i + 1) * sw, h * 0.3);
          g.lineTo(w * 0.05 + (i + 1) * sw, h * 0.4); g.quadraticCurveTo(w * 0.05 + (i + 0.5) * sw, h * 0.46, w * 0.05 + i * sw, h * 0.4); g.fill();
        }
        g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(w * 0.05, h * 0.3, w * 0.9, h * 0.1);
        g.fillStyle = '#c68642'; roundRect(g, w * 0.08, h * 0.7, w * 0.84, h * 0.3, 4); g.fill(); g.stroke();
        g.font = Math.round(h * 0.11) + 'px serif'; g.textAlign = 'center';
        const emo = name === 'MARKT' ? ['🍎', '🥕', '🍅', '🍌'] : ['🍢', '🍜', '🥟', '🧋'];
        emo.forEach((e, i) => g.fillText(e, w * (0.2 + i * 0.2), h * 0.68));
        this.sign(g, name, w * 0.5, h * 0.12, w * 0.8, h * 0.11, night ? '#ff2d6f' : '#fff', night ? '#fff' : OUT);
        if (night) this.glow(g, w * 0.5, h * 0.12, w * 0.45, 'rgba(255,45,111,0.25)');
        return { c, w, h, kind };
      }
      // Standard-Laden / Glas-Laden / Tankstelle
      const bodyTop = kind === 'tank' ? h * 0.3 : h * 0.1;
      g.strokeStyle = OUT; g.lineWidth = 3;
      if (kind === 'tank') {
        g.fillStyle = '#e63946'; roundRect(g, 0, h * 0.12, w, h * 0.1, 6); g.fill(); g.stroke();
        g.fillStyle = '#ddd'; g.fillRect(w * 0.1, h * 0.22, 8, h * 0.78); g.strokeRect(w * 0.1, h * 0.22, 8, h * 0.78);
        g.fillStyle = '#3a86ff'; roundRect(g, w * 0.18, h * 0.6, w * 0.14, h * 0.4, 5); g.fill(); g.stroke();
        g.font = Math.round(h * 0.09) + 'px serif'; g.textAlign = 'center'; g.fillText('⛽', w * 0.25, h * 0.75);
      }
      const bx = kind === 'tank' ? w * 0.38 : 4, bw = kind === 'tank' ? w * 0.6 : w - 8;
      const glass = kind === 'glass';
      g.fillStyle = glass ? '#f2efe9' : col;
      roundRect(g, bx, bodyTop, bw, h - bodyTop, 6); g.fill(); g.stroke();
      // Schattenkante (Cel)
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(bx + bw - 12, bodyTop + 3, 9, h - bodyTop - 4);
      if (!glass && kind !== 'tank') {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 2; i++) {
          g.fillStyle = night ? 'rgba(255,214,120,0.95)' : 'rgba(210,240,255,0.95)';
          roundRect(g, bx + bw * (0.12 + i * 0.44), bodyTop + h * 0.06, bw * 0.3, h * 0.13, 4); g.fill(); g.stroke();
        }
      }
      const signY = glass ? bodyTop + h * 0.08 : bodyTop + h * 0.27;
      const signBg = glass ? col : night ? '#1b1035' : '#fff';
      const signFg = glass ? '#fff' : night ? '#ffe45e' : OUT;
      this.sign(g, name, bx + bw / 2, signY, bw * 0.86, h * 0.11, signBg, signFg);
      if (night && !glass) this.glow(g, bx + bw / 2, signY, bw * 0.5, 'rgba(255,228,94,0.22)');
      // Markise
      const awY = signY + h * 0.08;
      if (!glass) {
        const n = 6, sw = bw / n;
        for (let i = 0; i < n; i++) {
          g.fillStyle = i % 2 ? '#fff' : col2;
          g.beginPath(); g.moveTo(bx + i * sw, awY); g.lineTo(bx + (i + 1) * sw, awY); g.lineTo(bx + (i + 1) * sw + 4, awY + h * 0.08);
          g.quadraticCurveTo(bx + (i + 0.5) * sw, awY + h * 0.12, bx + i * sw - 4, awY + h * 0.08); g.closePath(); g.fill(); g.stroke();
        }
      }
      // Schaufenster + Tür
      const winY = awY + h * (glass ? 0.06 : 0.13), winH = h - winY - 4;
      g.fillStyle = night ? '#ffe7a8' : '#bfe6ff';
      roundRect(g, bx + bw * 0.08, winY, bw * 0.52, winH * 0.8, 4); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.moveTo(bx + bw * 0.12, winY + 4); g.lineTo(bx + bw * 0.24, winY + 4); g.lineTo(bx + bw * 0.12, winY + winH * 0.5); g.closePath(); g.fill();
      g.font = Math.round(Math.min(bw * 0.2, h * 0.14)) + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(SHOP_EMO[name] || '🛍️', bx + bw * 0.34, winY + winH * 0.45);
      g.fillStyle = glass ? col : '#6d4c41';
      roundRect(g, bx + bw * 0.66, winY + winH * 0.08, bw * 0.26, winH * 0.92, 4); g.fill(); g.stroke();
      g.fillStyle = '#ffd166'; g.beginPath(); g.arc(bx + bw * 0.7, winY + winH * 0.55, 3, 0, Math.PI * 2); g.fill();
      if (name === 'SCHULE') { g.fillStyle = '#fff'; g.beginPath(); g.arc(bx + bw / 2, bodyTop + h * 0.02 + 14, 12, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(bx + bw / 2, bodyTop + 14 + h * 0.02); g.lineTo(bx + bw / 2 + 6, bodyTop + 8 + h * 0.02); g.stroke(); }
      return { c, w, h, kind };
    },

    makeShelf(h, idx) {
      const w = Math.round(h * 0.95);
      const { c, g } = this.canvas(w, h);
      g.strokeStyle = OUT; g.lineWidth = 3;
      g.fillStyle = '#dfe4ea'; roundRect(g, 2, h * 0.08, w - 4, h * 0.92, 4); g.fill(); g.stroke();
      const signs = ['SÜSSIGKEITEN', 'GETRÄNKE', 'FLEISCH', 'TIEFKÜHL', 'CHIPS', 'CEREALIEN', 'SOSSEN', 'BACKWAREN'];
      this.sign(g, signs[(idx * 3 + U.randInt(0, 7)) % signs.length], w / 2, h * 0.035, w * 0.8, h * 0.07, '#ff3b5c', '#fff');
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const y = h * 0.12 + r * (h * 0.22);
        let x = 10;
        while (x < w - 20) {
          const pw = U.rand(14, 28), ph = U.rand(0.1, 0.17) * h;
          g.fillStyle = U.pick(SHOP_COLORS);
          roundRect(g, x, y + h * 0.18 - ph, pw, ph, 3); g.fill();
          g.lineWidth = 2; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 3, y + h * 0.18 - ph * 0.6, pw - 6, ph * 0.2);
          x += pw + 3;
        }
        g.fillStyle = '#b8c0cc'; g.lineWidth = 3; g.fillRect(4, y + h * 0.18, w - 8, 8); g.strokeRect(4, y + h * 0.18, w - 8, 8);
        g.fillStyle = '#ffe45e'; g.fillRect(w * U.rand(0.2, 0.7), y + h * 0.18 + 1, 22, 6);
      }
      return { c, w, h, kind: 'shelf' };
    },

    sign(g, text, cx, cy, maxW, h, bg, fg) {
      g.save();
      g.strokeStyle = OUT; g.lineWidth = 3; g.fillStyle = bg;
      let fs = Math.round(h * 0.72);
      g.font = fs + "px 'Lilita One', 'Arial Black', sans-serif";
      let tw = g.measureText(text).width;
      while (tw > maxW - 14 && fs > 8) { fs--; g.font = fs + "px 'Lilita One', 'Arial Black', sans-serif"; tw = g.measureText(text).width; }
      const w = Math.min(maxW, tw + 22);
      roundRect(g, cx - w / 2, cy - h / 2, w, h, 6); g.fill(); g.stroke();
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cx, cy + 1);
      g.restore();
    },

    glow(g, x, y, r, col) {
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    },

    /* ---------- NPCs, die herumlaufen ---------- */
    makeWalker(x) {
      const skins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#6b4423'];
      const kind = this.scene === 'shelves' ? 'cart' : this.area && this.area.id === 'airport' ? 'suitcase' : U.chance(0.2) ? 'bag' : 'walker';
      return {
        x, dir: U.chance(0.5) ? 1 : -1, v: U.rand(18, 42), ph: Math.random() * 6,
        s: U.rand(0.85, 1.12), skin: U.pick(skins), shirt: U.pick(SHOP_COLORS), pants: U.pick(['#2b2d42', '#3d405b', '#5a189a', '#264653', '#6d4c41']),
        hair: U.pick(['#2b1b0e', '#5a3825', '#111', '#d4a373', '#f4f1de', '#8b2e16']), hat: U.chance(0.18), kind,
        talk: 0, lane: U.rand(0, 1),
      };
    },

    drawWalker(p, y) {
      const g = this.g;
      const s = (this.h * 0.12) * p.s;
      const sw = Math.sin(p.ph) * 0.5;
      g.save();
      g.translate(p.x, y + p.lane * this.h * 0.03);
      g.scale(p.dir, 1);
      g.lineWidth = 2.5; g.strokeStyle = OUT; g.lineCap = 'round';
      // Schatten
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, 0, s * 0.28, s * 0.06, 0, 0, Math.PI * 2); g.fill();
      // Beine
      g.strokeStyle = p.pants; g.lineWidth = s * 0.1;
      g.beginPath(); g.moveTo(-s * 0.06, -s * 0.36); g.lineTo(-s * 0.06 + sw * s * 0.18, 0); g.stroke();
      g.beginPath(); g.moveTo(s * 0.06, -s * 0.36); g.lineTo(s * 0.06 - sw * s * 0.18, 0); g.stroke();
      // Körper
      g.fillStyle = p.shirt; g.strokeStyle = OUT; g.lineWidth = 2.5;
      roundRect(g, -s * 0.16, -s * 0.74, s * 0.32, s * 0.42, s * 0.1); g.fill(); g.stroke();
      // Accessoires
      if (p.kind === 'cart') {
        g.strokeStyle = '#8d99ae'; g.lineWidth = 3;
        g.strokeRect(s * 0.25, -s * 0.5, s * 0.45, s * 0.3);
        g.beginPath(); g.moveTo(s * 0.2, -s * 0.55); g.lineTo(s * 0.25, -s * 0.5); g.stroke();
        g.fillStyle = OUT; g.beginPath(); g.arc(s * 0.32, -s * 0.12, s * 0.05, 0, 7); g.arc(s * 0.62, -s * 0.12, s * 0.05, 0, 7); g.fill();
        g.font = Math.round(s * 0.22) + 'px serif'; g.fillText('🥖', s * 0.3, -s * 0.46);
      } else if (p.kind === 'suitcase') {
        g.fillStyle = '#ffb703'; g.strokeStyle = OUT; roundRect(g, -s * 0.5, -s * 0.34, s * 0.26, s * 0.3, 4); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-s * 0.37, -s * 0.34); g.lineTo(-s * 0.2, -s * 0.55); g.stroke();
      } else if (p.kind === 'bag') {
        g.fillStyle = '#fefae0'; g.strokeStyle = OUT; roundRect(g, s * 0.14, -s * 0.5, s * 0.2, s * 0.24, 3); g.fill(); g.stroke();
        g.font = Math.round(s * 0.12) + 'px serif'; g.fillText('🥬', s * 0.16, -s * 0.44);
      }
      // Arm
      g.strokeStyle = p.skin; g.lineWidth = s * 0.08;
      g.beginPath(); g.moveTo(0, -s * 0.66); g.lineTo(sw * s * 0.2 + s * 0.05, -s * 0.42); g.stroke();
      // Kopf
      g.fillStyle = p.skin; g.strokeStyle = OUT; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, -s * 0.9, s * 0.17, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = p.hair;
      g.beginPath(); g.arc(0, -s * 0.94, s * 0.17, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      if (p.hat) { g.fillStyle = p.shirt; g.fillRect(-s * 0.17, -s * 1.1, s * 0.34, s * 0.08); g.fillRect(0, -s * 1.06, s * 0.26, s * 0.04); }
      // große Cartoon-Augen
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s * 0.06, -s * 0.91, s * 0.055, 0, 7); g.arc(s * 0.15, -s * 0.91, s * 0.045, 0, 7); g.fill();
      g.fillStyle = OUT;
      g.beginPath(); g.arc(s * 0.08, -s * 0.9, s * 0.025, 0, 7); g.arc(s * 0.165, -s * 0.9, s * 0.022, 0, 7); g.fill();
      g.beginPath(); g.lineWidth = 2; g.arc(s * 0.1, -s * 0.84, s * 0.05, 0.2, Math.PI - 0.2); g.stroke();
      g.restore();
      if (p.talk > 0) {
        g.save();
        g.font = "bold 12px 'Nunito', sans-serif";
        const txt = p.say || '…';
        const tw = g.measureText(txt).width + 14;
        const bx = U.clamp(p.x - tw / 2, 4, this.w - tw - 4), by = y - s * 1.35 - 20;
        g.fillStyle = '#fff'; g.strokeStyle = OUT; g.lineWidth = 2;
        roundRect(g, bx, by, tw, 20, 8); g.fill(); g.stroke();
        g.fillStyle = OUT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, bx + tw / 2, by + 10);
        g.restore();
      }
    },

    drawBus(b, y) {
      const g = this.g;
      const L = this.h * 0.42, H = this.h * 0.15;
      g.save();
      g.translate(b.x, y);
      g.strokeStyle = OUT; g.lineWidth = 3;
      g.fillStyle = b.col; roundRect(g, 0, -H, L, H * 0.88, 12); g.fill(); g.stroke();
      g.fillStyle = '#bde0fe';
      for (let i = 0; i < 5; i++) { roundRect(g, 12 + i * L * 0.18, -H * 0.86, L * 0.14, H * 0.34, 4); g.fill(); g.stroke(); }
      g.fillStyle = '#fff'; g.font = "bold " + Math.round(H * 0.16) + "px 'Lilita One', sans-serif"; g.textBaseline = 'middle';
      g.fillText(b.text, 14, -H * 0.3);
      g.fillStyle = OUT;
      [L * 0.18, L * 0.8].forEach((x) => { g.beginPath(); g.arc(x, -H * 0.1, H * 0.14, 0, 7); g.fill(); });
      g.restore();
    },

    /* ---------- Öffentliche Steuerung ---------- */
    spawnBus() {
      if (this.scene !== 'street' || this.bus) return;
      this.bus = { x: -this.h * 0.45, col: U.pick(['#ffbe0b', '#e63946', '#3a86ff']), text: U.pick(['LINIE 17 → DÖNER', 'NACHT-EXPRESS', 'ZUM SUPERMARKT', 'NICHT EINSTEIGEN']) };
    },
    flyPackage() {
      if (this.flyers.length > 12) return;
      this.flyers.push({ x: U.chance(0.5) ? -40 : this.w + 40, y: U.rand(0.1, 0.5) * this.groundY, vx: 0, vy: U.rand(-30, 30), r: 0, vr: U.rand(-4, 4), e: U.pick(['📦', '🥫', '🍬', '🧃', '🍫', '🥤', '🍟']), s: U.rand(22, 40) });
      const f = this.flyers[this.flyers.length - 1];
      f.vx = (f.x < 0 ? 1 : -1) * U.rand(220, 420);
    },
    npcSay(text) {
      const p = U.pick(this.walkers);
      if (p) { p.talk = 2.2; p.say = text; }
    },
    setScan(v) { this.scan = v ? 1 : 0; },
    setOverview(v) { this.overviewTarget = v ? 1 : 0; },

    /* ---------- Frame ---------- */
    frame(dt) {
      if (!this.area) return;
      const g = this.g;
      this.t += dt;
      const moving = !this.reduce;
      if (moving) this.x += this.speed * dt;
      this.overview += (this.overviewTarget - this.overview) * Math.min(1, dt * 3);
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const Wd = this.w, Hd = this.h, gy = this.groundY;

      // Himmel
      g.fillStyle = this.skyGrad; g.fillRect(0, 0, Wd, gy);
      if (this.stars.length) {
        g.fillStyle = '#fff';
        for (const s of this.stars) { g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 2 + s.p); g.fillRect(s.x * Wd, s.y * gy, s.r, s.r); }
        g.globalAlpha = 1;
      }
      if (this.scene === 'street') {
        const sunX = Wd * 0.78, sunY = gy * (this.time === 'sunset' ? 0.55 : 0.22);
        const R = Math.min(60, Wd * 0.06 + 20);
        if (this.time === 'ramadan') {
          const glow = g.createRadialGradient(sunX, sunY, R * 0.4, sunX, sunY, R * 2.6);
          glow.addColorStop(0, 'rgba(255,236,170,0.35)'); glow.addColorStop(1, 'rgba(255,236,170,0)');
          g.fillStyle = glow; g.fillRect(sunX - R * 3, sunY - R * 3, R * 6, R * 6);
          g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(sunX, sunY, R, 0, 7); g.fill();
          g.fillStyle = this.skyGrad; g.beginPath(); g.arc(sunX + R * 0.42, sunY - R * 0.22, R * 0.86, 0, 7); g.fill();
          g.fillStyle = '#fff1b8'; this.star(g, sunX - R * 0.1, sunY - R * 0.05, R * 0.2);
        } else {
          g.fillStyle = this.time === 'night' ? '#fff6d5' : this.time === 'apocalypse' ? '#ff3b3b' : '#ffe066';
          g.beginPath(); g.arc(sunX, sunY, R, 0, 7); g.fill();
        }
        for (const c of this.clouds) {
          c.x += c.v * dt * (moving ? 1 : 0);
          if (c.x > Wd + 120) c.x = -120;
          this.cloud(c.x, c.y, c.s);
        }
      }
      // Skyline / Fenster
      if (this.skyline) {
        const sk = this.skyline;
        const par = this.scene === 'street' ? 0.25 : 0.5;
        let ox = -((this.x * par) % sk.w);
        const y = this.scene === 'street' ? gy - sk.h : 0;
        for (let x = ox; x < Wd; x += sk.w) g.drawImage(sk.c, x, y, sk.w, sk.h);
      } else if (this.scene === 'shelves') {
        g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, Wd, gy);
        g.fillStyle = '#fffbe8';
        for (let x = -((this.x * 0.5) % 160); x < Wd; x += 160) g.fillRect(x, 10, 90, 10);
        g.fillStyle = 'rgba(255,59,92,0.9)';
      }
      // Lampions (Nachtmarkt)
      if (this.lanterns) {
        g.strokeStyle = '#2b2150'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, gy * 0.18);
        for (let x = 0; x <= Wd; x += 40) g.lineTo(x, gy * 0.18 + Math.sin(x * 0.02) * 12);
        g.stroke();
        for (let x = -((this.x * 0.6) % 80); x < Wd; x += 80) {
          const yy = gy * 0.18 + Math.sin(x * 0.02) * 12 + 14;
          g.fillStyle = 'rgba(255,80,80,0.25)'; g.beginPath(); g.arc(x, yy, 22, 0, 7); g.fill();
          g.fillStyle = '#ff4d4d'; g.beginPath(); g.ellipse(x, yy, 10, 13, 0, 0, 7); g.fill();
          g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
        }
      }
      if (this.fanous) this.drawFanous();
      if (this.rush && !this.reduce && Math.random() < dt * 7) {
        this.flyers.push({ x: Math.random() * Wd, y: -30, vx: U.rand(-20, 20), vy: U.rand(120, 220), r: 0, vr: U.rand(-2, 2), e: U.pick(['🌙', '⭐', '✨', '🌟']), s: U.rand(20, 34), fall: true });
      }
      // Fliegende Pakete (hinten)
      for (let i = this.flyers.length - 1; i >= 0; i--) {
        const f = this.flyers[i];
        f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
        if (f.x < -80 || f.x > Wd + 80 || f.y > Hd + 60) { this.flyers.splice(i, 1); continue; }
        g.save(); g.translate(f.x, f.y); g.rotate(f.r); g.font = f.s + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.e, 0, 0); g.restore();
      }
      // Läden
      const lx = this.x % this.layoutW;
      for (const L of this.layout) {
        let x = L.x - lx;
        if (x + L.s.w < -50) x += this.layoutW;
        if (x > Wd + 50) continue;
        if (x + L.s.w < -50) continue;
        g.drawImage(L.s.c, x, gy - L.s.h, L.s.w, L.s.h);
      }
      // Boden
      if (this.scene === 'street') {
        const sideH = Hd * 0.07;
        g.fillStyle = this.time === 'night' || this.time === 'ramadan' ? '#4b4470' : this.time === 'apocalypse' ? '#4a2336' : '#cfc8dc';
        g.fillRect(0, gy, Wd, sideH);
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
        for (let x = -(this.x % 60); x < Wd; x += 60) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x - 20, gy + sideH); g.stroke(); }
        g.fillStyle = '#8e8aa3'; g.fillRect(0, gy + sideH, Wd, 6);
        g.fillStyle = this.time === 'night' || this.time === 'ramadan' ? '#241f3d' : this.time === 'apocalypse' ? '#2a1020' : '#3d3a4b';
        g.fillRect(0, gy + sideH + 6, Wd, Hd - gy - sideH - 6);
        g.fillStyle = '#ffe066';
        const ly = gy + sideH + (Hd - gy - sideH) * 0.45;
        for (let x = -((this.x * 1.4) % 90); x < Wd; x += 90) g.fillRect(x, ly, 46, 6);
      } else {
        g.fillStyle = this.scene === 'shelves' ? '#d8d2c4' : '#cfd6de';
        g.fillRect(0, gy, Wd, Hd - gy);
        g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2;
        for (let y = gy + 20, k = 0; y < Hd; y += 22 + k * 6, k++) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd, y); g.stroke(); }
        for (let x = -(this.x % 70); x < Wd; x += 70) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + (x - Wd / 2) * 0.6, Hd); g.stroke(); }
      }
      // Passanten
      const wy = gy + Hd * 0.045;
      for (const p of this.walkers) {
        p.ph += dt * p.v * 0.18;
        p.x += (p.dir * p.v - (moving ? this.speed : 0)) * dt;
        if (p.talk > 0) p.talk -= dt;
        if (p.x < -60) { Object.assign(p, this.makeWalker(Wd + 50)); p.dir = -1; }
        else if (p.x > Wd + 60) { Object.assign(p, this.makeWalker(-50)); p.dir = 1; }
        this.drawWalker(p, wy);
      }
      // Bus
      if (this.bus) {
        this.bus.x += (this.h * 0.9) * dt;
        this.drawBus(this.bus, Hd * 0.97);
        if (this.bus.x > Wd + 40) this.bus = null;
      }
      // Überhitzung / Apocalypse-Glühen
      if (this.time === 'apocalypse' || this.overheat > 0) {
        const a = this.time === 'apocalypse' ? 0.12 + 0.06 * Math.sin(this.t * 3) : 0;
        g.fillStyle = 'rgba(255,40,40,' + (a + this.overheat * 0.2).toFixed(3) + ')';
        g.fillRect(0, 0, Wd, Hd);
      }
      if (this.scan) this.drawScan();
      if (this.overview > 0.01) this.drawOverview();
    },

    /* ---------- Ramadan-Deko ---------- */
    star(g, x, y, r) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
    },

    /** Fanous-Laterne als wiederverwendetes Sprite */
    makeLantern(col) {
      const w = 34, h = 64;
      const { c, g } = this.canvas(w + 24, h + 24);
      const ox = 12, oy = 12;
      const glow = g.createRadialGradient(ox + w / 2, oy + h * 0.55, 2, ox + w / 2, oy + h * 0.55, 30);
      glow.addColorStop(0, 'rgba(255,220,140,0.55)'); glow.addColorStop(1, 'rgba(255,220,140,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w + 24, h + 24);
      g.translate(ox, oy);
      g.lineJoin = 'round';
      g.strokeStyle = OUT; g.lineWidth = 2;
      // Ring & Kappe
      g.strokeStyle = '#d4a017'; g.lineWidth = 2.5; g.beginPath(); g.arc(w / 2, 4, 3.5, 0, 7); g.stroke();
      g.fillStyle = '#d4a017'; g.strokeStyle = OUT; g.lineWidth = 2;
      g.beginPath(); g.moveTo(w * 0.22, 18); g.quadraticCurveTo(w / 2, 2, w * 0.78, 18); g.closePath(); g.fill(); g.stroke();
      // Glas-Körper
      g.beginPath();
      g.moveTo(w * 0.22, 18); g.lineTo(w * 0.78, 18); g.lineTo(w, h * 0.5); g.lineTo(w * 0.72, h - 12); g.lineTo(w * 0.28, h - 12); g.lineTo(0, h * 0.5); g.closePath();
      g.fillStyle = col; g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,220,0.55)';
      g.beginPath(); g.moveTo(w * 0.36, 22); g.lineTo(w * 0.5, 22); g.lineTo(w * 0.46, h - 16); g.lineTo(w * 0.4, h - 16); g.closePath(); g.fill();
      g.strokeStyle = '#d4a017'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(w * 0.5, 18); g.lineTo(w * 0.5, h - 12); g.moveTo(w * 0.22, 18); g.lineTo(w * 0.28, h - 12); g.moveTo(w * 0.78, 18); g.lineTo(w * 0.72, h - 12); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w * 0.22, 18); g.lineTo(w * 0.78, 18); g.lineTo(w, h * 0.5); g.lineTo(w * 0.72, h - 12); g.lineTo(w * 0.28, h - 12); g.lineTo(0, h * 0.5); g.closePath(); g.stroke();
      // Boden & Spitze
      g.fillStyle = '#d4a017';
      g.beginPath(); g.moveTo(w * 0.28, h - 12); g.lineTo(w * 0.72, h - 12); g.lineTo(w * 0.5, h - 2); g.closePath(); g.fill(); g.stroke();
      return { c, w: w + 24, h: h + 24 };
    },

    makeRamadanSign() {
      const w = 250, h = 52;
      const { c, g } = this.canvas(w, h + 16);
      g.strokeStyle = '#d4a017'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(24, 0); g.lineTo(34, 16); g.moveTo(w - 24, 0); g.lineTo(w - 34, 16); g.stroke();
      g.fillStyle = '#0f5132'; g.strokeStyle = OUT; g.lineWidth = 3;
      roundRect(g, 4, 14, w - 8, h - 2, 10); g.fill(); g.stroke();
      g.strokeStyle = '#d4a017'; g.lineWidth = 2; roundRect(g, 10, 20, w - 20, h - 14, 7); g.stroke();
      g.fillStyle = '#ffd166'; g.font = "22px 'Lilita One', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('RAMADAN KAREEM', w / 2 + 8, 14 + h / 2);
      g.font = '20px serif'; g.fillText('🌙', 26, 14 + h / 2);
      return { c, w, h: h + 16 };
    },

    drawFanous() {
      const g = this.g, Wd = this.w, gy = this.groundY;
      const y0 = Math.max(18, gy * 0.1);
      // Leine
      g.strokeStyle = 'rgba(212,160,23,0.85)'; g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= Wd; x += 20) {
        const yy = y0 + Math.abs(Math.sin((x / Wd) * Math.PI * 3)) * 26;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.stroke();
      // Lichterkette
      for (let x = 10, i = 0; x < Wd; x += 26, i++) {
        const yy = y0 + Math.abs(Math.sin((x / Wd) * Math.PI * 3)) * 26 + 3;
        g.fillStyle = (i + Math.floor(this.t * 3)) % 3 ? 'rgba(255,230,150,0.95)' : 'rgba(255,255,255,0.35)';
        g.beginPath(); g.arc(x, yy, 2.4, 0, 7); g.fill();
      }
      // Laternen
      const n = Math.max(3, Math.floor(Wd / 130));
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * Wd;
        const yy = y0 + Math.abs(Math.sin((x / Wd) * Math.PI * 3)) * 26;
        const sp = this.lanternSprites[i % this.lanternSprites.length];
        if (!sp) continue;
        g.save();
        g.translate(x, yy);
        g.rotate(this.reduce ? 0 : Math.sin(this.t * 1.6 + i) * 0.08);
        g.drawImage(sp.c, -sp.w / 2, -8, sp.w, sp.h);
        g.restore();
      }
      // Banner in der Mitte (nur draußen)
      if (this.ramadanSign && this.scene === 'street') {
        const s = this.ramadanSign;
        const sw = Math.min(s.w, Wd * 0.6), sh = s.h * (sw / s.w);
        g.save();
        g.translate(Wd / 2, y0 + 30);
        g.rotate(this.reduce ? 0 : Math.sin(this.t * 1.1) * 0.02);
        g.drawImage(s.c, -sw / 2, 0, sw, sh);
        g.restore();
      }
    },

    cloud(x, y, s) {
      const g = this.g;
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.arc(x, y, 22 * s, 0, 7); g.arc(x + 24 * s, y - 10 * s, 26 * s, 0, 7); g.arc(x + 52 * s, y, 20 * s, 0, 7); g.arc(x + 26 * s, y + 6 * s, 22 * s, 0, 7);
      g.fill();
    },

    drawScan() {
      const g = this.g, Wd = this.w, Hd = this.h;
      const p = (this.t * 0.6) % 1;
      const y = p * Hd;
      const gr = g.createLinearGradient(0, y - 60, 0, y + 4);
      gr.addColorStop(0, 'rgba(61,255,139,0)'); gr.addColorStop(1, 'rgba(61,255,139,0.35)');
      g.fillStyle = gr; g.fillRect(0, y - 60, Wd, 64);
      g.fillStyle = 'rgba(61,255,139,0.9)'; g.fillRect(0, y, Wd, 2);
      g.strokeStyle = 'rgba(61,255,139,0.12)'; g.lineWidth = 1;
      for (let x = 0; x < Wd; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hd); g.stroke(); }
      for (let yy = 0; yy < Hd; yy += 40) { g.beginPath(); g.moveTo(0, yy); g.lineTo(Wd, yy); g.stroke(); }
    },

    /* Combo 100: Kamera zoomt heraus, die ganze Stadt wird gescannt */
    drawOverview() {
      const g = this.g, Wd = this.w, Hd = this.h, k = this.overview;
      g.fillStyle = 'rgba(10,6,30,' + (0.82 * k).toFixed(3) + ')';
      g.fillRect(0, 0, Wd, Hd);
      const names = [['SUPERMARKT', '🛒'], ['DÖNERLADEN', '🥙'], ['RESTAURANT', '🍝'], ['KIOSK', '🍬'], ['FOOD TRUCK', '🚚']];
      const cx = Wd / 2, cy = Hd * 0.24;
      const wide = Wd >= 640;
      const span = Math.min(Wd, wide ? 900 : 520);
      g.globalAlpha = k;
      names.forEach(([n, e], i) => {
        // Handy: 3 oben + 2 unten, Desktop: eine Reihe mit 5 Gebäuden
        const row = wide ? 0 : i < 3 ? 0 : 1;
        const inRow = wide ? 5 : row === 0 ? 3 : 2;
        const col = wide ? i : row === 0 ? i : i - 3;
        const bx = cx - span / 2 + (span / inRow) * (col + 0.5);
        const by = Hd * (wide ? 0.66 : row === 0 ? 0.58 : 0.76);
        const on = (this.t * 1.6) % (names.length + 2) > i;
        g.strokeStyle = 'rgba(61,255,139,' + (0.3 + 0.5 * Math.abs(Math.sin(this.t * 6 + i))).toFixed(2) + ')';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(bx, by - 40); g.stroke();
        g.fillStyle = SHOP_COLORS[i]; g.strokeStyle = OUT;
        roundRect(g, bx - 46, by - 40, 92, 70, 8); g.fill(); g.stroke();
        g.font = '30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, bx, by - 8);
        g.font = "13px 'Lilita One', sans-serif"; g.fillStyle = '#fff'; g.fillText(n, bx, by + 20);
        if (on) { g.font = '24px serif'; g.fillText('✅', bx + 40, by - 38); }
      });
      g.fillStyle = 'rgba(61,255,139,0.35)';
      g.beginPath(); g.arc(cx, cy, 14 + Math.sin(this.t * 8) * 4, 0, 7); g.fill();
      g.globalAlpha = 1;
    },
  };

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  HHD.World = W;
  HHD.roundRect = roundRect;
})();
