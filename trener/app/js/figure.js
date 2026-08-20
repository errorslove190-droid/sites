'use strict';

/* Человек для карточки упражнения.
   Фигура собрана из анатомических сегментов: у каждого своя форма с мышечным
   рельефом, и каждый крутится вокруг своего сустава. Отсюда два свойства сразу —
   тело выглядит телом, а не набором палок, и любую позу можно задать углами.

   Локальная система у каждого сегмента: сустав в (0,0), сегмент растёт вниз по Y.
   Поэтому угол 0 — «висит вниз», 180 — «поднят вверх», и позы читаются глазами. */

/* Длины сегментов — от них зависят и формы, и точки крепления */
const SEG = { torso: 54, arm: 30, fore: 28, thigh: 38, shin: 34 };

/* Формы. Все рисуются от (0,0) вниз: слева направо по контуру. */
const SHAPE = {
  /* корпус: плечи шире таза, талия уже — силуэт узнаётся именно по этому */
  torso: `M-19,-54 C-21,-46 -20,-38 -17,-30 C-15,-22 -14,-12 -13,0
          L13,0 C14,-12 15,-22 17,-30 C20,-38 21,-46 19,-54
          C12,-58 -12,-58 -19,-54 Z`,
  head: `M0,-13 C7,-13 11,-8 11,-1 C11,7 7,12 0,12 C-7,12 -11,7 -11,-1 C-11,-8 -7,-13 0,-13 Z`,
  neck: `M-5,-6 L5,-6 L6,4 L-6,4 Z`,

  /* плечо: дельта сверху, бицепс/трицепс брюшком посередине */
  upperArm: `M-7,0 C-9,6 -9,14 -7,22 C-6,27 -4,30 0,30 C4,30 6,27 7,22
             C9,14 9,6 7,0 C4,-3 -4,-3 -7,0 Z`,
  /* предплечье сужается к кисти */
  foreArm: `M-6,0 C-7,7 -6,15 -5,21 C-4,25 -3,28 0,28 C3,28 4,25 5,21
            C6,15 7,7 6,0 C3,-2 -3,-2 -6,0 Z`,
  hand: `M-4,0 C-5,3 -5,7 -3,9 C-1,11 1,11 3,9 C5,7 5,3 4,0 Z`,

  /* бедро массивнее голени — иначе ноги смотрятся детскими */
  thigh: `M-10,0 C-12,8 -12,20 -10,30 C-8,36 -4,38 0,38 C4,38 8,36 10,30
          C12,20 12,8 10,0 C6,-3 -6,-3 -10,0 Z`,
  shin: `M-8,0 C-9,6 -8,14 -6,22 C-5,28 -4,34 0,34 C4,34 5,28 6,22
         C8,14 9,6 8,0 C5,-2 -5,-2 -8,0 Z`,
  foot: `M-4,0 L4,0 L13,5 C14,7 13,8 11,8 L-4,8 Z`,

  /* мышцы поверх корпуса — они же подсвечиваются */
  chest: `M-17,-46 C-10,-49 -2,-49 -1,-45 L-1,-32 C-8,-30 -14,-33 -16,-38 Z
          M17,-46 C10,-49 2,-49 1,-45 L1,-32 C8,-30 14,-33 16,-38 Z`,
  abs: `M-11,-28 L-1,-28 L-1,-2 L-9,-2 Z M11,-28 L1,-28 L1,-2 L9,-2 Z`,
  lat: `M-18,-44 C-20,-34 -19,-22 -15,-14 L-9,-20 C-12,-28 -13,-36 -13,-44 Z
        M18,-44 C20,-34 19,-22 15,-14 L9,-20 C12,-28 13,-36 13,-44 Z`,
  delt: `M-7,-1 C-10,3 -10,10 -8,15 C-4,16 -1,13 0,8 C1,3 -2,-1 -7,-1 Z`,
  bicep: `M-6,5 C-8,10 -8,17 -6,22 C-3,24 2,24 5,22 C7,17 7,10 5,5 C2,3 -3,3 -6,5 Z`,
  quad: `M-9,3 C-11,11 -11,22 -9,30 C-5,33 4,33 8,30 C10,22 10,11 8,3 C4,1 -5,1 -9,3 Z`,
  calf: `M-7,3 C-8,9 -7,16 -5,22 C-2,24 2,24 5,22 C7,16 8,9 7,3 C4,1 -4,1 -7,3 Z`,
};

/* Каждый сустав — это пара групп: внешняя переносит начало координат в сустав
   (атрибут translate), внутренняя крутится (атрибут rotate). Одной группой не
   обойтись: rotate затёр бы translate, и конечность улетела бы в угол. */

