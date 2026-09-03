// Демо панели оператора без сервера: подменяет fetch на /api/admin/*.
// Данные вымышленные и генерируются детерминированно — у всех, кто откроет ссылку, картина одинаковая.
// Кнопки настоящие: отказ по заявке, отметка «отправлено», блокировка игрока меняют состояние в памяти вкладки.
const UNIT = 1e6;
const DAYS = 60;

// Свой генератор случайных чисел с зерном: демо должно выглядеть одинаково у Михаила и у заказчика.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
const r = rng(20260904);
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const between = (a, b) => a + r() * (b - a);
const iso = (d) => new Date(d).toISOString();

// max — потолок множителя игры: у Coinflip он ×1.98, и в демо он не должен становиться ×25.
const GAMES = [
  { game: 'crash', weight: 0.30, max: 64 },
  { game: 'plinko', weight: 0.19, max: 130 },
  { game: 'mines', weight: 0.16, max: 24 },
  { game: 'dice', weight: 0.13, max: 9.9 },
  { game: 'limbo', weight: 0.10, max: 220 },
  { game: 'wheel', weight: 0.07, max: 9.9 },
  { game: 'coinflip', weight: 0.05, max: 1.98 },
];

const NICKS = ['nomad_77', 'kirill.b', 'lucky_tan', 'мурат', 'stas_v', 'anna_k', 'dmitry', 'lev.p', 'zhanna',
  'crypto_ded', 'olegg', 'seryi', 'maria_l', 'timur', 'roman99', 'vlad_m', 'nastya', 'ilnur', 'egor_s',
  'kamil', 'polina', 'ruslan', 'artem_t', 'sofia'];

const midnight = (shift = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - shift);
  return d;
};

/* ── выдуманная жизнь казино за 60 дней ───────────────────────────────── */

const players = NICKS.map((nick, i) => {
  const weight = 0.4 + r() * 3.5;                       // кто-то играет много, кто-то заглянул раз
  return {
    id: i + 1,
    tgId: 700000000 + Math.floor(r() * 89999999),
    name: nick,
    username: nick,
    lang: r() > 0.25 ? 'ru' : 'en',
    weight,
    balance: Math.round(between(2, 320) * UNIT),
    createdAt: iso(midnight(Math.floor(between(1, DAYS)))),
    blockedAt: null,
    blockedReason: null,
  };
});
// Один заблокированный: заказчику важно увидеть, как это выглядит в списке.
players[13].blockedAt = iso(midnight(4));
players[13].blockedReason = 'мультиаккаунт: тот же адрес вывода, что у #7';

const totalWeight = players.reduce((s, p) => s + p.weight, 0);

// День × игра: раунды, оборот, выплаты. Отдача пляшет вокруг 99 % — так и должно быть на живых деньгах.
const days = [...Array(DAYS)].map((_, i) => {
  const date = midnight(DAYS - 1 - i);
  const growth = 0.55 + (i / DAYS) * 0.9;               // казино раскручивается
  const weekend = [0, 6].includes(date.getDay()) ? 1.25 : 1;
  const rounds = Math.round(between(160, 420) * growth * weekend);
  const avgBet = between(1.6, 3.4) * UNIT;
  const wagered = Math.round(rounds * avgBet);
  const rtp = Math.min(1.09, Math.max(0.9, 0.988 + (r() - 0.5) * 0.09));
  const active = new Set([...Array(Math.round(between(6, 16) * growth))].map(() => 1 + Math.floor(r() * players.length)));
  const byGame = GAMES.map((g) => {
    const gr = Math.round(rounds * g.weight);
    const gw = Math.round(wagered * g.weight);
    const grtp = Math.min(1.15, Math.max(0.82, rtp + (r() - 0.5) * 0.06));
    return { game: g.game, rounds: gr, players: Math.max(1, Math.round(active.size * g.weight * 1.6)), wagered: gw, paid: Math.round(gw * grtp), best: Number(between(Math.min(1.4, g.max), g.max).toFixed(2)) };
  });
  return { date, active, byGame };
});

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const allTimeWagered = sum(days, (d) => sum(d.byGame, (g) => g.wagered));

