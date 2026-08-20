'use strict';

/* Трекер питания. Telegram Mini App.
   Быстрый слой — облако Telegram (CloudStorage), в браузере localStorage.
   Общий склад — Cloudflare Worker: через него в дневник пишет Claude из чата. */

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const RING = 195;                       // длина окружности медальона, r = 31

/* Адрес воркера (код в D:\Projects\trener-worker) — без косой черты на конце.
   Пусто — кнопка «Сфоткать» уводит в чат с ботом, а дневник живёт только на телефоне. */
const WORKER = 'https://trener.trener-worker.workers.dev';

const DEFAULT_GOAL = { kcal: 2700, p: 110, f: 60, c: 430 };
const PROFILE = { h: 173, age: 18 };    // рост и возраст для пересчёта нормы

const SLOTS = [
  { k: 'b', n: 'Завтрак',  till: 11 },
  { k: 'l', n: 'Обед',     till: 16 },
  { k: 'd', n: 'Ужин',     till: 22 },
  { k: 's', n: 'Перекусы', till: 24 },
];

const BASE_DISHES = [
  { n: 'Коктейль полный',   d: 'протеин + молоко + банан', kcal: 600, p: 40, f: 16, c: 72 },
  { n: 'Протеин 110 + молоко', d: '600 мл',                kcal: 730, p: 95, f: 22, c: 39 },
  { n: 'Каша на молоке',    d: 'овсянка 80 г',             kcal: 420, p: 13, f: 12, c: 62 },
  { n: 'Омлет 4 яйца',      d: 'с маслом',                 kcal: 420, p: 27, f: 32, c: 3  },
  { n: 'Плов',              d: 'тарелка 400 г',            kcal: 660, p: 24, f: 26, c: 80 },
  { n: 'Курица с рисом',    d: '150 + 200 г',              kcal: 560, p: 45, f: 12, c: 68 },
  { n: 'Творог с мёдом',    d: '200 г',                    kcal: 300, p: 34, f: 5,  c: 28 },
  { n: 'Орехи горсть',      d: '30 г',                     kcal: 190, p: 5,  f: 17, c: 6  },
];

/* Программа зала. Три дня, каждая мышца дважды в неделю.
   note — ограничение из-за плеча и спины, оно важнее нагрузки и висит прямо в карточке. */
const PROGRAM = {
  A: { n: 'Верх тела', ex: [
    { id: 'a1', n: 'Жим гантелей лёжа',              sets: 4, reps: '6–10',  note: 'гантели, а не штанга — плечо в свободном положении' },
    { id: 'a2', n: 'Тяга верхнего блока',            sets: 4, reps: '8–12',  d: 'нейтральным хватом' },
    { id: 'a3', n: 'Жим гантелей сидя',              sets: 3, reps: '8–12',  note: 'не опускать ниже уровня ушей' },
    { id: 'a4', n: 'Тяга с упором в грудь',          sets: 3, reps: '10–12', d: 'в тренажёре' },
    { id: 'a5', n: 'Бицепс и трицепс',               sets: 3, reps: '10–15', d: 'подъём на бицепс, разгибания' },
    { id: 'a6', n: 'Отведения в стороны',            sets: 3, reps: '15',    d: 'лёгкие гантели' },
  ]},
  B: { n: 'Ноги и спина', ex: [
    { id: 'b1', n: 'Приседания со штангой',          sets: 4, reps: '6–10',  note: 'спина болит — начинай с гоблет-приседа с гантелью' },
    { id: 'b2', n: 'Жим ногами',                     sets: 3, reps: '10–12' },
    { id: 'b3', n: 'Румынская тяга с гантелями',     sets: 3, reps: '10–12', note: 'лёгкий вес, идеальная техника, при боли — пропускаем' },
    { id: 'b4', n: 'Сгибания и разгибания ног',      sets: 3, reps: '12',    d: 'в тренажёре' },
    { id: 'b5', n: 'Гиперэкстензия',                 sets: 3, reps: '15',    note: 'лечит спину лучше, чем щадящий режим' },
    { id: 'b6', n: 'Носки и планка',                 sets: 3, reps: '15 / 40 сек' },
  ]},
  C: { n: 'Всё тело', ex: [
    { id: 'c1', n: 'Подтягивания',                   sets: 4, reps: 'макс',  d: 'нейтральным хватом', note: 'не тянет — в гравитроне или с резиной' },
    { id: 'c2', n: 'Жим гантелей на наклонной',      sets: 4, reps: '8–12' },
    { id: 'c3', n: 'Выпады с гантелями',             sets: 3, reps: '10 на ногу' },
    { id: 'c4', n: 'Тяга гантели в наклоне',         sets: 3, reps: '10–12', d: 'с упором в скамью' },
    { id: 'c5', n: 'Жим гантелей сидя или брусья',   sets: 3, reps: '10' },
    { id: 'c6', n: 'Бицепс, трицепс, пресс',         sets: 3, reps: '12–15' },
  ]},
};

