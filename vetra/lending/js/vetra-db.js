/* ================================================================
   Ветра — связь страниц с базой (Supabase).

   Подключать после vendor/supabase.js и vetra-config.js:
     <script src="js/vendor/supabase.js"></script>
     <script src="js/vetra-config.js"></script>
     <script src="js/vetra-db.js"></script>

   Наружу отдаёт один объект — window.Vetra.
   ================================================================ */
(function () {
  'use strict';

  var cfg = window.VETRA_CONFIG || {};
  var configured = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.SUPABASE_URL || '') &&
                   (cfg.SUPABASE_ANON_KEY || '').length > 40;

  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  /* Понятные фразы вместо английских ошибок Supabase */
  var PHRASES = [
    [/user already registered|already been registered/i, 'На эту почту аккаунт уже заведён. Перейдите на вкладку «Вход».'],
    [/signups not allowed|user not found|signup.*disabled/i, 'Аккаунта с такой почтой нет. Заведите его на вкладке «Регистрация».'],
    [/invalid.*(token|otp)|expired/i,                       'Код неверный или уже устарел. Запросите новый.'],
    [/email rate limit|over_email_send_rate/i,              'Слишком много писем подряд. Подождите минуту и попробуйте снова.'],
    [/rate limit|too many requests/i,                       'Слишком много попыток. Подождите минуту.'],
    [/invalid.*email/i,                                     'Проверьте адрес почты.'],
    [/failed to fetch|networkerror|load failed/i,           'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.']
  ];

  function human(err) {
    var text = (err && (err.message || err.error_description || err.error)) || '';
    for (var i = 0; i < PHRASES.length; i++) {
      if (PHRASES[i][0].test(text)) return PHRASES[i][1];
    }
    return text ? ('Не получилось: ' + text) : 'Что-то пошло не так. Попробуйте ещё раз.';
  }

  function noConfig() {
    return Promise.resolve({
      ok: false,
      message: 'База пока не подключена: в js/vetra-config.js не вписаны ключи Supabase.'
    });
  }

  function done(error) {
    return error ? { ok: false, message: human(error) } : { ok: true };
  }

  var Vetra = {

    /* Подключена ли база */
    ready: function () { return !!client; },

    /* Прямой доступ к клиенту, если понадобится нестандартный запрос */
    client: function () { return client; },

    /* ---------- Заявки ------------------------------------------
       data: { name, company, email, phone, plan, pay, comment, source }
       Пишет строку в таблицу leads. Читать заявки может только владелец
       проекта через панель Supabase — анониму чтение закрыто. */
    saveLead: function (data) {
      if (!client) return noConfig();
      var row = {
        name:    (data.name    || '').trim() || null,
        company: (data.company || '').trim() || null,
        email:   (data.email   || '').trim().toLowerCase() || null,
        phone:   (data.phone   || '').trim() || null,
        plan:    data.plan    || null,
        pay:     data.pay     || null,
        comment: (data.comment || '').trim() || null,
        source:  data.source  || 'lending',
        page:    location.pathname.split('/').pop() || 'index.html'
      };
      return client.from('leads').insert(row).then(function (res) { return done(res.error); });
    },

    /* ---------- Регистрация -------------------------------------
       Пароля нет: заводим пользователя и шлём код из шести цифр.
       Имя и компания уезжают в метаданные, оттуда триггер базы
       раскладывает их в таблицу profiles. */
    signUp: function (form) {
      if (!client) return noConfig();
      return client.auth.signInWithOtp({
        email: (form.email || '').trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: {
            name:    (form.name    || '').trim(),
            company: (form.company || '').trim()
          }
        }
      }).then(function (res) { return done(res.error); });
    },

    /* ---------- Вход --------------------------------------------
       Новых пользователей не создаёт: если почты нет в базе,
       вернётся понятная подсказка зарегистрироваться. */
    signIn: function (email) {
      if (!client) return noConfig();
      return client.auth.signInWithOtp({
        email: (email || '').trim().toLowerCase(),
        options: { shouldCreateUser: false }
      }).then(function (res) { return done(res.error); });
    },

    /* ---------- Проверка кода из письма -------------------------- */
    verify: function (email, code) {
      if (!client) return noConfig();
      return client.auth.verifyOtp({
        email: (email || '').trim().toLowerCase(),
        token: (code || '').replace(/\D/g, ''),
        type:  'email'
      }).then(function (res) { return done(res.error); });
    },

    /* ---------- Кто сейчас вошёл --------------------------------
       Отдаёт { id, email, name, company } или null. */
    me: function () {
      if (!client) return Promise.resolve(null);
      return client.auth.getUser().then(function (res) {
        var user = res.data && res.data.user;
        if (!user) return null;
        return client.from('profiles').select('name, company').eq('id', user.id).maybeSingle()
          .then(function (p) {
            var row = p.data || {};
            var meta = user.user_metadata || {};
            return {
              id:      user.id,
              email:   user.email,
              name:    row.name    || meta.name    || '',
              company: row.company || meta.company || ''
            };
          });
      }).catch(function () { return null; });
    },

    /* ---------- Выход -------------------------------------------- */
    signOut: function () {
      if (!client) return Promise.resolve();
      return client.auth.signOut();
    },

    /* ---------- Охрана личного кабинета --------------------------
       Ставится на страницы, куда пускаем только своих:
         Vetra.requireAuth().then(function (user) { ... });
       Гостя уводит на login.html. */
    requireAuth: function () {
      return Vetra.me().then(function (user) {
        if (!user) { location.replace('login.html'); return null; }
        return user;
      });
    }
  };

  window.Vetra = Vetra;
})();
