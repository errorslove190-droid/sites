/* Mini App движка: лобби, семь игр, кошелёк, профиль, шесть тем. Математика игр — из тех же модулей, что на сервере. */
import * as diceG from '../games/dice.js';
import * as minesG from '../games/mines.js';
import * as plinkoG from '../games/plinko.js';
import * as limboG from '../games/limbo.js';
import * as wheelG from '../games/wheel.js';
import { GROWTH } from '../games/crash.js';
import { GAMES, POPULAR, THEMES, gameOf, tile, themeButtons, segColor } from './catalog.js';

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const UNIT = 1e6;
const DEMO = location.hostname.endsWith('github.io') || new URLSearchParams(location.search).has('demo');
const mock = DEMO ? (await import('./mock.js')).createMock() : null;
if (DEMO) $('#demo-bar').hidden = false;

const fmt = (u) => (u / UNIT).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (u) => (u / UNIT).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
const mult = (x) => '×' + Number(x).toFixed(2);
// Когда вкладка не видна, анимации не нужны: браузер всё равно душит таймеры, а результат уже известен.
const sleep = (ms) => (document.hidden ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

const st = { balance: 0, seed: null, config: { minBet: 100000, maxBet: 1e9, devMode: false }, me: null, screen: 'home', game: null, side: 'heads', mines: null, rounds: [], busy: false, crashBet: 0 };

/* ---------- общее ---------- */
function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (tg && tg.initData) h['X-Init-Data'] = tg.initData;
  else h['X-Dev-User'] = localStorage.getItem('devUser') || '1';
  return h;
}
async function api(path, body) {
  if (mock) return mock(path, body);
  const r = await fetch('/api' + path, { method: body ? 'POST' : 'GET', headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'ошибка ' + r.status);
  return j;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}
const haptic = (kind) => { try { tg && tg.HapticFeedback.notificationOccurred(kind); } catch (e) { /* не в Telegram */ } };
function setBalance(u) { st.balance = u; $('#bal').textContent = fmt(u); $('#w-bal').textContent = fmt(u); }
function setSeed(seed) {
  st.seed = seed;
  $('#pf-hash').textContent = 'sha256 ' + seed.serverHash.slice(0, 6) + '…' + seed.serverHash.slice(-4);
  $('#pf-nonce').textContent = 'раунд #' + (seed.nonce + 1);
}
const betUnits = () => Math.round((parseFloat($('#bet').value) || 0) * UNIT);
const setBet = (u) => { $('#bet').value = (Math.max(st.config.minBet, Math.min(u, st.config.maxBet)) / UNIT).toFixed(2); refreshCalc(); };

/* ---------- темы ---------- */
function applyTheme(name) {
  document.body.dataset.theme = name;
  try { localStorage.setItem('theme', name); } catch (e) { /* приватный режим */ }
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  try { tg && tg.setHeaderColor(bg); tg && tg.setBackgroundColor(bg); } catch (e) { /* старый клиент */ }
  $$('#themes button').forEach((b) => b.classList.toggle('on', b.dataset.theme === name));
  if (st.game === 'wheel') drawWheel();
}
$('#themes').innerHTML = themeButtons();
$('#themes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { applyTheme(b.dataset.theme); toast('Тема: ' + THEMES.find((t) => t[0] === b.dataset.theme)[1]); } });
const wanted = new URLSearchParams(location.search).get('theme');
applyTheme(THEMES.some(([k]) => k === wanted) ? wanted : (localStorage.getItem('theme') || 'lucky'));

/* ---------- каталог игр ---------- */
function renderTiles(cat = 'all') {
  const list = GAMES.filter((g) => cat === 'all' || g.cat === cat);
  $('#tiles').innerHTML = list.map(tile).join('');
  $('#cnt').textContent = list.length;
  $('#popular').innerHTML = POPULAR.map((id) => tile(gameOf(id))).join('');
  $$('[data-cat-list]').forEach((el) => { el.innerHTML = GAMES.filter((g) => g.cat === el.dataset.catList).map(tile).join(''); });
}
$('#cats').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#cats button').forEach((x) => x.classList.toggle('on', x === b));
  renderTiles(b.dataset.cat);
});
$('#search').addEventListener('input', () => {
  const q = $('#search').value.trim().toLowerCase();
  $$('[data-screen="games"] .tile').forEach((t) => { t.hidden = q && !gameOf(t.dataset.open).name.toLowerCase().includes(q); });
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openGame(b.dataset.open); });

