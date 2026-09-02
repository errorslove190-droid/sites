// Игры прямо в чате на родных анимациях Telegram: 🎲 кубик (1–6) и 🎰 слот (1–64).
// Значение генерирует Telegram и присылает боту вместе с сообщением — бот подменить его не может.
// Это не provably fair, но честность «от Telegram» понятна игроку; для Mini App остаётся HMAC.
import { HOUSE_EDGE } from './dice.js';

const m = (p) => Math.floor(((1 - HOUSE_EDGE) / p) * 100) / 100;

// Ставки на кубик: ключ → проверка и вероятность.
export const DICE_BETS = {
  high: { label: '4–6', test: (v) => v >= 4, p: 1 / 2 },
  low: { label: '1–3', test: (v) => v <= 3, p: 1 / 2 },
  even: { label: 'чёт', test: (v) => v % 2 === 0, p: 1 / 2 },
  odd: { label: 'нечет', test: (v) => v % 2 === 1, p: 1 / 2 },
  n1: { label: '1', test: (v) => v === 1, p: 1 / 6 },
  n2: { label: '2', test: (v) => v === 2, p: 1 / 6 },
  n3: { label: '3', test: (v) => v === 3, p: 1 / 6 },
  n4: { label: '4', test: (v) => v === 4, p: 1 / 6 },
  n5: { label: '5', test: (v) => v === 5, p: 1 / 6 },
  n6: { label: '6', test: (v) => v === 6, p: 1 / 6 },
};
export const diceMultiplier = (key) => m(DICE_BETS[key].p);

export function settleDice(key, value, betUnits) {
  const bet = DICE_BETS[key];
  if (!bet) throw new Error('нет такой ставки');
  const win = bet.test(value);
  const multiplier = diceMultiplier(key);
  return { win, multiplier: win ? multiplier : 0, payoutUnits: win ? Math.floor(betUnits * multiplier) : 0 };
}

// Слот Telegram: значение 1–64, три барабана по 4 символа (bar, виноград, лимон, семёрка).
// 64 — три семёрки; 1, 22, 43 — остальные тройки. Выплаты: 777 ×30, другая тройка ×11 → отдача ≈ 98,4 %.
export const SLOT_777 = 64;
export const SLOT_TRIPLES = new Set([1, 22, 43]);
export const SLOT_PAYOUTS = { jackpot: 30, triple: 11 };

export function settleSlot(value, betUnits) {
  if (value === SLOT_777) return { kind: 'jackpot', win: true, multiplier: SLOT_PAYOUTS.jackpot, payoutUnits: betUnits * SLOT_PAYOUTS.jackpot };
  if (SLOT_TRIPLES.has(value)) return { kind: 'triple', win: true, multiplier: SLOT_PAYOUTS.triple, payoutUnits: betUnits * SLOT_PAYOUTS.triple };
  return { kind: 'none', win: false, multiplier: 0, payoutUnits: 0 };
}

export const slotRtp = () => (SLOT_PAYOUTS.jackpot + 3 * SLOT_PAYOUTS.triple) / 64;
export const diceRtp = (key) => DICE_BETS[key].p * diceMultiplier(key);
