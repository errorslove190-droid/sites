'use strict';

/* Трекер еды и тренировок. Telegram Mini App, без сервера:
   данные лежат в облаке Telegram (CloudStorage), в браузере — в localStorage. */

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

const GOAL = { kcal: 2700, p: 110, f: 60, c: 430 };
const REST_SEC = 90;
const RING = 195;                      // длина окружности медальона, r = 31

const SLOTS = [
  { k: 'b', n: 'Завтрак',  till: 11 },
  { k: 'l', n: 'Обед',     till: 16 },
  { k: 'd', n: 'Ужин',     till: 22 },
  { k: 's', n: 'Перекусы', till: 24 },
];

const PROGRAM = {
  A: { title: 'верх тела', ic: 'ic-dumbbell', ex: [
    { n: 'Жим гантелей лёжа', s: '4 × 6–10', ic: 'ic-dumbbell' },
    { n: 'Тяга верхнего блока', s: '4 × 8–12', ic: 'ic-pullup' },
    { n: 'Жим гантелей сидя', s: '3 × 8–12', ic: 'ic-dumbbell' },
    { n: 'Тяга в тренажёре', s: '3 × 10–12', ic: 'ic-barbell' },
    { n: 'Бицепс + трицепс', s: '3 × 10–15', ic: 'ic-dumbbell' },
    { n: 'Отведения в стороны', s: '3 × 15', ic: 'ic-dumbbell' },
  ]},
  B: { title: 'ноги и спина', ic: 'ic-barbell', ex: [
    { n: 'Приседания', s: '4 × 6–10', ic: 'ic-barbell' },
    { n: 'Жим ногами', s: '3 × 10–12', ic: 'ic-barbell' },
    { n: 'Румынская тяга', s: '3 × 10–12', ic: 'ic-barbell' },
    { n: 'Сгибания и разгибания ног', s: '3 × 12', ic: 'ic-dumbbell' },
    { n: 'Гиперэкстензия', s: '3 × 15', ic: 'ic-pullup' },
    { n: 'Носки + планка', s: '3 × 15', ic: 'ic-dumbbell' },
  ]},
  C: { title: 'всё тело', ic: 'ic-pullup', ex: [
    { n: 'Подтягивания', s: '4 × макс', ic: 'ic-pullup' },
    { n: 'Жим гантелей на наклонной', s: '4 × 8–12', ic: 'ic-dumbbell' },
    { n: 'Выпады с гантелями', s: '3 × 10', ic: 'ic-dumbbell' },
    { n: 'Тяга гантели в наклоне', s: '3 × 10–12', ic: 'ic-dumbbell' },
    { n: 'Жим сидя или брусья', s: '3 × 10', ic: 'ic-barbell' },
    { n: 'Бицепс, трицепс, пресс', s: '3 × 12–15', ic: 'ic-dumbbell' },
  ]},
};

const QUICK = [
  { n: 'Коктейль полный',   d: 'протеин + молоко + банан', kcal: 600, p: 40, f: 16, c: 72 },
  { n: 'Протеин 110 + молоко', d: '600 мл',                kcal: 730, p: 95, f: 22, c: 39 },
  { n: 'Каша на молоке',    d: 'овсянка 80 г',             kcal: 420, p: 13, f: 12, c: 62 },
  { n: 'Омлет 4 яйца',      d: 'с маслом',                 kcal: 420, p: 27, f: 32, c: 3  },
  { n: 'Плов',              d: 'тарелка 400 г',            kcal: 660, p: 24, f: 26, c: 80 },
  { n: 'Курица с рисом',    d: '150 + 200 г',              kcal: 560, p: 45, f: 12, c: 68 },
  { n: 'Творог с мёдом',    d: '200 г',                    kcal: 300, p: 34, f: 5,  c: 28 },
  { n: 'Орехи горсть',      d: '30 г',                     kcal: 190, p: 5,  f: 17, c: 6  },
];

/* ---------- хранилище ---------- */