/* ---------- навигация ---------- */
function show(name) {
  st.screen = name;
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
  try { if (tg) { if (name === 'game') tg.BackButton.show(); else tg.BackButton.hide(); } } catch (e) { /* старый клиент */ }
  window.scrollTo(0, 0);
  if (name === 'wallet') loadLedger();
  if (name === 'profile') renderProfile();
}
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.go); });
const goBack = () => show('home');
$('#back').addEventListener('click', goBack);
try { tg && tg.BackButton.onClick(goBack); } catch (e) { /* старый клиент */ }
$('#bal-btn').addEventListener('click', () => show('wallet'));

/* ---------- экран игры ---------- */
const GO = { dice: 'Сделать ставку', coinflip: 'Бросить монету', mines: 'Начать', crash: 'Ставка', plinko: 'Бросить шарик', limbo: 'Играть', wheel: 'Крутить' };
function openGame(id) {
  st.game = id;
  $('#g-title').textContent = gameOf(id).name;
  GAMES.forEach((g) => { $('#g-' + g.id).hidden = g.id !== id; });
  if (id === 'plinko') drawBoard();
  if (id === 'wheel') drawWheel();
  if (id === 'mines') renderMines();
  refreshCalc();
  renderHist();
  refreshGo();
  show('game');
}
function refreshGo() {
  const go = $('#go');
  go.classList.remove('cash');
  go.disabled = st.busy;
  if (st.game === 'mines' && st.mines) {
    const k = st.mines.revealed.length;
    go.textContent = k ? 'Забрать ' + fmt(Math.floor(st.mines.bet * minesG.multiplier(st.mines.mines, k))) : 'Открой клетку';
    go.disabled = st.busy || !k;
    if (k) go.classList.add('cash');
  } else if (st.game === 'crash' && cr.running) {
    go.classList.add('cash'); go.disabled = false;
  } else go.textContent = GO[st.game] || 'Играть';
}
$('#go').addEventListener('click', async () => {
  if (st.busy) return;
  st.busy = true; refreshGo();
  try {
    if (st.game === 'dice') await playDice();
    else if (st.game === 'coinflip') await playCoin();
    else if (st.game === 'mines') await playMines();
    else if (st.game === 'crash') await playCrash();
    else if (st.game === 'plinko') await playPlinko();
    else if (st.game === 'limbo') await playLimbo();
    else if (st.game === 'wheel') await playWheel();
  } catch (err) { toast(err.message); }
  st.busy = false; refreshGo();
});
$('.bet .row').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const cur = betUnits();
  if (b.dataset.k === 'half') setBet(Math.floor(cur / 2));
  if (b.dataset.k === 'dbl') setBet(Math.min(cur * 2, Math.max(st.balance, st.config.minBet)));
  if (b.dataset.k === 'max') setBet(Math.max(st.balance, st.config.minBet));
});
$('#bet').addEventListener('input', refreshCalc);
function refreshCalc() { refreshDice(); refreshCoin(); refreshLimbo(); }

