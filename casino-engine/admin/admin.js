// Панель оператора. Ванильный JS: экран входа, шесть вкладок, период в шапке.
// Таблицы строятся из массива ячеек: каждая ячейка знает подпись своей колонки и на телефоне показывает её слева.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const UNIT = 1e6;

const state = { admin: null, period: 'd30', tab: 'overview', wdStatus: 'pending', player: null };

/* ── обмен с сервером ─────────────────────────────────────────────────── */

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  // Кука кончилась — показываем вход и прерываем цепочку: вернуть undefined значит уронить вызывающий код.
  if (res.status === 401 && state.admin) {
    gate('сессия закончилась, войдите заново');
    throw new Error('нужен вход');
  }
  if (!res.ok) throw new Error(data.error || `ошибка ${res.status}`);
  return data;
}

const showError = (e) => {
  const box = $('#err');
  box.textContent = e.message || String(e);
  box.hidden = false;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  setTimeout(() => { box.hidden = true; }, 6000);
};

/* ── форматирование ───────────────────────────────────────────────────── */

const money = (units, sign = false) => {
  const v = (units || 0) / UNIT;
  const s = v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sign && v > 0 ? `+${s}` : s;
};
const pct = (v) => `${((v || 0) * 100).toFixed(2)} %`;
const int = (v) => (v || 0).toLocaleString('ru-RU');
const dt = (v) => (v ? new Date(v).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (v) => new Date(v).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const signClass = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'mut');
// Статусы заявок — по-русски: панель читает администратор салона, а не разработчик.
const WD_STATUS = { pending: 'ждёт', approved: 'одобрен', sent: 'отправлен', rejected: 'отказ' };
const statusTag = (s) => `<span class="tag ${s}">${WD_STATUS[s] || esc(s)}</span>`;
// «1 заявка», «2 заявки», «5 заявок» — иначе панель выглядит машинным переводом.
const plural = (n, [one, few, many]) => {
  const a = Math.abs(n) % 100; const b = a % 10;
  return `${int(n)} ${a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many}`;
};

// Ячейка таблицы: строка либо { h, n (цифры вправо), wide (длинный адрес), cls, label }.
// data-label — подпись колонки: на телефоне строка разворачивается в карточку «подпись → значение».
function cellHtml(c, head = {}) {
  const o = c && typeof c === 'object' ? c : { h: c };
  const cls = [(o.n ?? head.n) ? 'n' : '', o.wide ? 'wide' : '', o.cls || ''].filter(Boolean).join(' ');
  return `<td class="${cls}" data-label="${esc(o.label ?? head.t ?? '')}">${o.h ?? ''}</td>`;
}

const table = (head, rows, empty = 'Пусто') => (rows.length
  ? `<thead><tr>${head.map((h) => `<th class="${h.n ? 'n' : ''}">${esc(h.t)}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr${r.attrs || ''}>${(r.cells || r).map((c, i) => cellHtml(c, head[i])).join('')}</tr>`).join('')}</tbody>`
  : `<tbody><tr><td class="empty" colspan="${head.length}">${empty}</td></tr></tbody>`);

// Вопрос оператору вместо prompt(): деньги и блокировки подтверждаются в своём окне.
// Ответ ловим и по событию close, и по отправке формы: часть встроенных браузеров close не присылает.
// Если <dialog> в браузере нет вовсе (Safari до 15.4), спрашиваем системным окном — лишь бы кнопка работала.
function ask({ title, label, note = '', value = '', required = false }) {
  const dlg = $('#ask');
  if (typeof dlg?.showModal !== 'function') {
    const v = prompt(`${title}. ${label}:`, value);
    return Promise.resolve(v === null ? null : v.trim());
  }
  $('#ask-title').textContent = title;
  $('#ask-label').textContent = label;
  $('#ask-note').textContent = note;
  const input = $('#ask-input');
  input.value = value;
  input.required = required;
  dlg.showModal();
  return new Promise((resolve) => {
    const done = () => resolve(dlg.returnValue === 'ok' ? input.value.trim() : null);
    dlg.addEventListener('close', done, { once: true });
    dlg.querySelector('form').addEventListener('submit', () => setTimeout(() => { if (!dlg.open) done(); }), { once: true });
  });
}

/* ── вход ─────────────────────────────────────────────────────────────── */

