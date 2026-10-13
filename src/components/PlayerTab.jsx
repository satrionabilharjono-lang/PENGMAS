import { useState } from "react";
import SlotMachine from "./SlotMachine";
import BetControls from "./BetControls";
import RealityCheck from "./RealityCheck";
import BalanceChart from "./BalanceChart";
import BalanceTrendChart from "./BalanceTrendChart";
import WalletPanel from "./WalletPanel";
import { WITHDRAW } from "../slotExtras";

const stepLabel = (n) => (n >= 1000000 ? `${n / 1000000} jt` : `${n / 1000} rb`);
const btn =
  "w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow flex items-center justify-center transition-all cursor-pointer active:scale-95";

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
  controls, // panel SKIP / AUTO / SIMULASI dari App.jsx
  wallet = 0,
  handleWalletChange = () => {},
  withdrawals = [],
  handleWithdrawRequest = () => ({ ok: false, error: "Tidak tersedia." }),
}) {
  const [step, setStep] = useState(100000);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Kotak spin: selebar penuh */}
      <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center shadow-2xl">
        <div className="w-full mb-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-6">
            {/* Saldo top up (saldo game) */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Saldo Top Up (Game)
              </p>
              <div className="flex items-center gap-4">
                <button data-testid="topup-minus" className={btn} onClick={() => handleManualBalanceChange(-step)}>
                  -
                </button>
                <p
                  data-testid="topup-balance"
                  className={`text-2xl font-black ${balance < 200000 ? "text-red-500" : "text-emerald-400"}`}
                >
                  Rp {balance.toLocaleString("id-ID")}
                </p>
                <button data-testid="topup-plus" className={btn} onClick={() => handleManualBalanceChange(step)}>
                  +
                </button>
              </div>
            </div>

            {/* Dompet (uang nyata) */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Dompet
              </p>
              <div className="flex items-center gap-4">
                <button data-testid="wallet-minus" className={btn} onClick={() => handleWalletChange(-step)}>
                  -
                </button>
                <p data-testid="wallet-balance" className="text-2xl font-black text-sky-300">
                  Rp {wallet.toLocaleString("id-ID")}
                </p>
                <button data-testid="wallet-plus" className={btn} onClick={() => handleWalletChange(step)}>
                  +
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Spin</p>
              <p className="text-xl font-bold text-slate-200">{spinCount}x</p>
            </div>
          </div>

          {/* Nilai tombol + / - */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-slate-400">Nilai tombol +/−</span>
            {WITHDRAW.steps.map((n) => (
              <button
                key={n}
                onClick={() => setStep(n)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  step === n
                    ? "border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border-slate-600 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {stepLabel(n)}
              </button>
            ))}
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

      {/* Dompet & penarikan */}
      <div className="md:col-span-2">
        <WalletPanel
          balance={balance}
          withdrawals={withdrawals}
          onRequest={handleWithdrawRequest}
          busy={isSpinning}
        />
      </div>

      <BalanceChart history={history} />
      <BalanceTrendChart history={history} />
    </div>
  );
}