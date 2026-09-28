/* Halal Haram Detector – Start & Haupt-Loop */
(function () {
  'use strict';
  const HHD = window.HHD;

  function boot() {
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

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
