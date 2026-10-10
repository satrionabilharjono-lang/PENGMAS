import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import PlayerTab from "./components/PlayerTab";
import BandarTab from "./components/BandarTab";
import BannerAds from "./components/BannerAds";
import SpinControls from "./components/SpinControls";
import { SYMBOLS } from "./slotConfig";
import { JACKPOT, AUTOPLAY, SOUND } from "./slotExtras";
import { buildSpinResult, createIdleResult, getWinTier } from "./slotEngine";
import { requestSkip } from "./slotSkip";
import Sound from "./sound";

const START_BALANCE = 1000000;
const START_BET = 20000;
const TURBO_MS = 280; // lama tiap putaran saat Turbo
const MAX_COUNT = 1000;

// Hitung hasil satu putaran terhadap saldo (fungsi murni, dipakai semua mode).
const settle = (st, result, stake) => {
  const win = Math.round(result.payout * stake);
  const isWin = win > 0;
  let { balance, totalLoss, chartLoss } = st;
  balance -= stake;
  if (isWin) {
    balance += win;
    chartLoss = Math.max(0, chartLoss + stake - win);
  } else {
    totalLoss += stake;
    chartLoss += stake;
  }
  return { balance, totalLoss, chartLoss, win, isWin };
};

const IDLE_AUTO = { active: false, left: 0, total: 0, note: "", mode: "auto" };