const cloudReady = !!(tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9'));

const Store = {
  get(key) {
    return new Promise(resolve => {
      if (cloudReady) tg.CloudStorage.getItem(key, (e, v) => resolve(e || !v ? null : safeParse(v)));
      else resolve(safeParse(localStorage.getItem('tr_' + key)));
    });
  },
  set(key, val) {
    const raw = JSON.stringify(val);
    return new Promise(resolve => {
      if (cloudReady) tg.CloudStorage.setItem(key, raw, () => resolve());
      else { localStorage.setItem('tr_' + key, raw); resolve(); }
    });
  },
  many(keys) {
    return new Promise(resolve => {
      if (cloudReady) {
        tg.CloudStorage.getItems(keys, (e, res) => {
          const out = {};
          if (!e && res) keys.forEach(k => { out[k] = safeParse(res[k]); });
          resolve(out);
        });
      } else {
        const out = {};
        keys.forEach(k => { out[k] = safeParse(localStorage.getItem('tr_' + k)); });
        resolve(out);
      }
    });
  },
};

function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function dayKey(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/* ---------- состояние ---------- */

const state = {
  day: dayKey(new Date()),
  meals: [],
  workout: null,
  last: {},
  gymDay: null,
  rest: null,
};

/* ---------- вспомогательное ---------- */

function icon(id, cls) {
  return `<svg class="${cls}"><use href="#${id}"/></svg>`;
}

/* Чем приём богаче — то и рисуем: белок → яйцо, жиры → авокадо, углеводы → колос */
function mealKind(m) {
  const cal = { p: m.p * 4, f: m.f * 9, c: m.c * 4 };
  if (cal.p >= cal.f && cal.p >= cal.c) return 'p';
  return cal.f >= cal.c ? 'f' : 'c';
}

const KIND_ICON = { p: 'ic-egg', f: 'ic-avocado', c: 'ic-grain' };

function sum(list) {
  return (list || state.meals).reduce((a, m) => ({
    kcal: a.kcal + m.kcal, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c,
  }), { kcal: 0, p: 0, f: 0, c: 0 });
}

function slotOfNow() {
  const h = new Date().getHours();
  return (SLOTS.find(s => h < s.till) || SLOTS[3]).k;
}

/* ---------- еда ---------- */

function renderFood() {
  const t = sum();

  document.getElementById('kcal-eat').textContent = Math.round(t.kcal);
  const left = GOAL.kcal - t.kcal;
  document.getElementById('kcal-cap').textContent = left >= 0 ? 'осталось' : 'перебор';
  document.getElementById('kcal-left').textContent = Math.abs(Math.round(left)) + ' ккал';

  ['p', 'f', 'c'].forEach(k => {
    document.getElementById('m-' + k).textContent = Math.round(t[k]) + ' г';
    const ring = document.getElementById('ring-' + k);
    ring.style.strokeDashoffset = (RING * (1 - Math.min(t[k] / GOAL[k], 1))).toFixed(1);
  });

  const box = document.getElementById('slots');
  box.innerHTML = '';

  SLOTS.forEach(slot => {
    const items = state.meals.filter(m => (m.s || 's') === slot.k);
    const el = document.createElement('section');
    el.className = 'slot';
    el.innerHTML = `
      <div class="slot-head">
        <h2></h2>
        <span class="sum">${items.length ? Math.round(sum(items).kcal) + ' ккал' : ''}</span>
        <button class="slot-add" aria-label="Добавить">+</button>
      </div>`;
    el.querySelector('h2').textContent = slot.n;
    el.querySelector('.slot-add').addEventListener('click', () => askMeal(slot.k));

    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'slot-empty';
      e.textContent = 'пусто';
      el.appendChild(e);
    }

    items.forEach(m => {
      const idx = state.meals.indexOf(m);
      const kind = mealKind(m);
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        ${icon(KIND_ICON[kind], 'item-ic ' + kind)}
        <div class="item-body"><b></b><small>Б ${Math.round(m.p)} · Ж ${Math.round(m.f)} · У ${Math.round(m.c)}${m.t ? ' · ' + m.t : ''}</small></div>
        <div class="item-kcal">${Math.round(m.kcal)}</div>
        <button class="item-del" aria-label="Удалить">×</button>`;
      row.querySelector('b').textContent = m.n;
      row.querySelector('.item-del').addEventListener('click', () => {
        state.meals.splice(idx, 1);
        saveFood(); renderFood(); renderWeek(); haptic('light');
      });
      el.appendChild(row);
    });

    box.appendChild(el);
  });
}

function addMeal(meal, slot) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  state.meals.push({
    n: meal.n, kcal: +meal.kcal || 0, p: +meal.p || 0, f: +meal.f || 0, c: +meal.c || 0,
    s: slot || meal.s || slotOfNow(),
    t: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  });
  saveFood();
  renderFood();
  renderWeek();
  haptic('medium');
  toast(meal.n + ' · +' + Math.round(meal.kcal));
}

function saveFood() { Store.set('f' + state.day, state.meals); }

function renderQuick() {
  const box = document.getElementById('quick-list');
  box.innerHTML = '';
  QUICK.forEach(q => {
    const kind = mealKind(q);
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `${icon(KIND_ICON[kind], 'item-ic ' + kind)}<span><b></b><small></small></span>`;
    b.querySelector('b').textContent = q.n;
    b.querySelector('small').textContent = q.kcal + ' ккал · ' + q.d;
    b.addEventListener('click', () => addMeal(q));
    box.appendChild(b);
  });
}

function askMeal(slot) {
  openSheet('Что съел', `
    <div class="field"><label>название</label><input id="in-n" type="text" placeholder="плов"></div>
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
    }, slot);
    return true;
  });
}

/* ---------- неделя ---------- */

async function renderWeek() {
  const box = document.getElementById('week');
  const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const data = await Store.many(days.map(d => 'f' + dayKey(d)));

  box.innerHTML = '';
  days.forEach(d => {
    const key = dayKey(d);
    const meals = key === state.day ? state.meals : data['f' + key];
    const kcal = meals ? sum(meals).kcal : 0;
    const el = document.createElement('div');
    el.className = 'wd' + (kcal >= GOAL.kcal * 0.9 ? ' hit' : '') + (key === state.day ? ' today' : '');
    el.innerHTML = '<span></span><i></i>';
    el.querySelector('span').textContent = names[d.getDay()];
    box.appendChild(el);
  });
}

/* ---------- зал ---------- */

function suggestDay() {
  const wd = new Date().getDay();
  if (wd === 1 || wd === 2) return 'A';
  if (wd === 3 || wd === 4) return 'B';
  return 'C';
}

function renderGym() {
  const day = state.gymDay || (state.workout && state.workout.day) || suggestDay();
  state.gymDay = day;
  const prog = PROGRAM[day];

  document.getElementById('gym-title').textContent = 'День ' + day;
  document.getElementById('gym-sub').textContent = prog.title;
  document.querySelector('#day-ic use').setAttribute('href', '#' + prog.ic);

  const list = document.getElementById('ex-list');
  list.innerHTML = '';

  prog.ex.forEach((ex, i) => {
    const sets = (state.workout && state.workout.day === day && state.workout.sets[i]) || [];
    const last = state.last[day + i];

    const el = document.createElement('section');
    el.className = 'ex' + (sets.length ? ' filled' : '');
    el.innerHTML = `
      <div class="ex-head">${icon(ex.ic, 'ex-ic')}<b></b><span class="ex-target">${ex.s}</span></div>
      <div class="ex-prev"></div>`;
    el.querySelector('b').textContent = ex.n;

    const prev = el.querySelector('.ex-prev');
    if (last) {
      prev.innerHTML = 'прошлый раз: <i></i>';
      prev.querySelector('i').textContent = `${last.w} кг × ${last.r}`;
    } else {
      prev.textContent = 'ещё не делал — запиши первый подход';
    }

    sets.forEach((s, si) => {
      const row = document.createElement('div');
      row.className = 'set';
      row.innerHTML = `
        <span class="set-n">${si + 1}</span>
        <span class="set-v">${s.w} кг <em>×</em> ${s.r}</span>
        <button class="set-del" aria-label="Удалить">×</button>`;
      row.querySelector('.set-del').addEventListener('click', () => {
        state.workout.sets[i].splice(si, 1);
        saveGym(); renderGym(); haptic('light');
      });
      el.appendChild(row);
    });

    const add = document.createElement('button');
    add.className = 'set-add';
    add.textContent = sets.length ? '+ ещё подход' : '+ подход';
    add.addEventListener('click', () => askSet(day, i, ex.n, sets[sets.length - 1] || last));
    el.appendChild(add);

    list.appendChild(el);
  });

  document.getElementById('gym-hint').textContent =
    state.workout && state.workout.done
      ? 'Тренировка закрыта. Теперь поешь.'
      : 'Каждую неделю добавляй повтор или 2,5 кг хотя бы в одном упражнении.';
}

function askSet(day, i, name, prev) {
  openSheet(name, `
    <div class="field-row two">
      <div class="field"><label>вес, кг</label><input id="in-w" type="number" inputmode="decimal" step="0.5" value="${prev ? prev.w : ''}"></div>
      <div class="field"><label>повторы</label><input id="in-r" type="number" inputmode="numeric" value="${prev ? prev.r : ''}"></div>
    </div>`, () => {
    const w = parseFloat(document.getElementById('in-w').value);
    const r = parseInt(document.getElementById('in-r').value, 10);
    if (isNaN(w) || isNaN(r)) return false;
    pushSet(day, i, w, r, 1);
    startRest();
    return true;
  });
}

function pushSet(day, i, w, r, times) {
  if (!state.workout || state.workout.day !== day) state.workout = { day, sets: {}, done: false };
  if (!state.workout.sets[i]) state.workout.sets[i] = [];
  for (let k = 0; k < (times || 1); k++) state.workout.sets[i].push({ w, r });
  state.last[day + i] = { w, r, d: state.day };
  saveGym();
  Store.set('last', state.last);
  renderGym();
  haptic('medium');
}

function saveGym() { Store.set('g' + state.day, state.workout); }

function startRest() {
  const box = document.getElementById('rest');
  const num = document.getElementById('rest-num');
  let left = REST_SEC;
  box.classList.remove('hidden');
  clearInterval(state.rest);
  const tick = () => {
    num.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (left <= 0) {
      clearInterval(state.rest);
      box.classList.add('hidden');
      haptic('heavy');
      toast('Отдых закончен');
      return;
    }
    left--;
  };
  tick();
  state.rest = setInterval(tick, 1000);
}

/* ---------- модалка и мелочи ---------- */

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

let toastTimer = null;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function haptic(style) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
}

