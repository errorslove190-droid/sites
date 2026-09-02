// Каталог игр и тем: общие данные для приложения и страницы «все экраны».
export const GAMES = [
  { id: 'crash', name: 'Crash', cat: 'crash', tag: 'Хит', desc: 'Забери до краша', rtp: '99 %', short: 'CR' },
  { id: 'plinko', name: 'Plinko', cat: 'fast', tag: 'Новое', desc: 'Шарик и лунки до ×1000', rtp: '99 %', short: 'PL' },
  { id: 'mines', name: 'Mines', cat: 'fast', tag: 'Топ', desc: '5×5, обходи мины', rtp: '99 %', short: 'MN' },
  { id: 'dice', name: 'Dice', cat: 'classic', desc: 'Бросок ниже порога', rtp: '99 %', short: 'DC' },
  { id: 'limbo', name: 'Limbo', cat: 'fast', desc: 'Назови множитель', rtp: '99 %', short: 'LB' },
  { id: 'wheel', name: 'Wheel', cat: 'classic', desc: '12 секторов, до ×4.8', rtp: '99 %', short: 'WH' },
  { id: 'coinflip', name: 'Coinflip', cat: 'classic', desc: 'Орёл или решка', rtp: '99 %', short: 'CF' },
];
export const POPULAR = ['crash', 'plinko', 'mines', 'dice'];

export const ART = {
  crash: '<svg viewBox="0 0 24 24"><path d="M4 20C9 19 14 14 20 5"/><path d="M15 5h5v5"/></svg>',
  plinko: '<svg viewBox="0 0 24 24"><g fill="#fff" stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><circle cx="6" cy="15" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="18" cy="15" r="1.5"/></g><path d="M4 20h16"/></svg>',
  mines: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="6"/><path d="M12 3v4M3 13h4M17 13h4M6 7l2.5 2.5M18 7l-2.5 2.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><g fill="#fff" stroke="none"><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="8.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="8.5" cy="15.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/></g></svg>',
  limbo: '<svg viewBox="0 0 24 24"><path d="M12 20V5M6 11l6-6 6 6"/></svg>',
  wheel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7"/><circle cx="12" cy="12" r="2.2" fill="#fff" stroke="none"/></svg>',
  coinflip: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 10h4a1.6 1.6 0 0 1 0 3.2h-4"/></svg>',
};

export const THEMES = [
  ['lucky', 'Лаки', '#2f7cff', '#0f1526'], ['candy', 'Конфета', '#35c2ff', '#9b3fd6'], ['terminal', 'Терминал', '#c6ff3d', '#0b0d10'],
  ['scene', 'Сцена', '#f3ede3', '#0e0e10'], ['felt', 'Сукно', '#d4af37', '#0f3d2e'], ['fintech', 'Финтех', '#1652f0', '#f4f5f7'],
];

export const gameOf = (id) => GAMES.find((g) => g.id === id);
export const tile = (g) => `<button type="button" class="tile" data-open="${g.id}"><div class="art art-${g.id}">${g.tag ? `<span class="tag">${g.tag}</span>` : ''}${ART[g.id]}</div><div class="meta"><b>${g.name}</b><small>${g.desc}</small><em>RTP ${g.rtp}</em></div></button>`;
export const themeButtons = () => THEMES.map(([k, n, a, b]) => `<button type="button" data-theme="${k}"><i style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></i>${n}</button>`).join('');
export const segColor = (m) => ({ 0: 'var(--line)', 1.2: '#2f7cff', 1.5: '#12b886', 2: '#7c5cff', 4.8: '#ffd23f' })[m] || '#7c5cff';