// Оборот игрока — его доля от общего: список игроков и сводка не должны расходиться в разы.
for (const p of players) {
  p.wagered = Math.round((p.weight / totalWeight) * allTimeWagered);
  p.paid = Math.round(p.wagered * Math.min(1.12, Math.max(0.86, 0.985 + (r() - 0.5) * 0.12)));
  p.rounds = Math.max(1, Math.round(p.wagered / between(1.6, 3.4) / UNIT));
  p.lastBet = iso(new Date(midnight(Math.floor(r() * 5)).getTime() + Math.floor(between(9, 23) * 3600e3)));
}

// Депозиты меньше оборота в разы: игрок крутит одни и те же деньги, пока не проиграет разницу.
const deposits = days.flatMap((d) => [...Array(Math.round(between(1, 4)))].map(() => ({
  at: new Date(d.date.getTime() + Math.floor(between(8, 23) * 3600e3)),
  amount: Math.round(between(10, 120) * UNIT),
})));

let wdId = 120;
const withdrawals = [];
for (const d of days.slice(-30)) {
  for (let k = 0; k < Math.round(between(0, 2.4)); k += 1) {
    const p = players[Math.floor(r() * players.length)];
    const at = new Date(d.date.getTime() + Math.floor(between(9, 22) * 3600e3));
    const done = at < midnight(1);
    const rejected = done && r() < 0.12;
    withdrawals.push({
      id: (wdId += 1),
      userId: p.id,
      player: p.name,
      tgId: p.tgId,
      balance: p.balance,
      amount: Math.round(between(8, 260) * UNIT),
      asset: 'USDT',
      address: `T${Math.random().toString(36).slice(2, 12).toUpperCase()}${Math.random().toString(36).slice(2, 22)}`,
      status: rejected ? 'rejected' : done ? 'sent' : 'pending',
      note: rejected ? 'адрес не прошёл проверку' : null,
      spendId: done && !rejected ? `spend_${(wdId * 7717).toString(16)}` : null,
      createdAt: iso(at),
      processedAt: done ? iso(new Date(at.getTime() + between(0.5, 6) * 3600e3)) : null,
    });
  }
}
withdrawals.sort((a, b) => b.id - a.id);

const admins = [
  { id: 1, login: 'owner', role: 'owner', active: true, createdAt: iso(midnight(58)), lastLogin: iso(new Date(Date.now() - 4e6)) },
  { id: 2, login: 'smena_1', role: 'operator', active: true, createdAt: iso(midnight(41)), lastLogin: iso(new Date(Date.now() - 9e6)) },
  { id: 3, login: 'buhgalter', role: 'viewer', active: true, createdAt: iso(midnight(22)), lastLogin: iso(midnight(2)) },
];

let auditId = 400;
const audit = [
  { action: 'withdraw_sent', target: '138', data: { amount: 84000000, address: 'TQm…' } },
  { action: 'login', target: null, data: null },
  { action: 'player_block', target: '14', data: { reason: 'мультиаккаунт' } },
  { action: 'export', target: 'ledger', data: { period: 'd30', rows: 4821 } },
  { action: 'withdraw_rejected', target: '131', data: { amount: 41000000, note: 'адрес не прошёл проверку' } },
  { action: 'login_failed', target: 'smena_1', data: null },
  { action: 'admin_created', target: 'buhgalter', data: { role: 'viewer' } },
  { action: 'password_changed', target: null, data: null },
].map((e, i) => ({
  id: (auditId -= 1),
  login: pick(['owner', 'smena_1']),
  ip: pick(['31.184.238.11', '95.191.20.4', '188.113.164.7']),
  createdAt: iso(new Date(Date.now() - (i + 1) * between(1.5, 9) * 36e5)),
  ...e,
}));

/* ── ответы вместо сервера ────────────────────────────────────────────── */

const PERIODS = { today: 'сегодня', d7: '7 дней', d30: '30 дней', all: 'всё время' };
const since = (key) => ({ today: midnight(0), d7: midnight(7), d30: midnight(30), all: midnight(DAYS + 1) }[key] || midnight(30));

const slice = (key) => days.filter((d) => d.date >= since(key));

