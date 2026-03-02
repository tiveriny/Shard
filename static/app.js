/* Shard — app.js — build 12 */
const state = {
  wordlist: [],
  keys: null,
  token: null,
  me: null,
  contacts: [],
  activeContact: null,
  poller: null,
  lastSeen: {},
  fetching: false,
  sse: null,
  sseConnected: false,
  lastGlobal: 0,
  apiMode: null,
  apiProbe: null,
  pendingMessages: {},
  resolvingContacts: {},
  messageCache: {},
  searchQuery: '',
  replyTarget: null,
  staySigned: false,
  renderedIds: new Set(),
  contextTarget: null,
};

const elements = {};

function $(id) { return document.getElementById(id); }

function initElements() {
  const ids = [
    'app', 'autoLogoutBanner', 'inAppNotifications', 'mediaViewer', 'mediaViewerImg',
    'authModal', 'staySignedToggle', 'mnemonicInput', 'displayNameInput', 'generateBtn',
    'unlockBtn', 'generatedBox', 'generatedMnemonic', 'copyMnemonic', 'rememberToggle',
    'meName', 'meId', 'copyContact', 'copyContactSecondary', 'focusContactInput',
    'contacts', 'contactsEmpty', 'contactCodeInput', 'saveContact', 'emptyState',
    'chatView', 'chatName', 'chatStatus', 'chatSearch', 'replyPreview', 'replyText',
    'replyCancel', 'sessionStatus', 'messages', 'messageInput', 'sendBtn', 'fileInput',
    'filePill', 'lockBtn', 'toast', 'msgContextMenu', 'reactionPicker', 'globalSearchInput',
  ];
  ids.forEach(id => { elements[id] = $(id); });
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const API_MODES = { PATH: 'path', PHP: 'php' };
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'];

function encodeBase64(bytes) { return nacl.util.encodeBase64(bytes); }
function decodeBase64(text) { return nacl.util.decodeBase64(text); }
function encodeText(text) { return textEncoder.encode(text); }
function decodeText(bytes) { return textDecoder.decode(bytes); }
function numId(v) { return typeof v === 'number' ? v : parseInt(v, 10); }

function apiRoute(path) {
  if (!path || !path.startsWith('/api')) return path;
  if (state.apiMode !== API_MODES.PHP) return path;
  const [base, qs] = path.split('?');
  const route = base.replace(/^\/api\/?/, '');
  const normalized = route.replace(/^\/+/, '');
  const prefix = `api.php?r=${encodeURIComponent(normalized)}`;
  return qs ? `${prefix}&${qs}` : prefix;
}

function buildUrl(path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.replace(/^\/+/, '');
}

function normalizeApiMode(value) {
  if (!value) return null;
  const l = String(value).trim().toLowerCase();
  if (l === 'php') return API_MODES.PHP;
  if (l === 'path' || l === 'api') return API_MODES.PATH;
  return null;
}

function getConfiguredApiMode() {
  const explicit = normalizeApiMode(window.SHARD_API_MODE);
  if (explicit) return explicit;
  const meta = document.querySelector('meta[name="shard-api-mode"]');
  return normalizeApiMode(meta && meta.content);
}

async function probeApiMode(mode) {
  const url = mode === API_MODES.PHP ? 'api.php?r=health' : '/api/health';
  try {
    const r = await fetch(buildUrl(url), { cache: 'no-store' });
    if (!r.ok) return false;
    const t = await r.text();
    if (!t) return false;
    try { JSON.parse(t); return true; } catch { return false; }
  } catch { return false; }
}

async function ensureApiMode() {
  if (state.apiMode) return state.apiMode;
  const configured = getConfiguredApiMode();
  if (configured) { state.apiMode = configured; return state.apiMode; }

  // Default to PHP mode for this environment since we know it runs on `api.php`
  state.apiMode = API_MODES.PHP;
  return state.apiMode;
}

function parseJsonSafe(text) { if (!text) return null; try { return JSON.parse(text); } catch { return null; } }
function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadLocal(key, fallback) { const r = localStorage.getItem(key); if (!r) return fallback; try { return JSON.parse(r); } catch { return fallback; } }

async function loadWordlist() {
  const r = await fetch(buildUrl('/static/wordlist.txt'));
  const t = await r.text();
  state.wordlist = t.trim().split(/\s+/g);
}

async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
function bytesToBinary(bytes) { return Array.from(bytes).map(x => x.toString(2).padStart(8, '0')).join(''); }
function binaryToBytes(bin) { const b = []; for (let i = 0; i < bin.length; i += 8) b.push(parseInt(bin.slice(i, i + 8), 2)); return new Uint8Array(b); }

async function entropyToMnemonic(entropy) {
  const eb = bytesToBinary(entropy);
  const cb = bytesToBinary(await sha256(entropy)).slice(0, entropy.length / 4);
  const bits = eb + cb;
  return bits.match(/.{1,11}/g).map(b => state.wordlist[parseInt(b, 2)]).join(' ');
}

async function mnemonicToEntropy(mnemonic) {
  const words = mnemonic.trim().split(/\s+/g);
  if (words.length !== 12) throw new Error('Мнемоника должна содержать 12 слов');
  const bits = words.map(w => { const i = state.wordlist.indexOf(w); if (i === -1) throw new Error(`Неизвестное слово: ${w}`); return i.toString(2).padStart(11, '0'); }).join('');
  const divider = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, divider);
  const checksumBits = bits.slice(divider);
  const entropy = binaryToBytes(entropyBits);
  const checksum = bytesToBinary(await sha256(entropy)).slice(0, checksumBits.length);
  if (checksum !== checksumBits) throw new Error('Неверная контрольная сумма мнемоники');
  return entropy;
}

