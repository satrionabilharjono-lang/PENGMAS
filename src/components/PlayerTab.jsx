import SlotMachine from "./SlotMachine";
import BetControls from "./BetControls";
import RealityCheck from "./RealityCheck";
import BalanceChart from "./BalanceChart";
import BalanceTrendChart from "./BalanceTrendChart";

export default function PlayerTab({
  balance,
  bet,
  setBet,
  reels,
  spinCount,
  lastWin,
  history,
  isSpinning,
  totalLoss,
  symbols,
  handleSpin,
  handleAutoSpin,
  handleReset,
  handleManualBalanceChange,
  controls, // BARU: panel SPIN / SKIP / AUTO / SIMULASI dari App.jsx
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Kotak spin: selebar penuh */}
      <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center shadow-2xl">
        <div className="w-full flex justify-between items-center mb-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Saldo Pemain
            </p>
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow flex items-center justify-center transition-all cursor-pointer active:scale-95"
                onClick={() => handleManualBalanceChange(-100000)}
              >
                -
              </button>
              <p
                className={`text-2xl font-black ${
                  balance < 200000 ? "text-red-500" : "text-emerald-400"
                }`}
              >
                Rp {balance.toLocaleString("id-ID")}
              </p>
              <button
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow flex items-center justify-center transition-all cursor-pointer active:scale-95"
                onClick={() => handleManualBalanceChange(100000)}
              >
                +
              </button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Total Spin
            </p>
            <p className="text-xl font-bold text-slate-200">{spinCount}x</p>
          </div>
        </div>

        <SlotMachine
          reels={reels}
          lastWin={lastWin}
          spinCount={spinCount}
          bet={bet}
          isSpinning={isSpinning}
          symbols={symbols}
        />

        {/* Panel baru tepat di bawah papan */}
        <div className="mt-4 flex w-full justify-center">{controls}</div>

        <BetControls
          balance={balance}
          bet={bet}
          setBet={setBet}
          isSpinning={isSpinning}
          handleSpin={handleSpin}
          handleAutoSpin={handleAutoSpin}
          handleReset={handleReset}
        />
      </div>

      {/* Reality check: tepat di bawah kotak spin */}
      <div className="md:col-span-2">
        <RealityCheck totalLoss={totalLoss} />
      </div>

      <BalanceChart history={history} />
      <BalanceTrendChart history={history} />
    </div>
  );
}