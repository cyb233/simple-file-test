const LIMITS = { text: 100, image: 50, video: 100, audio: 100 };
const UNIT_BYTES = { KB: 1000, KiB: 1024, MB: 1000 ** 2, MiB: 1024 ** 2 };
const EXTENSIONS = { txt: "txt", json: "json", yaml: "yaml", yml: "yml", csv: "csv", xml: "xml", html: "html", md: "md" };
const state = { language: "en", strings: {}, languageConfig: null, panel: "text" };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function loadLanguage() {
  try {
    state.languageConfig = await fetch("/i18n/language.json").then((response) => response.json());
  } catch {
    state.languageConfig = { default: "en", fallback: "en", languages: [{ code: "en", name: "English", file: "en.json" }] };
  }
  const languages = state.languageConfig.languages;
  const saved = localStorage.getItem("simple-file-test-language");
  const browser = navigator.language || "en";
  const browserMatch = languages.find((item) => item.code.toLowerCase() === browser.toLowerCase())
    || languages.find((item) => browser.toLowerCase().startsWith(item.code.toLowerCase().split("-")[0]));
  state.language = languages.some((item) => item.code === saved) ? saved : (browserMatch?.code || state.languageConfig.default);
  const select = $("#language-select");
  select.innerHTML = languages.map((item) => `<option value="${item.code}">${item.name}</option>`).join("");
  select.value = state.language;
  select.addEventListener("change", async () => {
    state.language = select.value;
    localStorage.setItem("simple-file-test-language", state.language);
    await loadStrings();
  });
  await loadStrings();
}

async function loadStrings() {
  const languages = state.languageConfig.languages;
  const selected = languages.find((item) => item.code === state.language);
  const fallback = languages.find((item) => item.code === state.languageConfig.fallback)
    || languages.find((item) => item.code === state.languageConfig.default);
  try {
    state.strings = await fetch(`/i18n/${selected.file}`).then((response) => response.json());
  } catch {
    state.strings = {};
  }
  if (fallback && fallback.code !== selected.code) {
    try { state.strings = { ...await fetch(`/i18n/${fallback.file}`).then((response) => response.json()), ...state.strings }; } catch { /* fallback is optional */ }
  }
  applyTranslations();
}

function t(key, values = {}) {
  let value = state.strings[key] || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replace(`{${name}}`, replacement);
  return value;
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  $$('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  $("#language-select").setAttribute("aria-label", t("selectLanguage"));
  $("#file-tabs").setAttribute("aria-label", t("fileTypes"));
  updatePanelHeading();
}

function updatePanelHeading() {
  const labels = { text: t("tabs.text"), image: t("tabs.image"), video: t("tabs.video"), audio: t("tabs.audio") };
  $("#panel-title").textContent = labels[state.panel];
  $("#panel-kicker").textContent = `${state.panel.toUpperCase()} FILE`;
  $("#panel-limit").textContent = `${LIMITS[state.panel]} MiB`;
}

function bytesFromInput(kind) {
  const value = Number($(`#${kind}-size`).value) || 1;
  const unit = $(`#${kind}-unit`).value;
  return { value, unit, bytes: Math.round(value * UNIT_BYTES[unit]) };
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2).replace(/\.00$/, "")} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, "")} KiB`;
  return `${bytes} B`;
}

function normalizeSize(kind) {
  const input = $(`#${kind}-size`);
  const unit = $(`#${kind}-unit`).value;
  const maxBytes = LIMITS[kind] * 1024 ** 2;
  const value = Math.max(1, Number(input.value) || 1);
  if (value * UNIT_BYTES[unit] > maxBytes) {
    input.value = (maxBytes / UNIT_BYTES[unit]).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    showStatus(t("limit", { max: `${LIMITS[kind]} MiB` }), "warning");
  } else if (value !== Number(input.value)) input.value = value;
}

function showStatus(message, type = "") {
  const status = $("#status");
  status.className = `status ${type}`;
  $("#status-text").textContent = message;
}