function finish(r) {
  setBalance(r.balance);
  haptic(r.round.payout > 0 ? 'success' : 'error');
  afterRound();
}
async function afterRound() {
  await loadHistory();
  api('/me').then((me) => { st.me = me; setSeed(me.seed); }).catch(() => {});
}
async function loadHistory() {
  const { rounds } = await api('/history?limit=40');
  st.rounds = rounds;
  renderHist(); renderRecent();
}
function roundLabel(r) {
  const x = r.result || {};
  if (r.game === 'dice') return x.roll.toFixed(2);
  if (r.game === 'coinflip') return x.outcome === 'heads' ? 'Орёл' : 'Решка';
  if (r.game === 'crash') return (x.win ? x.cashedAt : x.crash).toFixed(2) + '×';
  if (r.game === 'limbo') return x.result.toFixed(2) + '×';
  if (r.game === 'mines') return r.payout > 0 ? mult(r.multiplier) : '✕';
  return mult(x.multiplier);
}
function renderHist() {
  const list = st.rounds.filter((r) => r.game === st.game).slice(0, 12);
  $('#hist').innerHTML = list.map((r) => `<span class="${r.payout > 0 ? 'w' : ''}">${roundLabel(r)}</span>`).join('');
}
function renderRecent() {
  const list = st.rounds.slice(0, 8);
  $('#recent').innerHTML = list.length ? list.map((r) => {
    const g = gameOf(r.game); const d = r.payout - r.bet;
    return `<div class="row-i"><div class="dot art-${r.game}">${g.short}</div><div class="tx"><b>${g.name} · ${roundLabel(r)}</b><small>ставка ${fmt(r.bet)} · ${new Date(r.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small></div><div class="amt ${d >= 0 ? 'w' : 'l'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</div></div>`;
  }).join('') : '<div class="empty">Пока пусто — сыграй первый раунд</div>';
}
function spin(el, final, render, ms = 500) {
  const t0 = Date.now();
  el.classList.remove('w', 'l');
  if (document.hidden) { render(final); return Promise.resolve(); }
  return new Promise((resolve) => {
    const id = setInterval(() => {
      if (Date.now() - t0 >= ms) { clearInterval(id); render(final); resolve(); return; }
      render(null);
    }, 45);
  });
}

/* ---------- dice ---------- */
function refreshDice() {
  const t = Number($('#d-target').value);
  $('#d-tval').textContent = t;
  $('#d-target').style.setProperty('--pct', t + '%');
  $('#d-mult').textContent = mult(diceG.multiplier(t));
  $('#d-chance').textContent = t + ' %';
  $('#d-pay').textContent = fmt(Math.floor(betUnits() * diceG.multiplier(t)));
}
$('#d-target').addEventListener('input', refreshDice);
async function playDice() {
  const r = await api('/dice', { bet: $('#bet').value, target: $('#d-target').value });
  const big = $('#d-big');
  await spin(big, r.round.result, (res) => {
    if (!res) { big.textContent = (Math.random() * 100).toFixed(2); return; }
    big.textContent = res.roll.toFixed(2); big.classList.add(res.win ? 'w' : 'l');
  });
  finish(r);
}

/* ---------- coinflip ---------- */
function refreshCoin() { $('#c-pay').textContent = fmt(Math.floor(betUnits() * 1.98)); }
$('.sides').addEventListener('click', (e) => {
  const b = e.target.closest('.side'); if (!b) return;
  st.side = b.dataset.side;
  $$('.side').forEach((x) => x.classList.toggle('on', x === b));
});
async function playCoin() {
  const r = await api('/coinflip', { bet: $('#bet').value, side: st.side });
  const big = $('#c-big');
  await spin(big, r.round.result, (res) => {
    if (!res) { big.textContent = Math.random() < 0.5 ? 'Орёл' : 'Решка'; return; }
    big.textContent = res.outcome === 'heads' ? 'Орёл' : 'Решка'; big.classList.add(res.win ? 'w' : 'l');
  });
  finish(r);
}

