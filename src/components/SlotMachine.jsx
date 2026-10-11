// =====================================================================
//  SlotMachine.jsx  —  papan 6x5 gaya Zeus: simbol jatuh, tumble,
//  bola pengali dengan petir, perayaan jackpot / menang besar.
//  Letakkan di: src/components/SlotMachine.jsx
//
//  Props (sama seperti sebelumnya, PlayerTab tidak perlu diubah):
//    reels      : hasil dari slotEngine (App.jsx menaruhnya di state `reels`)
//    isSpinning : true selama animasi berjalan (juga di antara putaran auto spin)
//    spinCount, symbols : tidak dipakai (simbol dibaca dari slotConfig.js)
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimation, useReducedMotion } from "framer-motion";
import { GRID, SYMBOLS, MULTIPLIERS } from "../slotConfig";
import { timings as T, getWinTier } from "../slotEngine";
import Sound from "../sound";
import { onSkip } from "../slotSkip";
import { SCATTER, FREE_SPINS } from "../slotExtras";

const { cols: COLS, rows: ROWS } = GRID;
const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));
const ORB_BY_VALUE = Object.fromEntries(MULTIPLIERS.map((m) => [m.value, m]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flatten = (board) =>
  board.flatMap((col, c) => col.map((cell, r) => ({ ...cell, col: c, row: r })));
const fmtX = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));
const rupiah = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

// Jalur petir zig-zag dari atas papan ke sebuah sel (koordinat 0-100).
function boltPath(col, row) {
  const tx = ((col + 0.5) / COLS) * 100;
  const ty = ((row + 0.5) / ROWS) * 100;
  const sx = Math.min(95, Math.max(5, tx + (Math.random() - 0.5) * 30));
  const parts = 8;
  let d = `M ${sx.toFixed(1)} 0`;
  for (let i = 1; i < parts; i++) {
    const k = i / parts;
    const x = sx + (tx - sx) * k + (Math.random() - 0.5) * 12;
    d += ` L ${x.toFixed(1)} ${(ty * k).toFixed(1)}`;
  }
  return `${d} L ${tx.toFixed(1)} ${ty.toFixed(1)}`;
}

function OrbFace({ value }) {
  const cfg = ORB_BY_VALUE[value];
  if (cfg && cfg.img) {
    return (
      <div className="relative h-[86%] w-[86%]">
        <img src={cfg.img} alt="" draggable={false} className="h-full w-full object-contain" />
        <span className="absolute inset-0 grid place-items-center text-sm font-extrabold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,.9)] sm:text-xl">
          ×{value}
        </span>
      </div>
    );
  }
  return (
    <div className="grid h-[80%] w-[80%] place-items-center rounded-full border-2 border-cyan-100 bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-700 text-sm font-extrabold text-slate-900 shadow-[0_0_14px_rgba(125,211,252,.85)] sm:text-xl">
      ×{value}
    </div>
  );
}

// Scatter: gambar emas dengan cahaya (shadow light) dan sinar berputar di belakangnya.
function ScatterFace({ boost }) {
  const reduce = useReducedMotion();
  const [broken, setBroken] = useState(false);
  return (
    <div data-testid="scatter" className="relative flex h-full w-full items-center justify-center">
      {/* sinar emas berputar */}
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute"
          style={{
            width: "190%",
            height: "190%",
            background:
              "repeating-conic-gradient(from 0deg, rgba(253,224,71,.55) 0deg 7deg, transparent 7deg 28deg)",
            WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 60%)",
            maskImage: "radial-gradient(circle, #000 0%, transparent 60%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: boost ? 3.5 : 9, ease: "linear" }}
        />
      )}
      {/* cahaya emas berdenyut di belakang */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: "165%",
          height: "165%",
          background: `radial-gradient(circle, ${SCATTER.glow}f2 0%, ${SCATTER.glow}8c 34%, ${SCATTER.glow}33 52%, transparent 70%)`,
        }}
        animate={
          reduce
            ? {}
            : boost
              ? { scale: [1, 1.4, 1], opacity: [1, 0.85, 1] }
              : { scale: [0.88, 1.08, 0.88], opacity: [0.7, 1, 0.7] }
        }
        transition={{ repeat: Infinity, duration: boost ? 0.7 : 2.2, ease: "easeInOut" }}
      />
      {broken ? (
        <div className="relative grid h-[80%] w-[80%] place-items-center rounded-full border-2 border-amber-100 bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-600 text-2xl font-black text-amber-950 shadow-[0_0_18px_rgba(251,191,36,.9)]">
          ✦
        </div>
      ) : (
        <img
          src={SCATTER.img}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="pointer-events-none relative h-[94%] w-[94%] select-none rounded-lg object-contain"
          style={{
            filter:
              "drop-shadow(0 0 7px rgba(253,224,71,1)) drop-shadow(0 0 16px rgba(251,191,36,.85))",
          }}
        />
      )}
    </div>
  );
}

