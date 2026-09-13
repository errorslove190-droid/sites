const slides = [...document.querySelectorAll('.slide')];
const mode = document.getElementById('mode');
const pager = document.querySelector('.pager');
const previous = document.getElementById('prev');
const next = document.getElementById('next-slide');
let current = Math.max(0, slides.findIndex(slide => '#' + slide.id === location.hash));
let showing = false;
function select(index, scroll = true) {
  current = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, i) => slide.classList.toggle('current', i === current));
  document.querySelectorAll('.chapters a').forEach(link => {
    if (link.hash === '#' + slides[current].id) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('counter').textContent = `${current + 1} / ${slides.length}`;
  previous.disabled = current === 0;
  next.disabled = current === slides.length - 1;
  if (slides[current].id !== 'video') document.getElementById('promo').pause();
  if (scroll) slides[current].scrollIntoView({behavior:'instant', block:'start'});
}
mode.addEventListener('click', () => {
  showing = !showing;
  document.body.classList.toggle('show-mode', showing);
  mode.setAttribute('aria-pressed', String(showing));
  mode.textContent = showing ? 'Все слайды' : 'Режим показа';
  pager.hidden = !showing;
  select(current);
});
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const index = slides.findIndex(slide => '#' + slide.id === link.hash);
  if (index < 0) return;
  event.preventDefault();
  history.pushState(null, '', link.hash);
  select(index);
}));
window.addEventListener('hashchange', () => {
  const index = slides.findIndex(slide => '#' + slide.id === location.hash);
  if (index >= 0) select(index);
});
previous.addEventListener('click', () => select(current - 1));
next.addEventListener('click', () => select(current + 1));
document.getElementById('print').addEventListener('click', () => window.print());
const zoom = document.getElementById('zoom');
document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
  const image = document.getElementById('zoom-image');
  image.src = button.dataset.zoom;
  image.alt = button.querySelector('img').alt;
  document.getElementById('zoom-caption').textContent = button.dataset.caption;
  document.getElementById('original').href = button.dataset.zoom;
  zoom.showModal();
}));
document.getElementById('close-zoom').addEventListener('click', () => zoom.close());
zoom.addEventListener('click', event => { if (event.target === zoom) {const r = zoom.getBoundingClientRect();if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) zoom.close();} });
document.addEventListener('keydown', event => {
  if (zoom.open || !showing || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT|VIDEO/.test(event.target.tagName)) return;
  if (event.key === 'ArrowRight') {event.preventDefault();select(current + 1);}
  if (event.key === 'ArrowLeft') {event.preventDefault();select(current - 1);}
  if (event.key === 'Escape') mode.click();
});
const observer = new IntersectionObserver(entries => {
  if (showing) return;
  const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) select(slides.indexOf(visible.target), false);
}, {rootMargin:'-115px 0px -30% 0px', threshold:[0,0.2,0.5]});
slides.forEach(slide => observer.observe(slide));
select(current, false);