/* ---------- mines ---------- */
const grid = $('#m-grid');
for (let i = 0; i < 25; i += 1) { const b = document.createElement('button'); b.type = 'button'; b.dataset.cell = i; b.disabled = true; grid.appendChild(b); }
function renderMines() {
  const r = st.mines;
  const m = r ? r.mines : Number($('#m-mines').value);
  const k = r ? r.revealed.length : 0;
  $('#m-mult').textContent = mult(minesG.multiplier(m, k));
  $('#m-next').textContent = mult(minesG.multiplier(m, k + 1));
  $('#m-mines').disabled = !!r;
  grid.classList.toggle('live', !!r);
  for (const b of grid.children) {
    const c = Number(b.dataset.cell);
    const open = r && r.revealed.includes(c);
    b.className = open ? 'open' : ''; b.textContent = open ? '✓' : ''; b.disabled = !r || open;
  }
  refreshGo();
}
function showMinesResult(round) {
  const { mineCells, revealed, win } = round.result;
  grid.classList.remove('live');
  for (const b of grid.children) {
    const c = Number(b.dataset.cell); b.disabled = true;
    if (mineCells.includes(c)) { b.className = revealed.includes(c) ? 'boom' : 'mine'; b.textContent = '✕'; }
    else if (revealed.includes(c)) { b.className = 'open'; b.textContent = '✓'; }
  }
  haptic(win ? 'success' : 'error');
  toast(win ? 'Забрано ' + fmt(round.payout) + ' USDT' : 'Мина. Ставка сгорела');
}
$('#m-mines').addEventListener('change', renderMines);
grid.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled || !st.mines || st.busy) return;
  st.busy = true; refreshGo();
  try {
    const r = await api('/mines/reveal', { cell: Number(b.dataset.cell) });
    setBalance(r.balance);
    if (r.round.status === 'settled') { st.mines = null; showMinesResult(r.round); await afterRound(); setTimeout(renderMines, 1600); }
    else { st.mines = r.round; renderMines(); }
  } catch (err) { toast(err.message); }
  st.busy = false; refreshGo();
});
async function playMines() {
  if (st.mines) {
    const r = await api('/mines/cashout', {});
    st.mines = null; setBalance(r.balance); showMinesResult(r.round); await afterRound(); setTimeout(renderMines, 1600);
    return;
  }
  const r = await api('/mines/start', { bet: $('#bet').value, mines: Number($('#m-mines').value) });
  st.mines = r.round; setBalance(r.balance); renderMines();
}

