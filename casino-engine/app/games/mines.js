// Mines: поле 5×5, N мин. Игрок открывает клетки по одной; каждая безопасная клетка растит множитель.
// Забрать выигрыш можно после первой открытой клетки. Мина — проигрыш всей ставки.
// Множитель после k открытых = (1 − edge) × Π (25 − i) / (25 − mines − i), i = 0..k−1:
// честные шансы минус комиссия оператора.
import { HOUSE_EDGE } from './dice.js';

export const CELLS = 25;
export const MINES_MIN = 1;
export const MINES_MAX = 24;

export function validateMines(mines) {
  const m = Number(mines);
  if (!Number.isInteger(m) || m < MINES_MIN || m > MINES_MAX) {
    throw new Error(`mines должен быть от ${MINES_MIN} до ${MINES_MAX}`);
  }
  return m;
}

// Раскладка мин из чисел раунда: тасование Фишера–Йетса, первые `mines` позиций — мины.
export function layout(floats, mines) {
  const cells = Array.from({ length: CELLS }, (_, i) => i);
  for (let i = 0; i < CELLS - 1; i += 1) {
    const j = i + Math.floor(floats[i] * (CELLS - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, mines).sort((a, b) => a - b);
}

export function multiplier(mines, revealed) {
  if (revealed <= 0) return 1;
  let m = 1;
  for (let i = 0; i < revealed; i += 1) m *= (CELLS - i) / (CELLS - mines - i);
  return Math.floor(m * (1 - HOUSE_EDGE) * 10000) / 10000;
}

export const maxReveals = (mines) => CELLS - mines;

// Открыть клетку. state = { mines, mineCells, revealed: number[] }
export function reveal(state, cell) {
  const c = Number(cell);
  if (!Number.isInteger(c) || c < 0 || c >= CELLS) throw new Error('cell должен быть от 0 до 24');
  if (state.revealed.includes(c)) throw new Error('клетка уже открыта');
  const revealed = [...state.revealed, c];
  if (state.mineCells.includes(c)) return { ...state, revealed, busted: true, multiplier: 0 };
  return { ...state, revealed, busted: false, multiplier: multiplier(state.mines, revealed.length) };
}
