const field = document.querySelector('#competitor-search');
const products = [...document.querySelectorAll('.product')];
function filterProducts() {
  const terms = field.value.trim().toLocaleLowerCase('ru').split(/\s+/).filter(Boolean);
  let count = 0;
  for (const product of products) {
    const show = terms.every(term => product.dataset.search.includes(term));
    product.hidden = !show;
    if (show) count++;
  }
  document.querySelector('#search-status').textContent = `Показано ${count} из ${products.length}`;
  document.querySelector('#no-results').hidden = count !== 0;
}
field.addEventListener('input', filterProducts);
document.querySelector('#clear-search').addEventListener('click', () => { field.value = ''; filterProducts(); field.focus(); });
window.addEventListener('beforeprint', () => { for (const d of document.querySelectorAll('details')) { d.dataset.printOpen = d.open ? '1' : '0'; d.open = true; } });
window.addEventListener('afterprint', () => { for (const d of document.querySelectorAll('details')) d.open = d.dataset.printOpen === '1'; });
