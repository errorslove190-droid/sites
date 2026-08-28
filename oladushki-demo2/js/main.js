document.addEventListener('DOMContentLoaded', () => {
  // ===== Мобильное меню =====
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // ===== Появление блоков при скролле =====
  // Отмечаемся живыми: страховочный таймер в <head> ждёт этот флаг.
  // Не дождётся — снимет класс js-anim, и все блоки станут видимыми без анимации.
  window.__animReady = true;

  const faders = document.querySelectorAll('.fade-in');
  if (!('IntersectionObserver' in window)) {
    // Старый браузер — показываем всё сразу, лучше без анимации, чем без текста.
    document.documentElement.classList.remove('js-anim');
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    faders.forEach(el => observer.observe(el));
  }

  // ===== Живой фон первого экрана =====
  // Ролик 1,5 МБ подключаем только на широких экранах и без «уменьшить движение»:
  // телефоны видят постер и не тратят трафик.
  const heroBg = document.querySelector('.viz-video');
  if (heroBg && heroBg.dataset.src &&
      window.matchMedia('(min-width: 800px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroBg.src = heroBg.dataset.src;
    heroBg.play().catch(() => {}); // автоплей могут запретить — постер остаётся
  }

  // ===== Ленивые видео (промо-ролик и подобные) =====
  // src ставим, только когда блок подъезжает к экрану: ролик 1,2 МБ
  // не должен тормозить первую загрузку. Фон hero обрабатывается выше отдельно.
  const lazyVids = document.querySelectorAll('video[data-src]:not(.viz-video)');
  if (lazyVids.length && 'IntersectionObserver' in window) {
    const vidObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const v = e.target;
        v.src = v.dataset.src;
        v.play().catch(() => {}); // автоплей запрещён — останется постер
        vidObserver.unobserve(v);
      });
    }, { rootMargin: '1200px' }); // грузим сильно заранее: 5-мегабайтный ролик
                                  // должен успеть до того, как посетитель доскроллит
    lazyVids.forEach(v => vidObserver.observe(v));
  } else {
    lazyVids.forEach(v => { v.src = v.dataset.src; });
  }

  // ===== Раскрытие промо-ролика на скролле =====
  // Прогресс 0..1 в CSS-переменную --pe: видео растёт из «окна» в полный экран.
  // Значение догоняет цель через lerp в rAF — прямое присваивание по колесу
  // мыши шло ступеньками («лагает»), транзишн в CSS дёргался ещё сильнее.
  const promoEx = document.getElementById('promo-expand');
  if (promoEx && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const promoVid = promoEx.querySelector('.promo-video');
    let peTarget = 0, peCurrent = -1, peRunning = false;
    const peMeasure = () => {
      const r = promoEx.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 — блок показался снизу; 1 — дошёл до верхней трети экрана
      peTarget = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
      if (!peRunning) { peRunning = true; requestAnimationFrame(peStep); }
    };
    const peStep = () => {
      peCurrent = peCurrent < 0 ? peTarget : peCurrent + (peTarget - peCurrent) * 0.16;
      if (Math.abs(peTarget - peCurrent) < 0.001) {
        peCurrent = peTarget;
        peRunning = false;
      } else {
        requestAnimationFrame(peStep);
      }
      promoVid.style.setProperty('--pe', peCurrent.toFixed(4));
    };
    window.addEventListener('scroll', peMeasure, { passive: true });
    window.addEventListener('resize', peMeasure);
    peMeasure();
  }

  // ===== Официальный виджет отзывов Яндекса — по клику =====
  // Живые отзывы прямо с Карт, но iframe тяжёлый: до нажатия его нет.
  const revWrap = document.getElementById('reviews-widget');
  const revBtn  = document.getElementById('reviews-widget-open');
  if (revWrap && revBtn) {
    revBtn.addEventListener('click', () => {
      if (revWrap.querySelector('iframe')) return;
      const fr = document.createElement('iframe');
      fr.src = revWrap.dataset.widget;
      fr.title = 'Отзывы о «Свияжских Оладушках» на Яндекс Картах';
      fr.loading = 'lazy';
      fr.setAttribute('frameborder', '0');
      revWrap.appendChild(fr);
      revWrap.classList.add('is-open');
      revBtn.remove();
      fr.addEventListener('load', () => fr.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    });
  }

  // ===== Карта по клику =====
  // Виджет Яндекса тянет мегабайты и подвешивает страницу на входе,
  // поэтому до нажатия его на странице просто нет.
  const mapFrame = document.getElementById('map-frame');
  if (mapFrame) {
    const openMap = () => {
      const src = mapFrame.dataset.map;
      if (!src || mapFrame.querySelector('iframe')) return;
      const fr = document.createElement('iframe');
      fr.src = src;
      fr.title = 'Карта: Свияжские Оладушки на острове Свияжск';
      fr.loading = 'lazy';
      fr.setAttribute('allowfullscreen', '');
      mapFrame.innerHTML = '';
      mapFrame.appendChild(fr);
    };
    const btn = mapFrame.querySelector('.map-open');
    if (btn) btn.addEventListener('click', openMap);
  }

  // ===== Каталог-«прилавок»: подсветка раздела при прокрутке =====
  const sideNav = document.getElementById('catalog-side');
  if (sideNav && 'IntersectionObserver' in window) {
    const links = [...sideNav.querySelectorAll('a[href^="#"]')];
    const byId = {};
    links.forEach(a => { byId[a.getAttribute('href').slice(1)] = a; });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.remove('on'));
        const link = byId[e.target.id];
        if (link) link.classList.add('on');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    document.querySelectorAll('.catalog-heading[id]').forEach(h => spy.observe(h));
    if (links[0]) links[0].classList.add('on');
  }

  // ===== Фильтр каталога =====
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');
  const catHeadings = document.querySelectorAll('.catalog-heading');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        productCards.forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
        // Скрываем заголовки пустых категорий
        catHeadings.forEach(h => {
          h.style.display = (cat === 'all' || h.id === cat) ? '' : 'none';
        });
      });
    });
  }

  // ===== Форма заявки: отправка в мессенджер =====
  const orderForm = document.querySelector('#order-form');
  if (orderForm) {
    const nameInput = orderForm.querySelector('#name');
    const phoneInput = orderForm.querySelector('#phone');
    const serviceSelect = orderForm.querySelector('#service');
    const messageArea = orderForm.querySelector('#message');
    const waBtn = orderForm.querySelector('#send-wa');
    const tgBtn = orderForm.querySelector('#send-tg');
    const vkBtn = orderForm.querySelector('#send-vk');
    const maxFormBtn = orderForm.querySelector('#send-max');
    const hint = orderForm.querySelector('#name-hint');
    const previewText = orderForm.querySelector('#preview-text');
    const successMsg = document.querySelector('#form-success');
    const successText = document.querySelector('#success-text');
    const againBtn = document.querySelector('#form-again');
    const toast = document.querySelector('#copy-toast');
    const btns = [waBtn, tgBtn, vkBtn, maxFormBtn].filter(Boolean);

    // Автоподстановка товара из каталога (?item=...)
    const params = new URLSearchParams(window.location.search);
    const item = params.get('item');
    if (item) {
      messageArea.value = 'Хочу заказать: ' + item;
      const map = [
        ['Корзина', 'Корзины и изделия из лозы'],
        ['Лукошко', 'Корзины и изделия из лозы'],
        ['Хлебница', 'Корзины и изделия из лозы'],
        ['Ложка', 'Сувениры и подарки'],
        ['Оберег', 'Сувениры и подарки'],
        ['Магнит', 'Сувениры и подарки'],
        ['Чай', 'Другое'],
        ['чаепити', 'Другое'],
        ['Сбитень', 'Другое'],
        ['Оладушки', 'Бронь оладушек для группы'],
        ['Оладьи', 'Бронь оладушек для группы'],
        ['Пирог', 'Бронь оладушек для группы']
      ];
      for (const [key, val] of map) {
        if (item.toLowerCase().includes(key.toLowerCase())) {
          serviceSelect.value = val;
          break;
        }
      }
    }

    // Сборка текста заявки
    function buildMessage() {
      let msg = 'Здравствуйте! Меня зовут ' + (nameInput.value.trim() || '…') + '.';
      msg += ' Интересует: ' + serviceSelect.value + '.';
      const comment = messageArea.value.trim();
      if (comment) msg += ' ' + comment;
      const phone = phoneInput.value.trim();
      if (phone) msg += ' Мой телефон: ' + phone + '.';
      return msg;
    }

    // Обновление превью + активности кнопок
    function refresh() {
      const ok = nameInput.value.trim().length > 0;
      btns.forEach(b => { b.disabled = !ok; });
      if (hint) hint.style.display = ok ? 'none' : '';
      if (previewText) previewText.textContent = buildMessage();
    }
    [nameInput, phoneInput, serviceSelect, messageArea].forEach(el =>
      el.addEventListener('input', refresh));
    serviceSelect.addEventListener('change', refresh);

    // Подсказки к выбранной услуге
    const serviceHint = orderForm.querySelector('#service-hint');
    const serviceHints = {
      'Бронь оладушек для группы': 'Оладушки подаются горячими, с пылу с жару. Если вы приезжаете туристической группой — забронируйте заранее, и мы испечём нужное количество прямо к вашему приезду. Укажите в комментарии дату, время и число гостей.',
      'Мастер-класс': 'Укажите в комментарии желаемую дату и количество участников — мы подберём время и всё подготовим.'
    };
    function updateServiceHint() {
      const t = serviceHints[serviceSelect.value];
      if (t && serviceHint) { serviceHint.textContent = t; serviceHint.hidden = false; }
      else if (serviceHint) { serviceHint.hidden = true; }
    }
    serviceSelect.addEventListener('change', updateServiceHint);
    updateServiceHint();
    refresh();

    // Копирование в буфер с фолбэком
    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
        return ok;
      }
    }

    function showToast() {
      if (!toast) return;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }

    function showSuccess(text) {
      if (successText) successText.textContent = text;
      if (successMsg) successMsg.style.display = 'block';
      orderForm.style.display = 'none';
    }

    // WhatsApp — текст подставляется прямо в чат
    waBtn.addEventListener('click', () => {
      const url = 'https://wa.me/79872984820?text=' + encodeURIComponent(buildMessage());
      window.open(url, '_blank', 'noopener');
      showSuccess('Открылся WhatsApp — сообщение уже вставлено, просто нажмите «Отправить».');
    });

    // Telegram — прямого prefill в личку нет, поэтому копируем текст и открываем чат
    tgBtn.addEventListener('click', async () => {
      await copyToClipboard(buildMessage());
      showToast();
      window.open('https://t.me/S0fff1a', '_blank', 'noopener');
      showSuccess('Текст заявки скопирован. Открылся Telegram — вставьте сообщение в чат (Ctrl+V) и отправьте.');
    });

    // ВКонтакте — так же копируем и открываем страницу для сообщения
    vkBtn.addEventListener('click', async () => {
      await copyToClipboard(buildMessage());
      showToast();
      window.open('https://vk.com/id166342754', '_blank', 'noopener');
      showSuccess('Текст заявки скопирован. Открылся ВКонтакте — напишите нам и вставьте сообщение (Ctrl+V).');
    });

    // MAX — ссылок по номеру телефона у MAX нет, поэтому личная ссылка профиля лавки.
    const maxBtn = document.getElementById('send-max');
    if (maxBtn) maxBtn.addEventListener('click', async () => {
      await copyToClipboard(buildMessage());
      showToast();
      window.open('https://max.ru/u/f9LHodD0cOJodXrRKeqwJYQPzx32FQ5j4PN1UkHqtZgA0pqtfg1UWrQard4', '_blank', 'noopener');
      showSuccess('Текст заявки скопирован. Открылся чат в MAX — вставьте сообщение (Ctrl+V) и отправьте.');
    });

    // Кнопка "отправить ещё одну"
    if (againBtn) {
      againBtn.addEventListener('click', () => {
        if (successMsg) successMsg.style.display = 'none';
        orderForm.style.display = '';
        refresh();
      });
    }
  }

  // ===== Лайтбокс галереи и каталога (фото и видео) =====
  const galleryImgs = document.querySelectorAll('.full-gallery img, .gallery-grid img, .product-card .img-wrap img, .master-photo img');
  const videoTiles = document.querySelectorAll('.video-tile');
  if (galleryImgs.length || videoTiles.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<button class="lightbox-close" aria-label="Закрыть">×</button><img alt="" style="display:none"><video controls playsinline style="display:none"></video><p class="lightbox-caption"></p>';
    document.body.appendChild(box);
    const boxImg = box.querySelector('img');
    const boxVideo = box.querySelector('video');
    const boxCap = box.querySelector('.lightbox-caption');

    function close() {
      box.classList.remove('open');
      document.body.style.overflow = '';
      boxVideo.pause();
      boxVideo.removeAttribute('src');
      boxVideo.load();
    }
    box.addEventListener('click', (e) => {
      if (e.target !== boxImg && e.target !== boxVideo) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    function openBox(caption) {
      boxCap.textContent = caption || '';
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    galleryImgs.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (e) => {
        const fig = img.closest('figure');
        const card = img.closest('.product-card');
        if (fig && fig.classList.contains('video-tile')) return;
        if (!fig && !card) return;
        e.preventDefault();
        boxVideo.style.display = 'none';
        boxVideo.pause();
        boxImg.style.display = '';
        // Открываем полноразмерную версию: убираем -m (мобильную) уменьшенную версию из пути, если она есть
        boxImg.src = img.currentSrc || img.src;
        boxImg.alt = img.alt;
        let capText = '';
        if (fig) {
          const cap = fig.querySelector('figcaption');
          capText = cap ? cap.textContent : '';
        } else if (card) {
          const h3 = card.querySelector('h3');
          capText = h3 ? h3.textContent : '';
        }
        openBox(capText);
      });
    });

    videoTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        boxImg.style.display = 'none';
        boxVideo.style.display = '';
        const mp4 = tile.dataset.video;
        const canWebm = boxVideo.canPlayType('video/webm; codecs="vp9"');
        boxVideo.src = canWebm ? mp4.replace('.mp4', '.webm') : mp4;
        boxVideo.play().catch(() => {});
        const cap = tile.querySelector('figcaption');
        openBox(cap ? cap.textContent : '');
      });
    });
  }

  // ===== Hero-видео: пауза при экономии движения =====
  const heroVideo = document.querySelector('.ref-hero-img video');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // Кастомный курсор удалён 12.08.2026 — см. комментарий в style.css.
});