export default function App() {
  const [activeTab, setActiveTab] = useState("player");

  // Player State
  const [balance, setBalance] = useState(START_BALANCE);
  const [bet, setBet] = useState(START_BET);
  const [reels, setReels] = useState(() => createIdleResult());
  const [history, setHistory] = useState([
    { spin: 0, balance: START_BALANCE, totalLoss: 0, chartLoss: 0, eventType: "initial" },
  ]);
  const [lastWin, setLastWin] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [totalLoss, setTotalLoss] = useState(0);
  const [chartLoss, setChartLoss] = useState(0);

  // Auto spin / skip / turbo
  const [auto, setAuto] = useState(IDLE_AUTO);
  const [canSkip, setCanSkip] = useState(false);
  const [turbo, setTurbo] = useState(false);

  // Bandar Control State
  const [rtp, setRtp] = useState(30);
  const [baitMode, setBaitMode] = useState(true);
  const [forceLoss, setForceLoss] = useState(false);

  // Ref: selalu berisi nilai terbaru (aman dipakai di dalam timer/loop)
  const balanceRef = useRef(balance);
  const betRef = useRef(bet);
  const totalLossRef = useRef(totalLoss);
  const chartLossRef = useRef(chartLoss);
  const spinCountRef = useRef(spinCount);
  const rtpRef = useRef(rtp);
  const baitRef = useRef(baitMode);
  const forceLossRef = useRef(forceLoss);
  const turboRef = useRef(turbo);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { totalLossRef.current = totalLoss; }, [totalLoss]);
  useEffect(() => { chartLossRef.current = chartLoss; }, [chartLoss]);
  useEffect(() => { spinCountRef.current = spinCount; }, [spinCount]);
  useEffect(() => { rtpRef.current = rtp; }, [rtp]);
  useEffect(() => { baitRef.current = baitMode; }, [baitMode]);
  useEffect(() => { forceLossRef.current = forceLoss; }, [forceLoss]);
  useEffect(() => { turboRef.current = turbo; }, [turbo]);

  // Kontrol putaran
  const busyRef = useRef(false); // true selama ada putaran / auto / simulasi berjalan
  const epochRef = useRef(0); // naik saat reset: membatalkan semua putaran yang tertunda
  const stopAutoRef = useRef(false);
  const waitersRef = useRef(new Set()); // semua timer yang bisa dibatalkan
  const spinWaiterRef = useRef(null); // timer putaran yang sedang dianimasikan (untuk SKIP)

  // Tunggu ms milidetik. promise -> "done" | "skip" | "cancel"
  const startWait = (ms) => {
    const w = {};
    w.promise = new Promise((resolve) => {
      w.finish = (status) => {
        if (w.closed) return;
        w.closed = true;
        clearTimeout(w.timer);
        waitersRef.current.delete(w);
        if (spinWaiterRef.current === w) spinWaiterRef.current = null;
        resolve(status);
      };
      w.timer = setTimeout(() => w.finish("done"), ms);
    });
    waitersRef.current.add(w);
    return w;
  };

  const cancelWaiters = () => [...waitersRef.current].forEach((w) => w.finish("cancel"));

  useEffect(
    () => () => {
      epochRef.current += 1;
      cancelWaiters();
      Sound.stopAll(0);
    },
    [],
  );

  const handleManualBalanceChange = (amount) => {
    const currentBalance = balanceRef.current;
    const currentChartLoss = chartLossRef.current;
    const currentTotalLoss = totalLossRef.current;
    const updatedBalance = Math.max(10000, currentBalance + amount);
    const actualChange = updatedBalance - currentBalance;
    const updatedChartLoss = Math.max(0, currentChartLoss - actualChange);

    balanceRef.current = updatedBalance;
    chartLossRef.current = updatedChartLoss;
    setBalance(updatedBalance);
    setChartLoss(updatedChartLoss);
    setHistory((prev) => [
      ...prev,
      {
        spin: spinCountRef.current,
        balance: updatedBalance,
        totalLoss: currentTotalLoss,
        chartLoss: updatedChartLoss,
        eventType:
          actualChange > 0 ? "manual-add" : actualChange < 0 ? "manual-subtract" : "manual-no-change",
      },
    ]);
  };

  // --- KEPUTUSAN BANDAR: menang/kalah + target kelipatan ---
  const decideSpin = (nextSpinCount) => {
    // 0. Jackpot (dimatikan oleh Force Loss)
    if (
      !forceLossRef.current &&
      JACKPOT.chancePercent > 0 &&
      Math.random() * 100 < JACKPOT.chancePercent
    ) {
      return { wantWin: true, target: JACKPOT.target };
    }

    const bait = baitRef.current;
    const isMiddleBait =
      bait &&
      nextSpinCount > 4 &&
      (nextSpinCount % 6 === 0 || nextSpinCount % 9 === 0) &&
      Math.random() < 0.5;

    // 1. Umpan awal (spin 1-4) / umpan tengah
    if ((bait && nextSpinCount <= 4) || isMiddleBait) {
      return { wantWin: true, target: nextSpinCount <= 4 ? 2 : 1.3 };
    }
    // 2. Murni sesuai RTP bandar
    if (!forceLossRef.current && Math.random() * 100 < rtpRef.current) {
      return { wantWin: true, target: 1.5 };
    }
    return { wantWin: false, target: 1.5 };
  };

  const makeResult = (nextSpinCount, stake) => {
    const { wantWin, target } = decideSpin(nextSpinCount);
    return { ...buildSpinResult({ win: wantWin, target }), bet: stake };
  };

  // Satu putaran beranimasi (animasi + pencatatan). Resolve { ok, win, jackpot }.
  // Dipakai oleh SPIN biasa dan AUTO.
  const playOneSpin = async () => {
    const myEpoch = epochRef.current;
    const stake = betRef.current;
    const startBalance = balanceRef.current;
    if (startBalance < stake) return { ok: false, reason: "balance" };

    const nextSpinCount = spinCountRef.current + 1;
    const result = makeResult(nextSpinCount, stake);
    const tier = result.payout > 0 ? getWinTier(result.payout) : null;
    const isJackpot = !!(tier && tier.jackpot);
    // Turbo melewati animasi, kecuali jackpot (selalu dimainkan penuh).
    const quick = turboRef.current && !isJackpot;

    Sound.fadeOut("result", SOUND.resultFadeMs);
    Sound.fadeOut("fx", 150);
    Sound.play("spin", SOUND.spin, { loop: true });
    setReels(quick ? { ...result, instant: true } : result);
    setIsSpinning(true);

    const w = startWait(quick ? TURBO_MS : result.durationMs + 60);
    if (!quick) {
      spinWaiterRef.current = w;
      setCanSkip(true);
    }
    const status = await w.promise;
    if (epochRef.current !== myEpoch || status === "cancel") {
      Sound.fadeOut("spin", 0);
      return { ok: false, reason: "cancelled" };
    }
    if (!quick) setCanSkip(false);

    // Putaran selesai (atau di-SKIP): suara spin dipaksa berhenti dengan fade-out halus
    Sound.fadeOut("spin", SOUND.spinFadeMs);

    const st = settle(
      { balance: startBalance, totalLoss: totalLossRef.current, chartLoss: chartLossRef.current },
      result,
      stake,
    );
    if (st.isWin) {
      if (!tier || status === "skip") Sound.play("result", SOUND.win);
    } else {
      Sound.play("result", SOUND.loss);
    }

    balanceRef.current = st.balance;
    totalLossRef.current = st.totalLoss;
    chartLossRef.current = st.chartLoss;
    spinCountRef.current = nextSpinCount;

    setLastWin(st.win);
    setTotalLoss(st.totalLoss);
    setBalance(st.balance);
    setSpinCount(nextSpinCount);
    setChartLoss(st.chartLoss);
    setHistory((prev) => [
      ...prev,
      {
        spin: nextSpinCount,
        balance: st.balance,
        totalLoss: st.totalLoss,
        chartLoss: st.chartLoss,
        eventType: st.isWin ? "spin-win" : "spin-loss",
      },
    ]);

    return { ok: true, win: st.isWin, jackpot: isJackpot };
  };

  const handleSpin = async () => {
    if (busyRef.current) return;
    if (balanceRef.current < betRef.current) {
      Sound.play("result", SOUND.loss);
      alert("Saldo habis! Inilah yang terjadi kalau terus bermain judol.");
      return;
    }
    busyRef.current = true;
    const myEpoch = epochRef.current;
    try {
      await playOneSpin();
    } finally {
      if (epochRef.current === myEpoch) {
        busyRef.current = false;
        setCanSkip(false);
        setIsSpinning(false);
      }
    }
  };

  const cleanCount = (count) => {
    const n = Math.floor(Number(count));
    return Number.isFinite(n) && n > 0 ? Math.min(MAX_COUNT, n) : AUTOPLAY.defaultCount;
  };

  // AUTO: putaran beranimasi berurutan (bisa di-SKIP / TURBO / STOP).
  const handleAutoSpin = async (count) => {
    if (busyRef.current) return;
    const total = cleanCount(count);

    if (balanceRef.current < betRef.current) {
      Sound.play("result", SOUND.loss);
      alert("Saldo habis! Tidak bisa melakukan Auto Spin.");
      return;
    }

    busyRef.current = true;
    stopAutoRef.current = false;
    const myEpoch = epochRef.current;
    let left = total;
    let note = "";
    setAuto({ active: true, left, total, note: "", mode: "auto" });

    try {
      while (left > 0 && !stopAutoRef.current) {
        const r = await playOneSpin();
        if (epochRef.current !== myEpoch) return; // direset
        if (!r.ok) {
          if (r.reason === "balance") note = "Saldo tidak cukup untuk taruhan berikutnya";
          break;
        }
        left -= 1;
        setAuto({ active: true, left, total, note: "", mode: "auto" });
        if (r.jackpot && AUTOPLAY.stopOnJackpot) {
          note = "Berhenti: JACKPOT!";
          break;
        }
        if (left > 0 && !stopAutoRef.current && !turboRef.current) {
          const g = startWait(AUTOPLAY.gapMs);
          const status = await g.promise;
          if (status === "cancel" || epochRef.current !== myEpoch) return;
        }
      }
      if (!note) note = stopAutoRef.current ? "Dihentikan" : "Semua putaran selesai";
    } finally {
      if (epochRef.current === myEpoch) {
        busyRef.current = false;
        stopAutoRef.current = false;
        setCanSkip(false);
        setIsSpinning(false);
        setAuto({ active: false, left: 0, total, note, mode: "auto" });
      }
    }
  };

  // SIMULASI CEPAT: semua putaran dihitung langsung, tanpa animasi.
  // Tiap putaran memakai taruhan yang sama; berhenti sendiri bila saldo kurang.
  const handleBatchSpin = (count) => {
    if (busyRef.current) return;
    const total = cleanCount(count);
    const stake = betRef.current;

    if (balanceRef.current < stake) {
      Sound.play("result", SOUND.loss);
      alert("Saldo habis! Tidak bisa melakukan simulasi.");
      return;
    }

    const initialBalance = balanceRef.current;
    let st = {
      balance: initialBalance,
      totalLoss: totalLossRef.current,
      chartLoss: chartLossRef.current,
    };
    let spin = spinCountRef.current;
    let last = null;
    let lastWinAmount = 0;
    let done = 0;
    let wins = 0;
    let note = "";
    const added = [];

    for (let i = 0; i < total; i++) {
      if (st.balance < stake) {
        note = "saldo tidak cukup untuk taruhan berikutnya";
        break;
      }
      spin += 1;
      const result = makeResult(spin, stake);
      const next = settle(st, result, stake);
      st = next;
      done += 1;
      if (next.isWin) wins += 1;
      last = result;
      lastWinAmount = next.win;
      added.push({
        spin,
        balance: Math.round(next.balance),
        totalLoss: next.totalLoss,
        chartLoss: next.chartLoss,
        eventType: next.isWin ? "spin-win" : "spin-loss",
      });
      const tier = next.isWin ? getWinTier(result.payout) : null;
      if (tier && tier.jackpot && AUTOPLAY.stopOnJackpot) {
        note = "berhenti: JACKPOT!";
        break;
      }
    }

    const finalBalance = Math.round(st.balance);
    balanceRef.current = finalBalance;
    totalLossRef.current = st.totalLoss;
    chartLossRef.current = st.chartLoss;
    spinCountRef.current = spin;

    setReels({ ...last, bet: stake }); // papan menampilkan putaran terakhir
    setBalance(finalBalance);
    setTotalLoss(st.totalLoss);
    setChartLoss(st.chartLoss);
    setSpinCount(spin);
    setLastWin(lastWinAmount);
    setHistory((prev) => [...prev, ...added]);
    setAuto({
      active: false,
      left: 0,
      total,
      mode: "batch",
      note:
        `Simulasi ${done} putaran · menang ${wins}× · saldo ` +
        `${Math.round(initialBalance).toLocaleString("id-ID")} → ${finalBalance.toLocaleString("id-ID")}` +
        (note ? ` (${note})` : ""),
    });

    Sound.fadeOut("result", SOUND.resultFadeMs);
    Sound.play("result", finalBalance < initialBalance ? SOUND.loss : SOUND.win);
  };

  // SKIP: lewati animasi putaran yang sedang berjalan, hasil langsung dicatat.
  const handleSkip = () => {
    const w = spinWaiterRef.current;
    if (!w) return;
    Sound.fadeOut("fx", 150);
    requestSkip(); // papan langsung menampilkan hasil akhir
    w.finish("skip"); // putaran langsung dicatat
  };

  const handleStopAuto = () => {
    stopAutoRef.current = true;
    setAuto((a) => ({ ...a, note: "Berhenti setelah putaran ini…" }));
  };

  const handleReset = () => {
    epochRef.current += 1; // batalkan putaran/auto yang sedang berjalan
    cancelWaiters();
    spinWaiterRef.current = null;
    Sound.stopAll(300);
    busyRef.current = false;
    stopAutoRef.current = false;

    balanceRef.current = START_BALANCE;
    betRef.current = START_BET;
    totalLossRef.current = 0;
    chartLossRef.current = 0;
    spinCountRef.current = 0;

    setBalance(START_BALANCE);
    setBet(START_BET);
    setReels(createIdleResult());
    setTotalLoss(0);
    setChartLoss(0);
    setHistory([
      { spin: 0, balance: START_BALANCE, totalLoss: 0, chartLoss: 0, eventType: "initial" },
    ]);
    setLastWin(0);
    setSpinCount(0);
    setIsSpinning(false);
    setCanSkip(false);
    setAuto(IDLE_AUTO);
  };

  // Panel tombol baru. Dipasang di PlayerTab lewat prop `controls`
  // (tepat di bawah kotak spin).
  const controls = (
    <SpinControls
      balance={balance}
      bet={bet}
      isSpinning={isSpinning}
      canSkip={canSkip}
      auto={auto}
      turbo={turbo}
      setTurbo={setTurbo}
      onSpin={handleSpin}
      onAuto={handleAutoSpin}
      onBatch={handleBatchSpin}
      onSkip={handleSkip}
      onStopAuto={handleStopAuto}
    />
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8 overflow-x-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="relative max-w-5xl mx-auto mt-6">
        <div className="hidden xl:block absolute -left-64 top-0 w-56 h-full pb-2">
          <BannerAds position="left" />
        </div>

        <main className="w-full">
          {activeTab === "player" ? (
            <PlayerTab
              balance={balance}
              bet={bet}
              setBet={setBet}
              reels={reels}
              spinCount={spinCount}
              lastWin={lastWin}
              history={history}
              isSpinning={isSpinning}
              totalLoss={totalLoss}
              handleManualBalanceChange={handleManualBalanceChange}
              symbols={SYMBOLS.map((s) => s.img)}
              handleSpin={handleSpin}
              handleAutoSpin={handleAutoSpin}
              handleBatchSpin={handleBatchSpin}
              handleSkip={handleSkip}
              handleReset={handleReset}
              controls={controls}
            />
          ) : (
            <BandarTab
              rtp={rtp}
              setRtp={setRtp}
              baitMode={baitMode}
              setBaitMode={setBaitMode}
              forceLoss={forceLoss}
              setForceLoss={setForceLoss}
            />
          )}
        </main>

        <div className="hidden xl:block absolute -right-64 top-0 w-56 h-full pb-2">
          <BannerAds position="right" />
        </div>
      </div>
    </div>
  );
}