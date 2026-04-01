/* shard app.js build 21 */
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const DISCLAIMER_TEXT = 'This is an experimental project. Not audited. Do not use for critical security needs.';

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
  lastGlobal: '',
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
  uploading: false,
  lang: 'en',
  detectedLang: 'en',
  pendingLang: 'en',
  languageConfirmed: false,
  sessionInitialized: false,
};

const elements = {};

const I18N = {
  en: {
    'meta.title': 'Shard - Private conversations',
    'loading.initializing': 'Initializing...',
    'lang.switchLabel': 'Language',
    'lang.modalTitle': 'Choose your language',
    'lang.modalBody': 'We detected a recommended language from your browser settings. Please confirm your choice before continuing.',
    'lang.optionEnTitle': 'English',
    'lang.optionEnBody': 'Interface, notifications, and docs in English.',
    'lang.optionRuTitle': 'Russian',
    'lang.optionRuBody': 'Interface, notifications, and docs in Russian.',
    'lang.confirm': 'Confirm and continue',
    'lang.modalFoot': 'You can change the language at any time.',
    'lang.recommendation': 'Recommended from your browser language: {language}.',
    'lang.updated': 'Language updated.',
    'brand.subtitle': 'Private. Minimal. Experimental.',
    'disclaimer.badge': 'Experimental project',
    'disclaimer.text': DISCLAIMER_TEXT,
    'disclaimer.original': DISCLAIMER_TEXT,
    'session.locked': 'Session locked',
    'session.active': 'Session active',
    'session.lockButton': 'Lock',
    'profile.you': 'You',
    'profile.unnamed': 'Unnamed',
    'profile.copyId': 'Copy ID',
    'profile.sessionInactive': 'Session inactive',
    'profile.selfChat': 'Saved messages',
    'tabs.contacts': 'Contacts',
    'tabs.security': 'News and Security',
    'contacts.title': 'Contacts',
    'contacts.searchPlaceholder': 'Search contacts...',
    'contacts.hint': 'Add contacts by numeric ID.',
    'contacts.empty': 'No contacts yet. Add your first contact.',
    'contacts.inputPlaceholder': 'Enter a numeric contact ID',
    'contacts.addButton': 'Add contact',
    'contacts.new': 'New contact added.',
    'contacts.added': 'Contact added.',
    'contacts.exists': 'Contact is already in the list.',
    'contacts.addFailed': 'Could not add the contact.',
    'contacts.userIdNotFound': 'No user was found for that ID.',
    'contacts.invalidCode': 'Invalid ID or contact code.',
    'contacts.userNotFound': 'User not found.',
    'empty.title': 'Start a secure conversation',
    'empty.body': 'Only chat participants can read messages. No logins. No passwords.',
    'empty.step1': 'Copy your ID',
    'empty.step2': 'Get a contact ID',
    'empty.step3': 'Start chatting',
    'empty.copyMyId': 'Copy my ID',
    'empty.addContact': 'Add contact',
    'chat.label': 'Conversation',
    'chat.searchPlaceholder': 'Search...',
    'chat.cancelReply': 'Cancel',
    'chat.mediaButton': '+ Media',
    'chat.messagePlaceholder': 'Write a message',
    'chat.send': 'Send',
    'chat.dropHere': 'Drop a file here',
    'chat.uploading': 'Processing file...',
    'chat.statusOffline': 'E2E • Offline',
    'chat.statusLive': 'E2E • Live',
    'chat.statusSync': 'E2E • Sync',
    'chat.mediaTitle': 'Media',
    'chat.download': 'Download',
    'chat.reactionError': 'Reaction error: {error}',
    'chat.messageDeleted': 'Message deleted.',
    'chat.genericError': 'Error: {error}',
    'chat.unknownSender': 'You received a message from an unknown contact.',
    'chat.newMessage': 'New message.',
    'chat.newMessageFrom': 'New message from {name}.',
    'chat.mediaDecryptFailed': 'Could not decrypt the media file.',
    'chat.fileTooLarge': 'File is too large. Maximum size is {size} MB.',
    'chat.selectContactFirst': 'Select a contact first.',
    'chat.deleteConfirm': 'Delete this message?',
    'auth.title': 'Enter your 12-word mnemonic',
    'auth.subtitle': 'This is your only key. Store it offline.',
    'auth.autoLogout': 'Your session ended automatically after a page reload. Sign in again.',
    'auth.mnemonicLabel': 'Mnemonic',
    'auth.mnemonicPlaceholder': '12 English words separated by spaces',
    'auth.generate': 'Generate',
    'auth.unlock': 'Unlock',
    'auth.generatedTitle': 'Write these words down now',
    'auth.copyMnemonic': 'Copy mnemonic',
    'auth.nameLabel': 'Name',
    'auth.namePlaceholder': 'Your name',
    'auth.nameHint': 'Your name is set only at registration and cannot be changed later.',
    'auth.rememberMnemonic': 'Remember the mnemonic on this device',
    'auth.staySigned': 'Stay signed in on this device',
    'auth.footer': 'No passwords. No recovery. Only your words.',
    'auth.enterMnemonic': 'Enter your mnemonic.',
    'auth.invalidMnemonic': 'Invalid mnemonic.',
    'auth.unlockError': 'Sign-in failed.',
    'auth.signInFirst': 'Sign in first.',
    'context.reply': 'Reply',
    'context.react': 'Reaction',
    'context.delete': 'Delete',
    'toast.copied': 'Copied.',
    'errors.requestFailed': 'Request failed',
    'errors.apiReturnedHtml': 'The API returned HTML instead of JSON.',
    'errors.invalidServerResponse': 'The server returned an invalid response.',
    'errors.mnemonicWordsCount': 'The mnemonic must contain 12 words.',
    'errors.unknownWord': 'Unknown word: {word}',
    'errors.invalidMnemonicChecksum': 'Invalid mnemonic checksum.',
    'media.previewAlt': 'media preview',
    'security.title': 'Security and release notes',
    'security.releaseTitle': 'Release notes',
    'security.releaseBody': 'Current public build: v0.1.11. Recent work focused on message delivery stability, drag-and-drop media recovery, and backend hardening for open source publication.',
    'security.overviewTitle': 'How Shard currently works',
    'security.overviewBody': 'Shard is a browser-based messenger with client-side encryption. Private keys stay in the browser. The server stores ciphertext, encrypted media blobs, public keys, and session metadata.',
    'security.cryptoTitle': 'Cryptography used',
    'security.cryptoItem1': 'TweetNaCl.js for nacl.box, nacl.secretbox, and Ed25519 signatures.',
    'security.cryptoItem2': 'Web Crypto API for PBKDF2, HKDF, and SHA-256 or SHA-512 operations.',
    'security.cryptoItem3': 'PHP libsodium on the server to verify Ed25519 signatures during authentication.',
    'security.serverTitle': 'What the server can see',
    'security.serverHeaderData': 'Data',
    'security.serverHeaderState': 'Server visibility',
    'security.serverRowPublicKeysData': 'Public keys',
    'security.serverRowPublicKeysState': 'Stored on the server',
    'security.serverRowPrivateKeysData': 'Private keys',
    'security.serverRowPrivateKeysState': 'Not stored, device only',
    'security.serverRowMessagesData': 'Message plaintext',
    'security.serverRowMessagesState': 'Ciphertext only',
    'security.serverRowMediaData': 'Media files',
    'security.serverRowMediaState': 'Encrypted blobs only',
    'security.serverRowMnemonicData': 'Mnemonic',
    'security.serverRowMnemonicState': 'Not stored',
    'security.serverRowTokensData': 'Session tokens',
    'security.serverRowTokensState': 'Stored for request authentication',
    'security.limitsTitle': 'Known limits',
    'security.limit1': 'No independent security audit has been completed.',
    'security.limit2': 'A compromised browser, device, or host can expose local secrets.',
    'security.limit3': 'This documentation describes current behavior, not a formal security guarantee.',
    'security.ossTitle': 'Open source readiness',
    'security.ossBody': 'The repository now includes an English README, SECURITY.md, UTF-8 editor settings, ignore rules for runtime data, and an MIT license to simplify review and contribution.',
    'security.note': 'Review the source code, threat model, and hosting configuration before relying on the project.',
  },
  ru: {
    'meta.title': 'Shard - приватные диалоги',
    'loading.initializing': 'Инициализация...',
    'lang.switchLabel': 'Язык',
    'lang.modalTitle': 'Выберите язык',
    'lang.modalBody': 'Мы определили рекомендуемый язык по настройкам браузера. Подтвердите выбор перед продолжением.',
    'lang.optionEnTitle': 'English',
    'lang.optionEnBody': 'Интерфейс, уведомления и документация на английском.',
    'lang.optionRuTitle': 'Русский',
    'lang.optionRuBody': 'Интерфейс, уведомления и документация на русском.',
    'lang.confirm': 'Подтвердить и продолжить',
    'lang.modalFoot': 'Язык можно поменять в любой момент.',
    'lang.recommendation': 'Рекомендованный язык по настройкам браузера: {language}.',
    'lang.updated': 'Язык переключен.',
    'brand.subtitle': 'Приватно. Минималистично. Экспериментально.',
    'disclaimer.badge': 'Экспериментальный проект',
    'disclaimer.text': 'Это экспериментальный проект. Аудит безопасности не проводился. Не используйте его для критически важных задач безопасности.',
    'disclaimer.original': DISCLAIMER_TEXT,
    'session.locked': 'Сессия заблокирована',
    'session.active': 'Сессия активна',
    'session.lockButton': 'Заблокировать',
    'profile.you': 'Вы',
    'profile.unnamed': 'Без имени',
    'profile.copyId': 'Скопировать ID',
    'profile.sessionInactive': 'Сессия не активна',
    'profile.selfChat': 'Избранное',
    'tabs.contacts': 'Контакты',
    'tabs.security': 'Новости и безопасность',
    'contacts.title': 'Контакты',
    'contacts.searchPlaceholder': 'Поиск по контактам...',
    'contacts.hint': 'Добавляйте контакты по числовому ID.',
    'contacts.empty': 'Контактов пока нет. Добавьте первый контакт.',
    'contacts.inputPlaceholder': 'Введите числовой ID контакта',
    'contacts.addButton': 'Добавить контакт',
    'contacts.new': 'Добавлен новый контакт.',
    'contacts.added': 'Контакт добавлен.',
    'contacts.exists': 'Контакт уже есть в списке.',
    'contacts.addFailed': 'Не удалось добавить контакт.',
    'contacts.userIdNotFound': 'Пользователь с таким ID не найден.',
    'contacts.invalidCode': 'Неверный ID или код контакта.',
    'contacts.userNotFound': 'Пользователь не найден.',
    'empty.title': 'Начните защищенный диалог',
    'empty.body': 'Только участники чата могут читать сообщения. Без логинов. Без паролей.',
    'empty.step1': 'Скопируйте свой ID',
    'empty.step2': 'Получите ID контакта',
    'empty.step3': 'Начните переписку',
    'empty.copyMyId': 'Скопировать мой ID',
    'empty.addContact': 'Добавить контакт',
    'chat.label': 'Диалог',
    'chat.searchPlaceholder': 'Поиск...',
    'chat.cancelReply': 'Отменить',
    'chat.mediaButton': '+ Медиа',
    'chat.messagePlaceholder': 'Напишите сообщение',
    'chat.send': 'Отправить',
    'chat.dropHere': 'Перетащите файл сюда',
    'chat.uploading': 'Обработка файла...',
    'chat.statusOffline': 'E2E • Offline',
    'chat.statusLive': 'E2E • Live',
    'chat.statusSync': 'E2E • Sync',
    'chat.mediaTitle': 'Медиа',
    'chat.download': 'Скачать',
    'chat.reactionError': 'Ошибка реакции: {error}',
    'chat.messageDeleted': 'Сообщение удалено.',
    'chat.genericError': 'Ошибка: {error}',
    'chat.unknownSender': 'Вам пришло сообщение от неизвестного контакта.',
    'chat.newMessage': 'Новое сообщение.',
    'chat.newMessageFrom': 'Новое сообщение от {name}.',
    'chat.mediaDecryptFailed': 'Не удалось расшифровать медиафайл.',
    'chat.fileTooLarge': 'Файл слишком большой. Максимум {size} МБ.',
    'chat.selectContactFirst': 'Сначала выберите контакт.',
    'chat.deleteConfirm': 'Удалить это сообщение?',
    'auth.title': 'Введите мнемонику из 12 слов',
    'auth.subtitle': 'Это ваш единственный ключ. Храните его офлайн.',
    'auth.autoLogout': 'Сессия автоматически завершилась после обновления страницы. Войдите снова.',
    'auth.mnemonicLabel': 'Мнемоника',
    'auth.mnemonicPlaceholder': '12 английских слов через пробел',
    'auth.generate': 'Сгенерировать',
    'auth.unlock': 'Войти',
    'auth.generatedTitle': 'Сохраните эти слова прямо сейчас',
    'auth.copyMnemonic': 'Скопировать мнемонику',
    'auth.nameLabel': 'Имя',
    'auth.namePlaceholder': 'Ваше имя',
    'auth.nameHint': 'Имя задается только при регистрации и позже не меняется.',
    'auth.rememberMnemonic': 'Запомнить мнемонику на этом устройстве',
    'auth.staySigned': 'Не выходить на этом устройстве',
    'auth.footer': 'Без паролей. Без восстановления. Только ваши слова.',
    'auth.enterMnemonic': 'Введите мнемонику.',
    'auth.invalidMnemonic': 'Неверная мнемоника.',
    'auth.unlockError': 'Ошибка входа.',
    'auth.signInFirst': 'Сначала войдите.',
    'context.reply': 'Ответить',
    'context.react': 'Реакция',
    'context.delete': 'Удалить',
    'toast.copied': 'Скопировано.',
    'errors.requestFailed': 'Ошибка запроса',
    'errors.apiReturnedHtml': 'API вернул HTML вместо JSON.',
    'errors.invalidServerResponse': 'Сервер вернул некорректный ответ.',
    'errors.mnemonicWordsCount': 'Мнемоника должна содержать 12 слов.',
    'errors.unknownWord': 'Неизвестное слово: {word}',
    'errors.invalidMnemonicChecksum': 'Неверная контрольная сумма мнемоники.',
    'media.previewAlt': 'предпросмотр медиа',
    'security.title': 'Безопасность и заметки к релизу',
    'security.releaseTitle': 'Что нового',
    'security.releaseBody': 'Текущая публичная сборка: v0.1.11. Последние изменения были сосредоточены на стабильности доставки сообщений, восстановлении drag-and-drop для медиа и усилении backend-части перед публикацией в open source.',
    'security.overviewTitle': 'Как сейчас работает Shard',
    'security.overviewBody': 'Shard - это браузерный мессенджер с клиентским шифрованием. Приватные ключи остаются в браузере. Сервер хранит шифротекст, зашифрованные медиафайлы, публичные ключи и метаданные сессий.',
    'security.cryptoTitle': 'Используемая криптография',
    'security.cryptoItem1': 'TweetNaCl.js для nacl.box, nacl.secretbox и подписей Ed25519.',
    'security.cryptoItem2': 'Web Crypto API для операций PBKDF2, HKDF и SHA-256 или SHA-512.',
    'security.cryptoItem3': 'PHP libsodium на сервере для проверки подписей Ed25519 при аутентификации.',
    'security.serverTitle': 'Что может видеть сервер',
    'security.serverHeaderData': 'Данные',
    'security.serverHeaderState': 'Что видно на сервере',
    'security.serverRowPublicKeysData': 'Публичные ключи',
    'security.serverRowPublicKeysState': 'Хранятся на сервере',
    'security.serverRowPrivateKeysData': 'Приватные ключи',
    'security.serverRowPrivateKeysState': 'Не хранятся, только на устройстве',
    'security.serverRowMessagesData': 'Открытый текст сообщений',
    'security.serverRowMessagesState': 'Только шифротекст',
    'security.serverRowMediaData': 'Медиафайлы',
    'security.serverRowMediaState': 'Только зашифрованные blob-файлы',
    'security.serverRowMnemonicData': 'Мнемоника',
    'security.serverRowMnemonicState': 'Не хранится',
    'security.serverRowTokensData': 'Сессионные токены',
    'security.serverRowTokensState': 'Хранятся для авторизации запросов',
    'security.limitsTitle': 'Известные ограничения',
    'security.limit1': 'Независимый аудит безопасности пока не проводился.',
    'security.limit2': 'Скомпрометированный браузер, сервер или устройство могут раскрыть локальные секреты.',
    'security.limit3': 'Эта документация описывает текущее поведение, а не формальную гарантию безопасности.',
    'security.ossTitle': 'Готовность к open source',
    'security.ossBody': 'В репозитории теперь есть README на английском, SECURITY.md, настройки UTF-8 для редакторов, ignore-правила для runtime-данных и лицензия MIT для ревью и contribution-потока.',
    'security.note': 'Перед использованием обязательно проверьте исходники, модель угроз и конфигурацию хостинга.',
  },
};

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
    'dropOverlay', 'uploadOverlay', 'loadingOverlay', 'languageModal', 'languageConfirmBtn',
    'langOptionEn', 'langOptionRu', 'langSwitchEn', 'langSwitchRu', 'languageRecommendation',
    'securityContent', 'projectDisclaimerOriginal',
  ];
  ids.forEach(id => { elements[id] = $(id); });
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const API_MODES = { PATH: 'path', PHP: 'php' };
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'];
const LOCALE_CODES = { en: 'en-US', ru: 'ru-RU' };
const LANGUAGE_LABELS = { en: 'English', ru: 'Русский' };

