'use strict';

/* Каталог упражнений и рисовалка техники.
   Показывать движение важнее, чем описывать: «жим сидя» ничего не говорит,
   пока не видно, откуда куда идут руки. Поэтому у каждого упражнения две позы,
   а фигурка между ними ходит туда-сюда — этого хватает, чтобы понять траекторию,
   и не нужно ни видео, ни картинок, которые пришлось бы где-то хостить. */

/* Поза: углы в градусах, 0 — конечность смотрит вниз, плюс — по часовой стрелке.
   Массив из двух значений — левая и правая сторона. */
function pose(o) {
  return Object.assign({
    torso: 0, lean: 0, sit: 0,
    armU: [0, 0], armF: [0, 0],
    thigh: [0, 0], shin: [0, 0],
  }, o);
}

const STAND = pose({ armU: [8, -8], armF: [4, -4] });

const EXERCISES = [
  /* ---------- плечи ---------- */
  {
    id: 'sh-press', n: 'Жим гантелей сидя', m: ['shoulders', 'triceps'], eq: 'гантели',
    tech: 'Спина прижата к спинке, локти чуть впереди корпуса. Жмёшь вверх, не сводя гантели.',
    warn: 'Не опускать ниже уровня ушей — плечо сейчас этого не любит.',
    a: pose({ sit: 1, armU: [150, -150], armF: [70, -70] }),
    b: pose({ sit: 1, armU: [172, -172], armF: [175, -175] }),
  },
  {
    id: 'sh-lat', n: 'Отведения в стороны', m: ['shoulders'], eq: 'лёгкие гантели',
    tech: 'Локти чуть согнуты и ведут движение. Поднимаешь до уровня плеч, не выше.',
    warn: 'Выше плеч — прямой путь к боли, которая уже есть.',
    a: pose({ armU: [5, -5], armF: [5, -5] }),
    b: pose({ armU: [88, -88], armF: [88, -88] }),
  },
  {
    id: 'sh-front', n: 'Подъём перед собой', m: ['shoulders'], eq: 'гантели или блин',
    tech: 'Руки почти прямые, поднимаешь до уровня глаз и медленно опускаешь.',
    a: pose({ armU: [5, -5], armF: [0, 0] }),
    b: pose({ armU: [95, -95], armF: [0, 0] }),
  },

  /* ---------- грудь ---------- */
  {
    id: 'ch-press', n: 'Жим гантелей лёжа', m: ['chest', 'triceps', 'shoulders'], eq: 'гантели, скамья',
    tech: 'Лопатки сведены, гантели идут по дуге от груди вверх. Локти под 45°, не в стороны.',
    warn: 'Гантели, а не штанга: плечо само выбирает удобную траекторию.',
    a: pose({ lie: 1, armU: [95, -95], armF: [60, -60] }),
    b: pose({ lie: 1, armU: [95, -95], armF: [95, -95] }),
  },
  {
    id: 'ch-incline', n: 'Жим на наклонной', m: ['chest', 'shoulders', 'triceps'], eq: 'гантели, наклонная',
    tech: 'Скамья 30°, гантели над верхом груди. Внизу — растяжение, вверху не стучать друг о друга.',
    a: pose({ lie: 1, tilt: 30, armU: [110, -110], armF: [55, -55] }),
    b: pose({ lie: 1, tilt: 30, armU: [100, -100], armF: [100, -100] }),
  },
  {
    id: 'ch-dip', n: 'Брусья', m: ['chest', 'triceps', 'shoulders'], eq: 'брусья',
    tech: 'Корпус чуть вперёд — больше грудь, вертикально — больше трицепс. Опускаться до угла 90° в локте.',
    warn: 'Глубже 90° плечу сейчас не надо.',
    a: pose({ lean: 12, armU: [178, -178], armF: [178, -178] }),
    b: pose({ lean: 12, armU: [150, -150], armF: [95, -95] }),
  },
  {
    id: 'ch-push', n: 'Отжимания', m: ['chest', 'triceps', 'abs'], eq: 'свой вес',
    tech: 'Тело прямой линией от пятки до макушки, локти назад, а не в стороны.',
    a: pose({ plank: 1, armU: [95, -95], armF: [0, 0] }),
    b: pose({ plank: 1, armU: [125, -125], armF: [60, -60] }),
  },

  /* ---------- спина ---------- */
  {
    id: 'bk-pullup', n: 'Подтягивания', m: ['back', 'biceps'], eq: 'турник',
    tech: 'Нейтральный или обратный хват, тянешь локтями вниз к рёбрам, а не руками.',
    warn: 'Не тянет — гравитрон или резина, но техника та же.',
    a: pose({ hang: 1, armU: [172, -172], armF: [172, -172] }),
    b: pose({ hang: 1, armU: [160, -160], armF: [95, -95] }),
  },
  {
    id: 'bk-lat', n: 'Тяга верхнего блока', m: ['back', 'biceps'], eq: 'блок',
    tech: 'Грудь вперёд, тянешь рукоять к ключицам, лопатки идут вниз и вместе.',
    a: pose({ sit: 1, armU: [168, -168], armF: [168, -168] }),
    b: pose({ sit: 1, armU: [140, -140], armF: [80, -80] }),
  },
  {
    id: 'bk-row', n: 'Тяга гантели в наклоне', m: ['back', 'biceps'], eq: 'гантель, скамья',
    tech: 'Упор рукой и коленом в скамью, спина ровная. Тянешь гантель к поясу, локоть вдоль тела.',
    warn: 'Спина прямая: круглая поясница под весом — это то, чего мы избегаем.',
    a: pose({ lean: 70, armU: [10, -10], armF: [10, -10] }),
    b: pose({ lean: 70, armU: [40, -40], armF: [110, -110] }),
  },
  {
    id: 'bk-hyper', n: 'Гиперэкстензия', m: ['back'], eq: 'тренажёр',
    tech: 'Опускаешься до складки в тазу, поднимаешься до прямой линии — не прогибаясь назад.',
    warn: 'Лечит спину лучше, чем щадящий режим, но без веса первые недели.',
    a: pose({ lean: 75, armU: [175, -175], armF: [175, -175] }),
    b: pose({ lean: 5, armU: [175, -175], armF: [175, -175] }),
  },

  /* ---------- бицепс ---------- */
  {
    id: 'bi-curl', n: 'Подъём на бицепс', m: ['biceps'], eq: 'гантели или штанга',
    tech: 'Локти прижаты к бокам и не двигаются. Работает только предплечье.',
    a: pose({ armU: [8, -8], armF: [8, -8] }),
    b: pose({ armU: [8, -8], armF: [140, -140] }),
  },
  {
    id: 'bi-hammer', n: 'Молотки', m: ['biceps'], eq: 'гантели',
    tech: 'То же, но кисть нейтральная — большой палец смотрит вверх. Забирает предплечье.',
    a: pose({ armU: [8, -8], armF: [8, -8] }),
    b: pose({ armU: [8, -8], armF: [135, -135] }),
  },

  /* ---------- трицепс ---------- */
  {
    id: 'tr-push', n: 'Разгибания на блоке', m: ['triceps'], eq: 'блок',
    tech: 'Локти у корпуса, вниз до полного выпрямления, вверх — только до 90°.',
    a: pose({ armU: [10, -10], armF: [95, -95] }),
    b: pose({ armU: [10, -10], armF: [10, -10] }),
  },
  {
    id: 'tr-french', n: 'Французский жим', m: ['triceps'], eq: 'гантель, скамья',
    tech: 'Плечо вертикально и неподвижно, опускаешь вес за голову только предплечьями.',
    a: pose({ lie: 1, armU: [95, -95], armF: [95, -95] }),
    b: pose({ lie: 1, armU: [95, -95], armF: [175, -175] }),
  },

  /* ---------- пресс ---------- */
  {
    id: 'ab-plank', n: 'Планка', m: ['abs'], eq: 'свой вес',
    tech: 'Таз не проваливается и не задран, ягодицы напряжены. Время вместо повторов.',
    a: pose({ plank: 1, armU: [95, -95], armF: [0, 0] }),
    b: pose({ plank: 1, armU: [97, -97], armF: [0, 0] }),
  },
  {
    id: 'ab-crunch', n: 'Скручивания', m: ['abs'], eq: 'свой вес',
    tech: 'Отрываешь лопатки, а не поясницу. Подбородок не прижимать к груди.',
    a: pose({ lie: 1, armU: [150, -150], armF: [120, -120], thigh: [95, 95], shin: [95, 95] }),
    b: pose({ lie: 1, curl: 28, armU: [150, -150], armF: [120, -120], thigh: [95, 95], shin: [95, 95] }),
  },
  {
    id: 'ab-legs', n: 'Подъём ног в висе', m: ['abs'], eq: 'турник',
    tech: 'Без раскачки, поднимаешь до параллели и медленно опускаешь.',
    a: pose({ hang: 1, armU: [175, -175], armF: [175, -175] }),
    b: pose({ hang: 1, armU: [175, -175], armF: [175, -175], thigh: [85, 85], shin: [10, 10] }),
  },

  /* ---------- ноги ---------- */
  {
    id: 'lg-squat', n: 'Приседания', m: ['legs'], eq: 'штанга или гантель',
    tech: 'Колени идут за носками, спина ровная, таз назад. Глубина — до параллели бедра.',
    warn: 'Спина болит — начинай с гоблет-приседа: гантель у груди, корпус ровнее.',
    a: pose({ armU: [150, -150], armF: [60, -60] }),
    b: pose({ armU: [150, -150], armF: [60, -60], lean: 22, thigh: [75, 75], shin: [-65, -65] }),
  },
  {
    id: 'lg-press', n: 'Жим ногами', m: ['legs'], eq: 'тренажёр',
    tech: 'Стопы на ширине плеч, колени не сводить. Не выпрямлять ноги в замок.',
    a: pose({ lie: 1, thigh: [95, 95], shin: [10, 10], armU: [30, -30], armF: [10, -10] }),
    b: pose({ lie: 1, thigh: [50, 50], shin: [55, 55], armU: [30, -30], armF: [10, -10] }),
  },
  {
    id: 'lg-lunge', n: 'Выпады', m: ['legs'], eq: 'гантели',
    tech: 'Шаг вперёд, заднее колено вниз почти до пола, корпус вертикально.',
    a: pose({ armU: [8, -8], armF: [4, -4] }),
    b: pose({ armU: [8, -8], armF: [4, -4], thigh: [55, -35], shin: [-55, -40] }),
  },
  {
    id: 'lg-rdl', n: 'Румынская тяга', m: ['legs', 'back'], eq: 'гантели',
    tech: 'Ноги почти прямые, таз назад, гантели скользят вдоль бедра. Спина ровная всё время.',
    warn: 'Лёгкий вес и идеальная техника, при боли — пропускаем.',
    a: pose({ armU: [175, -175], armF: [175, -175] }),
    b: pose({ lean: 65, armU: [175, -175], armF: [175, -175] }),
  },
  {
    id: 'cf-raise', n: 'Подъёмы на носки', m: ['calves'], eq: 'свой вес или гантели',
    tech: 'Полная амплитуда: пятка ниже уровня носка внизу, максимально вверх — вверху.',
    a: pose({ armU: [8, -8], armF: [4, -4] }),
    b: pose({ armU: [8, -8], armF: [4, -4], heel: 1 }),
  },
];

