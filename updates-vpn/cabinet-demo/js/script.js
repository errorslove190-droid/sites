(() => {
  "use strict";
  const C = window.CABINET, T = C.texts, tg = window.Telegram?.WebApp;
  const main = document.querySelector("#content"), dialog = document.querySelector("#dialog");
  let account, screen = "home", busy = false, toastTimer;
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
    payment: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',
    friends: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
    computer: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8M12 17v5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>'
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const fmt = (key, values={}) => T[key].replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
  const icon = name => '<svg class="icon ' + (name === "chevron" ? "chevron" : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
  const date = value => new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"long"}).format(new Date(value));
  const money = n => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(n);
  const btn = (label, action, style="", extra="") => '<button type="button" class="button ' + style + '" data-action="' + action + '" ' + extra + '>' + esc(label) + '</button>';
  const go = (label, route, style="") => '<a class="button ' + style + '" href="https://t.me/' + encodeURIComponent(C.botUsername) + '?start=' + route + '" data-bot>' + esc(label) + '</a>';
  const section = (title, body) => '<section class="section"><h2>' + esc(title) + '</h2>' + body + '</section>';
  const empty = key => '<p class="empty">' + esc(T[key]) + '</p>';
  const row = (title, subtitle, value) => '<div class="row"><div class="grow"><div class="name">' + esc(title) + '</div><small>' + esc(subtitle) + '</small></div><div class="value">' + esc(value) + '</div></div>';

  document.title = T.title;
  document.querySelector('meta[name="description"]').content = T.description;
  document.querySelector('meta[property="og:title"]').content = T.title;
  document.querySelector('meta[property="og:description"]').content = T.description;
  document.querySelector(".brand").textContent = T.brand;
  document.querySelector("#mode").textContent = C.DEMO_MODE ? T.demo : T.app;
  const nav = document.querySelector("#navigation");
  nav.setAttribute("aria-label", T.nav);
  nav.innerHTML = ["home","payment","friends","profile"].map(key =>
    '<a class="tab" href="#' + key + '" data-tab="' + key + '">' + icon(key) + '<span>' + esc(T[key]) + '</span></a>').join("");

  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#000000");
    tg.setBackgroundColor?.("#000000");
    tg.BackButton?.onClick(() => { if(dialog.open) dialog.close(); else location.hash = "home"; });
  }

  function toast(message) {
    const box = document.querySelector("#toast");
    box.textContent = message;
    box.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("visible"), 3500);
  }

  function modal(title, content) {
    document.querySelector("#dialog-body").innerHTML = '<h2>' + esc(title) + '</h2>' + content +
      btn(T.close, "close", "ghost");
    dialog.showModal();
  }

  async function api(path, payload) {
    const response = await fetch("./api/" + path, {
      method: payload ? "POST" : "GET",
      headers: {Authorization: "tma " + (tg?.initData || ""), "Content-Type":"application/json"},
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || C.errors.network);
    return data;
  }

  function render() {
    if (!account) return;
    main.dataset.screen = screen;
    nav.querySelectorAll("[data-tab]").forEach(a => {
      if(a.dataset.tab === screen) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    if (screen === "home") home();
    if (screen === "payment") payment();
    if (screen === "friends") friends();
    if (screen === "profile") profile();
    if (screen === "home") tg?.BackButton?.hide(); else tg?.BackButton?.show();
  }

  function home() {
    main.innerHTML = '<h1>' + esc(T.app) + '</h1><section class="overview">' +
      '<div class="status">' + esc(account.active ? T.active : T.expired) + '</div>' +
      '<h2>' + esc(C.plans[account.plan].title) + '</h2><p class="date">' +
      esc(fmt("until",{date:date(account.expires_at)})) + '</p>' + go(T.renew,"buy") + '</section>' +
      '<section class="section"><div class="section-head"><h2>' + esc(T.devices) + '</h2><small>' +
      esc(fmt("device_count",{count:account.devices.length,limit:C.limit})) + '</small></div>' +
      (account.devices.length ? account.devices.map(d =>
        '<button class="row device-row" data-action="device" data-id="' + d.id + '">' +
        icon(["windows","mac","tv"].includes(d.kind) ? "computer" : "phone") +
        '<span class="grow"><span class="name">' + esc(d.name) + '</span><small>' +
        esc(fmt("added",{date:date(d.added_at)})) + '</small></span>' + icon("chevron") + '</button>'
      ).join("") : empty("device_empty")) + go(T.connect,"connect","secondary") +
      '<p class="helper">' + esc(T.in_bot) + '</p></section>';
  }

  function payment() {
    main.innerHTML = '<h1>' + esc(T.payment) + '</h1><section class="overview"><p class="muted">' +
      esc(T.balance) + '</p><div class="money">' + esc(money(account.balance)) + '</div>' +
      (C.DEMO_MODE ? btn(T.topup,"topup") : go(T.topup,"topup")) + '</section>' +
      '<div class="row"><label class="grow" for="auto"><span class="name">' + esc(T.auto_renew) +
      '</span><small>' + esc(T.auto_hint) + '</small></label><input id="auto" class="switch" type="checkbox" role="switch" ' +
      (account.auto_renew ? "checked" : "") + '></div>' +
      section(T.history, account.payments.length ? account.payments.map(p => row(
        p.topup ? T.topup_entry : (p.gift ? T.gift + " · " : "") + C.plans[p.plan].title,
        date(p.date), money(p.amount))).join("") : empty("payment_empty")) +
      '<div class="section">' + go(T.renew,"buy","secondary") + '</div>';
  }

  function friends() {
    main.innerHTML = '<h1>' + esc(T.friends) + '</h1><p class="muted">' +
      esc(fmt("ref_hint",{bonus:C.refBonus,first:C.refFirst,next:C.refNext})) + '</p>' +
      '<div class="stats"><div><strong>' + esc(account.invited) + '</strong><small>' + esc(T.invited) +
      '</small></div><div><strong>' + esc(money(account.earned)) + '</strong><small>' + esc(T.earned) +
      '</small></div></div>' +
      section(T.ref_link, '<div class="link-field">' + esc(account.ref_url) + '</div><div class="actions">' +
        btn(T.copy,"copy-ref") + btn(T.share,"share","secondary") + '</div>') +
      section(T.earnings, account.earnings.length ? account.earnings.map(e => row(
        e.reason === "join" ? T.ref_join : T.ref_paid, date(e.date), "+" + money(e.amount))).join("") : empty("earnings_empty"));
  }

  function profile() {
    main.innerHTML = '<h1>' + esc(T.profile) + '</h1><label for="country">' + esc(T.country) + '</label>' +
      '<select id="country">' + Object.entries(C.countries).map(([key,label]) =>
        '<option value="' + key + '" ' + (key === account.country ? "selected" : "") + '>' + esc(label) + '</option>').join("") +
      '</select>' + row(T.language, "", T.russian) +
      section(T.bonuses, '<p class="muted">' + esc(fmt("bonus_hint",{amount:C.channelBonus})) + '</p>' +
        (C.channels.length ? C.channels.map(channel => '<div class="bonus-row"><div class="name">' +
          (C.DEMO_MODE ? esc(T.demo_channel) : '<a href="https://t.me/' + encodeURIComponent(channel.replace("@","")) + '">' + esc(channel) + '</a>') +
          '</div>' + btn(T.check,"bonus","secondary",'data-channel="' + esc(channel) + '"') + '</div>').join("") : empty("bonus_empty"))) +
      '<div class="section">' + go(T.help,"help","secondary") + '</div>';
  }

  async function mutate(data) {
    if(C.DEMO_MODE) {
      if(data.action === "disconnect") account.devices = account.devices.filter(d => d.id !== data.device_id);
      if(data.action === "auto_renew") account.auto_renew = data.enabled;
      if(data.action === "country") account.country = data.country;
      if(data.action === "bonus") {
        account.claimed ||= [];
        if(!account.claimed.includes(data.channel)) { account.balance += C.channelBonus; account.claimed.push(data.channel); }
      }
    } else account = await api("action",data);
    render();
  }

  async function copy(value) {
    try { await navigator.clipboard.writeText(value); toast(T.copied); }
    catch { modal(T.copy, '<div class="link-field">' + esc(value) + '</div>'); }
  }

  document.addEventListener("click", async event => {
    const botLink = event.target.closest("[data-bot]");
    if(botLink && tg?.initData) {
      event.preventDefault();
      tg.openTelegramLink(botLink.href);
      tg.close();
      return;
    }
    const target = event.target.closest("[data-action]");
    if(!target || busy) return;
    const action = target.dataset.action, id = Number(target.dataset.id);
    busy = true;
    target.disabled = true;
    try {
      if(action === "close") dialog.close();
      if(action === "retry") await load();
      if(action === "device") {
        const device = account.devices.find(d => d.id === id);
        modal(device.name, '<p class="muted">' + esc(fmt("added",{date:date(device.added_at)})) + '</p>' +
          btn(T.manual,"manual","secondary",'data-id="' + id + '"') +
          btn(T.disconnect,"disconnect-confirm","secondary",'data-id="' + id + '"'));
      }
      if(action === "manual") {
        const result = C.DEMO_MODE ? {url:C.demoSubUrl} : await api("action",{action:"manual",device_id:id});
        document.querySelector("#dialog-body").innerHTML = '<h2>' + esc(T.manual) + '</h2><p>' +
          esc(T.manual_hint) + '</p><div class="link-field">' + esc(result.url) + '</div>' +
          btn(T.copy,"copy-manual","",'data-url="' + esc(result.url) + '"') + btn(T.close,"close","ghost");
      }
      if(action === "copy-manual") await copy(target.dataset.url);
      if(action === "disconnect-confirm") {
        document.querySelector("#dialog-body").innerHTML = '<h2>' + esc(T.disconnect_confirm) + '</h2>' +
          btn(T.disconnect,"disconnect","",'data-id="' + id + '"') + btn(T.cancel,"close","ghost");
      }
      if(action === "disconnect") { await mutate({action:"disconnect",device_id:id}); dialog.close(); toast(T.saved); }
      if(action === "copy-ref") await copy(account.ref_url);
      if(action === "share") {
        const url = "https://t.me/share/url?url=" + encodeURIComponent(account.ref_url) + "&text=" + encodeURIComponent(T.share_text);
        if(tg?.initData) tg.openTelegramLink(url); else window.open(url,"_blank","noopener,noreferrer");
      }
      if(action === "topup") modal(T.choose_amount, '<p class="muted">' + esc(T.topup_demo) + '</p>' +
        C.topups.map(amount => btn(money(amount),"topup-confirm","secondary",'data-amount="' + amount + '"')).join(""));
      if(action === "topup-confirm" && C.DEMO_MODE) {
        const amount = Number(target.dataset.amount);
        if(C.topups.includes(amount)) {
          account.balance += amount;
          account.payments.unshift({amount,plan:account.plan,topup:true,date:new Date().toISOString()});
          dialog.close(); render(); toast(T.saved);
        }
      }
      if(action === "bonus") { await mutate({action:"bonus",channel:target.dataset.channel}); toast(T.bonus_received); }
    } catch(error) { toast(error.message || C.errors.network); }
    finally { busy = false; target.disabled = false; }
  });

  document.addEventListener("change", async event => {
    if(busy) { render(); return; }
    if(!["auto","country"].includes(event.target.id)) return;
    busy = true;
    event.target.disabled = true;
    try {
      await mutate(event.target.id === "auto" ? {action:"auto_renew",enabled:event.target.checked} :
        {action:"country",country:event.target.value});
      toast(T.saved);
    } catch(error) { render(); toast(error.message || C.errors.network); }
    finally { busy = false; }
  });

  window.addEventListener("hashchange", () => {
    const next = location.hash.slice(1);
    screen = ["home","payment","friends","profile"].includes(next) ? next : "home";
    if(dialog.open) dialog.close();
    render();
    window.scrollTo(0,0);
    main.focus({preventScroll:true});
  });

  async function load() {
    main.innerHTML = '<p class="empty">' + esc(T.loading) + '</p>';
    try {
      account = C.DEMO_MODE ? structuredClone(C.demo) : await api("account");
      const next = location.hash.slice(1);
      screen = ["home","payment","friends","profile"].includes(next) ? next : "home";
      render();
    } catch(error) {
      main.innerHTML = '<div class="error"><h1>' + esc(T.error) + '</h1><p class="muted">' +
        esc(error.message || T.auth) + '</p>' + btn(T.retry,"retry") + '</div>';
    }
  }
  load();
})();