function encodeBase64(bytes) { return nacl.util.encodeBase64(bytes); }
function decodeBase64(text) { return nacl.util.decodeBase64(text); }
function encodeText(text) { return textEncoder.encode(text); }
function decodeText(bytes) { return textDecoder.decode(bytes); }
function numId(v) { return typeof v === 'number' ? v : parseInt(v, 10); }

function normalizeLanguage(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('ru') ? 'ru' : 'en';
}

function detectBrowserLanguage() {
  const candidates = [...(navigator.languages || []), navigator.language || ''];
  return candidates.some(value => normalizeLanguage(value) === 'ru') ? 'ru' : 'en';
}

function localeCode() {
  return LOCALE_CODES[state.lang] || LOCALE_CODES.en;
}

function t(key, vars = {}) {
  const template = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    const value = vars[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

function renderSecurityContent() {
  if (!elements.securityContent) return;

  const rows = [
    ['security.serverRowPublicKeysData', 'security.serverRowPublicKeysState'],
    ['security.serverRowPrivateKeysData', 'security.serverRowPrivateKeysState'],
    ['security.serverRowMessagesData', 'security.serverRowMessagesState'],
    ['security.serverRowMediaData', 'security.serverRowMediaState'],
    ['security.serverRowMnemonicData', 'security.serverRowMnemonicState'],
    ['security.serverRowTokensData', 'security.serverRowTokensState'],
  ];

  const cryptoItems = [
    t('security.cryptoItem1'),
    t('security.cryptoItem2'),
    t('security.cryptoItem3'),
  ].map(item => `<li>${item}</li>`).join('');

  const limits = [
    t('security.limit1'),
    t('security.limit2'),
    t('security.limit3'),
  ].map(item => `<li>${item}</li>`).join('');

  const tableRows = rows.map(([dataKey, stateKey]) => `
    <tr>
      <td>${t(dataKey)}</td>
      <td>${t(stateKey)}</td>
    </tr>
  `).join('');

  const originalNote = state.lang === 'ru'
    ? `<p class="security-note">${t('disclaimer.original')}</p>`
    : '';

  elements.securityContent.innerHTML = `
    <h2>${t('security.title')}</h2>
    <div class="security-warning">
      <p>${t('disclaimer.text')}</p>
      ${originalNote}
    </div>

    <h4>${t('security.releaseTitle')}</h4>
    <p>${t('security.releaseBody')}</p>

    <h4>${t('security.overviewTitle')}</h4>
    <p>${t('security.overviewBody')}</p>

    <h4>${t('security.cryptoTitle')}</h4>
    <ul>${cryptoItems}</ul>

    <h4>${t('security.serverTitle')}</h4>
    <table class="security-table">
      <thead>
        <tr>
          <th>${t('security.serverHeaderData')}</th>
          <th>${t('security.serverHeaderState')}</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <h4>${t('security.limitsTitle')}</h4>
    <ul>${limits}</ul>

    <h4>${t('security.ossTitle')}</h4>
    <p>${t('security.ossBody')}</p>
    <p>${t('security.note')}</p>
  `;
}

function updateLanguageControls() {
  const isEnglish = state.lang === 'en';
  if (elements.langSwitchEn) {
    elements.langSwitchEn.classList.toggle('active', isEnglish);
    elements.langSwitchEn.setAttribute('aria-pressed', String(isEnglish));
  }
  if (elements.langSwitchRu) {
    elements.langSwitchRu.classList.toggle('active', !isEnglish);
    elements.langSwitchRu.setAttribute('aria-pressed', String(!isEnglish));
  }
  if (elements.langOptionEn) elements.langOptionEn.classList.toggle('active', isEnglish);
  if (elements.langOptionRu) elements.langOptionRu.classList.toggle('active', !isEnglish);
  if (elements.languageRecommendation) {
    elements.languageRecommendation.textContent = t('lang.recommendation', { language: LANGUAGE_LABELS[state.detectedLang] });
  }

  const originalNodes = [
    elements.projectDisclaimerOriginal,
    document.querySelector('.warning-card__original'),
  ];
  originalNodes.forEach(node => {
    if (!node) return;
    node.classList.toggle('hidden', state.lang !== 'ru');
  });
}

function applyTranslations({ rerenderChat = true } = {}) {
  document.documentElement.lang = state.lang;
  document.body.dataset.lang = state.lang;
  document.title = t('meta.title');

  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
  });

  renderSecurityContent();
  updateLanguageControls();
  updateAuthUI();
  renderContacts();
  updateConnectionStatus();

  if (state.activeContact && elements.chatName) {
    elements.chatName.textContent = getContactLabel(state.activeContact);
  }

  if (rerenderChat && state.token && state.activeContact) {
    fetchMessages(true).catch(() => { });
  }
}

