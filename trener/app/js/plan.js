'use strict';

/* Экран «План»: календарь месяца и задачи под ним.

   Задачи приходят из «Дела.md» — их разбирает Claude на компьютере и кладёт
   в KV воркера. Приложение только показывает: редактировать список отсюда
   нельзя, иначедва источника правды разъедутся. */

const Plan = {
  tasks: [],
  view: new Date(),      // какой месяц смотрим
  pick: null,            // выбранный день, 'ГГГГ-ММ-ДД'

  async open() {
    if (!this.tasks.length) {
      this.tasks = (await Store.get('plan')) || [];
      this.paint();
    }
    const fresh = await this.load();
    if (fresh) {
      this.tasks = fresh;
      Store.set('plan', fresh);
      this.paint();
    }
  },

  async load() {
    if (!Sync.ready()) return null;
    try {
      const r = await fetch(`${WORKER}/plan`, { headers: Sync.head() });
      const res = await r.json();
      return res.ok && Array.isArray(res.tasks) ? res.tasks : null;
    } catch (e) {
      return null;
    }
  },

  /* ---------- календарь ---------- */

  paint() {
    const y = this.view.getFullYear();
    const m = this.view.getMonth();
    const first = new Date(y, m, 1);
    /* неделя начинается с понедельника, а getDay() считает от воскресенья */
    const shift = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();

    document.getElementById('cal-month').textContent =
      first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    for (let i = 0; i < shift; i++) grid.appendChild(document.createElement('span'));

    const today = iso(new Date());
    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const list = this.forDay(key);
      const b = document.createElement('button');
      b.className = 'cday'
        + (key === today ? ' today' : '')
        + (key === this.pick ? ' pick' : '')
        + (list.some(t => t.hot) ? ' hot' : list.length ? ' has' : '');
      b.innerHTML = `<b>${d}</b>` + (list.length ? '<i></i>' : '');
      b.addEventListener('click', () => {
        this.pick = this.pick === key ? null : key;
        this.paint();
        haptic('light');
      });
      grid.appendChild(b);
    }

    this.paintLists();
  },

  /** Задачи дня: одиночные по дате и растянутые от «от» до «до» */
  forDay(key) {
    return this.tasks.filter(t => t.from && key >= t.from && key <= (t.to || t.from));
  },

  paintLists() {
    const today = iso(new Date());
    const key = this.pick || today;

    document.getElementById('plan-day-title').textContent =
      key === today ? 'Сегодня' : niceDay(key);
    this.fill('plan-day', this.forDay(key), 'на этот день ничего');

    /* ближайшая неделя — всё с датами вперёд на семь дней, кроме уже показанного */
    const week = [];
    for (let i = 0; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const k = iso(d);
      if (k === key) continue;
      this.forDay(k).forEach(t => { if (!week.includes(t)) week.push(t); });
    }
    this.fill('plan-week', week, 'на неделе пусто');

    this.fill('plan-rest', this.tasks.filter(t => !t.from), 'нет задач без даты');
  },

  fill(id, list, empty) {
    const box = document.getElementById(id);
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = `<div class="slot-empty">${empty}</div>`;
      return;
    }
    list.slice(0, 30).forEach(t => {
      const el = document.createElement('div');
      el.className = 'task' + (t.hot ? ' hot' : '');
      el.innerHTML = '<span class="task-dot"></span><div><b></b><small></small></div>';
      el.querySelector('b').textContent = t.t;
      el.querySelector('small').textContent =
        (t.from ? shortDate(t.from) + (t.to && t.to !== t.from ? '–' + shortDate(t.to) : '') + ' · ' : '')
        + (t.s || '');
      box.appendChild(el);
    });
  },

  bind() {
    document.getElementById('cal-prev').addEventListener('click', () => {
      this.view.setMonth(this.view.getMonth() - 1);
      this.paint();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      this.view.setMonth(this.view.getMonth() + 1);
      this.paint();
    });
  },
};

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shortDate(key) {
  const [y, m, d] = key.split('-');
  return `${+d}.${m}`;
}

function niceDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