function gate(message) {
  state.admin = null;
  $('#app').hidden = true;
  $('#gate').hidden = false;
  const err = $('#login-err');
  err.hidden = !message;
  if (message) err.textContent = message;
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/login', { method: 'POST', body: { login: f.get('login'), password: f.get('password') } });
    e.target.reset();
    await start();
  } catch (err) { gate(err.message); }
});

$('#logout').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' }).catch(() => {});
  gate();
});

/* ── вкладки и период ─────────────────────────────────────────────────── */

function openTab(name) {
  state.tab = name;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.tab').forEach((s) => { s.hidden = s.dataset.tab !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  openTab(btn.dataset.tab);
  render();
});

$('#period').addEventListener('change', (e) => { state.period = e.target.value; render(); });

$('#refresh').addEventListener('click', (e) => {
  e.currentTarget.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 500 });
  render();
});

const q = () => `?period=${state.period}`;

/* ── сводка ───────────────────────────────────────────────────────────── */

async function renderOverview() {
  const [o, d] = await Promise.all([api(`/overview${q()}`), api('/daily?days=30')]);
  const kpi = (label, value, hint, cls = '') => `<div class="kpi ${cls}"><small>${label}</small><b>${value}</b><i>${hint}</i></div>`;
  $('#ov-cards').innerHTML = [
    kpi('Доход (GGR)', money(o.ggr, true), `${o.period.label} · ставки минус выплаты`, o.ggr >= 0 ? 'good' : 'bad'),
    kpi('Оборот ставок', money(o.wagered), `${plural(o.rounds, ['раунд', 'раунда', 'раундов'])}, средняя ${money(o.avgBet)}`),
    kpi('Фактическая отдача', pct(o.rtp), 'расчётная 99 %'),
    kpi('Игроки', int(o.activePlayers), `всего ${int(o.players.total)}, новых ${int(o.players.fresh)}${o.players.blocked ? `, заблокировано ${o.players.blocked}` : ''}`),
    kpi('Депозиты', money(o.deposits), `выведено ${money(o.withdrawn)}`),
    kpi('Ждут вывода', money(o.pending.sum), plural(o.pending.count, ['заявка', 'заявки', 'заявок']), o.pending.count ? 'warn' : ''),
    kpi('Долг игрокам', money(o.liability), 'баланс всех кошельков'),
    kpi('Незакрытых раундов', int(o.openRounds), 'mines и crash в игре'),
  ].join('');

  // Дни без ставок сервер не присылает — достраиваем их нулями, иначе два дня растягиваются на всю ширину.
  $('#daily-note').textContent = '30 дней';
  const byDay = new Map(d.days.map((x) => [new Date(x.day).toDateString(), x]));
  const slots = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - i));
    return byDay.get(date.toDateString()) || { day: date, ggr: 0, rounds: 0 };
  });
  const max = Math.max(1, ...slots.map((x) => Math.abs(x.ggr)));
  $('#daily').innerHTML = d.days.length
    ? slots.map((x) => `<div class="col" title="${day(x.day)}: доход ${money(x.ggr, true)}, ${plural(x.rounds, ['раунд', 'раунда', 'раундов'])}">
        <div class="bar ${x.ggr < 0 ? 'neg' : ''}${x.rounds ? '' : ' zero'}" style="height:${Math.max(2, (Math.abs(x.ggr) / max) * 100)}%"></div></div>`).join('')
    : '<p class="empty">За 30 дней раундов не было</p>';

  $('#check').textContent = `Долг игрокам ${money(o.liability)} USDT — это сумма всех кошельков. `
    + 'Она обязана совпадать с суммой движений в журнале: депозиты и бонусы минус выводы, минус доход оператора. '
    + 'Расхождение означает правку баланса в обход журнала.';

  for (const [id, what] of [['#ex-rounds', 'rounds'], ['#ex-ledger', 'ledger'], ['#ex-wd', 'withdrawals']]) {
    $(id).href = `/api/admin/export/${what}${q()}`;
  }
}

/* ── игры ─────────────────────────────────────────────────────────────── */

