// Crash: множитель растёт со временем, игрок должен забрать до «краша».
// Точка краша = (1 − edge) / (1 − f): шанс дожить до m равен (1 − edge) / m. В 1 % раундов краш на 1.00 сразу.
// Рост: m(t) = e^(GROWTH·t), ×2 примерно через 5,8 с. Все времена — по часам сервера.
import { HOUSE_EDGE } from './dice.js';

export const GROWTH = 0.12; // в секунду
export const MAX_MULTIPLIER = 1000;

export function crashPoint(f) {
  const m = (1 - HOUSE_EDGE) / (1 - f);
  return Math.min(MAX_MULTIPLIER, Math.max(1, Math.floor(m * 100 + 1e-9) / 100));
}

export const multiplierAt = (ms) => Math.floor(Math.exp((GROWTH * ms) / 1000) * 100 + 1e-9) / 100;
export const timeToReach = (m) => (Math.log(m) / GROWTH) * 1000;

export function validateAuto(auto) {
  if (auto === null || auto === undefined || auto === '') return null;
  const x = Math.round(Number(auto) * 100) / 100;
  if (!Number.isFinite(x) || x < 1.01 || x > MAX_MULTIPLIER) throw new Error('автовывод от 1.01 до 1000');
  return x;
}

// Что происходит с открытым раундом к моменту elapsedMs: продолжается, краш или сработал автовывод.
export function resolve(state, elapsedMs) {
  const now = multiplierAt(elapsedMs);
  if (state.auto && state.auto < state.crash && now >= state.auto) return { status: 'auto', multiplier: state.auto };
  if (now >= state.crash) return { status: 'crashed', multiplier: 0 };
  return { status: 'running', multiplier: now };
}