async function mnemonicToSeed(mnemonic) {
  const key = await crypto.subtle.importKey('raw', encodeText(mnemonic.normalize('NFKD')), { name: 'PBKDF2' }, false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encodeText('mnemonic'), iterations: 2048, hash: 'SHA-512' }, key, 512));
}

async function hkdf(seed, saltLabel, infoLabel, length) {
  const key = await crypto.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', salt: encodeText(saltLabel), info: encodeText(infoLabel), hash: 'SHA-256' }, key, length * 8));
}

async function deriveKeys(mnemonic) {
  await mnemonicToEntropy(mnemonic);
  const seed = await mnemonicToSeed(mnemonic);
  const signSeed = await hkdf(seed, 'messanger-sign', 'messanger', 32);
  const boxSeed = await hkdf(seed, 'messanger-box', 'messanger', 32);
  return { sign: nacl.sign.keyPair.fromSeed(signSeed), box: nacl.box.keyPair.fromSecretKey(boxSeed) };
}

async function generateMnemonic() {
  return entropyToMnemonic(crypto.getRandomValues(new Uint8Array(16)));
}

// ─────────── UI Helpers ───────────
function showModal(modal, show) { if (show) modal.classList.remove('hidden'); else modal.classList.add('hidden'); }
function showToast(text) { if (!elements.toast) return; elements.toast.textContent = text; elements.toast.classList.remove('hidden'); setTimeout(() => elements.toast.classList.add('hidden'), 1400); }
function setAutoLogoutBanner(show) { if (elements.autoLogoutBanner) elements.autoLogoutBanner.classList.toggle('hidden', !show); }

function pushNotice(text, kind = 'info') {
  if (!elements.inAppNotifications) return;
  const item = document.createElement('div');
  item.className = `notice notice--${kind}`;
  item.textContent = text;
  elements.inAppNotifications.appendChild(item);
  requestAnimationFrame(() => item.classList.add('notice--show'));
  setTimeout(() => { item.classList.remove('notice--show'); setTimeout(() => item.remove(), 260); }, 2400);
}

function openMediaPreview(url, alt) {
  if (!elements.mediaViewer) return;
  elements.mediaViewerImg.src = url;
  elements.mediaViewerImg.alt = alt || 'preview';
  elements.mediaViewer.classList.remove('hidden');
}

function closeMediaPreview() {
  if (!elements.mediaViewer) return;
  elements.mediaViewer.classList.add('hidden');
  elements.mediaViewerImg.src = '';
}

function isReloadNavigation() {
  if (!('performance' in window)) return false;
  const e = performance.getEntriesByType('navigation');
  if (e && e.length) return e[0].type === 'reload';
  return false;
}

// ─────────── Tab switching ───────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.remove('active');
        tc.classList.add('tab-leaving');
      });
      btn.classList.add('active');

      const isSecurity = btn.dataset.tab === 'security';

      if (isSecurity) {
        if (elements.chatView) elements.chatView.classList.add('hidden');
        if (elements.emptyState) elements.emptyState.classList.add('hidden');

        const secView = document.getElementById('securityView');
        if (secView) {
          secView.classList.remove('hidden');
        }
      } else {
        const secView = document.getElementById('securityView');
        if (secView) secView.classList.add('hidden');

        if (state.activeContact) {
          if (elements.emptyState) elements.emptyState.classList.add('hidden');
          if (elements.chatView) elements.chatView.classList.remove('hidden');
        } else {
          if (elements.emptyState) elements.emptyState.classList.remove('hidden');
          if (elements.chatView) elements.chatView.classList.add('hidden');
        }
      }

      const target = document.getElementById('tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1));
      if (target) {
        setTimeout(() => {
          document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('tab-leaving'));
          target.classList.add('active');
        }, 150);
      }
    });
  });
}

// ─────────── Session ───────────
function resetSessionUI(reason) {
  if (state.poller) { clearInterval(state.poller); state.poller = null; }
  closeStream();
  state.token = null; state.me = null; state.keys = null;
  state.lastSeen = {}; state.lastGlobal = 0; state.fetching = false;
  state.pendingMessages = {}; state.resolvingContacts = {}; state.messageCache = {};
  state.contacts = []; state.activeContact = null; state.renderedIds = new Set();
  state.replyTarget = null; state.searchQuery = '';

  if (reason === 'lock' || !state.staySigned) {
    sessionStorage.removeItem('shardToken');
    localStorage.removeItem('shardToken');
    localStorage.removeItem('shardMnemonic');
    localStorage.removeItem('shardDisplayName');
    localStorage.removeItem('shardContacts');
    localStorage.removeItem('shardMe');
    localStorage.removeItem('shardStay');
  }
  if (elements.generatedBox) elements.generatedBox.classList.add('hidden');
  if (elements.generatedMnemonic) elements.generatedMnemonic.textContent = '';
  if (elements.mnemonicInput) elements.mnemonicInput.value = '';
  if (elements.displayNameInput) elements.displayNameInput.value = '';
  if (elements.rememberToggle) elements.rememberToggle.checked = false;
  if (elements.contactCodeInput) elements.contactCodeInput.value = '';
  if (elements.messageInput) elements.messageInput.value = '';
  if (elements.messages) elements.messages.innerHTML = '';
  cancelReply();
  setActiveChat(null);
  updateAuthUI();
  setAutoLogoutBanner(reason === 'reload');
  showModal(elements.authModal, true);
}

