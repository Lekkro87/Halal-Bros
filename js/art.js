/* Halal Haram Detector – Darstellung von Produkten, Detector und NPCs (DOM/CSS) */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});
  const U = HHD.U;

  /** Erzeugt das Markup für ein Produkt (ohne Namensschild). */
  function itemArt(item, opts) {
    opts = opts || {};
    const a = item.art;
    if (a.t === 'emoji') {
      return '<div class="art art-emoji"><span class="emo">' + a.e + '</span></div>';
    }
    const style = '--c:' + a.c + ';--c2:' + (a.c2 || '#fff') + ';';
    let badge = '';
    if (a.badge) {
      const cls = /HALAL/.test(a.badge) ? 'b-halal' : /SCHWEIN/.test(a.badge) ? 'b-pork' : 'b-info';
      badge = '<span class="badge ' + cls + '">' + U.esc(a.badge) + '</span>';
    }
    const label = a.label || '';
    const isAr = /[؀-ۿ]/.test(label);
    const long = label.replace(/­/g, '').length > 11 ? ' long' : '';
    const extra = (a.tall ? ' tall' : '') + (a.stripes ? ' stripes' : '') + (a.mystery ? ' mystery' : '');
    return (
      '<div class="art pack pack-' + a.t + extra + '" style="' + style + '">' +
        '<div class="pk-body">' +
          '<span class="pk-brand">' + U.esc(a.brand || '') + '</span>' +
          '<span class="pk-pic">' + a.e + '</span>' +
          '<span class="pk-label' + long + (isAr ? ' ar' : '') + '"' + (isAr ? ' dir="rtl" lang="ar"' : '') + '>' + label + '</span>' +
        '</div>' + badge +
      '</div>'
    );
  }

  /** Komplettes Produkt-Element (wiederverwendbar über Pool). */
  const pool = [];
  function makeItemEl(item, cls) {
    const el = pool.pop() || document.createElement('div');
    el.className = 'item ' + (cls || '') + (item.legend ? ' legendary' : '');
    el.innerHTML =
      (item.legend ? '<div class="legend-tag">✦ LEGENDARY ✦</div>' : '') +
      '<div class="item-inner">' + itemArt(item) + '</div>' +
      '<div class="plate"></div>' +
      '<div class="nameplate">' + U.esc(item.name) + '</div>';
    el.style.cssText = '';
    return el;
  }
  function releaseItemEl(el) {
    if (!el) return;
    if (el.parentNode) el.parentNode.removeChild(el);
    el.innerHTML = '';
    if (pool.length < 12) pool.push(el);
  }

  /** Detector-Gerät (Markup), Skin wird per Klasse gesetzt */
  function detectorHTML(skin, compact) {
    const s = HHD.DATA.SKINS.find((k) => k.id === skin) || HHD.DATA.SKINS[0];
    return (
      '<div class="det skin-' + s.id + (compact ? ' compact' : '') + '" style="--laser:' + s.laser + '">' +
        '<div class="det-antenna"><i></i></div>' +
        '<div class="det-deco"></div>' +
        '<div class="det-body">' +
          '<div class="det-top"><span class="det-name">' + U.esc(s.device) + '</span><span class="det-leds"><i class="led g"></i><i class="led y"></i><i class="led r"></i></span></div>' +
          '<div class="det-screen"><span class="det-text">READY</span><span class="det-sub"></span></div>' +
          '<div class="det-bottom"><span class="det-grill"></span><span class="det-temp"><i></i></span></div>' +
        '</div>' +
        '<div class="det-handle"></div>' +
        '<div class="det-laser"></div>' +
      '</div>'
    );
  }

  function npcHTML(npcId, line) {
    const n = HHD.DATA.NPCS[npcId];
    if (!n) return '';
    return '<div class="npc-face">' + n.face + '</div><div class="npc-bubble"><small>' + U.esc(n.name) + '</small><span>' + U.esc(line) + '</span></div>';
  }

  HHD.Art = { itemArt, makeItemEl, releaseItemEl, detectorHTML, npcHTML };
})();