function Cell({ cell, hit, zap, boost, stagger }) {
  const delay =
    stagger === "initial"
      ? (cell.col * T.colStaggerMs + cell.row * T.rowStaggerMs) / 1000
      : (cell.row * T.rowStaggerMs) / 1000;
  return (
    <motion.div
      className="absolute left-0 top-0 flex w-full items-center justify-center"
      style={{ height: `${100 / ROWS}%`, zIndex: zap ? 20 : cell.kind === "scatter" ? 3 : 1 }}
      initial={{ y: `${(cell.row - ROWS - 1) * 100}%`, scale: 1, opacity: 1 }}
      animate={{
        y: `${cell.row * 100}%`,
        scale: zap ? [1, 1.7, 1.3] : hit ? [1, 1.14, 1] : boost ? [1, 1.28, 1] : 1,
        opacity: 1,
      }}
      exit={{
        scale: 1.7,
        opacity: 0,
        transition: { duration: T.popMs / 1000, ease: "easeOut" },
      }}
      transition={{
        y: { duration: T.fallMs / 1000, delay, ease: [0.3, 1.2, 0.55, 1] },
        scale: zap
          ? { duration: 0.55, ease: "easeOut" }
          : hit
            ? { duration: 0.5, repeat: Infinity }
            : boost
              ? { duration: 0.7, repeat: Infinity }
              : { duration: 0.2 },
        opacity: { duration: 0.01 },
      }}
    >
      <div
        className={`flex h-[92%] w-[92%] items-center justify-center rounded-xl transition-shadow ${
          zap
            ? "bg-cyan-200/20 shadow-[0_0_34px_rgba(125,211,252,1)] ring-2 ring-cyan-200"
            : hit
              ? "bg-amber-300/20 shadow-[0_0_18px_rgba(252,211,77,.9)] ring-2 ring-amber-300"
              : ""
        }`}
      >
        {cell.kind === "scatter" ? (
          <ScatterFace boost={boost} />
        ) : cell.kind === "orb" ? (
          <OrbFace value={cell.value} />
        ) : (
          <img
            src={SYMBOL_BY_ID[cell.id]?.img}
            alt=""
            draggable={false}
            className="pointer-events-none h-[88%] w-[88%] select-none rounded-lg object-contain"
          />
        )}
      </div>
    </motion.div>
  );
}

