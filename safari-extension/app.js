/* ================================================================
   Tab Out — Dashboard App (Safari Extension Edition)

   No server required. All data stored in storage.local and
   localStorage. Tabs managed via direct tabs API.
   ================================================================ */

'use strict';

/* Safari uses browser.* namespace; Chrome uses chrome.* — support both */
const _api = typeof browser !== 'undefined' ? browser : chrome;

/* ----------------------------------------------------------------
   DARK MODE — apply immediately to prevent flash
   ---------------------------------------------------------------- */
if (localStorage.getItem('tabout-dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}

/* ----------------------------------------------------------------
   APP CONFIG — stored in _api.storage.local
   ---------------------------------------------------------------- */
let appConfig = {
  userName: '',
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  clockShowSeconds: false,
  clockFormat: '12',
  quoteText: '',
  quoteAuthor: '',
  useDynamicQuote: false,
  searchEngine: 'google',
  quickLinks: [],
};

const SEARCH_ENGINES = {
  google:     { name: 'Google',     action: 'https://www.google.com/search',       param: 'q' },
  bing:       { name: 'Bing',       action: 'https://www.bing.com/search',          param: 'q' },
  duckduckgo: { name: 'DuckDuckGo', action: 'https://duckduckgo.com/',              param: 'q' },
  brave:      { name: 'Brave',      action: 'https://search.brave.com/search',      param: 'q' },
  ecosia:     { name: 'Ecosia',     action: 'https://www.ecosia.org/search',        param: 'q' },
};

async function loadAppConfig() {
  try {
    const result = await _api.storage.local.get('tabout-config');
    if (result['tabout-config']) {
      appConfig = { ...appConfig, ...result['tabout-config'] };
    }
  } catch { /* use defaults */ }
}

async function saveAppConfig(updates) {
  appConfig = { ...appConfig, ...updates };
  await _api.storage.local.set({ 'tabout-config': appConfig });
  applyConfigToUI();
  showToast('Settings saved');
}

function applyConfigToUI() {
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = getGreeting();

  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = getDateDisplay();

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  if (searchForm && searchInput) {
    const engine = SEARCH_ENGINES[appConfig.searchEngine] || SEARCH_ENGINES.google;
    searchForm.action = engine.action;
    searchForm.method = 'get';
    searchInput.name = engine.param;
    searchInput.placeholder = `Search ${engine.name}...`;
  }

  resetPomodoro();
  renderQuickLinks();
}

const ICON_SUN  = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>';
const ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>';

/* ----------------------------------------------------------------
   QUICK LINKS
   ---------------------------------------------------------------- */
const DEFAULT_QUICK_LINKS = [
  { url: 'https://mail.google.com',   title: 'Gmail',    icon: 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=32' },
  { url: 'https://calendar.google.com', title: 'Calendar', icon: 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=32' },
  { url: 'https://github.com',         title: 'GitHub',   icon: 'https://github.com/favicon.ico' },
  { url: 'https://www.youtube.com',    title: 'YouTube',  icon: 'https://www.youtube.com/favicon.ico' },
  { url: 'https://claude.ai',          title: 'Claude',   icon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32' },
  { url: 'https://chatgpt.com',        title: 'ChatGPT',  icon: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32' },
];

function getQuickLinks() {
  if (appConfig.quickLinks && appConfig.quickLinks.length > 0) {
    return appConfig.quickLinks;
  }
  const saved = localStorage.getItem('tabout-quick-links-order');
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return DEFAULT_QUICK_LINKS;
}

function saveQuickLinksOrder(links) {
  localStorage.setItem('tabout-quick-links-order', JSON.stringify(links));
}

function renderQuickLinks() {
  const nav = document.getElementById('quickLinksNav');
  if (!nav) return;
  const links = getQuickLinks();
  nav.innerHTML = links.map((link, i) =>
    `<a href="${link.url}" class="quick-link" target="_top" title="${link.title}" draggable="true" data-link-index="${i}">
      <img src="${link.icon}" alt="${link.title}" class="quick-link-icon" onerror="this.style.display='none'">
    </a>`
  ).join('');
  initQuickLinkDrag();
}

function initQuickLinkDrag() {
  const nav = document.getElementById('quickLinksNav');
  if (!nav) return;
  let dragSrcIndex = null;

  nav.addEventListener('dragstart', (e) => {
    const link = e.target.closest('.quick-link');
    if (!link) return;
    dragSrcIndex = parseInt(link.dataset.linkIndex);
    link.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIndex);
  });

  nav.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.quick-link');
    nav.querySelectorAll('.quick-link').forEach(l => l.classList.remove('drag-over'));
    if (target) target.classList.add('drag-over');
  });

  nav.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.quick-link');
    if (target) target.classList.remove('drag-over');
  });

  nav.addEventListener('dragend', () => {
    nav.querySelectorAll('.quick-link').forEach(l => l.classList.remove('dragging', 'drag-over'));
  });

  nav.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.quick-link');
    if (!target) return;
    const dropIndex = parseInt(target.dataset.linkIndex);
    if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;
    const links = getQuickLinks();
    const [moved] = links.splice(dragSrcIndex, 1);
    links.splice(dropIndex, 0, moved);
    saveQuickLinksOrder(links);
    renderQuickLinks();
    showToast('Links reordered');
  });
}

/* ----------------------------------------------------------------
   DAILY QUOTES
   ---------------------------------------------------------------- */
const QUOTES = [
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Ship it.', author: 'Every startup ever' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Stay hungry. Stay foolish.', author: 'Steve Jobs' },
  { text: 'Your time is limited, don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupery' },
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Hard choices, easy life. Easy choices, hard life.', author: 'Jerzy Gregorek' },
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb' },
  { text: 'Focus is saying no to a thousand good ideas.', author: 'Steve Jobs' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'Be so good they can\'t ignore you.', author: 'Steve Martin' },
  { text: 'The obstacle is the way.', author: 'Ryan Holiday' },
  { text: 'Ideas are easy. Implementation is hard.', author: 'Guy Kawasaki' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

let _dynamicQuote = null;
let _dynamicQuoteTime = 0;

async function fetchDynamicQuote() {
  const CACHE_KEY = 'tabout-dynamic-quote';
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { quote, date } = JSON.parse(cached);
      const today = new Date().toDateString();
      if (date === today && quote) return quote;
    } catch { /* refetch */ }
  }

  try {
    const resp = await fetch('https://zenquotes.io/api/today');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data[0] && data[0].q) {
        const quote = { text: data[0].q, author: data[0].a };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ quote, date: new Date().toDateString() }));
        return quote;
      }
    }
  } catch { /* fall through */ }
  return null;
}

