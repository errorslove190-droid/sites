'use strict';

/* Трекер еды и тренировок. Telegram Mini App, без сервера:
   данные лежат в облаке Telegram (CloudStorage), в браузере — в localStorage. */

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

const GOAL = { kcal: 2700, p: 110, f: 60, c: 430 };

/* Программа из плана: три дня, каждая мышца дважды в неделю */
const PROGRAM = {
  A: { title: 'верх тела', ex: [
    { n: 'Жим гантелей лёжа', s: '4 × 6–10' },
    { n: 'Тяга верхнего блока', s: '4 × 8–12' },
    { n: 'Жим гантелей сидя', s: '3 × 8–12' },
    { n: 'Тяга в тренажёре', s: '3 × 10–12' },
    { n: 'Бицепс + трицепс', s: '3 × 10–15' },
    { n: 'Отведения в стороны', s: '3 × 15' },
  ]},
  B: { title: 'ноги и спина', ex: [
    { n: 'Приседания', s: '4 × 6–10' },
    { n: 'Жим ногами', s: '3 × 10–12' },
    { n: 'Румынская тяга', s: '3 × 10–12' },
    { n: 'Сгибания и разгибания ног', s: '3 × 12' },
    { n: 'Гиперэкстензия', s: '3 × 15' },
    { n: 'Носки + планка', s: '3 × 15' },
  ]},
  C: { title: 'всё тело', ex: [
    { n: 'Подтягивания', s: '4 × макс' },
    { n: 'Жим гантелей на наклонной', s: '4 × 8–12' },
    { n: 'Выпады с гантелями', s: '3 × 10' },
    { n: 'Тяга гантели в наклоне', s: '3 × 10–12' },
    { n: 'Жим сидя или брусья', s: '3 × 10' },
    { n: 'Бицепс, трицепс, пресс', s: '3 × 12–15' },
  ]},
};

/* Частая еда Михаила — по одному тапу */
const QUICK = [
  { n: 'Коктейль полный',  d: 'протеин + молоко + банан + овсянка + паста', kcal: 600, p: 40, f: 16, c: 72 },
  { n: 'Протеин на молоке', d: 'порция + 300 мл',                            kcal: 280, p: 30, f: 6,  c: 25 },
  { n: 'Каша на молоке',    d: 'овсянка 80 г + масло',                       kcal: 420, p: 13, f: 12, c: 62 },
  { n: 'Яичница 3 яйца',    d: 'с хлебом',                                   kcal: 430, p: 24, f: 28, c: 20 },
  { n: 'Курица с рисом',    d: '150 г + 200 г гарнира',                      kcal: 560, p: 45, f: 12, c: 68 },
  { n: 'Творог с мёдом',    d: '200 г + ложка мёда',                         kcal: 300, p: 34, f: 5,  c: 28 },
  { n: 'Банан',             d: 'штука',                                      kcal: 105, p: 1,  f: 0,  c: 27 },
  { n: 'Орехи горсть',      d: '30 г',                                       kcal: 190, p: 5,  f: 17, c: 6  },
];

/* ---------- хранилище ---------- */

