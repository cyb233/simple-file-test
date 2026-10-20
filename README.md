# simple file test

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

Generate and download test files directly in the browser. No file content is uploaded to a server.

## Features

- Text files with random, format-aware content: TXT, JSON, YAML, YML, CSV, XML, HTML, and Markdown.
- Images generated with a requested resolution: PNG, JPG, and WEBP.
- Short video streams generated locally: WEBM and MP4, depending on browser codec support.
- Audio generated locally with configurable duration, sample rate, and channels: WAV, OGG, and MP3.
- File size units: KB, KiB, MB, and MiB. MiB is selected by default.
- Maximum size validation with automatic reset and a visible message.
- Chinese, English, and Japanese translations with user selection, browser-language matching, and a configured fallback.

## Limits

| File type | Maximum |
| --- | ---: |
| Text | 100 MiB |
| Image | 50 MiB |
| Video | 100 MiB |
| Audio | 100 MiB |

The requested size is used as the target byte length. Some codecs have a minimum valid container size, so a very small media request may produce a file slightly larger than the target. When a selected codec is unavailable, the browser-compatible format and extension are used instead.

## Local development

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Wrangler, usually `http://localhost:8787`.

## Deploy to Cloudflare

Authenticate with Wrangler once, then deploy the static Worker project:

```bash
npx wrangler login
npm run deploy
```

Deployment settings are in [`wrangler.jsonc`](wrangler.jsonc). Static assets are served from [`public/`](public/).

## Project structure

```text
public/
  index.html             Application shell and form controls
  app.js                 File generation, downloads, tabs, and i18n
  styles.css             Responsive visual styles
  favicon.svg            SVG browser icon
  i18n/
    language.json        Language menu and fallback configuration
    en.json              English translations
    zh-CN.json           Simplified Chinese translations
    ja.json              Japanese translations
wrangler.jsonc           Cloudflare Workers Static Assets configuration
```

File generation uses browser APIs such as Canvas, Web Audio, and MediaRecorder. The exact formats available for video and compressed audio depend on the browser.
