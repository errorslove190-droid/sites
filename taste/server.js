// Библиотека вкуса — личная (Михаил). Прогонная живёт отдельно и на другом порту.
// Запуск: node server.js  →  http://localhost:4701
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4701;
const ROOT = __dirname;
const SCREENS = path.join(ROOT, 'screens');
const META = path.join(ROOT, 'data', 'metadata.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

const listScreens = () => fs.existsSync(SCREENS)
  ? fs.readdirSync(SCREENS).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f)).sort()
  : [];

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/api/data') {
    const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    res.end(JSON.stringify({ files: listScreens(), meta }));
    return;
  }

  const file = path.join(ROOT, url === '/' ? 'index.html' : url.slice(1));
  if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
    return;
  }

  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log('Библиотека вкуса (личная): http://localhost:' + PORT));