/* ================================================================
   ПРЕМИУМ-АНИМАЦИИ
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Прелоадер удалён 12.08.2026 — см. комментарий в style.css.
  // Страховка на случай, если старая разметка где-то осталась:
  const stalePreloader = document.getElementById('preloader');
  if (stalePreloader) stalePreloader.remove();

  // ===== 2. Шторка-переход между страницами =====
  if (!reduceMotion) {
    const curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    document.body.appendChild(curtain);

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || a.target === '_blank' || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('tel:') || href.startsWith('mailto:') || e.metaKey || e.ctrlKey) return;
      // только внутренние переходы на другие страницы
      const [path] = href.split('#');
      if (!path || path === location.pathname.split('/').pop()) return;
      e.preventDefault();
      curtain.style.pointerEvents = 'auto';
      curtain.classList.add('active');
      setTimeout(() => { location.href = href; }, 480);
    });
    // при показе страницы (в т.ч. из кеша «назад») — шторка уходит
    window.addEventListener('pageshow', () => {
      if (curtain.classList.contains('active')) {
        curtain.classList.add('leaving');
        setTimeout(() => {
          curtain.classList.remove('active', 'leaving');
          curtain.style.pointerEvents = 'none';
        }, 600);
      }
    });
  }

  // ===== 3. Заголовки: всплытие слов из маски =====
  if (!reduceMotion) {
    const heads = document.querySelectorAll('.section-head h2, .catalog-heading, .split h2, .page-hero h1');
    const slObserver = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); slObserver.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    heads.forEach(h => {
      if (h.querySelector('.w')) return;
      const words = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      h.classList.add('sl');
      words.forEach((word, i) => {
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi';
        wi.textContent = word;
        wi.style.transitionDelay = (i * 70) + 'ms';
        w.appendChild(wi); h.appendChild(w);
        h.appendChild(document.createTextNode(' '));
      });
      slObserver.observe(h);
    });
  }

  // ===== 5. Шапка прячется при скролле вниз =====
  const header = document.querySelector('header.site-header');
  if (header) {
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const menuOpen = document.querySelector('.main-nav.open');
        if (!menuOpen && y > 160 && y > lastY + 4) header.classList.add('header-hidden');
        else if (y < lastY - 4 || y <= 160) header.classList.remove('header-hidden');
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  // ===== 6. Каскад карточек в сетках =====
  document.querySelectorAll('.ref-grid, .video-grid, .products-grid, .full-gallery, .gallery-grid').forEach(grid => {
    [...grid.children].forEach((child, i) => {
      if (child.classList.contains('fade-in') || child.tagName === 'FIGURE' || child.classList.contains('ref-card')) {
        child.style.transitionDelay = (i % 3) * 110 + 'ms';
      }
    });
  });

  // ===== 7. Магнитные кнопки =====
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.btn, .btn-messenger').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / r.width;
        const dy = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${dx * 10}px, ${dy * 8}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  // ===== 8. Лёгкий параллакс фото в секции split =====
  if (!reduceMotion) {
    const parEls = document.querySelectorAll('.split img');
    if (parEls.length) {
      parEls.forEach(el => { el.style.transform = 'scale(1.12)'; el.style.willChange = 'transform'; });
      let pTick = false;
      const applyParallax = () => {
        parEls.forEach(el => {
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2 - innerHeight / 2;
          el.style.transform = `scale(1.12) translateY(${center * -0.06}px)`;
        });
        pTick = false;
      };
      window.addEventListener('scroll', () => {
        if (!pTick) { pTick = true; requestAnimationFrame(applyParallax); }
      }, { passive: true });
      applyParallax();
    }
  }
});

/* ================================================================
   ЖИВОЙ САМОВАР: скролл-скраб видео + пар и искры
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('scrub-video');
  const canvas = document.getElementById('fx-canvas');
  if (!video || !canvas) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // остаётся постер

  // ---------- 1. Видео листается скроллом (пинг-понг, бесшовный цикл) ----------
  let targetTime = 0;
  let duration = 0;
  video.addEventListener('loadedmetadata', () => { duration = video.duration || 0; });
  video.load();

  const SCRUB_SPEED = 1 / 900; // секунд видео на пиксель скролла

  function scrollToVideoTime(y) {
    if (!duration) return 0;
    const cycle = (y * SCRUB_SPEED) % (2 * duration);
    // треугольная волна: вперёд до конца, затем назад — цикл без склейки
    return cycle <= duration ? cycle : 2 * duration - cycle;
  }

  // ---------- 2. Частицы: пар и золотые искры ----------
  const ctx = canvas.getContext('2d');
  const particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cw = 0, ch = 0;

  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    cw = r.width; ch = r.height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // точка эмиссии — «крышка самовара»: верх портала
  function emitter() {
    // канвас шире портала (150%), портал начинается на 16.7% и занимает 66.7% ширины
    return { x: cw * 0.5, y: ch * 0.20 };
  }

  function spawnSteam(intensity) {
    const e = emitter();
    for (let i = 0; i < intensity; i++) {
      particles.push({
        kind: 'steam',
        x: e.x + (Math.random() - 0.5) * 26,
        y: e.y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.5 + Math.random() * 0.9),
        r: 7 + Math.random() * 14,
        life: 1,
        decay: 0.006 + Math.random() * 0.006,
        wob: Math.random() * Math.PI * 2
      });
    }
  }
  function spawnSparks(intensity) {
    const e = emitter();
    for (let i = 0; i < intensity; i++) {
      particles.push({
        kind: 'spark',
        x: e.x + (Math.random() - 0.5) * 30,
        y: e.y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -(1.2 + Math.random() * 2.2),
        r: 1 + Math.random() * 1.8,
        life: 1,
        decay: 0.012 + Math.random() * 0.014,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  // ---------- 3. Скорость скролла управляет всем ----------
  let lastScrollY = window.scrollY;
  let velocity = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    velocity += Math.abs(y - lastScrollY);
    lastScrollY = y;
    targetTime = scrollToVideoTime(y);
  }, { passive: true });

  const portal = document.querySelector('.samovar-portal');
  function portalOnScreen() {
    const r = portal.getBoundingClientRect();
    return r.bottom > -80 && r.top < innerHeight + 80;
  }

  let lastFrame = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - lastFrame);
    lastFrame = now;

    if (portalOnScreen()) {
      // длительность могла подъехать позже подписки — читаем напрямую
      if (!duration && video.duration) {
        duration = video.duration;
        targetTime = scrollToVideoTime(window.scrollY);
      }
      // видео плавно догоняет целевой кадр
      if (duration && Math.abs(video.currentTime - targetTime) > 0.02) {
        video.currentTime += (targetTime - video.currentTime) * 0.18;
      }

      // эмиссия по скорости: стоишь — тихо, листаешь — самовар оживает
      const v = Math.min(velocity, 60);
      velocity *= 0.86; // затухание
      if (v > 1.5) {
        spawnSteam(Math.min(3, Math.round(v / 14) + 1));
        if (v > 8) spawnSparks(Math.min(4, Math.round(v / 12)));
      }

      // отрисовка
      ctx.clearRect(0, 0, cw, ch);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * (dt / 16.7);
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * (dt / 16.7);
        p.y += p.vy * (dt / 16.7);
        if (p.kind === 'steam') {
          p.wob += 0.02 * (dt / 16.7);
          p.x += Math.sin(p.wob) * 0.3;
          p.r += 0.09 * (dt / 16.7);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, `rgba(244, 233, 208, ${0.16 * p.life})`);
          g.addColorStop(1, 'rgba(244, 233, 208, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        } else {
          p.vy += 0.012 * (dt / 16.7); // лёгкое замедление подъёма
          p.tw += 0.35;
          const flicker = 0.55 + 0.45 * Math.sin(p.tw);
          ctx.fillStyle = `rgba(230, 180, 80, ${p.life * flicker})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          // свечение искры
          ctx.fillStyle = `rgba(255, 214, 120, ${p.life * flicker * 0.25})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      // ограничение количества частиц
      if (particles.length > 260) particles.splice(0, particles.length - 260);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
});

/* ===== Мастерицы: лёгкий отклик на мышь (эффект присутствия) ===== */
document.addEventListener('DOMContentLoaded', () => {
  const persons = document.querySelectorAll('.person-left img, .person-right img');
  if (!persons.length) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.ref-hero-top');
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    persons.forEach((img, i) => {
      const depth = img.closest('.person-left') ? 8 : 12; // левая — дальше, двигается меньше
      img.style.transform = `translate(${dx * -depth}px, ${dy * -depth * 0.6}px)`;
    });
  });
  hero.addEventListener('mouseleave', () => {
    persons.forEach(img => { img.style.transform = ''; });
  });
});