// ─────────── API ───────────
async function api(path, options = {}) {
  await ensureApiMode();
  const headers = options.headers || {};
  if (!options.noAuth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
    headers['X-Auth-Token'] = state.token;
  }
  if (options.json) headers['Content-Type'] = 'application/json';
  const response = await fetch(buildUrl(apiRoute(path)), { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    const data = parseJsonSafe(text);
    throw new Error((data && data.detail) || text || 'Request failed');
  }
  if (options.noJson) return response;
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (data !== null) return data;
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) throw new Error('API вернул HTML вместо JSON.');
  throw new Error('Некорректный ответ от сервера');
}

// ─────────── Contact code ───────────
function contactCodeFor(me) { return String(me.id); }

function parseContactCode(value) {
  if (!value) return null;
  const trimmed = value.trim();
  // If it's a pure numeric ID
  if (/^\d{6,}$/.test(trimmed)) return { id: parseInt(trimmed, 10) };
  try {
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    const decoded = decodeText(decodeBase64(trimmed));
    return JSON.parse(decoded);
  } catch { return null; }
}

// ─────────── Contacts rendering ───────────
function getContactLabel(contact) {
  if (state.me && numId(contact.id) === numId(state.me.id)) return 'Самопереписка';
  return contact.display_name || 'Без имени';
}

function renderContacts() {
  if (!elements.contacts) return;
  elements.contacts.innerHTML = '';
  const q = (elements.globalSearchInput && elements.globalSearchInput.value || '').toLowerCase();
  const filtered = q ? state.contacts.filter(c => {
    const label = getContactLabel(c).toLowerCase();
    return label.includes(q) || String(c.id).includes(q);
  }) : state.contacts;

  filtered.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item' + (state.activeContact && numId(state.activeContact.id) === numId(contact.id) ? ' active' : '');
    const name = document.createElement('div');
    name.className = 'contact-name';
    name.textContent = getContactLabel(contact);
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `#${contact.id}`;
    item.appendChild(name);
    item.appendChild(meta);
    item.addEventListener('click', () => selectContact(contact));
    elements.contacts.appendChild(item);
  });
  if (elements.contactsEmpty) {
    elements.contactsEmpty.classList.toggle('hidden', state.contacts.length > 0);
  }
}

function setActiveChat(contact) {
  state.activeContact = contact;
  state.renderedIds = new Set();
  renderContacts();
  if (!contact) {
    elements.emptyState.classList.remove('hidden');
    elements.chatView.classList.add('hidden');
    elements.messageInput.disabled = true;
    elements.sendBtn.disabled = true;
    elements.fileInput.disabled = true;
    if (elements.filePill) elements.filePill.classList.add('disabled');
    return;
  }
  elements.emptyState.classList.add('hidden');
  // Smooth transition
  elements.chatView.classList.remove('hidden');
  elements.chatView.classList.add('entering');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elements.chatView.classList.remove('entering');
      elements.chatView.classList.add('active-view');
    });
  });
  elements.chatName.textContent = getContactLabel(contact);
  updateConnectionStatus();
  elements.messages.innerHTML = '';
  elements.messageInput.disabled = false;
  elements.sendBtn.disabled = false;
  elements.fileInput.disabled = false;
  if (elements.filePill) elements.filePill.classList.remove('disabled');
}

function formatTime(iso) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

function updateConnectionStatus() {
  if (!elements.chatStatus) return;
  if (!state.activeContact) { elements.chatStatus.textContent = 'E2E • Offline'; return; }
  elements.chatStatus.textContent = state.sseConnected ? 'E2E • Live' : 'E2E • Sync';
}

function getGlobalLastSeen() {
  const v = Object.values(state.lastSeen);
  if (!v.length) return 0;
  return Math.max(0, ...v);
}

// ─────────── SSE Stream ───────────
function streamEndpoint() {
  const since = Math.max(state.lastGlobal || 0, getGlobalLastSeen());
  return buildUrl(apiRoute(`/api/stream?token=${encodeURIComponent(state.token)}&since=${since}`));
}

function closeStream() {
  if (state.sse) { state.sse.close(); state.sse = null; }
  state.sseConnected = false;
  updateConnectionStatus();
}

function connectStream() {
  if (!state.token || typeof EventSource === 'undefined') { state.sseConnected = false; updateConnectionStatus(); return; }
  closeStream();
  const es = new EventSource(streamEndpoint());
  state.sse = es;
  es.addEventListener('message', event => {
    try { const m = JSON.parse(event.data); if (m && m.id) handleIncomingMessage(m); } catch { }
  });
  es.addEventListener('ping', () => { });
  es.onopen = () => { state.sseConnected = true; updateConnectionStatus(); if (state.activeContact) startPolling().catch(() => { }); };
  es.onerror = () => { state.sseConnected = false; updateConnectionStatus(); if (state.activeContact) startPolling().catch(() => { }); };
}