function overview(key) {
  const sel = slice(key);
  const wagered = sum(sel, (d) => sum(d.byGame, (g) => g.wagered));
  const paid = sum(sel, (d) => sum(d.byGame, (g) => g.paid));
  const rounds = sum(sel, (d) => sum(d.byGame, (g) => g.rounds));
  const active = new Set(sel.flatMap((d) => [...d.active]));
  const from = since(key);
  const dep = deposits.filter((x) => x.at >= from);
  const wd = withdrawals.filter((x) => new Date(x.createdAt) >= from && x.status !== 'rejected');
  const pending = withdrawals.filter((x) => x.status === 'pending');
  return {
    period: { key, label: PERIODS[key] || PERIODS.d30 },
    ggr: wagered - paid,
    rtp: wagered ? paid / wagered : 0,
    rounds,
    activePlayers: active.size,
    wagered,
    paid,
    avgBet: rounds ? Math.round(wagered / rounds) : 0,
    deposits: sum(dep, (x) => x.amount),
    withdrawn: sum(wd, (x) => x.amount),
    bonuses: 0,
    players: {
      total: players.length,
      fresh: players.filter((p) => new Date(p.createdAt) >= from).length,
      blocked: players.filter((p) => p.blockedAt).length,
    },
    pending: { count: pending.length, sum: sum(pending, (x) => x.amount) },
    liability: sum(players, (p) => p.balance),
    openRounds: 3,
  };
}

function games(key) {
  const sel = slice(key);
  const out = GAMES.map(({ game }) => {
    const rows = sel.map((d) => d.byGame.find((g) => g.game === game)).filter(Boolean);
    const wagered = sum(rows, (g) => g.wagered);
    const paid = sum(rows, (g) => g.paid);
    return {
      game,
      rounds: sum(rows, (g) => g.rounds),
      players: Math.max(...rows.map((g) => g.players), 0),
      wagered,
      paid,
      ggr: wagered - paid,
      rtp: wagered ? paid / wagered : 0,
      best: Math.max(...rows.map((g) => g.best), 0),
    };
  }).filter((g) => g.rounds);
  out.sort((a, b) => b.ggr - a.ggr);
  return { period: { key, label: PERIODS[key] || PERIODS.d30 }, games: out };
}

const daily = () => ({
  days: days.slice(-30).map((d) => {
    const wagered = sum(d.byGame, (g) => g.wagered);
    const paid = sum(d.byGame, (g) => g.paid);
    return { day: iso(d.date), rounds: sum(d.byGame, (g) => g.rounds), wagered, paid, ggr: wagered - paid };
  }),
});

const playerView = (p) => ({ ...p, ggr: p.wagered - p.paid });

function playerCard(id) {
  const p = players.find((x) => x.id === id);
  if (!p) throw new Error('игрок не найден');
  const rounds = [...Array(14)].map((_, i) => {
    const bet = Math.round(between(0.5, 12) * UNIT);
    const win = r() < 0.46;
    const mult = win ? Number(between(1.1, 7).toFixed(2)) : 0;
    return {
      id: 90000 - i,
      game: pick(GAMES).game,
      bet,
      payout: Math.round(bet * mult),
      multiplier: mult,
      nonce: 400 - i,
      status: 'settled',
      createdAt: iso(new Date(Date.now() - (i + 1) * between(0.3, 3) * 36e5)),
    };
  });
  let bal = p.balance;
  const ledger = rounds.flatMap((x) => {
    const rows = [];
    if (x.payout) { rows.push({ id: x.id * 2, delta: x.payout, kind: 'win', ref: String(x.id), balanceAfter: bal, createdAt: x.createdAt }); bal -= x.payout; }
    rows.push({ id: x.id * 2 - 1, delta: -x.bet, kind: 'bet', ref: String(x.id), balanceAfter: bal, createdAt: x.createdAt });
    bal += x.bet;
    return rows;
  }).slice(0, 20);
  return {
    player: playerView(p),
    stats: { rounds: p.rounds, wagered: p.wagered, paid: p.paid, ggr: p.wagered - p.paid },
    seed: { serverHash: 'c1f4b7a9e2d8', clientSeed: 'demo-client', nonce: 412 },
    rounds,
    ledger,
    withdrawals: withdrawals.filter((w) => w.userId === id).slice(0, 10),
  };
}

const logAction = (action, target, data) => audit.unshift({
  id: (auditId += 1), login: 'owner', action, target: target == null ? null : String(target), data: data || null,
  ip: '127.0.0.1', createdAt: iso(new Date()),
});

