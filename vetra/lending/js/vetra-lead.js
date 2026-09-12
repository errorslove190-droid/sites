/* ================================================================
   Ветра — приём заявок.
   Любая форма с атрибутом data-lead="источник" отправляет свои поля
   на российский сервер Ветры: POST {LEAD_API_URL}/api/leads.
   Если адрес ещё не задан, данные никуда не уходят и успех не показывается.
   ================================================================ */
(function () {
  'use strict';

  var cfg = window.VETRA_CONFIG || {};
  var apiBase = String(cfg.LEAD_API_URL || '').replace(/\/$/, '');

  function sendLead(data) {
    if (!apiBase) {
      return Promise.resolve({
        ok: false,
        message: 'Приём заявок пока настраивается. Мы не получили ваши данные.'
      });
    }

    return fetch(apiBase + '/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || body.ok !== true) {
          return { ok: false, message: body.error || 'Не получилось отправить заявку. Попробуйте позже.' };
        }
        return { ok: true };
      });
    }).catch(function () {
      return { ok: false, message: 'Нет связи с сервером. Мы не получили ваши данные.' };
    });
  }

  document.querySelectorAll('[data-lead]').forEach(function (form) {
    var okText = form.dataset.leadOk || 'Заявка принята. Свяжемся в течение рабочего дня.';

    /* Строка ответа может стоять и внутри формы, и рядом с ней */
    function note(text, bad) {
      var el = form.querySelector('[data-form-note]') ||
               (form.parentElement && form.parentElement.querySelector('[data-form-note]'));
      if (!el) return;
      el.hidden = false;
      el.textContent = text;
      el.style.color = bad ? 'var(--red, #c0392b)' : '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = { source: form.dataset.lead };
      form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (i) {
        if (i.type === 'checkbox' || i.type === 'button') return;
        if (i.type === 'radio' && !i.checked) return;
        data[i.name] = i.value;
      });

      var btn = form.querySelector('button[type=submit]');
      var idle = btn && btn.textContent;
      if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

      data.page = location.pathname;

      sendLead(data).then(function (r) {
        if (btn) { btn.disabled = false; btn.textContent = idle; }
        if (!r.ok) { note(r.message, true); return; }
        note(okText, false);
        form.querySelectorAll('input[type=email], input[type=tel], input[type=text]:not([type=radio])')
            .forEach(function (i) { if (i.name !== 'company') i.value = ''; });
      });
    });
  });
})();
