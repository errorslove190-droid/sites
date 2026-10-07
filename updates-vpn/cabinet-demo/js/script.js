(() => {
  "use strict";
  const C = window.CABINET, T = C.texts, tg = window.Telegram?.WebApp;
  const main = document.querySelector("#content"), dialog = document.querySelector("#dialog");
  let account, screen = "home", busy = false, toastTimer;
  let kind = "ios", connection, purchase = {gift:false}, result, giftToken;
  const routes = ["home","payment","friends","profile","connect","instructions","device-help","manual","help","buy","period","checkout","success","promo","topup","gift"];
  const requestId = () => crypto.randomUUID().replaceAll("-", "");
  const navigate = route => { if(location.hash === "#" + route) { screen=route; render(); } else location.hash=route; };
  const back = route => '<a class="flow-back" href="#' + route + '">' + esc(T.back) + '</a>';
  const stack = content => '<div class="flow-actions">' + content + '</div>';
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
  const supportLink = (label, route, style="") => '<a class="button ' + style + '" href="https://t.me/' + encodeURIComponent(C.botUsername) + '?start=' + route + '" data-bot>' + esc(label) + '</a>';
  const go = (label, route, style="") => '<a class="button ' + style + '" href="#' + route + '">' + esc(label) + '</a>';
  const section = (title, body) => '<section class="section"><h2>' + esc(title) + '</h2>' + body + '</section>';
  const empty = key => '<p class="empty">' + esc(T[key]) + '</p>';
  const row = (title, subtitle, value) => '<div class="row"><div class="grow"><div class="name">' + esc(title) + '</div><small>' + esc(subtitle) + '</small></div><div class="value">' + esc(value) + '</div></div>';

  document.title = T.title;
  document.querySelector('meta[name="description"]').content = T.description;
  document.querySelector('meta[property="og:title"]').content = T.title;
  document.querySelector('meta[property="og:description"]').content = T.description;
  document.querySelector(".brand").setAttribute("aria-label", T.brand);
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
    tg.BackButton?.onClick(() => { if(dialog.open) dialog.close(); else navigate(({instructions:"connect",manual:"instructions","device-help":"instructions",period:"buy",checkout:purchase.order?.topup?"topup":"period",promo:"buy",help:"profile"})[screen] || "home"); });
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
      const tab = ["buy","period","checkout","promo","topup"].includes(screen) ? "payment" : ["help","device-help"].includes(screen) ? "profile" : ["connect","instructions","manual","success","gift"].includes(screen) ? "home" : screen;
      if(a.dataset.tab === tab) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    nav.hidden = screen === "home" && account.onboarding;
    if (screen === "home") home();
    if (screen === "payment") payment();
    if (screen === "friends") friends();
    if (screen === "profile") profile();
    if (!["home","payment","friends","profile"].includes(screen)) flow();
    if (screen === "home") tg?.BackButton?.hide(); else tg?.BackButton?.show();
  }

  function home() {
    if(account.onboarding) {
      main.innerHTML = '<section class="welcome"><h1>' + esc(fmt("welcome",{days:C.trialDays})) +
        '</h1><p class="muted">' + esc(T.welcome_hint) + '</p>' + go(T.connect_first,"connect") + '</section>';
      return;
    }
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
      '</section>';
  }

  function payment() {
    main.innerHTML = '<h1>' + esc(T.payment) + '</h1><section class="overview"><p class="muted">' +
      esc(T.balance) + '</p><div class="money">' + esc(money(account.balance)) + '</div>' +
      go(T.topup,"topup") + '</section>' +
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

  function flow() {
    const title = text => '<h1>' + esc(text) + '</h1>';
    if(screen === "connect") {
      main.innerHTML = back("home") + title(T.choose_device) + stack(Object.entries(C.devices).map(([key,d]) =>
        btn(d.title,"choose-device","secondary",'data-kind="'+key+'"')).join(""));
    }
    if(screen === "instructions") {
      if(!connection) { navigate("connect"); return; }
      const d=C.devices[kind];
      const extra=d.pre_step ? '<li value="0">'+esc(d.pre_step.text)+'<a class="button secondary" href="'+esc(d.pre_step.url)+'" target="_blank" rel="noopener">'+esc(d.pre_step.button)+'</a></li>' : '';
      main.innerHTML = back("connect") + title(d.title) + '<ol class="steps">' + extra +
        '<li>'+esc(T.step_install)+'<a class="button secondary" href="'+esc(d.store)+'" target="_blank" rel="noopener">'+esc(T.install)+'</a></li>' +
        '<li>'+esc(T.step_add)+'<a class="button" data-import href="'+esc(connection.import_url)+'">'+esc(T.add)+'</a></li>' +
        '<li>'+esc(T.step_enable)+'</li></ol>' + (C.DEMO_MODE ? '<p class="muted">'+esc(T.connection_demo)+'</p>' : '') +
        stack(btn(T.works,"connected","secondary")+go(T.fail,"device-help","secondary")+go(T.manual,"manual","ghost"));
    }
    if(screen === "manual") {
      if(!connection) { navigate("connect"); return; }
      main.innerHTML=back("instructions")+title(T.manual)+'<p class="muted">'+esc(T.manual_hint)+'</p><div class="link-field">'+esc(connection.url)+'</div>'+btn(T.copy,"copy-manual","",'data-url="'+esc(connection.url)+'"');
    }
    if(screen === "device-help") main.innerHTML=back("instructions")+title(T.device_help_title)+'<p class="muted">'+esc(T.device_help)+'</p>'+stack(go(T.change_country,"profile","secondary")+supportLink(T.support,"support"));
    if(screen === "help") main.innerHTML=back("profile")+title(T.help_title)+Object.values(C.faq).map(([q,a])=>'<details class="faq"><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+stack(go(T.change_country,"profile","secondary")+supportLink(T.support,"support"));
    if(screen === "buy") {
      main.innerHTML=back("payment")+title(T.buy)+(purchase.gift?'<p class="muted">'+esc(T.gift_select)+'</p>':'')+
        Object.entries(C.plans).map(([key,p])=>'<section class="plan-option"><h2>'+esc(p.title)+'</h2><p class="price">'+esc(fmt("monthly",{amount:money(p.price)}))+'</p><p>'+esc(fmt(key+"_hint",{count:Object.keys(C.countries).length}))+'</p>'+btn(p.title+" · "+money(p.price),"choose-plan","secondary",'data-plan="'+key+'"')+'</section>').join('')+
        (account.promo_discount?'<p class="helper">'+esc(fmt("promo_ok",{discount:account.promo_discount}))+'</p>':'')+
        stack(go(T.promo,"promo","secondary")+btn(purchase.gift?T.cancel:T.gift_action,"gift-toggle","ghost"));
    }
    if(screen === "period") {
      if(!purchase.plan) { navigate("buy"); return; }
      main.innerHTML=back("buy")+title(T.period)+'<p class="muted">'+esc(C.plans[purchase.plan].title)+'</p>'+stack(Object.entries(C.prices[purchase.plan]).map(([months,amount])=>btn(fmt("period_price",{months,amount:money(Math.round(amount*(100-account.promo_discount)/100))}),"choose-period","secondary",'data-months="'+months+'"')).join(''));
    }
    if(screen === "checkout") {
      const o=purchase.order;
      if(!o) { navigate("buy"); return; }
      const debit=Math.min(account.balance,o.amount), remainder=o.amount-debit;
      main.innerHTML=back(o.topup?"topup":"period")+title(T.payment_method)+'<p>'+esc(o.topup?money(o.amount):fmt("checkout",{plan:C.plans[o.plan].title,months:o.months,amount:money(o.amount)}))+'</p>'+
        (C.DEMO_MODE?'<p class="muted">'+esc(T.pay_demo)+'</p>':'')+
        (purchase.mixed?'<p class="muted">'+esc(fmt("mixed_hint",{balance:money(debit),amount:money(remainder)}))+'</p>':'')+
        stack((!o.topup&&!purchase.mixed?btn(fmt(remainder?"mixed_pay":"balance_pay",{amount:money(remainder||o.amount)}),remainder?"mixed":"pay","",'data-method="balance"'):'')+
        Object.entries(C.methods).map(([method,label])=>btn(label,"pay","secondary",'data-method="'+method+'"')).join(''));
    }
    if(screen === "promo") main.innerHTML=back("buy")+title(T.promo)+'<form class="promo-form"><label for="promo-code">'+esc(T.promo_label)+'</label><input id="promo-code" maxlength="64" required autocomplete="off"><button class="button" type="submit">'+esc(T.apply)+'</button></form>';
    if(screen === "topup") main.innerHTML=back("payment")+title(T.choose_amount)+stack(C.topups.map(amount=>btn(money(amount),"choose-topup","secondary",'data-amount="'+amount+'"')).join(''));
    if(screen === "success") {
      if(!result) { navigate("home"); return; }
      main.innerHTML='<section class="success">'+title(result.gift_url?T.gift_ready:result.topup?T.topup_done:fmt("purchase_done",{date:date(account.expires_at)}))+
        (result.gift_url?'<p class="muted">'+esc(T.gift_hint)+'</p><div class="link-field">'+esc(result.gift_url)+'</div>'+btn(T.copy,"copy-manual","",'data-url="'+esc(result.gift_url)+'"'):'')+
        go(T.done,"home",result.gift_url?"secondary":"")+'</section>';
    }
    if(screen === "gift") main.innerHTML=back("home")+title(T.gift_received)+'<p class="muted">'+esc(T.gift_accept_hint)+'</p>'+btn(T.gift_accept,"redeem");
  }

  async function createOrder(values) {
    // Keep the request key after a transport failure; retry returns the same order.
    const fingerprint=JSON.stringify(values);
    if(purchase.fingerprint!==fingerprint) { purchase.requestId=requestId(); purchase.fingerprint=fingerprint; }
    purchase.order = C.DEMO_MODE ? {...values,id:purchase.requestId,amount:values.topup||Math.round(C.prices[values.plan][values.months]*(100-account.promo_discount)/100)} :
      await api("action",{action:"order",...values,request_id:purchase.requestId});
    purchase.mixed=false;
    navigate("checkout");
  }

  async function mutate(data) {
    if(C.DEMO_MODE) {
      if(data.action === "connect") {
        if(!account.active) throw new Error(C.errors.expired);
        if(!account.devices.some(d=>d.kind===data.kind)) {
          if(account.devices.length>=C.limit) throw new Error(C.errors.device_limit);
          account.devices.push({id:Math.max(0,...account.devices.map(d=>d.id))+1,kind:data.kind,name:C.devices[data.kind].title,added_at:new Date().toISOString()});
        }
        account.onboarding=false;
      }
      if(data.action === "promo") {
        const code=data.code.trim().toUpperCase(), discount=C.demoPromo[code];
        if(!discount) throw new Error(C.errors.promo_invalid);
        if(account.usedPromos?.includes(code)) throw new Error(C.errors.promo_used);
        account.promo_code=code; account.promo_discount=discount;
      }
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
    const importLink=event.target.closest("[data-import]");
    if(importLink && C.DEMO_MODE) { event.preventDefault(); toast(T.import_demo); return; }
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
      if(action === "choose-device") {
        const selected=target.dataset.kind;
        if(!account.active) throw new Error(C.errors.expired);
        if(account.devices.length>=C.limit && !account.devices.some(d=>d.kind===selected)) throw new Error(C.errors.device_limit);
        connection=C.DEMO_MODE?{url:C.demoSubUrl,import_url:C.happImportPrefix+C.demoSubUrl}:await api("action",{action:"connection",kind:selected});
        kind=selected; navigate("instructions");
      }
      if(action === "connected") { await mutate({action:"connect",kind}); navigate("home"); toast(T.connected); }
      if(action === "choose-plan") { purchase={gift:purchase.gift,plan:target.dataset.plan}; navigate("period"); }
      if(action === "gift-toggle") { purchase={gift:!purchase.gift}; render(); }
      if(action === "choose-period") await createOrder({plan:purchase.plan,months:Number(target.dataset.months),gift:purchase.gift});
      if(action === "choose-topup") await createOrder({plan:account.plan,months:1,gift:false,topup:Number(target.dataset.amount)});
      if(action === "mixed") { purchase.mixed=true; render(); }
      if(action === "pay") {
        const o=purchase.order, method=purchase.mixed?"mixed":target.dataset.method;
        if(C.DEMO_MODE) {
          if(!o.paid) {
            const debit=method==="balance"?o.amount:method==="mixed"?Math.min(account.balance,o.amount):0;
            if(debit>account.balance) throw new Error(C.errors.balance_low);
            account.balance-=debit;
            if(o.topup) account.balance+=o.amount;
            else if(!o.gift) {
              account.expires_at=new Date(Math.max(Date.parse(account.expires_at),Date.now())+C.monthDays*o.months*86400000).toISOString();
              account.active=true; account.plan=o.plan; account.onboarding=false;
            }
            if(!o.topup && account.promo_code) { (account.usedPromos ||= []).push(account.promo_code); account.promo_code=null; account.promo_discount=0; }
            account.payments.unshift({...o,date:new Date().toISOString()}); o.paid=true;
          }
          result={topup:o.topup,gift_url:o.gift?'https://t.me/'+C.botUsername+'?startapp=gift_demo':null};
        } else {
          result=await api("action",{action:"pay",order_id:o.id,method});
          account=result.account; result.topup=o.topup;
        }
        purchase={gift:false}; navigate("success");
      }
      if(action === "redeem") {
        if(C.DEMO_MODE) {
          if(giftToken!=="demo") throw new Error(C.errors.gift_invalid);
          if(!account.demoGiftUsed) {
            account.expires_at=new Date(Math.max(Date.parse(account.expires_at),Date.now())+C.monthDays*86400000).toISOString();
            account.demoGiftUsed=true; account.active=true; account.onboarding=false;
          }
        } else account=await api("action",{action:"redeem",token:giftToken});
        result={}; navigate("success");
      }
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
      if(action === "bonus") { await mutate({action:"bonus",channel:target.dataset.channel}); toast(T.bonus_received); }
    } catch(error) { toast(error.message || C.errors.network); }
    finally { busy = false; target.disabled = false; }
  });

  document.addEventListener("submit",async event=>{
    if(!event.target.matches(".promo-form")) return;
    event.preventDefault();
    if(busy) return;
    busy=true;
    const button=event.target.querySelector("button"); button.disabled=true;
    try { await mutate({action:"promo",code:document.querySelector("#promo-code").value}); purchase.order=null; purchase.fingerprint=null; navigate("buy"); toast(fmt("promo_ok",{discount:account.promo_discount})); }
    catch(error) { toast(error.message||C.errors.network); }
    finally { busy=false; button.disabled=false; }
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
    screen = routes.includes(next) ? next : "home";
    if(dialog.open) dialog.close();
    render();
    window.scrollTo(0,0);
    main.focus({preventScroll:true});
  });

  async function load() {
    main.innerHTML = '<p class="empty">' + esc(T.loading) + '</p>';
    try {
      account = C.DEMO_MODE ? structuredClone(C.demo) : await api("account");
      if(C.DEMO_MODE && new URLSearchParams(location.search).get("new")==="1") Object.assign(account,{onboarding:true,balance:0,devices:[],payments:[],earnings:[],invited:0,earned:0,expires_at:new Date(Date.now()+C.trialDays*86400000).toISOString()});
      const start=tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get("tgWebAppStartParam") || "";
      const next = start.startsWith("gift_") ? "gift" : routes.includes(start) ? start : location.hash.slice(1);
      if(start.startsWith("gift_")) giftToken=start.slice(5);
      history.replaceState(null,"","#"+(routes.includes(next)?next:"home"));
      screen = routes.includes(next) ? next : "home";
      render();
    } catch(error) {
      main.innerHTML = '<div class="error"><h1>' + esc(T.error) + '</h1><p class="muted">' +
        esc(error.message || T.auth) + '</p>' + btn(T.retry,"retry") + '</div>';
    }
  }
  load();
})();