async function renderGames() {
  const { games, period } = await api(`/games${q()}`);
  $('#games-note').textContent = period.label;
  $('#games-tbl').innerHTML = table(
    [{ t: 'Игра' }, { t: 'Раундов', n: 1 }, { t: 'Игроков', n: 1 }, { t: 'Оборот', n: 1 }, { t: 'Выплачено', n: 1 }, { t: 'Доход', n: 1 }, { t: 'Отдача', n: 1 }, { t: 'Лучший ×', n: 1 }],
    games.map((g) => [
      `<b>${esc(g.game)}</b>`,
      int(g.rounds),
      int(g.players),
      money(g.wagered),
      money(g.paid),
      { h: money(g.ggr, true), cls: signClass(g.ggr) },
      pct(g.rtp),
      { h: `×${g.best.toFixed(2)}`, cls: 'mut' },
    ]),
    'За период раундов не было',
  );
}

/* ── игроки ───────────────────────────────────────────────────────────── */

async function renderPlayers() {
  const { players } = await api(`/players?limit=100&q=${encodeURIComponent($('#pl-q').value.trim())}`);
  $('#players-tbl').innerHTML = table(
    [{ t: 'Игрок' }, { t: 'tg_id', n: 1 }, { t: 'Баланс', n: 1 }, { t: 'Раундов', n: 1 }, { t: 'Оборот', n: 1 }, { t: 'Доход с него', n: 1 }, { t: 'Последняя ставка' }, { t: '' }],
    players.map((p) => ({
      attrs: ` data-id="${p.id}"${state.player === p.id ? ' class="sel"' : ''}`,
      cells: [
        `<b>${esc(p.name)}</b>${p.blockedAt ? ' <span class="tag blocked">блок</span>' : ''}`,
        { h: p.tgId, cls: 'mut' },
        money(p.balance),
        int(p.rounds),
        money(p.wagered),
        { h: money(p.ggr, true), cls: signClass(p.ggr) },
        { h: dt(p.lastBet), cls: 'mut' },
        { h: `<button class="act" data-open="${p.id}">Карточка</button>`, cls: 'act-cell', label: '' },
      ],
    })),
    'Никого не нашлось',
  );
  if (state.player) await renderPlayerCard(state.player);
}