function previewLanguage(lang) {
  state.pendingLang = normalizeLanguage(lang);
  state.lang = state.pendingLang;
  applyTranslations({ rerenderChat: false });
}

function setLanguage(lang, { persist = false, announce = false, rerenderChat = true } = {}) {
  state.pendingLang = normalizeLanguage(lang);
  state.lang = state.pendingLang;
  if (persist) {
    state.languageConfirmed = true;
    localStorage.setItem('shardLang', state.lang);
  }
  applyTranslations({ rerenderChat });
  if (announce) showToast(t('lang.updated'));
}

async function confirmLanguageChoice() {
  setLanguage(state.pendingLang, { persist: true, rerenderChat: false });
  showModal(elements.languageModal, false);
  if (!state.sessionInitialized) {
    await initializeSession();
  } else {
    updateAuthUI();
  }
}

function initLanguage() {
  const saved = localStorage.getItem('shardLang');
  state.detectedLang = detectBrowserLanguage();
  state.languageConfirmed = Boolean(saved);
  state.pendingLang = saved ? normalizeLanguage(saved) : state.detectedLang;
  state.lang = state.pendingLang;
  applyTranslations({ rerenderChat: false });
  showModal(elements.languageModal, !state.languageConfirmed);
}

function apiRoute(path) {
  if (!path || !path.startsWith('/api')) return path;
  if (state.apiMode !== API_MODES.PHP) return path;
  const [base, qs] = path.split('?');
  const route = base.replace(/^\/api\/?/, '');
  const normalized = route.replace(/^\/+/, '');
  const safePath = normalized.split('/').map(encodeURIComponent).join('/');
  const prefix = `api.php?r=${safePath}`;
  return qs ? `${prefix}&${qs}` : prefix;
}

