// Собирает статический data.json для опубликованной копии (GitHub Pages).
// Запуск: node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SCREENS = path.join(ROOT, 'screens');
const META = path.join(ROOT, 'data', 'metadata.json');

const files = fs.existsSync(SCREENS)
  ? fs.readdirSync(SCREENS).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f)).sort()
  : [];
const meta = JSON.parse(fs.readFileSync(META, 'utf8'));

fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify({ files, meta }, null, 2), 'utf8');

const undescribed = files.filter(f => !meta.screens[f]);
console.log('референсов: ' + files.length + ' · семей: ' + Object.keys(meta.families).length);
if (undescribed.length) console.log('НЕ РАЗОБРАНО (' + undescribed.length + '): ' + undescribed.join(', '));
