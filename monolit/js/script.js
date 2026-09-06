// МОНОЛИТ — окна в hero, reveal-анимации, демо-форма
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Сигнатура: окна дома зажигаются по очереди после загрузки ---
  var scene = document.getElementById('dusk-scene');
  if (scene) {
    if (reduceMotion) {
      scene.classList.add('lit'); // CSS уже отключил переходы — окна горят сразу
    } else {
      window.setTimeout(function () { scene.classList.add('lit'); }, 500);
    }
  }

  // --- Reveal при скролле ---
  var revealed = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('visible'); });
  }

  // --- Демо-форма расчёта сметы ---
  var form = document.getElementById('calc-form');
  var errorBox = document.getElementById('form-error');
  var successBox = document.getElementById('form-success');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var digits = phone.replace(/\D/g, '');

      var problems = [];
      if (!name) problems.push('имя');
      if (digits.length < 10) problems.push('телефон (минимум 10 цифр)');

      if (problems.length) {
        errorBox.textContent = 'Проверьте, пожалуйста: ' + problems.join(' и ') + '.';
        errorBox.hidden = false;
        (name ? form.elements.phone : form.elements.name).focus();
        return;
      }

      errorBox.hidden = true;
      form.hidden = true;
      successBox.hidden = false;
      successBox.focus && successBox.setAttribute('tabindex', '-1');
      successBox.focus();
    });
  }
})();
