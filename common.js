// Shared helpers for the guest and organizer pages.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const configured = !String(firebaseConfig.apiKey).includes("REPLACE_ME");
export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function randomString(n, alphabet = "abcdefghijkmnpqrstuvwxyz23456789") {
  const r = crypto.getRandomValues(new Uint8Array(n));
  return [...r].map(x => alphabet[x % alphabet.length]).join("");
}
export const newKey = () => randomString(20, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789");
export const newId = (n = 8) => randomString(n);
export const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "event";

export function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d + "T12:00:00");
  return isNaN(x) ? d : x.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

let toastTimer;
export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2800);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (_) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove(); return ok;
  }
}

/* Each guest's match is encrypted with their personal key, so only their link can open it. */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveKey(secret, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function seal(secret, obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(secret, salt), enc.encode(JSON.stringify(obj)));
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
export async function unseal(secret, box) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, await deriveKey(secret, unb64(box.salt)), unb64(box.ct));
  return JSON.parse(dec.decode(pt));
}

/* The draw: random, nobody gets themselves, "can't draw" pairs respected both ways. */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function drawNames(ids, exclusions = []) {
  const blocked = new Set();
  exclusions.forEach(([a, b]) => { blocked.add(a + ">" + b); blocked.add(b + ">" + a); });
  const ok = (g, r) => g !== r && !blocked.has(g + ">" + r);
  for (let attempt = 0; attempt < 200; attempt++) {
    const givers = shuffle([...ids]); const used = new Set(); const out = {}; let steps = 0;
    const bt = i => {
      if (++steps > 20000) return false;
      if (i === givers.length) return true;
      const g = givers[i];
      for (const r of shuffle(ids.filter(r => !used.has(r) && ok(g, r)))) {
        used.add(r); out[g] = r;
        if (bt(i + 1)) return true;
        used.delete(r); delete out[g];
      }
      return false;
    };
    if (bt(0)) return out;
  }
  return null;
}

export function itemsHtml(items, { editable = false } = {}) {
  if (!items || !items.length) return `<p class="note">No wishes added yet.</p>`;
  return `<div class="items">${items.map((it, i) => `<div class="item"><div>
      <div class="t">${esc(it.t)}</div>
      ${it.link ? `<a href="${esc(/^https?:\/\//i.test(it.link) ? it.link : "https://" + it.link)}" target="_blank" rel="noopener">${esc(it.link)}</a>` : ""}
      ${it.n ? `<div class="n">${esc(it.n)}</div>` : ""}
    </div>${editable ? `<button class="x" data-act="rmw" data-i="${i}" aria-label="Remove wish">×</button>` : ""}</div>`).join("")}</div>`;
}

export function notConfiguredHtml() {
  return `<div class="pane empty"><h2>Almost ready</h2><p>This site still needs its Firebase settings. Paste them into <code>firebase-config.js</code> and reload.</p></div>`;
}