function randomAscii(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint8Array(Math.min(length, 1_000_000));
  let chunk = "";
  for (let offset = 0; offset < values.length; offset += 65_536) {
    const end = Math.min(offset + 65_536, values.length);
    crypto.getRandomValues(values.subarray(offset, end));
    for (let index = offset; index < end; index += 1) chunk += alphabet[values[index] % alphabet.length];
  }
  if (length <= values.length) return chunk.slice(0, length);
  const chunks = [chunk];
  let remaining = length - values.length;
  while (remaining > 0) {
    const part = randomAscii(Math.min(remaining, 1_000_000));
    chunks.push(part);
    remaining -= part.length;
  }
  return chunks.join("");
}

function textBlob(format, target) {
  const templates = {
    txt: ["", ""],
    json: ['{"data":"', '"}'],
    yaml: ["data: ", "\n"],
    yml: ["data: ", "\n"],
    csv: ["value\n", ""],
    xml: ["<data>", "</data>"],
    html: ["<!doctype html><p>", "</p>"],
    md: ["# data\n\n", ""]
  };
  const [prefix, suffix] = templates[format] || templates.txt;
  const overhead = new TextEncoder().encode(prefix + suffix).length;
  if (target < overhead) return new Blob([format === "json" ? "null" : format === "xml" ? "<p/>" : ""], { type: "text/plain" });
  const payload = randomAscii(target - overhead);
  const mime = { json: "application/json", yaml: "text/yaml", csv: "text/csv", xml: "application/xml", html: "text/html", md: "text/markdown" }[format] || "text/plain";
  return new Blob([prefix, payload, suffix], { type: mime });
}

function clampDimension(value, unit) {
  const px = unit === "in" ? value * 96 : unit === "cm" ? value * 37.7952756 : value;
  return Math.max(1, Math.min(8192, Math.round(px)));
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas export failed")), type, quality));
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, payload) {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(payload.length + 12);
  const view = new DataView(output.buffer);
  view.setUint32(0, payload.length);
  output.set(typeBytes, 4);
  output.set(payload, 8);
  view.setUint32(payload.length + 8, crc32(output.slice(4, payload.length + 8)));
  return output;
}

function padPng(bytes, target) {
  if (bytes.length >= target || bytes.length < 20) return new Blob([bytes], { type: "image/png" });
  let extra = target - bytes.length;
  const iend = bytes.length - 12;
  const parts = [bytes.slice(0, iend)];
  while (extra >= 12) {
    const payloadLength = Math.min(65523, extra - 12);
    if (payloadLength < 8) break;
    const payload = new Uint8Array(payloadLength);
    payload.set(new TextEncoder().encode("padding\0"));
    parts.push(pngChunk("tEXt", payload));
    extra -= payloadLength + 12;
  }
  parts.push(bytes.slice(iend));
  if (extra) parts.push(new Uint8Array(extra));
  return new Blob(parts, { type: "image/png" });
}

function padJpeg(bytes, target) {
  if (bytes.length >= target) return new Blob([bytes], { type: "image/jpeg" });
  let extra = target - bytes.length;
  const end = bytes.length >= 2 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9 ? bytes.length - 2 : bytes.length;
  const parts = [bytes.slice(0, end)];
  while (extra >= 4) {
    const payloadLength = Math.min(65533, extra - 4);
    const segment = new Uint8Array(payloadLength + 4);
    segment[0] = 0xff; segment[1] = 0xfe;
    new DataView(segment.buffer).setUint16(2, payloadLength + 2);
    parts.push(segment);
    extra -= payloadLength + 4;
  }
  parts.push(bytes.slice(end));
  if (extra) parts.push(new Uint8Array(extra));
  return new Blob(parts, { type: "image/jpeg" });
}