/* ===== Живой статус «Сейчас открыто / закрыто» (10:00–18:00 ежедневно) ===== */
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('open-status');
  if (!el) return;
  // Лавка в Свияжске — московское время (UTC+3)
  const nowMsk = new Date(Date.now() + (3 * 60 + new Date().getTimezoneOffset()) * 60000);
  const h = nowMsk.getHours();
  if (h >= 10 && h < 18) {
    el.textContent = 'Сейчас открыто · до 18:00';
  } else {
    el.classList.add('closed');
    el.textContent = h < 10 ? 'Откроемся сегодня в 10:00' : 'Откроемся завтра в 10:00';
  }
});

/* ===== Карусель отзывов: стрелки, точки, автопрокрутка ===== */
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('reviews-track');
  if (!track) return;
  const cards = [...track.children];
  const prev = document.querySelector('.rc-prev');
  const next = document.querySelector('.rc-next');
  const dotsWrap = document.getElementById('reviews-dots');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cardStep() {
    return cards[0].offsetWidth + 22;
  }
  function current() {
    return Math.round(track.scrollLeft / cardStep());
  }
  function goTo(i) {
    const idx = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: idx * cardStep(), behavior: 'smooth' });
  }

  next && next.addEventListener('click', () => goTo(current() + 1));
  prev && prev.addEventListener('click', () => goTo(current() - 1));

  // точки
  cards.forEach((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'Отзыв ' + (i + 1));
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });
  const dots = [...dotsWrap.children];
  function syncDots() {
    const c = current();
    dots.forEach((d, i) => d.classList.toggle('active', i === c));
  }
  track.addEventListener('scroll', () => {
    window.requestAnimationFrame(syncDots);
  }, { passive: true });
  syncDots();

  // автопрокрутка, пауза при наведении/касании
  if (!reduceMotion) {
    let timer = setInterval(() => {
      const c = current();
      goTo(c >= cards.length - 1 ? 0 : c + 1);
    }, 5000);
    const stop = () => { clearInterval(timer); timer = null; };
    const carousel = document.querySelector('.reviews-carousel');
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('touchstart', stop, { passive: true });
  }
});