async function refreshQuote() {
  const quoteEl = document.getElementById('dailyQuote');
  if (!quoteEl) return;

  let text = '';
  let author = '';

  if (appConfig.useDynamicQuote) {
    const dynamic = await fetchDynamicQuote();
    if (dynamic) { text = dynamic.text; author = dynamic.author; }
  }

  if (!text) {
    if (appConfig.quoteText && appConfig.quoteText.trim()) {
      text = appConfig.quoteText.trim();
      author = (appConfig.quoteAuthor || '').trim();
    } else {
      const q = getDailyQuote();
      text = q.text;
      author = q.author;
    }
  }

  if (text) {
    quoteEl.innerHTML = `\u201c${text}\u201d${author ? ` <span class="quote-author">\u2014 ${author}</span>` : ''}`;
    quoteEl.style.display = 'block';
  } else {
    quoteEl.style.display = 'none';
  }
}

/* ----------------------------------------------------------------
   POMODORO TIMER
   ---------------------------------------------------------------- */
let pomodoroState = {
  running: false,
  secondsLeft: 25 * 60,
  isBreak: false,
  intervalId: null,
  lastTick: null,
};

function loadPomodoroState() {
  const saved = localStorage.getItem('tabout-pomodoro');
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    pomodoroState.secondsLeft = s.secondsLeft;
    pomodoroState.isBreak = s.isBreak;
    pomodoroState.running = s.running;
    pomodoroState.lastTick = s.lastTick;
    if (s.running && s.lastTick) {
      const elapsed = Math.floor((Date.now() - s.lastTick) / 1000);
      pomodoroState.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
    }
  } catch { /* ignore */ }
}

function savePomodoroState() {
  localStorage.setItem('tabout-pomodoro', JSON.stringify({
    secondsLeft: pomodoroState.secondsLeft,
    isBreak:     pomodoroState.isBreak,
    running:     pomodoroState.running,
    lastTick:    pomodoroState.running ? Date.now() : null,
  }));
}

function updatePomodoroDisplay() {
  const el = document.getElementById('pomodoroTime');
  if (!el) return;
  const m = Math.floor(pomodoroState.secondsLeft / 60);
  const s = pomodoroState.secondsLeft % 60;
  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  const container = document.getElementById('pomodoro');
  if (container) {
    container.classList.toggle('running',  pomodoroState.running && !pomodoroState.isBreak);
    container.classList.toggle('on-break', pomodoroState.running && pomodoroState.isBreak);
  }
}

function pomodoroTick() {
  pomodoroState.secondsLeft--;
  pomodoroState.lastTick = Date.now();
  if (pomodoroState.secondsLeft <= 0) {
    pomodoroState.running = false;
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
    if (pomodoroState.isBreak) {
      showToast('Break over! Time to focus.');
      pomodoroState.isBreak = false;
      pomodoroState.secondsLeft = (appConfig.pomodoroWorkMinutes || 25) * 60;
    } else {
      showToast('Time for a break!');
      pomodoroState.isBreak = true;
      pomodoroState.secondsLeft = (appConfig.pomodoroBreakMinutes || 5) * 60;
    }
    const btn = document.querySelector('[data-action="pomodoro-toggle"]');
    if (btn) btn.innerHTML = '&#9654;';
  }
  savePomodoroState();
  updatePomodoroDisplay();
}

function startPomodoro() {
  pomodoroState.running = true;
  pomodoroState.lastTick = Date.now();
  pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  const btn = document.querySelector('[data-action="pomodoro-toggle"]');
  if (btn) btn.innerHTML = '&#9646;&#9646;';
  savePomodoroState();
  updatePomodoroDisplay();
}

function pausePomodoro() {
  pomodoroState.running = false;
  clearInterval(pomodoroState.intervalId);
  pomodoroState.intervalId = null;
  const btn = document.querySelector('[data-action="pomodoro-toggle"]');
  if (btn) btn.innerHTML = '&#9654;';
  savePomodoroState();
  updatePomodoroDisplay();
}

function resetPomodoro() {
  pomodoroState.running = false;
  pomodoroState.isBreak = false;
  pomodoroState.secondsLeft = (appConfig.pomodoroWorkMinutes || 25) * 60;
  clearInterval(pomodoroState.intervalId);
  pomodoroState.intervalId = null;
  const btn = document.querySelector('[data-action="pomodoro-toggle"]');
  if (btn) btn.innerHTML = '&#9654;';
  savePomodoroState();
  updatePomodoroDisplay();
}

/* ----------------------------------------------------------------
   RECENTLY CLOSED TABS
   ---------------------------------------------------------------- */
function saveToRecentlyClosed(url, title) {
  const key = 'tabout-recently-closed';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift({ url, title, closedAt: new Date().toISOString() });
  if (list.length > 20) list.length = 20;
  localStorage.setItem(key, JSON.stringify(list));
}