const DAY_ORDER = ['A', 'B', 'C'];

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

/* ---------- общий склад (воркер) ----------

   Зачем: CloudStorage виден только изнутри Telegram, и Claude туда не дотянется.
   Поэтому дни еды дублируются в KV воркера — тогда посчитанное в чате появляется
   в приложении само. CloudStorage остаётся быстрым кэшем и работает без сети.

   Правило простое: сервер главнее. Любая местная правка сразу уходит туда, а если
   не ушла (метро, лифт) — ложится в очередь и досылается при следующем запуске.
   Значит расхождения живут секунды, и сложный разбор конфликтов не нужен. */

const Sync = {
  ready() { return !!WORKER && !!(tg && tg.initData); },

  head() {
    return { 'content-type': 'application/json', 'x-init-data': (tg && tg.initData) || '' };
  },

  async pull(day) {
    if (!this.ready()) return null;
    try {
      const r = await fetch(`${WORKER}/day?d=${day}`, { headers: this.head() });
      const res = await r.json();
      return res.ok && Array.isArray(res.meals) ? res.meals : null;
    } catch (e) {
      return null;
    }
  },

  async push(day, meals) {
    if (!this.ready()) return false;
    try {
      const r = await fetch(`${WORKER}/day`, {
        method: 'POST',
        headers: this.head(),
        body: JSON.stringify({ day, meals }),
      });
      const res = await r.json();
      if (!res.ok) throw new Error(res.error || 'отказ');
      return true;
    } catch (e) {
      await this.hold(day, meals);
      return false;
    }
  },

  /* Не ушло — держим до следующего раза. На день храним только последнюю версию. */
  async hold(day, meals) {
    const q = (await Store.get('pending')) || {};
    q[day] = meals;
    await Store.set('pending', q);
  },

  async flush() {
    if (!this.ready()) return;
    const q = (await Store.get('pending')) || {};
    const days = Object.keys(q);
    if (!days.length) return;
    const left = {};
    for (const day of days) {
      let sent = false;
      try {
        const r = await fetch(`${WORKER}/day`, {
          method: 'POST',
          headers: this.head(),
          body: JSON.stringify({ day, meals: q[day] }),
        });
        sent = (await r.json()).ok === true;
      } catch (e) { /* сети всё ещё нет */ }
      if (!sent) left[day] = q[day];
    }
    await Store.set('pending', left);
  },

  /* Подтянуть день с сервера и, если он отличается от показанного, перерисовать. */
  async refresh(day) {
    const fresh = await this.pull(day);
    if (!fresh || day !== state.view) return;
    if (JSON.stringify(fresh) === JSON.stringify(state.meals)) return;
    state.meals = fresh;
    await Store.set('f' + day, fresh);
    renderDay();
  },
};

function dayKey(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function fromKey(key) {
  return new Date(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8));
}

/* ---------- состояние ---------- */

const state = {
  today: dayKey(new Date()),
  view: dayKey(new Date()),   // какой день смотрим
  meals: [],
  goal: Object.assign({}, DEFAULT_GOAL),
  dishes: [],                 // свои блюда
  weights: [],

  gymView: dayKey(new Date()),// какую тренировку смотрим
  gym: null,                  // { d:'A', ex:{ a1:[{w,r}] } }
  last: {},                   // последний подход по каждому упражнению
  gymHist: [],                // прошлые тренировки, чтобы считать прогресс
};

/* ---------- общее ---------- */

const KIND_ICON = { p: 'ic-egg', f: 'ic-avocado', c: 'ic-grain' };

function icon(id, cls) { return `<svg class="${cls}"><use href="#${id}"/></svg>`; }

/* Чем блюдо богаче — то и рисуем */
function mealKind(m) {
  const cal = { p: m.p * 4, f: m.f * 9, c: m.c * 4 };
  if (cal.p >= cal.f && cal.p >= cal.c) return 'p';
  return cal.f >= cal.c ? 'f' : 'c';
}

function sum(list) {
  return (list || state.meals).reduce((a, m) => ({
    kcal: a.kcal + m.kcal, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c,
  }), { kcal: 0, p: 0, f: 0, c: 0 });
}

function slotOfNow() {
  const h = new Date().getHours();
  return (SLOTS.find(s => h < s.till) || SLOTS[3]).k;
}