/* ---------- рисовалка ---------- */

/* Фигурка собрана из вложенных групп: каждая крутится вокруг своего сустава,
   поэтому поза задаётся углами, а не координатами — и позы можно смешивать. */
/* Плечи и таз разнесены по ширине: если руки и ноги растут из одной точки,
   при любых углах фигура складывается в одну палку и движение не читается. */
const SH_L = 82, SH_R = 118, HIP_L = 90, HIP_R = 110, SH_Y = 62, HIP_Y = 116;

const STICK = `
<svg class="stick" viewBox="0 0 200 200" aria-hidden="true">
  <g class="st-root">
    <g class="st-body">
      <circle class="st-head" cx="100" cy="38" r="11"/>
      <line class="st-spine" x1="100" y1="49" x2="100" y2="${HIP_Y}"/>
      <line class="st-bar" x1="${SH_L}" y1="${SH_Y}" x2="${SH_R}" y2="${SH_Y}"/>
      <line class="st-bar" x1="${HIP_L}" y1="${HIP_Y}" x2="${HIP_R}" y2="${HIP_Y}"/>

      <g data-j="armU" data-s="0" style="--ox:${SH_L}px; --oy:${SH_Y}px">
        <line x1="${SH_L}" y1="${SH_Y}" x2="${SH_L}" y2="${SH_Y + 30}"/>
        <g data-j="armF" data-s="0" style="--ox:${SH_L}px; --oy:${SH_Y + 30}px">
          <line x1="${SH_L}" y1="${SH_Y + 30}" x2="${SH_L}" y2="${SH_Y + 58}"/>
        </g>
      </g>
      <g data-j="armU" data-s="1" style="--ox:${SH_R}px; --oy:${SH_Y}px">
        <line x1="${SH_R}" y1="${SH_Y}" x2="${SH_R}" y2="${SH_Y + 30}"/>
        <g data-j="armF" data-s="1" style="--ox:${SH_R}px; --oy:${SH_Y + 30}px">
          <line x1="${SH_R}" y1="${SH_Y + 30}" x2="${SH_R}" y2="${SH_Y + 58}"/>
        </g>
      </g>
    </g>

    <g data-j="thigh" data-s="0" style="--ox:${HIP_L}px; --oy:${HIP_Y}px">
      <line x1="${HIP_L}" y1="${HIP_Y}" x2="${HIP_L}" y2="${HIP_Y + 36}"/>
      <g data-j="shin" data-s="0" style="--ox:${HIP_L}px; --oy:${HIP_Y + 36}px">
        <line x1="${HIP_L}" y1="${HIP_Y + 36}" x2="${HIP_L}" y2="${HIP_Y + 70}"/>
        <line class="st-foot" x1="${HIP_L}" y1="${HIP_Y + 70}" x2="${HIP_L + 13}" y2="${HIP_Y + 70}"/>
      </g>
    </g>
    <g data-j="thigh" data-s="1" style="--ox:${HIP_R}px; --oy:${HIP_Y}px">
      <line x1="${HIP_R}" y1="${HIP_Y}" x2="${HIP_R}" y2="${HIP_Y + 36}"/>
      <g data-j="shin" data-s="1" style="--ox:${HIP_R}px; --oy:${HIP_Y + 36}px">
        <line x1="${HIP_R}" y1="${HIP_Y + 36}" x2="${HIP_R}" y2="${HIP_Y + 70}"/>
        <line class="st-foot" x1="${HIP_R}" y1="${HIP_Y + 70}" x2="${HIP_R + 13}" y2="${HIP_Y + 70}"/>
      </g>
    </g>
  </g>
</svg>`;