// ─────────── Encryption ───────────
async function decryptMessage(message, contact) {
  try {
    const nonce = decodeBase64(message.nonce);
    const cipher = decodeBase64(message.ciphertext);
    const isSelf = state.me && numId(contact.id) === numId(state.me.id);
    const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
    const plain = nacl.box.open(cipher, nonce, otherPublic, state.keys.box.secretKey);
    if (!plain) return null;
    return JSON.parse(decodeText(plain));
  } catch { return null; }
}

// ─────────── Reply ───────────
function setReply(msgId, text) {
  state.replyTarget = { id: msgId, text };
  if (elements.replyPreview) elements.replyPreview.classList.remove('hidden');
  if (elements.replyText) elements.replyText.textContent = text.length > 80 ? text.slice(0, 80) + '…' : text;
  if (elements.messageInput) elements.messageInput.focus();
}

function cancelReply() {
  state.replyTarget = null;
  if (elements.replyPreview) elements.replyPreview.classList.add('hidden');
  if (elements.replyText) elements.replyText.textContent = '';
}

// ─────────── Message rendering ───────────
function appendMessage(message, payload, outgoing) {
  if (state.renderedIds.has(message.id)) return;
  state.renderedIds.add(message.id);

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    const text = payload.text || payload.name || '';
    if (!text.toLowerCase().includes(q)) return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'message' + (outgoing ? ' outgoing' : '');
  wrapper.dataset.msgId = message.id;
  wrapper.dataset.payload = JSON.stringify(payload);

  // Reply quote
  if (payload.reply_to_text) {
    const quote = document.createElement('div');
    quote.className = 'msg-quote';
    quote.textContent = payload.reply_to_text.length > 60 ? payload.reply_to_text.slice(0, 60) + '…' : payload.reply_to_text;
    wrapper.appendChild(quote);
  }

  if (payload.type === 'media') {
    const title = document.createElement('div');
    title.textContent = payload.name || 'Медиа';
    const button = document.createElement('button');
    button.className = 'ghost';
    button.textContent = 'Скачать';
    button.addEventListener('click', () => downloadMedia(payload));
    wrapper.appendChild(title);
    wrapper.appendChild(button);
    if (payload.mime && payload.mime.startsWith('image/')) {
      const image = document.createElement('img');
      image.alt = payload.name || 'image';
      image.style.maxWidth = '220px';
      image.style.marginTop = '10px';
      image.style.borderRadius = '12px';
      image.style.cursor = 'zoom-in';
      loadImage(payload).then(url => { image.src = url; image.addEventListener('click', () => openMediaPreview(url, payload.name || 'image')); }).catch(() => { });
      wrapper.appendChild(image);
    }
  } else {
    const textEl = document.createElement('span');
    textEl.className = 'msg-text';
    textEl.textContent = payload.text;
    wrapper.appendChild(textEl);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatTime(message.created_at);
  wrapper.appendChild(meta);

  // Reactions container
  const reactionsContainer = document.createElement('div');
  reactionsContainer.className = 'reactions';
  reactionsContainer.id = `reactions-${message.id}`;
  wrapper.appendChild(reactionsContainer);

  // Render existing reactions
  if (message.reactions && message.reactions.length) {
    renderReactions(reactionsContainer, message.reactions, message.id);
  }

  // Context menu trigger (right-click or long press)
  wrapper.addEventListener('contextmenu', e => { e.preventDefault(); showContextMenu(e, message, payload); });
  let longPressTimer = null;
  wrapper.addEventListener('touchstart', e => {
    longPressTimer = setTimeout(() => { showContextMenu(e.touches[0], message, payload); }, 500);
  }, { passive: true });
  wrapper.addEventListener('touchend', () => { clearTimeout(longPressTimer); });
  wrapper.addEventListener('touchmove', () => { clearTimeout(longPressTimer); });

  // Double-click for quick reply
  wrapper.addEventListener('dblclick', () => {
    const text = payload.text || payload.name || '';
    setReply(message.id, text);
  });

  elements.messages.appendChild(wrapper);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderReactions(container, reactions, messageId) {
  container.innerHTML = '';
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r);
  });
  Object.entries(grouped).forEach(([emoji, list]) => {
    const badge = document.createElement('span');
    badge.className = 'reaction';
    badge.textContent = `${emoji} ${list.length}`;
    badge.title = list.map(r => `#${r.user_id}`).join(', ');
    badge.addEventListener('click', () => toggleReaction(messageId, emoji));
    container.appendChild(badge);
  });
}

// ─────────── Context Menu ───────────
function showContextMenu(e, message, payload) {
  state.contextTarget = { message, payload };
  const menu = elements.msgContextMenu;
  if (!menu) return;
  menu.classList.remove('hidden');
  const x = (e.clientX || e.pageX || 100);
  const y = (e.clientY || e.pageY || 100);
  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 140) + 'px';
}

function hideContextMenu() {
  if (elements.msgContextMenu) elements.msgContextMenu.classList.add('hidden');
  state.contextTarget = null;
}