function fromB64(s) {
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)));
  } catch (e) {
    return '';
  }
}

/* ---------- данные из чата ---------- */

function consumeStartParam() {
  const raw = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
              new URLSearchParams(location.search).get('startapp');
  if (!raw) return;

  /* d_<base64url(JSON)> — сразу несколько приёмов */
  if (raw.slice(0, 2) === 'd_') {
    let items = null;
    try { items = JSON.parse(fromB64(raw.slice(2))); } catch (e) { return; }
    if (!Array.isArray(items)) return;
    const known = new Set(state.meals.map(m => m.n));
    items.forEach(it => { if (!known.has(it.n)) addMeal(it, it.s); });
    return;
  }

  /* w_<день>_<упражнение>_<вес>_<повторы>_<подходов> */
  if (raw.slice(0, 2) === 'w_') {
    const [, day, idx, w, r, n] = raw.split('_');
    if (!PROGRAM[day]) return;
    state.gymDay = day;
    pushSet(day, +idx, +w, +r, +n || 1);
    switchScreen('gym');
    toast('Подходы записаны');
    return;
  }

  /* m_<ккал>_<б>_<ж>_<у>_<название base64url> */
  if (raw[0] !== 'm') return;
  const parts = raw.split('_');
  if (parts.length < 5) return;
  const [, kcal, p, f, c] = parts;
  addMeal({ n: parts[5] ? (fromB64(parts[5]) || 'Из чата') : 'Из чата', kcal: +kcal, p: +p, f: +f, c: +c });
}