/**
 * Гоняет фигурку между двумя позами. Возвращает функцию остановки —
 * без неё анимация продолжала бы крутиться после закрытия окна и жрать батарею.
 */
function animateStick(svg, ex) {
  const A = ex.a, B = ex.b;
  const joints = svg.querySelectorAll('[data-j]');
  const root = svg.querySelector('.st-root');
  const body = svg.querySelector('.st-body');

  function apply(t) {
    /* плавный разгон и торможение: линейное движение выглядит механическим */
    const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const mix = (a, b) => a + (b - a) * e;

    joints.forEach(g => {
      const j = g.dataset.j, s = +g.dataset.s;
      const from = A[j] ? A[j][s] : 0;
      const to = B[j] ? B[j][s] : 0;
      const ox = g.style.getPropertyValue('--ox');
      const oy = g.style.getPropertyValue('--oy');
      g.style.transformOrigin = `${ox} ${oy}`;
      g.style.transform = `rotate(${mix(from, to)}deg)`;
    });

    /* наклон корпуса, посадка, вис и планка — общее положение тела */
    const lean = mix(A.lean || 0, B.lean || 0) + mix(A.curl || 0, B.curl || 0);
    body.style.transformOrigin = '100px 112px';
    body.style.transform = `rotate(${lean}deg)`;

    const lie = A.lie || B.lie;
    const plank = A.plank || B.plank;
    const tilt = mix(A.tilt || 0, B.tilt || 0);
    const heel = mix(A.heel || 0, B.heel || 0);
    let rot = 0;
    if (lie) rot = -90 + tilt;
    if (plank) rot = -78;
    root.style.transformOrigin = '100px 120px';
    root.style.transform = `rotate(${rot}deg) translateY(${heel * -8}px)`;
  }

  let raf, start = null, dir = 1;
  const period = 1500;

  function frame(ts) {
    if (start === null) start = ts;
    const p = ((ts - start) % (period * 2)) / period;
    apply(p < 1 ? p : 2 - p);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/** Упражнения, которые бьют по этой группе мышц. Первой — та, для которой она главная. */
function exercisesFor(muscle) {
  return EXERCISES.filter(e => e.m.includes(muscle))
    .sort((a, b) => a.m.indexOf(muscle) - b.m.indexOf(muscle));
}