function hideReactionPicker() {
  if (elements.reactionPicker) elements.reactionPicker.classList.add('hidden');
}

// ─────────── Reactions ───────────
async function toggleReaction(messageId, emoji) {
  try {
    await api('/api/reactions', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ message_id: messageId, emoji }),
    });
    // Refresh messages to update reactions
    if (state.activeContact) await fetchMessages();
  } catch (err) { pushNotice('Ошибка реакции: ' + err.message, 'warn'); }
}

function showReactionPicker(message) {
  const picker = elements.reactionPicker;
  if (!picker) return;
  picker.classList.remove('hidden');
  // Position near context menu
  const menu = elements.msgContextMenu;
  if (menu) {
    picker.style.left = menu.style.left;
    picker.style.top = (parseInt(menu.style.top) + 40) + 'px';
  }
  // Set up handlers
  picker.querySelectorAll('.rpick').forEach(btn => {
    btn.onclick = () => {
      toggleReaction(message.id, btn.dataset.emoji);
      hideReactionPicker();
    };
  });
}

// ─────────── Message deletion ───────────
async function deleteMessage(messageId) {
  try {
    await api(`/api/messages/${messageId}`, { method: 'DELETE' });
    // Remove from DOM
    const el = elements.messages.querySelector(`[data-msg-id="${messageId}"]`);
    if (el) { el.classList.add('msg-deleting'); setTimeout(() => el.remove(), 300); }
    state.renderedIds.delete(messageId);
    pushNotice('Сообщение удалено', 'info');
  } catch (err) { pushNotice('Ошибка: ' + err.message, 'warn'); }
}

// ─────────── Auth UI ───────────
function updateAuthUI() {
  const unlocked = Boolean(state.token && state.me);
  if (document.body) document.body.classList.toggle('is-locked', !unlocked);
  if (elements.sessionStatus) {
    elements.sessionStatus.dataset.state = unlocked ? 'active' : 'locked';
    elements.sessionStatus.textContent = unlocked ? 'Сессия активна' : 'Сессия заблокирована';
  }
  if (elements.copyContact) elements.copyContact.disabled = !unlocked;
  if (elements.copyContactSecondary) elements.copyContactSecondary.disabled = !unlocked;
  if (elements.contactCodeInput) elements.contactCodeInput.disabled = !unlocked;
  if (elements.saveContact) elements.saveContact.disabled = !unlocked;
  if (!unlocked) {
    if (elements.meName) elements.meName.textContent = 'Без имени';
    if (elements.meId) elements.meId.textContent = 'Сессия не активна';
  }
}

function triggerAppReveal() {
  if (!elements.app) return;
  elements.app.classList.remove('app--enter');
  void elements.app.offsetWidth;
  elements.app.classList.add('app--enter');
}

function getContactById(contactId) { return state.contacts.find(c => numId(c.id) === numId(contactId)); }

// ─────────── Pending / resolving ───────────
function queuePendingMessage(contactId, message) {
  const key = String(contactId);
  if (!state.pendingMessages[key]) state.pendingMessages[key] = [];
  if (state.pendingMessages[key].some(item => item.id === message.id)) return;
  state.pendingMessages[key].push(message);
}

async function resolveContactById(contactId) {
  const key = String(contactId);
  if (state.resolvingContacts[key]) return state.resolvingContacts[key];
  const task = (async () => {
    try {
      const profile = await api(`/api/users/${contactId}`);
      const added = addContact(profile);
      if (added) pushNotice('Новый контакт', 'info');
      return profile;
    } catch { return null; } finally { delete state.resolvingContacts[key]; }
  })();
  state.resolvingContacts[key] = task;
  return task;
}

async function drainPendingMessages(contact) {
  const key = String(contact.id);
  const list = state.pendingMessages[key];
  if (!list || !list.length) return;
  list.sort((a, b) => a.id - b.id);
  for (const message of list) {
    const lastSeen = state.lastSeen[contact.id] || 0;
    if (message.id <= lastSeen) continue;
    const payload = await decryptMessage(message, contact);
    if (!payload) continue;
    appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
    state.lastSeen[contact.id] = message.id;
    state.lastGlobal = Math.max(state.lastGlobal || 0, message.id);
  }
  delete state.pendingMessages[key];
}

// ─────────── Incoming messages ───────────
async function handleIncomingMessage(message) {
  const otherId = numId(message.sender_id) === numId(state.me.id) ? message.recipient_id : message.sender_id;
  // Self-message
  const isSelf = numId(message.sender_id) === numId(state.me.id) && numId(message.recipient_id) === numId(state.me.id);
  const contactId = isSelf ? state.me.id : otherId;

  let contact = getContactById(contactId);
  const isIncoming = message.sender_id !== state.me.id;
  if (!contact) {
    if (isIncoming) pushNotice('Вам пришло сообщение от неизвестного', 'warn');
    queuePendingMessage(contactId, message);
    state.lastGlobal = Math.max(state.lastGlobal || 0, message.id);
    resolveContactById(contactId).then(resolved => {
      if (resolved && state.activeContact && numId(state.activeContact.id) === numId(resolved.id)) {
        drainPendingMessages(resolved).catch(() => { });
      }
    }).catch(() => { });
    return;
  }
  const lastSeen = state.lastSeen[contact.id] || 0;
  if (message.id <= lastSeen) { state.lastGlobal = Math.max(state.lastGlobal || 0, message.id); return; }
  if (isIncoming) pushNotice(contact.display_name ? `Новое сообщение от ${getContactLabel(contact)}` : 'Новое сообщение', 'info');
  if (!state.activeContact || numId(state.activeContact.id) !== numId(contact.id)) {
    queuePendingMessage(contact.id, message);
    state.lastGlobal = Math.max(state.lastGlobal || 0, message.id);
    return;
  }
  const payload = await decryptMessage(message, contact);
  if (!payload) return;
  appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
  state.lastSeen[contact.id] = message.id;
  state.lastGlobal = Math.max(state.lastGlobal || 0, message.id);
}