/* ---------- crash ---------- */
const cr = { running: false, t0: 0, raf: 0, poll: 0 };
function crashDraw(t, m) {
  const T = Math.max(8, t + 1); const M = Math.max(2, m + 0.4); const N = 40;
  let d = '';
  for (let i = 0; i <= N; i += 1) {
    const ti = (t * i) / N; const mi = Math.exp(GROWTH * ti);
    d += (i ? ' L' : 'M') + ((ti / T) * 300).toFixed(1) + ' ' + (160 - ((mi - 1) / (M - 1)) * 140).toFixed(1);
  }
  $('#cr-path').setAttribute('d', d);
  $('#cr-fill').setAttribute('d', d + ' L' + ((t / T) * 300).toFixed(1) + ' 160 L0 160 Z');
}
function crashTick() {
  if (!cr.running) return;
  const t = (performance.now() - cr.t0) / 1000;
  const m = Math.floor(Math.exp(GROWTH * t) * 100 + 1e-9) / 100;
  $('#cr-big').textContent = m.toFixed(2) + '×';
  crashDraw(t, m);
  $('#go').textContent = 'Забрать ' + fmt(Math.floor(st.crashBet * m));
  cr.raf = requestAnimationFrame(crashTick);
}
async function crashPoll() {
  if (!cr.running) return;
  try {
    const r = await api('/crash/state');
    if (r.running) cr.t0 = performance.now() - r.round.elapsed;
    else if (r.round) crashEnd(r);
    else crashStop();
  } catch (e) { /* сеть моргнула — следующий опрос */ }
  if (cr.running) cr.poll = setTimeout(crashPoll, 450);
}
function crashStop() { cr.running = false; cancelAnimationFrame(cr.raf); clearTimeout(cr.poll); refreshGo(); }
function crashEnd(r) {
  crashStop();
  const res = r.round.result; const area = $('.crash-area');
  if (res.win) {
    area.classList.add('won');
    $('#cr-big').textContent = res.cashedAt.toFixed(2) + '×';
    $('#cr-status').textContent = 'Забрано на ' + res.cashedAt.toFixed(2) + '×, краш был на ' + res.crash.toFixed(2) + '×';
    $('#cr-pay').textContent = fmt(r.round.payout);
  } else {
    area.classList.add('bust');
    $('#cr-big').textContent = res.crash.toFixed(2) + '×';
    $('#cr-status').textContent = 'Краш на ' + res.crash.toFixed(2) + '×';
    $('#cr-pay').textContent = '0.00';
    crashDraw(Math.log(res.crash) / GROWTH, res.crash);
  }
  $('#cr-last').textContent = res.crash.toFixed(2) + '×';
  setBalance(r.balance); haptic(res.win ? 'success' : 'error'); afterRound();
}
function crashStart(round) {
  cr.running = true; st.crashBet = round.bet; cr.t0 = performance.now() - (round.elapsed || 0);
  $('.crash-area').classList.remove('bust', 'won');
  $('#cr-status').textContent = round.auto ? 'Автовывод на ' + round.auto.toFixed(2) + '×' : 'Забери до краша';
  $('#cr-pay').textContent = '—';
  crashTick(); crashPoll(); refreshGo();
}
async function playCrash() {
  if (cr.running) { const r = await api('/crash/cashout', {}); if (!r.running) crashEnd(r); return; }
  const r = await api('/crash/start', { bet: $('#bet').value, auto: $('#cr-auto').value || null });
  setBalance(r.balance); crashStart(r.round);
}

/* ---------- plinko ---------- */
const pl = { N: 12, risk: 'low', s: 0 };
function drawBoard() {
  pl.N = Number($('#pl-rows').value);
  const s = 300 / (pl.N + 2); pl.s = s;
  let h = '';
  for (let r = 0; r < pl.N; r += 1) {
    const y = 18 + (r * 200) / (pl.N - 1); const n = r + 3;
    for (let i = 0; i < n; i += 1) h += `<circle cx="${(150 + (i - (n - 1) / 2) * s).toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * 0.16).toFixed(1)}"/>`;
  }
  $('#pl-svg').innerHTML = h;
  $('#pl-buckets').innerHTML = plinkoG.TABLES[pl.N][pl.risk].map((m, i) => `<span data-i="${i}"${m >= 2 ? ' data-v="hot"' : ''}>${m}×</span>`).join('');
}
$('#pl-rows').addEventListener('change', drawBoard);
$('#pl-risk').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  pl.risk = b.dataset.risk; $$('#pl-risk button').forEach((x) => x.classList.toggle('on', x === b)); drawBoard();
});
async function playPlinko() {
  const r = await api('/plinko', { bet: $('#bet').value, rows: pl.N, risk: pl.risk });
  const { path, bucket } = r.round.result;
  const ball = $('#pl-ball'); const s = pl.s;
  $$('#pl-buckets span').forEach((x) => x.classList.remove('hi'));
  ball.hidden = false; ball.style.transition = 'none'; ball.style.left = '50%'; ball.style.top = '3%';
  await sleep(30); ball.style.transition = '';
  let rights = 0;
  for (let i = 0; i < path.length; i += 1) {
    rights += path[i];
    const y = 18 + (i * 200) / (pl.N - 1) + 6;
    ball.style.left = ((150 + (rights - (i + 1) / 2) * s) / 3) + '%';
    ball.style.top = (y / 2.4) + '%';
    await sleep(95);
  }
  ball.style.left = ((150 + (bucket - pl.N / 2) * s) / 3) + '%'; ball.style.top = '96%';
  await sleep(160);
  $$('#pl-buckets span')[bucket].classList.add('hi');
  toast((r.round.payout > 0 ? 'Выигрыш ' : 'Выпало ') + mult(r.round.result.multiplier) + ' → ' + fmt(r.round.payout) + ' USDT');
  finish(r);
}

