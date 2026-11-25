"use strict";
/* ---------- helpers ---------- */
const $app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* ---------- opslag ---------- */
const LS_KEY = "schnitzellearning.v1";
function migrate(s) {
  if (!s || !Array.isArray(s.lists)) return null;
  s.lists.forEach(l => {
    if (!l.chapters) { l.chapters = [{ id: uid(), name: "Hoofdstuk 1", words: l.words || [] }]; delete l.words; }
    l.chapters.forEach(c => c.words.forEach(w => { w.box = w.box || 0; }));
  });
  s.stats = Object.assign({ xp: 0, streak: 0, best: 0, lastDay: "", answered: 0, correct: 0 }, s.stats || {});
  s.history = (s.history && typeof s.history === "object" && !Array.isArray(s.history)) ? s.history : {};
  s.settings = Object.assign({ strict: false, sound: true, look: "teal" }, s.settings || {});
  return s;
}
function seed() {
  const w = (a, b) => ({ id: uid(), a, b, box: 0 });
  return migrate({
    updatedAt: 0,
    lists: [{
      id: uid(), name: "Frans", langA: "Nederlands", langB: "Frans", example: true,
      chapters: [
        { id: uid(), name: "Hoofdstuk 1: Dieren en school", words: [w("de hond", "le chien"), w("de kat", "le chat"), w("het huis", "la maison"), w("de school", "l'école"), w("de vriend", "l'ami"), w("de vriendin", "l'amie")] },
        { id: uid(), name: "Hoofdstuk 2: Eten", words: [w("lekker", "délicieux"), w("de boterham", "la tartine"), w("het water", "l'eau"), w("de appel", "la pomme"), w("de kaas", "le fromage"), w("het ontbijt", "le petit déjeuner")] }
      ]
    }]
  });
}
/* Woordjes uit de eerste versie van de app (sleutel "woordjes-app-v3") meenemen */
const LEGACY_KEY = "woordjes-app-v3";
const LEGACY_LANG = { french: "Frans", german: "Duits", greek: "Grieks", latin: "Latijn", other: "Andere taal" };
function fromLegacy() {
  const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
  if (!old || !Array.isArray(old.cards) || !old.cards.length) return null;
  const lists = new Map();
  old.cards.forEach(c => {
    if (!c || !c.front || !c.back) return;
    const name = c.book || "Woordjes";
    if (!lists.has(name)) lists.set(name, { id: uid(), name, langA: "Nederlands", langB: LEGACY_LANG[c.language] || "Andere taal", chapters: new Map() });
    const list = lists.get(name), sec = c.section || "Hoofdstuk 1";
    if (!list.chapters.has(sec)) list.chapters.set(sec, { id: uid(), name: sec, words: [] });
    const box = (c.interval || 0) >= 21 ? 3 : (c.interval || 0) >= 6 ? 2 : (c.interval || 0) >= 1 ? 1 : 0;
    list.chapters.get(sec).words.push({ id: uid(), a: c.back, b: c.front, box });
  });
  if (!lists.size) return null;
  return migrate({ updatedAt: Date.now(), lists: [...lists.values()].map(l => Object.assign(l, { chapters: [...l.chapters.values()] })) });
}
let state = null;
try { state = migrate(JSON.parse(localStorage.getItem(LS_KEY) || "null")); } catch (e) { state = null; }
if (!state) { try { state = fromLegacy(); } catch (e) { state = null; } }
if (!state) state = seed();

/* Look: "teal" (rustig) of "geel" (stickers). De keuze staat in de instellingen en geldt direct. */
const LOOKS = {
  teal: { name: "Teal", light: "#F7F9F9", dark: "#0D1B1B" },
  geel: { name: "Geel", light: "#ffd84a", dark: "#2a2218" }
};
function applyLook() {
  const k = LOOKS[state.settings.look] ? state.settings.look : "teal";
  document.documentElement.dataset.look = k;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas[0]) metas[0].content = LOOKS[k].light;
  if (metas[1]) metas[1].content = LOOKS[k].dark;
}
applyLook();

const syncLabel = "Opgeslagen op dit apparaat";
function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
}

/* ---------- back-up ---------- */
let backupMsg = "", pendingRestore = null;
const wordTotal = s => s.lists.reduce((n, l) => n + l.chapters.reduce((m, c) => m + c.words.length, 0), 0);
function backupPanel() {
  const pr = pendingRestore;
  const confirmRow = pr
    ? `<div class="preview"><b>Back-up gevonden:</b> ${pr.lists.length} ${pr.lists.length === 1 ? "lijst" : "lijsten"} met ${wordTotal(pr)} woordjes. Dit vervangt alles wat nu op dit apparaat staat.
        <div class="row" style="margin-top:8px"><button class="btn primary small" data-act="dorestore">Ja, zet terug</button><button class="btn small" data-act="cancelrestore">Nee</button></div></div>`
    : "";
  return `<section class="sticker panel">
      <h2>Back-up</h2>
      <p class="hint">Je woordjes staan alleen op dit apparaat. Maak af en toe een back-up, of zet er een terug (ook handig om woordjes naar een ander apparaat te verhuizen).</p>
      <div class="row" style="align-items:center"><button class="btn" data-act="export">Back-up opslaan</button><button class="btn" data-act="restore">Back-up terugzetten</button></div>
      <input type="file" id="restore" accept="application/json,.json" hidden>
      ${backupMsg ? `<div class="hint" role="status">${esc(backupMsg)}</div>` : ""}${confirmRow}
    </section>`;
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "schnitzel-learning-backup-" + dayKey() + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  backupMsg = "Back-up opgeslagen in je downloads.";
}
function readBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = migrate(JSON.parse(reader.result));
      if (!parsed || !parsed.lists.length) throw new Error("leeg");
      pendingRestore = parsed; backupMsg = "";
    } catch (e) { pendingRestore = null; backupMsg = "Dit bestand is geen geldige back-up van Schnitzel Learning."; }
    render();
  };
  reader.onerror = () => { backupMsg = "Het bestand kon niet gelezen worden."; render(); };
  reader.readAsText(file);
}

