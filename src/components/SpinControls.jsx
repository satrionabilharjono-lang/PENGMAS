// =====================================================================
//  SpinControls.jsx  —  tombol SPIN / SKIP / AUTO / SIMULASI CEPAT
//  Letakkan di: src/components/SpinControls.jsx
//  Dipakai lewat prop `controls` di PlayerTab (lihat App.jsx).
// =====================================================================
import { useState } from "react";

const MAX_COUNT = 1000;
const PRESETS = [10, 25, 50, 100];
const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

export default function SpinControls({
  balance,
  bet,
  isSpinning,
  canSkip,
  auto,
  turbo,
  setTurbo,
  onSpin,
  onAuto,
  onBatch,
  onSkip,
  onStopAuto,
}) {
  const [count, setCount] = useState(25);
  const clamp = (v) => Math.min(MAX_COUNT, Math.max(1, Math.floor(Number(v) || 1)));
  const busy = isSpinning || auto.active;
  const broke = balance < bet;
  const affordable = bet > 0 ? Math.floor(balance / bet) : 0;
  const worstCase = count * bet;

  const btn =
    "rounded-xl px-4 py-3 text-sm font-extrabold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div data-testid="spin-controls" className="w-full max-w-5xl space-y-3">
      {/* status auto spin */}
      {(auto.active || auto.note) && (
        <div
          data-testid="autobar"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-slate-950/80 px-4 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="font-bold text-amber-300">
              {auto.active
                ? `${auto.mode === "batch" ? "SIMULASI" : "AUTO SPIN"} · sisa ${auto.left}/${auto.total}`
                : "Selesai"}
            </p>
            {auto.note && <p className="truncate text-xs text-slate-400">{auto.note}</p>}
          </div>
          {auto.active && (
            <button
              data-testid="stop-auto"
              onClick={onStopAuto}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-extrabold tracking-wider hover:bg-red-500"
            >
              STOP
            </button>
          )}
        </div>
      )}

      {/* baris utama: spin + skip + turbo */}
      <div className="flex flex-wrap items-stretch gap-2">
        <button
          data-testid="spin"
          onClick={onSpin}
          disabled={busy || broke}
          className={`${btn} min-w-[8rem] flex-1 bg-gradient-to-b from-amber-300 to-amber-500 py-4 text-lg text-slate-900 hover:brightness-110`}
        >
          SPIN · {rupiah(bet)}
        </button>
        <button
          data-testid="skip"
          onClick={onSkip}
          disabled={!canSkip}
          className={`${btn} bg-slate-700 text-white hover:bg-slate-600`}
          title="Lewati animasi putaran ini dan langsung lihat hasilnya"
        >
          SKIP ⏭
        </button>
        <label
          className={`${btn} flex cursor-pointer select-none items-center gap-2 border border-slate-600 bg-slate-800 text-xs text-slate-200`}
          title="Turbo: animasi tiap putaran dilewati otomatis (jackpot tetap dimainkan)"
        >
          <input
            data-testid="turbo"
            type="checkbox"
            checked={turbo}
            onChange={(e) => setTurbo(e.target.checked)}
          />
          TURBO
        </label>
      </div>

      {/* baris multi-putaran */}
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400">Jumlah putaran</span>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-600">
            <button
              data-testid="count-minus"
              className="px-3 py-1.5 text-lg hover:bg-slate-700 disabled:opacity-40"
              disabled={busy}
              onClick={() => setCount((c) => clamp(c - 1))}
            >
              −
            </button>
            <input
              data-testid="count"
              type="number"
              min={1}
              max={MAX_COUNT}
              value={count}
              disabled={busy}
              onChange={(e) => setCount(e.target.value === "" ? "" : clamp(e.target.value))}
              onBlur={() => setCount((c) => clamp(c))}
              className="w-16 bg-transparent py-1.5 text-center text-sm font-bold tabular-nums outline-none"
            />
            <button
              data-testid="count-plus"
              className="px-3 py-1.5 text-lg hover:bg-slate-700 disabled:opacity-40"
              disabled={busy}
              onClick={() => setCount((c) => clamp(clamp(c) + 1))}
            >
              +
            </button>
          </div>
          {PRESETS.map((n) => (
            <button
              key={n}
              disabled={busy}
              onClick={() => setCount(n)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold disabled:opacity-40 ${
                count === n
                  ? "border-amber-400 bg-amber-400/15 text-amber-300"
                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {n}×
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Tiap putaran memakai taruhan {rupiah(bet)}. Maksimal terpakai {rupiah(worstCase)}
          {broke
            ? " — saldo tidak cukup."
            : affordable < count
              ? ` — saldo cukup untuk ±${affordable} putaran tanpa menang, berhenti otomatis bila habis.`
              : "."}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            data-testid="auto"
            onClick={() => onAuto(clamp(count))}
            disabled={busy || broke}
            className={`${btn} bg-sky-500 text-slate-900 hover:bg-sky-400`}
          >
            AUTO · animasi manual ({clamp(count)}×)
          </button>
          <button
            data-testid="batch"
            onClick={() => onBatch(clamp(count))}
            disabled={busy || broke}
            className={`${btn} bg-violet-500 text-white hover:bg-violet-400`}
          >
            SIMULASI CEPAT ({clamp(count)}×)
          </button>
        </div>
      </div>
    </div>
  );
}
