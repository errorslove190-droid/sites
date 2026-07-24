/* Apex Structure — интерактив: меню, reveal, счётчики, калькулятор, 3D-тур */
(function () {
  'use strict';

  /* ---------- Шапка и мобильное меню ---------- */
  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  window.addEventListener('scroll', function () {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }, { passive: true });

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      nav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Появление блоков при скролле ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

  /* ---------- Счётчики чисел ---------- */
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    var start = null;
    var duration = 1400;
    el.textContent = target + suffix; // сразу финальное значение — анимация поверх
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countObserver.observe(el); });

  /* Страховка: если observer не сработал (старый WebView, фоновая вкладка) — показать всё */
  setTimeout(function () {
    if (!document.querySelector('.reveal.is-visible')) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
      document.querySelectorAll('[data-count]').forEach(function (el) {
        el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
    }
  }, 800);

  /* ---------- Калькулятор стоимости ---------- */
  var form = document.getElementById('calcForm');
  var areaInput = document.getElementById('calcArea');
  var areaOut = document.getElementById('calcAreaOut');
  var priceEl = document.getElementById('calcPrice');
  var metaEl = document.getElementById('calcMeta');

  var BASE = { frame: 78000, monolith: 105000 };       // ₽/м² за технологию
  var STYLE_K = { barn: 1, hitech: 1.12 };             // коэффициент архитектуры
  var FLOORS_K = { 1: 1.05, 2: 1 };                    // 1 этаж дороже за м²
  var OPT_PER_M2 = { smart: 7900, glass: 6500, floor: 2900 };
  var OPT_FIXED = { pump: 1850000, solar: 1250000 };

  var shownPrice = 0;
  var priceAnim = null;

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function calcTotal() {
    var area = parseInt(areaInput.value, 10);
    var tech = form.elements.tech.value;
    var style = form.elements.style.value;
    var floors = form.elements.floors.value;
    var perM2 = BASE[tech] * STYLE_K[style] * FLOORS_K[floors];
    var total = perM2 * area;
    form.querySelectorAll('input[name="opt"]:checked').forEach(function (opt) {
      if (OPT_PER_M2[opt.value]) total += OPT_PER_M2[opt.value] * area;
      if (OPT_FIXED[opt.value]) total += OPT_FIXED[opt.value];
    });
    return { total: total, perM2: total / area };
  }

  function renderPrice() {
    var res = calcTotal();
    var from = shownPrice;
    var to = res.total;
    shownPrice = to;
    if (priceAnim) cancelAnimationFrame(priceAnim);
    priceEl.textContent = fmt(to); // сразу финальное значение — анимация поверх
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 500, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      priceEl.textContent = fmt(from + (to - from) * eased);
      if (p < 1) priceAnim = requestAnimationFrame(tick);
    }
    priceAnim = requestAnimationFrame(tick);
    metaEl.textContent = '≈ ' + fmt(res.perM2) + ' ₽ за м²';
    areaOut.textContent = areaInput.value;
    var fill = ((areaInput.value - areaInput.min) / (areaInput.max - areaInput.min)) * 100;
    areaInput.style.setProperty('--fill', fill + '%');
  }

  form.addEventListener('input', renderPrice);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  renderPrice();

  /* ---------- 3D-тур: перетаскиваемая панорама ---------- */
  var viewport = document.getElementById('tourViewport');
  var scene = document.getElementById('tourScene');
  var hint = document.getElementById('tourHint');

  var sceneW = 2600;
  var offset = 0;
  var dragging = false;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var autoDrift = true;
  var driftDir = -1;
  var lastTs = null;

  function maxOffset() {
    return Math.min(0, viewport.clientWidth - sceneW);
  }

  function apply() {
    offset = Math.max(maxOffset(), Math.min(0, offset));
    scene.style.transform = 'translateX(' + offset + 'px)';
  }

  function loop(ts) {
    if (autoDrift && !dragging) {
      if (lastTs) {
        offset += driftDir * (ts - lastTs) * 0.018;
        if (offset <= maxOffset()) driftDir = 1;
        if (offset >= 0) driftDir = -1;
        apply();
      }
    }
    lastTs = ts;
    requestAnimationFrame(loop);
  }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) autoDrift = false;
  requestAnimationFrame(loop);

  viewport.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.tour__spot')) return;
    dragging = true;
    autoDrift = false;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    viewport.classList.add('is-dragging');
    hint.classList.add('is-hidden');
    try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    offset = dragStartOffset + (e.clientX - dragStartX);
    apply();
  });
  function endDrag() {
    dragging = false;
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', apply);

  /* тап по хотспоту на тач-экране — показать подсказку */
  document.querySelectorAll('.tour__spot').forEach(function (spot) {
    spot.addEventListener('click', function (e) {
      e.stopPropagation();
      spot.focus();
    });
  });
})();
