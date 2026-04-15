<?php
declare(strict_types=1);

// Shard PHP backend (FastAPI replacement for shared hosting)

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function normalize_lang(string $value): string
{
    $value = strtolower(trim($value));
    return str_starts_with($value, 'ru') ? 'ru' : 'en';
}

function detect_request_lang(): string
{
    $explicit = $_SERVER['HTTP_X_SHARD_LANG'] ?? '';
    if ($explicit !== '') {
        return normalize_lang((string)$explicit);
    }

    $accept = (string)($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
    foreach (explode(',', $accept) as $part) {
        $tag = trim((string)explode(';', $part)[0]);
        if ($tag !== '') {
            return normalize_lang($tag);
        }
    }

    return 'en';
}

$SHARD_LANG = detect_request_lang();
header('Content-Language: ' . $SHARD_LANG);
header('Vary: Accept-Language, X-Shard-Lang');

$BASE_DIR = dirname(__FILE__);
$DATA_DIR = $BASE_DIR . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($DATA_DIR)) {
    @mkdir($DATA_DIR, 0775, true);
}
$dbPath = getenv('SHARD_DB');
if (!$dbPath) {
    $dbPath = getenv('MESSANGER_DB');
}
if (!$dbPath) {
    $dbPath = $DATA_DIR . DIRECTORY_SEPARATOR . 'shard.db';
}

$MEDIA_DIR = $DATA_DIR . DIRECTORY_SEPARATOR . 'media';
if (!is_dir($MEDIA_DIR)) {
    @mkdir($MEDIA_DIR, 0775, true);
}

const CHALLENGE_TTL_SECONDS = 300;
const SESSION_TTL_SECONDS = 43200;
const ID_MIN_DIGITS = 10;
const ID_MAX_DIGITS = 15;

const MAX_JSON_BYTES = 65536;
const MAX_MESSAGE_CIPHERTEXT = 32768;
const MAX_MESSAGE_NONCE = 128;
const MAX_TOKEN_BYTES = 512;
const MAX_DISPLAY_NAME = 64;

const RATE_WINDOW_SECONDS = 60;
const RATE_GLOBAL = 180;
const RATE_AUTH = 20;
const RATE_MSG_GET = 240;
const RATE_MSG_POST = 60;
const RATE_MEDIA_POST = 10;
const RATE_CONTACT_POST = 30;
const RATE_USER_LOOKUP = 60;
const RATE_REACTIONS = 60;
const RATE_MSG_DELETE = 30;
const RATE_STREAM = 30;
const RATE_PAIR_CODE = 30;
const PAIR_CODE_TTL_SECONDS = 600;
const PAIR_CODE_LENGTH = 6;
const SHARD_BUILD = 13;

header('X-Shard-Build: ' . SHARD_BUILD);

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function translate_error_message(string $message): string
{
    global $SHARD_LANG;

    $catalog = [
        'ru' => [
            'Payload too large' => 'Слишком большой запрос',
            'Invalid JSON' => 'Некорректный JSON',
            'Invalid base64 payload' => 'Некорректный base64 payload',
            'Too many requests' => 'Слишком много запросов',
            'Invalid token' => 'Неверный токен',
            'Token expired' => 'Срок действия токена истек',
            'Missing auth token' => 'Отсутствует auth token',
            'Missing token' => 'Отсутствует токен',
            'Not Found' => 'Не найдено',
            'display_name required' => 'Поле display_name обязательно',
            'display_name too long' => 'Поле display_name слишком длинное',
            'User not registered' => 'Пользователь не зарегистрирован',
            'Challenge not found' => 'Challenge не найден',
            'Nonce mismatch' => 'Nonce не совпадает',
            'Challenge expired' => 'Срок действия challenge истек',
            'Sodium extension missing' => 'Расширение sodium недоступно',
            'Invalid signature' => 'Неверная подпись',
            'User not found' => 'Пользователь не найден',
            'contact_id required' => 'Поле contact_id обязательно',
            'Invalid payload' => 'Некорректный payload',
            'Message too large' => 'Сообщение слишком большое',
            'Invalid nonce' => 'Некорректный nonce',
            'Recipient not found' => 'Получатель не найден',
            'with_user required' => 'Параметр with_user обязателен',
            'Message not found' => 'Сообщение не найдено',
            'Forbidden' => 'Доступ запрещен',
            'message_id and emoji required' => 'Поля message_id и emoji обязательны',
            'Emoji too long' => 'Emoji слишком длинный',
            'message_id required' => 'Поле message_id обязательно',
            'recipient_id required' => 'Поле recipient_id обязательно',
            'file required' => 'Файл обязателен',
            'Failed to store media' => 'Не удалось сохранить медиафайл',
            'Media not found' => 'Медиафайл не найден',
            'pair code required' => 'Код подключения обязателен',
            'Pair code not found' => 'Код подключения не найден или истек',
            'Cannot redeem your own pair code' => 'Нельзя активировать свой собственный код подключения',
        ],
        'en' => [
            'Файл слишком большой (лимит сервера)' => 'File is too large (server limit)',
            'Файл слишком большой' => 'File is too large',
            'Файл загружен частично' => 'File upload was incomplete',
            'Файл не загружен' => 'No file was uploaded',
        ],
    ];

    if (isset($catalog[$SHARD_LANG][$message])) {
        return $catalog[$SHARD_LANG][$message];
    }

    if (preg_match('/^(.+) must be 32 bytes$/', $message, $matches)) {
        if ($SHARD_LANG === 'ru') {
            return 'Поле ' . $matches[1] . ' должно быть размером 32 байта';
        }
        return $message;
    }

    if (preg_match('/^Upload failed \(code (\d+)\)$/', $message, $matches)) {
        if ($SHARD_LANG === 'ru') {
            return 'Загрузка не удалась (код ' . $matches[1] . ')';
        }
        return $message;
    }

    if (preg_match('/^Файл слишком большой \(макс\. ([0-9.]+) МБ\)$/u', $message, $matches)) {
        if ($SHARD_LANG === 'en') {
            return 'File is too large (max. ' . $matches[1] . ' MB)';
        }
        return $message;
    }

    return $message;
}