/* ---------- limbo ---------- */
function refreshLimbo() {
  const t = Math.max(1.01, Number($('#lb-target').value) || 1.01);
  $('#lb-big').textContent = t.toFixed(2) + '×';
  $('#lb-chance').textContent = (limboG.winChance(t) * 100).toFixed(2) + ' %';
  $('#lb-pay').textContent = fmt(Math.floor(betUnits() * t));
}
$('#lb-target').addEventListener('input', refreshLimbo);
async function playLimbo() {
  const r = await api('/limbo', { bet: $('#bet').value, target: $('#lb-target').value });
  const big = $('#lb-big');
  await spin(big, r.round.result, (res) => {
    if (!res) { big.textContent = (1 + Math.random() * 4).toFixed(2) + '×'; return; }
    big.textContent = res.result.toFixed(2) + '×'; big.classList.add(res.win ? 'w' : 'l');
  }, 650);
  $('#lb-last').textContent = r.round.result.result.toFixed(2) + '×';
  finish(r);
  setTimeout(refreshLimbo, 1800);
}

/* ---------- wheel ---------- */
const wh = { rot: 0 };
function drawWheel() {
  const seg = wheelG.SEGMENTS; const n = seg.length;
  $('#wh-wheel').style.background = `conic-gradient(${seg.map((m, i) => `${segColor(m)} ${(i * 360) / n}deg ${((i + 1) * 360) / n}deg`).join(',')})`;
  $('#wh-legend').innerHTML = [...new Set(seg)].sort((a, b) => a - b).map((m) => `<span style="background:${segColor(m)}">${m}×</span>`).join('');
}
async function playWheel() {
  const r = await api('/wheel', { bet: $('#bet').value });
  const { index, multiplier } = r.round.result; const n = wheelG.SEGMENTS.length;
  const target = 360 - ((index + 0.5) * 360) / n;
  wh.rot += 360 * 4 + ((target - (wh.rot % 360)) + 360) % 360;
  const w = $('#wh-wheel'); w.style.transform = `rotate(${wh.rot}deg)`;
  $('#wh-res').textContent = '…'; $('#wh-res').classList.remove('w');
  await sleep(2450);
  $('#wh-res').textContent = multiplier + '×'; $('#wh-res').classList.toggle('w', multiplier > 0);
  finish(r);
}