// ─────────── Media ───────────
async function downloadMedia(payload) {
  const response = await api(`/api/media/${payload.media_id}`, { noJson: true });
  const encrypted = new Uint8Array(await response.arrayBuffer());
  const decrypted = nacl.secretbox.open(encrypted, decodeBase64(payload.media_nonce), decodeBase64(payload.media_key));
  if (!decrypted) { alert('Не удалось расшифровать медиа'); return; }
  const blob = new Blob([decrypted], { type: payload.mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = payload.name || 'file';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadImage(payload) {
  const response = await api(`/api/media/${payload.media_id}`, { noJson: true });
  const encrypted = new Uint8Array(await response.arrayBuffer());
  const decrypted = nacl.secretbox.open(encrypted, decodeBase64(payload.media_nonce), decodeBase64(payload.media_key));
  if (!decrypted) throw new Error('decrypt failed');
  return URL.createObjectURL(new Blob([decrypted], { type: payload.mime || 'image/png' }));
}

// ─────────── Fetch + Poll ───────────
async function fetchMessages(force = false) {
  if (!state.activeContact || state.fetching) return;
  state.fetching = true;
  try {
    const contact = state.activeContact;
    const isSelf = state.me && numId(contact.id) === numId(state.me.id);
    const withUser = isSelf ? contact.id : contact.id;
    const since = force ? 0 : (state.lastSeen[contact.id] || 0);
    if (force) { state.lastSeen[contact.id] = 0; state.renderedIds = new Set(); elements.messages.innerHTML = ''; }
    const data = await api(`/api/messages?with_user=${withUser}&since=${since}`);
    for (const message of data.messages) {
      const payload = await decryptMessage(message, contact);
      if (!payload) continue;
      appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
      state.lastSeen[contact.id] = message.id;
      state.lastGlobal = Math.max(state.lastGlobal || 0, message.id);
    }
  } finally { state.fetching = false; }
}

async function startPolling(force = false) {
  if (state.poller) clearInterval(state.poller);
  await fetchMessages(force);
  const interval = state.sseConnected ? 3000 : 2000;
  state.poller = setInterval(() => fetchMessages().catch(() => { }), interval);
}

async function selectContact(contact) {
  if (!state.token) { showModal(elements.authModal, true); return; }
  const same = state.activeContact && numId(state.activeContact.id) === numId(contact.id);
  if (same) { await drainPendingMessages(contact); await startPolling(); return; }
  cancelReply();
  setActiveChat(contact);
  delete state.pendingMessages[String(contact.id)];
  await startPolling(true);
}

// ─────────── Send messages ───────────
async function sendMessage(text) {
  const contact = state.activeContact;
  if (!contact) return;
  const payload = { type: 'text', text: text.trim(), ts: new Date().toISOString() };
  if (state.replyTarget) {
    payload.reply_to = state.replyTarget.id;
    payload.reply_to_text = state.replyTarget.text;
  }
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const isSelf = state.me && numId(contact.id) === numId(state.me.id);
  const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
  const cipher = nacl.box(encodeText(JSON.stringify(payload)), nonce, otherPublic, state.keys.box.secretKey);
  await api('/api/messages', {
    method: 'POST', json: true,
    body: JSON.stringify({ recipient_id: contact.id, ciphertext: encodeBase64(cipher), nonce: encodeBase64(nonce) }),
  });
  elements.messageInput.value = '';
  cancelReply();
  await fetchMessages();
}

async function sendMedia(file) {
  const contact = state.activeContact;
  if (!contact || !file) return;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const mediaKey = nacl.randomBytes(32);
  const mediaNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(buffer, mediaNonce, mediaKey);
  const form = new FormData();
  form.append('recipient_id', contact.id);
  form.append('file', new Blob([encrypted], { type: 'application/octet-stream' }), file.name);
  const mediaRes = await api('/api/media', { method: 'POST', body: form, noJson: false });
  const payload = {
    type: 'media', media_id: mediaRes.media_id, media_key: encodeBase64(mediaKey),
    media_nonce: encodeBase64(mediaNonce), name: file.name, mime: file.type || 'application/octet-stream',
    size: file.size, ts: new Date().toISOString(),
  };
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const isSelf = state.me && numId(contact.id) === numId(state.me.id);
  const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
  const cipher = nacl.box(encodeText(JSON.stringify(payload)), nonce, otherPublic, state.keys.box.secretKey);
  await api('/api/messages', {
    method: 'POST', json: true,
    body: JSON.stringify({ recipient_id: contact.id, ciphertext: encodeBase64(cipher), nonce: encodeBase64(nonce) }),
  });
  await fetchMessages();
}

// ─────────── Contacts storage ───────────
function loadContactsFromStorage() { state.contacts = loadLocal('shardContacts', []); }
function saveContactsToStorage() { saveLocal('shardContacts', state.contacts); }

function addContact(contact) {
  if (!contact) return false;
  if (state.contacts.find(c => numId(c.id) === numId(contact.id))) return false;
  state.contacts.push(contact);
  saveContactsToStorage();
  renderContacts();
  return true;
}

// ─────────── Session init ───────────
async function initializeSession() {
  await loadWordlist();
  initElements();
  initTabs();

  // Check stay-signed
  const stay = localStorage.getItem('shardStay');
  if (stay === 'true') {
    state.staySigned = true;
    const savedMnemonic = localStorage.getItem('shardMnemonic');
    const savedToken = localStorage.getItem('shardToken');
    if (savedMnemonic && savedToken) {
      try {
        state.keys = await deriveKeys(savedMnemonic);
        state.token = savedToken;
        const me = await api('/api/me');
        state.me = me;
        elements.meName.textContent = me.display_name;
        elements.meId.textContent = `#${me.id}`;
        try {
          const data = await api('/api/contacts');
          state.contacts = data.contacts || [];
          // Add self-chat contact if not present
          addSelfContact();
          saveContactsToStorage();
          renderContacts();
        } catch { }
        connectStream();
        startPolling().catch(() => { });
        updateAuthUI();
        showModal(elements.authModal, false);
        triggerAppReveal();
        return;
      } catch {
        // Token expired or invalid, fall through to normal login
        localStorage.removeItem('shardToken');
      }
    }
  }

  const reason = isReloadNavigation() ? 'reload' : 'init';
  resetSessionUI(reason);
}

function addSelfContact() {
  if (!state.me) return;
  if (!state.contacts.find(c => numId(c.id) === numId(state.me.id))) {
    state.contacts.unshift({
      id: state.me.id,
      display_name: state.me.display_name,
      sign_public_key: state.me.sign_public_key,
      box_public_key: state.me.box_public_key,
    });
  }
}

async function unlock() {
  const mnemonic = elements.mnemonicInput.value.trim().toLowerCase();
  if (!mnemonic) { alert('Введите мнемонику'); return; }
  const displayName = elements.displayNameInput.value.trim() || 'Без имени';

  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('hidden');
  // Wait a frame so DOM updates
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    try { state.keys = await deriveKeys(mnemonic); } catch (err) { alert(err.message || 'Неверная мнемоника'); return; }
    const signPublic = encodeBase64(state.keys.sign.publicKey);
    const boxPublic = encodeBase64(state.keys.box.publicKey);
    const profile = await api('/api/register', {
      method: 'POST', json: true,
      body: JSON.stringify({ display_name: displayName, sign_public_key: signPublic, box_public_key: boxPublic }),
      noAuth: true,
    });
    const challenge = await api('/api/challenge', {
      method: 'POST', json: true,
      body: JSON.stringify({ sign_public_key: signPublic }),
      noAuth: true,
    });
    const signature = nacl.sign.detached(decodeBase64(challenge.nonce), state.keys.sign.secretKey);
    const auth = await api('/api/auth', {
      method: 'POST', json: true,
      body: JSON.stringify({ sign_public_key: signPublic, nonce: challenge.nonce, signature: encodeBase64(signature) }),
      noAuth: true,
    });
    state.token = auth.token;
    state.me = profile;
    elements.meName.textContent = profile.display_name;
    elements.meId.textContent = `#${profile.id}`;

    // Stay signed in
    state.staySigned = elements.staySignedToggle && elements.staySignedToggle.checked;
    if (state.staySigned) {
      localStorage.setItem('shardStay', 'true');
      localStorage.setItem('shardToken', auth.token);
      localStorage.setItem('shardMnemonic', mnemonic);
    } else if (elements.rememberToggle && elements.rememberToggle.checked) {
      localStorage.setItem('shardMnemonic', mnemonic);
    } else {
      localStorage.removeItem('shardMnemonic');
    }
    localStorage.setItem('shardDisplayName', displayName);
    localStorage.setItem('shardMe', JSON.stringify(profile));

    try {
      const data = await api('/api/contacts');
      state.contacts = data.contacts || [];
      addSelfContact();
      saveContactsToStorage();
      renderContacts();
    } catch { }

    // Also add self to server contacts
    try { await api('/api/contacts', { method: 'POST', json: true, body: JSON.stringify({ contact_id: profile.id }) }); } catch { }

    connectStream();
    startPolling().catch(() => { });
    updateAuthUI();
    setAutoLogoutBanner(false);
    triggerAppReveal();
    showModal(elements.authModal, false);
  } finally {
    if (overlay) overlay.classList.add('hidden');
  }
}

async function generateNewMnemonic() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('hidden');

  // Wait a frame so the DOM paints the overlay
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const mnemonic = await generateMnemonic();
    elements.generatedMnemonic.textContent = mnemonic;
    elements.generatedBox.classList.remove('hidden');
    elements.mnemonicInput.value = mnemonic;
  } finally {
    if (overlay) overlay.classList.add('hidden');
  }
}