function niceDate(key) {
  const d = fromKey(key);
  const dows = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return dows[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

/* ---------- экран «День» ---------- */

function renderDay() {
  const t = sum();
  const G = state.goal;

  document.getElementById('food-date').textContent = niceDate(state.view);
  document.getElementById('day-title').textContent =
    state.view === state.today ? 'Твой день' : 'Тот день';
  document.getElementById('next-day').disabled = state.view >= state.today;

  document.getElementById('kcal-eat').textContent = Math.round(t.kcal);
  const left = G.kcal - t.kcal;
  document.getElementById('kcal-cap').textContent = left >= 0 ? 'осталось' : 'перебор';
  document.getElementById('kcal-left').textContent = Math.abs(Math.round(left)) + ' ккал';

  ['p', 'f', 'c'].forEach(k => {
    document.getElementById('m-' + k).textContent = Math.round(t[k]) + ' г';
    document.getElementById('g-' + k).textContent = 'из ' + G[k];
    document.getElementById('ring-' + k).style.strokeDashoffset =
      (RING * (1 - Math.min(t[k] / G[k], 1))).toFixed(1);
  });

  renderAdvice(t);
  renderSlots();
}

/* Одна честная подсказка: где сегодня дыра и чем её закрыть */
function renderAdvice(t) {
  const G = state.goal, el = document.getElementById('advice');
  const leftK = Math.round(G.kcal - t.kcal);
  const leftC = Math.round(G.c - t.c);
  const leftP = Math.round(G.p - t.p);

  if (!state.meals.length) {
    el.innerHTML = `Пока пусто. За день нужно набрать <b>${G.kcal} ккал</b> — это примерно пять приёмов.`;
    return;
  }
  if (leftK <= 0) {
    el.innerHTML = `Норма закрыта: <b>${Math.round(t.kcal)} ккал</b>. Так и держи.`;
    return;
  }
  if (leftC > 120) {
    el.innerHTML = `Не хватает <b>${leftK} ккал</b>, и почти всё это углеводы (<b>${leftC} г</b>). Закрывай гарниром: рис, макароны, картошка, хлеб — не белком.`;
    return;
  }
  if (leftP > 40) {
    el.innerHTML = `Осталось <b>${leftK} ккал</b> и <b>${leftP} г</b> белка — самое время для коктейля или творога.`;
    return;
  }
  el.innerHTML = `Осталось добрать <b>${leftK} ккал</b>. Проще всего — коктейль на молоке или тарелка плова.`;
}

function renderSlots() {
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
        saveMeals(); renderDay(); haptic('light');
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
    n: meal.n, kcal: Math.round(+meal.kcal || 0), p: Math.round(+meal.p || 0),
    f: Math.round(+meal.f || 0), c: Math.round(+meal.c || 0),
    s: slot || meal.s || slotOfNow(),
    t: state.view === state.today ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
  });
  saveMeals();
  renderDay();
  haptic('medium');
  toast(meal.n + ' · +' + Math.round(meal.kcal));
}

function saveMeals() {
  const day = state.view;
  const meals = state.meals.slice();
  Store.set('f' + day, meals);
  Sync.push(day, meals);        // фоном; не дождались — уйдёт из очереди при следующем запуске
}

/* ---------- добавление ---------- */

function allDishes() { return state.dishes.concat(BASE_DISHES); }

function renderQuick() {
  const box = document.getElementById('quick-list');
  box.innerHTML = '';
  allDishes().slice(0, 10).forEach(q => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `${icon(KIND_ICON[mealKind(q)], 'item-ic ' + mealKind(q))}<span><b></b><small></small></span>`;
    b.querySelector('b').textContent = q.n;
    b.querySelector('small').textContent = q.kcal + ' ккал · ' + (q.d || '');
    b.addEventListener('click', () => askPortion(q));
    box.appendChild(b);
  });
}

