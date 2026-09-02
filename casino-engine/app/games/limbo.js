// Limbo: игрок называет целевой множитель; раунд выпадает случайным множителем, выигрыш — если выпало не меньше цели.
// Шанс = (1 − edge) / target, выплата = ставка × target.
import { HOUSE_EDGE } from './dice.js';

export const TARGET_MIN = 1.01;
export const TARGET_MAX = 1000;

export function validateTarget(target) {
  const t = Math.round(Number(target) * 100) / 100;
  if (!Number.isFinite(t) || t < TARGET_MIN || t > TARGET_MAX) throw new Error(`цель от ${TARGET_MIN} до ${TARGET_MAX}`);
  return t;
}

export const resultMultiplier = (f) => Math.min(TARGET_MAX, Math.max(1, Math.floor(((1 - HOUSE_EDGE) / (1 - f)) * 100 + 1e-9) / 100));
export const winChance = (target) => (1 - HOUSE_EDGE) / target;

export function play({ target, betUnits, float }) {
  const t = validateTarget(target);
  const result = resultMultiplier(float);
  const win = result >= t;
  return { target: t, result, win, multiplier: t, payoutUnits: win ? Math.floor(betUnits * t) : 0 };
}
