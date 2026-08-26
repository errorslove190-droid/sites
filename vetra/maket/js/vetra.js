/* ============================================================
   Ветра — поведение макетов
   Всё интерактивное работает по наведению или фокусу, без кликов
   (кроме форм и вкладок, где клик неизбежен).
   Эффектов, привязанных к курсору, нет намеренно.
   ============================================================ */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Скруглённое выделение текста ---------------------- */
  // border-radius у ::selection не существует, поэтому прячем нативную
  // заливку и рисуем прямоугольники выделения сами.
  function softSelection() {
    var layer = document.createElement('div');
    layer.id = 'sel-layer';
    document.body.appendChild(layer);
    document.body.classList.add('soft-sel');
    var raf = null;

    function draw() {
      raf = null;
      layer.textContent = '';
      var sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      var sx = window.scrollX, sy = window.scrollY;
      for (var r = 0; r < sel.rangeCount; r++) {
        var rects = sel.getRangeAt(r).getClientRects();
        for (var i = 0; i < rects.length; i++) {
          var b = rects[i];
          if (b.width < 1 || b.height < 1) continue;
          var mark = document.createElement('i');
          mark.style.cssText = 'left:' + (b.left + sx - 3) + 'px;top:' + (b.top + sy - 2) +
            'px;width:' + (b.width + 6) + 'px;height:' + (b.height + 4) + 'px';
          // на тёмной секции выделение светлое
          var node = document.elementFromPoint(Math.min(b.left + 2, window.innerWidth - 2), b.top + b.height / 2);
          if (node && node.closest('.section-navy, .footer, .on-dark')) mark.className = 'dark';
          layer.appendChild(mark);
        }
      }
    }
    function schedule() {
      if (raf) return;
      raf = setTimeout(function () { raf = null; draw(); }, 16);
    }
    document.addEventListener('selectionchange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
  }

  /* --- 2. Появление блоков и строк -------------------------- */
  // Считаем положение сами, а не через IntersectionObserver: он молчит в
  // средах, где страница не отрисовывается (встроенные панели предпросмотра),
  // и блоки навсегда остаются невидимыми.
  var watched = [];
  function checkVisible() {
    if (!watched.length) return;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var rest = [];
    for (var i = 0; i < watched.length; i++) {
      var el = watched[i];
      var r = el.getBoundingClientRect();
      var visible = r.top < h * 0.92 && r.bottom > 0;
      if (visible) el.classList.add('in');
      else rest.push(el);
    }
    watched = rest;
  }
  function reveals() {
    var items = [].slice.call(document.querySelectorAll('.reveal, .line-mask'));
    // ?static=1 — показать всё сразу: нужно для снятия скриншотов страницы целиком
    if (reduced || /(?:\?|&)static/.test(location.search)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    watched = items;
    // троттлинг по времени, а не через rAF: в некомпозитящих средах
    // (встроенные панели предпросмотра) кадры не идут и rAF не вызывается
    var last = 0;
    function onScroll() {
      var now = Date.now();
      if (now - last < 80) return;
      last = now;
      checkVisible();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    checkVisible();
    // страховка: шрифты и картинки могут сдвинуть вёрстку после загрузки
    setTimeout(checkVisible, 120);
    setTimeout(checkVisible, 600);
    window.addEventListener('load', checkVisible);
  }

  /* --- 3. Бесконечная лента: дублируем список --------------- */
  function bands() {
    document.querySelectorAll('.band__track').forEach(function (track) {
      var list = track.firstElementChild;
      if (!list) return;
      track.appendChild(list.cloneNode(true));
    });
  }

  /* --- 4. Счётчики ------------------------------------------ */
  function counters() {
    var nodes = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    function fill(el) {
      el.textContent = el.dataset.count.replace('.', ',') + (el.dataset.suffix || '');
    }
    if (reduced || /(?:\?|&)static/.test(location.search)) { nodes.forEach(fill); return; }

    function run(el) {
      var raw = el.dataset.count, suffix = el.dataset.suffix || '';
      var target = parseFloat(raw.replace(',', '.'));
      var dec = (raw.split(/[.,]/)[1] || '').length;
      var t0 = performance.now(), frames = 0;
      (function tick(now) {
        frames++;
        var p = Math.min(1, (now - t0) / 950);
        var v = target * (1 - Math.pow(1 - p, 3));
        el.textContent = v.toFixed(dec).replace('.', ',') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
      // если кадры не идут (фоновая вкладка, панель без отрисовки) —
      // цифра всё равно должна оказаться на месте
      setTimeout(function () { if (frames < 2) fill(el); }, 400);
    }
    var pending = nodes.slice();
    function check() {
      var h = window.innerHeight || document.documentElement.clientHeight;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < h * 0.88 && r.bottom > 0) { run(el); return false; }
        return true;
      });
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    setTimeout(check, 300);
  }

  /* --- 5. Демо автодополнения (по наведению) ---------------- */
  function typeDemo() {
    document.querySelectorAll('[data-demo="type"]').forEach(function (demo) {
      var typed = demo.querySelector('[data-typed]');
      var ghost = demo.querySelector('[data-ghost]');
      var hint = demo.querySelector('[data-hint]');
      var sent = demo.querySelector('[data-sent]');
      var stem = demo.dataset.stem || 'доб';
      var full = demo.dataset.full || 'Добрый день! Подскажу по записи — на какой день удобно?';
      var timers = [];
      function stop() { timers.forEach(clearTimeout); timers = []; }
      function reset() {
        stop();
        if (typed) typed.textContent = '';
        if (ghost) ghost.textContent = '';
        if (hint) hint.classList.remove('show');
        if (sent) sent.classList.remove('show');
      }
      function run() {
        reset();
        if (reduced) {
          typed.textContent = stem; ghost.textContent = full.slice(stem.length);
          hint.classList.add('show'); return;
        }
        var end = 0;
        for (var i = 1; i <= stem.length; i++) {
          (function (n) { timers.push(setTimeout(function () { typed.textContent = stem.slice(0, n); }, 230 * n)); })(i);
          end = 230 * i;
        }
        timers.push(setTimeout(function () {
          ghost.textContent = full.slice(stem.length);
          hint.classList.add('show');
        }, end + 300));
        timers.push(setTimeout(function () {
          typed.textContent = full; ghost.textContent = ''; hint.classList.remove('show');
        }, end + 1450));
        timers.push(setTimeout(function () { if (sent) sent.classList.add('show'); }, end + 1900));
      }
      demo.addEventListener('mouseenter', run);
      demo.addEventListener('focusin', run);
      demo.addEventListener('mouseleave', reset);
      demo.addEventListener('focusout', reset);
    });
  }

  /* --- 6. Каналы: наведение подсвечивает своё сообщение ----- */
  function channelPeek() {
    var srcs = document.querySelectorAll('[data-channel]');
    if (!srcs.length) return;
    var msgs = document.querySelectorAll('[data-channel-msg]');
    function set(key) {
      msgs.forEach(function (m) {
        var mine = m.dataset.channelMsg === key;
        m.classList.toggle('lit', !!key && mine);
        m.classList.toggle('dim', !!key && !mine);
      });
      srcs.forEach(function (s) { s.classList.toggle('active', !!key && s.dataset.channel === key); });
    }
    srcs.forEach(function (s) {
      s.addEventListener('mouseenter', function () { set(s.dataset.channel); });
      s.addEventListener('focusin', function () { set(s.dataset.channel); });
      s.addEventListener('mouseleave', function () { set(null); });
      s.addEventListener('focusout', function () { set(null); });
    });
  }

  /* --- 7. Вкладки ------------------------------------------- */
  function tabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (group) {
      var btns = group.querySelectorAll('[role="tab"]');
      function show(id) {
        btns.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
        group.querySelectorAll('[data-panel]').forEach(function (p) {
          p.hidden = p.dataset.panel !== id;
        });
      }
      btns.forEach(function (b) {
        b.addEventListener('click', function () { show(b.dataset.tab); });
        b.addEventListener('mouseenter', function () { if (group.dataset.tabs === 'hover') show(b.dataset.tab); });
      });
    });
  }

  /* --- 8. Аккордеон ----------------------------------------- */
  function accordion() {
    document.querySelectorAll('[data-acc]').forEach(function (acc) {
      acc.querySelectorAll('button.acc__q').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.parentElement;
          var open = item.classList.contains('open');
          acc.querySelectorAll('.acc__item').forEach(function (i) {
            i.classList.remove('open');
            i.querySelector('button').setAttribute('aria-expanded', 'false');
          });
          if (!open) {
            item.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  /* --- 9. Калькулятор потерь -------------------------------- */
  function calc() {
    var box = document.querySelector('[data-calc]');
    if (!box) return;
    var msgs = box.querySelector('[name="msgs"]');
    var check = box.querySelector('[name="check"]');
    var missed = box.querySelector('[name="missed"]');
    var outMoney = box.querySelector('[data-out="money"]');
    var outLost = box.querySelector('[data-out="lost"]');
    var outVals = box.querySelectorAll('[data-val]');

    function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
    function update() {
      var m = +msgs.value, c = +check.value, p = +missed.value;
      var lostPerMonth = m * 4.3 * (p / 100);
      outLost.textContent = fmt(lostPerMonth);
      outMoney.textContent = fmt(lostPerMonth * c);
      outVals.forEach(function (el) {
        var src = box.querySelector('[name="' + el.dataset.val + '"]');
        el.textContent = (+src.value).toLocaleString('ru-RU');
      });
    }
    [msgs, check, missed].forEach(function (el) { el.addEventListener('input', update); });
    update();
  }

  /* --- 10. Демо голоса (по наведению) ----------------------- */
  function voiceDemo() {
    document.querySelectorAll('[data-demo="voice"]').forEach(function (demo) {
      var out = demo.querySelector('[data-voice-out]');
      var bars = demo.querySelectorAll('.wave i');
      var text = demo.dataset.text || 'Да, свободное время есть в четверг после трёх.';
      var timers = [];
      function reset() {
        timers.forEach(clearTimeout); timers = [];
        if (out) out.textContent = '';
        demo.classList.remove('rec');
      }
      function run() {
        reset();
        demo.classList.add('rec');
        if (reduced) { out.textContent = text; return; }
        var words = text.split(' ');
        words.forEach(function (w, i) {
          timers.push(setTimeout(function () {
            out.textContent = words.slice(0, i + 1).join(' ');
          }, 170 * (i + 1)));
        });
        timers.push(setTimeout(function () { demo.classList.remove('rec'); }, 170 * words.length + 400));
      }
      demo.addEventListener('mouseenter', run);
      demo.addEventListener('focusin', run);
      demo.addEventListener('mouseleave', reset);
      demo.addEventListener('focusout', reset);
      if (bars.length) bars.forEach(function (b, i) { b.style.animationDelay = (i * 90) + 'ms'; });
    });
  }

  /* --- 11. Формы макета: показываем, что произойдёт ---------- */
  function fakeForms() {
    document.querySelectorAll('[data-fake-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = form.querySelector('[data-form-note]');
        if (note) {
          note.hidden = false;
          note.textContent = form.dataset.fakeForm;
        }
      });
    });
  }

  /* --- 12. Подмена слова в заголовке ------------------------ */
  // Приём: старое слово зачёркивается и уступает место новому.
  // Слов может быть несколько — перебираются по кругу.
  function wordSwap() {
    document.querySelectorAll('.swap').forEach(function (swap) {
      var oldEl = swap.querySelector('.swap__old');
      var newEl = swap.querySelector('.swap__new');
      if (!oldEl || !newEl) return;
      var list = (swap.dataset.words || '').split('|').filter(Boolean);
      if (/(?:\?|&)static/.test(location.search)) { swap.classList.add('go'); return; }
      if (reduced) return;

      setTimeout(function () { swap.classList.add('go'); }, 900);
      if (list.length < 2) return;

      var i = 0;
      setInterval(function () {
        i = (i + 1) % list.length;
        newEl.style.opacity = '0';
        newEl.style.transform = 'translateY(.28em)';
        setTimeout(function () {
          newEl.textContent = list[i];
          newEl.style.opacity = '';
          newEl.style.transform = '';
        }, 320);
      }, 2600);
    });
  }

  /* --- 13. Залипающая история ------------------------------- */
  // Один экран держится на месте, сцены сменяются по мере прокрутки.
  function story() {
    var story = document.querySelector('.story');
    if (!story) return;
    var scenes = [].slice.call(story.querySelectorAll('.story__scene'));
    var dots = [].slice.call(story.querySelectorAll('.story__dots i'));
    if (!scenes.length) return;

    // ?scene=N — показать одну сцену (для скриншотов и показа партнёру)
    var pick = (location.search.match(/scene=(\d+)/) || [])[1];
    if (pick) {
      var n = Math.min(scenes.length, Math.max(1, +pick)) - 1;
      scenes.forEach(function (s, i) { s.classList.toggle('on', i === n); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === n); });
      return;
    }
    if (reduced || /(?:\?|&)static/.test(location.search)) {
      scenes.forEach(function (s) { s.classList.add('on'); });
      return;
    }

    var current = -1;
    function show(n) {
      if (n === current) return;
      current = n;
      scenes.forEach(function (s, i) { s.classList.toggle('on', i === n); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === n); });
    }
    function update() {
      var r = story.getBoundingClientRect();
      var h = window.innerHeight || document.documentElement.clientHeight;
      var total = r.height - h;
      if (total <= 0) { show(0); return; }
      var p = Math.min(1, Math.max(0, -r.top / total));
      show(Math.min(scenes.length - 1, Math.floor(p * scenes.length)));
    }
    var last = 0;
    window.addEventListener('scroll', function () {
      var now = Date.now();
      if (now - last < 60) return;
      last = now; update();
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
    setTimeout(update, 200);
  }


  /* Колода сообщений: перетаскивание пальцем и мышью, дубли — стрелки, точки
     и клавиатура. Жест не должен быть единственным способом пролистать. */
  function swipeDeck() {
    var root = document.querySelector('[data-swipe]');
    if (!root) return;

    var deck  = root.querySelector('[data-swipe-deck]');
    var cards = Array.prototype.slice.call(deck.querySelectorAll('.sw__card'));
    var dots  = root.querySelector('[data-swipe-dots]');
    var hint  = root.querySelector('[data-swipe-hint]');
    if (cards.length < 2) return;

    var calm  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pos = 0, touched = false, timer = null;
    var dragging = false, startX = 0, dx = 0, active = null;

    cards.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw__dot';
      b.setAttribute('aria-label', 'Сообщение ' + (i + 1) + ' из ' + cards.length);
      b.addEventListener('click', function () { stop(); go(i); });
      dots.appendChild(b);
    });
    var bullets = Array.prototype.slice.call(dots.children);

    function render() {
      cards.forEach(function (c, i) {
        var off = (i - pos + cards.length) % cards.length;
        c.classList.remove('gone', 'drag');
        if (off > 2) {
          c.style.opacity = '0';
          c.style.transform = 'translateY(42px) scale(.86)';
          c.style.zIndex = 0;
          c.style.pointerEvents = 'none';
        } else {
          c.style.opacity = off === 2 ? '.62' : '1';
          c.style.transform = 'translateY(' + off * 14 + 'px) scale(' + (1 - off * 0.045) + ')';
          c.style.zIndex = cards.length - off;
          c.style.pointerEvents = off === 0 ? 'auto' : 'none';
        }
      });
      bullets.forEach(function (b, i) {
        b.classList.toggle('on', i === pos);
        b.setAttribute('aria-current', i === pos ? 'true' : 'false');
      });
    }

    function go(i) { pos = (i + cards.length) % cards.length; render(); }

    function fly(dir) {
      var card = cards[pos];
      card.classList.add('gone');
      card.style.transform = 'translateX(' + dir * 520 + 'px) rotate(' + dir * 16 + 'deg)';
      card.style.opacity = '0';
      window.setTimeout(function () { go(pos + 1); }, calm ? 0 : 260);
    }

    function stop() {
      touched = true;
      if (timer) { window.clearInterval(timer); timer = null; }
      if (hint) hint.classList.add('hide');
    }

    deck.addEventListener('pointerdown', function (e) {
      var card = cards[pos];
      if (e.target.closest('.sw__card') !== card) return;
      dragging = true; startX = e.clientX; dx = 0; active = card;
      card.classList.add('drag');
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* захват не обязателен */ }
      stop();
    });

    deck.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      active.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 22 + 'deg)';
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      active.classList.remove('drag');
      if (Math.abs(dx) > 90) fly(dx > 0 ? 1 : -1);
      else render();
    }
    deck.addEventListener('pointerup', release);
    deck.addEventListener('pointercancel', release);

    root.querySelector('[data-swipe-next]').addEventListener('click', function () { stop(); fly(-1); });
    root.querySelector('[data-swipe-prev]').addEventListener('click', function () { stop(); go(pos - 1); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { stop(); fly(-1); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { stop(); go(pos - 1); e.preventDefault(); }
    });

    render();

    // Автоход только до первого касания: дальше человек листает сам.
    if (!calm) {
      timer = window.setInterval(function () { if (!touched) fly(-1); }, 3600);
      root.addEventListener('pointerenter', function () { if (!touched) stop(); });
    }
  }

  function boot() {
    if (/(?:\?|&)static/.test(location.search)) document.documentElement.classList.add('static-view');
    softSelection(); reveals(); bands(); counters();
    typeDemo(); channelPeek(); tabs(); accordion(); calc(); voiceDemo(); fakeForms();
    wordSwap(); story(); swipeDeck();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
