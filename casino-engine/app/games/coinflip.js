// Coinflip: орёл или решка, шанс 50 %, множитель (1 − edge) / 0.5 = ×1.98.
import { HOUSE_EDGE } from './dice.js';

export const SIDES = ['heads', 'tails'];
export const multiplier = () => Math.floor(((1 - HOUSE_EDGE) / 0.5) * 10000) / 10000;

export function play({ side, betUnits, float }) {
  if (!SIDES.includes(side)) throw new Error('side должен быть heads или tails');
  const outcome = float < 0.5 ? 'heads' : 'tails';
  const win = outcome === side;
  const mult = multiplier();
  return { side, outcome, win, multiplier: mult, payoutUnits: win ? Math.floor(betUnits * mult) : 0 };
}
