// Демо без сервера: те же ответы, что у API, но состояние живёт в localStorage браузера,
// а раунды считаются теми же модулями игр и тем же HMAC. Деньги виртуальные.
import * as dice from '../games/dice.js';
import * as coin from '../games/coinflip.js';
import * as mines from '../games/mines.js';
import * as crash from '../games/crash.js';
import * as plinko from '../games/plinko.js';
import * as limbo from '../games/limbo.js';
import * as wheel from '../games/wheel.js';
import { hashSeed, newClientSeed, newServerSeed, rollFloats } from './fair-web.js';

const KEY = 'casino-demo-v1';
const UNIT = 1e6;
const DEMO = 1000 * UNIT;
const cfg = { minBet: 0.1 * UNIT, maxBet: 1000 * UNIT, houseEdge: dice.HOUSE_EDGE, unit: UNIT, devMode: true, demo: true };

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* приватный режим */ } };
const iso = () => new Date().toISOString();

async function makeSeed(clientSeed) {
  const serverSeed = newServerSeed();
  return { id: Date.now(), serverSeed, serverHash: await hashSeed(serverSeed), clientSeed: clientSeed || newClientSeed(), nonce: 0 };
}
const publicSeed = (seed, revealed = false) => ({ id: seed.id, serverHash: seed.serverHash, serverSeed: revealed ? seed.serverSeed : undefined, clientSeed: seed.clientSeed, nonce: seed.nonce });

function move(s, delta, kind, ref) {
  if (s.balance + delta < 0) throw new Error('недостаточно средств');
  s.balance += delta;
  s.ledger.unshift({ id: s.nextLedger++, delta, kind, ref: ref == null ? null : String(ref), balanceAfter: s.balance, createdAt: iso() });
  if (s.ledger.length > 200) s.ledger.length = 200;
}
function parseBet(bet) {
  const units = Math.round(Number(bet) * UNIT);
  if (!Number.isFinite(units) || units < cfg.minBet) throw new Error(`минимальная ставка ${cfg.minBet / UNIT}`);
  if (units > cfg.maxBet) throw new Error(`максимальная ставка ${cfg.maxBet / UNIT}`);
  return units;
}
async function draw(s, count) {
  s.seed.nonce += 1;
  return { seed: s.seed, floats: await rollFloats(s.seed.serverSeed, s.seed.clientSeed, s.seed.nonce, count) };
}
const newRound = (s, game, bet, seed, input) => ({ id: s.nextRound++, game, bet, payout: 0, multiplier: 0, nonce: seed.nonce, seedId: seed.id, input, result: null, status: 'open', createdAt: iso() });
function settle(s, r, payout, multiplier, result) {
  Object.assign(r, { status: 'settled', payout, multiplier, result, state: undefined });
  s.rounds.unshift(r);
  if (s.rounds.length > 100) s.rounds.length = 100;
  if (payout > 0) move(s, payout, 'win', r.id);
  s.open = null;
  return { round: r, balance: s.balance };
}
async function instant(s, body, game, count, prepare) {
  const bet = parseBet(body.bet);
  const { input, play } = prepare(body);
  move(s, -bet, 'bet', game);
  const { seed, floats } = await draw(s, count);
  const res = play(floats, bet);
  const r = newRound(s, game, bet, seed, input);
  return settle(s, r, res.payoutUnits, res.payoutUnits > 0 ? res.multiplier : 0, res.result);
}

const minesView = (r) => ({ game: 'mines', id: r.id, bet: r.bet, mines: r.state.mines, revealed: r.state.revealed, multiplier: mines.multiplier(r.state.mines, r.state.revealed.length), nextMultiplier: mines.multiplier(r.state.mines, r.state.revealed.length + 1), nonce: r.nonce });
const crashView = (r) => ({ game: 'crash', id: r.id, bet: r.bet, auto: r.state.auto, startedAt: r.state.startedAt, elapsed: Date.now() - r.state.startedAt, growth: crash.GROWTH, nonce: r.nonce });
const crashResult = (st, cashedAt) => ({ crash: st.crash, cashedAt, auto: st.auto, win: cashedAt > 0 });
function crashStep(s, r) {
  const res = crash.resolve(r.state, Date.now() - r.state.startedAt);
  if (res.status === 'running') return { running: true, round: { ...crashView(r), multiplier: res.multiplier }, balance: s.balance };
  if (res.status === 'auto') return { running: false, ...settle(s, r, Math.floor(r.bet * res.multiplier), res.multiplier, crashResult(r.state, res.multiplier)) };
  return { running: false, ...settle(s, r, 0, 0, crashResult(r.state, 0)) };
}

