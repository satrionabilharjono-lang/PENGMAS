// =====================================================================
//  slotEngine.js  —  menyusun papan 6x5 yang HASILNYA sesuai keputusan
//  bandar di App.jsx (menang / kalah + target kelipatan).
//  Letakkan di: src/slotEngine.js
//  File ini tidak perlu diedit. Ubah angka di slotConfig.js saja.
// =====================================================================
import {
  GRID,
  MIN_CLUSTER,
  SYMBOLS,
  MULTIPLIERS,
  LOSS_BOARD,
  WIN_STYLE,
  TIMING,
} from "./slotConfig";
import { WIN_TIERS, EXTRA_TIMING } from "./slotExtras";

const COLS = GRID.cols;
const ROWS = GRID.rows;
const CELLS = COLS * ROWS;
const CAP = MIN_CLUSTER - 1; // batas simbol sama supaya belum dihitung menang
const IDS = SYMBOLS.map((s) => s.id);

// ---------- Waktu animasi (dipakai juga oleh SlotMachine.jsx) ----------
export const timings = {
  ...TIMING,
  ...EXTRA_TIMING,
  dropInMs:
    TIMING.fallMs + (COLS - 1) * TIMING.colStaggerMs + (ROWS - 1) * TIMING.rowStaggerMs + 100,
  refillMs: TIMING.fallMs + (ROWS - 1) * TIMING.rowStaggerMs + 100,
};

// ---------- Utilitas kecil ----------
let uidCounter = 1;
let planCounter = 1;
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const makeSym = (id) => ({ uid: uidCounter++, kind: "sym", id });
const makeOrb = (value) => ({ uid: uidCounter++, kind: "orb", value });
const toBoard = (flat) =>
  Array.from({ length: COLS }, (_, c) => flat.slice(c * ROWS, c * ROWS + ROWS));
const tiersOf = (sym) => Object.keys(sym.pay).map(Number).sort((a, b) => a - b);

function pickOrbValue() {
  const total = MULTIPLIERS.reduce((a, m) => a + m.weight, 0);
  let r = Math.random() * total;
  for (const m of MULTIPLIERS) if ((r -= m.weight) < 0) return m.value;
  return MULTIPLIERS[0].value;
}

// ---------- Aturan permainan: menang di mana saja + tumble ----------
function payFor(sym, count) {
  let pay = 0;
  for (const t of tiersOf(sym)) if (count >= t) pay = sym.pay[t];
  return pay;
}

function findWins(board) {
  const groups = {};
  board.forEach((col) =>
    col.forEach((cell) => {
      if (cell.kind === "sym") (groups[cell.id] ||= []).push(cell.uid);
    }),
  );
  const wins = [];
  for (const s of SYMBOLS) {
    const uids = groups[s.id];
    if (uids && uids.length >= MIN_CLUSTER) {
      wins.push({ id: s.id, count: uids.length, uids, pay: payFor(s, uids.length) });
    }
  }
  return wins;
}

function simulate(initial, refill) {
  let board = initial.map((c) => c.slice());
  const steps = [];
  let tumbleTotal = 0;
  for (let i = 0; i < 20; i++) {
    const wins = findWins(board);
    if (!wins.length) break;
    const stepPay = wins.reduce((a, w) => a + w.pay, 0);
    tumbleTotal += stepPay;
    const removed = new Set(wins.flatMap((w) => w.uids));
    const keepBoard = board.map((col) => col.filter((x) => !removed.has(x.uid)));
    const after = keepBoard.map((col, c) => [
      ...refill(c, ROWS - col.length, i, keepBoard),
      ...col,
    ]);
    steps.push({ wins, removed: [...removed], stepPay, after });
    board = after;
  }
  const orbs = [];
  board.forEach((col) =>
    col.forEach((cell) => {
      if (cell.kind === "orb") orbs.push({ uid: cell.uid, value: cell.value });
    }),
  );
  const orbSum = orbs.reduce((a, o) => a + o.value, 0);
  const multiplier = tumbleTotal > 0 && orbSum > 0 ? orbSum : 1;
  return { steps, final: board, orbs, tumbleTotal, multiplier, payout: tumbleTotal * multiplier };
}

