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
import { WIN_TIERS, EXTRA_TIMING, SCATTER, FREE_SPINS } from "./slotExtras";

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
function genLoss(opts = {}) {
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
    if (!opts.noOrbs && Math.random() < LOSS_BOARD.orbChance) {
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

// ---------- Scatter & bola pengali sebagai sel khusus ----------
const countKind = (board, kind) =>
  board.reduce((a, col) => a + col.filter((c) => c.kind === kind).length, 0);

/**
 * Ubah beberapa simbol biasa di papan AKHIR menjadi scatter / bola pengali.
 * Hanya sel yang tidak pernah ikut kemenangan yang dipilih, dan sel diubah di
 * tempat (objek yang sama dipakai semua papan), jadi urutan tumble tetap konsisten.
 */
function convertCells(res, specs) {
  if (!specs.length) return;
  const pool = shuffle(
    res.final.flatMap((col) => col.filter((c) => c.kind === "sym")),
  );
  if (pool.length < specs.length) throw new Error("Papan terlalu penuh untuk scatter/bola.");
  specs.forEach((sp, i) => {
    const cell = pool[i];
    delete cell.id;
    if (sp.kind === "orb") {
      cell.kind = "orb";
      cell.value = sp.value;
    } else {
      cell.kind = "scatter";
    }
  });
}

// Scatter pajangan: tidak pernah cukup untuk memicu free spin.
function decorScatterCount(won) {
  const maxDecor = Math.max(0, FREE_SPINS.triggerCount - 1);
  if (won) {
    return Math.random() < SCATTER.decorChanceWin ? Math.min(maxDecor, 1 + rand(2)) : 0;
  }
  const lo = Math.max(1, FREE_SPINS.triggerCount - 2);
  return Math.random() < SCATTER.decorChanceLoss ? Math.min(maxDecor, lo + rand(2)) : 0;
}

/** Waktu animasi sebuah putaran (harus sama dengan urutan di SlotMachine.jsx). */
function durationOfPlan(p) {
  const t = timings;
  let ms = t.dropOutMs + t.dropInMs + t.endPauseMs;
  ms += p.steps.length * (t.highlightMs + t.popMs + t.refillMs);
  const orbPhase = p.fs ? p.orbs.length > 0 : p.payout > 0 && p.orbs.length > 0;
  if (orbPhase) {
    ms += p.orbs.length * t.orbEachMs + t.orbSettleMs;
    if (p.payout > 0) ms += t.slamMs;
  }
  if (!p.fs) {
    const tier = getWinTier(p.payout);
    if (tier) ms += tier.durationMs;
  }
  if (p.trigger) ms += t.scatterIntroMs;
  if (p.fs) {
    if (p.fs.retrigger) ms += t.fsRetriggerMs;
    if (p.fs.last) {
      ms += t.fsEndMs;
      const tier = getWinTier(p.fs.grandTotal);
      if (tier) ms += tier.durationMs;
    }
  }
  return ms;
}

function pack({ initial, res }) {
  const scatters = countKind(res.final, "scatter");
  const plan = {
    id: planCounter++,
    kind: "full",
    initial,
    steps: res.steps,
    final: res.final,
    orbs: res.orbs,
    tumbleTotal: res.tumbleTotal,
    multiplier: res.multiplier,
    payout: res.payout, // dalam kelipatan taruhan (mis. 1.5 = 1.5x taruhan)
    scatters,
    trigger: scatters >= FREE_SPINS.triggerCount, // memicu free spin?
    fs: null,
  };
  plan.durationMs = durationOfPlan(plan);
  return plan;
}

/**
 * Susun hasil satu putaran.
 * @param {{win:boolean, target?:number, scatters?:number}} opts
 *   win      : keputusan bandar (true = menang)
 *   target   : kelipatan taruhan yang diinginkan; engine memilih papan
 *              dengan pembayaran paling dekat dari tabel di slotConfig.js
 *   scatters : paksa jumlah scatter di papan (>= triggerCount memicu free spin).
 *              Kosongkan untuk scatter pajangan acak.
 * @returns hasil dengan `payout` (kelipatan taruhan) yang nilainya PASTI
 *          sama dengan yang tergambar di papan. `trigger` = true bila memicu free spin.
 */
export function buildSpinResult({ win, target = 1.5, scatters } = {}) {
  let out = null;
  if (win) {
    const near = nearCandidates(target);
    for (let i = 0; i < 120 && !out; i++) out = genWin(pickRecipe(near));
    if (!out) console.warn("[slotEngine] gagal menyusun papan menang, memakai papan kalah.");
  }
  if (!out) out = genLoss();
  const n = scatters != null ? scatters : decorScatterCount(out.res.payout > 0);
  convertCells(out.res, Array.from({ length: n }, () => ({ kind: "scatter" })));
  return pack(out);
}

/** Pilih jumlah scatter saat free spin dipicu (mis. 4, 5, atau 6). */
export function pickTriggerScatters(rng = Math.random) {
  const entries = Object.entries(FREE_SPINS.triggerWeights).map(([k, w]) => [Number(k), w]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) if ((r -= w) < 0) return Math.max(k, FREE_SPINS.triggerCount);
  return FREE_SPINS.triggerCount;
}

// ---------- FREE SPIN ----------
// Nilai bola pengali di dalam free spin (bobot sendiri di FREE_SPINS.orbWeights).
function pickFsOrb(rng) {
  const entries = Object.entries(FREE_SPINS.orbWeights).map(([v, w]) => [Number(v), w]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) if ((r -= w) < 0) return v;
  return entries[0][0];
}

// Satu free spin: bola pengali yang muncul DITAMBAHKAN ke pengali total (M),
// walau putaran itu tidak menang. Kemenangan dikali max(1, M).
function buildFsSpin({ won, target, orbValues, scatters, M0 }) {
  let out = null;
  if (won) {
    const base = nearCandidates(target).filter((c) => c.cat !== "orb");
    const pool = base.length ? base : CANDIDATES.filter((c) => c.cat !== "orb");
    for (let i = 0; i < 120 && !out; i++) out = genWin(pickRecipe(pool));
  }
  if (!out) out = genLoss({ noOrbs: true });
  const specs = [
    ...orbValues.map((value) => ({ kind: "orb", value })),
    ...Array.from({ length: scatters }, () => ({ kind: "scatter" })),
  ];
  convertCells(out.res, specs);

  const orbs = [];
  out.res.final.forEach((col) =>
    col.forEach((c) => {
      if (c.kind === "orb") orbs.push({ uid: c.uid, value: c.value });
    }),
  );
  const orbSum = orbs.reduce((a, o) => a + o.value, 0);
  const M1 = M0 + orbSum;
  const tumbleTotal = out.res.tumbleTotal;
  const applied = tumbleTotal > 0 ? Math.max(1, M1) : 1;
  const res = {
    ...out.res,
    orbs,
    multiplier: applied,
    payout: tumbleTotal * applied,
  };
  const plan = pack({ initial: out.initial, res });
  plan.trigger = false; // di dalam free spin, scatter hanya menambah putaran (retrigger)
  return { plan, M1 };
}

/**
 * Susun SATU ronde free spin lengkap (semua putarannya sudah ditentukan di sini).
 * @param {{basePayout?:number, rng?:()=>number}} opts basePayout = kemenangan putaran pemicunya
 * @returns {{spins:Array, total:number, grandTotal:number, finalMult:number}}
 *   total = jumlah menang free spin (× taruhan), grandTotal = total + basePayout.
 *   Tiap elemen `spins` bisa langsung dimainkan oleh SlotMachine.
 */
export function buildFreeSpinRound({ basePayout = 0, rng = Math.random } = {}) {
  const F = FREE_SPINS;
  const chance = (pct) => rng() * 100 < pct;
  let left = F.spins;
  let total = F.spins; // jumlah putaran yang sudah dijanjikan (termasuk retrigger)
  let idx = 0;
  let M = 0;
  let win = 0;
  const spins = [];

  while (left > 0 && idx < F.maxSpins) {
    left -= 1;
    idx += 1;
    const won = chance(F.winChancePercent);
    const target = F.baseTargets[Math.floor(rng() * F.baseTargets.length)];
    let k = 0;
    if (chance(F.orbChancePercent)) k = chance(F.doubleOrbChancePercent) ? 2 : 1;
    const orbValues = Array.from({ length: k }, () => pickFsOrb(rng));

    let scatters = 0;
    let retrigger = 0;
    if (total < F.maxSpins && chance(F.retriggerChancePercent)) {
      scatters = F.retriggerCount + (rng() < 0.2 ? 1 : 0);
      retrigger = Math.min(F.retriggerSpins, F.maxSpins - total);
    } else if (chance(25)) {
      scatters = Math.max(0, Math.min(F.retriggerCount - 1, 1 + Math.floor(rng() * 2)));
    }
    if (retrigger) {
      left += retrigger;
      total += retrigger;
    }

    const { plan, M1 } = buildFsSpin({ won, target, orbValues, scatters, M0: M });
    plan.fs = {
      index: idx,
      total,
      multBefore: M,
      multAfter: M1,
      winBefore: win,
      retrigger,
      last: false,
      grandTotal: 0,
      baseWin: basePayout,
    };
    M = M1;
    win += plan.payout;
    spins.push(plan);
    if (win >= F.maxWinX) break; // batas kemenangan ronde
  }

  const grandTotal = basePayout + win;
  spins.forEach((p, i) => {
    p.fs.last = i === spins.length - 1;
    if (p.fs.last) p.fs.total = idx; // ronde berhenti lebih awal bila mencapai batas menang
    p.fs.grandTotal = grandTotal;
    p.fs.roundTotal = win;
    p.durationMs = durationOfPlan(p);
  });
  return { spins, total: win, grandTotal, finalMult: M };
}

// Versi cepat untuk Auto Spin: hanya papan akhir yang ditampilkan.
export function toQuickResult(result) {
  return { ...result, id: planCounter++, kind: "quick", durationMs: timings.autoSpinMs };
}

// Papan awal (tanpa kemenangan) untuk tampilan diam.
export function createIdleResult() {
  return pack(genLoss());
}