/* ── подмена fetch ────────────────────────────────────────────────────── */

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const real = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (!url.pathname.startsWith('/api/admin/')) return real(input, init);
  const path = url.pathname.replace('/api/admin', '');
  const period = url.searchParams.get('period') || 'd30';
  const body = init.body ? JSON.parse(init.body) : {};
  await new Promise((res) => setTimeout(res, 120));           // маленькая задержка: видно, что панель живая

  if (path === '/login') return json({ admin: { login: 'owner', role: 'owner' } });
  if (path === '/logout') return json({ ok: true });
  if (path === '/me') return json({ admin: { id: 1, login: 'демо', role: 'owner' }, periods: Object.entries(PERIODS).map(([key, label]) => ({ key, label })) });
  if (path === '/overview') return json(overview(period));
  if (path === '/games') return json(games(period));
  if (path === '/daily') return json(daily());
  if (path === '/players') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const list = players.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.tgId) === q || String(p.id) === q);
    return json({ players: [...list].sort((a, b) => b.wagered - a.wagered).map(playerView) });
  }
  if (/^\/players\/\d+$/.test(path)) return json(playerCard(Number(path.split('/')[2])));
  if (/^\/players\/\d+\/block$/.test(path)) {
    const p = players.find((x) => x.id === Number(path.split('/')[2]));
    p.blockedAt = body.blocked === false ? null : iso(new Date());
    p.blockedReason = body.blocked === false ? null : (body.reason || null);
    logAction(body.blocked === false ? 'player_unblock' : 'player_block', p.id, body.reason ? { reason: body.reason } : null);
    return json({ blockedAt: p.blockedAt, blockedReason: p.blockedReason });
  }
  if (path === '/withdrawals') {
    const status = url.searchParams.get('status');
    return json({ withdrawals: withdrawals.filter((w) => !status || w.status === status) });
  }
  if (/^\/withdrawals\/\d+\/(sent|reject)$/.test(path)) {
    const [, , id, what] = path.split('/');
    const w = withdrawals.find((x) => x.id === Number(id));
    if (!w || w.status !== 'pending') return json({ error: 'заявка уже обработана' }, 400);
    w.status = what === 'sent' ? 'sent' : 'rejected';
    w.processedAt = iso(new Date());
    if (what === 'sent') w.spendId = body.spendId || null; else w.note = body.note || null;
    logAction(what === 'sent' ? 'withdraw_sent' : 'withdraw_rejected', w.id, { amount: w.amount, ...(w.note ? { note: w.note } : {}) });
    return json({ withdrawal: { id: w.id, status: w.status } });
  }
  if (path === '/audit') return json({ entries: audit.slice(0, 200) });
  if (path === '/admins') return json({ admins });
  if (path === '/password') return json({ error: 'в демо пароль не меняется' }, 400);
  if (path.startsWith('/admins')) return json({ error: 'в демо доступы не меняются' }, 400);
  return json({ error: 'в демо этого нет' }, 404);
};

/* ── выгрузка CSV прямо из браузера ───────────────────────────────────── */

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /["\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const csv = (head, rows) => '﻿' + [head, ...rows].map((x) => x.map(csvCell).join(';')).join('\r\n');

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('.dl a[id^="ex-"]');
  if (!link) return;
  e.preventDefault();
  const key = new URL(link.href, location.href).searchParams.get('period') || 'd30';
  if (link.id === 'ex-rounds') {
    download(`rounds-${key}.csv`, csv(['день', 'игра', 'раундов', 'оборот', 'выплаты'],
      slice(key).flatMap((d) => d.byGame.map((g) => [d.date.toLocaleDateString('ru-RU'), g.game, g.rounds, (g.wagered / UNIT).toFixed(2), (g.paid / UNIT).toFixed(2)]))));
  } else if (link.id === 'ex-ledger') {
    download(`ledger-${key}.csv`, csv(['игрок', 'tg_id', 'оборот', 'выплаты', 'баланс'],
      players.map((p) => [p.name, p.tgId, (p.wagered / UNIT).toFixed(2), (p.paid / UNIT).toFixed(2), (p.balance / UNIT).toFixed(2)])));
  } else {
    download(`withdrawals-${key}.csv`, csv(['id', 'создана', 'игрок', 'сумма', 'адрес', 'статус'],
      withdrawals.map((w) => [w.id, new Date(w.createdAt).toLocaleString('ru-RU'), w.player, (w.amount / UNIT).toFixed(2), w.address, w.status])));
  }
}, true);

document.getElementById('demo-bar').hidden = false;