// Isi simbol baru yang jatuh dari atas. Tidak pernah membuat kemenangan
// tak sengaja, kecuali simbol yang memang direncanakan (forceId).
function makeRefill(stepPlans) {
  const queues = {};
  return (col, need, step, keepBoard) => {
    if (!queues[step]) {
      const counts = {};
      let slots = 0;
      keepBoard.forEach((c) => {
        slots += ROWS - c.length;
        c.forEach((x) => {
          if (x.kind === "sym") counts[x.id] = (counts[x.id] || 0) + 1;
        });
      });
      const plan = stepPlans[step] || {};
      const queue = [];
      if (plan.forceId) {
        for (let i = 0; i < plan.forceCount; i++) queue.push(plan.forceId);
        counts[plan.forceId] = (counts[plan.forceId] || 0) + plan.forceCount;
      }
      while (queue.length < slots) {
        const allowed = IDS.filter((id) => id !== plan.forceId && (counts[id] || 0) < CAP);
        if (!allowed.length) throw new Error("Simbol di slotConfig.js terlalu sedikit (minimal 6).");
        const id = pick(allowed);
        counts[id] = (counts[id] || 0) + 1;
        queue.push(id);
      }
      queues[step] = shuffle(queue);
    }
    return queues[step].splice(0, need).map(makeSym);
  };
}

// ---------- Papan KALAH ----------
function genLoss() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const slots = shuffle([...Array(CELLS).keys()]);
    const cells = new Array(CELLS);
    const counts = {};
    let p = 0;
    const put = (c) => {
      cells[slots[p++]] = c;
    };
    const nearMiss = Math.random() < LOSS_BOARD.nearMissChance;
    // tanpa "hampir menang": tidak ada simbol yang sampai 7 buah
    const fillCap = nearMiss || attempt > 40 ? CAP : CAP - 1;
    if (nearMiss) {
      const id = pick(IDS);
      for (let i = 0; i < CAP; i++) put(makeSym(id));
      counts[id] = CAP;
    }
    if (Math.random() < LOSS_BOARD.orbChance) {
      const n = 1 + rand(LOSS_BOARD.maxOrbs);
      for (let i = 0; i < n; i++) put(makeOrb(pickOrbValue()));
    }
    let ok = true;
    while (p < CELLS) {
      const allowed = IDS.filter((id) => (counts[id] || 0) < fillCap);
      if (!allowed.length) {
        ok = false;
        break;
      }
      const id = pick(allowed);
      counts[id] = (counts[id] || 0) + 1;
      put(makeSym(id));
    }
    if (!ok) continue;
    const board = toBoard(cells);
    const res = simulate(board, makeRefill([]));
    if (res.steps.length === 0) return { initial: board, res };
  }
  throw new Error("Gagal menyusun papan kalah. Cek jumlah simbol di slotConfig.js.");
}

// ---------- Papan MENANG ----------
function buildCandidates() {
  const singles = [];
  for (const s of SYMBOLS) {
    for (const t of tiersOf(s)) {
      singles.push({ id: s.id, count: t, pay: s.pay[t] });
    }
  }
  const out = singles.map((c) => ({ clusters: [c], orb: null, payout: c.pay, cat: "single" }));
  const orbValues = MULTIPLIERS.map((m) => m.value);
  singles.forEach((c) =>
    orbValues.forEach((v) =>
      out.push({ clusters: [c], orb: v, payout: c.pay * v, cat: "orb" }),
    ),
  );
  for (const a of singles) {
    for (const b of singles) {
      if (a.id !== b.id && a.count + b.count <= CELLS - 4) {
        out.push({ clusters: [a, b], orb: null, payout: a.pay + b.pay, cat: "chain" });
      }
    }
  }
  return out;
}
const CANDIDATES = buildCandidates();

function nearCandidates(target) {
  let best = Infinity;
  for (const c of CANDIDATES) best = Math.min(best, Math.abs(c.payout - target));
  const slack = Math.max(0.15, best * 0.5);
  return CANDIDATES.filter((c) => Math.abs(c.payout - target) <= best + slack);
}

function pickRecipe(near) {
  const cats = [...new Set(near.map((c) => c.cat))];
  const total = cats.reduce((a, c) => a + (WIN_STYLE[c] || 1), 0);
  let r = Math.random() * total;
  let chosen = cats[0];
  for (const c of cats) {
    if ((r -= WIN_STYLE[c] || 1) < 0) {
      chosen = c;
      break;
    }
  }
  return pick(near.filter((c) => c.cat === chosen));
}

