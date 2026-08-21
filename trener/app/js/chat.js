'use strict';

/* Чат с ассистентом внутри приложения.
   Сообщение уходит в очередь воркера, бот на компьютере её разбирает и отвечает
   туда же. Поэтому переписка одинаково видна и здесь, и в самом Telegram.

   Умышленно минимум: текст, несколько фото с общей подписью, голосовое. */

const Chat = {
  log: [],
  pics: [],          // прикреплённые снимки, ждут отправки
  rec: null,         // MediaRecorder, пока идёт запись
  chunks: [],
  since: 0,          // время последнего полученного сообщения
  timer: null,

  el(id) { return document.getElementById(id); },

  async open() {
    if (!this.log.length) {
      this.log = (await Store.get('chat')) || [];
      this.paint();
    }
    this.pull();
    /* пока экран открыт — проверяем ответы раз в три секунды, потом гасим */
    clearInterval(this.timer);
    this.timer = setInterval(() => this.pull(), 3000);
  },

  close() { clearInterval(this.timer); this.timer = null; },

  /* ---------- отрисовка ---------- */

  paint() {
    const box = this.el('chat-log');
    box.innerHTML = '';

    if (!this.log.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Напиши, что съел или что нужно сделать. Можно голосом или фото.';
      box.appendChild(empty);
      return;
    }

    this.log.slice(-60).forEach(m => box.appendChild(this.bubble(m)));
    box.scrollTop = box.scrollHeight;
  },

  bubble(m) {
    const el = document.createElement('div');
    el.className = 'msg ' + (m.from === 'me' ? 'me' : 'bot') + (m.voice ? ' voice' : '');

    if (m.pics && m.pics.length) {
      const g = document.createElement('div');
      g.className = 'msg-pics' + (m.pics.length === 1 ? ' one' : '');
      m.pics.forEach(src => {
        const i = document.createElement('img');
        i.src = src;
        i.loading = 'lazy';
        g.appendChild(i);
      });
      el.appendChild(g);
    }

    if (m.voice) {
      const a = document.createElement('audio');
      a.controls = true;
      a.src = m.voice;
      el.appendChild(a);
    }

    if (m.text) {
      const t = document.createElement('span');
      t.textContent = m.text;
      el.appendChild(t);
    }

    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = m.t || '';
    el.appendChild(time);
    return el;
  },

  add(m) {
    this.log.push(m);
    Store.set('chat', this.log.slice(-120));
    this.paint();
  },

  typing(on) {
    const box = this.el('chat-log');
    const old = box.querySelector('.typing');
    if (old) old.remove();
    if (!on) return;
    const t = document.createElement('div');
    t.className = 'msg bot typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  },

  /* ---------- отправка ---------- */

  async send() {
    const ta = this.el('chat-text');
    const text = ta.value.trim();
    if (!text && !this.pics.length) return;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const msg = {
      from: 'me', text,
      pics: this.pics.map(p => p.small),
      t: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
    this.add(msg);

    const payload = { text, photos: this.pics.map(p => p.full) };
    ta.value = '';
    ta.style.height = 'auto';
    this.pics = [];
    this.paintAttach();
    this.ready();
    haptic('light');

    this.typing(true);
    const ok = await this.post(payload);
    if (!ok) {
      this.typing(false);
      this.add({ from: 'bot', text: 'Не отправилось — нет связи. Попробуй ещё раз.', t: msg.t });
    }
  },

  async post(payload) {
    if (!Sync.ready()) return false;
    try {
      const r = await fetch(`${WORKER}/chat`, {
        method: 'POST', headers: Sync.head(), body: JSON.stringify(payload),
      });
      return (await r.json()).ok === true;
    } catch (e) {
      return false;
    }
  },

  /* ---------- ответы ---------- */

  async pull() {
    if (!Sync.ready()) return;
    try {
      const r = await fetch(`${WORKER}/chat?since=${this.since}`, { headers: Sync.head() });
      const res = await r.json();
      if (!res.ok || !res.messages || !res.messages.length) return;
      this.typing(false);
      res.messages.forEach(m => {
        this.since = Math.max(this.since, m.ts || 0);
        this.add({ from: 'bot', text: m.text, t: m.time || '' });
      });
      haptic('light');
    } catch (e) { /* нет сети — ответы подтянутся позже */ }
  },

  /* ---------- фото ---------- */

  async addPics(files) {
    for (const f of files) {
      if (this.pics.length >= 6) break;
      const full = await shrinkTo(f, 1400, .82);
      const small = await shrinkTo(f, 260, .7);
      this.pics.push({ full, small });
    }
    this.paintAttach();
    this.ready();
    this.el('chat-text').focus();
  },

  paintAttach() {
    const box = this.el('chat-attach');
    box.innerHTML = '';
    box.classList.toggle('hidden', !this.pics.length);
    this.pics.forEach((p, i) => {
      const f = document.createElement('figure');
      f.innerHTML = '<img alt=""><button aria-label="Убрать">×</button>';
      f.querySelector('img').src = p.small;
      f.querySelector('button').addEventListener('click', () => {
        this.pics.splice(i, 1);
        this.paintAttach();
        this.ready();
      });
      box.appendChild(f);
    });
  },

  /* ---------- голос ---------- */

  async mic() {
    if (this.rec) return this.stopRec(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.rec = new MediaRecorder(stream);
      this.rec.ondataavailable = e => this.chunks.push(e.data);
      this.rec.onstop = () => stream.getTracks().forEach(t => t.stop());
      this.rec.start();
      this.el('chat-mic').classList.add('rec');
      haptic('medium');
    } catch (e) {
      toast('Микрофон недоступен');
    }
  },

  async stopRec(send) {
    if (!this.rec) return;
    const rec = this.rec;
    this.rec = null;
    this.el('chat-mic').classList.remove('rec');

    const done = new Promise(res => { rec.addEventListener('stop', res, { once: true }); });
    rec.stop();
    await done;
    if (!send) return;

    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const b64 = await blobToData(blob);
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    this.add({ from: 'me', voice: b64, t: `${pad(now.getHours())}:${pad(now.getMinutes())}` });
    this.typing(true);
    const ok = await this.post({ voice: b64 });
    if (!ok) { this.typing(false); toast('Голосовое не ушло'); }
  },

  /* кнопка отправки показывается, только когда есть текст или фото */
  ready() {
    const has = this.el('chat-text').value.trim() || this.pics.length;
    document.querySelector('.chat-row').classList.toggle('ready', !!has);
  },

  bind() {
    const ta = this.el('chat-text');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 132) + 'px';
      this.ready();
    });
    this.el('chat-send').addEventListener('click', () => this.send());
    this.el('chat-mic').addEventListener('click', () => this.mic());
    this.el('chat-photo').addEventListener('click', () => this.el('chat-files').click());
    this.el('chat-files').addEventListener('change', e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (files.length) this.addPics(files);
    });
  },
};

/* Сжимаем перед отправкой: снимок с телефона — это мегабайты, а нам нужен смысл. */
function shrinkTo(file, max, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function blobToData(blob) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
}