/* ===== Эффект рассыпания букв (перенос TextDisperse на нативный JS) ===== */
document.addEventListener('DOMContentLoaded', () => {
  const words = document.querySelectorAll('[data-disperse]');
  if (!words.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // те же трансформы, что в исходном компоненте (x/y в em, поворот в градусах)
  const transforms = [
    { x: -0.8, y: -0.6, r: -29 }, { x: -0.2, y: -0.4, r: -6 }, { x: -0.05, y: 0.1, r: 12 },
    { x: -0.05, y: -0.1, r: -9 }, { x: -0.1, y: 0.55, r: 3 }, { x: 0, y: -0.1, r: 9 },
    { x: 0, y: 0.15, r: -12 }, { x: 0, y: 0.15, r: -17 }, { x: 0, y: -0.65, r: 9 },
    { x: 0.1, y: 0.4, r: 12 }, { x: 0, y: -0.15, r: -9 }, { x: 0.2, y: 0.15, r: 12 },
    { x: 0.8, y: 0.6, r: 20 }
  ];

  words.forEach(word => {
    const text = word.textContent;
    word.textContent = '';
    word.classList.add('disperse-ready');
    const letters = [];
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'disperse-char';
      span.textContent = ch;
      // индекс трансформа масштабируется на длину слова, чтобы хватало на любое слово
      const t = transforms[Math.min(transforms.length - 1, Math.round(i / Math.max(1, text.length - 1) * (transforms.length - 1)))];
      span.dataset.tx = t.x; span.dataset.ty = t.y; span.dataset.tr = t.r;
      word.appendChild(span);
      letters.push(span);
    });

    if (reduceMotion || !finePointer) return; // на тач/при экономии — просто статичный заголовок

    const open = () => letters.forEach(s => {
      s.style.transform = `translate(${s.dataset.tx}em, ${s.dataset.ty}em) rotate(${s.dataset.tr}deg)`;
    });
    const close = () => letters.forEach(s => { s.style.transform = ''; });
    word.addEventListener('mouseenter', open);
    word.addEventListener('mouseleave', close);
  });
});

