// =====================================================================
//  sound.js  —  pemutar suara dengan fade-out halus (ease-out).
//  Letakkan di: src/sound.js
//
//  Setiap suara berjalan di sebuah "channel" (spin, result, fx).
//  Memutar suara baru di channel yang sama akan menghaluskan yang lama dulu,
//  dan fadeOut() memaksa suara berhenti dengan volume turun halus.
// =====================================================================
import { SOUND, WIN_TIERS } from "./slotExtras";

const channels = new Map(); // nama channel -> { audio }
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function hardStop(audio) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  } catch {
    /* abaikan */
  }
}

/** Hentikan suara di sebuah channel dengan fade-out ease-out. */
function fadeOut(channel, ms = SOUND.spinFadeMs) {
  const entry = channels.get(channel);
  if (!entry) return;
  channels.delete(channel);
  const { audio } = entry;
  if (ms <= 0 || audio.paused) {
    hardStop(audio);
    return;
  }
  const from = audio.volume;
  const t0 = performance.now();
  const timer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    // Ease-out: volume turun cepat di awal lalu melandai halus ke nol.
    audio.volume = clamp01(from * Math.pow(1 - k, 3));
    if (k >= 1) {
      clearInterval(timer);
      hardStop(audio);
    }
  }, 16);
}

function stopAll(ms = 300) {
  [...channels.keys()].forEach((c) => fadeOut(c, ms));
}

/** Putar file dari public/sounds/ di sebuah channel. */
function play(channel, file, { loop = false, volume = SOUND.volume } = {}) {
  if (!file) return null;
  fadeOut(channel, 120); // suara lama di channel yang sama dihaluskan dulu
  const audio = new Audio(`${SOUND.dir}${file}`);
  audio.volume = clamp01(volume);
  audio.loop = loop;
  channels.set(channel, { audio });
  const p = audio.play();
  if (p && p.catch) p.catch(() => {}); // diblokir browser sebelum ada interaksi
  return audio;
}

// ---------- Suara bawaan (dibuat otomatis, tanpa file) ----------
let ctx = null;
function getCtx() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ freq, to, dur, type = "sine", gain = 0.06, delay = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  const level = gain * (SOUND.volume / 0.5);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // melandai halus
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Suara tiap bola pengali menyambar. */
function multiplier() {
  if (SOUND.multiplier) return play("fx", SOUND.multiplier);
  tone({ freq: 1400, to: 90, dur: 0.38, type: "sawtooth", gain: 0.07 });
  tone({ freq: 70, to: 40, dur: 0.5, type: "sine", gain: 0.16 });
  return null;
}

/** Suara perayaan menang besar / jackpot. */
function celebrate(tier) {
  const file = tier.jackpot ? SOUND.jackpot : SOUND.bigWin;
  if (file) return play("fx", file);
  const level = Math.max(1, WIN_TIERS.indexOf(tier) + 1);
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  const n = Math.min(notes.length, 2 + level);
  for (let i = 0; i < n; i++) {
    tone({ freq: notes[i], dur: 0.55 + i * 0.05, type: "triangle", gain: 0.06, delay: i * 0.11 });
  }
  if (tier.jackpot) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f) =>
      tone({ freq: f, dur: 1.8, type: "triangle", gain: 0.05, delay: n * 0.11 }),
    );
  }
  return null;
}

const Sound = { play, fadeOut, stopAll, multiplier, celebrate };
export default Sound;
