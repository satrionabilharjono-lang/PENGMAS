import { Play, TrendingDown, RotateCcw } from "lucide-react";

export default function BetControls({
  balance,
  bet,
  setBet,
  isSpinning, // Tangkap isSpinning
  handleSpin,
  handleAutoSpin,
  handleReset,
}) {
  const isButtonDisabled = balance < bet || isSpinning;

  return (
    <div className="flex flex-wrap gap-3 w-full justify-center items-center mt-2">
      {/* Tombol SPIN Utama */}
      <button
        onClick={handleSpin}
        disabled={isButtonDisabled}
        className="flex-1 min-w-[140px] bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
      >
        <Play className={`w-5 h-5 fill-current ${isSpinning ? "animate-spin" : ""}`} />
        {isSpinning ? "MEMUTAR..." : "SPIN"}
      </button>

      {/* Tombol Minus (-) */}
      <button
        onClick={() => setBet((prev) => Math.max(10000, prev - 10000))}
        disabled={isSpinning || bet <= 10000}
        className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow flex items-center justify-center transition-all cursor-pointer active:scale-95"
      >
        -
      </button>

      {/* Display Bet */}
      <div className="flex flex-col items-center px-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
          Taruhan
        </span>
        <span className="text-sm font-bold text-amber-400">
          Rp {bet.toLocaleString("id-ID")}
        </span>
      </div>

      {/* Tombol Plus (+) */}
      <button
        onClick={() => setBet((prev) => Math.min(balance, prev + 10000))}
        disabled={isSpinning || bet >= balance}
        className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow flex items-center justify-center transition-all cursor-pointer active:scale-95"
      >
        +
      </button>

      {/* Tombol Auto Spin 50x */}
      <button
        onClick={() => handleAutoSpin(50)}
        disabled={isButtonDisabled}
        className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center gap-2 text-xs cursor-pointer active:scale-95"
      >
        <TrendingDown className="w-4 h-4" /> Simulasi 50x Spin
      </button>

      {/* Tombol Reset */}
      <button
        onClick={handleReset}
        disabled={isSpinning}
        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 p-3 rounded-xl cursor-pointer active:scale-95"
        title="Reset Saldo"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
}