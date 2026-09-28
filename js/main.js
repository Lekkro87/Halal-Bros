/* Halal Haram Detector – Start & Haupt-Loop */
(function () {
  'use strict';
  const HHD = window.HHD;

  const MENU_SCREENS = ['map', 'shop', 'board', 'settings', 'help'];

  function boot(restored) {
    HHD.Store.load();
    if (HHD.Store.fresh && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      HHD.Store.settings.reduceMotion = true;
    }
    HHD.World.reduce = HHD.Store.settings.reduceMotion;
    HHD.World.init(document.getElementById('world-canvas'));
    HHD.FX.init(document.getElementById('fx-canvas'));
    HHD.Game.init();
    HHD.Duel.init();
    HHD.UI.init();

    // Audio darf erst nach einer Nutzer-Geste starten
    const unlock = () => {
      HHD.Audio.unlock();
      if (HHD.UI.screen === 'start' && !HHD.Audio.music.playing) HHD.Audio.music.start('menu');
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        HHD.Game.pause();
        HHD.Audio.suspend();
      } else {
        HHD.Audio.resume();
      }
    });

    let last = performance.now();
    function loop(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1; // nach Tab-Wechsel keine Riesensprünge
      if (dt < 0) dt = 0;
      HHD.World.frame(dt);
      HHD.Game.update(dt);
      HHD.Duel.update(dt);
      HHD.UI.update(dt);
      HHD.FX.frame(dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) { /* z. B. in eingebetteten Frames nicht erlaubt – Spiel läuft trotzdem */ }
    document.body.classList.add('ready');
    // Nach einem Update der gehosteten Seite im selben Menü weitermachen (Fortschritt liegt ohnehin im localStorage)
    if (restored && MENU_SCREENS.includes(restored.screen)) HHD.UI.show(restored.screen);
  }

  // Start – optional über den Hot-Reload-Hook einer Hosting-Umgebung (fehlt er, wird direkt gestartet)
  let started = false;
  function start(data) {
    if (started) return;
    started = true;
    boot(data || {});
  }
  function go() {
    const hot = window.claude && window.claude.hot;
    try {
      if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ screen: HHD.UI ? HHD.UI.screen : 'start' }));
      if (hot && typeof hot.ready === 'function') {
        hot.ready(start);
        setTimeout(() => start({}), 1500); // Sicherheitsnetz
      } else {
        start((hot && hot.data) || {});
      }
    } catch (e) {
      start({});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