// ===== Плейлист «Лавка вживую» (28.08.2026, демо) =====
// Большой экран = два video-слоя: следующий ролик грузится в скрытый слой
// и проявляется кроссфейдом, чтобы не было чёрной вспышки при смене src.
(function () {
  var stage = document.getElementById('pl-stage');
  var thumbsBox = document.getElementById('pl-thumbs');
  if (!stage || !thumbsBox) return;
  var clips = [
    { f: 'lavka-promo',    t: 'Лавка и чай',  c: 'Фасад с росписью, самовары, налив чая' },
    { f: 'hero-samovar',   t: 'Самовары',     c: 'Пар над самоварами — топим каждое утро' },
    { f: 'grani-korziny',  t: 'Корзины',      c: 'Плетём из лозы сами' },
    { f: 'grani-suveniry', t: 'Сувениры',     c: 'Береста и ручная работа' },
    { f: 'derevo-dron',    t: 'Живое дерево', c: 'Облёт плантации — анимация по нашему фото' }
  ];
  var screens = stage.querySelectorAll('.pl-screen');
  var front = screens[0], back = screens[1];
  var cap = document.getElementById('pl-caption');
  var bar = document.getElementById('pl-progress');
  var current = 0;

  clips.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pl-thumb' + (i === 0 ? ' is-active' : '');
    b.setAttribute('aria-label', 'Показать ролик: ' + c.t);
    b.innerHTML = '<img src="video/thumbs/' + c.f + '.jpg" alt="" loading="lazy"><b>' + c.t + '</b>';
    b.addEventListener('click', function () { show(i); });
    thumbsBox.appendChild(b);
  });

  function show(i) {
    if (i === current) return;
    current = i;
    var c = clips[i];
    back.src = 'video/' + c.f + '.mp4';
    back.load();
    back.oncanplay = function () {
      back.oncanplay = null;
      back.currentTime = 0;
      back.play().catch(function () {});
      back.classList.remove('is-hidden');
      front.classList.add('is-hidden');
      var tmp = front; front = back; back = tmp;
      cap.textContent = c.c;
      Array.prototype.forEach.call(thumbsBox.children, function (el, k) {
        el.classList.toggle('is-active', k === i);
      });
    };
  }

  setInterval(function () {
    if (front.duration) bar.style.width = (front.currentTime / front.duration * 100) + '%';
  }, 200);
})();
