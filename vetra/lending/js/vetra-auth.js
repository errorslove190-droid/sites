/* ================================================================
   Ветра — вход и регистрация на login.html.
   Работает поверх window.Vetra (js/vetra-db.js).

   Обе формы устроены одинаково: шаг «почта» → письмо с кодом →
   шаг «код» → личный кабинет.
   ================================================================ */
(function () {
  'use strict';

  var forms = document.querySelectorAll('[data-auth]');
  if (!forms.length) return;

  var AFTER_LOGIN = 'app.html';

  function note(form, text, bad) {
    var el = form.querySelector('[data-form-note]');
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.style.color = bad ? 'var(--red, #c0392b)' : '';
  }

  function busy(form, on, label) {
    var btn = form.querySelector('[data-step]:not([hidden]) button[type=submit]');
    if (!btn) return;
    if (on) {
      btn.dataset.idle = btn.dataset.idle || btn.textContent;
      btn.textContent = label || 'Секунду…';
      btn.disabled = true;
    } else {
      if (btn.dataset.idle) btn.textContent = btn.dataset.idle;
      btn.disabled = false;
    }
  }

  function step(form, name) {
    form.querySelectorAll('[data-step]').forEach(function (block) {
      block.hidden = block.dataset.step !== name;
    });
    var first = form.querySelector('[data-step]:not([hidden]) input');
    if (first) first.focus();
  }

  function values(form) {
    var out = {};
    form.querySelectorAll('input[name]').forEach(function (i) {
      out[i.name] = i.type === 'checkbox' ? i.checked : i.value;
    });
    return out;
  }

  /* Своя проверка: браузерная не годится — на втором шаге поля
     первого шага спрятаны, и required у них ломает отправку. */
  function firstEmpty(form) {
    var block = form.querySelector('[data-step]:not([hidden])');
    var bad = null;
    block.querySelectorAll('input[required]').forEach(function (i) {
      if (bad) return;
      var empty = i.type === 'checkbox' ? !i.checked : !i.value.trim();
      if (empty) bad = i;
    });
    return bad;
  }

  forms.forEach(function (form) {
    var mode = form.dataset.auth;            // 'in' — вход, 'up' — регистрация
    var email = '';

    form.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        note(form, '', false);
        form.querySelector('[data-form-note]').hidden = true;
        step(form, 'email');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!window.Vetra) {
        note(form, 'Не загрузился файл js/vetra-db.js.', true);
        return;
      }

      var empty = firstEmpty(form);
      if (empty) {
        note(form, empty.type === 'checkbox' ? 'Нужно согласие с офертой.' : 'Заполните поле выше.', true);
        empty.focus();
        return;
      }

      var v = values(form);
      var onCodeStep = !form.querySelector('[data-step=code]').hidden;

      /* --- шаг 2: проверяем код --- */
      if (onCodeStep) {
        var code = (v.code || '').replace(/\D/g, '');
        if (code.length !== 6) {
          note(form, 'Код — шесть цифр из письма.', true);
          return;
        }
        busy(form, true, 'Проверяем…');
        Vetra.verify(email, code).then(function (r) {
          busy(form, false);
          if (!r.ok) { note(form, r.message, true); return; }
          note(form, 'Готово, открываем кабинет…', false);
          location.href = AFTER_LOGIN;
        });
        return;
      }

      /* --- шаг 1: просим письмо с кодом --- */
      email = (v.email || '').trim().toLowerCase();
      busy(form, true, 'Отправляем письмо…');

      var request = mode === 'up'
        ? Vetra.signUp({ name: v.name, company: v.company, email: email })
        : Vetra.signIn(email);

      request.then(function (r) {
        busy(form, false);
        if (!r.ok) { note(form, r.message, true); return; }
        var echo = form.querySelector('[data-echo-email]');
        if (echo) echo.textContent = email;
        step(form, 'code');
        note(form, 'Письмо с кодом ушло на ' + email + '. Код живёт час.', false);
      });
    });
  });

  /* Если человек уже вошёл — сразу в кабинет, форма ему не нужна. */
  if (window.Vetra && Vetra.ready()) {
    Vetra.me().then(function (user) {
      if (user) location.replace(AFTER_LOGIN);
    });
  }
})();
