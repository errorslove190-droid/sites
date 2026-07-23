// Помечаем, что JS работает — только тогда CSS прячет элементы для анимации
document.documentElement.classList.add('js');

// Мобильное меню
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  burger.classList.toggle('is-open');
  nav.classList.toggle('is-open');
});

// Закрываем меню при клике на пункт
nav.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
  });
});

// Плавное появление секций при скролле
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Страховка: если observer почему-то не сработал за 1.5с — показываем всё без анимации
setTimeout(() => {
  if (!document.querySelector('.reveal.is-visible')) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  }
}, 1500);

// Текущий год в подвале
document.getElementById('year').textContent = new Date().getFullYear();