const H = {
  'GET /me': (s) => ({
    user: { id: 1, name: 'Демо', tgId: 1 },
    balance: s.balance,
    seed: publicSeed(s.seed),
    stats: { rounds: s.stats.rounds, wagered: s.stats.wagered, won: s.stats.won },
    config: cfg,
  }),
  'GET /history': (s, b, q) => ({ rounds: s.rounds.slice(0, Math.min(Number(q.limit) || 20, 100)) }),
  'GET /ledger': (s, b, q) => ({ entries: s.ledger.slice(0, Math.min(Number(q.limit) || 30, 200)) }),
  'GET /open': (s) => ({ round: s.open ? (s.open.game === 'mines' ? minesView(s.open) : crashView(s.open)) : null }),
  'POST /fair/rotate': async (s, b) => {
    if (s.open) throw new Error('сначала завершите текущий раунд');
    const old = s.seed;
    s.seed = await makeSeed(String(b.clientSeed || '').trim().slice(0, 64) || undefined);
    return { revealed: publicSeed(old, true), current: publicSeed(s.seed) };
  },
  'POST /dev/topup': (s) => { move(s, DEMO, 'bonus', 'demo-topup'); return { balance: s.balance }; },
  'POST /dice': (s, b) => instant(s, b, 'dice', 1, () => { const target = dice.validateTarget(b.target); return { input: { target }, play: (f, bet) => { const r = dice.play({ target, betUnits: bet, float: f[0] }); return { ...r, result: { roll: r.roll, win: r.win } }; } }; }),
  'POST /coinflip': (s, b) => instant(s, b, 'coinflip', 1, () => { if (!coin.SIDES.includes(b.side)) throw new Error('side должен быть heads или tails'); return { input: { side: b.side }, play: (f, bet) => { const r = coin.play({ side: b.side, betUnits: bet, float: f[0] }); return { ...r, result: { outcome: r.outcome, win: r.win } }; } }; }),
  'POST /limbo': (s, b) => instant(s, b, 'limbo', 1, () => { const target = limbo.validateTarget(b.target); return { input: { target }, play: (f, bet) => { const r = limbo.play({ target, betUnits: bet, float: f[0] }); return { ...r, result: { result: r.result, win: r.win } }; } }; }),
  'POST /wheel': (s, b) => instant(s, b, 'wheel', 1, () => ({ input: {}, play: (f, bet) => { const r = wheel.play({ betUnits: bet, float: f[0] }); return { ...r, result: { index: r.index, multiplier: r.multiplier, win: r.win } }; } })),
  'POST /plinko': (s, b) => instant(s, b, 'plinko', 16, () => { const v = plinko.validate(b.rows, b.risk); return { input: v, play: (f, bet) => { const r = plinko.play({ ...v, betUnits: bet, floats: f }); return { ...r, result: { path: r.path, bucket: r.bucket, multiplier: r.multiplier, win: r.win } }; } }; }),

  'GET /mines/current': (s) => ({ round: s.open && s.open.game === 'mines' ? minesView(s.open) : null }),
  'POST /mines/start': async (s, b) => {
    if (s.open) throw new Error('сначала завершите текущий раунд');
    const bet = parseBet(b.bet);
    const m = mines.validateMines(b.mines);
    move(s, -bet, 'bet', 'mines');
    const { seed, floats } = await draw(s, 24);
    const r = newRound(s, 'mines', bet, seed, { mines: m });
    r.state = { mines: m, mineCells: mines.layout(floats, m), revealed: [] };
    s.open = r;
    return { round: minesView(r), balance: s.balance };
  },
  'POST /mines/reveal': (s, b) => {
    const r = s.open;
    if (!r || r.game !== 'mines') throw new Error('нет открытого раунда');
    const next = mines.reveal(r.state, b.cell);
    const result = (win) => ({ mineCells: next.mineCells, revealed: next.revealed, win });
    if (next.busted) return settle(s, r, 0, 0, result(false));
    if (next.revealed.length >= mines.maxReveals(r.state.mines)) return settle(s, r, Math.floor(r.bet * next.multiplier), next.multiplier, result(true));
    r.state = next;
    return { round: minesView(r), balance: s.balance };
  },
  'POST /mines/cashout': (s) => {
    const r = s.open;
    if (!r || r.game !== 'mines') throw new Error('нет открытого раунда');
    if (!r.state.revealed.length) throw new Error('откройте хотя бы одну клетку');
    const mult = mines.multiplier(r.state.mines, r.state.revealed.length);
    return settle(s, r, Math.floor(r.bet * mult), mult, { mineCells: r.state.mineCells, revealed: r.state.revealed, win: true });
  },

  'POST /crash/start': async (s, b) => {
    if (s.open) throw new Error('сначала завершите текущий раунд');
    const bet = parseBet(b.bet);
    const auto = crash.validateAuto(b.auto);
    move(s, -bet, 'bet', 'crash');
    const { seed, floats } = await draw(s, 1);
    const r = newRound(s, 'crash', bet, seed, { auto });
    r.state = { crash: crash.crashPoint(floats[0]), startedAt: Date.now(), auto };
    s.open = r;
    return { round: { ...crashView(r), multiplier: 1 }, balance: s.balance };
  },
  'GET /crash/state': (s) => (s.open && s.open.game === 'crash' ? crashStep(s, s.open) : { running: false, round: null }),
  'POST /crash/cashout': (s) => {
    const r = s.open;
    if (!r || r.game !== 'crash') throw new Error('нет открытого раунда');
    const step = crashStep(s, r);
    if (!step.running) return step;
    const m = step.round.multiplier;
    return { running: false, ...settle(s, r, Math.floor(r.bet * m), m, crashResult(r.state, m)) };
  },
};

export function createMock() {
  let ready = null;
  async function state() {
    let s = load();
    if (!s || !s.seed) {
      s = { balance: 0, nextRound: 1, nextLedger: 1, seed: await makeSeed(), rounds: [], ledger: [], open: null, stats: { rounds: 0, wagered: 0, won: 0 } };
      move(s, DEMO, 'bonus', 'demo');
    }
    return s;
  }
  return async function api(path, body) {
    const [p, qs] = path.split('?');
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    const key = `${body ? 'POST' : 'GET'} ${p}`;
    const h = H[key];
    if (!h) throw new Error('нет такого запроса: ' + key);
    ready = (ready || Promise.resolve()).then(async () => {
      const s = await state();
      const before = s.rounds.length;
      const out = await h(s, body || {}, q);
      // статистика считается по завершённым раундам
      for (const r of s.rounds.slice(0, s.rounds.length - before)) { s.stats.rounds += 1; s.stats.wagered += r.bet; s.stats.won += r.payout; }
      save(s);
      return JSON.parse(JSON.stringify(out));
    });
    return ready;
  };
}