function genWin(recipe) {
  const [c1, c2] = recipe.clusters;
  const slots = shuffle([...Array(CELLS).keys()]);
  const cells = new Array(CELLS);
  let p = 0;
  const put = (c) => {
    cells[slots[p++]] = c;
  };
  const counts = {};
  const stepPlans = [];

  for (let i = 0; i < c1.count; i++) put(makeSym(c1.id));

  if (c2) {
    // Kelompok kedua baru lengkap setelah simbol baru jatuh mengisi tempat kelompok pertama.
    const lo = Math.max(2, c2.count - CAP);
    const hi = Math.min(c1.count, lo + 2);
    if (lo > hi) return null;
    const need = lo + rand(hi - lo + 1);
    const initial = c2.count - need;
    if (initial < 0) return null;
    for (let i = 0; i < initial; i++) put(makeSym(c2.id));
    counts[c2.id] = initial;
    stepPlans[0] = { forceId: c2.id, forceCount: need };
  }
  if (recipe.orb) put(makeOrb(recipe.orb));

  const exclude = new Set([c1.id, c2 && c2.id]);
  const fillIds = IDS.filter((id) => !exclude.has(id));
  while (p < CELLS) {
    const allowed = fillIds.filter((id) => (counts[id] || 0) < CAP);
    if (!allowed.length) return null;
    const id = pick(allowed);
    counts[id] = (counts[id] || 0) + 1;
    put(makeSym(id));
  }

  const board = toBoard(cells);
  let res;
  try {
    res = simulate(board, makeRefill(stepPlans));
  } catch {
    return null;
  }
  if (res.steps.length !== recipe.clusters.length) return null;
  for (let i = 0; i < res.steps.length; i++) {
    const w = res.steps[i].wins;
    const want = recipe.clusters[i];
    if (w.length !== 1 || w[0].id !== want.id || w[0].count !== want.count) return null;
  }
  if (Math.abs(res.payout - recipe.payout) > 1e-9) return null;
  return { initial: board, res };
}

// ---------- Paket hasil untuk App.jsx dan SlotMachine.jsx ----------
/** Tingkat perayaan untuk kemenangan (kelipatan taruhan), atau null kalau kecil. */
export function getWinTier(payout) {
  let found = null;
  for (const t of WIN_TIERS) if (payout >= t.min) found = t;
  return found;
}

function durationOf(res) {
  const t = timings;
  let ms = t.dropOutMs + t.dropInMs + t.endPauseMs;
  ms += res.steps.length * (t.highlightMs + t.popMs + t.refillMs);
  if (res.payout > 0 && res.orbs.length) {
    ms += res.orbs.length * t.orbEachMs + t.slamMs + t.orbSettleMs;
  }
  const tier = getWinTier(res.payout);
  if (tier) ms += tier.durationMs;
  return ms;
}

function pack({ initial, res }) {
  return {
    id: planCounter++,
    kind: "full",
    initial,
    steps: res.steps,
    final: res.final,
    orbs: res.orbs,
    tumbleTotal: res.tumbleTotal,
    multiplier: res.multiplier,
    payout: res.payout, // dalam kelipatan taruhan (mis. 1.5 = 1.5x taruhan)
    durationMs: durationOf(res),
  };
}

/**
 * Susun hasil satu putaran.
 * @param {{win:boolean, target?:number}} opts
 *   win    : keputusan bandar (true = menang)
 *   target : kelipatan taruhan yang diinginkan; engine memilih papan
 *            dengan pembayaran paling dekat dari tabel di slotConfig.js
 * @returns hasil dengan `payout` (kelipatan taruhan) yang nilainya PASTI
 *          sama dengan yang tergambar di papan.
 */
export function buildSpinResult({ win, target = 1.5 }) {
  if (win) {
    const near = nearCandidates(target);
    for (let i = 0; i < 120; i++) {
      const out = genWin(pickRecipe(near));
      if (out) return pack(out);
    }
    console.warn("[slotEngine] gagal menyusun papan menang, memakai papan kalah.");
  }
  return pack(genLoss());
}

// Versi cepat untuk Auto Spin: hanya papan akhir yang ditampilkan.
export function toQuickResult(result) {
  return { ...result, id: planCounter++, kind: "quick", durationMs: timings.autoSpinMs };
}

// Papan awal (tanpa kemenangan) untuk tampilan diam.
export function createIdleResult() {
  return pack(genLoss());
}