function padWebp(bytes, target) {
  if (bytes.length >= target || bytes.length < 12 || bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return new Blob([bytes], { type: "image/webp" });
  const extra = target - bytes.length;
  if (extra < 8) return new Blob([bytes, new Uint8Array(extra)], { type: "image/webp" });
  const chunk = new Uint8Array(extra);
  chunk[0] = 0x4a; chunk[1] = 0x55; chunk[2] = 0x4e; chunk[3] = 0x4b;
  new DataView(chunk.buffer).setUint32(4, extra - 8, true);
  const output = new Uint8Array(target);
  output.set(bytes, 0); output.set(chunk, bytes.length);
  new DataView(output.buffer).setUint32(4, target - 8, true);
  return new Blob([output], { type: "image/webp" });
}

async function imageBlob(target, format, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  // Keep the pixel pattern simple so even a large resolution has a small valid base image.
  const color = new Uint8Array(3); crypto.getRandomValues(color);
  context.fillStyle = `rgb(${35 + color[0] % 100}, ${70 + color[1] % 120}, ${80 + color[2] % 120})`; context.fillRect(0, 0, width, height);
  context.globalAlpha = .2; context.fillStyle = "#ffffff";
  for (let index = 0; index < 5; index += 1) context.fillRect((index * 313) % width, (index * 149) % height, Math.max(3, width / 16), Math.max(3, height / 16));
  const mime = format === "PNG" ? "image/png" : format === "JPG" ? "image/jpeg" : "image/webp";
  const blob = await canvasBlob(canvas, mime, .88);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (format === "PNG") return padPng(bytes, target);
  if (format === "JPG") return padJpeg(bytes, target);
  return padWebp(bytes, target);
}

function writeAscii(view, offset, value) { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); }

function wavBlob(target, sampleRate, channels) {
  const minimum = 44;
  const actual = Math.max(target, minimum);
  const blockAlign = channels * 2;
  const dataSize = Math.max(0, actual - minimum);
  const output = new Uint8Array(minimum + dataSize);
  const view = new DataView(output.buffer);
  writeAscii(view, 0, "RIFF"); view.setUint32(4, output.length - 8, true); writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
  writeAscii(view, 36, "data"); view.setUint32(40, dataSize, true);
  for (let frame = 0; frame < Math.floor(dataSize / blockAlign); frame += 1) {
    const sample = Math.round(Math.sin(frame / sampleRate * Math.PI * 2 * 220) * 10000);
    for (let channel = 0; channel < channels; channel += 1) view.setInt16(44 + (frame * channels + channel) * 2, sample, true);
  }
  return new Blob([output], { type: "audio/wav" });
}

function mediaMime(kind, format) {
  const candidates = kind === "video"
    ? (format === "MP4" ? ["video/mp4", "video/webm;codecs=vp9", "video/webm"] : ["video/webm;codecs=vp9", "video/webm"])
    : (format === "MP3" ? ["audio/mpeg", "audio/webm"] : ["audio/ogg;codecs=opus", "audio/webm"]);
  return candidates.find((mime) => window.MediaRecorder?.isTypeSupported?.(mime)) || candidates[candidates.length - 1];
}

function extensionForMime(mime, fallback) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  return fallback;
}

