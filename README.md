# Shard

This is an experimental project. Not audited. Do not use for critical security needs.

Shard is a lightweight web messenger with client-side encryption, a PHP backend, and SQLite storage. The current build includes English and Russian UI support with explicit language confirmation on first launch.

## Status

- Experimental
- No external security audit
- Designed for small self-hosted or shared-hosting deployments
- Browser language is used only as a recommendation, never as a forced override

## Features

- End-to-end encrypted text messages and media
- English and Russian interface with a visible language switcher
- Explicit language choice and confirmation before the app unlock flow starts
- Client-side key generation from a 12-word mnemonic
- Message reactions, reply previews, media uploads, and drag-and-drop
- Shared-hosting friendly `api.php` backend

## Requirements

- PHP 8.1 or newer
- `ext-sodium`
- SQLite 3
- A modern browser with Web Crypto API support

## Quick Start

1. Place the project on a PHP-enabled server.
2. Optionally set a custom database path:

```bash
export SHARD_DB=/absolute/path/to/shard.db
```

3. Start a local server for development:

```bash
php -S 127.0.0.1:8080
```

4. Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Configuration

- `SHARD_DB`: preferred path for the SQLite database
- `MESSANGER_DB`: legacy fallback path for the SQLite database
- `MESSANGER_MAX_MEDIA_BYTES`: max encrypted upload size in bytes

## Security Notes

- Private keys and mnemonic phrases stay in the browser.
- The server stores ciphertext, encrypted media blobs, public keys, and session tokens.
- The current security model has not been independently audited.
- Review [SECURITY.md](SECURITY.md) before deploying this project.

## Repository Layout

- `index.html` - main single-page app shell
- `static/app.js` - client logic, translations, crypto flow, and UI state
- `static/styles.css` - UI styles
- `api.php` - backend API and SQLite persistence
- `data/` - runtime storage for the database and uploaded encrypted media

## Open Source Readiness

The repository now includes:

- English README
- SECURITY.md
- MIT license
- UTF-8 editor settings
- Ignore rules for local runtime data

## License

MIT. See [LICENSE](LICENSE).