function renderRecentlyClosed() {
  const section = document.getElementById('recentlyClosedSection');
  const list = JSON.parse(localStorage.getItem('tabout-recently-closed') || '[]');
  if (!section) return;
  if (list.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const countEl = document.getElementById('recentlyClosedCount');
  if (countEl) countEl.textContent = list.length;
  const listEl = document.getElementById('recentlyClosedList');
  if (!listEl) return;
  listEl.innerHTML = list.map((item, i) =>
    `<div class="archive-item">
      <a href="${item.url}" target="_top" class="archive-item-title" title="${item.title || item.url}">${item.title || item.url}</a>
      <span class="archive-item-date">${timeAgo(item.closedAt)}</span>
    </div>`
  ).join('');
}

/* ----------------------------------------------------------------
   WEATHER WIDGET
   ---------------------------------------------------------------- */
async function renderWeather() {
  const el = document.getElementById('weatherWidget');
  if (!el) return;
  try {
    const cacheKey = 'tabout-weather-v2';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        el.textContent = data.condition ? `${data.temp} · ${data.condition}` : data.temp;
        el.style.display = 'block';
        return;
      }
    }
    const resp = await fetch('https://wttr.in/?format=%t+%C');
    let text = (await resp.text()).trim();
    if (text.startsWith('<')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.querySelector('.term-container')?.textContent?.trim() || '';
    }
    const match = text.match(/^([+\-]?\d+°[CF])\s+(.+)$/);
    const result = match
      ? { temp: match[1], condition: match[2], timestamp: Date.now() }
      : { temp: text, condition: '', timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(result));
    el.textContent = result.condition ? `${result.temp} · ${result.condition}` : result.temp;
    el.style.display = 'block';
  } catch {
    el.style.display = 'none';
  }
}

/* ----------------------------------------------------------------
   CHROME TABS — Direct API Access
   ---------------------------------------------------------------- */
let openTabs = [];

async function fetchOpenTabs() {
  try {
    const newtabUrl = _api.runtime.getURL('index.html');
    const tabs = await _api.tabs.query({});
    openTabs = tabs.map(t => ({
      id:       t.id,
      url:      t.url,
      title:    t.title,
      favIconUrl: t.favIconUrl,
      windowId: t.windowId,
      active:   t.active,
      isTabOut: t.url === newtabUrl,
    }));
  } catch {
    openTabs = [];
  }
}

async function closeTabsByUrls(urls) {
  if (!urls || urls.length === 0) return;
  const targetHostnames = [];
  const exactUrls = new Set();
  for (const u of urls) {
    if (u.startsWith('file://')) {
      exactUrls.add(u);
    } else {
      try { targetHostnames.push(new URL(u).hostname); }
      catch { /* skip */ }
    }
  }
  const allTabs = await _api.tabs.query({});
  const toClose = allTabs.filter(tab => {
    const tabUrl = tab.url || '';
    if (tabUrl.startsWith('file://') && exactUrls.has(tabUrl)) return true;
    try {
      const tabHostname = new URL(tabUrl).hostname;
      return tabHostname && targetHostnames.includes(tabHostname);
    } catch { return false; }
  }).map(tab => tab.id);
  if (toClose.length > 0) await _api.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function closeTabsExact(urls) {
  if (!urls || urls.length === 0) return;
  const urlSet = new Set(urls);
  const allTabs = await _api.tabs.query({});
  const toClose = allTabs.filter(t => urlSet.has(t.url)).map(t => t.id);
  if (toClose.length > 0) await _api.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function focusTab(url) {
  if (!url) return;
  const allTabs = await _api.tabs.query({});
  const currentWindow = await _api.windows.getCurrent();
  let matches = allTabs.filter(t => t.url === url);
  if (matches.length === 0) {
    try {
      const targetHost = new URL(url).hostname;
      matches = allTabs.filter(t => {
        try { return new URL(t.url).hostname === targetHost; }
        catch { return false; }
      });
    } catch {}
  }
  if (matches.length === 0) return;
  const match = matches.find(t => t.windowId !== currentWindow.id) || matches[0];
  await _api.tabs.update(match.id, { active: true });
  await _api.windows.update(match.windowId, { focused: true });
}

async function closeDuplicateTabs(urls, keepOne = true) {
  const allTabs = await _api.tabs.query({});
  const toClose = [];
  for (const url of urls) {
    const matching = allTabs.filter(t => t.url === url);
    if (keepOne) {
      const keep = matching.find(t => t.active) || matching[0];
      for (const tab of matching) {
        if (tab.id !== keep.id) toClose.push(tab.id);
      }
    } else {
      for (const tab of matching) toClose.push(tab.id);
    }
  }
  if (toClose.length > 0) await _api.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function closeTabOutDupes() {
  const newtabUrl = _api.runtime.getURL('index.html');
  const allTabs = await _api.tabs.query({});
  const currentWindow = await _api.windows.getCurrent();
  const tabOutTabs = allTabs.filter(t => t.url === newtabUrl);
  if (tabOutTabs.length <= 1) return;
  const keep =
    tabOutTabs.find(t => t.active && t.windowId === currentWindow.id) ||
    tabOutTabs.find(t => t.active) ||
    tabOutTabs[0];
  const toClose = tabOutTabs.filter(t => t.id !== keep.id).map(t => t.id);
  if (toClose.length > 0) await _api.tabs.remove(toClose);
  await fetchOpenTabs();
}

/* ----------------------------------------------------------------
   SAVED FOR LATER — _api.storage.local
   Data shape: array of { id, url, title, savedAt, completed, completedAt, dismissed }
   ---------------------------------------------------------------- */
async function saveTabForLater(tab) {
  const result = await _api.storage.local.get('deferred');
  const deferred = result.deferred || [];
  deferred.push({
    id:        Date.now().toString() + Math.random().toString(36).slice(2, 6),
    url:       tab.url,
    title:     tab.title,
    savedAt:   new Date().toISOString(),
    completed: false,
    dismissed: false,
  });
  await _api.storage.local.set({ deferred });
}

async function getSavedTabs() {
  const result = await _api.storage.local.get('deferred');
  const deferred = result.deferred || [];
  const visible = deferred.filter(t => !t.dismissed);
  return {
    active:   visible.filter(t => !t.completed),
    archived: visible.filter(t =>  t.completed),
  };
}

async function checkOffSavedTab(id) {
  const result = await _api.storage.local.get('deferred');
  const deferred = result.deferred || [];
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.completed = true;
    tab.completedAt = new Date().toISOString();
    await _api.storage.local.set({ deferred });
  }
}

async function restoreSavedTab(id) {
  const result = await _api.storage.local.get('deferred');
  const deferred = result.deferred || [];
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.completed = false;
    tab.completedAt = null;
    await _api.storage.local.set({ deferred });
  }
}

async function dismissSavedTab(id) {
  const result = await _api.storage.local.get('deferred');
  const deferred = result.deferred || [];
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.dismissed = true;
    await _api.storage.local.set({ deferred });
  }
}

