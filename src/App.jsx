import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import PlayerTab from "./components/PlayerTab";
import BandarTab from "./components/BandarTab";
import BannerAds from "./components/BannerAds";
import SpinControls from "./components/SpinControls";
import { SYMBOLS } from "./slotConfig";
import { AUTOPLAY, SOUND, FREE_SPINS } from "./slotExtras";
import { createIdleResult, getWinTier } from "./slotEngine";
import { requestSkip } from "./slotSkip";
import { rollSpin, initialStats, recordSpin, recordTopup } from "./bandarLogic";
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

  // Statistik untuk tab Bandar (GGR, loss chasing, dll.)
  const [stats, setStats] = useState(() => initialStats(START_BALANCE));
  const statsRef = useRef(stats);

  // Auto spin / skip / turbo
  const [auto, setAuto] = useState(IDLE_AUTO);
  const [canSkip, setCanSkip] = useState(false);
  const [turbo, setTurbo] = useState(false);

  // Bandar Control State
  const [rtp, setRtp] = useState(30);
  const [baitMode, setBaitMode] = useState(true);
  const [forceLoss, setForceLoss] = useState(false);
  const [fsChance, setFsChance] = useState(FREE_SPINS.chancePercent); // peluang free spin (%)

  // Ref: selalu berisi nilai terbaru (aman dipakai di dalam timer/loop)
  const balanceRef = useRef(balance);
  const betRef = useRef(bet);
  const totalLossRef = useRef(totalLoss);
  const chartLossRef = useRef(chartLoss);
  const spinCountRef = useRef(spinCount);
  const rtpRef = useRef(rtp);
  const baitRef = useRef(baitMode);
  const forceLossRef = useRef(forceLoss);
  const fsChanceRef = useRef(fsChance);
  const turboRef = useRef(turbo);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { totalLossRef.current = totalLoss; }, [totalLoss]);
  useEffect(() => { chartLossRef.current = chartLoss; }, [chartLoss]);
  useEffect(() => { spinCountRef.current = spinCount; }, [spinCount]);
  useEffect(() => { rtpRef.current = rtp; }, [rtp]);
  useEffect(() => { baitRef.current = baitMode; }, [baitMode]);
  useEffect(() => { forceLossRef.current = forceLoss; }, [forceLoss]);
  useEffect(() => { fsChanceRef.current = fsChance; }, [fsChance]);
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

    statsRef.current = recordTopup(statsRef.current, actualChange);
    setStats(statsRef.current);
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

  // --- KEPUTUSAN BANDAR + papan + ronde free spin: semuanya di bandarLogic.js ---
  // (dipakai juga oleh simulasi ribuan pemain, jadi aturannya selalu sama)
  const roll = (nextSpinCount, stake) =>
    rollSpin({
      spinNo: nextSpinCount,
      stake,
      rtp: rtpRef.current,
      bait: baitRef.current,
      forceLoss: forceLossRef.current,
      fsChance: fsChanceRef.current,
    });

  // Mainkan SATU papan beranimasi (putaran utama atau satu free spin).
  // Resolve "done" | "skip" | "cancel".
  const animate = async (plan, quick) => {
    Sound.fadeOut("result", SOUND.resultFadeMs);
    Sound.fadeOut("fx", 150);
    Sound.play("spin", SOUND.spin, { loop: true });
    setReels(quick ? { ...plan, instant: true } : plan);
    setIsSpinning(true);

    const w = startWait(quick ? TURBO_MS : plan.durationMs + 60);
    if (!quick) {
      spinWaiterRef.current = w;
      setCanSkip(true);
    }
    const status = await w.promise;
    if (!quick) setCanSkip(false);
    // Putaran selesai (atau di-SKIP): suara spin dipaksa berhenti dengan fade-out halus
    Sound.fadeOut("spin", status === "cancel" ? 0 : SOUND.spinFadeMs);
    return status;
  };

  // Satu putaran berbayar beranimasi, termasuk seluruh ronde free spin bila dipicu.
  // Resolve { ok, win, jackpot }.  Dipakai oleh SPIN biasa dan AUTO.
  const playOneSpin = async () => {
    const myEpoch = epochRef.current;
    const stake = betRef.current;
    const startBalance = balanceRef.current;
    if (startBalance < stake) return { ok: false, reason: "balance" };
    const cancelled = (st) => st === "cancel" || epochRef.current !== myEpoch;

    const nextSpinCount = spinCountRef.current + 1;
    const { result, round } = roll(nextSpinCount, stake);

    // Nilai Rp tiap bagian (dibulatkan per bagian supaya saldo selalu cocok)
    const baseWin = Math.round(result.payout * stake);
    const fsWins = round ? round.spins.map((p) => Math.round(p.payout * stake)) : [];
    const fsTotalWin = fsWins.reduce((a, b) => a + b, 0);
    const totalWin = baseWin + fsTotalWin;
    const grandTier = totalWin > 0 ? getWinTier(totalWin / stake) : null;
    const isJackpot = !!(grandTier && grandTier.jackpot);
    let skipped = false;

    // 1. Putaran utama. Turbo melewati animasi, kecuali jackpot dan putaran pemicu free spin.
    const baseTier = baseWin > 0 ? getWinTier(result.payout) : null;
    const quickBase = turboRef.current && !result.trigger && !(baseTier && baseTier.jackpot);
    let status = await animate(result, quickBase);
    if (cancelled(status)) return { ok: false, reason: "cancelled" };
    if (status === "skip") skipped = true;

    // Taruhan dipotong dan kemenangan putaran utama masuk saldo.
    let running = startBalance - stake + baseWin;
    balanceRef.current = running;
    setBalance(running);
    setLastWin(baseWin);

    // 2. Ronde free spin (gratis): tiap free spin langsung menambah saldo.
    if (round) {
      let acc = baseWin;
      for (let i = 0; i < round.spins.length; i++) {
        const p = round.spins[i];
        const lastTier = p.fs.last ? getWinTier(p.fs.grandTotal) : null;
        const quickFs = turboRef.current && !(lastTier && lastTier.jackpot);
        status = await animate(p, quickFs);
        if (cancelled(status)) return { ok: false, reason: "cancelled" };
        if (status === "skip") skipped = true;
        running += fsWins[i];
        acc += fsWins[i];
        balanceRef.current = running;
        setBalance(running);
        setLastWin(acc);
      }
    }

    // 3. Catat hasil seluruh putaran (utama + free spin) sebagai SATU putaran.
    const st = settle(
      { balance: startBalance, totalLoss: totalLossRef.current, chartLoss: chartLossRef.current },
      { payout: totalWin / stake },
      stake,
    );
    if (st.isWin) {
      if (!grandTier || skipped) Sound.play("result", SOUND.win);
    } else {
      Sound.play("result", SOUND.loss);
    }

    balanceRef.current = st.balance;
    totalLossRef.current = st.totalLoss;
    chartLossRef.current = st.chartLoss;
    spinCountRef.current = nextSpinCount;
    statsRef.current = recordSpin(statsRef.current, {
      stake,
      win: st.win,
      balanceAfter: st.balance,
      jackpot: isJackpot,
      scatters: result.scatters,
      fsTriggered: !!round,
      fsPaid: fsTotalWin,
      fsSpins: round ? round.spins.length : 0,
    });
    setStats(statsRef.current);

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
    let fsRounds = 0;
    let note = "";
    const added = [];

    for (let i = 0; i < total; i++) {
      if (st.balance < stake) {
        note = "saldo tidak cukup untuk taruhan berikutnya";
        break;
      }
      spin += 1;
      const { result, round } = roll(spin, stake);
      const baseWinB = Math.round(result.payout * stake);
      const fsWinB = round ? round.spins.reduce((a, p) => a + Math.round(p.payout * stake), 0) : 0;
      const winB = baseWinB + fsWinB;
      const next = settle(st, { payout: winB / stake }, stake);
      st = next;
      done += 1;
      if (next.isWin) wins += 1;
      if (round) fsRounds += 1;
      last = result;
      lastWinAmount = winB;
      const tierB = winB > 0 ? getWinTier(winB / stake) : null;
      statsRef.current = recordSpin(statsRef.current, {
        stake,
        win: winB,
        balanceAfter: next.balance,
        jackpot: !!(tierB && tierB.jackpot),
        scatters: result.scatters,
        fsTriggered: !!round,
        fsPaid: fsWinB,
        fsSpins: round ? round.spins.length : 0,
      });
      added.push({
        spin,
        balance: Math.round(next.balance),
        totalLoss: next.totalLoss,
        chartLoss: next.chartLoss,
        eventType: next.isWin ? "spin-win" : "spin-loss",
      });
      if (tierB && tierB.jackpot && AUTOPLAY.stopOnJackpot) {
        note = "berhenti: JACKPOT!";
        break;
      }
    }

    const finalBalance = Math.round(st.balance);
    balanceRef.current = finalBalance;
    totalLossRef.current = st.totalLoss;
    chartLossRef.current = st.chartLoss;
    spinCountRef.current = spin;

    setStats(statsRef.current);
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
        `Simulasi ${done} putaran · menang ${wins}×` +
        (fsRounds ? ` · free spin ${fsRounds}×` : "") +
        ` · saldo ` +
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
    statsRef.current = initialStats(START_BALANCE);
    setStats(statsRef.current);

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
              fsChance={fsChance}
              setFsChance={setFsChance}
              stats={stats}
              spinCount={spinCount}
              bet={bet}
              balance={balance}
              startBalance={START_BALANCE}
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