/* ---------- кошелёк ---------- */
const KIND = { bet: 'Ставка', win: 'Выигрыш', bonus: 'Бонус', deposit: 'Депозит', withdraw: 'Вывод' };
async function loadLedger() {
  try {
    const { entries } = await api('/ledger?limit=40');
    $('#ledger').innerHTML = entries.length ? entries.map((e) => `<div class="row-i"><div class="dot" style="background:var(--pan);color:var(--mut)">${e.delta > 0 ? '+' : '−'}</div><div class="tx"><b>${KIND[e.kind] || e.kind}${e.kind === 'bet' ? ' · ' + (gameOf(e.ref) ? gameOf(e.ref).name : e.ref) : ''}</b><small>${new Date(e.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · остаток ${fmt(e.balanceAfter)}</small></div><div class="amt ${e.delta > 0 ? 'w' : 'l'}">${e.delta > 0 ? '+' : '−'}${fmt(Math.abs(e.delta))}</div></div>`).join('') : '<div class="empty">Операций пока нет</div>';
  } catch (err) { toast(err.message); }
}
$('#assets').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) $$('#assets button').forEach((x) => x.classList.toggle('on', x === b)); });
const sheet = $('#sheet');
let sheetMode = 'dep';
function openSheet(mode) {
  sheetMode = mode;
  const demo = st.config.devMode;
  $('#sh-title').textContent = mode === 'dep' ? 'Пополнить' : 'Вывести';
  $('#sh-text').textContent = mode === 'dep'
    ? (demo ? 'В демо платежи не подключены: начислим 1000 USDT виртуального баланса.' : 'Откроем счёт на оплату в Crypto Pay. Баланс обновится после подтверждения оплаты.')
    : (demo ? 'В демо деньги виртуальные, вывод не выполняется. В продукте — перевод на твой кошелёк.' : 'Переведём на твой кошелёк через Crypto Pay. Суммы выше лимита проверяет оператор — это занимает время.');
  $('#sh-amount-l').hidden = mode === 'dep' && demo;
  $('#sh-addr-l').hidden = mode !== 'wd';
  $('#sh-ok').textContent = mode === 'dep' ? (demo ? 'Начислить демо' : 'Перейти к оплате') : 'Вывести';
  sheet.showModal();
}
$('#sh-ok').addEventListener('click', async () => {
  try {
    if (sheetMode === 'dep' && st.config.devMode) { const r = await api('/dev/topup', {}); setBalance(r.balance); haptic('success'); toast('Демо-баланс пополнен'); loadLedger(); }
    else toast(sheetMode === 'dep' ? 'В демо пополнение не подключено' : 'В демо вывод не подключен');
  } catch (err) { toast(err.message); }
  sheet.close();
});
$('#dep').addEventListener('click', () => openSheet('dep'));
$('#w-dep').addEventListener('click', () => openSheet('dep'));
$('#w-wd').addEventListener('click', () => openSheet('wd'));

/* ---------- профиль и честность ---------- */
function renderProfile() {
  const me = st.me; if (!me) return;
  $('#p-name').textContent = me.user.name; $('#p-ava').textContent = (me.user.name || 'И')[0].toUpperCase();
  $('#p-id').textContent = 'id ' + (me.user.tgId || me.user.id);
  $('#p-rounds').textContent = me.stats.rounds; $('#p-wagered').textContent = fmt0(me.stats.wagered); $('#p-won').textContent = fmt0(me.stats.won);
}
$$('.menu [data-stub]').forEach((b) => b.addEventListener('click', () => toast(b.dataset.stub)));
const fair = $('#fair');
function openFair() {
  if (!st.seed) return;
  $('#f-hash').value = st.seed.serverHash; $('#f-client').value = st.seed.clientSeed; $('#f-nonce').value = st.seed.nonce;
  fair.showModal();
}
$('#pf-open').addEventListener('click', openFair);
$('#pf-line').addEventListener('click', openFair);
$('#m-fair').addEventListener('click', openFair);
$('#f-rotate').addEventListener('click', async () => {
  try {
    const r = await api('/fair/rotate', { clientSeed: $('#f-client').value });
    const old = r.revealed;
    $('#f-old-seed').value = old.serverSeed; $('#f-old-hash').textContent = old.serverHash; $('#f-old-client').textContent = old.clientSeed; $('#f-old-nonce').textContent = old.nonce;
    $('#f-revealed').hidden = false;
    setSeed(r.current);
    $('#f-hash').value = r.current.serverHash; $('#f-client').value = r.current.clientSeed; $('#f-nonce').value = 0;
    toast('Сид сменён, старый раскрыт');
  } catch (err) { toast(err.message); }
});

/* ---------- старт ---------- */
renderTiles();
(async () => {
  try {
    const me = await api('/me');
    st.me = me; st.config = me.config; setBalance(me.balance); setSeed(me.seed);
    $('#bet').min = me.config.minBet / UNIT; $('#bet').max = me.config.maxBet / UNIT;
    refreshCalc();
    await loadHistory();
    const open = await api('/open');
    if (open.round && open.round.game === 'mines') { openGame('mines'); st.mines = open.round; renderMines(); }
    else if (open.round && open.round.game === 'crash') { openGame('crash'); crashStart(open.round); }
  } catch (err) { toast(err.message); }
})();
