// Plinko: шарик падает через ряды штырьков, на каждом ряду уходит влево или вправо (одно число раунда на ряд).
// Лунка = число уходов вправо. Таблицы множителей — классические (как у Stake), RTP ≈ 99 %.

export const ROWS = [8, 12, 16];
export const RISKS = ['low', 'medium', 'high'];

export const TABLES = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

export function validate(rows, risk) {
  const r = Number(rows);
  if (!ROWS.includes(r)) throw new Error('rows: 8, 12 или 16');
  if (!RISKS.includes(risk)) throw new Error('risk: low, medium или high');
  return { rows: r, risk };
}

export function play({ rows, risk, betUnits, floats }) {
  const v = validate(rows, risk);
  const path = floats.slice(0, v.rows).map((f) => (f < 0.5 ? 0 : 1));
  const bucket = path.reduce((a, b) => a + b, 0);
  const multiplier = TABLES[v.rows][v.risk][bucket];
  return { rows: v.rows, risk: v.risk, path, bucket, multiplier, win: multiplier >= 1, payoutUnits: Math.floor(betUnits * multiplier) };
}

// Ожидаемая отдача таблицы: биномиальные вероятности лунок × множители.
export function rtp(rows, risk) {
  const t = TABLES[rows][risk];
  let c = 1;
  let sum = 0;
  for (let k = 0; k <= rows; k += 1) {
    sum += (c / 2 ** rows) * t[k];
    c = (c * (rows - k)) / (k + 1);
  }
  return sum;
}