async function renderPlayerCard(id) {
  const card = $('#player-card');
  const d = await api(`/players/${id}`);
  const p = d.player;
  card.hidden = false;
  state.player = id;
  card.innerHTML = `
    <div class="pc-head">
      <h2>${esc(p.name)} <small>id ${p.id} · tg ${p.tgId} · с ${dt(p.createdAt)}</small></h2>
      <button class="ico" id="close-card" title="Закрыть" aria-label="Закрыть">✕</button>
    </div>
    ${p.blockedAt ? `<p class="err">Заблокирован ${dt(p.blockedAt)}${p.blockedReason ? `: ${esc(p.blockedReason)}` : ''}</p>` : ''}
    <div class="cards">
      <div class="kpi"><small>Баланс</small><b>${money(p.balance)}</b><i>USDT</i></div>
      <div class="kpi"><small>Оборот</small><b>${money(d.stats.wagered)}</b><i>${plural(d.stats.rounds, ['раунд', 'раунда', 'раундов'])}</i></div>
      <div class="kpi ${d.stats.ggr >= 0 ? 'good' : 'bad'}"><small>Доход с игрока</small><b>${money(d.stats.ggr, true)}</b><i>ставки минус выплаты</i></div>
      <div class="kpi"><small>Пара сидов</small><b>${d.seed ? `#${d.seed.nonce}` : '—'}</b><i>${d.seed ? `${esc(d.seed.serverHash.slice(0, 12))}…` : 'нет активной'}</i></div>
    </div>
    <div class="row-btn">
      <button class="act ${p.blockedAt ? '' : 'danger'}" id="block-btn">${p.blockedAt ? 'Разблокировать' : 'Заблокировать'}</button>
    </div>
    <div class="pc-sub">
      <div><h2>Последние раунды</h2><div class="scroll"><table>${table(
    [{ t: 'Время' }, { t: 'Игра' }, { t: 'Ставка', n: 1 }, { t: 'Выплата', n: 1 }, { t: 'Множитель', n: 1 }],
    d.rounds.map((r) => [
      { h: dt(r.createdAt), cls: 'mut' },
      `${esc(r.game)}${r.status === 'open' ? ' <span class="tag pending">идёт</span>' : ''}`,
      money(r.bet),
      { h: money(r.payout), cls: r.payout ? 'pos' : 'mut' },
      { h: r.multiplier ? `×${r.multiplier.toFixed(2)}` : '—', cls: 'mut' },
    ]),
    'Ставок не было',
  )}</table></div></div>
      <div><h2>Движения денег</h2><div class="scroll"><table>${table(
    [{ t: 'Время' }, { t: 'Тип' }, { t: 'Сумма', n: 1 }, { t: 'Баланс после', n: 1 }],
    d.ledger.map((e) => [
      { h: dt(e.createdAt), cls: 'mut' },
      esc(e.kind),
      { h: money(e.delta, true), cls: signClass(e.delta) },
      { h: money(e.balanceAfter), cls: 'mut' },
    ]),
    'Движений не было',
  )}</table></div></div>
      ${d.withdrawals.length ? `<div><h2>Выводы</h2><div class="scroll"><table>${table(
    [{ t: 'Создана' }, { t: 'Сумма', n: 1 }, { t: 'Адрес' }, { t: 'Статус' }],
    d.withdrawals.map((w) => [
      { h: dt(w.createdAt), cls: 'mut' },
      money(w.amount),
      { h: esc(w.address), wide: 1 },
      statusTag(w.status),
    ]),
  )}</table></div></div>` : ''}
    </div>`;

  $('#close-card').addEventListener('click', () => { state.player = null; card.hidden = true; renderPlayers().catch(showError); });
  $('#block-btn').addEventListener('click', async () => {
    const on = !p.blockedAt;
    const reason = on
      ? await ask({ title: 'Заблокировать игрока', label: 'Причина', note: 'Ставки и вывод запретим сразу. Причину видит только оператор, она уходит в журнал действий.' })
      : null;
    if (on && reason === null) return;
    try {
      await api(`/players/${id}/block`, { method: 'POST', body: { blocked: on, reason } });
      await renderPlayers();
    } catch (e) { showError(e); }
  });
  card.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

$('#players-tbl').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-open]');
  if (btn) renderPlayerCard(Number(btn.dataset.open)).catch(showError);
});
let searchTimer;
$('#pl-q').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderPlayers().catch(showError), 250);
});

/* ── выводы ───────────────────────────────────────────────────────────── */

async function renderWithdrawals() {
  const { withdrawals } = await api(`/withdrawals?limit=200${state.wdStatus ? `&status=${state.wdStatus}` : ''}`);
  $('#wd-tbl').innerHTML = table(
    [{ t: 'Создана' }, { t: 'Игрок' }, { t: 'Сумма', n: 1 }, { t: 'Адрес' }, { t: 'Статус' }, { t: 'Решение' }],
    withdrawals.map((w) => [
      { h: dt(w.createdAt), cls: 'mut' },
      `<button class="act" data-player="${w.userId}">${esc(w.player)}</button>`,
      `${money(w.amount)} ${esc(w.asset)}`,
      { h: esc(w.address), wide: 1 },
      `${statusTag(w.status)}${w.note ? `<div class="mut" style="font-size:11.5px;margin-top:4px">${esc(w.note)}</div>` : ''}`,
      w.status === 'pending'
        ? { h: `<button class="act" data-sent="${w.id}">Отправлено</button><button class="act danger" data-reject="${w.id}">Отказать</button>`, cls: 'act-cell', label: '' }
        : { h: dt(w.processedAt), cls: 'mut' },
    ]),
    state.wdStatus === 'pending' ? 'Заявок в очереди нет' : 'Пусто',
  );
  const pending = withdrawals.filter((w) => w.status === 'pending').length;
  const badge = $('#wd-badge');
  badge.hidden = state.wdStatus !== 'pending' || !pending;
  badge.textContent = pending;
}

$('#wd-filter').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-status]');
  if (!btn) return;
  state.wdStatus = btn.dataset.status;
  $$('#wd-filter button').forEach((b) => b.classList.toggle('on', b === btn));
  renderWithdrawals().catch(showError);
});

$('#wd-tbl').addEventListener('click', async (e) => {
  const sent = e.target.closest('button[data-sent]');
  const reject = e.target.closest('button[data-reject]');
  const player = e.target.closest('button[data-player]');
  try {
    if (player) {
      openTab('players');
      await renderPlayers();
      await renderPlayerCard(Number(player.dataset.player));
      return;
    }
    if (sent) {
      const spendId = await ask({ title: 'Отметить отправленным', label: 'Идентификатор перевода', note: 'Хеш транзакции или номер операции — можно оставить пустым. Заявка закроется, деньги уже списаны с баланса игрока.' });
      if (spendId === null) return;
      await api(`/withdrawals/${sent.dataset.sent}/sent`, { method: 'POST', body: { spendId } });
      await renderWithdrawals();
    }
    if (reject) {
      const note = await ask({ title: 'Отказать в выводе', label: 'Причина', required: true, note: 'Причину увидит игрок в боте. Сумма вернётся на его баланс.' });
      if (!note) return;
      await api(`/withdrawals/${reject.dataset.reject}/reject`, { method: 'POST', body: { note } });
      await renderWithdrawals();
    }
  } catch (err) { showError(err); }
});

/* ── журнал ───────────────────────────────────────────────────────────── */

async function renderAudit() {
  const { entries } = await api('/audit?limit=200');
  $('#audit-tbl').innerHTML = table(
    [{ t: 'Время' }, { t: 'Кто' }, { t: 'Действие' }, { t: 'Над чем' }, { t: 'Подробности' }, { t: 'IP' }],
    entries.map((e) => [
      { h: dt(e.createdAt), cls: 'mut' },
      `<b>${esc(e.login || '—')}</b>`,
      esc(e.action),
      { h: esc(e.target || '—'), cls: 'mut' },
      { h: e.data ? esc(JSON.stringify(e.data)) : '—', wide: 1 },
      { h: esc(e.ip || '—'), cls: 'mut' },
    ]),
    'Действий пока не было',
  );
}

/* ── доступы ──────────────────────────────────────────────────────────── */

async function renderAdmins() {
  const { admins } = await api('/admins');
  const owner = state.admin.role === 'owner';
  $('#admins-tbl').innerHTML = table(
    [{ t: 'Логин' }, { t: 'Роль' }, { t: 'Заведён' }, { t: 'Последний вход' }, { t: '' }],
    admins.map((a) => [
      `<b>${esc(a.login)}</b>${a.active ? '' : ' <span class="tag">выключен</span>'}`,
      esc(a.role),
      { h: dt(a.createdAt), cls: 'mut' },
      { h: dt(a.lastLogin), cls: 'mut' },
      owner && a.login !== state.admin.login
        ? { h: `<button class="act ${a.active ? 'danger' : ''}" data-toggle="${a.id}" data-active="${a.active ? '0' : '1'}">${a.active ? 'Выключить' : 'Включить'}</button>`, cls: 'act-cell', label: '' }
        : { h: '', label: '' },
    ]),
  );
  $('#add-admin').hidden = !owner;
}

$('#admins-tbl').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-toggle]');
  if (!btn) return;
  try {
    await api(`/admins/${btn.dataset.toggle}/active`, { method: 'POST', body: { active: btn.dataset.active === '1' } });
    await renderAdmins();
  } catch (err) { showError(err); }
});

$('#add-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/admins', { method: 'POST', body: { login: f.get('login'), password: f.get('password'), role: f.get('role') } });
    e.target.reset();
    await renderAdmins();
  } catch (err) { showError(err); }
});

$('#pass-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/password', { method: 'POST', body: { current: f.get('current'), next: f.get('next') } });
    e.target.reset();
    showError(new Error('пароль сменён, остальные сессии закрыты'));
  } catch (err) { showError(err); }
});

/* ── запуск ───────────────────────────────────────────────────────────── */

const renderers = {
  overview: renderOverview,
  games: renderGames,
  players: renderPlayers,
  withdrawals: renderWithdrawals,
  audit: renderAudit,
  admins: renderAdmins,
};

const render = () => renderers[state.tab]().catch(showError);

async function start() {
  const me = await api('/me');
  state.admin = me.admin;
  $('#gate').hidden = true;
  $('#app').hidden = false;
  $('#who').textContent = `${me.admin.login} · ${me.admin.role}`;
  $('#period').innerHTML = me.periods.map((p) => `<option value="${p.key}"${p.key === state.period ? ' selected' : ''}>${p.label}</option>`).join('');
  await render();
  // Очередь выводов держим свежей: оператор смотрит в эту цифру, не обновляя страницу.
  clearInterval(start.timer);
  start.timer = setInterval(async () => {
    if (!state.admin) return clearInterval(start.timer);
    const { withdrawals } = await api('/withdrawals?status=pending&limit=200').catch(() => ({ withdrawals: [] }));
    const badge = $('#wd-badge');
    badge.hidden = !withdrawals.length;
    badge.textContent = withdrawals.length;
  }, 30000);
}

start().catch(() => gate());
