# simple file test

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

ブラウザだけでテストファイルを生成してダウンロードできます。ファイルの内容はサーバーへアップロードされません。

## 機能

- ランダムな正しい形式のテキストを生成：TXT、JSON、YAML、YML、CSV、XML、HTML、Markdown。
- 指定した解像度の画像を生成：PNG、JPG、WEBP。
- 短い動画をローカルで生成：WEBM、MP4。利用できる形式はブラウザのコーデックに依存します。
- 長さ、サンプルレート、チャンネルを指定して音声を生成：WAV、OGG、MP3。
- ファイルサイズの単位は KB、KiB、MB、MiB。既定値は MiB です。
- 上限を超えた入力は自動的に上限へ戻し、メッセージを表示します。
- 中国語、英語、日本語に対応。ユーザー選択、ブラウザ言語、設定済みのフォールバックの順で適用します。

## サイズ上限

| ファイル形式 | 最大サイズ |
| --- | ---: |
| テキスト | 100 MiB |
| 画像 | 50 MiB |
| 動画 | 100 MiB |
| 音声 | 100 MiB |

入力サイズを目標バイト数として使用します。一部のメディアコーデックには有効なコンテナの最小サイズがあるため、小さなメディア要求では目標より少し大きくなる場合があります。選択したコーデックが利用できない場合は、ブラウザで利用できる形式と拡張子を使用します。

## ローカル開発

必要な環境：Node.js 18 以降と npm。

```bash
npm install
npm run dev
```

通常は `http://localhost:8787` で、Wrangler が表示したローカル URL を開いてください。

## Cloudflare へデプロイ

初回のみ Wrangler にログインして、静的 Worker プロジェクトをデプロイします。

```bash
npx wrangler login
npm run deploy
```

デプロイ設定は [`wrangler.jsonc`](wrangler.jsonc) にあり、静的アセットは [`public/`](public/) にあります。

## プロジェクト構成

```text
public/
  index.html             ページ構造とフォーム
  app.js                 生成、ダウンロード、タブ、i18n
  styles.css             レスポンシブスタイル
  favicon.svg            SVG ブラウザアイコン
  i18n/
    language.json        言語メニューとフォールバック設定
    en.json              英語翻訳
    zh-CN.json           簡体字中国語翻訳
    ja.json              日本語翻訳
wrangler.jsonc           Cloudflare Workers Static Assets 設定
```

ファイル生成には Canvas、Web Audio、MediaRecorder などのブラウザ API を使用します。動画と圧縮音声で利用できる形式はブラウザによって異なります。
