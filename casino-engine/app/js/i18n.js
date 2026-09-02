// Два языка Mini App. Статичные надписи помечены data-i18n в index.html, динамические берутся через t().
export const LANGS = ['ru', 'en'];

export const DICT = {
  ru: {
    'demo.bar': 'Демо без сервера: деньги виртуальные, раунды считаются в браузере тем же алгоритмом честности',
    'top.deposit': 'Пополнить',
    'promo.1.k': 'Честность', 'promo.1.h': 'Каждый раунд можно проверить', 'promo.1.p': 'Хеш серверного сида показан до ставки',
    'promo.2.k': 'Выплаты', 'promo.2.h': 'USDT и TON без ожидания', 'promo.2.p': 'Депозит и вывод через Crypto Pay',
    'promo.3.k': 'Оператор', 'promo.3.h': 'Приветственный пакет', 'promo.3.p': 'Условия задаются в панели оператора',
    'cat.all': 'Все', 'cat.crash': 'Crash', 'cat.fast': 'Быстрые', 'cat.classic': 'Классика',
    'h.popular': 'Популярные', 'h.all': 'Все игры', 'h.recent': 'Последние раунды', 'h.ops': 'Операции', 'h.theme': 'Тема оформления', 'h.lang': 'Язык',
    'h.crash': 'Crash-игры', 'h.fast': 'Быстрые', 'h.classic': 'Классика',
    'empty.recent': 'Пока пусто — сыграй первый раунд', 'empty.ops': 'Операций пока нет',
    'search': 'Поиск игры',
    'nav.home': 'Главная', 'nav.games': 'Игры', 'nav.wallet': 'Кошелёк', 'nav.profile': 'Профиль',
    'bet': 'Ставка', 'go.dice': 'Сделать ставку', 'go.coinflip': 'Бросить монету', 'go.mines': 'Начать', 'go.crash': 'Ставка', 'go.plinko': 'Бросить шарик', 'go.limbo': 'Играть', 'go.wheel': 'Крутить',
    'go.cashout': 'Забрать', 'go.open': 'Открой клетку',
    'dice.lb': 'Бросок ниже', 'st.mult': 'Множитель', 'st.chance': 'Шанс', 'st.payout': 'Выплата',
    'coin.lb': 'Выбери сторону', 'coin.heads': 'Орёл', 'coin.tails': 'Решка',
    'mines.lb': 'Мины', 'mines.now': 'Сейчас', 'mines.next': 'дальше',
    'crash.hint': 'Сделай ставку и забери до краша', 'crash.auto': 'Автовывод ×', 'crash.last': 'Последний краш', 'crash.off': 'выкл',
    'crash.run': 'Забери до краша', 'crash.autoOn': 'Автовывод на', 'crash.won': 'Забрано на', 'crash.wasAt': 'краш был на', 'crash.bust': 'Краш на',
    'plinko.low': 'Низкий', 'plinko.medium': 'Средний', 'plinko.high': 'Высокий', 'plinko.rows': 'Ряды',
    'limbo.lb': 'Выпадет не меньше цели — выигрыш', 'limbo.target': 'Цель', 'limbo.last': 'Последний',
    'wallet.balance': 'Баланс', 'wallet.deposit': 'Пополнить', 'wallet.withdraw': 'Вывести',
    'wallet.note': 'Депозит — инвойс Crypto Pay в выбранной монете, зачисление по вебхуку. Вывод — перевод на кошелёк игрока с защитой от двойной выплаты, крупные суммы подтверждает оператор. Подключение реальных платежей — этап 2.',
    'profile.rounds': 'Раундов', 'profile.wagered': 'Поставлено', 'profile.won': 'Выиграно',
    'menu.fair': 'Проверяемая честность', 'menu.ref': 'Реферальная программа', 'menu.limits': 'Лимиты и ответственная игра', 'menu.support': 'Поддержка', 'menu.rules': 'Правила',
    'stub.ref': 'Реферальная программа: ссылка и проценты задаются оператором', 'stub.limits': 'Лимиты ставок и самоисключение — в панели оператора', 'stub.support': 'Поддержка: чат оператора в Telegram', 'stub.rules': 'Правила и оферта оператора',
    'fair.h': 'Проверяемая честность', 'fair.p': 'Результат каждого раунда считается из трёх чисел: серверного сида (его хеш ты видишь заранее), твоего клиентского сида и номера раунда. Сервер не может подменить результат после ставки.',
    'fair.hash': 'Хеш серверного сида', 'fair.client': 'Клиентский сид', 'fair.nonce': 'Сыграно раундов с этой парой', 'fair.rotate': 'Сменить сид и раскрыть старый', 'fair.revealed': 'Раскрытый серверный сид',
    'fair.hashS': 'Хеш', 'fair.clientS': 'Клиентский сид', 'fair.roundsS': 'Раундов',
    'fair.how': 'Проверка: HMAC-SHA256(serverSeed, "clientSeed:nonce:0"), первые 4 байта ÷ 2³² → число от 0 до 1. Dice: ⌊число × 10000⌋ ÷ 100. Crash и Limbo: 0.99 ÷ (1 − число).',
    'close': 'Закрыть', 'continue': 'Продолжить', 'sheet.amount': 'Сумма, USDT', 'sheet.addr': 'Адрес кошелька', 'sheet.addrPh': 'TON или TRC-20',
    'sheet.depDemo': 'Демо: реальные платежи не подключены, начислим 1000 USDT виртуального баланса.',
    'sheet.dep': 'Создадим инвойс Crypto Pay в выбранной монете. Зачисление после оплаты, обычно за секунды.',
    'sheet.wdDemo': 'Демо: деньги виртуальные, вывод не выполняется. В продукте — перевод Crypto Pay на кошелёк игрока.',
    'sheet.wd': 'Перевод Crypto Pay на кошелёк. Крупные суммы подтверждает оператор.',
    'sheet.okDemo': 'Начислить демо', 'sheet.okDep': 'Создать инвойс', 'sheet.okWd': 'Отправить',
    'toast.topup': 'Демо-баланс пополнен', 'toast.dep2': 'Инвойсы Crypto Pay подключаются на этапе 2', 'toast.wd2': 'Вывод через Crypto Pay подключается на этапе 2',
    'toast.theme': 'Тема', 'toast.lang': 'Язык: русский', 'toast.seed': 'Сид сменён, старый раскрыт',
    'toast.minesWin': 'Забрано', 'toast.minesLose': 'Мина. Ставка сгорела', 'toast.win': 'Выигрыш', 'toast.dropped': 'Выпало',
    'kind.bet': 'Ставка', 'kind.win': 'Выигрыш', 'kind.bonus': 'Бонус', 'kind.deposit': 'Депозит', 'kind.withdraw': 'Вывод', 'ledger.rest': 'остаток',
    'recent.bet': 'ставка',
    'game.crash.desc': 'Забери до краша', 'game.plinko.desc': 'Шарик и лунки до ×1000', 'game.mines.desc': '5×5, обходи мины', 'game.dice.desc': 'Бросок ниже порога', 'game.limbo.desc': 'Назови множитель', 'game.wheel.desc': '12 секторов, до ×4.8', 'game.coinflip.desc': 'Орёл или решка',
    'tag.hit': 'Хит', 'tag.new': 'Новое', 'tag.top': 'Топ',
    'theme.lucky': 'Лаки', 'theme.candy': 'Конфета', 'theme.terminal': 'Терминал', 'theme.scene': 'Сцена', 'theme.felt': 'Сукно', 'theme.fintech': 'Финтех',
  },
  en: {
    'demo.bar': 'Serverless demo: virtual money, rounds are computed in your browser with the same fairness algorithm',
    'top.deposit': 'Deposit',
    'promo.1.k': 'Fairness', 'promo.1.h': 'Every round can be verified', 'promo.1.p': 'Server seed hash is shown before you bet',
    'promo.2.k': 'Payouts', 'promo.2.h': 'USDT and TON, no waiting', 'promo.2.p': 'Deposits and withdrawals via Crypto Pay',
    'promo.3.k': 'Operator', 'promo.3.h': 'Welcome package', 'promo.3.p': 'Terms are set in the operator panel',
    'cat.all': 'All', 'cat.crash': 'Crash', 'cat.fast': 'Quick', 'cat.classic': 'Classic',
    'h.popular': 'Popular', 'h.all': 'All games', 'h.recent': 'Recent rounds', 'h.ops': 'Transactions', 'h.theme': 'Theme', 'h.lang': 'Language',
    'h.crash': 'Crash games', 'h.fast': 'Quick', 'h.classic': 'Classic',
    'empty.recent': 'Nothing yet — play your first round', 'empty.ops': 'No transactions yet',
    'search': 'Search games',
    'nav.home': 'Home', 'nav.games': 'Games', 'nav.wallet': 'Wallet', 'nav.profile': 'Profile',
    'bet': 'Bet', 'go.dice': 'Place bet', 'go.coinflip': 'Flip the coin', 'go.mines': 'Start', 'go.crash': 'Bet', 'go.plinko': 'Drop the ball', 'go.limbo': 'Play', 'go.wheel': 'Spin',
    'go.cashout': 'Cash out', 'go.open': 'Open a cell',
    'dice.lb': 'Roll under', 'st.mult': 'Multiplier', 'st.chance': 'Chance', 'st.payout': 'Payout',
    'coin.lb': 'Pick a side', 'coin.heads': 'Heads', 'coin.tails': 'Tails',
    'mines.lb': 'Mines', 'mines.now': 'Now', 'mines.next': 'next',
    'crash.hint': 'Place a bet and cash out before the crash', 'crash.auto': 'Auto cashout ×', 'crash.last': 'Last crash', 'crash.off': 'off',
    'crash.run': 'Cash out before the crash', 'crash.autoOn': 'Auto cashout at', 'crash.won': 'Cashed out at', 'crash.wasAt': 'crashed at', 'crash.bust': 'Crashed at',
    'plinko.low': 'Low', 'plinko.medium': 'Medium', 'plinko.high': 'High', 'plinko.rows': 'Rows',
    'limbo.lb': 'Result at or above target wins', 'limbo.target': 'Target', 'limbo.last': 'Last',
    'wallet.balance': 'Balance', 'wallet.deposit': 'Deposit', 'wallet.withdraw': 'Withdraw',
    'wallet.note': 'Deposit — a Crypto Pay invoice in the chosen coin, credited via webhook. Withdrawal — a transfer to the player wallet with double-payment protection; large amounts are approved by the operator. Real payments arrive in stage 2.',
    'profile.rounds': 'Rounds', 'profile.wagered': 'Wagered', 'profile.won': 'Won',
    'menu.fair': 'Provably fair', 'menu.ref': 'Referral program', 'menu.limits': 'Limits and responsible play', 'menu.support': 'Support', 'menu.rules': 'Rules',
    'stub.ref': 'Referral program: link and percentages are set by the operator', 'stub.limits': 'Bet limits and self-exclusion live in the operator panel', 'stub.support': 'Support: the operator chat in Telegram', 'stub.rules': 'Operator rules and terms',
    'fair.h': 'Provably fair', 'fair.p': 'Each result comes from three numbers: the server seed (you see its hash in advance), your client seed and the round number. The server cannot change the result after the bet.',
    'fair.hash': 'Server seed hash', 'fair.client': 'Client seed', 'fair.nonce': 'Rounds played with this pair', 'fair.rotate': 'Rotate seed and reveal the old one', 'fair.revealed': 'Revealed server seed',
    'fair.hashS': 'Hash', 'fair.clientS': 'Client seed', 'fair.roundsS': 'Rounds',
    'fair.how': 'Check: HMAC-SHA256(serverSeed, "clientSeed:nonce:0"), first 4 bytes ÷ 2³² → a number from 0 to 1. Dice: ⌊number × 10000⌋ ÷ 100. Crash and Limbo: 0.99 ÷ (1 − number).',
    'close': 'Close', 'continue': 'Continue', 'sheet.amount': 'Amount, USDT', 'sheet.addr': 'Wallet address', 'sheet.addrPh': 'TON or TRC-20',
    'sheet.depDemo': 'Demo: real payments are not connected, we will add 1000 USDT of virtual balance.',
    'sheet.dep': 'We will create a Crypto Pay invoice in the chosen coin. Credited after payment, usually within seconds.',
    'sheet.wdDemo': 'Demo: money is virtual, withdrawals are not executed. In production this is a Crypto Pay transfer to your wallet.',
    'sheet.wd': 'Crypto Pay transfer to your wallet. Large amounts are approved by the operator.',
    'sheet.okDemo': 'Add demo balance', 'sheet.okDep': 'Create invoice', 'sheet.okWd': 'Send',
    'toast.topup': 'Demo balance added', 'toast.dep2': 'Crypto Pay invoices arrive in stage 2', 'toast.wd2': 'Crypto Pay withdrawals arrive in stage 2',
    'toast.theme': 'Theme', 'toast.lang': 'Language: English', 'toast.seed': 'Seed rotated, the old one revealed',
    'toast.minesWin': 'Cashed out', 'toast.minesLose': 'Mine. Bet lost', 'toast.win': 'Win', 'toast.dropped': 'Landed on',
    'kind.bet': 'Bet', 'kind.win': 'Win', 'kind.bonus': 'Bonus', 'kind.deposit': 'Deposit', 'kind.withdraw': 'Withdrawal', 'ledger.rest': 'balance',
    'recent.bet': 'bet',
    'game.crash.desc': 'Cash out before the crash', 'game.plinko.desc': 'Ball and buckets up to ×1000', 'game.mines.desc': '5×5, avoid the mines', 'game.dice.desc': 'Roll under the target', 'game.limbo.desc': 'Name your multiplier', 'game.wheel.desc': '12 segments, up to ×4.8', 'game.coinflip.desc': 'Heads or tails',
    'tag.hit': 'Hit', 'tag.new': 'New', 'tag.top': 'Top',
    'theme.lucky': 'Lucky', 'theme.candy': 'Candy', 'theme.terminal': 'Terminal', 'theme.scene': 'Stage', 'theme.felt': 'Felt', 'theme.fintech': 'Fintech',
  },
};

let current = 'ru';
export const lang = () => current;
export const t = (key) => (DICT[current] && DICT[current][key]) || DICT.ru[key] || key;

export function setLang(l) {
  current = LANGS.includes(l) ? l : 'ru';
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  return current;
}

export function detectLang() {
  try {
    const saved = localStorage.getItem('lang');
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* приватный режим */ }
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe;
  const code = (tg && tg.user && tg.user.language_code) || navigator.language || 'ru';
  return code.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}