/* Порция редко бывает ровно такой, как в справочнике — спрашиваем множитель */
function askPortion(dish) {
  let mult = 1;
  openSheet(dish.n, `
    <div class="mult">
      <button data-m="0.5">½ порции</button>
      <button data-m="1" class="on">1 порция</button>
      <button data-m="1.5">1½</button>
      <button data-m="2">2 порции</button>
    </div>
    <div class="mult-out" id="mult-out"></div>`, () => {
    addMeal({
      n: dish.n + (mult !== 1 ? ` (×${mult})` : ''),
      kcal: dish.kcal * mult, p: dish.p * mult, f: dish.f * mult, c: dish.c * mult,
    });
    return true;
  });

  const out = document.getElementById('mult-out');
  const show = () => {
    out.innerHTML = `<b>${Math.round(dish.kcal * mult)} ккал</b> · Б ${Math.round(dish.p * mult)} · Ж ${Math.round(dish.f * mult)} · У ${Math.round(dish.c * mult)}`;
  };
  document.querySelectorAll('.mult button').forEach(b => {
    b.addEventListener('click', () => {
      mult = +b.dataset.m;
      document.querySelectorAll('.mult button').forEach(x => x.classList.toggle('on', x === b));
      show();
      haptic('light');
    });
  });
  show();
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

/* ---------- экран «Неделя» ---------- */

async function renderWeek() {
  const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const data = await Store.many(days.map(d => 'f' + dayKey(d)));

  const totals = days.map(d => {
    const key = dayKey(d);
    const meals = key === state.view ? state.meals : data['f' + key];
    return { key, dow: names[d.getDay()], t: sum(meals || []) };
  });

  const filled = totals.filter(x => x.t.kcal > 0);
  const avg = filled.length ? filled.reduce((a, x) => a + x.t.kcal, 0) / filled.length : 0;
  const hit = totals.filter(x => x.t.kcal >= state.goal.kcal * 0.9).length;

  document.getElementById('w-avg').textContent = Math.round(avg);
  document.getElementById('w-hit').textContent = hit;
  ['p', 'f', 'c'].forEach(k => {
    const v = filled.length ? filled.reduce((a, x) => a + x.t[k], 0) / filled.length : 0;
    document.getElementById('w-' + k).textContent = Math.round(v) + ' г';
  });

  const max = Math.max(state.goal.kcal, ...totals.map(x => x.t.kcal)) * 1.1;
  const chart = document.getElementById('chart');
  chart.innerHTML = '';
  totals.forEach(x => {
    const bar = document.createElement('div');
    bar.className = 'bar' + (x.t.kcal >= state.goal.kcal * 0.9 ? ' hit' : '') + (x.key === state.today ? ' today' : '');
    bar.innerHTML = `<i style="height:${Math.max(x.t.kcal / max * 100, 2)}%"></i><span>${x.dow}</span>`;
    bar.title = Math.round(x.t.kcal) + ' ккал';
    bar.addEventListener('click', async () => {
      state.view = x.key;
      state.meals = (await Store.get('f' + x.key)) || [];
      switchScreen('day');
      renderDay();
      Sync.refresh(x.key);
    });
    chart.appendChild(bar);
  });

  const adv = document.getElementById('w-advice');
  if (!filled.length) adv.textContent = '';
  else if (avg < state.goal.kcal - 400) {
    adv.innerHTML = `В среднем <b>${Math.round(avg)} ккал</b> в день — это на <b>${Math.round(state.goal.kcal - avg)}</b> меньше нормы. При таком раскладе вес стоит на месте, сколько ни тренируйся.`;
  } else if (hit >= 5) {
    adv.innerHTML = `Пять дней и больше в норме — это уже режим. Взвесься в воскресенье, вес должен пойти вверх.`;
  } else {
    adv.innerHTML = `Средний день — <b>${Math.round(avg)} ккал</b>. Норма закрыта <b>${hit}</b> раз из семи.`;
  }
}

/* ---------- экран «Профиль» ---------- */

function renderMe() {
  const G = state.goal;
  document.getElementById('gg-kcal').textContent = G.kcal;
  document.getElementById('gg-p').textContent = G.p;
  document.getElementById('gg-f').textContent = G.f;
  document.getElementById('gg-c').textContent = G.c;

  const w = state.weights.length ? state.weights[state.weights.length - 1].w : null;
  document.getElementById('goal-note').textContent = w
    ? `Посчитано под ${w} кг, рост ${PROFILE.h}, три тренировки в неделю, плюс 400 ккал на рост.`
    : 'Запиши вес — пересчитаю норму под него.';

  const box = document.getElementById('weight-list');
  box.innerHTML = '';
  if (!state.weights.length) {
    box.innerHTML = '<div class="slot-empty">пока ни одной записи</div>';
  } else {
    state.weights.slice().reverse().slice(0, 8).forEach((rec, i, arr) => {
      const prev = arr[i + 1];
      const diff = prev ? +(rec.w - prev.w).toFixed(1) : 0;
      const d = fromKey(rec.d);
      const row = document.createElement('div');
      row.className = 'wlog';
      row.innerHTML = `
        <b>${rec.w} кг</b>
        <small>${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}</small>
        <em class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff ? (diff > 0 ? '+' : '') + diff : '—'}</em>`;
      box.appendChild(row);
    });
  }

  const my = document.getElementById('my-list');
  my.innerHTML = '';
  if (!state.dishes.length) {
    my.innerHTML = '<div class="slot-empty">свои блюда появятся здесь — их удобно добавлять в один тап</div>';
  } else {
    state.dishes.forEach((dish, i) => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        ${icon(KIND_ICON[mealKind(dish)], 'item-ic ' + mealKind(dish))}
        <div class="item-body"><b></b><small>Б ${dish.p} · Ж ${dish.f} · У ${dish.c}</small></div>
        <div class="item-kcal">${dish.kcal}</div>
        <button class="item-del" aria-label="Удалить">×</button>`;
      row.querySelector('b').textContent = dish.n;
      row.querySelector('.item-del').addEventListener('click', () => {
        state.dishes.splice(i, 1);
        Store.set('my', state.dishes);
        renderMe(); renderQuick(); haptic('light');
      });
      my.appendChild(row);
    });
  }
}

function askWeight() {
  const last = state.weights.length ? state.weights[state.weights.length - 1].w : 54.5;
  openSheet('Вес сегодня', `
    <div class="field"><label>кг, утром натощак</label><input id="in-w" type="number" inputmode="decimal" step="0.1" value="${last}"></div>`, () => {
    const w = parseFloat(document.getElementById('in-w').value);
    if (isNaN(w) || w < 30 || w > 200) return false;
    state.weights = state.weights.filter(r => r.d !== state.today);
    state.weights.push({ d: state.today, w });
    state.weights.sort((a, b) => a.d.localeCompare(b.d));
    Store.set('weights', state.weights);
    recountGoal(w);
    renderMe();
    haptic('medium');
    toast('Записал: ' + w + ' кг');
    return true;
  });
}

/* Миффлин–Сан Жеор, коэффициент активности 1,5, сверху +400 на рост */
function recountGoal(w) {
  const bmr = 10 * w + 6.25 * PROFILE.h - 5 * PROFILE.age + 5;
  const kcal = Math.round((bmr * 1.5 + 400) / 10) * 10;
  const p = Math.round(w * 2 / 5) * 5;
  const f = Math.round(w * 1.1 / 5) * 5;
  const c = Math.round((kcal - p * 4 - f * 9) / 4 / 5) * 5;
  state.goal = { kcal, p, f, c };
  Store.set('goal', state.goal);
  renderDay();
}

function askDish() {
  openSheet('Своё блюдо', `
    <div class="field"><label>название</label><input id="in-n" type="text" placeholder="шаурма у дома"></div>
    <div class="field"><label>ккал</label><input id="in-k" type="number" inputmode="numeric"></div>
    <div class="field-row">
      <div class="field"><label>белок</label><input id="in-p" type="number" inputmode="numeric"></div>
      <div class="field"><label>жиры</label><input id="in-f" type="number" inputmode="numeric"></div>
      <div class="field"><label>углев.</label><input id="in-c" type="number" inputmode="numeric"></div>
    </div>`, () => {
    const n = document.getElementById('in-n').value.trim();
    const kcal = parseFloat(document.getElementById('in-k').value);
    if (!n || isNaN(kcal)) return false;
    state.dishes.unshift({
      n, kcal: Math.round(kcal), d: 'моё',
      p: Math.round(parseFloat(document.getElementById('in-p').value) || 0),
      f: Math.round(parseFloat(document.getElementById('in-f').value) || 0),
      c: Math.round(parseFloat(document.getElementById('in-c').value) || 0),
    });
    Store.set('my', state.dishes);
    renderMe(); renderQuick();
    toast('Блюдо сохранено');
    return true;
  });
}

/* ---------- экран «Спорт» ---------- */

function exById(id) {
  for (const k of DAY_ORDER) {
    const e = PROGRAM[k].ex.find(x => x.id === id);
    if (e) return e;
  }
  return null;
}

/** Сколько железа поднято за тренировку: вес × повторы по всем подходам. */
function tonnage(w) {
  if (!w || !w.ex) return 0;
  let t = 0;
  Object.values(w.ex).forEach(list => list.forEach(s => { t += (s.w || 0) * (s.r || 0); }));
  return Math.round(t);
}

function setsDone(w) {
  if (!w || !w.ex) return 0;
  return Object.values(w.ex).reduce((a, l) => a + l.length, 0);
}

/** Какой день предлагать: следующий по кругу после последней тренировки. */
function suggestDay() {
  const prev = state.gymHist.find(h => h.w && h.w.d);
  if (!prev) return 'A';
  const i = DAY_ORDER.indexOf(prev.w.d);
  return DAY_ORDER[(i + 1) % DAY_ORDER.length];
}

async function loadGym() {
  state.gym = (await Store.get('g' + state.gymView)) || null;
  if (!state.gym) state.gym = { d: suggestDay(), ex: {} };
  if (!state.gym.ex) state.gym.ex = {};
}

/** Прошлые тренировки за три недели — нужны и для истории, и для «сколько было в прошлый раз». */
async function loadGymHistory() {
  const keys = [];
  const base = fromKey(state.gymView);
  for (let i = 1; i <= 21; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push('g' + dayKey(d));
  }
  const got = await Store.many(keys);
  state.gymHist = keys
    .map(k => ({ key: k.slice(1), w: got[k] }))
    .filter(x => x.w && setsDone(x.w));
}

function renderGym() {
  const dk = state.gymView;
  document.getElementById('gym-date').textContent =
    dk === state.today ? 'сегодня' : niceDate(dk);
  document.getElementById('gym-next').disabled = dk >= state.today;

  renderGymDays();
  renderGymSum();
  renderGymList();
  renderGymHistory();
}

function renderGymDays() {
  const box = document.getElementById('gym-days');
  box.innerHTML = '';
  DAY_ORDER.forEach(k => {
    const b = document.createElement('button');
    b.className = 'day' + (state.gym.d === k ? ' on' : '');
    b.innerHTML = `<b>${k}</b><span></span>`;
    b.querySelector('span').textContent = PROGRAM[k].n;
    b.addEventListener('click', () => {
      state.gym.d = k;
      saveGym();
      renderGym();
      haptic('light');
    });
    box.appendChild(b);
  });
}

function renderGymSum() {
  const t = tonnage(state.gym);
  const done = setsDone(state.gym);
  const plan = PROGRAM[state.gym.d].ex.reduce((a, e) => a + e.sets, 0);

  document.getElementById('tonn-v').textContent = t.toLocaleString('ru-RU');
  document.getElementById('tonn-sets').textContent = `подходов ${done} из ${plan}`;

  // сравнение с прошлым таким же днём — то самое «добавь повтор или 2,5 кг»
  const prev = state.gymHist.find(h => h.w && h.w.d === state.gym.d);
  const el = document.getElementById('tonn-diff');
  if (!prev) {
    el.textContent = done ? 'первый раз этот день' : 'ещё не начинал';
    el.className = '';
    return;
  }
  const was = tonnage(prev.w);
  const diff = t - was;

  // Посреди тренировки «минус тонна» — не отставание, а недоделанность.
  // Красным показываем только когда подходы уже выбраны, иначе это просто счётчик до цели.
  if (!done) {
    el.textContent = `в прошлый раз ${was.toLocaleString('ru-RU')} кг`;
    el.className = '';
  } else if (diff > 0) {
    el.textContent = `+${diff.toLocaleString('ru-RU')} кг к прошлому`;
    el.className = 'up';
  } else if (diff === 0) {
    el.textContent = 'ровно как в прошлый раз';
    el.className = '';
  } else if (done < plan) {
    el.textContent = `до прошлого ещё ${(-diff).toLocaleString('ru-RU')} кг`;
    el.className = '';
  } else {
    el.textContent = `${diff.toLocaleString('ru-RU')} кг к прошлому`;
    el.className = 'down';
  }
}

function renderGymList() {
  const box = document.getElementById('gym-list');
  box.innerHTML = '';

  PROGRAM[state.gym.d].ex.forEach(ex => {
    const done = state.gym.ex[ex.id] || [];
    const el = document.createElement('section');
    el.className = 'ex' + (done.length >= ex.sets ? ' full' : '');
    el.innerHTML = `
      <div class="ex-head">
        <b></b>
        <span class="ex-target">${ex.sets} × ${ex.reps}</span>
      </div>
      ${ex.d ? '<p class="ex-d"></p>' : ''}
      ${ex.note ? '<p class="ex-note"></p>' : ''}
      <div class="ex-sets"></div>`;

    el.querySelector('b').textContent = ex.n;
    if (ex.d) el.querySelector('.ex-d').textContent = ex.d;
    if (ex.note) el.querySelector('.ex-note').textContent = ex.note;

    const row = el.querySelector('.ex-sets');
    done.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'set';
      b.textContent = s.w ? `${fmtW(s.w)}×${s.r}` : `${s.r} повт`;
      b.addEventListener('click', () => askSet(ex.id, i));
      row.appendChild(b);
    });

    const add = document.createElement('button');
    add.className = 'set add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Записать подход');
    add.addEventListener('click', () => askSet(ex.id, null));
    row.appendChild(add);

    const hint = hintFor(ex.id, done);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'ex-last';
      h.textContent = hint;
      el.appendChild(h);
    }
    box.appendChild(el);
  });
}

/**
 * Лучший подход этого упражнения на прошлых тренировках.
 * Берём из истории, а не из `last`: тот перезаписывается сегодняшним подходом,
 * и подсказка начала бы сравнивать сегодня с сегодня.
 */
function prevSetOf(id) {
  for (const h of state.gymHist) {          // история идёт от свежих к старым
    const list = h.w && h.w.ex && h.w.ex[id];
    if (list && list.length) return list.reduce((a, s) => (s.w * s.r > a.w * a.r ? s : a), list[0]);
  }
  return null;
}

/** Подсказка под упражнением: что было в прошлый раз и что делать сегодня. */
function hintFor(id, done) {
  const prev = prevSetOf(id);
  if (!prev) return done.length ? 'записано — в следующий раз будет с чем сравнить' : 'первый раз — начни с лёгкого и запиши';

  const was = prev.w ? `${fmtW(prev.w)} кг × ${prev.r}` : `${prev.r} повторов`;
  if (!done.length) return `в прошлый раз ${was} — добавь повтор или 2,5 кг`;

  const best = done.reduce((a, s) => (s.w * s.r > a.w * a.r ? s : a), done[0]);
  if (best.w * best.r > prev.w * prev.r) return `прошлый раз ${was} — сегодня больше`;
  if (best.w * best.r === prev.w * prev.r) return `прошлый раз ${was} — пока вровень`;
  return `в прошлый раз было больше: ${was}`;
}

function fmtW(w) {
  return Number.isInteger(w) ? String(w) : String(w).replace('.', ',');
}

/**
 * Что подставить в новый подход: сегодняшний предыдущий → прошлая тренировка →
 * последнее вообще (`last` помнит и то, что старше трёх недель) → по умолчанию.
 */
function prefillFor(id) {
  const today = state.gym.ex[id];
  if (today && today.length) return Object.assign({}, today[today.length - 1]);
  const prev = prevSetOf(id);
  if (prev) return { w: prev.w, r: prev.r };
  if (state.last[id]) return { w: state.last[id].w, r: state.last[id].r };
  return { w: 0, r: 8 };
}

function askSet(id, idx) {
  const ex = exById(id);
  const cur = idx == null ? prefillFor(id) : state.gym.ex[id][idx];

  openSheet(idx == null ? 'Подход' : 'Изменить подход', `
    <div class="step">
      <label>вес, кг</label>
      <div class="step-row">
        <button class="step-b" data-t="w" data-v="-2.5">−</button>
        <input id="in-w" type="number" inputmode="decimal" step="2.5" value="${cur.w}">
        <button class="step-b" data-t="w" data-v="2.5">+</button>
      </div>
    </div>
    <div class="step">
      <label>повторы</label>
      <div class="step-row">
        <button class="step-b" data-t="r" data-v="-1">−</button>
        <input id="in-r" type="number" inputmode="numeric" value="${cur.r}">
        <button class="step-b" data-t="r" data-v="1">+</button>
      </div>
    </div>
    <p class="step-note">${ex ? ex.sets + ' × ' + ex.reps + ' — цель на сегодня' : ''}</p>
    ${idx == null ? '' : '<button class="sheet-del" id="set-del">Удалить подход</button>'}`, () => {

    const w = parseFloat(String(document.getElementById('in-w').value).replace(',', '.')) || 0;
    const r = parseInt(document.getElementById('in-r').value, 10) || 0;
    if (r <= 0) return false;

    if (!state.gym.ex[id]) state.gym.ex[id] = [];
    if (idx == null) state.gym.ex[id].push({ w, r });
    else state.gym.ex[id][idx] = { w, r };

    state.last[id] = { w, r, day: state.gymView };
    Store.set('last', state.last);
    saveGym();
    renderGym();
    haptic('light');
    return true;
  });

  document.querySelectorAll('#sheet-body .step-b').forEach(b => {
    b.addEventListener('click', () => {
      const inp = document.getElementById(b.dataset.t === 'w' ? 'in-w' : 'in-r');
      const step = parseFloat(b.dataset.v);
      const now = parseFloat(String(inp.value).replace(',', '.')) || 0;
      inp.value = Math.max(0, Math.round((now + step) * 10) / 10);
      haptic('light');
    });
  });

  const del = document.getElementById('set-del');
  if (del) del.addEventListener('click', () => {
    state.gym.ex[id].splice(idx, 1);
    if (!state.gym.ex[id].length) delete state.gym.ex[id];
    saveGym();
    renderGym();
    closeSheet();
    toast('Подход убран');
  });
}

function saveGym() {
  Store.set('g' + state.gymView, state.gym);
}

function renderGymHistory() {
  const box = document.getElementById('gym-history');
  box.innerHTML = '';
  const list = state.gymHist.slice(0, 6);

  if (!list.length) {
    box.innerHTML = '<div class="slot-empty">пока пусто — первая тренировка появится здесь</div>';
    return;
  }

  list.forEach(h => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <span class="hday"></span>
      <div class="item-body"><b></b><small></small></div>
      <div class="item-kcal"></div>`;
    row.querySelector('.hday').textContent = h.w.d || '?';
    row.querySelector('b').textContent = PROGRAM[h.w.d] ? PROGRAM[h.w.d].n : 'Тренировка';
    row.querySelector('small').textContent = niceDate(h.key) + ' · ' + setsDone(h.w) + ' подходов';
    row.querySelector('.item-kcal').textContent = tonnage(h.w).toLocaleString('ru-RU');
    row.addEventListener('click', () => shiftGym(null, h.key));
    box.appendChild(row);
  });
}

async function shiftGym(delta, exact) {
  if (exact) state.gymView = exact;
  else {
    const d = fromKey(state.gymView);
    d.setDate(d.getDate() + delta);
    const next = dayKey(d);
    if (next > state.today) return;
    state.gymView = next;
  }
  await loadGymHistory();
  await loadGym();
  renderGym();
  window.scrollTo(0, 0);
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

/* ---------- фото прямо из приложения ---------- */

/* Снимок уходит на Cloudflare Worker, тот пересылает его боту: токен нельзя
   держать в браузере, а GitHub Pages принимать файлы не умеет. */
async function sendPhoto(file) {
  toast('Сжимаю фото…');
  let blob;
  try {
    blob = await shrink(file);
  } catch (e) {
    blob = file;
  }

  const fd = new FormData();
  fd.append('photo', blob, 'meal.jpg');
  fd.append('initData', (tg && tg.initData) || '');
  fd.append('note', 'Фото из трекера — оцени порцию, посчитай КБЖУ и дай кнопку записи');

  toast('Отправляю…');
  try {
    const r = await fetch(WORKER + '/photo', { method: 'POST', body: fd });
    const res = await r.json();
    if (!res.ok) throw new Error(res.error || 'отказ');
    haptic('heavy');
    toast('Готово, считаю в чате');
    if (tg && tg.close) setTimeout(() => tg.close(), 1200);
  } catch (err) {
    toast('Не отправилось: ' + err.message);
  }
}

/* Телефон снимает 4000 пикселей по стороне — столько не нужно ни Telegram, ни счёту */
function shrink(file, max = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('не читается')); };
    img.src = url;
  });
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

  /* m_<ккал>_<б>_<ж>_<у>_<название base64url> — один приём */
  if (raw[0] !== 'm') return;
  const parts = raw.split('_');
  if (parts.length < 5) return;
  const [, kcal, p, f, c] = parts;
  addMeal({ n: parts[5] ? (fromB64(parts[5]) || 'Из чата') : 'Из чата', kcal: +kcal, p: +p, f: +f, c: +c });
}