function fail(int $status, string $message): void
{
    json_response(['detail' => translate_error_message($message)], $status);
}

function utcnow(): string
{
    return gmdate('Y-m-d\TH:i:s\Z');
}

function parse_json_body(int $maxBytes = MAX_JSON_BYTES): array
{
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > 0 && $length > $maxBytes) {
        fail(413, 'Payload too large');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > $maxBytes) {
        fail(413, 'Payload too large');
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        fail(400, 'Invalid JSON');
    }
    return $decoded;
}

function b64decode(string $value): string
{
    $decoded = base64_decode($value, true);
    if ($decoded === false) {
        fail(400, 'Invalid base64 payload');
    }
    return $decoded;
}

function validate_public_key(string $value, string $label): void
{
    $raw = b64decode($value);
    if (strlen($raw) !== 32) {
        fail(400, $label . ' must be 32 bytes');
    }
}

function get_client_ip(): string
{
    // On shared hosting without an explicit trusted proxy known to PHP, 
    // relying on X-Forwarded-For allows trivial rate-limit bypass.
    // The web server (ISPmanager NGINX proxy) usually sets REMOTE_ADDR to the real client IP.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return $ip ?: 'unknown';
}

function rate_limit(PDO $pdo, string $key, int $max, int $window): void
{
    $now = time();
    $stmt = $pdo->prepare('SELECT ts, count FROM rate_limits WHERE key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) {
        $pdo->prepare('INSERT INTO rate_limits (key, ts, count) VALUES (?, ?, ?)')
            ->execute([$key, $now, 1]);
    }
    else {
        $ts = (int)$row['ts'];
        $count = (int)$row['count'];
        if ($now - $ts >= $window) {
            $pdo->prepare('UPDATE rate_limits SET ts = ?, count = 1 WHERE key = ?')
                ->execute([$now, $key]);
        }
        else {
            if ($count >= $max) {
                fail(429, 'Too many requests');
            }
            $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
                ->execute([$key]);
        }
    }
    if ($now % 60 === 0) {
        $cutoff = $now - ($window * 10);
        $pdo->prepare('DELETE FROM rate_limits WHERE ts < ?')->execute([$cutoff]);
    }
}

