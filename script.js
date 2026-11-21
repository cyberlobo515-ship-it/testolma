(function () {
  'use strict';

  // ===== CONFIG =====
  const LIMITS = { standard: 25, pro: 150, ultra: 999999 };
  const IMG_LIMITS = { standard: 8, pro: 20, ultra: 80 };
  const today = () => new Date().toISOString().slice(0, 10);

  const PLANS = {
    standard: { name: 'Standart', price: 0, displayPrice: '0' },
    pro:      { name: 'Pro',      price: 20000, displayPrice: '20,000' },
    ultra:    { name: 'Ultra',    price: 45000, displayPrice: '45,000' }
  };

  const STORAGE_KEY = 'olmabek_user';
  const CHATS_KEY   = 'olmabek_chats';
  const THEME_KEY   = 'olmabek_theme';
  const ADMIN_KEY   = 'olmabek_admin';
  const MAX_CHATS   = 50;
  const API_BASE    = 'https://olmabekaiweb.onrender.com';

  // ⚠️ ADMIN KIRISHI (agar xohlasangiz, keyinchalik backendga ko'chirishingiz mumkin)
  const ADMIN_USER = 'cyberlobo515';
  const ADMIN_PASS = 'Samsung18_';
  const ADMIN_PLAN_KEY = 'olmabek_admin_plan', AI_OFF_KEY = 'olmabek_ai_off', LOG_KEY = 'olmabek_reqlog';

  const MODE_CONFIG = {
    chat: {
      placeholder: 'Xabar yozing...',
      note: "OLMABEK AI xatolik qilishi mumkin. Muhim ma'lumotlarni tekshiring."
    },
    image: {
      placeholder: 'Rasm uchun matn yozing (masalan: qora BMW M8 tungi shaharda)',
      note: 'Rasm generatsiyasi 5-30 soniya vaqt oladi. Matnni aniq yozing.'
    },
    codex: {
      placeholder: "Nima yaratamiz? Masalan: kiyim do'koni uchun landing sahifa",
      note: "Olmabek Codex Gemini bilan ishlaydi. Yaratilgan kodni ishlatishdan oldin tekshiring."
    }
  };

  // ===== HERO GREETINGS =====
  const HERO_GREETINGS = [
    { title: 'Doim tayyorman', sub: "Kod, tahlil, g'oya yoki matn — savolingizni yozing, birga hal qilamiz." },
    { title: 'Nima qiziqtiradi?', sub: "Qiziq mavzuni tanlang, men tushuntirib, tahlil qilib beraman." },
    { title: 'Bugun nima qilamiz?', sub: "Kun rejangizni ayting — kod, matn yoki g'oya bilan yordam beraman." },
    { title: 'Yangi loyihani boshlaymizmi?', sub: "G'oyangizni yozing, birga rejalashtirib, amalga oshiramiz." },
    { title: '{name}, ishlar qalay?', sub: "Bugun nima ustida ishlaymiz?", personalized: true }
  ];

  const HERO_CHIPS = [
    { icon: 'code', title: 'Kod yozish', sub: 'Xatoni toping yoki funksiya yozdiring', text: "Python'da fayl ichidagi so'zlarni sanaydigan funksiya yozib ber", mode: 'chat', tier: 0 },
    { icon: 'lightbulb', title: "Biznes g'oyasi", sub: "Kiyim do'koni uchun marketing rejasi", text: "Kiyim do'konim uchun Instagram marketing rejasini tuzib ber", mode: 'chat', tier: 0 },
    { icon: 'edit_note', title: 'Matn tahrirlash', sub: "Xat yoki e'lonni silliqlang", text: "Quyidagi matnni chiroyli va qisqa qilib qayta yoz:\n", mode: 'chat', tier: 0 },
    { icon: 'image', title: 'Rasm chizish', sub: 'Tasavvuringizni rasmga aylantiring', text: 'Kechqurungi Registon maydoni, kino uslubida', mode: 'image', tier: 0 },
    { icon: 'translate', title: 'Tarjima', sub: "Matnni istalgan tilga o'giring", text: "Quyidagi matnni inglizchaga tarjima qil:\n", mode: 'chat', tier: 1 },
    { icon: 'monitoring', title: 'Tahlil', sub: "Ma'lumotdan xulosa va tavsiya", text: "Quyidagi ma'lumotni tahlil qilib, xulosa va tavsiyalar ber:\n", mode: 'chat', tier: 1 },
    { icon: 'neurology', title: 'Chuqur tahlil', sub: 'Qadam-baqadam strategiya', text: "Biznesim uchun 6 oylik o'sish strategiyasini qadam-baqadam tuz", mode: 'chat', tier: 2, deep: true },
    { icon: 'movie', title: 'Kino kadri', sub: 'Kino uslubidagi rasm', text: "Yomg'irdan keyingi tungi Samarqand, kino kadri", mode: 'image', tier: 2, style: 0 }
  ];
  const TIER = { standard: 0, pro: 1, ultra: 2 };

  function getRandomGreeting(userName) {
    const g = HERO_GREETINGS[Math.floor(Math.random() * HERO_GREETINGS.length)];
    return {
      title: g.title.replace('{name}', userName || 'Foydalanuvchi'),
      sub: g.sub
    };
  }

  // ===== STATE =====
  const state = {
    user: null,
    authMode: 'login',
    selectedPlan: null,
    isSending: false,
    history: [],
    inputMode: 'chat',
    isAdmin: false,
    chats: [],
    currentChatId: null,
    style: null,
    deep: false
  };

  // ===== HELPERS =====
  const $ = (id) => document.getElementById(id);
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function saveUser() { if (state.user) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user)); }
  function loadUser() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }

  // API HELPERS — backend uchun plan / user_id
  function getPlan() {
    if (state.isAdmin) return localStorage.getItem(ADMIN_PLAN_KEY) || 'ultra';
    return (state.user && state.user.plan) || 'standard';
  }
  function getUserId() {
    if (!state.user) return 'guest';
    return state.user.email || state.user.name || 'guest';
  }

  // ===== CHAT STORAGE =====
  function loadChats() {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveChats() {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(state.chats));
    } catch (e) {
      while (state.chats.length > 1) {
        state.chats.pop();
        try { localStorage.setItem(CHATS_KEY, JSON.stringify(state.chats)); return; } catch {}
      }
    }
  }
  function genId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
  function getCurrentChat() { return state.chats.find(c => c.id === state.currentChatId) || null; }
  function createChat(title) {
    const chat = {
      id: genId(),
      title: (title || 'Yangi suhbat').trim().slice(0, 50) || 'Yangi suhbat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.chats.unshift(chat);
    if (state.chats.length > MAX_CHATS) state.chats.pop();
    state.currentChatId = chat.id;
    saveChats();
    renderSidebar();
    return chat;
  }
  function pushMessage(role, content, type = 'text', extra = {}) {
    let chat = getCurrentChat();
    if (!chat) chat = createChat('Yangi suhbat');
    chat.messages.push(Object.assign({ role, content, type }, extra));
    chat.updatedAt = Date.now();
    saveChats();
    return chat;
  }

  // ===== ELEMENTS =====
  const authScreen = $('authScreen');
  const authForm   = $('authForm');
  const authName   = $('authName');
  const authEmail  = $('authEmail');
  const authPass   = $('authPass');
  const authBtn    = $('authBtn');
  const nameField  = $('nameField');
  const authTabs   = document.querySelectorAll('.auth-tab');

  const appScreen    = $('appScreen');
  const sidebar      = $('sidebar');
  const sidebarOver  = $('sidebarOverlay');
  const sidebarHist  = $('sidebarHistory');
  const menuBtn      = $('menuBtn');
  const collapseBtn  = $('collapseBtn');
  const newChatBtn   = $('newChatBtn');
  const accountBtn   = $('accountBtn');
  const userAvatar   = $('userAvatar');
  const userName     = $('userName');
  const userPlan     = $('userPlan');

  const chatArea      = $('chatArea');
  const messages      = $('messages');
  const input         = $('input');
  const sendBtn       = $('sendBtn');
  const composerInner = $('composerInner');
  const composerNote  = $('composerNote');
  const limitBadge    = $('limitBadge');
  const limitText     = $('limitText');
  const modeTabs      = document.querySelectorAll('.mode-tab');

  const modal        = $('modal');
  const currentPlan  = $('currentPlan');
  const currentLimit = $('currentLimit');
  const limitWarning = $('limitWarning');
  const payPlanName  = $('payPlanName');
  const payPlanPrice = $('payPlanPrice');
  const trialBtn     = $('trialBtn');
  const successText  = $('successText');
  const successBtn   = $('successBtn');
  const backBtn      = $('backBtn');
  const logoutBtn    = $('logoutBtn');

  const adminBar    = $('adminBar');
  const adminBtn    = $('adminBtn');
  const adminModal  = $('adminModal');
  const adminForm   = $('adminForm');
  const adminEmail  = $('adminEmail');
  const adminPass   = $('adminPass');
  const adminSubmit = $('adminSubmit');

  // ===== HERO =====
  function renderHero(forceRandom = false) {
    if (document.getElementById('hero')) return;
    const p = document.documentElement.dataset.plan || 'standard';
    const tier = TIER[p] || 0;
    const g = getRandomGreeting(state.user?.name || 'Foydalanuvchi');
    const NAMES = { standard: 'Oddiy', pro: 'Pro', ultra: 'Ultra' };
    const TAG = { standard: 'Bepul tarif', pro: 'Ustuvor tezkor javob', ultra: 'Hamma imkoniyat ochiq' };
    const admin = state.isAdmin, u = state.user || {};
    const mMax = LIMITS[p] || 25, iMax = IMG_LIMITS[p] || 1;
    const mLeft = p === 'ultra' ? null : (admin ? mMax : Math.max(0, u.messagesLeft || 0));
    const iLeft = admin ? iMax : Math.max(0, u.imagesLeft || 0);
    const mPct = mLeft === null ? 100 : Math.min(100, mLeft / mMax * 100);
    const iPct = Math.min(100, iLeft / iMax * 100);
    const skin = localStorage.getItem(SKIN_KEY) || 'obsidian';
    const skinName = (SKINS.find(x => x[0] === skin) || SKINS[0])[1];
    const UP = {
      standard: ["Pro'ni 2 kun bepul sinab ko'ring", '150 xabar · 20 rasm · ustuvor javob', "Pro'ni sinash"],
      pro: ["Ultra bilan keyingi bosqichga", 'Cheksiz xabar · 80 rasm · 3 ta mavzu', "Ultra'ni sinash"],
      ultra: ['Ultra faol', 'Mavzu: ' + skinName + ' · hamma imkoniyat ochiq', null]
    }[p];
    const hero = document.createElement('div');
    hero.id = 'hero';
    hero.className = 'hero hx hx-' + p;
    hero.innerHTML = `
      <div class="hx-fx" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="hx-badge"><span class="hx-dot"></span>${NAMES[p]} <em>${TAG[p]}</em></div>
      <div class="hx-orbwrap">
        ${tier ? '<div class="hx-orbit"><b></b></div>' : ''}${tier === 2 ? '<div class="hx-orbit o2"><b></b></div>' : ''}
        <div class="hero-orb" aria-hidden="true"></div>
      </div>
      <h1 class="hero-title">${esc(g.title)}</h1>
      <p class="hero-sub">${esc(g.sub)}</p>
      <div class="hx-usage">
        <div class="hx-card"><div class="ug" style="--v:${mPct.toFixed(1)}"><b>${mLeft === null ? '∞' : mLeft}</b></div><div><small>Xabarlar</small><strong>${mLeft === null ? 'Cheksiz' : mLeft + ' / ' + mMax}</strong><span class="t">bugun qoldi</span></div></div>
        <div class="hx-card"><div class="ug img" style="--v:${iPct.toFixed(1)}"><b>${iLeft}</b></div><div><small>Rasmlar</small><strong>${iLeft} / ${iMax}</strong><span class="t">bugun qoldi</span></div></div>
        <div class="hx-card hx-plan"><small>${esc(UP[0])}</small><strong>${esc(UP[1])}</strong>${UP[2] ? `<button type="button" class="hx-up">${UP[2]}</button>` : ''}</div>
      </div>
      <div class="hx-sec"><span>Tez boshlash</span></div>
      <div class="hero-chips">
        ${HERO_CHIPS.map((c, i) => {
          const lock = c.tier > tier;
          return `<button type="button" class="hero-chip${lock ? ' locked' : ''}" data-chip="${i}">
            <span class="material-symbols-outlined">${lock ? 'lock' : c.icon}</span>
            <span>${esc(c.title)}<small>${esc(c.sub)}</small></span>
            ${lock ? `<em class="chip-lock">${c.tier === 1 ? 'Pro' : 'Ultra'}</em>` : ''}
          </button>`;
        }).join('')}
      </div>
      ${tier === 2 ? `
      <div class="hx-sec ultra"><span>✦ Ultra boshqaruvi</span></div>
      <div class="hx-ultra-panel">
        <div class="ux ux-deep${state.deep ? ' on' : ''}" data-u="deep" role="button" tabindex="0"><span class="material-symbols-outlined">neurology</span><div><b>Chuqur o'ylash</b><small>Qadam-baqadam javob</small></div><i class="ux-sw"></i></div>
        <div class="ux"><b>Rasm uslubi</b><div class="ux-row">${STYLES.map((x, i) => `<button type="button" data-style="${i}" class="${state.style === i ? 'on' : ''}">${x[0]}</button>`).join('')}</div></div>
        <div class="ux"><b>Mavzu</b><div class="ux-row">${SKINS.map(x => `<button type="button" class="sk sk-${x[0]}${skin === x[0] ? ' on' : ''}" data-skin="${x[0]}"><i></i>${x[1]}</button>`).join('')}</div></div>
      </div>` : ''}
    `;
    hero.querySelectorAll('.hero-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = HERO_CHIPS[+btn.dataset.chip];
        if (c.tier > tier) { toast('Bu imkoniyat ' + (c.tier === 1 ? 'Pro' : 'Ultra') + ' tarifida'); openModal(); return; }
        setInputMode(c.mode);
        if (c.deep) { state.deep = true; $('deepBtn').classList.add('on'); }
        if (c.style != null) { state.style = c.style; styleRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.s === state.style)); }
        input.value = c.text;
        autoResize();
        sendBtn.disabled = !input.value.trim();
        input.focus();
      });
    });
    const up = hero.querySelector('.hx-up');
    if (up) up.addEventListener('click', () => openModal());
    const deep = hero.querySelector('[data-u="deep"]');
    if (deep) deep.addEventListener('click', () => {
      state.deep = !state.deep;
      deep.classList.toggle('on', state.deep);
      $('deepBtn').classList.toggle('on', state.deep);
      toast(state.deep ? "Chuqur o'ylash yoqildi" : "Chuqur o'ylash o'chirildi");
    });
    hero.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.style;
      state.style = state.style === i ? null : i;
      hero.querySelectorAll('[data-style]').forEach(x => x.classList.toggle('on', +x.dataset.style === state.style));
      styleRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.s === state.style));
      if (state.style != null) setInputMode('image');
    }));
    hero.querySelectorAll('[data-skin]').forEach(b => b.addEventListener('click', () => {
      localStorage.setItem(SKIN_KEY, b.dataset.skin);
      syncSkin();
      hero.querySelectorAll('[data-skin]').forEach(x => x.classList.toggle('on', x.dataset.skin === b.dataset.skin));
    }));
    messages.appendChild(hero);
  }
  function hideHero() {
    const h = document.getElementById('hero');
    if (h) h.remove();
  }
  function newHero() {
    hideHero();
    renderHero(true);
  }

  // ===== SIDEBAR =====
  function renderSidebar() {
    if (!sidebarHist) return;
    const q = ($('chatSearch')?.value || '').toLowerCase().trim();

    if (!state.chats.length) {
      sidebarHist.innerHTML = `
        <div class="empty-history">
          <span class="material-symbols-outlined">chat_bubble</span>
          <p>Hali suhbatlar yo'q</p>
          <span>Birinchi suhbatni boshlang</span>
        </div>`;
      return;
    }

    const now = Date.now();
    const DAY = 86400000;
    const groups = { today: [], yesterday: [], week: [], older: [] };

    state.chats.forEach(c => {
      if (q && !c.title.toLowerCase().includes(q)) return;
      const age = now - (c.updatedAt || c.createdAt || 0);
      if (age < DAY) groups.today.push(c);
      else if (age < 2 * DAY) groups.yesterday.push(c);
      else if (age < 7 * DAY) groups.week.push(c);
      else groups.older.push(c);
    });

    const labels = { today: 'Bugun', yesterday: 'Kecha', week: 'Oxirgi 7 kun', older: 'Eski' };
    let html = '', total = 0;

    ['today', 'yesterday', 'week', 'older'].forEach(key => {
      if (!groups[key].length) return;
      total += groups[key].length;
      html += `<div class="chat-group"><div class="chat-group-label">${labels[key]}</div>`;
      groups[key].forEach(c => {
        const active = c.id === state.currentChatId ? 'active' : '';
        html += `<button class="chat-item ${active}" data-chat-id="${c.id}">
          <span class="material-symbols-outlined">chat_bubble</span>
          <span class="chat-item-title">${esc(c.title)}</span>
          <span class="chat-item-delete" data-delete-id="${c.id}" title="O'chirish">
            <span class="material-symbols-outlined">close</span>
          </span>
        </button>`;
      });
      html += `</div>`;
    });

    if (!total) {
      html = `<div class="empty-history">
        <span class="material-symbols-outlined">search</span>
        <p>Suhbat topilmadi</p>
        <span>Boshqa so'z bilan urinib ko'ring</span>
      </div>`;
    }

    sidebarHist.innerHTML = html;

    sidebarHist.querySelectorAll('.chat-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.chat-item-delete')) return;
        openChat(el.dataset.chatId);
      });
    });
    sidebarHist.querySelectorAll('.chat-item-delete').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        deleteChat(el.dataset.deleteId);
      });
    });
  }

  function openChat(id) {
    const chat = state.chats.find(c => c.id === id);
    if (!chat) return;
    state.currentChatId = id;
    state.history = chat.messages.filter(m => m.type === 'text').map(m => ({ role: m.role, content: m.content }));
    messages.innerHTML = '';
    if (!chat.messages.length) {
      renderHero();
    } else {
      chat.messages.forEach(m => {
        if (m.type === 'image') renderSavedImage(m.content, m.prompt || '');
        else renderSavedText(m.role, m.content);
      });
    }
    renderSidebar();
    chatArea.scrollTop = chatArea.scrollHeight;
    if (window.innerWidth <= 768) closeSidebar();
    if (!input.disabled) input.focus();
  }

  function deleteChat(id) {
    if (!confirm("Bu suhbatni o'chirishni tasdiqlaysizmi?")) return;
    state.chats = state.chats.filter(c => c.id !== id);
    if (state.currentChatId === id) {
      state.currentChatId = null;
      state.history = [];
      messages.innerHTML = '';
      renderHero();
    }
    saveChats();
    renderSidebar();
    toast("Suhbat o'chirildi");
  }

  // ===== MESSAGE RENDERING =====
  function scrollBottom() {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
  }

  function renderSavedText(role, text) {
    hideHero();
    const domRole = role === 'assistant' ? 'ai' : 'user';
    const msg = document.createElement('div');
    msg.className = 'msg ' + domRole;
    let avatar = null;
    if (domRole === 'ai') {
      avatar = document.createElement('div');
      avatar.className = 'msg-avatar ai';
      avatar.textContent = 'AI';
      msg.appendChild(avatar);
    }
    const body = document.createElement('div');
    body.className = 'msg-body';
    if (domRole === 'ai') { body.innerHTML = md(text); body._raw = text; } else body.textContent = text;
    msg.appendChild(body);
    messages.appendChild(msg);
    body._avatar = avatar;
    startForge(body);
    return body;
  }

  function renderSavedImage(b64, prompt) {
    hideHero();
    const msg = document.createElement('div');
    msg.className = 'msg ai';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar ai';
    avatar.textContent = 'AI';
    const body = document.createElement('div');
    body.className = 'msg-body image-body';
    const img = document.createElement('img');
    img.className = 'generated-image';
    img.src = 'data:image/png;base64,' + b64;
    img.alt = prompt || 'rasm';
    body.appendChild(img);
    if (prompt) {
      const cap = document.createElement('div');
      cap.className = 'image-caption';
      cap.textContent = '🎨 ' + prompt;
      body.appendChild(cap);
    }
    msg.appendChild(avatar);
    msg.appendChild(body);
    messages.appendChild(msg);
  }

  function streamInto(el, text) {
    return new Promise(resolve => {
      const span = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      el.appendChild(span);
      el.appendChild(cursor);
      if (el._avatar) el._avatar.classList.add('typing');
      let i = 0;
      function frame() {
        if (state.abort && state.abort.signal.aborted) {
          cursor.remove();
          if (el._avatar) el._avatar.classList.remove('typing');
          resolve();
          return;
        }
        i = Math.min(text.length, i + 3);
        el._raw = text.slice(0, i);
        span.innerHTML = md(el._raw);
        const near = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 150;
        if (near) chatArea.scrollTop = chatArea.scrollHeight;
        if (i < text.length) requestAnimationFrame(frame);
        else {
          cursor.remove();
          if (el._avatar) el._avatar.classList.remove('typing');
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function appendImagePlaceholder(prompt) {
    hideHero();
    const msg = document.createElement('div');
    msg.className = 'msg ai';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar ai typing';
    avatar.textContent = 'AI';
    const body = document.createElement('div');
    body.className = 'msg-body image-body';
    body.innerHTML = `
      <div class="forge">
        <div class="forge-mesh"><i></i><i></i><i></i></div>
        <div class="forge-grid"></div><div class="forge-scan"></div>
        <div class="forge-core"><div class="forge-ring"></div><div class="forge-ring r2"></div><span class="forge-pct">0%</span></div>
        <div class="forge-text"><b>Tasavvur yig'ilmoqda…</b></div>
        <div class="forge-prompt">${esc(prompt)}</div>
      </div>`;
    msg.appendChild(avatar);
    msg.appendChild(body);
    messages.appendChild(msg);
    scrollBottom();
    body._avatar = avatar;
    body._prompt = prompt;
    return body;
  }

  function replaceWithImage(body, b64, prompt) {
    logReq({ mode: 'image', text: prompt, ok: true });
    if (body._avatar) body._avatar.classList.remove('typing');
    body.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'generated-image';
    img.src = 'data:image/png;base64,' + b64;
    img.alt = prompt;
    body.appendChild(img);
    const cap = document.createElement('div');
    cap.className = 'image-caption';
    cap.textContent = '🎨 ' + prompt;
    body.appendChild(cap);
    scrollBottom();
  }

  function replaceWithError(body, err) {
    logReq({ mode: 'image', text: body._prompt, ok: false, err: err });
    if (body._avatar) body._avatar.classList.remove('typing');
    body.innerHTML = '';
    body.className = 'msg-body';
    body.textContent = '⚠️ Rasm xatosi: ' + err;
  }

  // ===== MODE =====
  function setInputMode(mode) {
    if (!MODE_CONFIG[mode]) return;
    if (mode === 'codex' && !needUltra()) return;
    state.inputMode = mode;
    const cxOn = mode === 'codex';
    $('codexView').classList.toggle('on', cxOn);
    chatArea.style.display = cxOn ? 'none' : '';
    document.documentElement.dataset.mode = mode;
    const sendIcon = sendBtn.querySelector('.material-symbols-outlined');
    if (sendIcon) sendIcon.textContent = mode === 'image' ? 'brush' : mode === 'codex' ? 'code' : 'arrow_upward';
    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    input.placeholder = MODE_CONFIG[mode].placeholder;
    composerNote.textContent = MODE_CONFIG[mode].note;
    if (!input.disabled) input.focus();
  }
  modeTabs.forEach(t => t.addEventListener('click', () => setInputMode(t.dataset.mode)));

  // ===== AUTH =====
  function setAuthMode(mode) {
    state.authMode = mode;
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    if (mode === 'register') {
      nameField.hidden = false;
      authName.required = true;
      authBtn.querySelector('.btn-label').textContent = "Ro'yxatdan o'tish";
    } else {
      nameField.hidden = true;
      authName.required = false;
      authBtn.querySelector('.btn-label').textContent = 'Kirish';
    }
  }
  authTabs.forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const pass  = authPass.value;
    const name  = authName.value.trim();
    if (!email) { authEmail.focus(); toast('Email yoki telefonni kiriting'); return; }
    if (pass.length < 4) { authPass.focus(); toast('Parol kamida 4 belgi'); return; }
    if (state.authMode === 'register' && !name) { authName.focus(); toast('Ismingizni kiriting'); return; }

    authBtn.classList.add('loading');
    authBtn.disabled = true;
    setTimeout(() => {
      const displayName = name || (email.split('@')[0] || 'Foydalanuvchi');
      state.user = {
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email,
        plan: 'standard',
        messagesLeft: LIMITS.standard,
        imagesLeft: IMG_LIMITS.standard,
        day: today()
      };
      saveUser();
      authBtn.classList.remove('loading');
      authBtn.disabled = false;
      enterApp();
    }, 600);
  });

  // ===== APP ENTRY =====
  function enterApp() {
    localStorage.setItem('olmabek_seen', '1');
    landing.classList.remove('show');
    authScreen.classList.remove('show');
    appScreen.classList.remove('hidden');
    appScreen.classList.add('flex');
    updateUserUI();
    updateLimitUI();
    renderSidebar();
    setInputMode('chat');
    messages.innerHTML = '';
    renderHero();
    setTimeout(() => input.focus(), 100);
  }

  function updateUserUI() {
    if (!state.user) return;
    userName.textContent = state.user.name;
    userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
    userPlan.textContent = state.isAdmin ? 'Admin' : (PLANS[state.user.plan]?.name || 'Standart');
    const np = state.isAdmin ? (localStorage.getItem(ADMIN_PLAN_KEY) || 'ultra') : (state.user.plan || 'standard');
    if (document.documentElement.dataset.plan !== np) {
      document.documentElement.dataset.plan = np;
      appScreen.classList.remove('plan-switch'); void appScreen.offsetWidth; appScreen.classList.add('plan-switch');
      const hh = document.getElementById('hero');
      if (hh) { hh.remove(); renderHero(); }
      if (state.inputMode === 'codex' && np !== 'ultra') setInputMode('chat');
    }
    syncSkin();
  }

  function syncMeteors(on) {
    const amb = document.querySelector('.ambient');
    if (!amb || amb.dataset.meteors === String(on)) return;
    amb.dataset.meteors = String(on);
    amb.querySelectorAll('.meteor').forEach(m => m.remove());
    if (!on) return;
    for (let i = 0, n = innerWidth < 700 ? 3 : 7; i < n; i++) {
      const m = document.createElement('span');
      m.className = 'meteor';
      m.style.left = 30 + Math.random() * 70 + '%';
      m.style.top = Math.random() * 35 + '%';
      m.style.animationDelay = Math.random() * 9 + 's';
      m.style.animationDuration = 5 + Math.random() * 5 + 's';
      amb.appendChild(m);
    }
  }

  function updateLimitUI() {
    if (!state.user) return;
    const left = state.user.messagesLeft;
    const plan = state.user.plan;
    const isAdmin = state.isAdmin;

    if (isAdmin) {
      limitText.textContent = 'Admin';
      limitBadge.classList.remove('warn', 'locked');
      limitBadge.classList.add('admin');
    } else if (plan === 'ultra') {
      limitText.textContent = 'Cheksiz · ' + state.user.imagesLeft + ' rasm';
      limitBadge.classList.remove('warn', 'locked', 'admin');
    } else if (left <= 0) {
      limitText.textContent = 'Limit tugadi';
      limitBadge.classList.remove('warn', 'admin');
      limitBadge.classList.add('locked');
    } else if (left <= 1) {
      limitText.textContent = left + ' xabar · ' + state.user.imagesLeft + ' rasm';
      limitBadge.classList.remove('admin', 'locked');
      limitBadge.classList.add('warn');
    } else {
      limitText.textContent = left + ' xabar · ' + state.user.imagesLeft + ' rasm';
      limitBadge.classList.remove('warn', 'locked', 'admin');
    }

    const isLocked = !isAdmin && left <= 0 && plan !== 'ultra';
    if (isLocked) {
      composerInner.classList.add('locked');
      input.disabled = true;
      sendBtn.disabled = true;
    } else {
      composerInner.classList.remove('locked');
      input.disabled = false;
      sendBtn.disabled = !input.value.trim();
    }
    adminBar.classList.toggle('visible', isLocked);
    const unlimited = isAdmin || plan === 'ultra';
    const mp = unlimited ? 100 : Math.max(0, Math.min(100, left / (LIMITS[plan] || 25) * 100));
    const ip = isAdmin ? 100 : Math.max(0, Math.min(100, state.user.imagesLeft / (IMG_LIMITS[plan] || 1) * 100));
    document.documentElement.style.setProperty('--msg', mp.toFixed(1));
    document.documentElement.style.setProperty('--img', ip.toFixed(1));
  }

  // ===== INPUT =====
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }
  input.addEventListener('input', () => {
    autoResize();
    if (!state.isSending) sendBtn.disabled = !input.value.trim();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.inputMode === 'image') generateImage();
      else if (state.inputMode === 'codex') sendCodex();
      else sendMessage();
    }
  });
  sendBtn.addEventListener('click', () => {
    if (state.isSending) { stopGeneration(); return; }
    if (state.inputMode === 'image') generateImage();
    else if (state.inputMode === 'codex') sendCodex();
    else sendMessage();
  });

  // ===== SYNTAX HIGHLIGHT =====
  const KW = /^(?:def|class|return|if|elif|else|for|while|do|import|from|as|in|not|and|or|is|None|True|False|try|except|finally|with|lambda|pass|break|continue|yield|async|await|function|const|let|var|new|this|self|null|undefined|true|false|switch|case|default|export|throw|catch|typeof|void|static|public|private|protected|int|float|double|string|bool|char|long|struct|enum|interface|type|extends|implements|package|using|namespace|fn|pub|mut|impl|match|go|func|print|echo|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|CREATE|TABLE|INTO|VALUES|ORDER|BY|GROUP|LIMIT)$/;
  function hl(code, lang) {
    const hash = /^(py|python|sh|bash|shell|zsh|yaml|yml|rb|ruby|r|toml|dockerfile)$/i.test(lang || '') ? '|#[^\\n]*' : '';
    const re = new RegExp('(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|<!--[\\s\\S]*?-->|--[^\\n]*(?=\\n|$)' + hash + ')|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)(?=\\s*\\()|(\\b[A-Za-z_]\\w*\\b)', 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      let cls = '';
      if (m[1]) cls = 'c';
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'n';
      else if (m[4]) cls = KW.test(m[4]) ? 'k' : 'f';
      else if (m[5] && KW.test(m[5])) cls = 'k';
      out += cls ? '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  // ===== MARKDOWN =====
  function md(t) {
    t = String(t == null ? '' : t);
    if ((t.match(/```/g) || []).length % 2) t += '\n```';
    const codes = [];
    t = t.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (m, l, c) => { codes.push({ l, c: c.replace(/\n$/, '') }); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = esc(t);
    t = t.replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>')
         .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
         .replace(/(^|[^*])\*([^*\s][^*\n]*)\*(?!\*)/g, '$1<em>$2</em>')
         .replace(/^(#{1,3}) (.+)$/gm, (m, h, x) => '<span class="md-h md-h' + h.length + '">' + x + '</span>')
         .replace(/^(?:- |\* )(.+)$/gm, '<span class="md-li">$1</span>')
         .replace(/^(\d+)\. (.+)$/gm, '<span class="md-li"><b>$1.</b>$2</span>');
    t = t.replace(/(<\/(?:span|div)>)\n/g, '$1');
    t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => {
      const c = codes[i];
      return '<div class="code"><div class="code-head"><i>' + esc(c.l || 'kod') + '</i><button type="button" class="code-copy">Nusxalash</button></div><pre><code>' + hl(c.c, c.l) + '</code></pre></div>';
    });
    return t.replace(/(<\/pre><\/div>)\n/g, '$1');
  }
  messages.addEventListener('click', e => {
    const b = e.target.closest('.code-copy');
    if (!b) return;
    const txt = b.closest('.code').querySelector('code').innerText;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => {
      b.textContent = 'Nusxalandi ✓';
      setTimeout(() => (b.textContent = 'Nusxalash'), 1600);
    }).catch(() => toast('Nusxalab bo\'lmadi'));
  });

  // ===== IMAGE FORGE =====
  function startForge(body) {
    const P = ["Tasavvur yig'ilmoqda", 'Ranglar aralashmoqda', 'Shakl chizilmoqda', "Yorug'lik qo'shilmoqda", 'Detallar silliqlanmoqda'];
    let p = 0, k = 0;
    const iv = setInterval(() => {
      const pc = body.querySelector('.forge-pct');
      if (!pc) { clearInterval(iv); return; }
      p += (94 - p) * 0.045;
      pc.textContent = Math.round(p) + '%';
      body.querySelector('.forge').style.setProperty('--fp', p.toFixed(1));
      k++;
      if (k % 22 === 0) body.querySelector('.forge-text b').textContent = P[(k / 22) % P.length] + '…';
    }, 90);
  }

  // ===== ULTRA EXTRAS =====
  const STYLES = [['Kino', 'cinematic film still, dramatic lighting'], ['Anime', 'anime style, vibrant colors, detailed'], ['3D', '3D render, soft studio light, octane'], ['Realistik', 'photorealistic, 85mm lens, ultra detailed'], ['Akvarel', 'watercolor painting, soft washes']];
  const isUltra = () => document.documentElement.dataset.plan === 'ultra';
  function needUltra() {
    if (isUltra()) return true;
    toast('Bu imkoniyat faqat Ultra tarifida');
    openModal();
    return false;
  }
  const styleRow = document.createElement('div');
  styleRow.id = 'styleRow';
  styleRow.innerHTML = '<span class="sr-label">✦ Ultra uslubi</span>' + STYLES.map((x, i) => '<button type="button" data-s="' + i + '">' + x[0] + '</button>').join('');
  composerInner.before(styleRow);
  styleRow.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !needUltra()) return;
    const i = +b.dataset.s;
    state.style = state.style === i ? null : i;
    styleRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.s === state.style));
  });
  function withStyle(p) { return isUltra() && state.style != null ? p + ', ' + STYLES[state.style][1] : p; }

  $('deepBtn').addEventListener('click', () => {
    if (!needUltra()) return;
    state.deep = !state.deep;
    $('deepBtn').classList.toggle('on', state.deep);
    toast(state.deep ? "Chuqur o'ylash yoqildi" : "Chuqur o'ylash o'chirildi");
  });
  $('exportBtn').addEventListener('click', () => {
    if (!needUltra()) return;
    if (!state.history.length) { toast('Yuklab olish uchun chat bo\'sh'); return; }
    const txt = state.history.map(m => (m.role === 'user' ? '## Siz\n' : '## Olmabek AI\n') + m.content).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/markdown' }));
    a.download = 'olmabek-chat.md';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ===== LANDING =====
  const landing = $('landing');
  const lnAuth = $('lnAuth');
  lnAuth.appendChild(authScreen.firstElementChild);
  const lnStars = Stars($('lnCosmos'), { density: 1.25 });
  new MutationObserver(() => { if (landing.classList.contains('show')) lnStars.start(); else lnStars.stop(); })
    .observe(landing, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => lnStars.resize());
  document.addEventListener('pointermove', e => lnStars.setMouse(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });
  function focusAuth(mode) {
    setAuthMode(mode);
    lnAuth.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => (mode === 'register' ? $('authName') : authEmail).focus({ preventScroll: true }), 650);
  }
  document.querySelectorAll('.open-auth').forEach(b => b.addEventListener('click', () => focusAuth(b.dataset.mode || 'register')));
  document.querySelectorAll('[data-scroll]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); $(a.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); }));
  $('lnAdmin').addEventListener('click', () => {
    adminModal.classList.add('active');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    adminEmail.focus();
  });
  const revealIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { root: landing, threshold: 0.12 });
  landing.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

  const DEMO = [
    ["Python'da sonlarni qo'shadigan funksiya yoz", "Mana tayyor funksiya:\n\n```python\ndef qosh(a, b):\n    return a + b\n\nprint(qosh(2, 3))  # 5\n```\nIstasangiz, uni batafsil tushuntirib beraman."],
    ["Kiyim do'konim uchun 3 ta Instagram g'oyasi ber", "**3 ta g'oya:**\n- Kunlik look: har kuni bitta kiyim uyg'unligi\n- Mijozlar fikri: haqiqiy sharhlar bilan reels\n- Orqa sahna: buyurtma qanday tayyorlanishi"],
    ["Kechqurungi Registon rasmini chiz", "Rasm studiyasida tasvirlab bering, Olmabek chizib beradi. Ultra tarifida Kino, Anime va 3D uslublari ham bor."]
  ];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  (async function runDemo() {
    const body = $('demoBody');
    let i = 0;
    for (;;) {
      while (!landing.classList.contains('show')) await sleep(1000);
      const [q, a] = DEMO[i++ % DEMO.length];
      body.innerHTML = '';
      const u = document.createElement('div'); u.className = 'dm-u'; body.appendChild(u);
      for (let k = 1; k <= q.length; k++) { u.textContent = q.slice(0, k); await sleep(32); }
      await sleep(400);
      const t = document.createElement('div'); t.className = 'think'; t.innerHTML = '<i class="think-orb"></i><b>O\'ylamoqda…</b>'; body.appendChild(t);
      await sleep(1400); t.remove();
      const r = document.createElement('div'); r.className = 'dm-a'; body.appendChild(r);
      for (let k = 3; k < a.length + 3; k += 3) { r.innerHTML = md(a.slice(0, k)); await sleep(24); }
      await sleep(3800);
    }
  })();

  // ===== STARFIELD ENGINE =====
  function Stars(canvas, { density = 1 } = {}) {
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, stars = [], raf = 0, shoot = null, mx = 0, my = 0, running = false;
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(w * h / 8500 * density * (w < 700 ? 0.55 : 1));
      stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.2, z: Math.random() * 0.9 + 0.1, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6, hue: Math.random() < 0.2 ? 210 : (Math.random() < 0.15 ? 285 : 0) }));
    }
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
        const x = (s.x + mx * s.z * 16 + w) % w, y = (s.y + my * s.z * 16 + h) % h;
        ctx.globalAlpha = Math.min(1, a * s.z + 0.1);
        ctx.fillStyle = s.hue ? 'hsl(' + s.hue + ' 90% 80%)' : '#fff';
        ctx.beginPath(); ctx.arc(x, y, s.r * s.z + 0.2, 0, 6.283); ctx.fill();
      }
      if (!reduce) {
        if (!shoot && Math.random() < 0.004) shoot = { x: w * 0.2 + Math.random() * w * 0.8, y: Math.random() * h * 0.4, l: 0 };
        if (shoot) {
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x + 63, shoot.y - 32);
          g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x + 63, shoot.y - 32); ctx.stroke();
          shoot.x -= 11; shoot.y += 5.8;
          if (++shoot.l > 80) shoot = null;
        }
      }
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }
    return {
      start() { if (running) return; running = true; size(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); },
      resize() { if (running) size(); },
      setMouse(x, y) { mx = x; my = y; }
    };
  }
  const SKIN_KEY = 'olmabek_skin';
  const SKINS = [['obsidian', 'Obsidian'], ['galaxy', 'Galaktika'], ['blackhole', 'Qora tuynuk']];
  const ambientEl = document.querySelector('.ambient');
  const cosmosCv = document.createElement('canvas');
  cosmosCv.className = 'cosmos';
  const bhEl = document.createElement('div');
  bhEl.className = 'bh';
  bhEl.innerHTML = '<i class="bh-disk"></i><i class="bh-halo"></i><i class="bh-core"></i>';
  ambientEl.appendChild(cosmosCv); ambientEl.appendChild(bhEl);
  const stars = Stars(cosmosCv), apStars = Stars($('apCosmos'), { density: 1.4 });
  function syncSkin() {
    const root = document.documentElement;
    const ultra = root.dataset.plan === 'ultra' && root.classList.contains('dark');
    const skin = localStorage.getItem(SKIN_KEY) || 'obsidian';
    root.dataset.skin = skin;
    if (ultra && skin !== 'obsidian') stars.start(); else stars.stop();
    syncMeteors(ultra && skin === 'obsidian');
  }
  window.addEventListener('resize', () => { stars.resize(); apStars.resize(); });
  document.addEventListener('pointermove', e => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    stars.setMouse(nx, ny); apStars.setMouse(nx, ny);
  }, { passive: true });
  $('skinBtn').addEventListener('click', () => {
    if (!needUltra()) return;
    const cur = SKINS.findIndex(x => x[0] === (localStorage.getItem(SKIN_KEY) || 'obsidian'));
    const next = SKINS[(cur + 1) % SKINS.length];
    localStorage.setItem(SKIN_KEY, next[0]);
    syncSkin();
    toast('Mavzu: ' + next[1]);
  });

  // ===== ADMIN PARTICLE NETWORK =====
  function NeonFX(canvas) {
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COLS = [[139, 112, 255], [139, 112, 255], [91, 140, 255], [168, 85, 247], [255, 122, 69]];
    let w = 0, h = 0, P = [], waves = [], packets = [], streak = null, raf = 0, running = false, mx = -999, my = -999, nWave = 0, nPack = 0, nStreak = 3000;
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(w < 700 ? 50 : 105, Math.round(w * h / 12500));
      P = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45, r: Math.random() * 1.2 + 0.5, c: COLS[Math.floor(Math.random() * COLS.length)], p: Math.random() * 6.28 }));
    }
    const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
    function frame(t) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 150 && d > 0.1) { const f = (1 - d / 150) * 2.2; p.x += dx / d * f; p.y += dy / d * f; }
      }
      const L = 130;
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) { ctx.strokeStyle = rgba(a.c, (1 - d / L) * 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      for (const p of P) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + p.p);
        ctx.fillStyle = rgba(p.c, 0.08 * tw); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
        ctx.fillStyle = rgba(p.c, 0.5 * tw + 0.15); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * tw).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, 6.283); ctx.fill();
      }
      if (!reduce) {
        if (t > nPack && P.length > 3) {
          const a = P[Math.floor(Math.random() * P.length)];
          const near = P.filter(q => q !== a && Math.hypot(a.x - q.x, a.y - q.y) < L);
          if (near.length) packets.push({ a, b: near[Math.floor(Math.random() * near.length)], k: 0, s: 0.012 + Math.random() * 0.014 });
          nPack = t + 140;
        }
        packets = packets.filter(k => k.k < 1);
        for (const k of packets) {
          k.k += k.s;
          const x = k.a.x + (k.b.x - k.a.x) * k.k, y = k.a.y + (k.b.y - k.a.y) * k.k;
          ctx.fillStyle = rgba(k.a.c, 0.3); ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, 6.283); ctx.fill();
        }
        if (t > nWave) { waves.push({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.12 + Math.random() * 0.5), r: 0 }); nWave = t + 3600 + Math.random() * 2600; }
        waves = waves.filter(v => v.r < 540);
        for (const v of waves) { v.r += 4; ctx.strokeStyle = 'rgba(139,112,255,' + (0.45 * (1 - v.r / 540)).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, 6.283); ctx.stroke(); }
        if (!streak && t > nStreak) { streak = { x: w * (0.35 + Math.random() * 0.65), y: Math.random() * h * 0.45, l: 0 }; nStreak = t + 4500 + Math.random() * 4500; }
        if (streak) {
          const g = ctx.createLinearGradient(streak.x, streak.y, streak.x + 150, streak.y - 78);
          g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.3, 'rgba(139,112,255,.5)'); g.addColorStop(1, 'rgba(139,112,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(streak.x, streak.y); ctx.lineTo(streak.x + 150, streak.y - 78); ctx.stroke();
          streak.x -= 13; streak.y += 6.8;
          if (++streak.l > 90) streak = null;
        }
      }
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }
    const move = e => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    const leave = () => { mx = my = -999; };
    return {
      start() { if (running) return; running = true; size(); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerleave', leave); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); ctx.clearRect(0, 0, w, h); },
      resize() { if (running) size(); }
    };
  }
  const apFx = NeonFX($('apCosmos'));
  window.addEventListener('resize', () => apFx.resize());

  // ===== OLMABEK CODEX (/api/build-site) =====
  const cxView = $('codexView'), cxLog = $('cxLog'), cxFrame = $('cxFrame'), cxCodeEl = $('cxCode');
  const cx = { code: '', history: [] };

  const cxDown = () => { const sc = $('cxScroll'); sc.scrollTop = sc.scrollHeight; };
  function cxAdd(html, cls) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; cxLog.appendChild(d); cxDown(); return d; }
  function cxTab(t) {
    cxView.querySelectorAll('[data-cxt]').forEach(b => b.classList.toggle('on', b.dataset.cxt === t));
    $('cxStage').style.display = t === 'preview' ? '' : 'none';
    cxCodeEl.style.display = t === 'code' ? 'block' : 'none';
    if (t === 'code') cxCodeEl.querySelector('code').innerHTML = hl(cx.code, 'html');
  }
  function cxReady() {
    cxFrame.srcdoc = cx.code;
    cxView.classList.add('ready');
    cxTab('preview');
    if (innerWidth <= 900) cxView.dataset.m = 'preview';
  }

  async function sendCodex() {
    if (localStorage.getItem(AI_OFF_KEY) === '1' && !state.isAdmin) { toast("AI vaqtincha o'chirilgan"); return; }
    if (state.isSending || !needUltra()) return;
    const text = input.value.trim();
    if (!text) return;

    state.isSending = true;
    input.value = ''; autoResize(); sendBtn.disabled = false; setStopUI(true);
    $('cxWelcome').style.display = 'none';
    cxAdd(esc(text), 'cx-u');

    const card = cxAdd(
      '<div class="cx-a-h"><i class="cx-orb"></i><b>Olmabek Codex</b><span>Gemini</span></div>' +
      '<div class="cx-steps">' +
        '<div class="cx-step on" data-s="0"><i></i>Reja tuzilmoqda</div>' +
        '<div class="cx-step" data-s="1"><i></i>Kod yozilmoqda</div>' +
        '<div class="cx-step" data-s="2"><i></i>Preview tayyorlanmoqda</div>' +
      '</div>' +
      '<div class="cx-after"></div>',
      'cx-a'
    );
    const q = sel => card.querySelector(sel);
    const step = (i, st) => { const el = q('[data-s="' + i + '"]'); el.classList.remove('on', 'done'); if (st) el.classList.add(st); };

    state.abort = new AbortController();

    try {
      step(0, 'done');
      step(1, 'on');

      const res = await fetch(API_BASE + '/api/build-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          current_code: cx.code || '',
          plan: getPlan(),
          user_id: getUserId(),
          is_admin: state.isAdmin
        }),
        signal: state.abort.signal
      });

      if (!res.ok) {
        let detail = 'HTTP ' + res.status;
        try { const e = await res.json(); if (e.detail) detail = e.detail; } catch {}
        throw new Error(detail);
      }

      const data = await res.json();
      if (!data.html) throw new Error('Kod qaytmadi');

      step(1, 'done');
      step(2, 'on');
      cx.code = data.html;

      await new Promise(r => setTimeout(r, 350));
      cxReady();
      step(2, 'done');

      q('.cx-after').innerHTML =
        '<button type="button" class="cx-file">' +
          '<span class="material-symbols-outlined">description</span>' +
          '<b>index.html</b>' +
          '<em>' + cx.code.split('\n').length + ' qator</em>' +
          '<i>Kodni ko\'rish</i>' +
        '</button>';

      q('.cx-file').addEventListener('click', () => {
        cxView.classList.add('ready');
        cxTab('code');
        if (innerWidth <= 900) cxView.dataset.m = 'preview';
      });

      cx.history.push(
        { role: 'user', content: text },
        { role: 'assistant', content: 'Kod yaratildi (' + cx.code.split('\n').length + ' qator).' }
      );
      logReq({ mode: 'codex', text, ok: true });

      if (data.sitesLeft !== undefined && data.sitesLeft < 3 && !state.isAdmin) {
        toast('Kunlik sayt limiti: ' + data.sitesLeft + ' ta qoldi');
      }
    } catch (err) {
      card.querySelectorAll('.cx-step.on').forEach(el => el.classList.remove('on'));
      if (err.name === 'AbortError') {
        q('.cx-after').innerHTML = '<div class="cx-note">To\'xtatildi.</div>';
      } else {
        const msg = err.message === 'Failed to fetch' ? "Serverga ulanib bo'lmadi" : err.message;
        q('.cx-after').innerHTML = '<div class="cx-note bad">⚠ ' + esc(msg) + '</div>';
        logReq({ mode: 'codex', text, ok: false, err: msg });
      }
    } finally {
      state.isSending = false; state.abort = null; setStopUI(false);
      sendBtn.disabled = !input.value.trim();
    }
  }

  $('cxTpl').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    input.value = b.dataset.p; autoResize(); sendCodex();
  });
  cxView.querySelectorAll('[data-cxt]').forEach(b => b.addEventListener('click', () => cxTab(b.dataset.cxt)));
  $('cxM').addEventListener('click', e => { const b = e.target.closest('[data-cxm]'); if (!b) return; cxView.dataset.m = b.dataset.cxm; $('cxM').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('cxDevice').addEventListener('click', () => { const ph = cxView.classList.toggle('phone'); $('cxDevice').querySelector('span').textContent = ph ? 'desktop_windows' : 'smartphone'; });
  $('cxReload').addEventListener('click', () => { if (cx.code) cxFrame.srcdoc = cx.code; });
  $('cxFull').addEventListener('click', () => cxView.classList.toggle('full'));
  $('cxCopy').addEventListener('click', () => { (navigator.clipboard ? navigator.clipboard.writeText(cx.code) : Promise.reject()).then(() => toast('Kod nusxalandi')).catch(() => toast("Nusxalab bo'lmadi")); });
  $('cxDl').addEventListener('click', () => {
    if (!cx.code) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([cx.code], { type: 'text/html' }));
    a.download = 'olmabek-codex.html'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('cxNew').addEventListener('click', () => {
    if (state.isSending) { toast("Avval to'xtating"); return; }
    cx.code = ''; cx.history = []; cxLog.innerHTML = ''; cxFrame.srcdoc = '';
    cxView.classList.remove('ready', 'full', 'phone'); cxView.dataset.m = 'chat';
    $('cxWelcome').style.display = '';
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cxView.classList.contains('full')) cxView.classList.remove('full'); });

  // ===== ADMIN ENTRY =====
  function openAdminLogin() {
    adminModal.classList.add('active');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    adminEmail.focus();
  }
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); openAdminLogin(); }
  });
  const keysDown = new Set();
  document.addEventListener('keydown', e => {
    keysDown.add(e.key.toLowerCase());
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '') || e.target.isContentEditable) return;
    if (e.shiftKey && keysDown.has('a') && keysDown.has('s')) {
      e.preventDefault();
      keysDown.clear();
      openAdminLogin();
    }
  });
  document.addEventListener('keyup', e => keysDown.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keysDown.clear());
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') openAdminLogin(); });
  if (location.hash === '#admin') setTimeout(openAdminLogin, 400);

  // ===== ADMIN CENTRE =====
  const adminPanel = $('adminPanel');
  const PLAN_NOTE = { standard: '25 xabar · 8 rasm / kun', pro: '150 xabar · 20 rasm / kun · ustuvor javob', ultra: "Cheksiz xabar · 80 rasm / kun · uslublar, chuqur o'ylash, eksport" };
  function logReq({ mode, text, ok, err }) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
    list.unshift({ t: Date.now(), u: (state.user && state.user.name) || 'Mehmon', p: document.documentElement.dataset.plan || 'standard', m: mode, x: String(text || '').slice(0, 90), ms: Math.round(performance.now() - (state.t0 || performance.now())), ok: !!ok, e: err || '' });
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 300)));
    if (adminPanel.classList.contains('open')) renderAdmin();
  }
  function openAdminPanel() {
    landing.classList.remove('show');
    authScreen.classList.remove('show');
    adminPanel.classList.add('open');
    adminPanel.setAttribute('aria-hidden', 'false');
    apFx.start();
    document.body.style.overflow = 'hidden';
    applyAdminPlan(localStorage.getItem(ADMIN_PLAN_KEY) || 'ultra');
  }
  function closeAdminPanel() {
    adminPanel.classList.remove('open');
    adminPanel.setAttribute('aria-hidden', 'true');
    apStars.stop();
    apFx.stop();
    document.body.style.overflow = '';
    if (!state.user) landing.classList.add('show');
  }
  function applyAdminPlan(p) {
    localStorage.setItem(ADMIN_PLAN_KEY, p);
    document.documentElement.dataset.plan = p;
    syncSkin();
    if (state.user) updateUserUI();
    renderAdmin();
  }
  function renderAdmin() {
    const p = localStorage.getItem(ADMIN_PLAN_KEY) || 'ultra';
    adminPanel.querySelectorAll('#apSeg button').forEach(b => b.classList.toggle('on', b.dataset.aplan === p));
    $('apPlanNote').textContent = PLAN_NOTE[p];
    const off = localStorage.getItem(AI_OFF_KEY) === '1';
    $('aiToggle').classList.toggle('on', !off);
    $('aiState').textContent = off ? "AI o'chirilgan" : 'AI yoqilgan';
    $('aiHint').textContent = off ? "Foydalanuvchilar javob ololmaydi (faqat shu brauzerda)" : 'Foydalanuvchilar savol berib, rasm yasay oladi';
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
    $('stReq').textContent = list.length;
    $('stErr').textContent = list.filter(x => !x.ok).length;
    $('stLat').textContent = list.length ? Math.round(list.reduce((a, x) => a + x.ms, 0) / list.length) : 0;
    const PL = { standard: 'Oddiy', pro: 'Pro', ultra: 'Ultra' };
    $('reqFeed').innerHTML = list.length ? list.slice(0, 12).map(x =>
      '<div class="fd' + (x.ok ? '' : ' bad') + '"><span class="material-symbols-outlined">' + (x.m === 'image' ? 'brush' : x.m === 'codex' ? 'code' : 'chat') + '</span>' +
      '<div><b>' + esc(x.u) + '<em>' + (PL[x.p] || x.p) + ' · ' + new Date(x.t).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) + '</em></b><span class="tx">' + esc(x.ok ? x.x : '⚠ ' + x.e) + '</span></div>' +
      '<small>' + x.ms + ' ms</small></div>').join('') : '<div class="empty-feed">Hali so\'rov yo\'q. Chatga o\'tib savol bering.</div>';
  }
  $('apSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) applyAdminPlan(b.dataset.aplan); });
  $('aiToggle').addEventListener('click', () => {
    const off = localStorage.getItem(AI_OFF_KEY) === '1';
    if (off) localStorage.removeItem(AI_OFF_KEY); else localStorage.setItem(AI_OFF_KEY, '1');
    renderAdmin();
  });
  $('logClear').addEventListener('click', () => { localStorage.removeItem(LOG_KEY); renderAdmin(); });
  $('apChat').addEventListener('click', () => {
    if (!state.user) state.user = { name: 'Admin', email: 'admin', plan: 'ultra', messagesLeft: 999999, imagesLeft: 999, day: today() };
    closeAdminPanel();
    enterApp();
  });
  $('apExit').addEventListener('click', () => {
    state.isAdmin = false;
    localStorage.removeItem(ADMIN_KEY);
    document.documentElement.dataset.plan = (state.user && state.user.plan) || 'standard';
    syncSkin();
    closeAdminPanel();
    if (state.user) { updateUserUI(); updateLimitUI(); }
  });
  // ===== ADMIN STATISTICS =====
  function countUp(el, to) {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (from === to) { el.textContent = to; return; }
    const t0 = performance.now(), d = 900;
    (function f(t) {
      const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  function renderStats() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
    const n = list.length, chat = list.filter(x => x.m === 'chat').length, ok = list.filter(x => x.ok).length;
    const ms = list.map(x => x.ms).sort((a, b) => a - b);
    const avg = n ? Math.round(ms.reduce((a, b) => a + b, 0) / n) : 0;
    const p95 = n ? ms[Math.min(n - 1, Math.floor(n * 0.95))] : 0;
    const img = list.filter(x => x.m === 'image').length, cod = list.filter(x => x.m === 'codex').length, day = list.filter(x => Date.now() - x.t < 86400000).length;
    const K = [["Jami so'rov", n, ''], ['Bugun', day, ''], ['Chat', chat, ''], ['Rasm', img, ''], ['Codex', cod, ''], ['Muvaffaqiyat', n ? Math.round(ok / n * 100) : 0, '%'], ["O'rtacha", avg, ' ms'], ['P95', p95, ' ms'], ['Xatolar', n - ok, ''], ['Foydalanuvchilar', new Set(list.map(x => x.u)).size, '']];
    const kp = $('apKpis');
    if (!kp.children.length) kp.innerHTML = K.map(() => '<div class="kpi"><small></small><b><span>0</span><em></em></b></div>').join('');
    K.forEach((k, i) => {
      const c = kp.children[i];
      c.querySelector('small').textContent = k[0];
      c.querySelector('em').textContent = k[2];
      countUp(c.querySelector('span'), k[1]);
    });
    const now = Date.now(), H = 12, b = Array(H).fill(0);
    list.forEach(x => { const d = Math.floor((now - x.t) / 3600000); if (d >= 0 && d < H) b[H - 1 - d]++; });
    const mx = Math.max(1, ...b);
    $('chHours').innerHTML = b.map((v, i) => '<div class="bar" style="--h:' + Math.max(4, v / mx * 100) + '%;animation-delay:' + i * 50 + 'ms"><span>' + (v || '') + '</span><i>' + new Date(now - (H - 1 - i) * 3600000).getHours() + '</i></div>').join('');
    const P = { standard: 0, pro: 0, ultra: 0 }, cols = { standard: '96 140 255', pro: '168 85 247', ultra: '255 140 90' }, names = { standard: 'Oddiy', pro: 'Pro', ultra: 'Ultra' };
    list.forEach(x => { P[x.p] = (P[x.p] || 0) + 1; });
    let acc = 0;
    const segs = Object.keys(P).map(k => { const a = acc; acc += P[k] / (n || 1) * 100; return 'rgb(' + cols[k] + ') ' + a + '% ' + acc + '%'; });
    $('chPlan').style.background = n ? 'conic-gradient(' + segs.join(',') + ')' : 'rgb(255 255 255 / .08)';
    $('chPlanLeg').innerHTML = Object.keys(P).map(k => '<span><i style="background:rgb(' + cols[k] + ')"></i>' + names[k] + '<em>' + P[k] + '</em></span>').join('');
    const L = list.slice(0, 30).reverse();
    const svg = $('chLat');
    if (L.length < 2) {
      svg.innerHTML = '<text x="200" y="64" text-anchor="middle" fill="currentColor" opacity=".4" font-size="12">Ma\'lumot yetarli emas</text>';
    } else {
      const lm = Math.max(1, ...L.map(x => x.ms));
      const pts = L.map((x, i) => [i / (L.length - 1) * 400, 112 - x.ms / lm * 100]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      svg.innerHTML = '<defs><linearGradient id="lgA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:rgb(var(--c-secondary));stop-opacity:.4"/><stop offset="1" style="stop-color:rgb(var(--c-secondary));stop-opacity:0"/></linearGradient></defs><path d="' + d + ' L400 120 L0 120Z" fill="url(#lgA)"/><path class="ln" d="' + d + '"/>';
    }
    const U = {};
    list.forEach(x => { U[x.u] = (U[x.u] || 0) + 1; });
    const top = Object.entries(U).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $('chTop').innerHTML = top.length ? top.map(([u, c]) => '<div><span>' + esc(u) + '</span><b>' + c + '</b><i style="--w:' + c / top[0][1] * 100 + '%"></i></div>').join('') : '<div class="empty-feed">Hali ma\'lumot yo\'q</div>';
  }

  function renderSkinSeg() {
    const sk = localStorage.getItem(SKIN_KEY) || 'obsidian';
    adminPanel.querySelectorAll('#apSkin button').forEach(b => b.classList.toggle('on', b.dataset.askin === sk));
  }

  const _renderAdminBase = renderAdmin;
  renderAdmin = function () { _renderAdminBase(); renderStats(); renderSkinSeg(); };

  $('apSkin').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    localStorage.setItem(SKIN_KEY, b.dataset.askin);
    syncSkin(); renderSkinSeg();
  });

  $('logDemo').addEventListener('click', () => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
    const names = ['Sodiq', 'Aziza', 'Jasur', 'Malika', 'Bobur', 'Dilnoza'], plans = ['standard', 'standard', 'pro', 'ultra'];
    const texts = ["Python'da funksiya yoz", 'Marketing rejasi tuz', 'Kechqurungi Registon', "Matnni tahrirla", "Bu xatoni tuzat", "Kiyim do'koni uchun g'oya"];
    for (let i = 0; i < 70; i++) {
      const rr = Math.random(), img = rr < 0.26, cdx = rr >= 0.26 && rr < 0.38;
      list.push({ t: Date.now() - Math.random() * 12 * 3600000, u: names[Math.floor(Math.random() * names.length)], p: plans[Math.floor(Math.random() * plans.length)], m: img ? 'image' : cdx ? 'codex' : 'chat', x: texts[Math.floor(Math.random() * texts.length)], ms: Math.round(img ? 6000 + Math.random() * 9000 : 700 + Math.random() * 3200), ok: Math.random() > 0.07, e: 'Timeout' });
    }
    list.sort((a, b) => b.t - a.t);
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 300)));
    renderAdmin();
    toast("Demo ma'lumot qo'shildi");
  });

  // ===== DIAGNOSTIKA =====
  let diagBusy = false;
  $('diagRun').addEventListener('click', async () => {
    if (diagBusy) return;
    diagBusy = true;
    const btn = $('diagRun'), list = $('diagList'), gauge = $('gauge');
    btn.disabled = true; btn.textContent = 'Tekshirilmoqda…';
    gauge.className = 'gauge'; gauge.style.setProperty('--gp', 0); $('gaugeTxt').textContent = '…';

    const tmo = ms => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
    const probe = async (path, timeout = 10000) => {
      try {
        const r = await fetch(API_BASE + path, { signal: tmo(timeout) });
        if (r.status === 404) throw new Error('Topilmadi (404)');
        if (r.status >= 500) throw new Error('Server xatosi (' + r.status + ')');
        return ['ok', 'Mavjud (' + r.status + ')'];
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('Vaqt tugadi');
        if (e.message === 'Failed to fetch') throw new Error("Ulanib bo'lmadi (CORS yoki server)");
        throw e;
      }
    };

    const steps = [
      ['Tarmoq ulanishi', async () => {
        if (!navigator.onLine) throw new Error("Internet yo'q");
        return ['ok', 'Ulangan'];
      }],
      ['Server (health)', async () => {
        const t = performance.now();
        const r = await fetch(API_BASE + '/api/health', { signal: tmo(20000) });
        const ms = Math.round(performance.now() - t);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (j.geminiConfigured === false) throw new Error("GEMINI_API_KEY o'rnatilmagan");
        return [ms > 6000 ? 'warn' : 'ok', (j.model || 'Gemini') + ' · ' + ms + ' ms'];
      }],
      ['Chat (sync)', () => probe('/api/chat')],
      ['Chat (stream)', () => probe('/api/chat/stream')],
      ['Rasm serveri', () => probe('/api/image')],
      ['Olmabek Codex', () => probe('/api/build-site')],
      ['Brauzer xotirasi', async () => {
        localStorage.setItem('_t', '1'); localStorage.removeItem('_t');
        return ['ok', 'Ishlaydi'];
      }],
      ['Ovozli yozish', async () => (SR ? ['ok', "Qo'llab-quvvatlanadi"] : ['warn', "Bu brauzerda yo'q"])]
    ];

    list.innerHTML = steps.map(x => '<div class="dg"><span class="material-symbols-outlined">radio_button_unchecked</span><div><b>' + x[0] + '</b><small>Kutilmoqda</small></div></div>').join('');
    const rows = list.querySelectorAll('.dg');
    let score = 0;

    for (let i = 0; i < steps.length; i++) {
      rows[i].className = 'dg run';
      rows[i].querySelector('.material-symbols-outlined').textContent = 'progress_activity';
      rows[i].querySelector('small').textContent = 'Tekshirilmoqda…';
      await new Promise(r => setTimeout(r, 500));
      let res;
      try { res = await steps[i][1](); }
      catch (e) { res = ['fail', e.name === 'AbortError' ? 'Vaqt tugadi' : (e.message === 'Failed to fetch' ? "Ulanib bo'lmadi" : e.message)]; }
      rows[i].className = 'dg ' + res[0];
      rows[i].querySelector('.material-symbols-outlined').textContent = { ok: 'check_circle', warn: 'warning', fail: 'cancel' }[res[0]];
      rows[i].querySelector('small').textContent = res[1];
      score += res[0] === 'ok' ? 1 : res[0] === 'warn' ? 0.6 : 0;
      gauge.style.setProperty('--gp', (score / steps.length * 100).toFixed(1));
    }

    const pct = Math.round(score / steps.length * 100);
    $('gaugeTxt').textContent = pct + '%';
    gauge.classList.add(pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad');
    toast(pct >= 80 ? "Tizim sog'lom" : pct >= 50 ? "Ba'zi muammolar bor" : 'Jiddiy muammolar bor');
    btn.disabled = false; btn.textContent = 'Qayta tekshirish';
    diagBusy = false;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && adminPanel.classList.contains('open') && !adminModal.classList.contains('active')) closeAdminPanel();
  });

  // ===== STOP / STREAM =====
  function setStopUI(on) {
    if (on) state.t0 = performance.now();
    sendBtn.classList.toggle('is-stop', on);
    const ic = sendBtn.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = on ? 'stop' : (state.inputMode === 'image' ? 'brush' : state.inputMode === 'codex' ? 'code' : 'arrow_upward');
    sendBtn.title = on ? "To'xtatish" : 'Yuborish';
  }
  function stopGeneration() { if (state.abort) state.abort.abort(); }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.isSending && !modal.classList.contains('active')) stopGeneration();
  });

  async function streamReply(text, el, dots, signal) {
    const payload = JSON.stringify({
      message: text,
      history: state.history.slice(-20),
      mode: 'chat',
      plan: getPlan(),
      user_id: getUserId(),
      is_admin: state.isAdmin,
      deep: !!state.deep,
      plain_stream: true
    });
    let res = null;
    try {
      res = await fetch(API_BASE + '/api/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal });
    } catch (e) { if (e.name === 'AbortError') throw e; }

    if (res && res.ok && res.body) {
      const span = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      el.appendChild(span); el.appendChild(cursor);
      if (el._avatar) el._avatar.classList.add('typing');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '', first = true;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (first) { clearInterval(dots._t); dots.remove(); first = false; }
          buf += dec.decode(value, { stream: true });
          el._raw = buf;
          span.innerHTML = md(buf);
          if (chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 150) chatArea.scrollTop = chatArea.scrollHeight;
        }
      } finally {
        if (first) { clearInterval(dots._t); dots.remove(); }
        cursor.remove();
        if (el._avatar) el._avatar.classList.remove('typing');
      }
      return buf || "Javob bo'sh qaytdi.";
    }
    const reply = await getReply(text, signal);
    clearInterval(dots._t); dots.remove();
    await streamInto(el, reply);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return reply;
  }

  // ===== VOICE =====
  const micBtn = $('micBtn');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  if (micBtn) micBtn.addEventListener('click', () => {
    if (!SR) { toast("Brauzer ovozli yozishni qo'llamaydi (Chrome tavsiya etiladi)"); return; }
    if (listening && rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'uz-UZ';
    rec.interimResults = true;
    const base = input.value;
    rec.onstart = () => { listening = true; micBtn.classList.add('listening'); composerInner.classList.add('voice'); };
    rec.onresult = e => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      input.value = (base ? base + ' ' : '') + t;
      autoResize();
      if (!state.isSending) sendBtn.disabled = !input.value.trim();
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed') toast('Mikrofonga ruxsat bering');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('Ovoz xatosi: ' + e.error);
    };
    rec.onend = () => { listening = false; micBtn.classList.remove('listening'); composerInner.classList.remove('voice'); input.focus(); };
    rec.start();
  });

  // ===== CURSOR LIGHT =====
  document.addEventListener('pointermove', e => {
    const t = e.target.closest('.hero-chip, .view-pricing .grid > div, .ap-card, .ln-card, .hx-card, .ux');
    if (t) {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', e.clientX - r.left + 'px');
      t.style.setProperty('--my', e.clientY - r.top + 'px');
    }
    document.documentElement.style.setProperty('--gx', e.clientX + 'px');
    document.documentElement.style.setProperty('--gy', e.clientY + 'px');
  }, { passive: true });

  // ===== AI CHAT =====
  async function getReply(text, signal) {
    let res;
    try {
      res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: state.history.slice(-20),
          mode: 'chat',
          plan: getPlan(),
          user_id: getUserId(),
          is_admin: state.isAdmin,
          deep: !!state.deep
        }),
        signal
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new Error("Serverga ulanib bo'lmadi");
    }
    if (!res.ok) {
      let detail = 'HTTP ' + res.status;
      try { const err = await res.json(); if (err.detail) detail = err.detail; else if (err.error) detail = err.error; } catch {}
      throw new Error(detail);
    }
    const data = await res.json();
    return data.reply || "Javob bo'sh qaytdi.";
  }

  async function sendMessage() {
    if (localStorage.getItem(AI_OFF_KEY) === '1' && !state.isAdmin) { toast("AI vaqtincha o'chirilgan"); return; }
    if (state.isSending || !state.user) return;
    if (!state.isAdmin && state.user.messagesLeft <= 0 && state.user.plan !== 'ultra') {
      openModal({ fromLimit: true });
      return;
    }
    const text = input.value.trim();
    if (!text) return;

    state.isSending = true;
    input.value = '';
    autoResize();
    sendBtn.disabled = false;
    setStopUI(true);

    if (!getCurrentChat()) createChat(text);
    pushMessage('user', text, 'text');
    state.history.push({ role: 'user', content: text });
    renderSavedText('user', text);
    scrollBottom();

    if (!state.isAdmin) {
      state.user.messagesLeft = Math.max(0, state.user.messagesLeft - 1);
      saveUser();
    }
    updateLimitUI();
    renderSidebar();

    const aiBody = renderSavedText('assistant', '');
    const dots = document.createElement('div');
    dots.className = 'think';
    dots.innerHTML = '<i class="think-orb"></i><b>O\'ylamoqda…</b>';
    const phrases = state.deep
      ? ["Chuqur o'ylamoqda…", 'Variantlarni solishtirmoqda…', 'Xulosa tuzmoqda…']
      : ["O'ylamoqda…", 'Tahlil qilmoqda…', 'Javob yozmoqda…'];
    let pi = 0;
    dots._t = setInterval(() => { pi = (pi + 1) % phrases.length; dots.querySelector('b').textContent = phrases[pi]; }, 2200);
    aiBody.appendChild(dots);
    scrollBottom();

    state.abort = new AbortController();
    try {
      const full = await streamReply(text, aiBody, dots, state.abort.signal);
      logReq({ mode: 'chat', text, ok: true });
      state.history.push({ role: 'assistant', content: full });
      pushMessage('assistant', full, 'text');
    } catch (err) {
      clearInterval(dots._t); dots.remove();
      if (err.name === 'AbortError') {
        const partial = (aiBody._raw || '').trim();
        aiBody.querySelectorAll('.typing-cursor').forEach(c => c.remove());
        if (aiBody._avatar) aiBody._avatar.classList.remove('typing');
        if (partial) {
          state.history.push({ role: 'assistant', content: partial });
          pushMessage('assistant', partial, 'text');
        } else {
          aiBody.textContent = "To'xtatildi.";
        }
      } else {
        logReq({ mode: 'chat', text, ok: false, err: err.message });
        const errMsg = '⚠️ Xatolik: ' + err.message;
        await streamInto(aiBody, errMsg);
        pushMessage('assistant', errMsg, 'text');
      }
    }

    state.isSending = false;
    state.abort = null;
    setStopUI(false);
    if (!state.isAdmin && state.user.messagesLeft <= 0 && state.user.plan !== 'ultra') {
      input.disabled = true;
      sendBtn.disabled = true;
      setTimeout(() => openModal({ fromLimit: true }), 400);
    } else {
      sendBtn.disabled = !input.value.trim();
      input.focus();
    }
  }

  // ===== IMAGE =====
  async function generateImage() {
    if (localStorage.getItem(AI_OFF_KEY) === '1' && !state.isAdmin) { toast("AI vaqtincha o'chirilgan"); return; }
    if (state.isSending || !state.user) return;
    if (!state.isAdmin && state.user.imagesLeft <= 0) {
      toast('Bugungi rasm limiti tugadi');
      openModal({ fromLimit: true });
      return;
    }
    const prompt = input.value.trim();
    if (!prompt) { toast('Rasm uchun matn yozing'); return; }

    state.isSending = true;
    input.value = '';
    autoResize();
    sendBtn.disabled = false;
    setStopUI(true);

    if (!getCurrentChat()) createChat(prompt);
    pushMessage('user', prompt, 'text');
    state.history.push({ role: 'user', content: prompt });
    renderSavedText('user', prompt);
    scrollBottom();
    renderSidebar();

    if (!state.isAdmin) {
      state.user.imagesLeft = Math.max(0, state.user.imagesLeft - 1);
      saveUser();
    }
    updateLimitUI();

    const body = appendImagePlaceholder(prompt);
    body._prompt = prompt;
    startForge(body);
    state.abort = new AbortController();

    try {
      const res = await fetch(API_BASE + '/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: withStyle(prompt) }),
        signal: state.abort.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Xato');
      if (!data.image) throw new Error('Rasm qaytmadi');
      replaceWithImage(body, data.image, prompt);
      pushMessage('assistant', data.image, 'image', { prompt });
    } catch (err) {
      replaceWithError(body, err.name === 'AbortError' ? "To'xtatildi" : err.message);
    }

    state.isSending = false;
    state.abort = null;
    setStopUI(false);
    if (!state.isAdmin && state.user.messagesLeft <= 0 && state.user.plan !== 'ultra') {
      input.disabled = true;
      sendBtn.disabled = true;
    } else {
      sendBtn.disabled = !input.value.trim();
      input.focus();
    }
  }

  // ===== NEW CHAT =====
  newChatBtn.addEventListener('click', () => {
    state.currentChatId = null;
    state.history = [];
    messages.innerHTML = '';
    input.value = '';
    autoResize();
    sendBtn.disabled = true;
    setInputMode('chat');
    chatArea.scrollTop = 0;
    renderSidebar();
    newHero();
    if (window.innerWidth <= 768) closeSidebar();
    if (!input.disabled) input.focus();
    toast('Yangi chat boshlandi');
  });

  // ===== SIDEBAR =====
  function openSidebar() {
    sidebar.classList.add('open');
    if (window.innerWidth <= 768) sidebarOver.classList.add('show');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOver.classList.remove('show');
  }
  menuBtn.addEventListener('click', openSidebar);
  sidebarOver.addEventListener('click', closeSidebar);
  collapseBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
    else sidebar.classList.toggle('collapsed');
  });

  // ===== MODAL =====
  function openModal({ fromLimit = false } = {}) {
    updateModalStatus(fromLimit);
    showModalView('pricing');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function updateModalStatus(fromLimit) {
    if (!state.user) return;
    currentPlan.textContent = PLANS[state.user.plan]?.name || 'Standart';
    currentLimit.textContent = state.isAdmin ? 'Cheksiz' : ((state.user.plan === 'ultra' ? 'Cheksiz xabar' : state.user.messagesLeft + ' xabar') + ' · ' + state.user.imagesLeft + ' rasm');
    limitWarning.classList.toggle('hidden', !fromLimit);
    limitWarning.classList.toggle('flex', fromLimit);
  }
  function showModalView(view) {
    document.querySelectorAll('.modal-view').forEach(v => v.classList.remove('active'));
    const t = document.querySelector('.view-' + view);
    if (t) t.classList.add('active');
  }
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
  accountBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
    openModal({ fromLimit: false });
  });

  // ===== PLAN =====
  document.querySelectorAll('.plan-btn').forEach(btn => {
    btn.addEventListener('click', () => selectPlan(btn.dataset.plan));
  });
  function selectPlan(key) {
    const plan = PLANS[key];
    if (!plan) return;
    if (state.user.plan === key) { toast('Bu tarif allaqachon faol'); return; }
    state.selectedPlan = key;
    if (plan.price === 0) {
      state.user.plan = 'standard';
      state.user.messagesLeft = LIMITS.standard;
      state.user.imagesLeft = IMG_LIMITS.standard;
      delete state.user.trialEndsAt;
      saveUser();
      updateUserUI();
      updateLimitUI();
      closeModal();
      return;
    }
    payPlanName.textContent = plan.name;
    payPlanPrice.textContent = plan.displayPrice + " so'm / oy";
    showModalView('payment');
  }
  backBtn.addEventListener('click', () => {
    showModalView('pricing');
    updateModalStatus(false);
  });
  if (trialBtn) {
    trialBtn.addEventListener('click', () => {
      if (!state.selectedPlan) return;
      const trialEnds = Date.now() + (2 * 24 * 60 * 60 * 1000);
      state.user.plan = state.selectedPlan;
      state.user.trialEndsAt = trialEnds;
      state.user.messagesLeft = LIMITS[state.selectedPlan];
      state.user.imagesLeft = IMG_LIMITS[state.selectedPlan];
      saveUser();
      updateUserUI();
      updateLimitUI();
      closeModal();
      planBurst(state.selectedPlan);
      toast(`🎉 2 kunlik bepul sinov faollashdi!`);
    });
  }
  function planBurst(key) {
    if (key === 'standard') return;
    const b = document.createElement('div');
    b.className = 'plan-burst';
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--a', i * 15 + 'deg');
      p.style.setProperty('--d', 180 + Math.random() * 320 + 'px');
      p.style.animationDelay = Math.random() * 0.25 + 's';
      b.appendChild(p);
    }
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 2200);
  }
  function activatePlan(key) {
    const plan = PLANS[key];
    if (!plan) return;
    state.user.plan = key;
    state.user.messagesLeft = LIMITS[key];
    state.user.imagesLeft = IMG_LIMITS[key];
    saveUser();
    updateUserUI();
    updateLimitUI();
    successText.textContent = plan.name + ' tarifi faollashtirildi. Chat ochildi.';
    showModalView('success');
    planBurst(key);
  }
  successBtn.addEventListener('click', () => {
    closeModal();
    if (!input.disabled) input.focus();
  });

  // ===== LOGOUT =====
  logoutBtn.addEventListener('click', () => {
    if (!confirm('Hisobdan chiqishni tasdiqlaysizmi?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_KEY);
    state.user = null;
    state.selectedPlan = null;
    state.isAdmin = false;
    state.history = [];
    state.currentChatId = null;
    messages.innerHTML = '';
    closeModal();
    appScreen.classList.add('hidden');
    appScreen.classList.remove('flex');
    landing.classList.add('show');
    authForm.reset();
    setAuthMode('login');
  });

  // ===== ADMIN =====
  adminBtn.addEventListener('click', () => {
    adminModal.classList.add('active');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => adminSubmit.focus(), 200);
  });
  document.querySelectorAll('[data-admin-close]').forEach(el => {
    el.addEventListener('click', () => {
      adminModal.classList.remove('active');
      adminModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      adminForm.reset();
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && adminModal.classList.contains('active')) {
      adminModal.classList.remove('active');
      adminModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      adminForm.reset();
    }
  });
  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    if (adminSubmit.classList.contains('loading')) return;
    const em = adminEmail.value.trim();
    const pw = adminPass.value;
    adminSubmit.classList.add('loading');
    adminSubmit.disabled = true;
    setTimeout(() => {
      const ok = em === ADMIN_USER && pw === ADMIN_PASS;
      adminSubmit.classList.remove('loading');
      adminSubmit.disabled = false;
      if (ok) {
        state.isAdmin = true;
        localStorage.setItem(ADMIN_KEY, 'true');
        adminModal.classList.remove('active');
        adminModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        adminForm.reset();
        if (modal.classList.contains('active')) closeModal();
        if (state.user) { updateUserUI(); updateLimitUI(); }
        openAdminPanel();
      } else {
        toast("Login yoki parol noto'g'ri");
        adminPass.value = '';
        adminPass.focus();
      }
    }, 400);
  });

  // ===== THEME =====
  function initTheme() {
    const html = document.documentElement;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') html.classList.remove('dark');
    else html.classList.add('dark');
    $('themeToggle').addEventListener('click', () => {
      html.classList.toggle('dark');
      localStorage.setItem(THEME_KEY, html.classList.contains('dark') ? 'dark' : 'light');
      syncSkin();
    });
  }

  // ===== INIT =====
  function init() {
    initTheme();
    $('chatSearch').addEventListener('input', renderSidebar);

    if (localStorage.getItem(ADMIN_KEY) === 'true') state.isAdmin = true;
    state.chats = loadChats();

    const saved = loadUser();
    if (saved && saved.email) {
      state.user = saved;
      if (!PLANS[state.user.plan]) state.user.plan = 'standard';

      if (state.user.trialEndsAt && Date.now() > state.user.trialEndsAt) {
        toast("Sinov muddati tugadi. Iltimos, tarifni xarid qiling.");
        state.user.plan = 'standard';
        delete state.user.trialEndsAt;
        state.user.messagesLeft = LIMITS.standard;
        state.user.imagesLeft = IMG_LIMITS.standard;
        saveUser();
      } else if (state.user.day !== today() || typeof state.user.imagesLeft !== 'number' || state.user.lv !== 3) {
        state.user.messagesLeft = LIMITS[state.user.plan] || 25;
        state.user.imagesLeft = IMG_LIMITS[state.user.plan];
        state.user.day = today();
        state.user.lv = 3;
        saveUser();
      } else if (typeof state.user.messagesLeft !== 'number') {
        state.user.messagesLeft = LIMITS[state.user.plan];
      }
      enterApp();
    } else {
      landing.classList.add('show');
      setAuthMode(localStorage.getItem('olmabek_seen') ? 'login' : 'register');
    }
    setInputMode('chat');
  }

  init();
})();