const cloudReady = !!(tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9'));

const Store = {
  get(key) {
    return new Promise(resolve => {
      if (cloudReady) {
        tg.CloudStorage.getItem(key, (err, val) => resolve(err || !val ? null : safeParse(val)));
      } else {
        resolve(safeParse(localStorage.getItem('tr_' + key)));
      }
    });
  },
  set(key, val) {
    const raw = JSON.stringify(val);
    return new Promise(resolve => {
      if (cloudReady) {
        tg.CloudStorage.setItem(key, raw, () => resolve());
      } else {
        localStorage.setItem('tr_' + key, raw);
        resolve();
      }
    });
  },
};

function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/* Ключи CloudStorage: только A-Z a-z 0-9 _ - */
function todayKey() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/* ---------- состояние ---------- */

const state = {
  day: todayKey(),
  meals: [],
  workout: null,   // { day: 'A', sets: { '0': [{w,r}] }, done: false }
  last: {},        // { 'A0': {w, r, d} } — что поднимал в прошлый раз
};

/* ---------- еда ---------- */

function sum() {
  return state.meals.reduce((a, m) => ({
    kcal: a.kcal + m.kcal, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c,
  }), { kcal: 0, p: 0, f: 0, c: 0 });
}

function renderFood() {
  const t = sum();
  const R = 52, LEN = 2 * Math.PI * R;
  const ratio = Math.min(t.kcal / GOAL.kcal, 1);
  const ring = document.getElementById('ring-kcal');
  ring.style.strokeDasharray = LEN.toFixed(1);
  ring.style.strokeDashoffset = (LEN * (1 - ratio)).toFixed(1);
  ring.classList.toggle('over', t.kcal > GOAL.kcal);

  document.getElementById('kcal-now').textContent = Math.round(t.kcal);
  const left = GOAL.kcal - t.kcal;
  document.getElementById('kcal-goal').textContent =
    left > 0 ? `осталось ${Math.round(left)}` : `перебор ${Math.round(-left)}`;

  [['p', 'белок'], ['f', 'жиры'], ['c', 'углеводы']].forEach(([k]) => {
    const bar = document.getElementById('bar-' + k);
    const pct = Math.min(t[k] / GOAL[k] * 100, 100);
    bar.style.width = pct + '%';
    bar.classList.toggle('over', t[k] > GOAL[k]);
    document.getElementById('val-' + k).textContent = `${Math.round(t[k])} / ${GOAL[k]}`;
  });

  const list = document.getElementById('meal-list');
  document.getElementById('meal-count').textContent = state.meals.length || '';
  if (!state.meals.length) {
    list.innerHTML = '<div class="empty">Сегодня пока пусто</div>';
  } else {
    list.innerHTML = '';
    state.meals.forEach((m, i) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <div class="card-main">
          <b></b>
          <small>Б ${Math.round(m.p)} · Ж ${Math.round(m.f)} · У ${Math.round(m.c)}${m.t ? ' · ' + m.t : ''}</small>
        </div>
        <div class="card-kcal">${Math.round(m.kcal)}</div>
        <button class="card-del" aria-label="Удалить">×</button>`;
      el.querySelector('b').textContent = m.n;
      el.querySelector('.card-del').addEventListener('click', () => {
        state.meals.splice(i, 1);
        saveFood();
        renderFood();
        haptic('light');
      });
      list.appendChild(el);
    });
  }
}

function addMeal(meal) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  state.meals.push({
    n: meal.n, kcal: +meal.kcal || 0, p: +meal.p || 0, f: +meal.f || 0, c: +meal.c || 0,
    t: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  });
  saveFood();
  renderFood();
  haptic('medium');
}

function saveFood() { Store.set('f' + state.day, state.meals); }

function renderQuick() {
  const box = document.getElementById('quick');
  box.innerHTML = '';
  QUICK.forEach(q => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = '<span></span><small></small>';
    b.querySelector('span').textContent = q.n;
    b.querySelector('small').textContent = q.kcal + ' ккал';
    b.addEventListener('click', () => addMeal(q));
    box.appendChild(b);
  });
}

/* ---------- тренировка ---------- */

function renderGym() {
  const day = state.workout ? state.workout.day : suggestDay();
  document.querySelectorAll('#day-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.day === day);
  });

  const prog = PROGRAM[day];
  const list = document.getElementById('ex-list');
  list.innerHTML = '';

  prog.ex.forEach((ex, i) => {
    const sets = (state.workout && state.workout.sets[i]) || [];
    const lastKey = day + i;
    const last = state.last[lastKey];

    const el = document.createElement('div');
    el.className = 'ex' + (sets.length ? ' done' : '');
    el.innerHTML = `
      <div class="ex-top"><b></b><span>${ex.s}</span></div>
      <div class="ex-last"></div>
      <div class="ex-sets"></div>`;
    el.querySelector('b').textContent = ex.n;

    const lastEl = el.querySelector('.ex-last');
    if (last) {
      lastEl.innerHTML = 'в прошлый раз: <i></i>';
      lastEl.querySelector('i').textContent = `${last.w} кг × ${last.r}`;
    } else {
      lastEl.textContent = 'первый раз — запиши, с чего начал';
    }

    const setsBox = el.querySelector('.ex-sets');
    sets.forEach((s, si) => {
      const b = document.createElement('button');
      b.className = 'set done';
      b.textContent = `${s.w} × ${s.r}`;
      b.addEventListener('click', () => {
        state.workout.sets[i].splice(si, 1);
        saveGym();
        renderGym();
        haptic('light');
      });
      setsBox.appendChild(b);
    });

    const add = document.createElement('button');
    add.className = 'set set-add';
    add.textContent = '+ подход';
    add.addEventListener('click', () => askSet(day, i, ex.n, last));
    setsBox.appendChild(add);

    list.appendChild(el);
  });

  const hint = document.getElementById('gym-hint');
  hint.textContent = state.workout && state.workout.done
    ? 'Тренировка закрыта. Красавчик.'
    : 'Каждую неделю добавляй повтор или 2,5 кг хотя бы в одном упражнении.';
}

function suggestDay() {
  const wd = new Date().getDay();          // 0 вс … 6 сб
  if (wd === 1 || wd === 2) return 'A';
  if (wd === 3 || wd === 4) return 'B';
  return 'C';
}

function askSet(day, exIndex, exName, last) {
  openSheet(exName, `
    <div class="field-row">
      <div class="field"><label>вес, кг</label><input id="in-w" type="number" inputmode="decimal" step="0.5" value="${last ? last.w : ''}"></div>
      <div class="field"><label>повторы</label><input id="in-r" type="number" inputmode="numeric" value="${last ? last.r : ''}"></div>
    </div>`, () => {
    const w = parseFloat(document.getElementById('in-w').value);
    const r = parseInt(document.getElementById('in-r').value, 10);
    if (isNaN(w) || isNaN(r)) return false;

    if (!state.workout || state.workout.day !== day) {
      state.workout = { day, sets: {}, done: false };
    }
    if (!state.workout.sets[exIndex]) state.workout.sets[exIndex] = [];
    state.workout.sets[exIndex].push({ w, r });
    state.last[day + exIndex] = { w, r, d: state.day };

    saveGym();
    Store.set('last', state.last);
    renderGym();
    haptic('medium');
    return true;
  });
}

function saveGym() { Store.set('g' + state.day, state.workout); }

/* ---------- модалка ---------- */

let sheetHandler = null;

function openSheet(title, html, onOk) {
  document.getElementById('sheet-title').textContent = title;
  document.getElementById('sheet-body').innerHTML = html;
  document.getElementById('sheet').classList.remove('hidden');
  sheetHandler = onOk;
  const first = document.querySelector('#sheet-body input');
  if (first) setTimeout(() => first.focus(), 80);
}

function closeSheet() {
  document.getElementById('sheet').classList.add('hidden');
  sheetHandler = null;
}

/* ---------- еда из чата ---------- */

/* Бот присылает ссылку вида ?startapp=m_620_45_18_62_0YHRi9GA0L3QuNC6
   — калории, белок, жир, углеводы и название в base64url. */
function consumeStartParam() {
  const raw = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
              new URLSearchParams(location.search).get('startapp');
  if (!raw) return;

  /* d_<base64url(JSON)> — сразу несколько приёмов, когда Claude заносит день целиком */
  if (raw.slice(0, 2) === 'd_') {
    const list = fromB64(raw.slice(2));
    let items = null;
    try { items = JSON.parse(list); } catch (e) { return; }
    if (!Array.isArray(items)) return;
    const known = new Set(state.meals.map(m => m.n));
    items.forEach(it => { if (!known.has(it.n)) addMeal(it); });
    return;
  }

  /* w_<день>_<номер упражнения>_<вес>_<повторы>_<сколько подходов> — тренировка из чата */
  if (raw.slice(0, 2) === 'w_') {
    const [, day, idx, w, r, n] = raw.split('_');
    if (!PROGRAM[day]) return;
    const i = +idx, count = +n || 1;
    if (!state.workout || state.workout.day !== day) state.workout = { day, sets: {}, done: false };
    if (!state.workout.sets[i]) state.workout.sets[i] = [];
    for (let k = 0; k < count; k++) state.workout.sets[i].push({ w: +w, r: +r });
    state.last[day + i] = { w: +w, r: +r, d: state.day };
    saveGym();
    Store.set('last', state.last);
    renderGym();
    haptic('medium');
    return;
  }

  if (raw[0] !== 'm') return;
  const parts = raw.split('_');
  if (parts.length < 5) return;

  const [, kcal, p, f, c] = parts;
  const name = parts[5] ? (fromB64(parts[5]) || 'Из чата') : 'Из чата';
  addMeal({ n: name, kcal: +kcal, p: +p, f: +f, c: +c });
}

/* base64url → строка; пусто, если мусор */
function fromB64(s) {
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';           // atob не любит обрезанный хвост
    const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

/* ---------- мелочи ---------- */

function haptic(style) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
}

function humanDate() {
  const d = new Date();
  const dows = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${dows[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

/* ---------- запуск ---------- */

async function init() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#0a0a0a');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0a0a');
  }

  document.getElementById('food-date').textContent = humanDate();
  document.getElementById('gym-date').textContent = humanDate();

  state.meals = (await Store.get('f' + state.day)) || [];
  state.workout = await Store.get('g' + state.day);
  state.last = (await Store.get('last')) || {};

  renderQuick();
  renderFood();
  renderGym();
  consumeStartParam();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.screen;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('screen-food').classList.toggle('hidden', name !== 'food');
      document.getElementById('screen-gym').classList.toggle('hidden', name !== 'gym');
      window.scrollTo(0, 0);
      haptic('light');
    });
  });

  document.querySelectorAll('#day-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const day = tab.dataset.day;
      const hasSets = state.workout && Object.keys(state.workout.sets).length;
      if (hasSets && state.workout.day !== day &&
          !confirm('Уже есть подходы за сегодня. Сменить день тренировки?')) return;
      state.workout = { day, sets: {}, done: false };
      saveGym();
      renderGym();
      haptic('light');
    });
  });

  document.getElementById('btn-manual').addEventListener('click', () => {
    openSheet('Свой приём', `
      <div class="field"><label>что съел</label><input id="in-n" type="text" placeholder="плов"></div>
      <div class="field"><label>ккал</label><input id="in-k" type="number" inputmode="numeric"></div>
      <div class="field-row">
        <div class="field"><label>белок</label><input id="in-p" type="number" inputmode="numeric"></div>
        <div class="field"><label>жиры</label><input id="in-f" type="number" inputmode="numeric"></div>
        <div class="field"><label>углев.</label><input id="in-c" type="number" inputmode="numeric"></div>
      </div>`, () => {
      const n = document.getElementById('in-n').value.trim();
      const kcal = parseFloat(document.getElementById('in-k').value);
      if (!n || isNaN(kcal)) return false;
      addMeal({
        n, kcal,
        p: parseFloat(document.getElementById('in-p').value) || 0,
        f: parseFloat(document.getElementById('in-f').value) || 0,
        c: parseFloat(document.getElementById('in-c').value) || 0,
      });
      return true;
    });
  });

  document.getElementById('btn-finish').addEventListener('click', () => {
    if (!state.workout || !Object.keys(state.workout.sets).length) {
      alert('Сначала запиши хотя бы один подход.');
      return;
    }
    state.workout.done = true;
    saveGym();
    renderGym();
    haptic('heavy');
    if (tg && tg.showPopup) {
      tg.showPopup({ title: 'Записано', message: 'Тренировка закрыта. Не забудь поесть.' });
    }
  });

  document.getElementById('sheet-cancel').addEventListener('click', closeSheet);
  document.getElementById('sheet-ok').addEventListener('click', () => {
    if (sheetHandler && sheetHandler() !== false) closeSheet();
  });
  document.getElementById('sheet').addEventListener('click', e => {
    if (e.target.id === 'sheet') closeSheet();
  });
}

init();