function buildUrl(path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.replace(/^\/+/, '');
}

function normalizeApiMode(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'php') return API_MODES.PHP;
  if (normalized === 'path' || normalized === 'api') return API_MODES.PATH;
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
    const response = await fetch(buildUrl(url), { cache: 'no-store' });
    if (!response.ok) return false;
    const text = await response.text();
    if (!text) return false;
    try {
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function ensureApiMode() {
  if (state.apiMode) return state.apiMode;
  const configured = getConfiguredApiMode();
  if (configured) {
    state.apiMode = configured;
    return state.apiMode;
  }
  state.apiMode = API_MODES.PHP;
  return state.apiMode;
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadLocal(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

async function loadWordlist() {
  if (state.wordlist.length) return;
  const response = await fetch(buildUrl('/static/wordlist.txt'));
  const text = await response.text();
  state.wordlist = text.trim().split(/\s+/g);
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function bytesToBinary(bytes) {
  return Array.from(bytes).map(value => value.toString(2).padStart(8, '0')).join('');
}

function binaryToBytes(binary) {
  const bytes = [];
  for (let index = 0; index < binary.length; index += 8) {
    bytes.push(parseInt(binary.slice(index, index + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function entropyToMnemonic(entropy) {
  const entropyBits = bytesToBinary(entropy);
  const checksumBits = bytesToBinary(await sha256(entropy)).slice(0, entropy.length / 4);
  const combined = entropyBits + checksumBits;
  return combined.match(/.{1,11}/g).map(bits => state.wordlist[parseInt(bits, 2)]).join(' ');
}

async function mnemonicToEntropy(mnemonic) {
  const words = mnemonic.trim().split(/\s+/g);
  if (words.length !== 12) throw new Error(t('errors.mnemonicWordsCount'));
  const bits = words.map(word => {
    const index = state.wordlist.indexOf(word);
    if (index === -1) throw new Error(t('errors.unknownWord', { word }));
    return index.toString(2).padStart(11, '0');
  }).join('');
  const divider = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, divider);
  const checksumBits = bits.slice(divider);
  const entropy = binaryToBytes(entropyBits);
  const checksum = bytesToBinary(await sha256(entropy)).slice(0, checksumBits.length);
  if (checksum !== checksumBits) throw new Error(t('errors.invalidMnemonicChecksum'));
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

function showModal(modal, show) {
  if (!modal) return;
  modal.classList.toggle('hidden', !show);
}

function showToast(text) {
  if (!elements.toast) return;
  elements.toast.textContent = text;
  elements.toast.classList.remove('hidden');
  setTimeout(() => elements.toast.classList.add('hidden'), 1400);
}

function setAutoLogoutBanner(show) {
  if (elements.autoLogoutBanner) elements.autoLogoutBanner.classList.toggle('hidden', !show);
}

function pushNotice(text, kind = 'info') {
  if (!elements.inAppNotifications) return;
  const item = document.createElement('div');
  item.className = `notice notice--${kind}`;
  item.textContent = text;
  elements.inAppNotifications.appendChild(item);
  requestAnimationFrame(() => item.classList.add('notice--show'));
  setTimeout(() => {
    item.classList.remove('notice--show');
    setTimeout(() => item.remove(), 260);
  }, 2400);
}

function openMediaPreview(url, alt) {
  if (!elements.mediaViewer) return;
  elements.mediaViewerImg.src = url;
  elements.mediaViewerImg.alt = alt || t('media.previewAlt');
  elements.mediaViewer.classList.remove('hidden');
}

function closeMediaPreview() {
  if (!elements.mediaViewer) return;
  elements.mediaViewer.classList.add('hidden');
  elements.mediaViewerImg.src = '';
}

function isReloadNavigation() {
  if (!('performance' in window)) return false;
  const entries = performance.getEntriesByType('navigation');
  if (entries && entries.length) return entries[0].type === 'reload';
  return false;
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(node => node.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(node => {
        node.classList.remove('active');
        node.classList.add('tab-leaving');
      });
      button.classList.add('active');

      const isSecurity = button.dataset.tab === 'security';

      if (isSecurity) {
        if (elements.chatView) elements.chatView.classList.add('hidden');
        if (elements.emptyState) elements.emptyState.classList.add('hidden');
        const securityView = document.getElementById('securityView');
        if (securityView) securityView.classList.remove('hidden');
      } else {
        const securityView = document.getElementById('securityView');
        if (securityView) securityView.classList.add('hidden');
        if (state.activeContact) {
          if (elements.emptyState) elements.emptyState.classList.add('hidden');
          if (elements.chatView) elements.chatView.classList.remove('hidden');
        } else {
          if (elements.emptyState) elements.emptyState.classList.remove('hidden');
          if (elements.chatView) elements.chatView.classList.add('hidden');
        }
      }

      const target = document.getElementById(`tab${button.dataset.tab.charAt(0).toUpperCase()}${button.dataset.tab.slice(1)}`);
      if (target) {
        setTimeout(() => {
          document.querySelectorAll('.tab-content').forEach(node => node.classList.remove('tab-leaving'));
          target.classList.add('active');
        }, 150);
      }
    });
  });
}

function resetSessionUI(reason) {
  if (state.poller) {
    clearInterval(state.poller);
    state.poller = null;
  }
  closeStream();
  state.token = null;
  state.me = null;
  state.keys = null;
  state.lastSeen = {};
  state.lastGlobal = '';
  state.fetching = false;
  state.pendingMessages = {};
  state.resolvingContacts = {};
  state.messageCache = {};
  state.contacts = [];
  state.activeContact = null;
  state.renderedIds = new Set();
  state.replyTarget = null;
  state.searchQuery = '';
  state.uploading = false;

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
  showModal(elements.authModal, state.languageConfirmed);
}

async function api(path, options = {}) {
  await ensureApiMode();
  const headers = options.headers || {};
  headers['X-Shard-Lang'] = state.lang;

  if (!options.noAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
    headers['X-Auth-Token'] = state.token;
  }
  if (options.json) headers['Content-Type'] = 'application/json';

  let finalMethod = options.method || 'GET';
  let finalPath = path;
  if (finalMethod.toUpperCase() === 'DELETE' && state.apiMode === API_MODES.PHP) {
    finalMethod = 'POST';
    const glue = finalPath.includes('?') ? '&' : '?';
    finalPath = `${finalPath}${glue}_method=DELETE`;
  }

  const response = await fetch(buildUrl(apiRoute(finalPath)), { ...options, method: finalMethod, headers, cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    const data = parseJsonSafe(text);
    throw new Error((data && data.detail) || text || t('errors.requestFailed'));
  }
  if (options.noJson) return response;
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (data !== null) return data;
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) throw new Error(t('errors.apiReturnedHtml'));
  throw new Error(t('errors.invalidServerResponse'));
}

function contactCodeFor(me) {
  return String(me.id);
}

function parseContactCode(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{6,}$/.test(trimmed)) return { id: parseInt(trimmed, 10) };
  try {
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    const decoded = decodeText(decodeBase64(trimmed));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function getContactLabel(contact) {
  if (state.me && numId(contact.id) === numId(state.me.id)) return t('profile.selfChat');
  return contact.alias || contact.display_name || t('profile.unnamed');
}

function renderContacts() {
  if (!elements.contacts) return;
  elements.contacts.innerHTML = '';
  const query = ((elements.globalSearchInput && elements.globalSearchInput.value) || '').toLowerCase();
  const filtered = query ? state.contacts.filter(contact => {
    const label = getContactLabel(contact).toLowerCase();
    return label.includes(query) || String(contact.id).includes(query);
  }) : state.contacts;

  filtered.forEach(contact => {
    const item = document.createElement('div');
    item.className = `contact-item${state.activeContact && numId(state.activeContact.id) === numId(contact.id) ? ' active' : ''}`;
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

function formatTime(iso) {
  try {
    const date = new Date(iso);
    const isToday = date.toDateString() === new Date().toDateString();
    if (isToday) {
      return date.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.toLocaleDateString(localeCode(), { day: '2-digit', month: '2-digit', year: '2-digit' })} ${date.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    return '';
  }
}

function updateConnectionStatus() {
  if (!elements.chatStatus) return;
  if (!state.activeContact) {
    elements.chatStatus.textContent = t('chat.statusOffline');
    return;
  }
  elements.chatStatus.textContent = state.sseConnected ? t('chat.statusLive') : t('chat.statusSync');
}

function streamEndpoint() {
  const since = state.lastGlobal || '0';
  return buildUrl(apiRoute(`/api/stream?token=${encodeURIComponent(state.token)}&since=${since}`));
}

function closeStream() {
  if (state.sse) {
    state.sse.close();
    state.sse = null;
  }
  state.sseConnected = false;
  updateConnectionStatus();
}

function connectStream() {
  if (!state.token || typeof EventSource === 'undefined') {
    state.sseConnected = false;
    updateConnectionStatus();
    return;
  }
  closeStream();
  const stream = new EventSource(streamEndpoint());
  state.sse = stream;
  stream.addEventListener('message', event => {
    try {
      const message = JSON.parse(event.data);
      if (message && message.id) handleIncomingMessage(message);
    } catch (error) {
    }
  });
  stream.addEventListener('ping', () => { });
  stream.onopen = () => {
    state.sseConnected = true;
    updateConnectionStatus();
    if (state.activeContact) startPolling().catch(() => { });
  };
  stream.onerror = () => {
    state.sseConnected = false;
    updateConnectionStatus();
    if (state.activeContact) startPolling().catch(() => { });
  };
}

async function decryptMessage(message, contact) {
  try {
    const nonce = decodeBase64(message.nonce);
    const cipher = decodeBase64(message.ciphertext);
    const isSelf = state.me && numId(contact.id) === numId(state.me.id);
    const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
    const plain = nacl.box.open(cipher, nonce, otherPublic, state.keys.box.secretKey);
    if (!plain) return null;
    return JSON.parse(decodeText(plain));
  } catch (error) {
    return null;
  }
}

function setReply(msgUuid, text) {
  state.replyTarget = { uuid: msgUuid, text };
  if (elements.replyPreview) elements.replyPreview.classList.remove('hidden');
  if (elements.replyText) elements.replyText.textContent = text.length > 80 ? `${text.slice(0, 80)}...` : text;
  if (elements.messageInput) elements.messageInput.focus();
}

function cancelReply() {
  state.replyTarget = null;
  if (elements.replyPreview) elements.replyPreview.classList.add('hidden');
  if (elements.replyText) elements.replyText.textContent = '';
}

function msgKey(message) {
  return message.uuid || message.id;
}

function appendMessage(message, payload, outgoing) {
  const key = msgKey(message);
  if (state.renderedIds.has(key)) return;
  state.renderedIds.add(key);

  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    const text = payload.text || payload.name || '';
    if (!text.toLowerCase().includes(query)) return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = `message${outgoing ? ' outgoing' : ''}`;
  wrapper.dataset.msgId = key;
  wrapper.dataset.payload = JSON.stringify(payload);

  if (payload.reply_to_text) {
    const quote = document.createElement('div');
    quote.className = 'msg-quote';
    quote.textContent = payload.reply_to_text.length > 60 ? `${payload.reply_to_text.slice(0, 60)}...` : payload.reply_to_text;
    wrapper.appendChild(quote);
  }

  if (payload.type === 'media') {
    const title = document.createElement('div');
    title.textContent = payload.name || t('chat.mediaTitle');
    const button = document.createElement('button');
    button.className = 'ghost';
    button.textContent = t('chat.download');
    button.addEventListener('click', () => downloadMedia(payload));
    wrapper.appendChild(title);
    wrapper.appendChild(button);
    if (payload.mime && payload.mime.startsWith('image/') && !payload.mime.includes('svg')) {
      const image = document.createElement('img');
      image.alt = payload.name || t('media.previewAlt');
      image.style.maxWidth = '220px';
      image.style.marginTop = '10px';
      image.style.borderRadius = '12px';
      image.style.cursor = 'zoom-in';
      loadImage(payload)
        .then(url => {
          image.src = url;
          image.addEventListener('click', () => openMediaPreview(url, payload.name || t('media.previewAlt')));
        })
        .catch(() => { });
      wrapper.appendChild(image);
    }
  } else {
    const textElement = document.createElement('span');
    textElement.className = 'msg-text';
    textElement.textContent = payload.text;
    wrapper.appendChild(textElement);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatTime(message.created_at);
  wrapper.appendChild(meta);

  const reactionsContainer = document.createElement('div');
  reactionsContainer.className = 'reactions';
  reactionsContainer.id = `reactions-${key}`;
  wrapper.appendChild(reactionsContainer);

  if (message.reactions && message.reactions.length) {
    renderReactions(reactionsContainer, message.reactions, key);
  }

  wrapper.addEventListener('contextmenu', event => {
    event.preventDefault();
    showContextMenu(event, message, payload);
  });

  let longPressTimer = null;
  wrapper.addEventListener('touchstart', event => {
    longPressTimer = setTimeout(() => {
      showContextMenu(event.touches[0], message, payload);
    }, 500);
  }, { passive: true });
  wrapper.addEventListener('touchend', () => clearTimeout(longPressTimer));
  wrapper.addEventListener('touchmove', () => clearTimeout(longPressTimer));
  wrapper.addEventListener('dblclick', () => {
    const text = payload.text || payload.name || '';
    setReply(key, text);
  });

  elements.messages.appendChild(wrapper);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderReactions(container, reactions, messageKey) {
  container.innerHTML = '';
  const grouped = {};
  reactions.forEach(reaction => {
    if (!grouped[reaction.emoji]) grouped[reaction.emoji] = [];
    grouped[reaction.emoji].push(reaction);
  });
  Object.entries(grouped).forEach(([emoji, list]) => {
    const badge = document.createElement('span');
    badge.className = 'reaction';
    badge.textContent = `${emoji} ${list.length}`;
    badge.title = list.map(reaction => `#${reaction.user_id}`).join(', ');
    badge.addEventListener('click', () => toggleReaction(messageKey, emoji));
    container.appendChild(badge);
  });
}

function showContextMenu(event, message, payload) {
  state.contextTarget = { message, payload };
  const menu = elements.msgContextMenu;
  if (!menu) return;
  menu.classList.remove('hidden');
  const x = event.clientX || event.pageX || 100;
  const y = event.clientY || event.pageY || 100;
  menu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 140)}px`;
}

function hideContextMenu() {
  if (elements.msgContextMenu) elements.msgContextMenu.classList.add('hidden');
  state.contextTarget = null;
}

function hideReactionPicker() {
  if (elements.reactionPicker) elements.reactionPicker.classList.add('hidden');
}

async function toggleReaction(msgUuid, emoji) {
  try {
    await api('/api/reactions', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ message_id: msgUuid, emoji }),
    });
    const response = await api(`/api/reactions?message_id=${msgUuid}`);
    const container = document.getElementById(`reactions-${msgUuid}`);
    if (container && response.reactions) {
      container.innerHTML = '';
      renderReactions(container, response.reactions, msgUuid);
    }
  } catch (error) {
    pushNotice(t('chat.reactionError', { error: error.message }), 'warn');
  }
}

function showReactionPicker(message) {
  const picker = elements.reactionPicker;
  if (!picker) return;
  picker.classList.remove('hidden');
  const menu = elements.msgContextMenu;
  if (menu) {
    picker.style.left = menu.style.left;
    picker.style.top = `${parseInt(menu.style.top, 10) + 40}px`;
  }
  const key = msgKey(message);
  picker.querySelectorAll('.rpick').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      toggleReaction(key, button.dataset.emoji);
      hideReactionPicker();
    };
  });
}

async function deleteMessage(msgUuid) {
  try {
    await api(`/api/messages/${msgUuid}`, { method: 'DELETE' });
    const element = elements.messages.querySelector(`[data-msg-id="${msgUuid}"]`);
    if (element) {
      element.classList.add('msg-deleting');
      setTimeout(() => element.remove(), 300);
    }
    state.renderedIds.delete(msgUuid);
    pushNotice(t('chat.messageDeleted'), 'info');
  } catch (error) {
    pushNotice(t('chat.genericError', { error: error.message }), 'warn');
  }
}

function updateAuthUI() {
  const unlocked = Boolean(state.token && state.me);
  if (document.body) document.body.classList.toggle('is-locked', !unlocked);
  if (elements.sessionStatus) {
    elements.sessionStatus.dataset.state = unlocked ? 'active' : 'locked';
    elements.sessionStatus.textContent = unlocked ? t('session.active') : t('session.locked');
  }
  if (elements.copyContact) elements.copyContact.disabled = !unlocked;
  if (elements.copyContactSecondary) elements.copyContactSecondary.disabled = !unlocked;
  if (elements.contactCodeInput) elements.contactCodeInput.disabled = !unlocked;
  if (elements.saveContact) elements.saveContact.disabled = !unlocked;
  if (!unlocked) {
    if (elements.meName) elements.meName.textContent = t('profile.unnamed');
    if (elements.meId) elements.meId.textContent = t('profile.sessionInactive');
  }
}

function triggerAppReveal() {
  if (!elements.app) return;
  elements.app.classList.remove('app--enter');
  void elements.app.offsetWidth;
  elements.app.classList.add('app--enter');
}

function getContactById(contactId) {
  return state.contacts.find(contact => numId(contact.id) === numId(contactId));
}

function queuePendingMessage(contactId, message) {
  const key = String(contactId);
  if (!state.pendingMessages[key]) state.pendingMessages[key] = [];
  const messageKey = msgKey(message);
  if (state.pendingMessages[key].some(item => msgKey(item) === messageKey)) return;
  state.pendingMessages[key].push(message);
}

async function resolveContactById(contactId) {
  const key = String(contactId);
  if (state.resolvingContacts[key]) return state.resolvingContacts[key];
  const task = (async () => {
    try {
      const profile = await api(`/api/users/${contactId}`);
      const added = addContact(profile);
      if (added) pushNotice(t('contacts.new'), 'info');
      return profile;
    } catch (error) {
      return null;
    } finally {
      delete state.resolvingContacts[key];
    }
  })();
  state.resolvingContacts[key] = task;
  return task;
}

async function drainPendingMessages(contact) {
  const key = String(contact.id);
  const list = state.pendingMessages[key];
  if (!list || !list.length) return;
  for (const message of list) {
    const messageKey = msgKey(message);
    if (state.renderedIds.has(messageKey)) continue;
    const payload = await decryptMessage(message, contact);
    if (!payload) continue;
    appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
    state.lastSeen[contact.id] = messageKey;
    state.lastGlobal = messageKey;
  }
  delete state.pendingMessages[key];
}

async function handleIncomingMessage(message) {
  const otherId = numId(message.sender_id) === numId(state.me.id) ? message.recipient_id : message.sender_id;
  const isSelf = numId(message.sender_id) === numId(state.me.id) && numId(message.recipient_id) === numId(state.me.id);
  const contactId = isSelf ? state.me.id : otherId;
  const messageKey = msgKey(message);

  let contact = getContactById(contactId);
  const isIncoming = message.sender_id !== state.me.id;
  if (!contact) {
    if (isIncoming) pushNotice(t('chat.unknownSender'), 'warn');
    queuePendingMessage(contactId, message);
    state.lastGlobal = messageKey;
    resolveContactById(contactId).then(resolved => {
      if (resolved && state.activeContact && numId(state.activeContact.id) === numId(resolved.id)) {
        drainPendingMessages(resolved).catch(() => { });
      }
    }).catch(() => { });
    return;
  }

  if (state.renderedIds.has(messageKey)) {
    state.lastGlobal = messageKey;
    return;
  }

  if (isIncoming) {
    pushNotice(contact.display_name ? t('chat.newMessageFrom', { name: getContactLabel(contact) }) : t('chat.newMessage'), 'info');
  }

  if (!state.activeContact || numId(state.activeContact.id) !== numId(contact.id)) {
    queuePendingMessage(contact.id, message);
    state.lastGlobal = messageKey;
    return;
  }

  const payload = await decryptMessage(message, contact);
  if (!payload) return;
  appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
  state.lastSeen[contact.id] = messageKey;
  state.lastGlobal = messageKey;
}

async function downloadMedia(payload) {
  const response = await api(`/api/media/${payload.media_id}`, { noJson: true });
  const encrypted = new Uint8Array(await response.arrayBuffer());
  const decrypted = nacl.secretbox.open(encrypted, decodeBase64(payload.media_nonce), decodeBase64(payload.media_key));
  if (!decrypted) {
    alert(t('chat.mediaDecryptFailed'));
    return;
  }
  const blob = new Blob([decrypted], { type: payload.mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.name || 'file';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadImage(payload) {
  const response = await api(`/api/media/${payload.media_id}`, { noJson: true });
  const encrypted = new Uint8Array(await response.arrayBuffer());
  const decrypted = nacl.secretbox.open(encrypted, decodeBase64(payload.media_nonce), decodeBase64(payload.media_key));
  if (!decrypted) throw new Error('decrypt failed');
  return URL.createObjectURL(new Blob([decrypted], { type: payload.mime || 'image/png' }));
}

async function fetchMessages(force = false) {
  if (!state.activeContact || state.fetching) return;
  state.fetching = true;
  try {
    const contact = state.activeContact;
    const since = force ? '0' : (state.lastSeen[contact.id] || '0');
    if (force) {
      state.lastSeen[contact.id] = '';
      state.renderedIds = new Set();
      elements.messages.innerHTML = '';
    }
    const data = await api(`/api/messages?with_user=${contact.id}&since=${since}`);
    for (const message of data.messages) {
      const payload = await decryptMessage(message, contact);
      if (!payload) continue;
      appendMessage(message, payload, numId(message.sender_id) === numId(state.me.id));
      const messageKey = msgKey(message);
      state.lastSeen[contact.id] = messageKey;
      state.lastGlobal = messageKey;
    }
  } finally {
    state.fetching = false;
  }
}

async function startPolling(force = false) {
  if (state.poller) clearInterval(state.poller);
  await fetchMessages(force);
  const interval = state.sseConnected ? 3000 : 2000;
  state.poller = setInterval(() => fetchMessages().catch(() => { }), interval);
}

async function selectContact(contact) {
  if (!state.token) {
    showModal(elements.authModal, true);
    return;
  }
  const same = state.activeContact && numId(state.activeContact.id) === numId(contact.id);
  if (same) {
    await drainPendingMessages(contact);
    await startPolling();
    return;
  }
  cancelReply();
  setActiveChat(contact);
  delete state.pendingMessages[String(contact.id)];
  await startPolling(true);
}

async function sendMessage(text) {
  const contact = state.activeContact;
  if (!contact) return;
  const payload = { type: 'text', text: text.trim(), ts: new Date().toISOString() };
  if (state.replyTarget) {
    payload.reply_to = state.replyTarget.uuid;
    payload.reply_to_text = state.replyTarget.text;
  }
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const isSelf = state.me && numId(contact.id) === numId(state.me.id);
  const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
  const cipher = nacl.box(encodeText(JSON.stringify(payload)), nonce, otherPublic, state.keys.box.secretKey);
  await api('/api/messages', {
    method: 'POST',
    json: true,
    body: JSON.stringify({ recipient_id: contact.id, ciphertext: encodeBase64(cipher), nonce: encodeBase64(nonce) }),
  });
  elements.messageInput.value = '';
  cancelReply();
  await fetchMessages();
}

function showUploadOverlay(show) {
  if (elements.uploadOverlay) elements.uploadOverlay.classList.toggle('hidden', !show);
  state.uploading = show;
}

async function sendMedia(file) {
  const contact = state.activeContact;
  if (!contact || !file) return;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    pushNotice(t('chat.fileTooLarge', { size: MAX_FILE_SIZE_MB }), 'warn');
    return;
  }
  showUploadOverlay(true);
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const mediaKey = nacl.randomBytes(32);
    const mediaNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(buffer, mediaNonce, mediaKey);
    const form = new FormData();
    form.append('recipient_id', contact.id);
    form.append('file', new Blob([encrypted], { type: 'application/octet-stream' }), file.name);
    const mediaResponse = await api('/api/media', { method: 'POST', body: form });
    const payload = {
      type: 'media',
      media_id: mediaResponse.media_id,
      media_key: encodeBase64(mediaKey),
      media_nonce: encodeBase64(mediaNonce),
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      ts: new Date().toISOString(),
    };
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const isSelf = state.me && numId(contact.id) === numId(state.me.id);
    const otherPublic = isSelf ? state.keys.box.publicKey : decodeBase64(contact.box_public_key);
    const cipher = nacl.box(encodeText(JSON.stringify(payload)), nonce, otherPublic, state.keys.box.secretKey);
    await api('/api/messages', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ recipient_id: contact.id, ciphertext: encodeBase64(cipher), nonce: encodeBase64(nonce) }),
    });
    await fetchMessages();
  } finally {
    showUploadOverlay(false);
  }
}

function saveContactsToStorage() {
  saveLocal('shardContacts', state.contacts);
}

function addContact(contact) {
  if (!contact) return false;
  if (state.contacts.find(item => numId(item.id) === numId(contact.id))) return false;
  state.contacts.push(contact);
  saveContactsToStorage();
  renderContacts();
  return true;
}

async function initializeSession() {
  if (state.sessionInitialized) return;
  state.sessionInitialized = true;
  await loadWordlist();

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
          addSelfContact();
          saveContactsToStorage();
          renderContacts();
        } catch (error) {
        }
        connectStream();
        startPolling().catch(() => { });
        updateAuthUI();
        showModal(elements.authModal, false);
        showModal(elements.languageModal, false);
        triggerAppReveal();
        return;
      } catch (error) {
        localStorage.removeItem('shardToken');
      }
    }
  }

  const reason = isReloadNavigation() ? 'reload' : 'init';
  resetSessionUI(reason);
}

function addSelfContact() {
  if (!state.me) return;
  if (!state.contacts.find(contact => numId(contact.id) === numId(state.me.id))) {
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
  if (!mnemonic) {
    alert(t('auth.enterMnemonic'));
    return;
  }
  const displayName = elements.displayNameInput.value.trim() || t('profile.unnamed');

  if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    try {
      state.keys = await deriveKeys(mnemonic);
    } catch (error) {
      alert(error.message || t('auth.invalidMnemonic'));
      return;
    }

    const signPublic = encodeBase64(state.keys.sign.publicKey);
    const boxPublic = encodeBase64(state.keys.box.publicKey);
    const profile = await api('/api/register', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ display_name: displayName, sign_public_key: signPublic, box_public_key: boxPublic }),
      noAuth: true,
    });
    const challenge = await api('/api/challenge', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ sign_public_key: signPublic }),
      noAuth: true,
    });
    const signature = nacl.sign.detached(decodeBase64(challenge.nonce), state.keys.sign.secretKey);
    const auth = await api('/api/auth', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ sign_public_key: signPublic, nonce: challenge.nonce, signature: encodeBase64(signature) }),
      noAuth: true,
    });

    state.token = auth.token;
    state.me = profile;
    elements.meName.textContent = profile.display_name;
    elements.meId.textContent = `#${profile.id}`;

    state.staySigned = Boolean(elements.staySignedToggle && elements.staySignedToggle.checked);
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
    } catch (error) {
    }

    try {
      await api('/api/contacts', {
        method: 'POST',
        json: true,
        body: JSON.stringify({ contact_id: profile.id }),
      });
    } catch (error) {
    }

    connectStream();
    startPolling().catch(() => { });
    updateAuthUI();
    setAutoLogoutBanner(false);
    triggerAppReveal();
    showModal(elements.authModal, false);
  } finally {
    if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
  }
}

async function generateNewMnemonic() {
  if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const mnemonic = await generateMnemonic();
    elements.generatedMnemonic.textContent = mnemonic;
    elements.generatedBox.classList.remove('hidden');
    elements.mnemonicInput.value = mnemonic;
  } finally {
    if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast(t('toast.copied'))).catch(() => { });
}

async function handleContactSave() {
  if (!state.token) {
    alert(t('auth.signInFirst'));
    return;
  }

  const value = elements.contactCodeInput.value.trim();
  if (!value) return;

  let contact = null;

  if (/^\d+$/.test(value)) {
    try {
      contact = await api(`/api/users/${value}`);
    } catch (error) {
      alert(t('contacts.userIdNotFound'));
      return;
    }
  } else {
    contact = parseContactCode(value);
    if (!contact || !contact.id) {
      try {
        contact = await api(`/api/users/by_sign_key?key=${encodeURIComponent(value)}`);
      } catch (error) {
        alert(t('contacts.invalidCode'));
        return;
      }
    } else {
      try {
        contact = await api(`/api/users/${contact.id}`);
      } catch (error) {
        alert(t('contacts.userNotFound'));
        return;
      }
    }
  }

  try {
    const saved = await api('/api/contacts', {
      method: 'POST',
      json: true,
      body: JSON.stringify({ contact_id: contact.id }),
    });
    const full = { ...contact, ...saved };
    const added = addContact(full);
    if (added) pushNotice(t('contacts.added'), 'success');
    else pushNotice(t('contacts.exists'), 'info');
  } catch (error) {
    alert(error.message || t('contacts.addFailed'));
    return;
  }

  elements.contactCodeInput.value = '';
}

function lock() {
  resetSessionUI('lock');
}

function handleChatSearch() {
  const query = ((elements.chatSearch && elements.chatSearch.value) || '').trim();
  state.searchQuery = query;
  if (state.activeContact) {
    state.renderedIds = new Set();
    elements.messages.innerHTML = '';
    fetchMessages(true).catch(() => { });
  }
}

function wireLanguageButton(button, lang) {
  if (!button) return;
  button.addEventListener('click', () => {
    if (!state.languageConfirmed) {
      previewLanguage(lang);
      return;
    }
    setLanguage(lang, { persist: true, announce: true });
  });
}

function wireEvents() {
  wireLanguageButton(elements.langSwitchEn, 'en');
  wireLanguageButton(elements.langSwitchRu, 'ru');
  if (elements.langOptionEn) elements.langOptionEn.addEventListener('click', () => previewLanguage('en'));
  if (elements.langOptionRu) elements.langOptionRu.addEventListener('click', () => previewLanguage('ru'));
  if (elements.languageConfirmBtn) elements.languageConfirmBtn.addEventListener('click', () => confirmLanguageChoice().catch(error => console.error(error)));

  elements.generateBtn.addEventListener('click', generateNewMnemonic);
  elements.unlockBtn.addEventListener('click', () => unlock().catch(error => alert(error && error.message ? error.message : t('auth.unlockError'))));
  elements.copyMnemonic.addEventListener('click', () => copyText(elements.generatedMnemonic.textContent));

  elements.copyContact.addEventListener('click', () => {
    if (state.me) copyText(contactCodeFor(state.me));
  });
  if (elements.copyContactSecondary) {
    elements.copyContactSecondary.addEventListener('click', () => {
      if (state.me) copyText(contactCodeFor(state.me));
    });
  }
  if (elements.focusContactInput) {
    elements.focusContactInput.addEventListener('click', () => {
      if (elements.contactCodeInput) elements.contactCodeInput.focus();
    });
  }

  elements.saveContact.addEventListener('click', handleContactSave);
  elements.sendBtn.addEventListener('click', () => {
    const text = elements.messageInput.value.trim();
    if (!text) return;
    sendMessage(text).catch(error => alert(error.message));
  });
  elements.messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const text = elements.messageInput.value.trim();
      if (!text) return;
      sendMessage(text).catch(error => alert(error.message));
    }
  });
  elements.fileInput.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    sendMedia(file).catch(error => pushNotice(error.message, 'warn'));
    elements.fileInput.value = '';
  });

  const chatArea = elements.chatView;
  if (chatArea) {
    let dragCounter = 0;
    chatArea.addEventListener('dragenter', event => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter += 1;
      if (elements.dropOverlay) elements.dropOverlay.classList.remove('hidden');
    });
    chatArea.addEventListener('dragleave', event => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter -= 1;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (elements.dropOverlay) elements.dropOverlay.classList.add('hidden');
      }
    });
    chatArea.addEventListener('dragover', event => {
      event.preventDefault();
      event.stopPropagation();
    });
    chatArea.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter = 0;
      if (elements.dropOverlay) elements.dropOverlay.classList.add('hidden');
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file) return;
      if (!state.activeContact) {
        pushNotice(t('chat.selectContactFirst'), 'warn');
        return;
      }
      sendMedia(file).catch(error => pushNotice(error.message, 'warn'));
    });
  }

  elements.contactCodeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleContactSave();
    }
  });
  elements.lockBtn.addEventListener('click', lock);
  if (elements.replyCancel) elements.replyCancel.addEventListener('click', cancelReply);

  if (elements.chatSearch) {
    let searchTimer = null;
    elements.chatSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(handleChatSearch, 300);
    });
  }

  if (elements.globalSearchInput) {
    elements.globalSearchInput.addEventListener('input', () => renderContacts());
  }

  if (elements.mediaViewer) {
    elements.mediaViewer.addEventListener('click', event => {
      if (event.target === elements.mediaViewer || (event.target && event.target.classList.contains('media-backdrop'))) {
        closeMediaPreview();
      }
    });
  }

  if (elements.msgContextMenu) {
    elements.msgContextMenu.querySelectorAll('.context-item').forEach(item => {
      item.onclick = event => {
        event.stopPropagation();
        const action = item.dataset.action;
        const target = state.contextTarget;
        if (!target) return;
        if (action === 'reply') {
          hideContextMenu();
          const text = target.payload.text || target.payload.name || '';
          setReply(msgKey(target.message), text);
        } else if (action === 'react') {
          hideContextMenu();
          showReactionPicker(target.message);
        } else if (action === 'delete') {
          const shouldDelete = confirm(t('chat.deleteConfirm'));
          hideContextMenu();
          if (shouldDelete) deleteMessage(msgKey(target.message));
        }
      };
    });
  }

  document.addEventListener('click', event => {
    if (elements.msgContextMenu && !elements.msgContextMenu.contains(event.target)) hideContextMenu();
    if (elements.reactionPicker && !elements.reactionPicker.contains(event.target)) hideReactionPicker();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMediaPreview();
      hideContextMenu();
      hideReactionPicker();
      cancelReply();
    }
  });
}

async function boot() {
  initElements();
  initTabs();
  initLanguage();
  wireEvents();
  if (state.languageConfirmed) {
    await initializeSession();
  } else {
    updateAuthUI();
    showModal(elements.authModal, false);
    showModal(elements.languageModal, true);
  }
}

boot().catch(error => console.error(error));

window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});
