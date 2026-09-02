// Dice: игрок выбирает порог target (2.00–98.00). Бросок 0.00–99.99. Выигрыш, если бросок меньше порога.
// Шанс = target %, множитель = (100 − edge) / target. При edge 1 % и target 50 → ×1.98.
export const HOUSE_EDGE = 0.01;
export const TARGET_MIN = 2;
export const TARGET_MAX = 98;

export function validateTarget(target) {
  const t = Math.round(Number(target) * 100) / 100;
  if (!Number.isFinite(t) || t < TARGET_MIN || t > TARGET_MAX) {
    throw new Error(`target должен быть от ${TARGET_MIN} до ${TARGET_MAX}`);
  }
  return t;
}

export const multiplier = (target) => Math.floor(((100 * (1 - HOUSE_EDGE)) / target) * 10000) / 10000;
export const winChance = (target) => target / 100;

// float ∈ [0,1) → бросок 0.00…99.99
export const rollFromFloat = (f) => Math.floor(f * 10000) / 100;

export function play({ target, betUnits, float }) {
  const t = validateTarget(target);
  const roll = rollFromFloat(float);
  const win = roll < t;
  const mult = multiplier(t);
  const payoutUnits = win ? Math.floor(betUnits * mult) : 0;
  return { target: t, roll, win, multiplier: mult, payoutUnits };
}
