/* Ветра — лендинг «Премиум»: конструктор, итог, форма, анимации. Vanilla JS + GSAP (CDN). */
(function () {
  'use strict';

  /* ---------- НАСТРОЙКИ, которые правит Михаил ---------- */
  var LEAD_ENDPOINT = '';          // адрес приёмника заявок на сервере Ветра (РФ). Пусто — работает запасной путь.
  var TG_USER = '';                // ник в Telegram для запасного пути, без @. Пусто — показываем состав для копирования.
  var CALL_HOURS = 'до 18:00';     // обещание в тексте успеха

  /* ---------- ПРАЙС (docs/roy-lending/finansist.md, 09.09.2026) ---------- */
  var ITEMS = [
    // база
    { id: 'zapusk', group: 'base', name: 'Запуск Ветры', desc: 'Компания, до 3 сотрудников, роли, приёмка, обучающий созвон 1 ч', once: 15000, monthly: 0, lock: true },
    { id: 'soprov', group: 'base', name: 'Сопровождение', desc: 'Место на сервере, обновления, ответы в чате в рабочие часы. 3 месяца входят в первый платёж', once: 0, monthly: 2500, lock: true },
    // каналы
    { id: 'tg', group: 'chan', name: 'Telegram', desc: 'Бот компании, ключ выдаётся сразу', once: 3000, monthly: 0, dot: '#2AABEE' },
    { id: 'vk', group: 'chan', name: 'ВКонтакте', desc: 'Сообщения сообщества', once: 3000, monthly: 0, dot: '#0077FF' },
    { id: 'max', group: 'chan', name: 'MAX', desc: 'Проверка на dev.max.ru занимает несколько дней', once: 4000, monthly: 0, dot: '#7B5CFA' },
    { id: 'mail', group: 'chan', name: 'Почта', desc: 'Письма и заявки с сайтов и кабинетов площадок в том же списке', once: 5000, monthly: 0, dot: '#7C8AA0' },
    { id: 'avito', group: 'chan', name: 'Авито', desc: 'Сообщения из кабинета', once: 5000, monthly: 0, dot: '#00AAFF', third: 2000, thirdNote: '+ тариф Авито ~2 000–3 000 ₽/мес — площадке, не нам' },
    { id: 'wa', group: 'chan', name: 'WhatsApp', desc: 'Через российского провайдера по вашему договору, без гарантий в РФ. Подключаем по запросу, деньги берём после подключения', once: 8000, monthly: 0, third: 5000, thirdNote: '+ провайдеру ~5 000 ₽/мес — площадке, не нам', request: true },
    // опции
    { id: 'templates', group: 'opt', name: 'Быстрые ответы', desc: 'До 20 шаблонов, пишем вместе с вами', once: 4000, monthly: 0 },
    { id: 'alert', group: 'opt', name: 'Оповещение «не ответили»', desc: 'Сигнал руководителю, если диалог ждёт дольше N минут', once: 0, monthly: 500, soon: true },
    { id: 'report', group: 'opt', name: 'Отчёт недели', desc: 'Диалоги по каналам, время ответа, неотвеченные — в Telegram', once: 0, monthly: 1000, soon: true },
    { id: 'voice', group: 'opt', name: 'Голос в текст', desc: 'Голосовые клиентов читаются текстом, до 300 минут в месяц', once: 0, monthly: 500, soon: true },
    { id: 'ai', group: 'opt', name: 'ИИ-автоответ', desc: 'Отвечает по карточке компании, когда вы заняты; настройка карточки разово', once: 5000, monthly: 1490, soon: true },
    { id: 'panel', group: 'opt', name: 'Панель руководителя', desc: 'Кто отвечает, сколько ждут, где висит без ответа', once: 0, monthly: 1500, soon: true, needsStaff: 2 },
    { id: 'training', group: 'opt', name: 'Обучение сотрудников', desc: 'Дополнительный созвон до 1,5 часа', once: 3000, monthly: 0 },
    { id: 'staff', group: 'opt', name: 'Сотрудники сверх трёх', desc: 'За каждого', once: 0, monthly: 500, qty: 0 },
    { id: 'server', group: 'opt', name: 'Выделенный сервер', desc: 'Свой контур, свои ключи, сервер в РФ. Настройка разово', once: 10000, monthly: 3000 },
    { id: 'ext', group: 'opt', name: 'Расширенное сопровождение', desc: 'Ответ за 2 часа, мелкие правки включены. Вместо обычного', once: 0, monthly: 6000, replaces: 'soprov' },
    // под ТЗ
    { id: 'crm', group: 'tz', name: 'Связка с CRM или журналом записи', desc: 'Битрикс24, amoCRM, YCLIENTS, Dikidi' },
    { id: 'migrate', group: 'tz', name: 'Переезд переписок', desc: 'История из старого сервиса в Ветра' },
    { id: 'custom', group: 'tz', name: 'Своя функция по ТЗ', desc: 'Оценка 5 000 ₽ зачитывается в заказ' }
  ];
  var TZ_FROM = 62500, TZ_RATE = 2500;

  // корзины из finansist.md §3: салон 29 000 + 3 000/мес · производство 53 000 + 11 990/мес (+ ТЗ отдельно) · магазин 39 000 + 6 990/мес
  var PRESETS = {
    salon: { chan: ['tg', 'vk', 'max'], opt: ['templates', 'voice'], staff: 0, chk: 4500 },
    prod: { chan: ['mail', 'avito', 'tg', 'vk'], opt: ['templates', 'training', 'ai', 'server', 'voice', 'alert', 'panel', 'report'], staff: 3, custom: ['crm'], chk: 40000 },
    shop: { chan: ['avito', 'vk', 'tg', 'max'], opt: ['templates', 'ai', 'alert', 'report', 'voice'], staff: 2, chk: 3000 },
    other: { chan: ['tg', 'vk'], opt: ['templates', 'alert', 'report'], staff: 0, chk: 5000 }
  };
  var Q3 = { a: 7, b: 20, c: 60, d: 120 };            // обращений в день
  var Q4 = { a: 1, b: 2, c: 5, d: 8 };                // кто отвечает

  /* ---------- состояние ---------- */
  var state = { seg: null, chans: [], d: null, adm: null, crm: null, server: null, chk: 4500, lost: 2, chkTouched: false, on: {}, custom: {}, answered: false };
  var byId = {};
  ITEMS.forEach(function (i) { byId[i.id] = i; });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
  function push(ev, data) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, data || {})); } catch (e) {} }
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- вопросы ---------- */
  function initQuiz() {
    $$('.q').forEach(function (q) {
      var key = q.getAttribute('data-q'), multi = q.hasAttribute('data-multi');
      $$('.opt', q).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-v');
          if (multi) {
            var on = b.getAttribute('aria-pressed') === 'true';
            b.setAttribute('aria-pressed', on ? 'false' : 'true');
            state.chans = $$('.opt[aria-pressed=true]', q).map(function (x) { return x.getAttribute('data-v'); });
          } else {
            $$('.opt', q).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            if (key === 'seg') { state.seg = v; if (!state.chkTouched) { state.chk = PRESETS[v].chk; syncChk(); } }
            if (key === 'd') { state.d = Q3[v]; var md = $('#mcD'); if (md) { md.value = state.d; } state.lost = Math.max(0.5, Math.round(state.d * 0.075 * 2) / 2); var ml = $('#mcL'); if (ml) ml.value = state.lost; miniCalc(); }
            if (key === 'adm') state.adm = Q4[v];
            if (key === 'crm') state.crm = v;
            if (key === 'server') state.server = v;
            var next = q.nextElementSibling;
            if (next && next.classList.contains('q')) { var f = $('.opt', next); if (f) f.focus({ preventScroll: true }); }
          }
          push('quiz_answer', { q: key, value: v });
          state.answered = true;
          buildPreset();
        });
      });
    });
    $('#skipQuiz').addEventListener('click', function () { push('quiz_skip'); state.seg = state.seg || 'other'; buildPreset(true); });
    $('#showBuild').addEventListener('click', function () { push('quiz_done', { segment: state.seg }); state.seg = state.seg || 'other'; buildPreset(true); });
    $$('.preset-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.seg = b.getAttribute('data-seg');
        $$('.q[data-q=seg] .opt').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === state.seg ? 'true' : 'false'); });
        buildPreset();
      });
    });
  }

  function buildPreset(force) {
    var seg = state.seg || 'other', p = PRESETS[seg];
    var chans = state.chans.length ? state.chans : p.chan;
    var on = {};
    ITEMS.forEach(function (i) { on[i.id] = false; });
    on.zapusk = on.soprov = true;
    chans.forEach(function (c) { if (byId[c]) on[c] = true; });   // WhatsApp тоже включается, но идёт строкой «после подключения»
    p.opt.forEach(function (o) { on[o] = true; });
    if (on.panel && state.adm && state.adm < 2) on.panel = false;
    if (state.server === 'yes') on.server = true;
    if (state.server === 'no') on.server = false;
    byId.staff.qty = state.adm ? (state.adm === 5 ? 3 : state.adm === 8 ? 5 : 0) : (p.staff || 0);
    on.staff = byId.staff.qty > 0;
    byId.soprov.hidden = !!on.ext;
    state.on = on;
    state.custom = {};
    (p.custom || []).forEach(function (c) { state.custom[c] = true; });
    if (state.crm === 'yes') state.custom.crm = true;
    if (state.crm === 'no' && !(p.custom || []).length) delete state.custom.crm;
    if (!state.chkTouched) { state.chk = p.chk; syncChk(); }
    var label = { salon: 'салон', prod: 'производство', shop: 'магазин', other: 'ваш бизнес' }[seg];
    var nCh = chans.filter(function (c) { return on[c]; }).length, nOpt = p.opt.length;
    $('#presetLine').textContent = 'Собрали под ' + label + ': ' + nCh + ' ' + plural(nCh, 'канал', 'канала', 'каналов') + ', ' + nOpt + ' ' + plural(nOpt, 'опция', 'опции', 'опций') + '. Всё можно включить или снять.';
    $('#build').hidden = false;
    $('#total').hidden = false;
    $('#lead').hidden = false;
    renderItems();
    push('preset_built', { segment: seg });
    if (force || state.answered) { setTimeout(function () { $('#build').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, 80); }
  }

  function plural(n, a, b, c) { var m = n % 10, h = n % 100; if (h > 10 && h < 20) return c; if (m === 1) return a; if (m > 1 && m < 5) return b; return c; }

  /* ---------- состав ---------- */
  function renderItems() {
    ['base', 'chan', 'opt', 'tz'].forEach(function (g) {
      var box = $('#g-' + g); box.innerHTML = '';
      ITEMS.filter(function (i) { return i.group === g && !i.hidden; }).forEach(function (i) { box.appendChild(rowFor(i)); });
    });
    recalc();
  }

  function rowFor(i) {
    var el = document.createElement('div');
    el.className = 'el' + (state.on[i.id] ? ' on' : '') + (i.lock ? ' lock' : '') + (i.group === 'tz' ? ' tz' : '');
    var ctrl;
    if (i.lock) {
      ctrl = '<span class="sw" role="switch" aria-checked="true" aria-disabled="true" aria-label="Входит всегда" style="background:#1F63BC;cursor:default"></span>';
    } else if (i.group === 'tz') {
      ctrl = '<button class="btn btn-light btn-sm" data-custom="' + i.id + '" aria-pressed="' + (state.custom[i.id] ? 'true' : 'false') + '">' + (state.custom[i.id] ? 'В составе' : 'Обсудить') + '</button>';
    } else {
      var blocked = i.needsStaff && state.adm && state.adm < i.needsStaff;
      ctrl = '<button class="sw" role="switch" aria-checked="' + (state.on[i.id] ? 'true' : 'false') + '" aria-label="' + i.name + '" data-toggle="' + i.id + '"' + (blocked ? ' disabled' : '') + '></button>';
    }
    var price;
    if (i.group === 'tz') price = '<div class="el__price">от ' + fmt(TZ_FROM) + '<small>' + fmt(TZ_RATE) + ' за час</small></div>';
    else if (i.id === 'staff') price = '<div class="el__price">' + fmt(i.monthly) + '<small>в месяц за каждого · <button class="qty" data-q="-1" aria-label="Меньше">−</button> <b id="staffQty">' + i.qty + '</b> <button class="qty" data-q="1" aria-label="Больше">+</button></small></div>';
    else {
      var parts = [];
      if (i.once) parts.push(fmt(i.once) + ' <small>разово</small>');
      if (i.monthly) parts.push(fmt(i.monthly) + ' <small>в месяц</small>');
      price = '<div class="el__price">' + parts.join('<br>') + '</div>';
    }
    var badges = '';
    if (i.lock) badges += '<span class="el__badge">входит всегда</span>';
    if (i.soon) badges += '<span class="el__badge" style="background:#D6E5F7;color:#1F63BC">скоро</span>';
    if (i.request) badges += '<span class="el__badge" style="background:#FFF3E0;color:#9A5A00">по запросу</span>';
    var dot = i.dot ? '<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + i.dot + ';margin-right:6px;vertical-align:1px"></i>' : '';
    el.innerHTML = ctrl + '<div><div class="el__name">' + dot + i.name + badges + '</div><div class="el__desc">' + i.desc + (i.needsStaff && state.adm && state.adm < i.needsStaff ? ' · нужно от 2 сотрудников' : '') + '</div>' + (i.thirdNote ? '<div class="el__plus">' + i.thirdNote + '</div>' : '') + '</div>' + price;
    return el;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]');
    if (t) {
      var id = t.getAttribute('data-toggle'), i = byId[id], now = !state.on[id];
      state.on[id] = now;
      if (i.replaces) { byId[i.replaces].hidden = now; }
      if (id === 'staff' && now && i.qty === 0) i.qty = 1;
      push('item_toggle', { id: id, on: now });
      renderItems(); return;
    }
    var c = e.target.closest('[data-custom]');
    if (c) { var cid = c.getAttribute('data-custom'); state.custom[cid] = !state.custom[cid]; push('item_custom_click', { id: cid }); renderItems(); return; }
    var q = e.target.closest('.qty');
    if (q) { byId.staff.qty = Math.max(0, Math.min(20, byId.staff.qty + (+q.getAttribute('data-q')))); state.on.staff = byId.staff.qty > 0; renderItems(); return; }
    var r = e.target.closest('#restore');
    if (r) { buildPreset(); return; }
    var l = e.target.closest('#lighter');
    if (l) { state.on.panel = false; state.on.server = false; state.on.ext = false; push('too_expensive_hint_used'); renderItems(); return; }
  });

  /* ---------- итог ---------- */
  var lastOnce = 0, lastMonthly = 0;
  function recalc() {
    var once = 0, monthly = 0, third = 0, later = 0, soonMonthly = 0, soonOnce = 0, soonNames = [], list = [];
    ITEMS.forEach(function (i) {
      if (i.group === 'tz') { if (state.custom[i.id]) list.push({ id: i.id, title: i.name, custom: true }); return; }
      if (!state.on[i.id]) return;
      if (i.replaces && state.on[i.id]) { /* расширенное вместо обычного */ }
      var m = i.monthly * (i.qty != null ? i.qty : 1);
      third += i.third || 0;
      if (i.request) { later += i.once || 0; }                       // WhatsApp: деньги после подключения, в первый платёж не входит
      else if (i.soon) { soonMonthly += m; soonOnce += i.once || 0; soonNames.push(i.name); } // «скоро»: до готовности не оплачивается
      else { once += i.once || 0; monthly += m; }
      list.push({ id: i.id, title: i.name, once: i.once || 0, monthly: m, thirdParty: i.third || 0, status: i.request ? 'request' : i.soon ? 'soon' : 'ready' });
    });
    if (state.on.ext) monthly -= byId.soprov.monthly;
    var first = once + 3 * (state.on.ext ? byId.ext.monthly : byId.soprov.monthly);
    var loss = lossCalc();
    var chk = state.chk;
    var payback = Math.max(1, Math.ceil(first / (chk * CONV[state.seg || 'other'])));
    $('#tSoon').hidden = !soonNames.length;
    if (soonNames.length) $('#tSoon').innerHTML = '<span>Когда будут готовы: ' + soonNames.join(', ').toLowerCase() + '</span><b>+ ' + fmt(soonMonthly) + '/мес' + (soonOnce ? ' и ' + fmt(soonOnce) + ' разово' : '') + '</b>';
    $('#tLater').hidden = !later;
    if (later) $('#tLater').innerHTML = '<span>WhatsApp — после подключения, по факту</span><b>+ ' + fmt(later) + '</b>';

    animateNum($('#tOnce'), lastOnce, once); lastOnce = once;
    animateNum($('#tMonthly'), lastMonthly, monthly); lastMonthly = monthly;
    $('#tFirst').textContent = fmt(first);
    $('#tThird').textContent = third ? '+ площадкам ~' + fmt(third) + ' в месяц, не нам' : 'Площадкам платить не нужно';
    $('#tLoss').textContent = fmt(loss.total);
    $('#tLossNote').textContent = '≈ ' + loss.lost.toLocaleString('ru-RU') + ' ' + plural(Math.round(loss.lost), 'заявка', 'заявки', 'заявок') + ' в неделю по ' + fmt(chk) + ' + ' + Math.round(loss.hours) + ' ч на перещёлкивание каналов';
    $('#tPayback').textContent = payback + ' ' + plural(payback, 'заявку', 'заявки', 'заявок');
    $('#tVs').textContent = 'считаем по марже ' + Math.round(CONV[state.seg || 'other'] * 100) + ' % с заявки; дальше ' + fmt(monthly) + ' в месяц против ≈ ' + fmt(loss.total) + ' потерь';
    var customs = list.filter(function (x) { return x.custom; }).length;
    $('#tCustom').hidden = !customs;
    var onlyBase = !ITEMS.some(function (i) { return i.group === 'chan' && state.on[i.id]; });
    $('#tEmpty').hidden = !onlyBase;
    $('#tHint').hidden = !(once > 60000 || monthly > 8000);
    if (once > 60000 || monthly > 8000) push('too_expensive_hint_shown');
    // мобильная плашка
    $('#barOnce').textContent = fmt(first); $('#barMonthly').textContent = fmt(monthly) + ' в месяц';
    // состав для формы
    state.totals = { once: once, monthly: monthly, thirdParty: third, first: first, soonMonthly: soonMonthly, soonOnce: soonOnce, later: later };
    state.list = list; state.loss = { perMonth: Math.round(loss.total), payback: payback };
    $('#sostav').innerHTML = '<b>Состав:</b> ' + list.map(function (x) { return x.title + (x.custom ? ' (под ТЗ)' : ''); }).join(' · ') + '.<br><b>Разово</b> ' + fmt(once) + ' · <b>в месяц</b> ' + fmt(monthly) + (third ? ' · площадкам ~' + fmt(third) : '');
  }

  // потери: заявки без ответа × 4,33 недели × средний чек × доля, которая стала бы покупкой/маржой (правка оппонента 09.09:
  // без этой доли производство при чеке 40 000 «теряло» 260 000 ₽/мес). Часы сотрудников не считаем.
  var CONV = { salon: 0.6, prod: 0.3, shop: 0.5, other: 0.4 };
  function lossCalc() {
    var d = state.d || 20, ch = Math.max(2, ITEMS.filter(function (i) { return i.group === 'chan' && state.on[i.id]; }).length), adm = state.adm || 1, chk = state.chk;
    var lost = state.lost != null ? state.lost : Math.max(0.5, Math.round(d * 0.075 * 2) / 2);
    var money = lost * 4.33 * chk * CONV[state.seg || 'other'];
    var hours = (40 * ch * 20 / 60 + 20 + d * 0.25) * 26 / 60 * Math.min(adm, 3);
    return { lost: lost, money: money, hours: hours, total: money };
  }
  function syncChk() { var c = $('#chk'); if (c) { c.value = state.chk; } var v = $('#chkV'); if (v) v.textContent = fmt(state.chk); miniCalc(); }
  function miniCalc() {
    var t = $('#mcTotal'); if (!t) return;
    var l = lossCalc();
    $('#mcDv').textContent = state.d || 20; $('#mcLv').textContent = l.lost.toLocaleString('ru-RU');
    t.textContent = fmt(l.total);
    $('#mcNote').textContent = l.lost.toLocaleString('ru-RU') + ' в неделю × 4,3 недели × ' + fmt(state.chk) + ' × ' + Math.round(CONV[state.seg || 'other'] * 100) + ' % (доля, которая стала бы покупкой)';
    $('#mcOne').textContent = fmt(state.chk);
  }

  function animateNum(el, from, to) {
    if (!el) return;
    if (reduced || !window.gsap || document.hidden || from === to) { el.textContent = fmt(to); return; }
    var o = { v: from };
    gsap.to(o, { v: to, duration: .32, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v); }, onComplete: function () { el.textContent = fmt(to); } });
  }

  /* ---------- чек клиента ---------- */
  var chkInput = $('#chk');
  if (chkInput) chkInput.addEventListener('input', function () { state.chk = +chkInput.value; state.chkTouched = true; $('#chkV').textContent = fmt(state.chk); miniCalc(); recalc(); });
  var mcD = $('#mcD'), mcL = $('#mcL');
  if (mcD) mcD.addEventListener('input', function () { state.d = +mcD.value; miniCalc(); recalc(); });
  if (mcL) mcL.addEventListener('input', function () { state.lost = +mcL.value; miniCalc(); recalc(); });

  /* ---------- форма ---------- */
  function initForm() {
    var form = $('#leadForm'); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['name', 'contact', 'business'].forEach(function (n) {
        var f = form.elements[n], wrap = f.closest('.field');
        var bad = !f.value.trim() || (n === 'contact' && !/(\+?\d[\d\s\-()]{9,}|@[\w\d_]{4,})/.test(f.value));
        wrap.classList.toggle('bad', bad); if (bad) ok = false;
      });
      if (!form.elements.agree.checked) { ok = false; $('#agreeErr').style.display = 'block'; } else $('#agreeErr').style.display = 'none';
      if (form.elements.site.value) return; // honeypot
      if (!ok) return;
      var payload = {
        name: form.elements.name.value.trim(), contact: form.elements.contact.value.trim(), business: form.elements.business.value.trim(),
        time: form.elements.time.value, answers: { seg: state.seg, chans: state.chans, d: state.d, adm: state.adm, crm: state.crm, server: state.server, chk: state.chk },
        items: state.list, totals: state.totals, loss: state.loss, page: location.href, ts: new Date().toISOString()
      };
      push('lead_submit', { once: state.totals.once, monthly: state.totals.monthly });
      var btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Отправляем…';
      var done = function () { form.hidden = true; $('#formOk').style.display = 'block'; $('#okSostav').innerHTML = $('#sostav').innerHTML; };
      var fail = function () { btn.disabled = false; btn.textContent = 'Отправить состав'; $('#formErr').style.display = 'block'; };
      if (LEAD_ENDPOINT) {
        fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) throw 0; done(); }).catch(fail);
      } else {
        // запасной путь: без сервера-приёмника заявка не отправляется, показываем состав и ссылку в Telegram
        var text = 'Здравствуйте! Собрал состав Ветра на сайте.\n' + $('#sostav').innerText + '\nБизнес: ' + payload.business + '\nИмя: ' + payload.name + '\nСвязь: ' + payload.contact;
        if (TG_USER) window.open('https://t.me/' + TG_USER + '?text=' + encodeURIComponent(text), '_blank');
        try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (err) {}
        $('#formOk .t').textContent = TG_USER ? 'Открыли чат в Telegram — текст с составом уже в поле ввода, нажмите «Отправить».' : 'Приёмник заявок ещё не подключён. Состав скопирован в буфер — пришлите его нам в Telegram.';
        done();
      }
    });
    $$('.time-opt').forEach(function (b) { b.addEventListener('click', function () { $$('.time-opt').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); form.elements.time.value = b.textContent; }); });
  }

  /* ---------- кнопка «Посчитать» ---------- */
  $$('[data-go-calc]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var k = $('#konstruktor');
      k.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { var f = $('.q[data-q=seg] .opt'); if (f) f.focus({ preventScroll: true }); }, reduced ? 0 : 560);
      push('calc_open', { from: a.getAttribute('data-go-calc') });
    });
  });

  /* ---------- мобильная плашка ---------- */
  function initBar() {
    var bar = $('#totalbar'), k = $('#konstruktor'); if (!bar || !k || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) { bar.classList.toggle('show', en[0].isIntersecting && !$('#build').hidden); }, { rootMargin: '-64px 0px 0px 0px', threshold: 0 });
    io.observe(k);
    $('#barBtn').addEventListener('click', function () { $('#total').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
  }

  /* ---------- видео ---------- */
  function initVideo() {
    var v = $('#promo'), b = $('#playBtn'); if (!v || !b) return;
    b.addEventListener('click', function () { v.controls = true; v.muted = false; v.play(); b.classList.add('hidden'); push('video_play'); });
    v.addEventListener('pause', function () { if (v.currentTime > 0 && !v.ended) return; });
    var hl = $('#heroLoop');
    if (hl) { hl.addEventListener('error', function () { hl.hidden = true; var w = $('#heroWindow'); if (w) w.hidden = false; }); }
  }

  /* ---------- анимации ---------- */
  function initMotion() {
    // счётчики в hero
    $$('[data-count]').forEach(function (el) {
      var to = +el.getAttribute('data-count'), suf = el.getAttribute('data-suf') || '';
      if (reduced || !window.gsap) { el.textContent = to + suf; return; }
      var o = { v: 0 }; gsap.to(o, { v: to, duration: 1.2, ease: 'power3.out', delay: .4, onUpdate: function () { el.textContent = Math.round(o.v) + suf; } });
    });
    // появления
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
      $$('.rv,.mask').forEach(function (el) { io.observe(el); });
    } else { $$('.rv,.mask').forEach(function (el) { el.classList.add('in'); }); }
    if (reduced || !window.gsap || !window.ScrollTrigger) { $$('.story__step').forEach(function (s) { s.classList.add('on'); }); return; }
    gsap.registerPlugin(ScrollTrigger);

    // параллакс пятен и чипов в hero
    $$('.hero .blob').forEach(function (b, i) { gsap.to(b, { yPercent: (i % 2 ? -1 : 1) * 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }); });
    gsap.to('.hero .laptop', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    $$('.plx').forEach(function (el) { var s = +(el.getAttribute('data-plx') || 20); gsap.fromTo(el, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }); });

    // залипающая история
    var story = $('#story'); if (!story) return;
    var steps = $$('.story__step'), dots = $$('.story__dots i');
    var scenes = { chaos: $('#scChaos'), connect: $('#scConnect'), phone: $('#scPhone'), desk: $('#scDesk') };
    var tl = gsap.timeline({ paused: true });
    // 0 хаос
    tl.addLabel('s0');
    tl.set(scenes.chaos, { autoAlpha: 1 });
    $$('.bub', scenes.chaos).forEach(function (b, i) { tl.from(b, { autoAlpha: 0, y: 40 + i * 6, x: (i % 2 ? 30 : -30), rotate: (i % 2 ? 6 : -6), duration: .5 }, 's0+=' + (i * .12)); });
    // 1 подключение: пузыри улетают, карточки каналов загораются
    tl.addLabel('s1', '+=.6');
    tl.to($$('.bub', scenes.chaos), { autoAlpha: 0, scale: .6, y: -60, stagger: .05, duration: .5 }, 's1');
    tl.fromTo(scenes.connect, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .5 }, 's1+=.2');
    $$('.cc', scenes.connect).forEach(function (c, i) { tl.add(function () { c.classList.toggle('done', tl.time() >= tl.labels.s1 + .4 + i * .25); }, 's1+=' + (.4 + i * .25)); });
    // 2 телефон
    tl.addLabel('s2', '+=1.2');
    tl.to(scenes.connect, { autoAlpha: 0, scale: .9, duration: .4 }, 's2');
    tl.fromTo(scenes.phone, { autoAlpha: 0, y: 120, rotateX: 18 }, { autoAlpha: 1, y: 0, rotateX: 0, duration: .8, ease: 'power3.out' }, 's2+=.2');
    $$('.msg', scenes.phone).forEach(function (m, i) { tl.from(m, { autoAlpha: 0, y: 14, duration: .35 }, 's2+=' + (.8 + i * .3)); });
    // 3 ПК
    tl.addLabel('s3', '+=1.2');
    tl.to(scenes.phone, { autoAlpha: 0, x: -140, scale: .8, duration: .5 }, 's3');
    tl.fromTo(scenes.desk, { autoAlpha: 0, y: 80, rotateX: 12 }, { autoAlpha: 1, y: 0, rotateX: 0, duration: .8, ease: 'power3.out' }, 's3+=.2');
    tl.from($$('.kpi', scenes.desk), { autoAlpha: 0, y: 12, stagger: .12, duration: .4 }, 's3+=.7');
    tl.fromTo($$('.bars i', scenes.desk), { '--w': '0%' }, { '--w': function (i, el) { return el.getAttribute('data-w'); }, stagger: .1, duration: .6 }, 's3+=.9');
    tl.addLabel('end', '+=.8');

    function setStep(n) { steps.forEach(function (s, i) { s.classList.toggle('on', i === n); }); dots.forEach(function (d, i) { d.classList.toggle('on', i <= n); }); }
    setStep(0);
    var labels = ['s0', 's1', 's2', 's3'];
    ScrollTrigger.matchMedia({
      '(min-width: 901px)': function () {
        ScrollTrigger.create({
          trigger: story, start: 'top top', end: '+=320%', pin: '.story__pin', scrub: .6, animation: tl,
          onUpdate: function (st) {
            var t = st.progress * tl.duration(), n = 0;
            labels.forEach(function (l, i) { if (t >= tl.labels[l] - .01) n = i; });
            setStep(n);
          }
        });
      },
      '(max-width: 900px)': function () {
        $$('.story__step').forEach(function (s) { s.classList.add('on'); });
        ScrollTrigger.create({ trigger: story, start: 'top 70%', end: 'bottom 30%', scrub: .6, animation: tl });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initQuiz(); syncChk(); renderItems(); initForm(); initBar(); initVideo(); initMotion();
    $('#build').hidden = true;
  });
})();