function copyText(text) { navigator.clipboard.writeText(text).then(() => showToast('Скопировано')).catch(() => { }); }

async function handleContactSave() {
  if (!state.token) { alert('Сначала войдите'); return; }
  const value = elements.contactCodeInput.value.trim();
  if (!value) return;

  let contact = null;

  // Try as numeric ID first
  if (/^\d+$/.test(value)) {
    try {
      contact = await api(`/api/users/${value}`);
    } catch {
      alert('Пользователь с таким ID не найден');
      return;
    }
  } else {
    // Try as contact code (base64 or JSON)
    contact = parseContactCode(value);
    if (!contact || !contact.id) {
      try {
        contact = await api(`/api/users/by_sign_key?key=${encodeURIComponent(value)}`);
      } catch {
        alert('Неверный ID или контакт‑код');
        return;
      }
    } else {
      // We got an ID from the code, fetch fresh profile
      try {
        contact = await api(`/api/users/${contact.id}`);
      } catch {
        alert('Пользователь не найден');
        return;
      }
    }
  }

  try {
    const saved = await api('/api/contacts', {
      method: 'POST', json: true,
      body: JSON.stringify({ contact_id: contact.id }),
    });
    // Merge full profile data
    const full = { ...contact, ...saved };
    const added = addContact(full);
    if (added) {
      pushNotice('Контакт добавлен', 'success');
    } else {
      pushNotice('Контакт уже в списке', 'info');
    }
  } catch (err) { alert(err.message || 'Не удалось добавить контакт'); return; }
  elements.contactCodeInput.value = '';
}

