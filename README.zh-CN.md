# simple file test

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

在浏览器中直接生成并下载测试文件，文件内容不会上传到服务器。

## 功能

- 生成带有随机、格式正确内容的文本文件：TXT、JSON、YAML、YML、CSV、XML、HTML 和 Markdown。
- 按指定分辨率生成图片：PNG、JPG 和 WEBP。
- 在本地生成短视频：WEBM 和 MP4，实际可用格式取决于浏览器编码器。
- 在本地生成音频，可设置时长、采样率和声道：WAV、OGG 和 MP3。
- 文件大小单位支持 B、KiB、MiB 和 GiB，默认使用 MiB。
- 对大文件显示内存占用和浏览器响应风险提示。
- 支持中文、英文和日文，可按用户选择、浏览器语言和配置的回退语言匹配。

## 大小和时长行为

应用不设置文件大小、时长或分辨率的固定上限。文件过大可能导致生成缓慢、占用大量内存，甚至使浏览器无响应。达到或超过 1 GiB 时会在生成前显示提示，输入不会被重置，生成也不会被阻止。

输入大小会作为目标字节数。部分媒体编码器有合法容器的最小尺寸，因此很小的媒体文件请求可能略大于目标值。如果浏览器不支持所选编码器，程序会使用兼容格式并匹配实际扩展名。

## 本地开发

要求：Node.js 18 或更高版本，以及 npm。

```bash
npm install
npm run dev
```

打开 Wrangler 输出的本地地址，通常是 `http://localhost:8787`。

## 部署到 Cloudflare

首次使用时登录 Wrangler，然后部署静态 Worker 项目：

```bash
npx wrangler login
npm run deploy
```

部署配置位于 [`wrangler.jsonc`](wrangler.jsonc)，静态资源位于 [`public/`](public/)。

## 项目结构

```text
public/
  index.html             页面结构和表单控件
  app.js                 文件生成、下载、标签页和 i18n
  styles.css             响应式样式
  favicon.svg            SVG 浏览器图标
  i18n/
    language.json        语言菜单和回退配置
    en.json              英文翻译
    zh-CN.json           简体中文翻译
    ja.json              日文翻译
wrangler.jsonc           Cloudflare Workers Static Assets 配置
```

文件生成使用 Canvas、Web Audio 和 MediaRecorder 等浏览器 API。视频和压缩音频的实际可用格式取决于浏览器。
