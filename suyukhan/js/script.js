/* Суюхан — портфолио. Ваниль, без библиотек. */

(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- таймкод в шоуриле ---------- */
  var tc = document.getElementById('tc');
  if (tc && !calm) {
    var f = 0;
    setInterval(function () {
      f = (f + 1) % (24 * 60 * 60);
      var s = Math.floor(f / 24), fr = f % 24;
      var pad = function (n) { return String(n).padStart(2, '0'); };
      tc.textContent = '00:' + pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(fr);
    }, 1000 / 24);
  }

  /* ---------- «плейхед»: линия идёт за курсором по превью ---------- */
  document.querySelectorAll('.work').forEach(function (w) {
    w.addEventListener('mousemove', function (e) {
      var r = w.getBoundingClientRect();
      w.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100) + '%');
    });
  });

  /* ---------- плеер ---------- */
  var player = document.getElementById('player');
  var box = document.getElementById('playerBox');

  function open(url) {
    box.innerHTML = '<iframe src="' + url + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen title="Видео"></iframe>';
    player.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    player.hidden = true;
    box.innerHTML = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-embed]').forEach(function (el) {
    el.addEventListener('click', function () {
      var url = el.getAttribute('data-embed');
      if (url) { open(url); return; }
      // слот ещё пустой — коротко подсказываем, что сюда нужна ссылка
      el.classList.remove('slot--empty');
      void el.offsetWidth;
      el.classList.add('slot--empty');
    });
  });

  player.querySelector('.player__close').addEventListener('click', close);
  player.addEventListener('click', function (e) { if (e.target === player) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !player.hidden) close(); });

  /* ---------- появление секций ---------- */
  var rise = document.querySelectorAll('.sec__head, .work, .services li, .steps li, .reel, .cta h2, .cta p, .cta__row');
  rise.forEach(function (el) { el.classList.add('rise'); });

  if (!('IntersectionObserver' in window) || calm) {
    rise.forEach(function (el) { el.classList.add('on'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    rise.forEach(function (el) { io.observe(el); });

    // страховка: если наблюдатель почему-то не сработал — показать всё, а не пустой экран
    setTimeout(function () {
      if (!document.querySelector('.rise.on')) rise.forEach(function (el) { el.classList.add('on'); });
    }, 3000);
  }
})();