/* ---------- lijsten delen ---------- */
let shareMsg = "", shareUrl = "", pendingShare = null;
const toB64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromB64 = str => { const b = atob(str.replace(/-/g, "+").replace(/_/g, "/")); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
async function readAll(stream) {
  const reader = stream.getReader(), parts = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.length; if (total > 2e6) { reader.cancel(); throw new Error("groot"); }
    parts.push(value);
  }
  const out = new Uint8Array(total); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
}
function listToShare(l) {
  return { formaat: "schnitzel-lijst", versie: 1, naam: l.name, taal1: l.langA, taal2: l.langB,
    hoofdstukken: l.chapters.filter(c => c.words.length).map(c => ({ naam: c.name, woorden: c.words.map(w => [w.a, w.b]) })) };
}
async function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream !== "undefined") {
    try { return "z." + toB64(await readAll(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw")))); } catch (e) {}
  }
  return "p." + toB64(bytes);
}
async function decodeShare(code) {
  if (code.length > 60000) throw new Error("groot");
  const kind = code.slice(0, 2); let bytes = fromB64(code.slice(2));
  if (kind === "z.") {
    if (typeof DecompressionStream === "undefined") throw new Error("nocompress");
    bytes = await readAll(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
  } else if (kind !== "p.") throw new Error("formaat");
  return JSON.parse(new TextDecoder().decode(bytes));
}
/* Alles wat binnenkomt (link of bestand) is onbetrouwbaar: alleen tekst, vaste maximale groottes */
function sanitizeShared(o) {
  if (!o || o.formaat !== "schnitzel-lijst" || !Array.isArray(o.hoofdstukken)) return null;
  const str = (x, n) => String(x ?? "").trim().slice(0, n);
  let words = 0; const chapters = [];
  for (const c of o.hoofdstukken.slice(0, 100)) {
    const ws = [];
    for (const p of (c && Array.isArray(c.woorden) ? c.woorden : [])) {
      if (words >= 5000) break;
      if (Array.isArray(p) && str(p[0], 200) && str(p[1], 200)) { ws.push([str(p[0], 200), str(p[1], 200)]); words++; }
    }
    if (ws.length) chapters.push({ n: str(c.naam, 80) || "Hoofdstuk " + (chapters.length + 1), w: ws });
  }
  if (!chapters.length) return null;
  return { name: str(o.naam, 60) || "Gedeelde lijst", langA: str(o.taal1, 30) || "Taal 1", langB: str(o.taal2, 30) || "Taal 2", chapters };
}
async function receiveShare(code) {
  try {
    const obj = sanitizeShared(await decodeShare(code.trim()));
    if (!obj) throw new Error("leeg");
    pendingShare = obj; shareMsg = ""; view = { name: "share" }; return true;
  } catch (e) {
    pendingShare = null; if (view.name === "share") view = { name: "home" };
    shareMsg = e && e.message === "nocompress" ? "Deze link kan in deze browser niet geopend worden. Vraag om een bestand." : "Deze link of code is niet geldig.";
    return false;
  }
}
async function handleHash() {
  const m = location.hash.match(/^#deel=(.+)$/); if (!m) return;
  await receiveShare(m[1]);
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  render();
}
function readShareFile(file) {
  if (file.size > 2e6) { shareMsg = "Dit bestand is te groot voor een lijst."; render(); return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = sanitizeShared(JSON.parse(reader.result)); if (!obj) throw new Error("leeg");
      pendingShare = obj; shareMsg = ""; view = { name: "share" };
    } catch (e) { shareMsg = "Dit bestand is geen gedeelde lijst van Schnitzel Learning."; }
    render();
  };
  reader.onerror = () => { shareMsg = "Het bestand kon niet gelezen worden."; render(); };
  reader.readAsText(file);
}
function shareSave(l) {
  const blob = new Blob([JSON.stringify(listToShare(l), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "schnitzel-lijst-" + (l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lijst") + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  shareMsg = "Bestand opgeslagen in je downloads. Stuur het naar een klasgenoot.";
}
async function shareLink(l) {
  shareUrl = "";
  if (location.protocol === "file:") { shareMsg = "Een link werkt alleen vanaf de echte website. Gebruik 'Bestand opslaan'."; render(); return; }
  const url = location.origin + location.pathname + "#deel=" + await encodeShare(listToShare(l));
  if (url.length > 8000) { shareMsg = "Deze lijst is te groot voor een link. Gebruik 'Bestand opslaan'."; render(); return; }
  shareUrl = url;
  if (navigator.share) {
    try { await navigator.share({ title: "Schnitzel Learning: " + l.name, url }); shareMsg = "Gedeeld."; render(); return; }
    catch (e) { if (e && e.name === "AbortError") { shareMsg = ""; render(); return; } }
  }
  try { await navigator.clipboard.writeText(url); shareMsg = "Link gekopieerd. Plak hem in een bericht."; }
  catch (e) { shareMsg = "Kopieer de link hieronder zelf."; }
  render();
}
function receivePanel() {
  return `<section class="sticker panel">
      <h2>Lijst ontvangen</h2>
      <p class="hint">Heeft een klasgenoot een lijst gedeeld? Plak hier de link of de code, of kies het bestand.</p>
      <div class="row" style="align-items:flex-end"><div class="field"><label class="lbl" for="sharein">Link of code</label><input type="text" id="sharein" placeholder="https://…#deel=…" autocomplete="off" autocapitalize="off" spellcheck="false"></div><button class="btn" data-act="sharepaste">Bekijken</button></div>
      <div><button class="btn" data-act="sharefile">Bestand kiezen</button></div>
      <input type="file" id="sharefileinput" accept="application/json,.json" hidden>
      ${shareMsg ? `<div class="hint" role="status">${esc(shareMsg)}</div>` : ""}
    </section>`;
}
function renderShare() {
  const p = pendingShare; if (!p) { view = { name: "home" }; return renderHome(); }
  const n = p.chapters.reduce((a, c) => a + c.w.length, 0), first = p.chapters[0].w[0];
  return shell(`
    <button class="linkbtn backlink" data-act="sharecancel">← Terug</button>
    <div class="pagehead"><h1>Lijst ontvangen</h1><div class="pair">Kijk even of dit klopt en voeg de lijst toe.</div></div>
    <section class="sticker panel">
      <h2>${esc(p.name)}</h2>
      <div class="pair" style="font-weight:600">${esc(p.langA)} ⇄ ${esc(p.langB)} · ${p.chapters.length} ${p.chapters.length === 1 ? "hoofdstuk" : "hoofdstukken"} · ${n} woordjes</div>
      <ul class="misslist">${p.chapters.slice(0, 8).map(c => `<li><b>${esc(c.n)}</b><span>${c.w.length} woordjes</span></li>`).join("")}${p.chapters.length > 8 ? `<li><b>…</b><span>nog ${p.chapters.length - 8} hoofdstukken</span></li>` : ""}</ul>
      <p class="hint">Voorbeeld: ${esc(first[0])} → ${esc(first[1])}</p>
      <div class="row"><button class="btn primary" data-act="shareadd">Toevoegen aan mijn lijsten</button><button class="btn" data-act="sharecancel">Annuleren</button></div>
    </section>`);
}

/* ---------- spel: xp, level, streak ---------- */
const TITLES = ["Broodkruimel", "Kotelet", "Panko-pro", "Gouden korst", "Schnitzelmeester", "Wiener-legende"];
const levelOf = xp => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
const titleOf = l => TITLES[Math.min(TITLES.length - 1, Math.floor((l - 1) / 2))];
function levelInfo() {
  const xp = state.stats.xp, L = levelOf(xp), base = 50 * L * (L - 1), next = 50 * L * (L + 1);
  return { L, xp, base, next, pct: Math.round(((xp - base) / (next - base)) * 100), title: titleOf(L) };
}
function touchStreak() {
  const st = state.stats, today = dayKey();
  if (st.lastDay === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  st.streak = st.lastDay === dayKey(y) ? st.streak + 1 : 1;
  st.best = Math.max(st.best, st.streak); st.lastDay = today;
}
function currentStreak() {
  const st = state.stats; if (!st.lastDay) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (st.lastDay === dayKey() || st.lastDay === dayKey(y)) ? st.streak : 0;
}

/* ---------- geluid + confetti ---------- */
let actx = null;
function beep(notes) {
  if (!state.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let t = actx.currentTime;
    notes.forEach(([f, d, type]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.8;
    });
  } catch (e) {}
}
const sfx = { ok: () => beep([[660, .12], [880, .16]]), near: () => beep([[520, .12], [660, .16]]), bad: () => beep([[200, .22, "sawtooth"]]), win: () => beep([[523, .12], [659, .12], [784, .12], [1047, .3]]) };
function confetti(n = 140) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.getElementById("confetti"), ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = state.settings.look === "geel" ? ["#ff5a45", "#ffd84a", "#7be0a9", "#7cc8ff", "#ff9ec7", "#c9a7ff"] : ["#E06D3B", "#006E6E", "#005454", "#BFE3DA", "#F8CDB8", "#AFD8D2"];
  const ps = Array.from({ length: n }, () => ({ x: cv.width / 2 + (Math.random() - .5) * 120, y: cv.height * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3, r: Math.random() * 6 + 4, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - .5) * .4 }));
  const t0 = performance.now();
  (function frame(t) {
    const dt = t - t0; ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
    if (dt < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}

/* ---------- controleren van antwoorden ---------- */
const stripAcc = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const ARTICLES = /^(de|het|een|der|den|le|la|les|l|un|une|des|du|el|los|las|una|die|das|ein|eine|the|a|an|to|il|lo|gli|i)\s+/;
function clean(s) {
  return s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[’‘`´]/g, "'").replace(/'/g, "' ")
    .replace(/[.,;:!?"“”()\[\]{}\-–—_/\\]/g, " ").replace(/\s+/g, " ").trim();
}
function artless(s) { return s.replace(/^(l)' /, "").replace(ARTICLES, "").trim(); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
function variants(expected) {
  const parts = expected.split(/[;,/]/).map(x => x.trim()).filter(Boolean);
  return parts.length > 1 ? [expected, ...parts] : [expected];
}
function check(input, expected, strict) {
  const u = clean(input);
  if (!u) return "bad";
  let best = "bad";
  for (const v of variants(expected)) {
    const e = clean(v);
    if (!e) continue;
    if (u === e || artless(u) === artless(e)) return "ok";
    if (strict) continue;
    const us = stripAcc(u), es = stripAcc(e);
    const a1 = artless(us), b1 = artless(es);
    if (us === es || a1 === b1) { best = "near"; continue; }
    const len = Math.max(a1.length, b1.length);
    const limit = len >= 8 ? 2 : len >= 4 ? 1 : 0;
    if (limit && lev(a1, b1) <= limit) best = "near";
  }
  return best;
}

/* ---------- plakken ---------- */
function parsePaste(text) {
  const lines = text.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const seps = [/\t+/, /\s+[-–—=]\s+/, /\s*;\s*/, /\s*=\s*/, /\s*\|\s*/];
  for (const sep of seps) {
    const hits = lines.filter(l => sep.test(l));
    if (hits.length >= Math.max(1, Math.ceil(lines.length * 0.6))) {
      return lines.map(l => { const p = l.split(sep); return p.length >= 2 ? [p[0].trim(), p.slice(1).join(" ").trim()] : null; }).filter(p => p && p[0] && p[1]);
    }
  }
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([lines[i], lines[i + 1]]);
  return pairs;
}

/* ---------- gegevens ---------- */
const getList = id => state.lists.find(l => l.id === id);
const listWords = l => l.chapters.flatMap(c => c.words);
const mastery = words => words.length ? Math.round(words.reduce((a, w) => a + (w.box || 0), 0) / (3 * words.length) * 100) : 0;
let view = { name: "home" };
let session = null;
let draft = { name: "", langA: "Nederlands", langB: "", chName: "", paste: "" };

/* ---------- hints, meerkeuze en soort vraag ---------- */
const HINT_COST = 3;
const MODE_HINTS = {
  type: "Typ het antwoord. Een hint laat een letter extra zien en kost 3 XP.",
  cards: "Draai het kaartje om en geef aan of je het wist.",
  choice: "Kies het juiste antwoord uit vier opties.",
  spell: "Bekijk het woord, verberg het en typ het uit je hoofd. Wordt streng nagekeken, ook accenten.",
  learn: "Nieuwe woorden eerst met meerkeuze, daarna typen met de eerste letter, daarna zonder hulp. Fout? Dan komt het woord snel terug. Je stopt pas als alles geleerd is."
};
const isLetter = ch => /[\p{L}\p{N}]/u.test(ch);
const letterCount = str => [...str].filter(isLetter).length;
function hintText(answer, n) {
  let shown = 0;
  return [...answer].map(ch => { if (!isLetter(ch)) return ch; if (shown < n) { shown++; return ch; } return "•"; }).join("");
}
function makeOptions(it, listId) {
  const l = getList(listId), seen = new Set([clean(it.a)]), pool = [];
  listWords(l).forEach(w => { const x = it.side === "a" ? w.a : w.b, k = clean(x); if (k && !seen.has(k)) { seen.add(k); pool.push(x); } });
  const opts = shuffle([it.a, ...shuffle(pool).slice(0, 3)]);
  return { opts, correct: opts.indexOf(it.a) };
}
function optsFor(s, it) {
  if (s.optsItem !== it) { s.optsItem = it; s.optsData = makeOptions(it, s.listId); }
  return s.optsData;
}
const stageLabel = box => ["nieuw", "met hulp", "zonder hulp"][Math.min(box || 0, 2)];
function kindOf(s, it) {
  const wantsChoice = s.mode === "choice" || (s.mode === "learn" && (it.w.box || 0) === 0);
  if (wantsChoice) return optsFor(s, it).opts.length >= 2 ? "choice" : "type";
  return s.mode === "learn" ? "type" : s.mode;
}

const LOGO = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 36C3 22 13 9 32 9c19 0 29 12 24 26-5 14-17 20-27 20-10 0-17-6-21-19z" fill="#ffb938" stroke="#17120c" stroke-width="4" stroke-linejoin="round"/><path d="M15 34c-2-10 6-18 17-18s18 8 15 17c-3 9-11 13-19 13s-11-4-13-12z" fill="#ffd978"/><circle cx="25" cy="31" r="3.4" fill="#17120c"/><circle cx="39" cy="31" r="3.4" fill="#17120c"/><path d="M25 40c4 4 10 4 14 0" fill="none" stroke="#17120c" stroke-width="3.2" stroke-linecap="round"/><path d="M44 8c6-3 12 1 11 8-6 2-12-2-11-8z" fill="#7be0a9" stroke="#17120c" stroke-width="3" stroke-linejoin="round"/><path d="M46 52c6-1 10 3 9 8-6 1-10-3-9-8z" fill="#ffe27a" stroke="#17120c" stroke-width="3" stroke-linejoin="round"/></svg>`;
const FLAME = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 2-11z" fill="#E06D3B" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/></svg>`;

function shell(inner) {
  const li = levelInfo(), sk = currentStreak();
  return `<div class="top">
    <button class="brand" data-act="home" aria-label="Naar het beginscherm">${LOGO}<span class="brand-name">Schnitzel<span>Learning</span></span></button>
    <div class="chips">
      <span class="pill fire" title="Dagen op rij geoefend">${FLAME}${sk}</span>
      <span class="pill lvl" title="Je level">Lv ${li.L}</span>
      <button class="pill snd" data-act="look" title="Wissel van look">Look: ${(LOOKS[state.settings.look] || LOOKS.teal).name}</button>
      <button class="pill prog" data-act="progress">Voortgang</button>
      <button class="pill snd" data-act="sound" aria-pressed="${state.settings.sound}">Geluid ${state.settings.sound ? "aan" : "uit"}</button>
    </div></div>${inner}
    <div class="hint" id="sync" style="text-align:center">${esc(syncLabel)}</div>`;
}

/* ---------- beginscherm ---------- */
function renderHome() {
  const li = levelInfo(), sk = currentStreak();
  const cards = state.lists.map((l, i) => {
    const ws = listWords(l);
    return `<div class="sticker subject k${i % 5}">
      ${l.example ? '<span class="tag">Voorbeeld</span>' : ""}
      <h3>${esc(l.name)}</h3>
      <div class="pair">${esc(l.langA)} ⇄ ${esc(l.langB)}</div>
      <div class="meta">${l.chapters.length} ${l.chapters.length === 1 ? "hoofdstuk" : "hoofdstukken"} · ${ws.length} woordjes</div>
      <div><div class="xpline"><span>Beheerst</span><span>${mastery(ws)}%</span></div><div class="bar slim"><i style="width:${mastery(ws)}%"></i></div></div>
      <div class="actions"><button class="btn" data-act="open" data-id="${l.id}">Open</button></div>
    </div>`;
  }).join("");
  return shell(`
    <div class="hero"><h1>Klaar voor een knapperige ronde?</h1><p>${sk > 1 ? `Je zit op ${sk} dagen op rij. Hou het vast!` : "Oefen vandaag en start je streak."}</p></div>
    <div class="sticker levelcard">
      <div class="lbl">Je level</div>
      <h2>Level ${li.L} · ${esc(li.title)}</h2>
      <div class="bar" role="progressbar" aria-valuenow="${li.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${li.pct}%"></i></div>
      <div class="xpline"><span>${li.xp} XP</span><span>nog ${li.next - li.xp} XP tot level ${li.L + 1}</span></div>
    </div>
    <div class="subjects">${cards || '<div class="empty sticker">Nog geen lijsten. Maak hieronder je eerste.</div>'}</div>
    <form class="sticker panel" id="newlist" autocomplete="off">
      <h2>Nieuwe lijst</h2>
      <div class="row">
        <div class="field" style="flex-basis:100%"><label class="lbl" for="nl-name">Naam (bijv. het vak)</label><input type="text" id="nl-name" placeholder="Frans" value="${esc(draft.name)}" required></div>
        <div class="field"><label class="lbl" for="nl-a">Taal 1</label><input type="text" id="nl-a" value="${esc(draft.langA)}" required></div>
        <div class="field"><label class="lbl" for="nl-b">Taal 2</label><input type="text" id="nl-b" placeholder="Frans" value="${esc(draft.langB)}" required></div>
      </div>
      <div><button class="btn primary" type="submit">Lijst maken</button></div>
    </form>${receivePanel()}${backupPanel()}`);
}

/* ---------- lijst met hoofdstukken ---------- */
function prefsFor(l) {
  const p = l.prefs || (l.prefs = { dir: "ab", mode: "type", weak: false, sel: null });
  view.prefs = p;
  if (!p.sel) p.sel = l.chapters.map(c => c.id);
  p.sel = p.sel.filter(id => l.chapters.some(c => c.id === id));
  return p;
}
function itemsForWords(l, words, p) {
  const items = [];
  words.forEach(w => {
    if (p.dir === "ab" || p.dir === "both") items.push({ w, q: w.a, a: w.b, from: l.langA, to: l.langB, side: "b" });
    if (p.dir === "ba" || p.dir === "both") items.push({ w, q: w.b, a: w.a, from: l.langB, to: l.langA, side: "a" });
  });
  return items;
}
function poolItems(l, p) {
  const words = [];
  l.chapters.filter(c => p.sel.includes(c.id)).forEach(c => c.words.forEach(w => {
    if ((p.weak || p.mode === "learn") && (w.box || 0) >= 3) return;
    words.push(w);
  }));
  return itemsForWords(l, words, p);
}
const pasted = () => parsePaste(draft.paste || "").map(p => draft.swap ? [p[1], p[0]] : p);
function pasteBox() {
  const l = getList(view.id), parsed = pasted();
  const swapUi = `<label class="choice"><input type="checkbox" id="pswap" ${draft.swap ? "checked" : ""}><span>Kolommen omwisselen: links staat het ${esc(l.langB)}</span></label>`;
  const pv = parsed.length
    ? `<div class="preview"><b>${parsed.length} woordjes herkend.</b> Voorbeeld:<ul>${parsed.slice(0, 3).map(p => `<li>${esc(p[0])} → ${esc(p[1])}</li>`).join("")}</ul></div>`
    : (draft.paste ? '<div class="preview err">Ik vind hier geen woordjes in. Zet per regel een woordje met de vertaling erachter, of zet ze om en om onder elkaar.</div>' : "");
  return `${swapUi}${pv}<div><button class="btn primary" data-act="import" ${parsed.length ? "" : "disabled"}>Importeer ${parsed.length || ""} woordjes</button></div>`;
}
function renderList() {
  const l = getList(view.id); if (!l) { view = { name: "home" }; return renderHome(); }
  const p = prefsFor(l);
  const pool = poolItems(l, p);
  const selCount = l.chapters.filter(c => p.sel.includes(c.id)).reduce((n, c) => n + c.words.length, 0);
  const canStart = pool.length > 0 && (p.mode !== "choice" || listWords(l).length >= 2);
  const radio = (name, val, label, cur) => `<label class="choice"><input type="radio" name="${name}" value="${val}" ${cur === val ? "checked" : ""}><span>${label}</span></label>`;
  const chips = l.chapters.map(c => `<label class="choice"><input type="checkbox" data-sel="${c.id}" ${p.sel.includes(c.id) ? "checked" : ""}><span>${esc(c.name)}</span></label>`).join("");
  const chapters = l.chapters.map(c => {
    const open = view.open === c.id;
    const rows = c.words.map(w => `
      <div class="wordrow" data-w="${w.id}">
        <input type="text" data-edit="a" value="${esc(w.a)}" aria-label="${esc(l.langA)}">
        <input type="text" data-edit="b" value="${esc(w.b)}" aria-label="${esc(l.langB)}">
        <span class="pips" title="Beheersing" aria-label="Beheersing ${w.box || 0} van 3">${[0, 1, 2].map(i => `<i class="${(w.box || 0) > i ? "on" : ""}"></i>`).join("")}</span>
        <button class="x" data-act="delword" data-w="${w.id}" aria-label="Verwijder woordje">×</button>
      </div>`).join("");
    const body = !open ? "" : `<div class="cbody">
      <div><h4>Woordje toevoegen</h4>
        <form class="row" id="addword" autocomplete="off" style="margin-top:8px">
          <div class="field"><label class="lbl" for="aw-a">${esc(l.langA)}</label><input type="text" id="aw-a" required></div>
          <div class="field"><label class="lbl" for="aw-b">${esc(l.langB)}</label><input type="text" id="aw-b" required></div>
          <button class="btn primary" type="submit">Toevoegen</button>
        </form>
        <p class="hint" style="margin-top:6px">Meerdere goede antwoorden? Zet er een komma tussen, bijv. “mooi, knap”.</p></div>
      <div><h4>Plakken uit Studygo</h4>
        <p class="hint" style="margin:4px 0 8px">Kopieer de woordjes op Studygo (Ctrl+C of Cmd+C) en plak ze hier. Ook “woord - vertaling” of “woord = vertaling” per regel werkt.</p>
        <textarea id="paste" aria-label="Woordjes plakken" placeholder="de hond&#9;le chien&#10;de kat&#9;le chat">${esc(draft.paste || "")}</textarea>
        <div id="pastebox" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${pasteBox()}</div></div>
      <div><h4>Woordjes (${c.words.length})</h4>
        ${c.words.length ? `<div style="margin-top:8px"><div class="wordhead"><span class="lbl">${esc(l.langA)}</span><span class="lbl">${esc(l.langB)}</span><span class="lbl" style="width:42px">Score</span><span style="width:36px"></span></div>${rows}</div>` : '<div class="empty">Nog geen woordjes in dit hoofdstuk.</div>'}</div>
      <div><h4>Dit hoofdstuk</h4>
        <div class="row" style="margin-top:8px"><div class="field"><label class="lbl" for="cn">Naam</label><input type="text" id="cn" value="${esc(c.name)}"></div>
        ${view.confirm === c.id
          ? `<button class="btn primary small" data-act="delch" data-ch="${c.id}">Ja, verwijder</button><button class="btn small" data-act="cancelconf">Nee</button>`
          : `<button class="btn small" data-act="askdelch" data-ch="${c.id}">Verwijderen</button>`}
        <button class="btn small" data-act="swapch" data-ch="${c.id}" title="Zet ${esc(l.langA)} en ${esc(l.langB)} van alle woordjes in dit hoofdstuk om">Kolommen omwisselen</button></div></div>
    </div>`;
    return `<div class="sticker chapter ${open ? "open" : ""}">
      <div class="chead">
        <button class="tog" data-act="toggle" data-ch="${c.id}" aria-expanded="${open}">
          <h3><span class="caret">▶</span>${esc(c.name)}</h3>
          <div class="cmeta"><span>${c.words.length} woordjes</span><div class="bar slim green"><i style="width:${mastery(c.words)}%"></i></div><span>${mastery(c.words)}%</span></div>
        </button>
        <button class="btn good small" data-act="startch" data-ch="${c.id}" ${c.words.length ? "" : "disabled"}>Oefen dit</button>
      </div>${body}</div>`;
  }).join("");

  return shell(`
    <button class="linkbtn backlink" data-act="home">← Alle lijsten</button>
    <div class="pagehead"><h1>${esc(l.name)}</h1><div class="pair">${esc(l.langA)} ⇄ ${esc(l.langB)} · ${listWords(l).length} woordjes · ${mastery(listWords(l))}% beheerst</div></div>

    <section class="sticker panel">
      <h2>Oefenen</h2>
      <div><div class="lbl" style="margin-bottom:6px">Hoofdstukken</div><div class="choices">${chips || '<span class="hint">Maak eerst een hoofdstuk.</span>'}</div></div>
      <div><div class="lbl" style="margin-bottom:6px">Richting</div><div class="choices">
        ${radio("dir", "ab", `${esc(l.langA)} → ${esc(l.langB)}`, p.dir)}${radio("dir", "ba", `${esc(l.langB)} → ${esc(l.langA)}`, p.dir)}${radio("dir", "both", "Door elkaar", p.dir)}</div></div>
      <div><div class="lbl" style="margin-bottom:6px">Manier</div><div class="choices">
        ${radio("mode", "type", "Typen", p.mode)}${radio("mode", "cards", "Kaartjes", p.mode)}${radio("mode", "choice", "Meerkeuze", p.mode)}${radio("mode", "spell", "Spelling", p.mode)}${radio("mode", "learn", "Learn", p.mode)}</div>
        <p class="hint" style="margin-top:8px">${esc(MODE_HINTS[p.mode] || "")}</p></div>
      <div class="choices">
        <label class="choice"><input type="checkbox" id="weak" ${p.weak ? "checked" : ""}><span>Alleen woordjes die ik nog niet beheers</span></label>
        <label class="choice"><input type="checkbox" id="strict" ${state.settings.strict ? "checked" : ""}><span>Streng nakijken</span></label>
      </div>
      <div class="row" style="align-items:center"><button class="btn primary" data-act="start" ${canStart ? "" : "disabled"}>Start: ${p.dir === "ab" ? `${esc(l.langA)} → ${esc(l.langB)}` : p.dir === "ba" ? `${esc(l.langB)} → ${esc(l.langA)}` : "door elkaar"} (${pool.length})</button>
      ${canStart ? "" : `<span class="hint">${pool.length ? "Meerkeuze heeft minstens 2 woordjes in de lijst nodig." : selCount && p.mode === "learn" ? "Alles in deze hoofdstukken is geleerd. Kies een andere manier om toch te oefenen." : selCount && p.weak ? "Alles beheerst. Zet het filter uit om toch te oefenen." : "Kies een hoofdstuk met woordjes."}</span>`}</div>
    </section>

    <div class="chapters">${chapters}</div>

    <form class="sticker panel" id="newch" autocomplete="off">
      <h2>Nieuw hoofdstuk</h2>
      <div class="row"><div class="field"><label class="lbl" for="ch-name">Naam</label><input type="text" id="ch-name" placeholder="Hoofdstuk ${l.chapters.length + 1}" value="${esc(draft.chName)}"></div>
      <button class="btn primary" type="submit">Toevoegen</button></div>
    </form>

    <section class="sticker panel">
      <h2>Lijst beheren</h2>
      <div class="row">
        <div class="field" style="flex-basis:100%"><label class="lbl" for="ln">Naam</label><input type="text" id="ln" value="${esc(l.name)}"></div>
        <div class="field"><label class="lbl" for="la">Taal 1</label><input type="text" id="la" value="${esc(l.langA)}"></div>
        <div class="field"><label class="lbl" for="lb">Taal 2</label><input type="text" id="lb" value="${esc(l.langB)}"></div>
      </div>
      <div><h4 class="subh">Delen</h4>
        <p class="hint">Stuur deze lijst naar een klasgenoot. Alleen de woordjes gaan mee, niet je scores.</p>
        <div class="row" style="align-items:center;margin-top:8px"><button class="btn small" data-act="sharelink">${navigator.share ? "Deel link…" : "Kopieer link"}</button><button class="btn small" data-act="sharesave">Bestand opslaan</button></div>
        ${shareMsg ? `<div class="hint" role="status" style="margin-top:8px">${esc(shareMsg)}</div>` : ""}
        ${shareUrl ? `<input type="text" id="shareurl" readonly value="${esc(shareUrl)}" aria-label="Link naar deze lijst" style="margin-top:8px">` : ""}</div>
      <div>${view.confirm === "list" ? `<span style="margin-right:10px;font-weight:600">Weet je het zeker?</span><button class="btn primary small" data-act="dellist">Ja, verwijder alles</button> <button class="btn small" data-act="cancelconf">Nee</button>` : `<button class="btn small" data-act="askdellist">Lijst verwijderen</button>`}</div>
    </section>`);
}

/* ---------- oefensessie ---------- */
const learnedCount = s => { let n = 0; s.learnWords.forEach(w => { if ((w.box || 0) >= 3) n++; }); return n; };
function beginItem() {
  const s = session, it = s.queue[s.idx]; if (!it) return;
  s.hints = 0; s.spellShown = true; s.answer = ""; s.picked = -1; s.optsItem = null; s.flipped = false;
  s.kind = kindOf(s, it);
  s.free = s.mode === "learn" && (it.w.box || 0) === 1 ? 1 : 0;
  s.stage = stageLabel(it.w.box);
}
function startSession(items, listId, modeOverride) {
  const l = getList(listId); if (!l) return;
  if (!items.length) { view = { name: "list", id: listId, prefs: view.prefs, open: view.open }; session = null; render(); return; }
  const mode = modeOverride || l.prefs.mode;
  session = { listId, mode, queue: shuffle(items), total: items.length, idx: 0, right: 0, wrongs: 0, missed: [], flipped: false, fb: null, answer: "", combo: 0, bestCombo: 0, xp: 0, hints: 0, free: 0, spellShown: true, picked: -1, kind: mode };
  if (mode === "learn") session.learnWords = new Map(items.map(i => [i.w.id, i.w]));
  view = { name: "session", id: listId, prefs: view.prefs, open: view.open };
  beginItem();
  render(); window.scrollTo(0, 0);
}
function logDay(res, gain) {
  const k = dayKey(), h = state.history[k] || (state.history[k] = { answered: 0, correct: 0, xp: 0 });
  h.answered++; if (res !== "bad") h.correct++; h.xp += gain;
  const keys = Object.keys(state.history);
  if (keys.length > 150) keys.sort().slice(0, keys.length - 120).forEach(x => delete state.history[x]);
}
function undoLog(it, f) {
  it.w.seen = Math.max(0, (it.w.seen || 0) - 1);
  if (f.res === "bad") it.w.wrong = Math.max(0, (it.w.wrong || 0) - 1);
  const h = state.history[dayKey()];
  if (h) { h.answered = Math.max(0, h.answered - 1); if (f.res !== "bad") h.correct = Math.max(0, h.correct - 1); h.xp = Math.max(0, h.xp - f.gain); }
}
function apply(it, res, base) {
  const s = session, st = state.stats, w = it.w, hints = s.hints || 0;
  touchStreak();
  const fb = { res, prevBox: w.box || 0, prevCombo: s.combo, gain: 0, hints };
  w.seen = (w.seen || 0) + 1;
  if (res === "bad") { w.wrong = (w.wrong || 0) + 1; w.box = Math.max(0, (w.box || 0) - 1); s.combo = 0; }
  else {
    fb.gain = Math.max(1, (res === "near" ? 7 : base) + Math.min(s.combo, 10) - HINT_COST * hints);
    if (!hints) { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); w.box = Math.min(3, (w.box || 0) + 1); }
  }
  st.xp += fb.gain; s.xp += fb.gain; st.answered++; if (res !== "bad") st.correct++;
  logDay(res, fb.gain);
  save();
  (sfx[res] || (() => {}))();
  return fb;
}
function advance() {
  const s = session, it = s.queue[s.idx], bad = s.fb.res === "bad", learn = s.mode === "learn";
  if (bad) { s.wrongs++; if (!(learn && s.missed.some(m => m.w === it.w))) s.missed.push(it); } else s.right++;
  if (learn && (it.w.box || 0) < 3) s.queue.splice(Math.min(s.queue.length, s.idx + 1 + (bad ? 3 : 6)), 0, it);
  s.idx++;
  if (learn) while (s.idx < s.queue.length && (s.queue[s.idx].w.box || 0) >= 3) s.idx++;
  s.fb = null;
  if (s.idx >= s.queue.length) {
    if (learn) s.total = s.right + s.wrongs;
    if (s.total && s.right / s.total >= .7) { sfx.win(); setTimeout(() => confetti(), 150); }
  } else beginItem();
  render(); window.scrollTo(0, 0);
}
function choose(i) {
  const s = session, it = s.queue[s.idx]; if (!it || s.fb || s.kind !== "choice") return;
  const o = optsFor(s, it); if (i < 0 || i >= o.opts.length) return;
  s.picked = i; s.answer = o.opts[i];
  s.fb = apply(it, i === o.correct ? "ok" : "bad", 10); render();
}
function renderSession() {
  const s = session;
  if (s.idx >= s.queue.length) return renderResults();
  const it = s.queue[s.idx], kind = s.kind, fb = s.fb, learn = s.mode === "learn";
  const done = learn ? learnedCount(s) : s.idx, tot = learn ? s.learnWords.size : s.queue.length, pct = Math.round((done / tot) * 100);
  const hud = `<div class="hud">
    <button class="btn small" data-act="stop">Stoppen</button>
    <div class="bar green" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <span class="pill">${learn ? `Geleerd ${done}/${tot}` : `${s.idx + 1}/${s.queue.length}`}</span>
    ${s.combo >= 3 ? `<span class="pill combo" id="combo">${FLAME}x${s.combo}</span>` : ""}
    <span class="pill">+${s.xp} XP</span></div>`;
  if (kind === "cards") {
    return shell(`${hud}
      <div class="flip"><button class="flipbtn" data-act="flip" aria-label="Draai het kaartje om">
        <div class="flipinner ${s.flipped ? "on" : ""}">
          <div class="face front sticker"><div class="lbl">${esc(it.from)}</div><div class="word">${esc(it.q)}</div><div class="lbl">Tik om te draaien</div></div>
          <div class="face back sticker"><div class="lbl">${esc(it.to)}</div><div class="word">${esc(it.a)}</div></div>
        </div></button></div>
      ${s.flipped ? `<div class="cardbtns"><button class="btn" data-act="cardwrong">Nog oefenen</button><button class="btn good" data-act="cardright">Wist ik</button></div><p class="hint" style="text-align:center">Toetsen: ← nog oefenen, → wist ik</p>` : `<p class="hint" style="text-align:center">Toets: spatie om te draaien</p>`}`);
  }
  let fbHtml = "";
  if (fb) {
    const title = fb.res === "ok" ? "Goed!" : fb.res === "near" ? "Bijna goed, het telt mee" : "Helaas, niet goed";
    const mine = s.answer.trim();
    fbHtml = `<div class="sticker feedback ${fb.res}${fb.res === "bad" ? " shake" : ""}"><strong>${title}</strong>
      ${fb.res !== "ok" ? `<div class="correct">${esc(it.a)}</div>` : ""}
      ${fb.res !== "ok" && mine ? `<div class="mine">${kind === "choice" ? "Jij koos" : "Jij typte"}: ${esc(mine)}</div>` : ""}
      ${fb.gain ? `<div class="gain">+${fb.gain} XP</div>` : ""}
      ${fb.hints && fb.res !== "bad" ? `<div class="mine">${fb.hints} ${fb.hints === 1 ? "hint" : "hints"} gebruikt: minder XP en dit woord gaat er niet op vooruit.</div>` : ""}
      ${fb.res === "bad" && kind !== "choice" ? `<div><button class="linkbtn" data-act="override">Ik had het eigenlijk goed</button></div>` : ""}</div>`;
  }
  const next = `<button class="btn primary" data-act="next" id="nextbtn" style="min-height:56px;font-size:18px">Volgende</button>`;
  const skip = `<div><button class="linkbtn" data-act="skip">Ik weet het niet</button></div>`;
  const qlabel = `${esc(it.from)} → ${esc(it.to)}${learn ? ` · ${esc(s.stage)}` : ""}`;
  const input = `<input type="text" id="answer" aria-label="Je antwoord in het ${esc(it.to)}" placeholder="Typ het ${esc(it.to.toLowerCase())}" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(s.answer)}">`;

  if (kind === "choice") {
    const o = optsFor(s, it);
    const opts = o.opts.map((t, i) => {
      const cls = fb ? (i === o.correct ? " right" : (i === s.picked ? " wrong" : "")) : "";
      return `<button class="btn opt${cls}" data-act="choose" data-i="${i}" ${fb ? "disabled" : ""}><span class="optkey">${i + 1}</span><span>${esc(t)}</span></button>`;
    }).join("");
    return shell(`${hud}
      <div class="sticker panel q"><div class="lbl">${qlabel}</div><div class="word">${esc(it.q)}</div></div>
      <div class="options">${opts}</div>
      ${fb ? fbHtml + next : `<p class="hint" style="text-align:center">Kies een antwoord, of toets 1 tot ${o.opts.length}</p>${skip}`}`);
  }
  if (kind === "spell") {
    if (!fb && s.spellShown) {
      return shell(`${hud}
        <div class="sticker panel q"><div class="lbl">Onthoud de spelling · ${esc(it.to)}</div><div class="word">${esc(it.a)}</div><div class="lbl">${esc(it.q)}</div></div>
        <button class="btn primary" data-act="spellhide" id="spellhide" style="min-height:56px;font-size:18px">Verberg en typ</button>
        <p class="hint" style="text-align:center">Kijk goed naar de letters en de accenten.</p>`);
    }
    return shell(`${hud}
      <div class="sticker panel q"><div class="lbl">Typ het ${esc(it.to.toLowerCase())} uit je hoofd</div><div class="word">${esc(it.q)}</div></div>
      ${fb ? fbHtml + next : `<form class="answerrow" id="answerform" autocomplete="off">${input}<button class="btn primary" type="submit">Check</button></form>
      <div class="row" style="align-items:center"><button class="linkbtn" data-act="skip">Ik weet het niet</button><button class="btn small" data-act="spelllook">Nog even kijken (−${HINT_COST} XP)</button></div>`}`);
  }
  const shown = (s.free || 0) + (s.hints || 0);
  const hintLine = !fb && shown > 0 ? `<div class="hintline" aria-label="Hint">${esc(hintText(it.a, shown))}</div>` : "";
  const canHint = shown < letterCount(it.a) - 1;
  return shell(`${hud}
    <div class="sticker panel q"><div class="lbl">${qlabel}</div><div class="word">${esc(it.q)}</div>${hintLine}</div>
    ${fb ? fbHtml + next : `<form class="answerrow" id="answerform" autocomplete="off">${input}<button class="btn primary" type="submit">Check</button></form>
    <div class="row" style="align-items:center"><button class="linkbtn" data-act="skip">Ik weet het niet</button><button class="btn small" data-act="hint" ${canHint ? "" : "disabled"}>Hint (−${HINT_COST} XP)</button></div>`}`);
}
function renderResults() {
  const s = session, learn = s.mode === "learn", li = levelInfo(), pct = Math.round((s.right / (s.total || 1)) * 100);
  const miss = s.missed.map(m => `<li><b>${esc(m.q)}</b><span>${esc(m.a)}</span></li>`).join("");
  const l2 = getList(s.listId), again = !learn || (l2 && poolItems(l2, prefsFor(l2)).length > 0);
  const big = learn ? `${s.learnWords.size}/${s.learnWords.size}` : `${s.right}/${s.total}`;
  const sub = learn
    ? `${s.right} van ${s.total} antwoorden goed. ${pct >= 90 ? "Gouden korst!" : pct >= 60 ? "Knap gedaan." : "Nu zit het erin."}`
    : (pct >= 90 ? "Gouden korst! Top gedaan." : pct >= 60 ? "Knappe ronde." : "Nog even oefenen en het zit erin.");
  return shell(`
    <div class="sticker score">${LOGO}<div class="lbl">${learn ? "Alles geleerd!" : "Klaar!"}</div><div class="big">${big}</div>
      <div style="font-weight:700;font-size:18px">${sub}</div>
      <div class="stats3"><span class="pill">+${s.xp} XP</span><span class="pill">Beste combo x${s.bestCombo}</span><span class="pill fire">${FLAME}${currentStreak()} dagen</span></div></div>
    <div class="sticker levelcard"><div class="lbl">Level ${li.L} · ${esc(li.title)}</div><div class="bar"><i style="width:${li.pct}%"></i></div><div class="xpline"><span>${li.xp} XP</span><span>nog ${li.next - li.xp} tot level ${li.L + 1}</span></div></div>
    ${s.missed.length ? `<section class="sticker panel"><h2>${learn ? "Lastig geweest" : "Nog oefenen"}</h2><ul class="misslist">${miss}</ul></section>` : ""}
    <div class="row">
      ${s.missed.length && !learn ? `<button class="btn primary" data-act="retry">Oefen de foute (${s.missed.length})</button>` : ""}
      ${again ? `<button class="btn ${s.missed.length && !learn ? "" : "primary"}" data-act="again">${learn ? "Verder leren" : "Nog een keer"}</button>` : ""}
      <button class="btn${again ? "" : " primary"}" data-act="open" data-id="${s.listId}">Terug naar de lijst</button>
    </div>`);
}

/* ---------- voortgang ---------- */
const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];
function lastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d);
    out.push({ key: k, day: WEEKDAYS[d.getDay()], h: state.history[k] || { answered: 0, correct: 0, xp: 0 } });
  }
  return out;
}
const hardWords = l => listWords(l).filter(w => (w.wrong || 0) >= 2)
  .sort((x, y) => (y.wrong || 0) - (x.wrong || 0) || ((y.wrong || 0) / (y.seen || 1)) - ((x.wrong || 0) / (x.seen || 1)));
function renderProgress() {
  const days = lastDays(14), max = Math.max(1, ...days.map(d => d.h.answered));
  const sum = arr => arr.reduce((a, d) => ({ answered: a.answered + d.h.answered, correct: a.correct + d.h.correct, xp: a.xp + d.h.xp }), { answered: 0, correct: 0, xp: 0 });
  const today = days[days.length - 1].h, week = sum(days.slice(-7)), st = state.stats, li = levelInfo();
  const pc = (c, a) => a ? Math.round((c / a) * 100) + "% goed" : "nog niets";
  const all = state.lists.flatMap(l => listWords(l)), mastered = all.filter(w => (w.box || 0) >= 3).length;
  const chart = days.map((d, i) => {
    const n = d.h.answered;
    return `<div class="col${i === days.length - 1 ? " today" : ""}" title="${esc(d.key)}: ${n} antwoorden"><span class="n">${n || ""}</span><i class="barv" style="height:${n ? Math.max(6, Math.round((n / max) * 110)) : 3}px"></i><span class="d">${d.day}</span></div>`;
  }).join("");
  const lists = state.lists.map(l => { const ws = listWords(l); return `<div><div class="xpline"><span>${esc(l.name)}</span><span>${mastery(ws)}% beheerst</span></div><div class="bar slim green"><i style="width:${mastery(ws)}%"></i></div></div>`; }).join("");
  const hardGroups = state.lists.map(l => ({ l, hard: hardWords(l) })).filter(g => g.hard.length).map(g => `
      <div><div class="xpline" style="align-items:center"><b>${esc(g.l.name)}</b><button class="btn small" data-act="practicehard" data-id="${g.l.id}">Oefen deze (${g.hard.length})</button></div>
      <ul class="misslist">${g.hard.slice(0, 5).map(w => `<li><b>${esc(w.a)} → ${esc(w.b)}</b><span>${w.wrong}× fout van ${w.seen || w.wrong}</span></li>`).join("")}${g.hard.length > 5 ? `<li><b>…</b><span>nog ${g.hard.length - 5} woordjes</span></li>` : ""}</ul></div>`).join("");
  const stat = (big, label) => `<div class="stat"><b>${big}</b><span>${label}</span></div>`;
  return shell(`
    <button class="linkbtn backlink" data-act="home">← Alle lijsten</button>
    <div class="pagehead"><h1>Voortgang</h1><div class="pair">Level ${li.L} · ${esc(li.title)} · ${li.xp} XP</div></div>
    <section class="sticker panel">
      <h2>Laatste 14 dagen</h2>
      <div class="chart" role="img" aria-label="Aantal antwoorden per dag in de laatste 14 dagen">${chart}</div>
      <p class="hint">Aantal antwoorden per dag. Vandaag staat rechts, uitgelicht.</p>
    </section>
    <section class="sticker panel">
      <h2>In cijfers</h2>
      <div class="statgrid">
        ${stat(today.answered, `antwoorden vandaag · ${pc(today.correct, today.answered)}`)}
        ${stat(week.answered, `antwoorden in 7 dagen · ${pc(week.correct, week.answered)}`)}
        ${stat(currentStreak(), `dagen op rij · beste ${st.best}`)}
        ${stat(st.answered, `antwoorden totaal · ${pc(st.correct, st.answered)}`)}
        ${stat(`${mastered}/${all.length}`, "woorden beheerst")}
        ${stat(li.xp, `XP · level ${li.L}`)}
      </div>
    </section>
    <section class="sticker panel"><h2>Per lijst</h2>${lists || '<p class="hint">Nog geen lijsten.</p>'}</section>
    <section class="sticker panel">
      <h2>Lastige woorden</h2>
      ${hardGroups || '<p class="hint">Nog geen lastige woorden. Woorden die je twee keer of vaker fout hebt, komen hier te staan.</p>'}
    </section>`);
}

function render() {
  const y = window.scrollY;
  $app.innerHTML = view.name === "home" ? renderHome() : view.name === "list" ? renderList() : view.name === "progress" ? renderProgress() : view.name === "share" ? renderShare() : renderSession();
  const inp = document.getElementById("answer"); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  const nb = document.getElementById("nextbtn"); if (nb) nb.focus();
  const sh = document.getElementById("spellhide"); if (sh) sh.focus();
  if (view.name !== "session") window.scrollTo(0, y);
}

/* ---------- acties ---------- */
function chapterOf(l, wid) { return l.chapters.find(c => c.words.some(w => w.id === wid)); }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act, ch = t.dataset.ch;
  const l = view.id ? getList(view.id) : null;
  switch (act) {
    case "home": session = null; backupMsg = ""; pendingRestore = null; shareMsg = ""; shareUrl = ""; view = { name: "home" }; render(); break;
    case "progress": session = null; shareMsg = ""; view = { name: "progress" }; render(); window.scrollTo(0, 0); break;
    case "open": session = null; shareMsg = ""; shareUrl = ""; view = { name: "list", id: t.dataset.id || view.id, prefs: view.prefs, open: null }; render(); window.scrollTo(0, 0); break;
    case "look": state.settings.look = state.settings.look === "geel" ? "teal" : "geel"; applyLook(); save(); render(); break;
    case "sound": state.settings.sound = !state.settings.sound; save(); render(); break;
    case "export": exportBackup(); render(); break;
    case "restore": document.getElementById("restore").click(); break;
    case "cancelrestore": pendingRestore = null; backupMsg = ""; render(); break;
    case "dorestore": if (pendingRestore) { state = pendingRestore; pendingRestore = null; save(); backupMsg = "Back-up teruggezet."; view = { name: "home" }; render(); } break;
    case "toggle": view.open = view.open === ch ? null : ch; view.confirm = null; render(); break;
    case "start": startSession(poolItems(l, prefsFor(l)), l.id); break;
    case "startch": { const p = prefsFor(l); p.sel = [ch]; startSession(poolItems(l, p), l.id); break; }
    case "stop": view = { name: "list", id: session.listId, prefs: view.prefs, open: view.open }; session = null; render(); break;
    case "delword": { const c = chapterOf(l, t.dataset.w); c.words = c.words.filter(w => w.id !== t.dataset.w); save(); render(); break; }
    case "import": {
      const c = l.chapters.find(x => x.id === view.open); if (!c) break;
      pasted().forEach(p => c.words.push({ id: uid(), a: p[0], b: p[1], box: 0 }));
      l.example = false; draft.paste = ""; save(); render(); break;
    }
    case "swapch": { const c = l.chapters.find(x => x.id === ch); c.words.forEach(w => { const a = w.a; w.a = w.b; w.b = a; }); save(); render(); break; }
    case "askdelch": view.confirm = ch; render(); break;
    case "askdellist": view.confirm = "list"; render(); break;
    case "cancelconf": view.confirm = null; render(); break;
    case "delch": l.chapters = l.chapters.filter(c => c.id !== ch); view.open = null; view.confirm = null; save(); render(); break;
    case "dellist": state.lists = state.lists.filter(x => x.id !== l.id); save(); view = { name: "home" }; render(); break;
    case "flip": session.flipped = !session.flipped; render(); break;
    case "cardright": session.fb = apply(session.queue[session.idx], "ok", 8); advance(); break;
    case "cardwrong": session.fb = apply(session.queue[session.idx], "bad", 0); advance(); break;
    case "next": advance(); break;
    case "skip": session.answer = ""; session.picked = -1; session.fb = apply(session.queue[session.idx], "bad", 0); render(); break;
    case "choose": choose(+t.dataset.i); break;
    case "hint": {
      const s = session, it = s.queue[s.idx]; if (s.fb || s.kind !== "type") break;
      const inp = document.getElementById("answer"); if (inp) s.answer = inp.value;
      if ((s.free || 0) + s.hints < letterCount(it.a) - 1) { s.hints++; render(); }
      break;
    }
    case "spellhide": session.spellShown = false; render(); break;
    case "spelllook": { const s = session, inp = document.getElementById("answer"); if (inp) s.answer = inp.value; s.hints++; s.spellShown = true; render(); break; }
    case "practicehard": {
      const l2 = getList(t.dataset.id); if (!l2) break;
      const p = prefsFor(l2); session = null;
      startSession(itemsForWords(l2, hardWords(l2), p), l2.id, p.mode === "learn" ? "type" : undefined); break;
    }
    case "sharelink": shareLink(l); break;
    case "sharesave": shareSave(l); render(); break;
    case "sharepaste": {
      const v = (document.getElementById("sharein").value || "").trim();
      if (!v) { shareMsg = "Plak eerst een link of code."; render(); break; }
      const m = v.match(/deel=([^\s&]+)/); receiveShare(m ? m[1] : v).then(render); break;
    }
    case "sharefile": document.getElementById("sharefileinput").click(); break;
    case "shareadd": {
      const p = pendingShare; if (!p) break;
      let name = p.name, n = 2; while (state.lists.some(x => x.name === name)) name = p.name + " (" + n++ + ")";
      const nl = { id: uid(), name, langA: p.langA, langB: p.langB, chapters: p.chapters.map(c => ({ id: uid(), name: c.n, words: c.w.map(([a, b]) => ({ id: uid(), a, b, box: 0 })) })) };
      state.lists.push(nl); save(); pendingShare = null; shareMsg = "";
      view = { name: "list", id: nl.id, open: null }; render(); window.scrollTo(0, 0); break;
    }
    case "sharecancel": pendingShare = null; shareMsg = ""; view = { name: "home" }; render(); break;
    case "override": {
      const s = session, it = s.queue[s.idx], f = s.fb;
      it.w.box = f.prevBox; s.combo = f.prevCombo; state.stats.xp -= f.gain; s.xp -= f.gain; state.stats.answered--; undoLog(it, f);
      s.fb = apply(it, "near", 10); render(); break;
    }
    case "retry": { const q = session.missed.slice(); startSession(q, session.listId); break; }
    case "again": { const l2 = getList(session.listId); startSession(poolItems(l2, prefsFor(l2)), l2.id); break; }
  }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, l = view.id ? getList(view.id) : null;
  if (f.id === "newlist") {
    const name = document.getElementById("nl-name").value.trim(), a = document.getElementById("nl-a").value.trim(), b = document.getElementById("nl-b").value.trim();
    if (!name || !a || !b) return;
    const nl = { id: uid(), name, langA: a, langB: b, chapters: [{ id: uid(), name: "Hoofdstuk 1", words: [] }] };
    state.lists.push(nl); save(); draft.name = ""; draft.langB = "";
    view = { name: "list", id: nl.id, open: nl.chapters[0].id }; render(); window.scrollTo(0, 0);
  } else if (f.id === "newch") {
    const name = document.getElementById("ch-name").value.trim() || ("Hoofdstuk " + (l.chapters.length + 1));
    const c = { id: uid(), name, words: [] }; l.chapters.push(c);
    if (view.prefs && view.prefs.sel) view.prefs.sel.push(c.id);
    draft.chName = ""; view.open = c.id; save(); render();
  } else if (f.id === "addword") {
    const c = l.chapters.find(x => x.id === view.open); const a = document.getElementById("aw-a"), b = document.getElementById("aw-b");
    if (!c || !a.value.trim() || !b.value.trim()) return;
    c.words.push({ id: uid(), a: a.value.trim(), b: b.value.trim(), box: 0 }); l.example = false; save(); render();
    const na = document.getElementById("aw-a"); if (na) na.focus();
  } else if (f.id === "answerform") {
    const it = session.queue[session.idx]; const val = document.getElementById("answer").value;
    session.answer = val;
    session.fb = apply(it, check(val, it.a, session.kind === "spell" ? true : state.settings.strict), 10); render();
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "paste") { draft.paste = t.value; const b = document.getElementById("pastebox"); if (b) b.innerHTML = pasteBox(); }
  else if (t.id === "nl-name") draft.name = t.value;
  else if (t.id === "nl-a") draft.langA = t.value;
  else if (t.id === "nl-b") draft.langB = t.value;
  else if (t.id === "ch-name") draft.chName = t.value;
  else if (t.dataset && t.dataset.edit) {
    const l = getList(view.id), row = t.closest("[data-w]"); const w = listWords(l).find(x => x.id === row.dataset.w);
    if (w) { w[t.dataset.edit] = t.value; save(); }
  } else if (t.id === "ln" || t.id === "la" || t.id === "lb") {
    const l = getList(view.id); if (t.id === "ln") l.name = t.value; else if (t.id === "la") l.langA = t.value; else l.langB = t.value; save();
  } else if (t.id === "cn") {
    const c = getList(view.id).chapters.find(x => x.id === view.open); if (c) { c.name = t.value; save(); }
  }
});
document.addEventListener("change", e => {
  const t = e.target, l = view.id ? getList(view.id) : null;
  if (t.name === "dir" || t.name === "mode") { prefsFor(l)[t.name] = t.value; save(); render(); }
  else if (t.id === "sharefileinput") { if (t.files && t.files[0]) readShareFile(t.files[0]); t.value = ""; }
  else if (t.id === "restore") { if (t.files && t.files[0]) readBackupFile(t.files[0]); t.value = ""; }
  else if (t.id === "strict") { state.settings.strict = t.checked; save(); }
  else if (t.id === "pswap") { draft.swap = t.checked; const b = document.getElementById("pastebox"); if (b) b.innerHTML = pasteBox(); }
  else if (t.id === "weak") { prefsFor(l).weak = t.checked; save(); render(); }
  else if (t.dataset && t.dataset.sel) {
    const p = prefsFor(l); p.sel = t.checked ? [...new Set([...p.sel, t.dataset.sel])] : p.sel.filter(id => id !== t.dataset.sel); save(); render();
  } else if (t.id === "ln" || t.id === "la" || t.id === "lb" || t.id === "cn") render();
});
document.addEventListener("keydown", e => {
  if (!session || view.name !== "session") return;
  const s = session;
  if (s.kind === "choice" && !s.fb && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); choose(+e.key - 1); return; }
  if (s.kind !== "cards") return;
  if (e.target.matches("input, textarea")) return;
  if ((e.key === " " || e.key === "Enter") && !e.target.closest("button")) { e.preventDefault(); s.flipped = !s.flipped; render(); }
  else if (s.flipped && e.key === "ArrowRight") { s.fb = apply(s.queue[s.idx], "ok", 8); advance(); }
  else if (s.flipped && e.key === "ArrowLeft") { s.fb = apply(s.queue[s.idx], "bad", 0); advance(); }
});

render();
handleHash();
window.addEventListener("hashchange", handleHash);