/** Одна рука: плечо → предплечье → кисть. side 0 — левая, 1 — правая. */
function arm(side) {
  const x = side ? 17 : -17;
  return `
    <g transform="translate(${x},-48)"><g class="j" data-j="armU" data-s="${side}">
      <path class="lb" d="${SHAPE.upperArm}"/>
      <path class="mus" data-m="shoulders" d="${SHAPE.delt}"/>
      <path class="mus" data-m="biceps" d="${SHAPE.bicep}"/>
      <g transform="translate(0,${SEG.arm})"><g class="j" data-j="armF" data-s="${side}">
        <path class="lb" d="${SHAPE.foreArm}"/>
        <g transform="translate(0,${SEG.fore})"><path class="lb" d="${SHAPE.hand}"/></g>
      </g></g>
    </g></g>`;
}

/** Одна нога: бедро → голень → стопа. */
function leg(side) {
  const x = side ? 9 : -9;
  return `
    <g transform="translate(${x},0)"><g class="j" data-j="thigh" data-s="${side}">
      <path class="lb" d="${SHAPE.thigh}"/>
      <path class="mus" data-m="legs" d="${SHAPE.quad}"/>
      <g transform="translate(0,${SEG.thigh})"><g class="j" data-j="shin" data-s="${side}">
        <path class="lb" d="${SHAPE.shin}"/>
        <path class="mus" data-m="calves" d="${SHAPE.calf}"/>
        <g transform="translate(0,${SEG.shin})"><path class="lb" d="${SHAPE.foot}"/></g>
      </g></g>
    </g></g>`;
}

/** Вся фигура. Таз — начало координат, от него растут корпус и ноги. */
const HUMAN = `
<svg class="human" viewBox="0 0 200 210" aria-hidden="true">
  <g class="hu-root" transform="translate(100,118)">
    ${leg(0)}
    ${leg(1)}
    <g class="hu-body">
      ${arm(0)}
      <path class="lb" d="${SHAPE.torso}"/>
      <path class="mus" data-m="back" d="${SHAPE.lat}"/>
      <path class="mus" data-m="chest" d="${SHAPE.chest}"/>
      <path class="mus" data-m="abs" d="${SHAPE.abs}"/>
      <g transform="translate(0,-58)">
        <path class="lb" d="${SHAPE.neck}"/>
        <g transform="translate(0,-8)"><path class="lb" d="${SHAPE.head}"/></g>
      </g>
      ${arm(1)}
    </g>
  </g>
</svg>`;

/**
 * Гоняет фигуру между двумя позами упражнения и подсвечивает рабочие мышцы.
 * Возвращает функцию остановки: иначе анимация крутится после закрытия окна.
 */
function animateHuman(svg, ex) {
  const A = ex.a, B = ex.b;
  const joints = svg.querySelectorAll('.j');
  const root = svg.querySelector('.hu-root');

  svg.querySelectorAll('.mus').forEach(p => {
    p.classList.toggle('on', ex.m.includes(p.dataset.m));
  });

  function apply(t) {
    const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const mix = (a, b) => a + (b - a) * e;

    /* Пишем в атрибут, а не в стиль: у SVG rotate без центра крутит вокруг
       локального (0,0) — ровно вокруг сустава, куда нас поставил translate. */
    joints.forEach(g => {
      const j = g.dataset.j;
      const s = +g.dataset.s;
      const from = A[j] ? A[j][s] : 0;
      const to = B[j] ? B[j][s] : 0;
      g.setAttribute('transform', `rotate(${mix(from, to).toFixed(1)})`);
    });

    const body = svg.querySelector('.hu-body');
    const lean = mix(A.lean || 0, B.lean || 0) + mix(A.curl || 0, B.curl || 0);
    body.setAttribute('transform', `rotate(${lean.toFixed(1)})`);

    /* лёжа, в наклоне и в планке разворачивается вся фигура целиком */
    const tilt = mix(A.tilt || 0, B.tilt || 0);
    let rot = 0;
    if (A.lie || B.lie) rot = -90 + tilt;
    if (A.plank || B.plank) rot = -78;
    const heel = mix(A.heel || 0, B.heel || 0);
    root.setAttribute('transform', `translate(100,${(118 - heel * 8).toFixed(1)}) rotate(${rot.toFixed(1)})`);
  }

  let raf, start = null;
  const period = 1600;
  function frame(ts) {
    if (start === null) start = ts;
    const p = ((ts - start) % (period * 2)) / period;
    apply(p < 1 ? p : 2 - p);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