/* ----------------------------------------------------------------
   UI HELPERS
   ---------------------------------------------------------------- */
function playCloseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const duration = 0.25;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length;
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    setTimeout(() => ctx.close(), 500);
  } catch { /* no audio support */ }
}

function shootConfetti(x, y) {
  const colors = ['#c8713a','#e8a070','#5a7a62','#8aaa92','#5a6b7a','#8a9baa','#d4b896','#b35a5a'];
  for (let i = 0; i < 17; i++) {
    const el = document.createElement('div');
    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};border-radius:${isCircle ? '50%' : '2px'};pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:1;`;
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 80;
    const gravity = 200;
    const startTime = performance.now();
    const duration = 700 + Math.random() * 200;
    function frame(now) {
      const elapsed = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);
      if (progress >= 1) { el.remove(); return; }
      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const rotate = elapsed * 200 * (isCircle ? 0 : 1);
      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rotate}deg)`;
      el.style.opacity = opacity;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}

function animateCardOut(card) {
  if (!card) return;
  const rect = card.getBoundingClientRect();
  shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  card.classList.add('closing');
  setTimeout(() => {
    card.remove();
    checkAndShowEmptyState();
  }, 300);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const textEl = document.getElementById('toastText');
  if (!toast || !textEl) return;
  textEl.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

function checkAndShowEmptyState() {
  const missionsEl = document.getElementById('openTabsMissions');
  if (!missionsEl) return;
  const remaining = missionsEl.querySelectorAll('.mission-card:not(.closing)').length;
  if (remaining > 0) return;
  missionsEl.innerHTML = `
    <div class="missions-empty-state">
      <div class="empty-checkmark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div class="empty-title">Inbox: Zero</div>
    </div>`;
  const countEl = document.getElementById('openTabsSectionCount');
  if (countEl) countEl.textContent = '0 domains';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr);
  const now = new Date();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1)    return 'just now';
  if (diffMins < 60)   return diffMins + ' min ago';
  if (diffHours < 24)  return diffHours + ' hr' + (diffHours !== 1 ? 's' : '') + ' ago';
  if (diffDays === 1)  return 'yesterday';
  return diffDays + ' days ago';
}

function getGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12)      greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else                greeting = 'Good evening';
  if (appConfig.userName && appConfig.userName.trim()) {
    greeting += ', ' + appConfig.userName.trim();
  }
  return greeting;
}

function getDateDisplay() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ----------------------------------------------------------------
   DOMAIN & TITLE CLEANUP
   ---------------------------------------------------------------- */
const FRIENDLY_DOMAINS = {
  'github.com': 'GitHub',           'www.github.com': 'GitHub',
  'gist.github.com': 'GitHub Gist',
  'youtube.com': 'YouTube',         'www.youtube.com': 'YouTube',
  'music.youtube.com': 'YouTube Music',
  'x.com': 'X',                     'www.x.com': 'X',
  'twitter.com': 'X',               'www.twitter.com': 'X',
  'reddit.com': 'Reddit',           'www.reddit.com': 'Reddit',
  'old.reddit.com': 'Reddit',
  'substack.com': 'Substack',       'www.substack.com': 'Substack',
  'medium.com': 'Medium',           'www.medium.com': 'Medium',
  'linkedin.com': 'LinkedIn',       'www.linkedin.com': 'LinkedIn',
  'stackoverflow.com': 'Stack Overflow',
  'news.ycombinator.com': 'Hacker News',
  'google.com': 'Google',           'www.google.com': 'Google',
  'mail.google.com': 'Gmail',
  'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive',
  'calendar.google.com': 'Google Calendar',
  'meet.google.com': 'Google Meet',
  'gemini.google.com': 'Gemini',
  'chatgpt.com': 'ChatGPT',         'chat.openai.com': 'ChatGPT',
  'claude.ai': 'Claude',            'code.claude.com': 'Claude Code',
  'notion.so': 'Notion',            'www.notion.so': 'Notion',
  'figma.com': 'Figma',             'www.figma.com': 'Figma',
  'slack.com': 'Slack',             'app.slack.com': 'Slack',
  'discord.com': 'Discord',
  'wikipedia.org': 'Wikipedia',     'en.wikipedia.org': 'Wikipedia',
  'amazon.com': 'Amazon',           'www.amazon.com': 'Amazon',
  'netflix.com': 'Netflix',         'www.netflix.com': 'Netflix',
  'spotify.com': 'Spotify',         'open.spotify.com': 'Spotify',
  'vercel.com': 'Vercel',
  'npmjs.com': 'npm',               'www.npmjs.com': 'npm',
  'developer.mozilla.org': 'MDN',
  'arxiv.org': 'arXiv',
  'huggingface.co': 'Hugging Face',
  'producthunt.com': 'Product Hunt',
  'local-files': 'Local Files',
};

function getTabFavicon(tab) {
  if (tab.favIconUrl) return tab.favIconUrl;
  try {
    const domain = new URL(tab.url).hostname;
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
  } catch { return ''; }
}

function friendlyDomain(hostname) {
  if (!hostname) return '';
  if (FRIENDLY_DOMAINS[hostname]) return FRIENDLY_DOMAINS[hostname];
  if (hostname === 'local-files') return 'Local Files';
  if (/^[a-z]{32}$/.test(hostname)) return 'Extensions';
  if (hostname.endsWith('.substack.com') && hostname !== 'substack.com') {
    return capitalize(hostname.replace('.substack.com', '')) + "'s Substack";
  }
  if (hostname.endsWith('.github.io')) {
    return capitalize(hostname.replace('.github.io', '')) + ' (GitHub Pages)';
  }
  let clean = hostname
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|ai|dev|app|so|me|xyz|info|us|uk|co\.uk|co\.jp)$/, '');
  return clean.split('.').map(capitalize).join(' ');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripTitleNoise(title) {
  if (!title) return '';
  title = title.replace(/^\(\d+\+?\)\s*/, '');
  title = title.replace(/\s*\([\d,]+\+?\)\s*/g, ' ');
  title = title.replace(/\s*[\-\u2010\u2011\u2012\u2013\u2014\u2015]\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/\s+on X:\s*/, ': ');
  title = title.replace(/\s*\/\s*X\s*$/, '');
  return title.trim();
}