// Perayaan layar penuh: BIG WIN / MEGA WIN / SUPER WIN / JACKPOT.
function Celebration({ tier, payout, bet, onClose }) {
  const reduce = useReducedMotion();
  const amount = bet ? Math.round(payout * bet) : 0;
  const countMs = Math.max(1200, tier.durationMs - 1600);
  const [shown, setShown] = useState(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const coins = useMemo(
    () =>
      reduce
        ? []
        : Array.from({ length: tier.coins }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * (tier.durationMs / 1000) * 0.6,
            dur: 1.8 + Math.random() * 1.6,
            size: 18 + Math.random() * 24,
            rot: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
            drift: (Math.random() - 0.5) * 16,
          })),
    [tier, reduce],
  );

  // hitung naik dengan ease-out
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / countMs);
      setShown(Math.round(amount * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [amount, countMs]);

  useEffect(() => {
    const id = setTimeout(() => closeRef.current(), tier.durationMs);
    return () => clearTimeout(id);
  }, [tier]);

  return createPortal(
    <motion.div
      data-testid="celebration"
      className="fixed inset-0 z-[100] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={() => closeRef.current()}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* sinar berputar */}
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute h-[220vmax] w-[220vmax]"
          style={{
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            background:
              "repeating-conic-gradient(from 0deg, rgba(253,224,71,.24) 0deg 7deg, transparent 7deg 22deg)",
            WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 34%)",
            maskImage: "radial-gradient(circle, #000 0%, transparent 34%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
        />
      )}

      {/* kilat emas + gelombang kejut khusus jackpot */}
      {tier.jackpot && !reduce && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 bg-amber-200"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
          {[0, 0.5, 1].map((d) => (
            <motion.div
              key={d}
              className="pointer-events-none absolute h-40 w-40 rounded-full border-4 border-amber-300"
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 9, opacity: 0 }}
              transition={{ duration: 1.8, delay: d, ease: "easeOut", repeat: 2 }}
            />
          ))}
        </>
      )}

      {/* hujan koin */}
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="pointer-events-none absolute top-0 rounded-full"
          style={{
            left: `${c.x}%`,
            width: c.size,
            height: c.size,
            background: "radial-gradient(circle at 35% 30%, #fff7b0, #fbbf24 55%, #b45309)",
            border: "2px solid #fde68a",
            boxShadow: "inset 0 0 0 3px rgba(180,83,9,.45), 0 0 10px rgba(251,191,36,.6)",
          }}
          initial={{ y: "-12vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "112vh", x: `${c.drift}vw`, rotate: c.rot }}
          transition={{ delay: c.delay, duration: c.dur, ease: "easeIn" }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
        <motion.div
          initial={{ scale: 0.2, rotate: -8, opacity: 0 }}
          animate={{ scale: [0.2, 1.25, 1], rotate: [-8, 3, 0], opacity: 1 }}
          transition={{ duration: 0.7, times: [0, 0.6, 1], ease: "easeOut" }}
        >
          <motion.h2
            className="text-5xl font-black tracking-wider sm:text-7xl md:text-8xl"
            style={{
              backgroundImage: "linear-gradient(180deg,#fef9c3 0%,#fbbf24 45%,#ea580c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter:
                "drop-shadow(0 4px 0 #7c2d12) drop-shadow(0 0 28px rgba(251,191,36,.7))",
            }}
            animate={tier.jackpot && !reduce ? { scale: [1, 1.06, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            {tier.label}
          </motion.h2>
        </motion.div>

        {bet ? (
          <motion.div
            className="text-4xl font-black tabular-nums text-white drop-shadow-[0_0_18px_rgba(251,191,36,.8)] sm:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {rupiah(shown)}
          </motion.div>
        ) : null}

        <motion.div
          className="rounded-full border border-amber-300/60 bg-amber-300/10 px-5 py-1 text-xl font-extrabold text-amber-300 sm:text-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.35 }}
        >
          ×{fmtX(payout)} taruhan
        </motion.div>

        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/50">
          Ketuk untuk menutup
        </p>
      </div>
    </motion.div>,
    document.body,
  );
}

export default function SlotMachine({ reels, isSpinning }) {
  const [cells, setCells] = useState(() => flatten(reels.final));
  const [hit, setHit] = useState(() => new Set());
  const [zap, setZap] = useState(() => new Set());
  const [mult, setMult] = useState(reels.multiplier || 1);
  const [dropping, setDropping] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [stagger, setStagger] = useState("initial");
  const [popup, setPopup] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [bolt, setBolt] = useState(null);
  const [slam, setSlam] = useState(null);
  const [dim, setDim] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [fsHud, setFsHud] = useState(null); // { index, total, winX } selama free spin
  const [intro, setIntro] = useState(null); // layar "FREE SPIN!"
  const [retrig, setRetrig] = useState(null); // "+5 FREE SPIN"
  const [fsEnd, setFsEnd] = useState(null); // ringkasan akhir ronde
  const [scBoost, setScBoost] = useState(false); // scatter menyala lebih terang
  const reduce = useReducedMotion();
  const runRef = useRef(0);
  const counter = useRef(0);
  const celebrateResolve = useRef(null);
  const reelsRef = useRef(reels);
  const spinningRef = useRef(isSpinning);
  reelsRef.current = reels;
  spinningRef.current = isSpinning;
  const shake = useAnimation();

  const doShake = useCallback(
    (strong) =>
      shake.start({
        x: strong ? [0, -14, 14, -10, 10, -5, 0] : [0, -6, 6, -4, 4, 0],
        y: strong ? [0, 6, -6, 4, -4, 0, 0] : [0, 3, -3, 2, 0, 0],
        transition: { duration: strong ? 0.6 : 0.35 },
      }),
    [shake],
  );

  const closeCelebration = useCallback(() => {
    setCelebration(null);
    const resolve = celebrateResolve.current;
    celebrateResolve.current = null;
    if (resolve) resolve();
  }, []);

  const celebrate = (tier, payout, bet) =>
    new Promise((resolve) => {
      celebrateResolve.current = resolve;
      setCelebration({ tier, payout, bet, key: `${Date.now()}` });
    });

  async function runFull(plan, my) {
    const alive = () => runRef.current === my;
    if (plan.instant) {
      // Turbo / lewati: tanpa animasi, langsung papan akhir.
      showFinal();
      return;
    }
    const fs = plan.fs;
    setHit(new Set());
    setZap(new Set());
    setScBoost(false);
    setIntro(null);
    setRetrig(null);
    setFsEnd(null);
    setMult(fs ? fs.multBefore : 1);
    setFsHud(
      fs ? { index: fs.index, total: fs.total - (fs.retrigger || 0), winX: fs.winBefore } : null,
    );
    setPopup(null);
    setBolt(null);
    setSlam(null);
    setDim(false);
    setDropping(true);
    await sleep(T.dropOutMs);
    if (!alive()) return;
    setDropping(false);
    setStagger("initial");
    setBoardKey((k) => k + 1);
    setCells(flatten(plan.initial));
    await sleep(T.dropInMs);
    for (const step of plan.steps) {
      if (!alive()) return;
      setHit(new Set(step.removed));
      setPopup({ key: `${plan.id}-${step.stepPay}-${step.removed[0]}`, text: `+${fmtX(step.stepPay)}x` });
      await sleep(T.highlightMs);
      if (!alive()) return;
      setPopup(null);
      setHit(new Set());
      setStagger("tumble");
      setCells(flatten(step.after));
      await sleep(T.popMs + T.refillMs);
    }
    if (!alive()) return;

    // ---- bola pengali: petir menyambar satu per satu, lalu angka besar menghantam layar ----
    // (di free spin bola selalu menambah pengali total, walau putaran itu tidak menang)
    const orbPhase = fs ? plan.orbs.length > 0 : plan.payout > 0 && plan.orbs.length > 0;
    if (orbPhase) {
      const finalCells = flatten(plan.final);
      setDim(true);
      let acc = fs ? fs.multBefore : 0;
      for (const o of plan.orbs) {
        if (!alive()) return;
        const where = finalCells.find((c) => c.uid === o.uid);
        if (where) setBolt({ key: `${plan.id}-${o.uid}`, d: boltPath(where.col, where.row) });
        setZap((prev) => new Set(prev).add(o.uid));
        acc += o.value;
        setMult(acc);
        setFlashKey((k) => k + 1);
        Sound.multiplier();
        doShake(false);
        await sleep(T.orbEachMs);
      }
      if (!alive()) return;
      setBolt(null);
      if (plan.payout > 0) {
        setSlam({ key: `${plan.id}-slam`, value: plan.multiplier, base: plan.tumbleTotal, total: plan.payout });
        setFlashKey((k) => k + 1);
        Sound.multiplier();
        doShake(true);
        await sleep(T.slamMs);
        if (!alive()) return;
        setSlam(null);
      }
      setDim(false);
      await sleep(T.orbSettleMs);
    }
    if (fs) setFsHud((h) => h && { ...h, winX: fs.winBefore + plan.payout });

    // ---- menang besar / jackpot (free spin merayakan TOTAL ronde di akhir, bukan tiap putaran) ----
    if (!fs) {
      const tier = getWinTier(plan.payout);
      if (tier) {
        if (!alive()) return;
        Sound.celebrate(tier);
        doShake(true);
        const t0 = performance.now();
        await celebrate(tier, plan.payout, plan.bet);
        const rest = tier.durationMs - (performance.now() - t0);
        if (rest > 0) await sleep(rest); // tetap selaras dengan durasi yang dihitung engine
      }
    }

    // ---- scatter cukup: layar FREE SPIN ----
    if (plan.trigger) {
      if (!alive()) return;
      setScBoost(true);
      Sound.scatter();
      doShake(true);
      setIntro({ key: `${plan.id}-intro`, count: plan.scatters });
      await sleep(T.scatterIntroMs);
      if (!alive()) return;
      setIntro(null);
      setScBoost(false);
    }

    // ---- retrigger di dalam free spin ----
    if (fs && fs.retrigger) {
      if (!alive()) return;
      setScBoost(true);
      Sound.retrigger();
      setRetrig({ key: `${plan.id}-retrig`, n: fs.retrigger });
      setFsHud((h) => h && { ...h, total: fs.total });
      await sleep(T.fsRetriggerMs);
      if (!alive()) return;
      setRetrig(null);
      setScBoost(false);
    }

    // ---- akhir ronde free spin ----
    if (fs && fs.last) {
      if (!alive()) return;
      setFsEnd({ key: `${plan.id}-end`, total: fs.roundTotal, mult: fs.multAfter, spins: fs.index, bet: plan.bet });
      await sleep(T.fsEndMs);
      if (!alive()) return;
      setFsEnd(null);
      const tier = getWinTier(fs.grandTotal);
      if (tier) {
        Sound.celebrate(tier);
        doShake(true);
        const t0 = performance.now();
        await celebrate(tier, fs.grandTotal, plan.bet);
        const rest = tier.durationMs - (performance.now() - t0);
        if (rest > 0) await sleep(rest);
      }
      setFsHud(null);
    }
    await sleep(T.endPauseMs);
  }

  // Tampilkan papan akhir apa adanya (dipakai saat putaran selesai, reset, dan SKIP).
  const showFinal = useCallback(() => {
    const r = reelsRef.current;
    setHit(new Set());
    setZap(new Set());
    setPopup(null);
    setBolt(null);
    setSlam(null);
    setDim(false);
    setDropping(false);
    setIntro(null);
    setRetrig(null);
    setFsEnd(null);
    setFsHud(null);
    setScBoost(false);
    closeCelebration();
    setCells(flatten(r.final));
    setMult(r.fs ? r.fs.multAfter : r.multiplier || 1);
  }, [closeCelebration]);

  useEffect(() => {
    if (!isSpinning) {
      runRef.current = 0;
      const timeoutId = setTimeout(showFinal, 0);
      return () => clearTimeout(timeoutId);
    }

    const my = ++counter.current;
    runRef.current = my;
    runFull(reels, my);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, reels]);

  // SKIP: hentikan animasi yang sedang berjalan dan langsung tampilkan hasil akhir.
  useEffect(
    () =>
      onSkip(() => {
        if (!spinningRef.current) return;
        runRef.current = 0; // membatalkan runFull yang sedang jalan
        shake.stop();
        shake.set({ x: 0, y: 0 });
        showFinal();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showFinal],
  );

  return (
    <>
      <motion.div
        animate={shake}
        className={`my-3 w-full max-w-5xl rounded-2xl border-4 bg-slate-950 p-3 shadow-inner transition-colors sm:p-6 ${
          fsHud
            ? "border-amber-300/80 shadow-[0_0_34px_rgba(251,191,36,.45)]"
            : "border-amber-500/30"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          {fsHud ? (
            <div data-testid="fs-hud" className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 text-xs font-black tracking-wider text-amber-950 shadow-[0_0_14px_rgba(251,191,36,.8)] sm:text-sm">
                FREE SPIN {fsHud.index}/{fsHud.total}
              </span>
              <motion.span
                key={fsHud.winX}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="truncate text-xs font-bold tabular-nums text-amber-200 sm:text-sm"
              >
                TOTAL {rupiah(fsHud.winX * (reels.bet || 0))}
              </motion.span>
            </div>
          ) : (
            <p className="text-[11px] uppercase tracking-widest text-slate-400">
              Menang di mana saja · {GRID.cols}×{GRID.rows}
            </p>
          )}
          <motion.div
            key={mult}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className={`rounded-full border px-3 py-1 text-sm font-bold tabular-nums ${
              mult > 1 || (fsHud && mult > 0)
                ? "border-cyan-200 bg-cyan-300/25 text-cyan-100 shadow-[0_0_16px_rgba(103,232,249,.8)]"
                : "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
            }`}
          >
            {fsHud && mult <= 0 ? "PENGALI —" : `PENGALI ×${mult}`}
          </motion.div>
        </div>

        <div
          data-testid="board"
          className="relative w-full overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-900 shadow-md"
          style={{ aspectRatio: `${COLS} / ${ROWS}` }}
        >
          {/* garis kisi tipis */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(148,163,184,.25) 1px, transparent 1px), linear-gradient(0deg, rgba(148,163,184,.25) 1px, transparent 1px)",
              backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            }}
          />

          {/* satu "lajur" per kolom; seluruh lajur meluncur turun di awal putaran */}
          {Array.from({ length: COLS }, (_, c) => (
            <motion.div
              key={`${boardKey}-${c}`}
              className="absolute top-0 h-full"
              style={{
                left: `${(c * 100) / COLS}%`,
                width: `${100 / COLS}%`,
                zIndex: cells.some((x) => x.col === c && x.kind === "scatter") ? 3 : 1,
              }}
              initial={{ y: "0%" }}
              animate={{ y: dropping ? "108%" : "0%" }}
              transition={{
                duration: Math.max(0.15, (T.dropOutMs - (COLS - 1) * 30) / 1000),
                delay: c * 0.03,
                ease: "easeIn",
              }}
            >
              <AnimatePresence>
                {cells
                  .filter((cell) => cell.col === c)
                  .map((cell) => (
                    <Cell
                      key={cell.uid}
                      cell={cell}
                      hit={hit.has(cell.uid)}
                      zap={zap.has(cell.uid)}
                      boost={scBoost && cell.kind === "scatter"}
                      stagger={stagger}
                    />
                  ))}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* papan digelapkan saat pengali beraksi */}
          <AnimatePresence>
            {dim && (
              <motion.div
                key="dim"
                className="pointer-events-none absolute inset-0 z-[5] bg-slate-950/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

          {/* petir menyambar bola pengali */}
          {bolt && (
            <svg
              key={bolt.key}
              data-testid="bolt"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <motion.g
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 1, 0.25, 1, 0] }}
                transition={{ duration: 0.55 }}
              >
                <motion.path
                  d={bolt.d}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "blur(5px)", opacity: 0.6 }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.18 }}
                />
                <motion.path
                  d={bolt.d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.18 }}
                />
              </motion.g>
            </svg>
          )}

          {/* kilat saat bola pengali aktif */}
          {flashKey > 0 && (
            <motion.div
              key={flashKey}
              className="pointer-events-none absolute inset-0 z-10 bg-cyan-100"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* nilai kemenangan tiap tumble */}
          <AnimatePresence>
            {popup && (
              <motion.div
                key={popup.key}
                className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="rounded-xl bg-slate-950/80 px-5 py-2 text-3xl font-extrabold text-amber-300 shadow-lg sm:text-5xl">
                  {popup.text}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* lapisan emas lembut selama free spin */}
          {fsHud && (
            <div
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(251,191,36,.22), transparent 60%), radial-gradient(circle at 50% 100%, rgba(251,191,36,.16), transparent 55%)",
              }}
            />
          )}

          {/* layar FREE SPIN setelah scatter muncul */}
          <AnimatePresence>
            {intro && (
              <motion.div
                key={intro.key}
                data-testid="fs-intro"
                className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-slate-950/75" />
                {!reduce && (
                  <motion.div
                    className="absolute h-[260%] w-[260%]"
                    style={{
                      background:
                        "repeating-conic-gradient(from 0deg, rgba(253,224,71,.32) 0deg 8deg, transparent 8deg 24deg)",
                      WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 38%)",
                      maskImage: "radial-gradient(circle, #000 0%, transparent 38%)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                  />
                )}
                {!reduce && (
                  <motion.div
                    className="absolute inset-0 bg-amber-200"
                    initial={{ opacity: 0.85 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  />
                )}
                {!reduce &&
                  [0, 0.45, 0.9].map((d) => (
                    <motion.div
                      key={d}
                      className="absolute h-24 w-24 rounded-full border-4 border-amber-300"
                      initial={{ scale: 0, opacity: 0.9 }}
                      animate={{ scale: 11, opacity: 0 }}
                      transition={{ duration: 1.6, delay: d, ease: "easeOut", repeat: 1 }}
                    />
                  ))}
                <motion.div
                  className="relative text-center"
                  initial={{ scale: 0.2, rotate: -8, opacity: 0 }}
                  animate={{ scale: [0.2, 1.2, 1], rotate: [-8, 3, 0], opacity: 1 }}
                  transition={{ duration: 0.8, times: [0, 0.6, 1], ease: "easeOut" }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.45em] text-amber-200 sm:text-sm">
                    {intro.count} scatter
                  </div>
                  <div
                    className="text-5xl font-black leading-none tracking-wider sm:text-7xl md:text-8xl"
                    style={{
                      backgroundImage: "linear-gradient(180deg,#fef9c3 0%,#fbbf24 45%,#ea580c 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      filter: "drop-shadow(0 4px 0 #7c2d12) drop-shadow(0 0 28px rgba(251,191,36,.8))",
                    }}
                  >
                    FREE SPIN
                  </div>
                  <div className="mt-2 text-xl font-extrabold text-white drop-shadow-[0_0_14px_rgba(251,191,36,.9)] sm:text-4xl">
                    {FREE_SPINS.spins} putaran gratis
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-amber-200/90 sm:text-sm">
                    Pengali terus bertambah sepanjang free spin
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* retrigger: putaran bertambah */}
          <AnimatePresence>
            {retrig && (
              <motion.div
                key={retrig.key}
                data-testid="fs-retrigger"
                className="pointer-events-none absolute inset-x-0 top-[18%] z-[35] grid place-items-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: [0.5, 1.25, 1] }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.45 }}
              >
                <span
                  className="rounded-2xl border-2 border-amber-200 bg-slate-950/85 px-6 py-2 text-3xl font-black text-amber-300 sm:text-5xl"
                  style={{ boxShadow: "0 0 30px rgba(251,191,36,.8)" }}
                >
                  +{retrig.n} FREE SPIN
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ringkasan akhir ronde free spin */}
          <AnimatePresence>
            {fsEnd && (
              <motion.div
                key={fsEnd.key}
                data-testid="fs-end"
                className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-slate-950/80" />
                <motion.div
                  className="relative text-center"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [0.4, 1.1, 1], opacity: 1 }}
                  transition={{ duration: 0.6, times: [0, 0.65, 1] }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-200 sm:text-sm">
                    Free spin selesai · {fsEnd.spins} putaran
                  </div>
                  <div
                    className="mt-1 text-4xl font-black tabular-nums sm:text-6xl"
                    style={{
                      backgroundImage: "linear-gradient(180deg,#fef9c3 0%,#fbbf24 55%,#ea580c 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      filter: "drop-shadow(0 3px 0 #7c2d12) drop-shadow(0 0 22px rgba(251,191,36,.8))",
                    }}
                  >
                    {rupiah(fsEnd.total * (fsEnd.bet || 0))}
                  </div>
                  <div className="mt-1 text-base font-extrabold text-cyan-200 sm:text-2xl">
                    pengali akhir ×{fmtX(fsEnd.mult)}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* angka pengali besar menghantam layar */}
          <AnimatePresence>
            {slam && (
              <motion.div
                key={slam.key}
                data-testid="slam"
                className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="absolute h-32 w-32 rounded-full border-4 border-cyan-200"
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: 8, opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <motion.div
                  className="relative text-center"
                  initial={{ scale: 3.2, rotate: -10, opacity: 0 }}
                  animate={{ scale: [3.2, 0.9, 1], rotate: [-10, 2, 0], opacity: 1 }}
                  transition={{ duration: 0.6, times: [0, 0.65, 1], ease: "easeOut" }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-200 sm:text-xs">
                    Pengali
                  </div>
                  <div
                    className="text-6xl font-black leading-none sm:text-8xl"
                    style={{
                      backgroundImage: "linear-gradient(180deg,#ffffff 0%,#7dd3fc 55%,#2563eb 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      filter:
                        "drop-shadow(0 3px 0 #0c4a6e) drop-shadow(0 0 22px rgba(125,211,252,.9))",
                    }}
                  >
                    ×{slam.value}
                  </div>
                  <div className="mt-1 text-base font-extrabold text-amber-300 sm:text-2xl">
                    {fmtX(slam.base)}x × {slam.value} = {fmtX(slam.total)}x
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* perayaan layar penuh (di luar kotak yang bergetar) */}
      <AnimatePresence>
        {celebration && (
          <Celebration
            key={celebration.key}
            tier={celebration.tier}
            payout={celebration.payout}
            bet={celebration.bet}
            onClose={closeCelebration}
          />
        )}
      </AnimatePresence>
    </>
  );
}