async function recordMedia(kind, target, format, width, height, duration, rate, channels) {
  if (kind === "audio" && format === "WAV") return wavBlob(target, rate, channels);
  const mime = mediaMime(kind, format);
  let stream;
  let context;
  try {
    if (kind === "video") {
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const draw = canvas.getContext("2d"); stream = canvas.captureStream(24);
      const start = performance.now();
      const animate = (now) => { const phase = (now - start) / 1000; draw.fillStyle = `hsl(${(phase * 65) % 360} 50% 30%)`; draw.fillRect(0, 0, width, height); draw.fillStyle = "#64d6c8"; draw.beginPath(); draw.arc(width / 2 + Math.sin(phase) * width / 4, height / 2, Math.max(20, Math.min(width, height) / 8), 0, Math.PI * 2); draw.fill(); if (phase < Math.min(duration, 5)) requestAnimationFrame(animate); };
      requestAnimationFrame(animate);
    } else {
      context = new AudioContext({ sampleRate: rate });
      const oscillator = context.createOscillator(); const gain = context.createGain(); const destination = context.createMediaStreamDestination();
      oscillator.frequency.value = 220; gain.gain.value = .04; oscillator.connect(gain).connect(destination); oscillator.start(); oscillator.stop(context.currentTime + Math.min(duration, 5)); stream = destination.stream;
    }
    if (!window.MediaRecorder) throw new Error("MediaRecorder unavailable");
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000, videoBitsPerSecond: 1500000 });
    const recorded = new Promise((resolve) => { recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data); recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType })); });
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, Math.min(duration, 5) * 1000 + 80));
    recorder.stop();
    const blob = await recorded;
    if (context) await context.close();
    const raw = new Uint8Array(await blob.arrayBuffer());
    const output = new Blob([raw, new Uint8Array(Math.max(0, target - raw.length))], { type: blob.type || mime });
    output.extension = extensionForMime(blob.type || mime, format.toLowerCase());
    return output;
  } catch {
    if (context) await context.close().catch(() => {});
    const fallback = kind === "audio" ? wavBlob(target, rate, channels) : new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), new Uint8Array(Math.max(0, target - 4))], { type: "video/webm" });
    fallback.fallback = true;
    fallback.extension = kind === "audio" ? "wav" : "webm";
    return fallback;
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function generate(kind) {
  normalizeSize(kind);
  const { unit, value } = bytesFromInput(kind);
  const target = Math.min(Math.round(value * UNIT_BYTES[unit]), LIMITS[kind] * 1024 ** 2);
  const form = $(`#${kind}-form`);
  const button = $(".generate-button", form);
  button.disabled = true;
  showStatus(t("generating"));
  try {
    let blob; let extension; let formatWarning = false;
    if (kind === "text") {
      const format = $("#text-format").value; blob = textBlob(format, target); extension = EXTENSIONS[format];
    } else if (kind === "image") {
      const format = $("#image-format").value; const unitName = $("#image-resolution-unit").value;
      const width = clampDimension(Number($("#image-width").value) || 1920, unitName); const height = clampDimension(Number($("#image-height").value) || 1080, unitName);
      blob = await imageBlob(target, format, width, height); extension = format;
    } else if (kind === "video") {
      const format = $("#video-format").value; const unitName = $("#video-resolution-unit").value;
      const width = clampDimension(Number($("#video-width").value) || 1280, unitName); const height = clampDimension(Number($("#video-height").value) || 720, unitName);
      blob = await recordMedia("video", target, format, width, height, Number($("#video-duration").value) || 3, 48000, 2); extension = format.toLowerCase();
      if (blob.fallback) showStatus(`${t("mediaFallback", { format })} ${t("tip.fallback")}`, "warning");
    } else {
      const format = $("#audio-format").value; blob = await recordMedia("audio", target, format, 0, 0, Number($("#audio-duration").value) || 10, Number($("#audio-rate").value), Number($("#audio-channels").value)); extension = format.toLowerCase();
      if (blob.fallback) showStatus(`${t("mediaFallback", { format })} ${t("tip.fallback")}`, "warning");
    }
    if (blob.fallback && blob.extension) extension = blob.extension;
    if (blob.extension && blob.extension !== extension) {
      extension = blob.extension;
      formatWarning = true;
    }
    const sizeLabel = `${value}${unit}`;
    triggerDownload(blob, `simple-${sizeLabel}.${extension}`);
    if (!blob.fallback && !formatWarning) {
      showStatus(t("downloaded", { name: `simple-${sizeLabel}.${extension}`, size: formatBytes(blob.size) }), "success");
      if (blob.size > target) showStatus(`${t("downloaded", { name: `simple-${sizeLabel}.${extension}`, size: formatBytes(blob.size) })} ${t("tooSmall", { size: formatBytes(blob.size) })}`, "warning");
    } else if (formatWarning) {
      showStatus(`${t("mediaFallback", { format: kind === "video" ? $("#video-format").value : $("#audio-format").value })} ${t("tip.fallback")} ${t("downloaded", { name: `simple-${sizeLabel}.${extension}`, size: formatBytes(blob.size) })}`, "warning");
    }
  } catch (error) {
    console.error(error); showStatus(t("error"), "error");
  } finally { button.disabled = false; }
}

function setupTabs() {
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    state.panel = tab.dataset.tab;
    $$(".tab").forEach((item) => { const active = item === tab; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); });
    $$(".generator-form").forEach((form) => { const active = form.dataset.panel === state.panel; form.hidden = !active; form.classList.toggle("active", active); });
    updatePanelHeading(); showStatus(t("ready"));
  }));
}

function setupForms() {
  ["text", "image", "video", "audio"].forEach((kind) => {
    const form = $(`#${kind}-form`); form.addEventListener("submit", (event) => { event.preventDefault(); generate(kind); });
    $(`#${kind}-size`).addEventListener("input", () => normalizeSize(kind));
    $(`#${kind}-unit`).addEventListener("change", () => normalizeSize(kind));
  });
}

setupTabs(); setupForms(); loadLanguage();