function cleanTitle(title, hostname) {
  if (!title || !hostname) return title || '';
  const friendly = friendlyDomain(hostname);
  const domain = hostname.replace(/^www\./, '');
  const separators = [' - ', ' | ', ' — ', ' · ', ' – '];
  for (const sep of separators) {
    const idx = title.lastIndexOf(sep);
    if (idx === -1) continue;
    const suffix = title.slice(idx + sep.length).trim().toLowerCase();
    if (
      suffix === domain.toLowerCase() ||
      suffix === friendly.toLowerCase() ||
      suffix === domain.replace(/\.\w+$/, '').toLowerCase() ||
      domain.toLowerCase().includes(suffix) ||
      friendly.toLowerCase().includes(suffix)
    ) {
      const cleaned = title.slice(0, idx).trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return title;
}

function smartTitle(title, url) {
  if (!url) return title || '';
  let pathname = '', hostname = '';
  try { const u = new URL(url); pathname = u.pathname; hostname = u.hostname; }
  catch { return title || ''; }
  const titleIsUrl = !title || title === url || title.startsWith(hostname) || title.startsWith('http');
  if ((hostname === 'x.com' || hostname === 'twitter.com') && pathname.includes('/status/')) {
    const username = pathname.split('/')[1];
    if (username) return titleIsUrl ? `Post by @${username}` : title;
  }
  if (hostname === 'github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo] = parts;
      if (parts[2] === 'issues' && parts[3]) return `${owner}/${repo} Issue #${parts[3]}`;
      if (parts[2] === 'pull'   && parts[3]) return `${owner}/${repo} PR #${parts[3]}`;
      if (parts[2] === 'blob' || parts[2] === 'tree') return `${owner}/${repo} — ${parts.slice(4).join('/')}`;
      if (titleIsUrl) return `${owner}/${repo}`;
    }
  }
  if ((hostname === 'www.youtube.com' || hostname === 'youtube.com') && pathname === '/watch') {
    if (titleIsUrl) return 'YouTube Video';
  }
  if ((hostname === 'www.reddit.com' || hostname === 'reddit.com') && pathname.includes('/comments/')) {
    const parts = pathname.split('/').filter(Boolean);
    const subIdx = parts.indexOf('r');
    if (subIdx !== -1 && parts[subIdx + 1]) {
      if (titleIsUrl) return `r/${parts[subIdx + 1]} post`;
    }
  }
  return title || url;
}

/* ----------------------------------------------------------------
   SVG ICONS
   ---------------------------------------------------------------- */
const ICONS = {
  tabs:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18" /></svg>`,
  close:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
};

/* ----------------------------------------------------------------
   LANDING PAGE PATTERNS
   ---------------------------------------------------------------- */
const LANDING_PAGE_PATTERNS = (typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined')
  ? LOCAL_LANDING_PAGE_PATTERNS
  : [
    { hostname: 'mail.google.com',    test: (p, h) => !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/') },
    { hostname: 'x.com',              pathExact: ['/home'] },
    { hostname: 'www.linkedin.com',   pathExact: ['/'] },
    { hostname: 'github.com',         pathExact: ['/'] },
    { hostname: 'www.youtube.com',    pathExact: ['/'] },
  ];

function isLandingPage(url) {
  try {
    const parsed = new URL(url);
    return LANDING_PAGE_PATTERNS.some(p => {
      if (parsed.hostname !== p.hostname) return false;
      if (p.test)      return p.test(parsed.pathname, url);
      if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
      if (p.pathExact)  return p.pathExact.includes(parsed.pathname);
      return parsed.pathname === '/';
    });
  } catch { return false; }
}

/* ----------------------------------------------------------------
   IN-MEMORY STORE
   ---------------------------------------------------------------- */
let domainGroups = [];

function getRealTabs() {
  return openTabs.filter(t => {
    const url = t.url || '';
    return (
      !url.startsWith('chrome://') &&
      !url.startsWith('about:') &&
      !url.startsWith('edge://') &&
      !url.startsWith('brave://') &&
      !url.startsWith('safari-web-extension://') &&
      !t.isTabOut
    );
  });
}

function checkTabOutDupes() {
  const tabOutTabs = openTabs.filter(t => t.isTabOut);
  const banner = document.getElementById('tabOutDupeBanner');
  const countEl = document.getElementById('tabOutDupeCount');
  if (!banner) return;
  if (tabOutTabs.length > 1) {
    if (countEl) countEl.textContent = tabOutTabs.length;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

/* ----------------------------------------------------------------
   DOMAIN CARD RENDERER
   ---------------------------------------------------------------- */
function buildOverflowChips(hiddenTabs, urlCounts = {}) {
  const hiddenChips = hiddenTabs.map(tab => {
    const label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    const count = urlCounts[tab.url] || 1;
    const dupeTag = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    const faviconUrl = getTabFavicon(tab);
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="Save for later">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="Close this tab">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="page-chips-overflow" style="display:none">${hiddenChips}</div>
    <div class="page-chip page-chip-overflow clickable" data-action="expand-chips">
      <span class="chip-text">+${hiddenTabs.length} more</span>
    </div>`;
}

function renderDomainCard(group) {
  const tabs = group.tabs || [];
  const tabCount = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');

  const urlCounts = {};
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes = dupeUrls.length > 0;
  const totalExtras = dupeUrls.reduce((s, [, c]) => s + c - 1, 0);

  const tabBadge = `<span class="open-tabs-badge">${ICONS.tabs}${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>`;
  const dupeBadge = hasDupes
    ? `<span class="open-tabs-badge" style="color:var(--accent-amber);background:rgba(200,113,58,0.08)">${totalExtras} duplicate${totalExtras !== 1 ? 's' : ''}</span>`
    : '';

  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) {
    if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); }
  }
  const visibleTabs = uniqueTabs.slice(0, 8);
  const extraCount = uniqueTabs.length - visibleTabs.length;

  const pageChips = visibleTabs.map(tab => {
    let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), group.domain);
    try {
      const parsed = new URL(tab.url);
      if (parsed.hostname === 'localhost' && parsed.port) label = `${parsed.port} ${label}`;
    } catch {}
    const count = urlCounts[tab.url];
    const dupeTag = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    const faviconUrl = getTabFavicon(tab);
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="Save for later">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="Close this tab">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('') + (extraCount > 0 ? buildOverflowChips(uniqueTabs.slice(8), urlCounts) : '');

  let actionsHtml = `
    <button class="action-btn close-tabs" data-action="close-domain-tabs" data-domain-id="${stableId}">
      ${ICONS.close} Close all ${tabCount} tab${tabCount !== 1 ? 's' : ''}
    </button>`;

  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    actionsHtml += `
      <button class="action-btn" data-action="dedup-keep-one" data-dupe-urls="${dupeUrlsEncoded}">
        Close ${totalExtras} duplicate${totalExtras !== 1 ? 's' : ''}
      </button>`;
  }

  return `
    <div class="mission-card domain-card ${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="mission-content">
        <div class="mission-top">
          <span class="mission-name">${isLanding ? 'Homepages' : friendlyDomain(group.domain)}</span>
          ${tabBadge}${dupeBadge}
        </div>
        <div class="mission-pages">${pageChips}</div>
        <div class="actions">${actionsHtml}</div>
      </div>
    </div>`;
}

/* ----------------------------------------------------------------
   DEFERRED COLUMN RENDERER
   ---------------------------------------------------------------- */
async function renderDeferredColumn() {
  const column   = document.getElementById('deferredColumn');
  const list     = document.getElementById('deferredList');
  const empty    = document.getElementById('deferredEmpty');
  const countEl  = document.getElementById('deferredCount');
  const archiveEl      = document.getElementById('deferredArchive');
  const archiveCountEl = document.getElementById('archiveCount');
  const archiveList    = document.getElementById('archiveList');

  if (!column) return;

  const { active, archived } = await getSavedTabs();

  if (active.length === 0 && archived.length === 0) {
    column.style.display = 'none';
    return;
  }

  column.style.display = 'block';

  if (active.length > 0) {
    countEl.textContent = `${active.length} item${active.length !== 1 ? 's' : ''}`;
    list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
    list.style.display = 'block';
    empty.style.display = 'none';
  } else {
    list.style.display = 'none';
    countEl.textContent = '';
    empty.style.display = 'block';
  }

  if (archived.length > 0) {
    archiveCountEl.textContent = `(${archived.length})`;
    archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
    archiveEl.style.display = 'block';
  } else {
    archiveEl.style.display = 'none';
  }
}

function renderDeferredItem(item) {
  let domain = '';
  try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  const ago = timeAgo(item.savedAt);
  const safeTitle = (item.title || '').replace(/"/g, '&quot;');
  return `
    <div class="deferred-item" data-deferred-id="${item.id}">
      <input type="checkbox" class="deferred-checkbox" data-action="check-deferred" data-deferred-id="${item.id}">
      <div class="deferred-info">
        <a href="${item.url}" target="_top" class="deferred-title" title="${safeTitle}">
          <img src="${faviconUrl}" alt="" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px" onerror="this.style.display='none'">${item.title || item.url}
        </a>
        <div class="deferred-meta">
          <span>${domain}</span>
          <span>${ago}</span>
        </div>
      </div>
      <button class="deferred-dismiss" data-action="dismiss-deferred" data-deferred-id="${item.id}" title="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

function renderArchiveItem(item) {
  const ago = item.completedAt ? timeAgo(item.completedAt) : timeAgo(item.savedAt);
  const safeTitle = (item.title || '').replace(/"/g, '&quot;');
  return `
    <div class="archive-item clickable" data-action="restore-deferred" data-deferred-id="${item.id}" title="Restore to Saved for Later">
      <span class="archive-item-title">${item.title || item.url}</span>
      <span class="archive-item-date">${ago}</span>
    </div>`;
}

/* ----------------------------------------------------------------
   MAIN DASHBOARD RENDERER
   ---------------------------------------------------------------- */
async function renderStaticDashboard() {
  // Header
  const greetingEl = document.getElementById('greeting');
  const dateEl     = document.getElementById('dateDisplay');
  if (greetingEl) greetingEl.textContent = getGreeting();
  if (dateEl)     dateEl.textContent     = getDateDisplay();

  // Live clock
  const clockEl = document.getElementById('headerClock');
  if (clockEl) {
    function updateClock() {
      const opts = { hour: 'numeric', minute: '2-digit', hour12: appConfig.clockFormat !== '24' };
      if (appConfig.clockShowSeconds) opts.second = '2-digit';
      clockEl.textContent = new Date().toLocaleTimeString('en-US', opts);
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Quick links
  renderQuickLinks();

  // Weather (non-blocking)
  renderWeather();

  // Pomodoro
  loadPomodoroState();
  updatePomodoroDisplay();
  if (pomodoroState.running && pomodoroState.secondsLeft > 0) {
    startPomodoro();
  }

  await refreshDynamicContent();
}

async function refreshDynamicContent() {
  refreshQuote();

  await fetchOpenTabs();
  const realTabs = getRealTabs();

  // Group tabs by domain
  domainGroups = [];
  const groupMap = {};
  const landingTabs = [];

  for (const tab of realTabs) {
    try {
      if (isLandingPage(tab.url)) { landingTabs.push(tab); continue; }
      let hostname;
      if (tab.url && tab.url.startsWith('file://')) {
        hostname = 'local-files';
      } else {
        hostname = new URL(tab.url).hostname;
      }
      if (!hostname) continue;
      if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
      groupMap[hostname].tabs.push(tab);
    } catch { /* skip malformed */ }
  }

  if (landingTabs.length > 0) {
    groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };
  }

  const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname));
  domainGroups = Object.values(groupMap).sort((a, b) => {
    const aIsLanding = a.domain === '__landing-pages__';
    const bIsLanding = b.domain === '__landing-pages__';
    if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;
    const aIsPriority = landingHostnames.has(a.domain);
    const bIsPriority = landingHostnames.has(b.domain);
    if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;
    return b.tabs.length - a.tabs.length;
  });

  // Render domain cards
  const openTabsSection      = document.getElementById('openTabsSection');
  const openTabsMissionsEl   = document.getElementById('openTabsMissions');
  const openTabsSectionCount = document.getElementById('openTabsSectionCount');

  if (domainGroups.length > 0 && openTabsSection) {
    openTabsSectionCount.innerHTML = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${realTabs.length} tabs</button>`;
    openTabsMissionsEl.innerHTML = domainGroups.map(g => renderDomainCard(g)).join('');
    openTabsSection.style.display = 'block';
  } else if (openTabsSection) {
    openTabsSection.style.display = 'none';
  }

  // Update stat count in heading
  const statTabs = document.getElementById('statTabs');
  if (statTabs) statTabs.textContent = openTabs.length;

  checkTabOutDupes();
  await renderDeferredColumn();
  renderRecentlyClosed();
}

async function renderDashboard() {
  await loadAppConfig();
  applyConfigToUI();
  initSettingsPanel();
  await renderStaticDashboard();
}

/* ----------------------------------------------------------------
   EVENT HANDLERS
   ---------------------------------------------------------------- */
document.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  // Pomodoro
  if (action === 'pomodoro-toggle') {
    if (pomodoroState.running) pausePomodoro(); else startPomodoro();
    return;
  }
  if (action === 'pomodoro-reset') { resetPomodoro(); return; }

  // Clear recently closed
  if (action === 'clear-recently-closed') {
    localStorage.removeItem('tabout-recently-closed');
    renderRecentlyClosed();
    showToast('Cleared recently closed tabs');
    return;
  }

  // Close duplicate Tab Out tabs
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast('Closed extra Tab Out tabs');
    return;
  }

  // Expand overflow chips
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) { overflowContainer.style.display = 'contents'; actionEl.remove(); }
    return;
  }

  // Focus a tab
  if (action === 'focus-tab') {
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // Close a single tab
  if (action === 'close-single-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;
    const chip = actionEl.closest('.page-chip');
    const chipTitle = chip ? (chip.querySelector('.chip-text')?.textContent || tabUrl) : tabUrl;
    saveToRecentlyClosed(tabUrl, chipTitle);
    await closeTabsExact([tabUrl]);
    playCloseSound();
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        document.querySelectorAll('.mission-card').forEach(c => {
          const remainingTabs = c.querySelectorAll('.page-chip[data-action="focus-tab"]');
          if (remainingTabs.length === 0) animateCardOut(c);
        });
      }, 200);
    }
    showToast('Tab closed');
    renderRecentlyClosed();
    return;
  }

  // Save a single tab for later
  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl   = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;
    await saveTabForLater({ url: tabUrl, title: tabTitle });
    await closeTabsExact([tabUrl]);
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.8)';
      setTimeout(() => chip.remove(), 200);
    }
    showToast('Saved for later');
    await renderDeferredColumn();
    return;
  }

  // Check off a saved tab
  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;
    await checkOffSavedTab(id);
    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('checked');
      setTimeout(() => {
        item.classList.add('removing');
        setTimeout(() => { item.remove(); renderDeferredColumn(); }, 300);
      }, 800);
    }
    return;
  }

  // Restore an archived tab back to active
  if (action === 'restore-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;
    await restoreSavedTab(id);
    const item = actionEl.closest('.archive-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => { item.remove(); renderDeferredColumn(); }, 300);
    }
    showToast('Moved back to Saved for Later');
    return;
  }

  // Dismiss a saved tab
  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;
    await dismissSavedTab(id);
    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => { item.remove(); renderDeferredColumn(); }, 300);
    }
    return;
  }

  const card = actionEl.closest('.mission-card');

  // Close all tabs in a domain group
  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group = domainGroups.find(g => 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId);
    if (!group) return;
    const urls = group.tabs.map(t => t.url);
    group.tabs.forEach(t => saveToRecentlyClosed(t.url, t.title || t.url));
    if (group.domain === '__landing-pages__') {
      await closeTabsExact(urls);
    } else {
      await closeTabsByUrls(urls);
    }
    if (card) { playCloseSound(); animateCardOut(card); }
    const idx = domainGroups.indexOf(group);
    if (idx !== -1) domainGroups.splice(idx, 1);
    const groupLabel = group.domain === '__landing-pages__' ? 'Homepages' : friendlyDomain(group.domain);
    showToast(`Closed ${urls.length} tab${urls.length !== 1 ? 's' : ''} from ${groupLabel}`);
    renderRecentlyClosed();
    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // Close duplicate tabs, keep one
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;
    await closeDuplicateTabs(urls, true);
    playCloseSound();
    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity = '0';
    setTimeout(() => actionEl.remove(), 200);
    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => {
        b.style.transition = 'opacity 0.2s'; b.style.opacity = '0';
        setTimeout(() => b.remove(), 200);
      });
      card.querySelectorAll('.open-tabs-badge').forEach(badge => {
        if (badge.textContent.includes('duplicate')) {
          badge.style.transition = 'opacity 0.2s'; badge.style.opacity = '0';
          setTimeout(() => badge.remove(), 200);
        }
      });
      card.classList.remove('has-amber-bar');
      card.classList.add('has-neutral-bar');
    }
    showToast('Closed duplicates, kept one copy each');
    return;
  }

  // Close all open tabs
  if (action === 'close-all-open-tabs') {
    const allUrls = openTabs
      .filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('safari') && !t.url.startsWith('about:'))
      .map(t => t.url);
    await closeTabsByUrls(allUrls);
    playCloseSound();
    document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
      shootConfetti(
        c.getBoundingClientRect().left + c.offsetWidth / 2,
        c.getBoundingClientRect().top + c.offsetHeight / 2
      );
      animateCardOut(c);
    });
    showToast('All tabs closed. Fresh start.');
    return;
  }
});

// Archive toggle
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;
  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
});

// Recently closed toggle
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#recentlyClosedToggle');
  if (!toggle) return;
  toggle.classList.toggle('open');
  const body = document.getElementById('recentlyClosedBody');
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
});

// Archive search (filter in memory)
document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;
  const q = e.target.value.trim().toLowerCase();
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;
  const { archived } = await getSavedTabs();
  const results = q.length >= 2
    ? archived.filter(t => (t.title || '').toLowerCase().includes(q) || (t.url || '').toLowerCase().includes(q))
    : archived;
  archiveList.innerHTML = results.map(item => renderArchiveItem(item)).join('')
    || (q.length >= 2 ? '<div style="font-size:12px;color:var(--muted);padding:8px 0">No results</div>' : '');
});

/* ----------------------------------------------------------------
   SETTINGS PANEL
   ---------------------------------------------------------------- */
function initSettingsPanel() {
  const toggle  = document.getElementById('settingsToggle');
  const overlay = document.getElementById('settingsOverlay');
  const close   = document.getElementById('settingsClose');
  const save    = document.getElementById('settingsSave');
  if (!toggle || !overlay) return;

  toggle.addEventListener('click', () => {
    populateSettingsForm();
    overlay.style.display = 'flex';
  });

  close.addEventListener('click', () => { overlay.style.display = 'none'; });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  save.addEventListener('click', async () => {
    const updates = {
      userName:             document.getElementById('settingUserName').value.trim(),
      pomodoroWorkMinutes:  parseInt(document.getElementById('settingWorkMin').value, 10) || 25,
      pomodoroBreakMinutes: parseInt(document.getElementById('settingBreakMin').value, 10) || 5,
      clockShowSeconds:     document.getElementById('settingShowSeconds').checked,
      clockFormat:          document.getElementById('settingClockFormat').value,
      useDynamicQuote:      document.getElementById('settingUseDynamicQuote').checked,
      quoteText:            document.getElementById('settingQuoteText').value,
      quoteAuthor:          document.getElementById('settingQuoteAuthor').value.trim(),
      searchEngine:         document.getElementById('settingSearchEngine').value,
    };
    await saveAppConfig(updates);
    overlay.style.display = 'none';
  });

  const themeBtnDark  = document.getElementById('themeBtnDark');
  const themeBtnLight = document.getElementById('themeBtnLight');

  function syncThemeBtns() {
    const isDark = document.body.classList.contains('dark-mode');
    themeBtnDark?.classList.toggle('active', isDark);
    themeBtnLight?.classList.toggle('active', !isDark);
  }

  themeBtnDark?.addEventListener('click', () => {
    document.body.classList.add('dark-mode');
    localStorage.setItem('tabout-dark-mode', 'true');
    syncThemeBtns();
  });

  themeBtnLight?.addEventListener('click', () => {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('tabout-dark-mode', 'false');
    syncThemeBtns();
  });

  toggle.addEventListener('click', syncThemeBtns);

  const addBtn = document.getElementById('settingsAddLink');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const title = document.getElementById('settingsNewLinkTitle').value.trim();
      const url   = document.getElementById('settingsNewLinkUrl').value.trim();
      if (!url) return;
      let host = '';
      try { host = new URL(url).hostname; } catch {}
      const icon = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=32` : '';
      const current = [...getQuickLinks()];
      current.push({ url, title: title || host || url, icon: icon || '' });
      await saveAppConfig({ quickLinks: current });
      document.getElementById('settingsNewLinkTitle').value = '';
      document.getElementById('settingsNewLinkUrl').value = '';
      renderSettingsQuickLinks();
    });
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="remove-quick-link"]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.linkIndex, 10);
    const current = [...getQuickLinks()];
    current.splice(idx, 1);
    await saveAppConfig({ quickLinks: current });
    renderSettingsQuickLinks();
  });
}

function populateSettingsForm() {
  const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const c = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  f('settingUserName',    appConfig.userName || '');
  f('settingWorkMin',     appConfig.pomodoroWorkMinutes);
  f('settingBreakMin',    appConfig.pomodoroBreakMinutes);
  f('settingClockFormat', appConfig.clockFormat);
  f('settingSearchEngine',appConfig.searchEngine);
  f('settingQuoteText',   appConfig.quoteText || '');
  f('settingQuoteAuthor', appConfig.quoteAuthor || '');
  c('settingShowSeconds', appConfig.clockShowSeconds);
  c('settingUseDynamicQuote', appConfig.useDynamicQuote);

  const manualFields = document.getElementById('manualQuoteFields');
  if (manualFields) {
    manualFields.style.opacity       = appConfig.useDynamicQuote ? '0.4' : '1';
    manualFields.style.pointerEvents = appConfig.useDynamicQuote ? 'none' : 'auto';
  }
  const dynamicToggle = document.getElementById('settingUseDynamicQuote');
  if (dynamicToggle) {
    dynamicToggle.addEventListener('change', () => {
      if (manualFields) {
        manualFields.style.opacity       = dynamicToggle.checked ? '0.4' : '1';
        manualFields.style.pointerEvents = dynamicToggle.checked ? 'none' : 'auto';
      }
    });
  }

  renderSettingsQuickLinks();
}

function renderSettingsQuickLinks() {
  const container = document.getElementById('settingsQuickLinksList');
  if (!container) return;
  const links = getQuickLinks();
  if (links.length === 0) {
    container.innerHTML = '<div class="settings-hint" style="text-align:center;padding:8px 0">No quick links yet. Add one below.</div>';
    return;
  }
  container.innerHTML = links.map((link, i) =>
    `<div class="settings-quick-link-item" data-link-index="${i}">
      <img src="${link.icon || ''}" alt="" class="settings-quick-link-icon" onerror="this.style.display='none'">
      <span class="settings-quick-link-title">${link.title}</span>
      <span class="settings-quick-link-url">${link.url}</span>
      <button class="settings-quick-link-remove" data-action="remove-quick-link" data-link-index="${i}" title="Remove">&times;</button>
    </div>`
  ).join('');
}

/* ----------------------------------------------------------------
   INITIALIZE
   ---------------------------------------------------------------- */
renderDashboard();

// Auto-refresh every 30 seconds
setInterval(refreshDynamicContent, 30 * 1000);