function switchScreen(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  document.getElementById('screen-food').classList.toggle('hidden', name !== 'food');
  document.getElementById('screen-gym').classList.toggle('hidden', name !== 'gym');
  window.scrollTo(0, 0);
}

/* ---------- запуск ---------- */

async function init() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#faf7f2');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#faf7f2');
  }

  const d = new Date();
  const dows = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const nice = dows[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
  document.getElementById('food-date').textContent = nice;
  document.getElementById('gym-date').textContent = nice;

  state.meals = (await Store.get('f' + state.day)) || [];
  state.workout = await Store.get('g' + state.day);
  state.last = (await Store.get('last')) || {};

  renderQuick();
  renderFood();
  renderGym();
  renderWeek();
  consumeStartParam();

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => { switchScreen(btn.dataset.screen); haptic('light'); });
  });

  document.querySelectorAll('.mac').forEach(mac => {
    mac.addEventListener('click', () => {
      const k = mac.dataset.k;
      const t = sum();
      const names = { p: 'Белок', f: 'Жиры', c: 'Углеводы' };
      const left = Math.round(GOAL[k] - t[k]);
      toast(left > 0 ? `${names[k]}: добрать ещё ${left} г` : `${names[k]}: норма закрыта`);
      haptic('light');
    });
  });

  document.getElementById('day-switch').addEventListener('click', () => {
    const order = ['A', 'B', 'C'];
    const next = order[(order.indexOf(state.gymDay) + 1) % 3];
    const busy = state.workout && Object.keys(state.workout.sets).length && state.workout.day !== next;
    if (busy && !confirm('За сегодня уже записаны подходы другого дня. Всё равно сменить?')) return;
    state.gymDay = next;
    renderGym();
    haptic('light');
  });

  document.getElementById('rest-stop').addEventListener('click', () => {
    clearInterval(state.rest);
    document.getElementById('rest').classList.add('hidden');
  });

  document.getElementById('btn-finish').addEventListener('click', () => {
    if (!state.workout || !Object.keys(state.workout.sets).length) {
      toast('Сначала запиши подход');
      return;
    }
    state.workout.done = true;
    saveGym();
    renderGym();
    haptic('heavy');
    toast('Тренировка закрыта');
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