function lock() { resetSessionUI('lock'); }

// ─────────── Search ───────────
function handleChatSearch() {
  const q = (elements.chatSearch && elements.chatSearch.value || '').trim();
  state.searchQuery = q;
  if (state.activeContact) {
    state.renderedIds = new Set();
    elements.messages.innerHTML = '';
    fetchMessages(true).catch(() => { });
  }
}

// ─────────── Events ───────────
function wireEvents() {
  elements.generateBtn.addEventListener('click', generateNewMnemonic);
  elements.unlockBtn.addEventListener('click', () => unlock().catch(err => alert(err && err.message ? err.message : 'Ошибка входа')));
  elements.copyMnemonic.addEventListener('click', () => copyText(elements.generatedMnemonic.textContent));

  elements.copyContact.addEventListener('click', () => { if (state.me) copyText(contactCodeFor(state.me)); });
  if (elements.copyContactSecondary) elements.copyContactSecondary.addEventListener('click', () => { if (state.me) copyText(contactCodeFor(state.me)); });
  if (elements.focusContactInput) elements.focusContactInput.addEventListener('click', () => { if (elements.contactCodeInput) elements.contactCodeInput.focus(); });

  elements.saveContact.addEventListener('click', handleContactSave);
  elements.sendBtn.addEventListener('click', () => {
    const text = elements.messageInput.value.trim();
    if (!text) return;
    sendMessage(text).catch(err => alert(err.message));
  });
  elements.messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); const text = elements.messageInput.value.trim(); if (!text) return; sendMessage(text).catch(err => alert(err.message)); }
  });
  elements.fileInput.addEventListener('change', event => {
    const file = event.target.files[0]; if (!file) return;
    sendMedia(file).catch(err => alert(err.message));
    elements.fileInput.value = '';
  });
  elements.contactCodeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); handleContactSave(); }
  });
  elements.lockBtn.addEventListener('click', lock);

  // Reply cancel
  if (elements.replyCancel) elements.replyCancel.addEventListener('click', cancelReply);

  // Chat search (within messages)
  if (elements.chatSearch) {
    let searchTimer = null;
    elements.chatSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(handleChatSearch, 300);
    });
  }

  // Global contact search
  if (elements.globalSearchInput) {
    elements.globalSearchInput.addEventListener('input', () => renderContacts());
  }

  // Media viewer
  if (elements.mediaViewer) {
    elements.mediaViewer.addEventListener('click', event => {
      if (event.target === elements.mediaViewer || (event.target && event.target.classList.contains('media-backdrop'))) closeMediaPreview();
    });
  }

  // Context menu actions
  if (elements.msgContextMenu) {
    elements.msgContextMenu.querySelectorAll('.context-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        const target = state.contextTarget;
        hideContextMenu();
        if (!target) return;
        if (action === 'reply') {
          const text = target.payload.text || target.payload.name || '';
          setReply(target.message.id, text);
        } else if (action === 'react') {
          showReactionPicker(target.message);
        } else if (action === 'delete') {
          if (confirm('Удалить это сообщение?')) deleteMessage(target.message.id);
        }
      });
    });
  }

  // Close context menu and reaction picker on click outside
  document.addEventListener('click', e => {
    if (elements.msgContextMenu && !elements.msgContextMenu.contains(e.target)) hideContextMenu();
    if (elements.reactionPicker && !elements.reactionPicker.contains(e.target)) hideReactionPicker();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeMediaPreview(); hideContextMenu(); hideReactionPicker(); cancelReply(); }
  });
}

initializeSession().then(wireEvents).catch(err => console.error(err));

window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