function apply_rate_limits(PDO $pdo, string $route, string $method): void
{
    $ip = get_client_ip();
    rate_limit($pdo, 'ip:' . $ip . ':global', RATE_GLOBAL, RATE_WINDOW_SECONDS);
    $token = get_bearer_token();
    $actor = $token ? 'tok:' . $token : 'ip:' . $ip;

    if ($route === '/health') {
        rate_limit($pdo, $actor . ':health', 60, RATE_WINDOW_SECONDS);
        return;
    }
    if (in_array($route, ['/register', '/challenge', '/auth'], true)) {
        rate_limit($pdo, $actor . ':auth', RATE_AUTH, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/messages' && $method === 'POST') {
        rate_limit($pdo, $actor . ':msgpost', RATE_MSG_POST, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/messages' && $method === 'GET') {
        rate_limit($pdo, $actor . ':msgget', RATE_MSG_GET, RATE_WINDOW_SECONDS);
        return;
    }
    if (preg_match('#^/messages/[a-f0-9]{32}$#', $route) && $method === 'DELETE') {
        rate_limit($pdo, $actor . ':msgdel', RATE_MSG_DELETE, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/media' && $method === 'POST') {
        rate_limit($pdo, $actor . ':media', RATE_MEDIA_POST, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/contacts' && $method === 'POST') {
        rate_limit($pdo, $actor . ':contactpost', RATE_CONTACT_POST, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/users/by_sign_key' || $route === '/users/by_box_key' || preg_match('#^/users/\d+$#', $route)) {
        rate_limit($pdo, $actor . ':userlookup', RATE_USER_LOOKUP, RATE_WINDOW_SECONDS);
        return;
    }
    if (($route === '/pair-codes' || $route === '/pair-codes/redeem') && $method === 'POST') {
        rate_limit($pdo, $actor . ':paircode', RATE_PAIR_CODE, RATE_WINDOW_SECONDS);
        return;
    }
    if ($route === '/reactions' && ($method === 'POST' || $method === 'GET')) {
        rate_limit($pdo, $actor . ':reactions', RATE_REACTIONS, RATE_WINDOW_SECONDS);
        return;
    }
}

function db(): PDO
{
    static $pdo = null;
    global $dbPath;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL;');
    $pdo->exec('PRAGMA synchronous=NORMAL;'); // Optimize WAL concurrency
    $pdo->exec('PRAGMA foreign_keys=ON;');

    $version = (int)$pdo->query('PRAGMA user_version;')->fetchColumn();
    if ($version < 1) {
        init_db($pdo);
        migrate_sequential_user_ids($pdo);
        $version = 1;
        $pdo->exec('PRAGMA user_version = 1;');
    }
    if ($version < 2) {
        migrate_pair_codes_schema($pdo);
        $pdo->exec('PRAGMA user_version = 2;');
    }

    return $pdo;
}

function init_db(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        display_name TEXT NOT NULL,
        sign_public_key TEXT UNIQUE NOT NULL,
        box_public_key TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sign_public_key TEXT NOT NULL,
        nonce TEXT NOT NULL,
        expires_at TEXT NOT NULL
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        ciphertext TEXT NOT NULL,
        nonce TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS contacts (
        owner_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        alias TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (owner_id, contact_id),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        count INTEGER NOT NULL
    );');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, id);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, id);');
    // Migrate existing messages without uuid BEFORE creating indexes on the new column
    migrate_message_uuids($pdo);
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_messages_uuid ON messages(uuid);');
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_uuid_unique ON messages(uuid);');
    $pdo->exec('CREATE TABLE IF NOT EXISTS reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);');
    $pdo->exec('CREATE TABLE IF NOT EXISTS pair_codes (
        code TEXT PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_pair_codes_owner ON pair_codes(owner_id);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_pair_codes_expires ON pair_codes(expires_at);');
}

function migrate_pair_codes_schema(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS pair_codes (
        code TEXT PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_pair_codes_owner ON pair_codes(owner_id);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_pair_codes_expires ON pair_codes(expires_at);');
}

function cleanup_pair_codes(PDO $pdo): void
{
    $pdo->prepare('DELETE FROM pair_codes WHERE expires_at <= ?')->execute([utcnow()]);
}

function generate_pair_code(PDO $pdo): string
{
    $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $maxIndex = strlen($alphabet) - 1;
    while (true) {
        $code = '';
        for ($i = 0; $i < PAIR_CODE_LENGTH; $i++) {
            $code .= $alphabet[random_int(0, $maxIndex)];
        }
        $stmt = $pdo->prepare('SELECT 1 FROM pair_codes WHERE code = ?');
        $stmt->execute([$code]);
        if (!$stmt->fetchColumn()) {
            return $code;
        }
    }
}

function create_pair_code(PDO $pdo, int $ownerId): array
{
    cleanup_pair_codes($pdo);
    $pdo->prepare('DELETE FROM pair_codes WHERE owner_id = ?')->execute([$ownerId]);
    $code = generate_pair_code($pdo);
    $created = utcnow();
    $expires = gmdate('Y-m-d\TH:i:s\Z', time() + PAIR_CODE_TTL_SECONDS);
    $pdo->prepare('INSERT INTO pair_codes (code, owner_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$code, $ownerId, $expires, $created]);
    return ['code' => $code, 'expires_at' => $expires];
}

function upsert_contact_pair(PDO $pdo, int $leftUserId, int $rightUserId): void
{
    $created = utcnow();
    $pdo->prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, alias, created_at) VALUES (?, ?, NULL, ?)')
        ->execute([$leftUserId, $rightUserId, $created]);
    $pdo->prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, alias, created_at) VALUES (?, ?, NULL, ?)')
        ->execute([$rightUserId, $leftUserId, $created]);
}

function migrate_message_uuids(PDO $pdo): void
{
    // Add uuid column if missing (for existing DBs)
    try {
        $pdo->exec('ALTER TABLE messages ADD COLUMN uuid TEXT');
    }
    catch (PDOException $e) {
    // Column already exists, ignore
    }
    // Fill in any null uuids
    try {
        $stmt = $pdo->query('SELECT id FROM messages WHERE uuid IS NULL');
        if ($stmt) {
            $rows = $stmt->fetchAll();
            foreach ($rows as $row) {
                $uuid = bin2hex(random_bytes(16));
                $pdo->prepare('UPDATE messages SET uuid = ? WHERE id = ?')->execute([$uuid, (int)$row['id']]);
            }
        }
    }
    catch (PDOException $e) {
    // Ignore if structural error.
    }
}

function id_needs_rotation(int $id): bool
{
    return strlen((string)$id) < ID_MIN_DIGITS;
}

function generate_user_id(PDO $pdo): int
{
    while (true) {
        $digits = random_int(ID_MIN_DIGITS, ID_MAX_DIGITS);
        $min = 10 ** ($digits - 1);
        $max = (10 ** $digits) - 1;
        $candidate = random_int($min, $max);
        $stmt = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
        $stmt->execute([$candidate]);
        if (!$stmt->fetchColumn()) {
            return $candidate;
        }
    }
}



function migrate_sequential_user_ids(PDO $pdo): void
{
    $rows = $pdo->query('SELECT id FROM users')->fetchAll();
    if (!$rows) {
        return;
    }
    $existing = [];
    foreach ($rows as $row) {
        $existing[(int)$row['id']] = true;
    }
    $mapping = [];
    foreach ($rows as $row) {
        $old_id = (int)$row['id'];
        if (!id_needs_rotation($old_id)) {
            continue;
        }
        if (isset($mapping[$old_id])) {
            continue;
        }
        do {
            $candidate = generate_user_id($pdo);
        } while (isset($existing[$candidate]));
        $mapping[$old_id] = $candidate;
        $existing[$candidate] = true;
    }
    if (!$mapping) {
        return;
    }
    $pdo->exec('PRAGMA foreign_keys=OFF;');
    foreach ($mapping as $old => $new) {
        $pdo->prepare('UPDATE users SET id = ? WHERE id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE sessions SET user_id = ? WHERE user_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE messages SET sender_id = ? WHERE sender_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE messages SET recipient_id = ? WHERE recipient_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE media SET owner_id = ? WHERE owner_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE media SET recipient_id = ? WHERE recipient_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE contacts SET owner_id = ? WHERE owner_id = ?')->execute([$new, $old]);
        $pdo->prepare('UPDATE contacts SET contact_id = ? WHERE contact_id = ?')->execute([$new, $old]);
        try {
            $pdo->prepare('UPDATE pair_codes SET owner_id = ? WHERE owner_id = ?')->execute([$new, $old]);
        }
        catch (PDOException $e) {
        }
    }
    $pdo->exec('PRAGMA foreign_keys=ON;');
}

function get_bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }
    if ($header && stripos($header, 'Bearer ') === 0) {
        $token = trim(substr($header, 7));
        if (strlen($token) > MAX_TOKEN_BYTES) {
            return null;
        }
        return $token;
    }
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$token && isset($_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'])) {
        $token = $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'];
    }
    if (!$token && function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $name => $value) {
            if (strcasecmp($name, 'X-Auth-Token') === 0) {
                $token = $value;
                break;
            }
        }
    }
    if ($token) {
        $token = trim($token);
        if (strlen($token) > MAX_TOKEN_BYTES) {
            return null;
        }
        return $token;
    }
    return null;
}

function get_user_by_token(PDO $pdo, string $token): array
{
    $stmt = $pdo->prepare('SELECT users.id, users.display_name, users.sign_public_key, users.box_public_key, sessions.expires_at
        FROM sessions
        JOIN users ON sessions.user_id = users.id
        WHERE sessions.token = ?');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(401, 'Invalid token');
    }
    if (strtotime($row['expires_at']) <= time()) {
        fail(401, 'Token expired');
    }
    return $row;
}

function require_user(PDO $pdo): array
{
    $token = get_bearer_token();
    if (!$token) {
        fail(401, 'Missing auth token');
    }
    return get_user_by_token($pdo, $token);
}

function handle_stream(PDO $pdo): void
{
    $token = $_GET['token'] ?? null;
    if (!$token) {
        fail(401, 'Missing token');
    }
    $ip = get_client_ip();
    rate_limit($pdo, 'ip:' . $ip . ':global', RATE_GLOBAL, RATE_WINDOW_SECONDS);
    rate_limit($pdo, 'tok:' . $token . ':stream', RATE_STREAM, RATE_WINDOW_SECONDS);
    $user = get_user_by_token($pdo, $token);
    $sinceParam = isset($_GET['since']) ? (string)$_GET['since'] : '0';
    $last = 0;
    if ($sinceParam !== '' && $sinceParam !== '0') {
        if (ctype_digit($sinceParam)) {
            $last = (int)$sinceParam;
        }
        else {
            $lookup = $pdo->prepare('SELECT id FROM messages WHERE uuid = ?');
            $lookup->execute([$sinceParam]);
            $found = $lookup->fetch();
            $last = $found ? (int)$found['id'] : 0;
        }
    }
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-store');
    header('Connection: keep-alive');
    @ob_end_flush();
    @ob_implicit_flush(true);

    $start = time();
    while (time() - $start < 20) {
        if (connection_aborted()) {
            break;
        }
        $stmt = $pdo->prepare('SELECT id, uuid, sender_id, recipient_id, ciphertext, nonce, created_at
            FROM messages
            WHERE (sender_id = :uid OR recipient_id = :uid) AND id > :last
            ORDER BY id ASC');
        $stmt->execute([':uid' => $user['id'], ':last' => $last]);
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $last = (int)$row['id'];
            // Expose uuid externally, hide internal id
            $external = $row;
            unset($external['id']);
            echo "event: message\n";
            echo 'data: ' . json_encode($external, JSON_UNESCAPED_UNICODE) . "\n\n";
        }
        echo "event: ping\n";
        echo "data: {}\n\n";
        @flush();
        @ob_flush();
        sleep(1);
    }
    exit;
}

$pdo = db();
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiPos = strpos($path, '/api/');
if ($apiPos === false && str_ends_with($path, '/api')) {
    $apiPos = strpos($path, '/api');
}
$apiPath = $apiPos === false ? $path : substr($path, $apiPos);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Method spoofing for environments blocking DELETE/PUT
if ($method === 'POST') {
    $spoof = $_GET['_method'] ?? $_POST['_method'] ?? '';
    if (!$spoof) {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $bodySpoof = parse_json_body(MAX_JSON_BYTES);
            $spoof = $bodySpoof['_method'] ?? '';
        }
    }
    if (strtoupper((string)$spoof) === 'DELETE') {
        $method = 'DELETE';
    }
}

if (strpos($apiPath, '/api/') !== 0) {
    $routeParam = $_GET['r'] ?? '';
    if ($routeParam === '' && isset($_SERVER['QUERY_STRING'])) {
        $qs = [];
        parse_str($_SERVER['QUERY_STRING'], $qs);
        if (isset($qs['r'])) {
            $routeParam = (string)$qs['r'];
        }
    }
    if ($routeParam === '' && isset($_SERVER['PATH_INFO'])) {
        $routeParam = (string)$_SERVER['PATH_INFO'];
    }
    if ($routeParam !== '') {
        $routeParam = '/' . ltrim((string)$routeParam, '/');
        if (strpos($routeParam, '/api/') === 0) {
            $apiPath = $routeParam;
        }
        else {
            $apiPath = '/api' . $routeParam;
        }
    }
}

if ($apiPath === '/api/stream') {
    handle_stream($pdo);
}

if (strpos($apiPath, '/api/') !== 0) {
    fail(404, 'Not Found');
}

$route = substr($apiPath, 4); // remove /api

apply_rate_limits($pdo, $route, $method);

if ($route === '/health' && $method === 'GET') {
    json_response(['status' => 'ok']);
}

if ($route === '/register' && $method === 'POST') {
    $payload = parse_json_body();
    $display = trim((string)($payload['display_name'] ?? ''));
    $signKey = (string)($payload['sign_public_key'] ?? '');
    $boxKey = (string)($payload['box_public_key'] ?? '');
    if ($display === '') {
        fail(400, 'display_name required');
    }
    if (strlen($display) > MAX_DISPLAY_NAME) {
        fail(400, 'display_name too long');
    }
    validate_public_key($signKey, 'sign_public_key');
    validate_public_key($boxKey, 'box_public_key');

    $stmt = $pdo->prepare('SELECT id FROM users WHERE sign_public_key = ?');
    $stmt->execute([$signKey]);
    $row = $stmt->fetch();
    if ($row) {
        $user_id = (int)$row['id'];
        if (id_needs_rotation($user_id)) {
            $new_id = generate_user_id($pdo);
            $pdo->exec('PRAGMA foreign_keys=OFF;');
            $pdo->prepare('UPDATE users SET id = ? WHERE id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE sessions SET user_id = ? WHERE user_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE messages SET sender_id = ? WHERE sender_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE messages SET recipient_id = ? WHERE recipient_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE media SET owner_id = ? WHERE owner_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE media SET recipient_id = ? WHERE recipient_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE contacts SET owner_id = ? WHERE owner_id = ?')->execute([$new_id, $user_id]);
            $pdo->prepare('UPDATE contacts SET contact_id = ? WHERE contact_id = ?')->execute([$new_id, $user_id]);
            try {
                $pdo->prepare('UPDATE pair_codes SET owner_id = ? WHERE owner_id = ?')->execute([$new_id, $user_id]);
            }
            catch (PDOException $e) {
            }
            $pdo->exec('PRAGMA foreign_keys=ON;');
            $user_id = $new_id;
        }
        // Display name is set only at registration; existing users keep their name
        $pdo->prepare('UPDATE users SET box_public_key = ? WHERE id = ?')
            ->execute([$boxKey, $user_id]);
    }
    else {
        $user_id = generate_user_id($pdo);
        $pdo->prepare('INSERT INTO users (id, display_name, sign_public_key, box_public_key, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$user_id, $display, $signKey, $boxKey, utcnow()]);
    }

    $stmt = $pdo->prepare('SELECT id, display_name, sign_public_key, box_public_key FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    json_response($user);
}

if ($route === '/challenge' && $method === 'POST') {
    $payload = parse_json_body();
    $signKey = (string)($payload['sign_public_key'] ?? '');
    validate_public_key($signKey, 'sign_public_key');
    $stmt = $pdo->prepare('SELECT id FROM users WHERE sign_public_key = ?');
    $stmt->execute([$signKey]);
    $user = $stmt->fetch();
    if (!$user) {
        fail(404, 'User not registered');
    }
    $nonce = base64_encode(random_bytes(32));
    $expires = gmdate('Y-m-d\TH:i:s\Z', time() + CHALLENGE_TTL_SECONDS);
    $pdo->prepare('DELETE FROM challenges WHERE sign_public_key = ?')->execute([$signKey]);
    $pdo->prepare('INSERT INTO challenges (sign_public_key, nonce, expires_at) VALUES (?, ?, ?)')
        ->execute([$signKey, $nonce, $expires]);
    json_response(['nonce' => $nonce, 'expires_at' => $expires]);
}

if ($route === '/auth' && $method === 'POST') {
    $payload = parse_json_body();
    $signKey = (string)($payload['sign_public_key'] ?? '');
    $nonce = (string)($payload['nonce'] ?? '');
    $signature = (string)($payload['signature'] ?? '');
    validate_public_key($signKey, 'sign_public_key');

    $stmt = $pdo->prepare('SELECT nonce, expires_at FROM challenges WHERE sign_public_key = ?');
    $stmt->execute([$signKey]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(400, 'Challenge not found');
    }
    if ($row['nonce'] !== $nonce) {
        fail(400, 'Nonce mismatch');
    }
    if (strtotime($row['expires_at']) <= time()) {
        fail(400, 'Challenge expired');
    }
    if (!extension_loaded('sodium')) {
        fail(500, 'Sodium extension missing');
    }
    $valid = sodium_crypto_sign_verify_detached(
        b64decode($signature),
        b64decode($nonce),
        b64decode($signKey)
    );
    if (!$valid) {
        fail(401, 'Invalid signature');
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE sign_public_key = ?');
    $stmt->execute([$signKey]);
    $user = $stmt->fetch();
    if (!$user) {
        fail(404, 'User not registered');
    }
    $token = base64_encode(random_bytes(32));
    $expires = gmdate('Y-m-d\TH:i:s\Z', time() + SESSION_TTL_SECONDS);
    $pdo->prepare('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)')
        ->execute([(int)$user['id'], $token, $expires, utcnow()]);
    $pdo->prepare('DELETE FROM challenges WHERE sign_public_key = ?')->execute([$signKey]);
    json_response(['token' => $token, 'expires_at' => $expires]);
}

if ($route === '/me' && $method === 'GET') {
    $user = require_user($pdo);
    json_response([
        'id' => (int)$user['id'],
        'display_name' => $user['display_name'],
        'sign_public_key' => $user['sign_public_key'],
        'box_public_key' => $user['box_public_key'],
    ]);
}

if ($route === '/users/by_sign_key' && $method === 'GET') {
    require_user($pdo);
    $key = $_GET['key'] ?? '';
    validate_public_key($key, 'sign_public_key');
    $stmt = $pdo->prepare('SELECT id, display_name, sign_public_key, box_public_key FROM users WHERE sign_public_key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'User not found');
    }
    json_response($row);
}

if ($route === '/users/by_box_key' && $method === 'GET') {
    require_user($pdo);
    $key = $_GET['key'] ?? '';
    validate_public_key($key, 'box_public_key');
    $stmt = $pdo->prepare('SELECT id, display_name, sign_public_key, box_public_key FROM users WHERE box_public_key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'User not found');
    }
    json_response($row);
}

if (preg_match('#^/users/(\d+)$#', $route, $m) && $method === 'GET') {
    require_user($pdo);
    $userId = (int)$m[1];
    $stmt = $pdo->prepare('SELECT id, display_name, sign_public_key, box_public_key FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'User not found');
    }
    json_response($row);
}

if ($route === '/pair-codes' && $method === 'POST') {
    $user = require_user($pdo);
    json_response(create_pair_code($pdo, (int)$user['id']));
}

if ($route === '/pair-codes/redeem' && $method === 'POST') {
    $user = require_user($pdo);
    $payload = parse_json_body();
    $rawCode = strtoupper(trim((string)($payload['code'] ?? '')));
    $code = preg_replace('/[^A-Z0-9]/', '', $rawCode);
    if ($code === '') {
        fail(400, 'pair code required');
    }
    cleanup_pair_codes($pdo);
    $stmt = $pdo->prepare('SELECT code, owner_id, expires_at FROM pair_codes WHERE code = ?');
    $stmt->execute([$code]);
    $pair = $stmt->fetch();
    if (!$pair || strtotime($pair['expires_at']) <= time()) {
        fail(404, 'Pair code not found');
    }
    if ((int)$pair['owner_id'] === (int)$user['id']) {
        fail(400, 'Cannot redeem your own pair code');
    }
    upsert_contact_pair($pdo, (int)$user['id'], (int)$pair['owner_id']);
    $pdo->prepare('DELETE FROM pair_codes WHERE code = ?')->execute([$code]);

    $stmt = $pdo->prepare('SELECT users.id, users.display_name, users.sign_public_key, users.box_public_key, contacts.alias
        FROM contacts
        JOIN users ON contacts.contact_id = users.id
        WHERE contacts.owner_id = ? AND contacts.contact_id = ?');
    $stmt->execute([(int)$user['id'], (int)$pair['owner_id']]);
    $row = $stmt->fetch();
    json_response($row ?: []);
}

if ($route === '/contacts' && $method === 'GET') {
    $user = require_user($pdo);
    $stmt = $pdo->prepare('SELECT users.id, users.display_name, users.sign_public_key, users.box_public_key, contacts.alias
        FROM contacts
        JOIN users ON contacts.contact_id = users.id
        WHERE contacts.owner_id = ?
        ORDER BY users.display_name COLLATE NOCASE ASC');
    $stmt->execute([(int)$user['id']]);
    $rows = $stmt->fetchAll();
    json_response(['contacts' => $rows]);
}

if ($route === '/contacts' && $method === 'POST') {
    $user = require_user($pdo);
    $payload = parse_json_body();
    $contactId = (int)($payload['contact_id'] ?? 0);
    $alias = $payload['alias'] ?? null;
    if ($contactId <= 0) {
        fail(400, 'contact_id required');
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$contactId]);
    $target = $stmt->fetch();
    if (!$target) {
        fail(404, 'User not found');
    }
    $created = utcnow();
    $pdo->prepare('INSERT OR REPLACE INTO contacts (owner_id, contact_id, alias, created_at) VALUES (?, ?, ?, ?)')
        ->execute([(int)$user['id'], $contactId, $alias, $created]);
    $pdo->prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, alias, created_at) VALUES (?, ?, NULL, ?)')
        ->execute([$contactId, (int)$user['id'], $created]);
    $stmt = $pdo->prepare('SELECT users.id, users.display_name, users.sign_public_key, users.box_public_key, contacts.alias
        FROM contacts
        JOIN users ON contacts.contact_id = users.id
        WHERE contacts.owner_id = ? AND contacts.contact_id = ?');
    $stmt->execute([(int)$user['id'], $contactId]);
    $row = $stmt->fetch();
    json_response($row ?: []);
}

if (preg_match('#^/contacts/(\d+)$#', $route, $m) && $method === 'DELETE') {
    $user = require_user($pdo);
    $contactId = (int)$m[1];
    $pdo->prepare('DELETE FROM contacts WHERE owner_id = ? AND contact_id = ?')
        ->execute([(int)$user['id'], $contactId]);
    json_response(['status' => 'ok']);
}



if ($route === '/messages' && $method === 'POST') {
    $user = require_user($pdo);
    $payload = parse_json_body();
    $recipientId = (int)($payload['recipient_id'] ?? 0);
    $ciphertext = (string)($payload['ciphertext'] ?? '');
    $nonce = (string)($payload['nonce'] ?? '');
    if ($recipientId <= 0 || !$ciphertext || !$nonce) {
        fail(400, 'Invalid payload');
    }
    if (strlen($ciphertext) > MAX_MESSAGE_CIPHERTEXT) {
        fail(413, 'Message too large');
    }
    if (strlen($nonce) > MAX_MESSAGE_NONCE) {
        fail(400, 'Invalid nonce');
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$recipientId]);
    $recipient = $stmt->fetch();
    if (!$recipient) {
        fail(404, 'Recipient not found');
    }
    $created = utcnow();
    $uuid = bin2hex(random_bytes(16));
    $pdo->prepare('INSERT INTO messages (uuid, sender_id, recipient_id, ciphertext, nonce, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$uuid, (int)$user['id'], $recipientId, $ciphertext, $nonce, $created]);
    json_response(['uuid' => $uuid]);
}

if ($route === '/messages' && $method === 'GET') {
    $user = require_user($pdo);
    $with = isset($_GET['with_user']) ? (int)$_GET['with_user'] : 0;
    if ($with <= 0) {
        fail(400, 'with_user required');
    }
    $sinceUuid = isset($_GET['since']) ? (string)$_GET['since'] : '';
    $sinceId = 0;
    if ($sinceUuid !== '' && $sinceUuid !== '0') {
        // Support both old numeric since and new uuid since
        if (ctype_digit($sinceUuid)) {
            $sinceId = (int)$sinceUuid;
        }
        else {
            $lookup = $pdo->prepare('SELECT id FROM messages WHERE uuid = ?');
            $lookup->execute([$sinceUuid]);
            $found = $lookup->fetch();
            $sinceId = $found ? (int)$found['id'] : 0;
        }
    }
    $query = 'SELECT id, uuid, sender_id, recipient_id, ciphertext, nonce, created_at
        FROM messages
        WHERE ((sender_id = :me AND recipient_id = :with) OR (sender_id = :with AND recipient_id = :me))';
    if ($sinceId > 0) {
        $query .= ' AND id > :since';
    }
    $query .= ' ORDER BY id ASC LIMIT 200';
    $stmt = $pdo->prepare($query);
    $params = [':me' => (int)$user['id'], ':with' => $with];
    if ($sinceId > 0) {
        $params[':since'] = $sinceId;
    }
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Attach reactions to each message
    $messageIds = array_map(function ($r) {
        return (int)$r['id'];
    }, $rows);
    $reactions = [];
    if ($messageIds) {
        $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
        $rStmt = $pdo->prepare("SELECT id, message_id, user_id, emoji, created_at FROM reactions WHERE message_id IN ($placeholders) ORDER BY id ASC");
        $rStmt->execute($messageIds);
        foreach ($rStmt->fetchAll() as $r) {
            $mid = (int)$r['message_id'];
            if (!isset($reactions[$mid]))
                $reactions[$mid] = [];
            $reactions[$mid][] = $r;
        }
    }
    foreach ($rows as &$row) {
        $row['reactions'] = $reactions[(int)$row['id']] ?? [];
        // Remove internal id, expose only uuid
        unset($row['id']);
    }
    unset($row);

    json_response(['messages' => $rows]);
}

// Delete message
if (preg_match('#^/messages/([a-f0-9]{32})$#', $route, $m) && $method === 'DELETE') {
    $user = require_user($pdo);
    $msgUuid = $m[1];
    $stmt = $pdo->prepare('SELECT id, sender_id, recipient_id FROM messages WHERE uuid = ?');
    $stmt->execute([$msgUuid]);
    $msg = $stmt->fetch();
    if (!$msg) {
        fail(404, 'Message not found');
    }
    $uid = (int)$user['id'];
    if ($uid !== (int)$msg['sender_id'] && $uid !== (int)$msg['recipient_id']) {
        fail(403, 'Forbidden');
    }
    $msgId = (int)$msg['id'];
    $pdo->prepare('DELETE FROM reactions WHERE message_id = ?')->execute([$msgId]);
    $pdo->prepare('DELETE FROM messages WHERE id = ?')->execute([$msgId]);
    json_response(['status' => 'ok']);
}

// Add reaction
if ($route === '/reactions' && $method === 'POST') {
    $user = require_user($pdo);
    $payload = parse_json_body();
    $messageUuid = (string)($payload['message_id'] ?? '');
    $emoji = trim((string)($payload['emoji'] ?? ''));
    if ($messageUuid === '' || $emoji === '') {
        fail(400, 'message_id and emoji required');
    }
    if (mb_strlen($emoji) > 8) {
        fail(400, 'Emoji too long');
    }
    // Look up by uuid
    $stmt = $pdo->prepare('SELECT id, sender_id, recipient_id FROM messages WHERE uuid = ?');
    $stmt->execute([$messageUuid]);
    $msg = $stmt->fetch();
    if (!$msg) {
        fail(404, 'Message not found');
    }
    $messageId = (int)$msg['id'];
    $uid = (int)$user['id'];
    if ($uid !== (int)$msg['sender_id'] && $uid !== (int)$msg['recipient_id']) {
        fail(403, 'Forbidden');
    }
    // Toggle: if same emoji exists, remove it; otherwise upsert
    $existing = $pdo->prepare('SELECT id, emoji FROM reactions WHERE message_id = ? AND user_id = ?');
    $existing->execute([$messageId, $uid]);
    $row = $existing->fetch();
    if ($row && $row['emoji'] === $emoji) {
        $pdo->prepare('DELETE FROM reactions WHERE id = ?')->execute([(int)$row['id']]);
        json_response(['status' => 'removed']);
    }
    else {
        $pdo->prepare('INSERT OR REPLACE INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$messageId, $uid, $emoji, utcnow()]);
        json_response(['status' => 'added', 'emoji' => $emoji]);
    }
}

// Get reactions for a message
if ($route === '/reactions' && $method === 'GET') {
    $user = require_user($pdo);
    $messageUuid = isset($_GET['message_id']) ? (string)$_GET['message_id'] : '';
    if ($messageUuid === '') {
        fail(400, 'message_id required');
    }
    // Look up internal id from uuid
    $lookup = $pdo->prepare('SELECT id FROM messages WHERE uuid = ?');
    $lookup->execute([$messageUuid]);
    $found = $lookup->fetch();
    if (!$found) {
        fail(404, 'Message not found');
    }
    $messageId = (int)$found['id'];
    $stmt = $pdo->prepare('SELECT id, message_id, user_id, emoji, created_at FROM reactions WHERE message_id = ? ORDER BY id ASC');
    $stmt->execute([$messageId]);
    json_response(['reactions' => $stmt->fetchAll()]);
}



// Dangerous MIME types that could execute in browser
function sanitize_mime(string $mime): string
{
    $dangerous = [
        'image/svg+xml', 'text/html', 'application/xhtml+xml',
        'application/javascript', 'text/javascript', 'application/x-javascript',
        'text/xml', 'application/xml',
    ];
    foreach ($dangerous as $d) {
        if (stripos($mime, $d) !== false) {
            return 'application/octet-stream';
        }
    }
    return $mime;
}

function sanitize_filename(string $name): string
{
    // Remove path traversal and null bytes
    $name = str_replace(['\0', '/', '\\', '..'], '', $name);
    $name = trim($name);
    return $name ?: 'file';
}

if ($route === '/media' && $method === 'POST') {
    $user = require_user($pdo);
    $recipientId = isset($_POST['recipient_id']) ? (int)$_POST['recipient_id'] : 0;
    if ($recipientId <= 0) {
        fail(400, 'recipient_id required');
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$recipientId]);
    $recipient = $stmt->fetch();
    if (!$recipient) {
        fail(404, 'Recipient not found');
    }
    if (!isset($_FILES['file'])) {
        fail(400, 'file required');
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'Файл слишком большой (лимит сервера)',
            UPLOAD_ERR_FORM_SIZE => 'Файл слишком большой',
            UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
            UPLOAD_ERR_NO_FILE => 'Файл не загружен',
        ];
        $errMsg = $errorMessages[$file['error']] ?? 'Upload failed (code ' . $file['error'] . ')';
        fail(400, $errMsg);
    }
    $maxBytes = (int)(getenv('MESSANGER_MAX_MEDIA_BYTES') ?: 26214400); // 25MB default
    if ($file['size'] > $maxBytes) {
        fail(413, 'Файл слишком большой (макс. ' . round($maxBytes / 1048576) . ' МБ)');
    }
    $mediaId = bin2hex(random_bytes(16));
    $target = $GLOBALS['MEDIA_DIR'] . DIRECTORY_SEPARATOR . $mediaId;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        fail(500, 'Failed to store media');
    }
    $filename = sanitize_filename($file['name'] ?: 'file');
    $mime = sanitize_mime($file['type'] ?: 'application/octet-stream');
    $pdo->prepare('INSERT INTO media (id, owner_id, recipient_id, filename, mime, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$mediaId, (int)$user['id'], $recipientId, $filename, $mime, (int)$file['size'], $target, utcnow()]);
    json_response([
        'media_id' => $mediaId,
        'size' => (int)$file['size'],
        'filename' => $filename,
        'mime' => $mime,
    ]);
}

if (preg_match('#^/media/([a-f0-9]{32})$#', $route, $m) && $method === 'GET') {
    $user = require_user($pdo);
    $mediaId = $m[1];
    $stmt = $pdo->prepare('SELECT id, owner_id, recipient_id, filename, mime, size, path FROM media WHERE id = ?');
    $stmt->execute([$mediaId]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'Media not found');
    }
    $uid = (int)$user['id'];
    if ($uid !== (int)$row['owner_id'] && $uid !== (int)$row['recipient_id']) {
        fail(403, 'Forbidden');
    }
    if (!is_file($row['path'])) {
        fail(404, 'Media not found');
    }
    // Always force download to prevent XSS via SVG/HTML
    $safeMime = sanitize_mime($row['mime']);
    $safeFilename = sanitize_filename(basename($row['filename']));
    header('Content-Type: ' . $safeMime);
    header('Content-Length: ' . $row['size']);
    header('Content-Disposition: attachment; filename="' . $safeFilename . '"');
    header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: default-src \'none\'');
    readfile($row['path']);
    exit;
}

fail(404, 'Not Found');
