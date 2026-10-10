// =====================================================================
//  SlotMachine.jsx  —  papan 6x5 gaya Zeus: simbol jatuh, tumble,
//  bola pengali. Letakkan di: src/components/SlotMachine.jsx
//
//  Props (sama seperti sebelumnya, PlayerTab tidak perlu diubah):
//    reels      : hasil dari slotEngine (App.jsx menaruhnya di state `reels`)
//    isSpinning : true selama animasi berjalan
//    spinCount, symbols : tidak dipakai lagi (simbol dibaca dari slotConfig.js)
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GRID, SYMBOLS, MULTIPLIERS } from "../slotConfig";
import { timings as T } from "../slotEngine";

const { cols: COLS, rows: ROWS } = GRID;
const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));
const ORB_BY_VALUE = Object.fromEntries(MULTIPLIERS.map((m) => [m.value, m]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flatten = (board) =>
  board.flatMap((col, c) => col.map((cell, r) => ({ ...cell, col: c, row: r })));
const fmtX = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));
const randomStrip = () =>
  Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].img),
  );

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

function Cell({ cell, hit, zap, stagger }) {
  const delay =
    stagger === "initial"
      ? (cell.col * T.colStaggerMs + cell.row * T.rowStaggerMs) / 1000
      : (cell.row * T.rowStaggerMs) / 1000;
  const glow = hit || zap;
  return (
    <motion.div
      className="absolute left-0 top-0 flex w-full items-center justify-center"
      style={{ height: `${100 / ROWS}%` }}
      initial={{ y: `${(cell.row - ROWS - 1) * 100}%`, scale: 1, opacity: 1 }}
      animate={{ y: `${cell.row * 100}%`, scale: glow ? [1, 1.14, 1] : 1, opacity: 1 }}
      exit={{
        scale: 1.7,
        opacity: 0,
        transition: { duration: T.popMs / 1000, ease: "easeOut" },
      }}
      transition={{
        y: { duration: T.fallMs / 1000, delay, ease: [0.3, 1.2, 0.55, 1] },
        scale: glow ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 },
        opacity: { duration: 0.01 },
      }}
    >
      <div
        className={`flex h-[92%] w-[92%] items-center justify-center rounded-xl transition-shadow ${
          glow ? "bg-amber-300/20 shadow-[0_0_18px_rgba(252,211,77,.9)] ring-2 ring-amber-300" : ""
        }`}
      >
        {cell.kind === "orb" ? (
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
  const [strips, setStrips] = useState(null); // blur saat Auto Spin
  const runRef = useRef(0);
  const counter = useRef(0);

  async function runFull(plan, my) {
    const alive = () => runRef.current === my;
    setHit(new Set());
    setZap(new Set());
    setMult(1);
    setPopup(null);
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
    if (plan.payout > 0 && plan.orbs.length) {
      let acc = 0;
      for (const o of plan.orbs) {
        if (!alive()) return;
        setZap((prev) => new Set(prev).add(o.uid));
        acc += o.value;
        setMult(acc);
        setFlashKey((k) => k + 1);
        await sleep(T.orbEachMs);
      }
      await sleep(T.orbSettleMs);
    }
    await sleep(T.endPauseMs);
  }

  async function runQuick(plan, my) {
    const alive = () => runRef.current === my;
    setHit(new Set());
    setZap(new Set());
    setMult(1);
    setPopup(null);
    setDropping(true);
    await sleep(T.dropOutMs);
    if (!alive()) return;
    setDropping(false);
    setBoardKey((k) => k + 1);
    setCells([]);
    setStrips(randomStrip());
    await sleep(Math.max(200, T.autoSpinMs - T.dropOutMs - T.dropInMs - 80));
    if (!alive()) return;
    setStrips(null);
    setStagger("initial");
    setBoardKey((k) => k + 1);
    setCells(flatten(plan.final));
    setMult(plan.multiplier || 1);
  }

  useEffect(() => {
    if (!isSpinning) {
      // Putaran selesai (atau reset): tampilkan papan akhir apa adanya.
      runRef.current = 0;
      const resetBoard = () => {
        setHit(new Set());
        setZap(new Set());
        setPopup(null);
        setStrips(null);
        setDropping(false);
        setCells(flatten(reels.final));
        setMult(reels.multiplier || 1);
      };
      const timeoutId = setTimeout(resetBoard, 0);
      return () => clearTimeout(timeoutId);
    }

    const my = ++counter.current;
    runRef.current = my;
    (reels.kind === "quick" ? runQuick : runFull)(reels, my);
  }, [isSpinning, reels]);

  return (
    <div className="my-6 w-full max-w-3xl rounded-2xl border-4 border-amber-500/30 bg-slate-950 p-3 shadow-inner sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-widest text-slate-400">
          Menang di mana saja · {GRID.cols}×{GRID.rows}
        </p>
        <motion.div
          key={mult}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-3 py-1 text-sm font-bold tabular-nums text-cyan-200"
        >
          PENGALI ×{mult}
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
            style={{ left: `${(c * 100) / COLS}%`, width: `${100 / COLS}%` }}
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
                    stagger={stagger}
                  />
                ))}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* efek blur saat Auto Spin */}
        {strips && (
          <div className="absolute inset-0 flex">
            {strips.map((col, c) => (
              <div
                key={c}
                className="relative h-full overflow-hidden"
                style={{ width: `${100 / COLS}%` }}
              >
                <motion.div
                  className="flex flex-col blur-[3px]"
                  style={{ height: "200%" }}
                  animate={{ y: ["-50%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 0.28 + c * 0.02, ease: "linear" }}
                >
                  {[...col, ...col].map((src, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center"
                      style={{ height: `${100 / (ROWS * 2)}%` }}
                    >
                      <img src={src} alt="" className="h-[80%] w-[80%] object-contain" />
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}