function switchScreen(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  ['day', 'gym', 'week', 'me'].forEach(s => {
    document.getElementById('screen-' + s).classList.toggle('hidden', s !== name);
  });
  if (name === 'week') renderWeek();
  if (name === 'me') renderMe();
  if (name === 'gym') openGym();
  window.scrollTo(0, 0);
}

/* Данные зала читаем при первом заходе, а не на старте: экран «День» должен
   открываться мгновенно, а история — это 21 запрос в облако Telegram. */
let gymLoaded = false;
async function openGym() {
  if (gymLoaded) { renderGym(); return; }
  state.last = (await Store.get('last')) || {};
  await loadGymHistory();
  await loadGym();
  gymLoaded = true;
  renderGym();
}

async function shiftDay(delta) {
  const d = fromKey(state.view);
  d.setDate(d.getDate() + delta);
  const key = dayKey(d);
  if (key > state.today) return;
  state.view = key;
  state.meals = (await Store.get('f' + key)) || [];
  renderDay();
  haptic('light');
  Sync.refresh(key);
}

/* ---------- запуск ---------- */

async function init() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#faf7f2');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#faf7f2');
  }

  state.meals = (await Store.get('f' + state.view)) || [];
  state.goal = (await Store.get('goal')) || Object.assign({}, DEFAULT_GOAL);
  state.dishes = (await Store.get('my')) || [];
  state.weights = (await Store.get('weights')) || [];

  renderQuick();
  renderDay();
  consumeStartParam();

  /* Сначала досылаем то, что не ушло раньше, потом берём с сервера свежий день:
     иначе серверная версия затёрла бы запись, сделанную без сети. */
  Sync.flush().then(() => Sync.refresh(state.view));

  /* Вернулся в приложение из чата — подтягиваем то, что Claude успел записать */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) Sync.refresh(state.view);
  });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => { switchScreen(btn.dataset.screen); haptic('light'); });
  });

  document.getElementById('shot').addEventListener('click', () => {
    haptic('medium');
    if (WORKER) {
      document.getElementById('shot-input').click();
    } else if (tg && tg.close) {
      /* Пока приёмник не подключён — просто уводим в чат, там фото примет бот */
      toast('Пришли фото боту — посчитаю');
      setTimeout(() => tg.close(), 700);
    } else {
      toast('Открой трекер из Telegram, тогда сработает');
    }
  });

  document.getElementById('shot-input').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) await sendPhoto(file);
  });

  document.getElementById('prev-day').addEventListener('click', () => shiftDay(-1));
  document.getElementById('next-day').addEventListener('click', () => shiftDay(1));
  document.getElementById('gym-prev').addEventListener('click', () => shiftGym(-1));
  document.getElementById('gym-next').addEventListener('click', () => shiftGym(1));
  document.getElementById('add-weight').addEventListener('click', askWeight);
  document.getElementById('add-dish').addEventListener('click', askDish);
  document.getElementById('edit-goal').addEventListener('click', () => {
    const G = state.goal;
    openSheet('Норма на день', `
      <div class="field"><label>ккал</label><input id="in-k" type="number" inputmode="numeric" value="${G.kcal}"></div>
      <div class="field-row">
        <div class="field"><label>белок</label><input id="in-p" type="number" inputmode="numeric" value="${G.p}"></div>
        <div class="field"><label>жиры</label><input id="in-f" type="number" inputmode="numeric" value="${G.f}"></div>
        <div class="field"><label>углев.</label><input id="in-c" type="number" inputmode="numeric" value="${G.c}"></div>
      </div>`, () => {
      const kcal = parseInt(document.getElementById('in-k').value, 10);
      if (isNaN(kcal)) return false;
      state.goal = {
        kcal,
        p: parseInt(document.getElementById('in-p').value, 10) || G.p,
        f: parseInt(document.getElementById('in-f').value, 10) || G.f,
        c: parseInt(document.getElementById('in-c').value, 10) || G.c,
      };
      Store.set('goal', state.goal);
      renderDay(); renderMe();
      toast('Норма обновлена');
      return true;
    });
  });

  document.querySelectorAll('.mac').forEach(mac => {
    mac.addEventListener('click', () => {
      const k = mac.dataset.k;
      const names = { p: 'Белок', f: 'Жиры', c: 'Углеводы' };
      const left = Math.round(state.goal[k] - sum()[k]);
      toast(left > 0 ? `${names[k]}: добрать ещё ${left} г` : `${names[k]}: норма закрыта`);
      haptic('light');
    });
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
