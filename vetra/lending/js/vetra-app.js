/* ================================================================
   Ветра — личный кабинет: пускаем только своих и подставляем имя.
   Пока база не подключена, страница остаётся макетом и открыта всем.
   ================================================================ */
(function () {
  'use strict';
  if (!window.Vetra || !Vetra.ready()) return;

  Vetra.requireAuth().then(function (user) {
    if (!user) return;                       // requireAuth уже увёл на login

    var name = user.name || user.email.split('@')[0];

    var n = document.querySelector('[data-user-name]');
    if (n) n.textContent = name;

    var c = document.querySelector('[data-user-company]');
    if (c && user.company) c.textContent = user.company;

    var a = document.querySelector('[data-user-initial]');
    if (a) { a.textContent = name.charAt(0).toUpperCase(); a.title = name; }
  });

  document.querySelectorAll('[data-signout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      Vetra.signOut().then(function () { location.href = 'index.html'; });
    });
  });
})();
