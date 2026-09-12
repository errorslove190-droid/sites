document.querySelectorAll('[data-version]').forEach(link => {
  const url = new URL(link.href);
  url.search = location.search;
  url.hash = location.hash;
  link.href = url.href;
});
