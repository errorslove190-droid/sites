// Wheel: колесо из 12 секторов, стрелка указывает на сектор по числу раунда. RTP ≈ 99 %.
export const SEGMENTS = [1.2, 0, 1.5, 0, 1.2, 0, 2, 0, 1.2, 0, 4.8, 0];

export function play({ betUnits, float }) {
  const index = Math.floor(float * SEGMENTS.length);
  const multiplier = SEGMENTS[index];
  return { index, multiplier, win: multiplier > 0, payoutUnits: Math.floor(betUnits * multiplier) };
}

export const rtp = () => SEGMENTS.reduce((a, b) => a + b, 0) / SEGMENTS.length;
