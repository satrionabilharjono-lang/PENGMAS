import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import PlayerTab from "./components/PlayerTab";
import BandarTab from "./components/BandarTab";
import BannerAds from "./components/BannerAds";
// BARU: simbol & pengaturan papan dipindah ke slotConfig.js
import { SYMBOLS, TIMING } from "./slotConfig";
// BARU: engine yang menyusun papan sesuai keputusan bandar
import { buildSpinResult, toQuickResult, createIdleResult } from "./slotEngine";

export default function App() {
  const [activeTab, setActiveTab] = useState("player");

  // Player State
  const [balance, setBalance] = useState(1000000);
  const [bet, setBet] = useState(20000);
  // `reels` sekarang berisi HASIL PAPAN dari slotEngine (bukan 3 simbol lagi)
  const [reels, setReels] = useState(() => createIdleResult());
  const [history, setHistory] = useState([
    {
      spin: 0,
      balance: 1000000,
      totalLoss: 0,
      chartLoss: 0,
      eventType: "initial",
    },
  ]);
  const [lastWin, setLastWin] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false); // State Animasi Putaran
  const [totalLoss, setTotalLoss] = useState(0);
  const [chartLoss, setChartLoss] = useState(0);
  // Bandar Control State
  const [rtp, setRtp] = useState(30);
  const [baitMode, setBaitMode] = useState(true);
  const [forceLoss, setForceLoss] = useState(false);

  const balanceRef = useRef(balance);
  const totalLossRef = useRef(totalLoss);
  const chartLossRef = useRef(chartLoss);
  const spinCountRef = useRef(spinCount);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    totalLossRef.current = totalLoss;
  }, [totalLoss]);

  useEffect(() => {
    chartLossRef.current = chartLoss;
  }, [chartLoss]);

  useEffect(() => {
    spinCountRef.current = spinCount;
  }, [spinCount]);

  // Helper untuk memutar file audio dari folder public/sounds/
  const playAudio = (fileName) => {
    const audio = new Audio(`/sounds/${fileName}`);
    audio.volume = 0.5; // Atur volume (0.0 sampai 1.0)
    audio.play().catch((err) => {
      // Menangani pembatasan autoplay browser jika user belum berinteraksi
      console.log("Audio play error:", err);
    });
  };

  const handleManualBalanceChange = (amount) => {
    const currentBalance = balanceRef.current;
    const currentChartLoss = chartLossRef.current;
    const currentTotalLoss = totalLossRef.current;
    const updatedBalance = Math.max(10000, currentBalance + amount);
    const actualChange = updatedBalance - currentBalance;
    const updatedChartLoss = Math.max(0, currentChartLoss - actualChange);

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
          actualChange > 0
            ? "manual-add"
            : actualChange < 0
              ? "manual-subtract"
              : "manual-no-change",
      },
    ]);
  };

  // Spin Logic
  const handleSpin = () => {
    const currentBalance = balanceRef.current;
    const currentTotalLoss = totalLossRef.current;
    const currentChartLoss = chartLossRef.current;
    const currentSpinCount = spinCountRef.current;

    if (currentBalance < bet || isSpinning) {
      if (currentBalance < bet) {
        playAudio("loss.mp3");
        alert("Saldo habis! Inilah yang terjadi kalau terus bermain judol.");
      }
      return;
    }

    playAudio("spin.mp3");

    const nextSpinCount = currentSpinCount + 1;

    // --- KEPUTUSAN BANDAR (logika sama persis seperti sebelumnya) ---
    let wantWin = false;
    let targetMultiplier = 1.5;

    // --- FITUR UMPAN TENGAH (INTERMITTENT BAIT) ---
    // Pancingan acak setiap kelipatan 6 atau 9 spin (50% peluang dipancing) saat spin > 4
    const isMiddleBait =
      baitMode &&
      nextSpinCount > 4 &&
      (nextSpinCount % 6 === 0 || nextSpinCount % 9 === 0) &&
      Math.random() < 0.5;

    // 1. Umpan Awal (Spin 1-4) OR Umpan Tengah (Spin Berkala)
    if ((baitMode && nextSpinCount <= 4) || isMiddleBait) {
      wantWin = true;
      // Umpan awal ngasih ~2x, umpan tengah ngasih ~1.3x (kemenangan tipis semu)
      targetMultiplier = nextSpinCount <= 4 ? 2 : 1.3;

      // 2. Murni Sesuai RTP Bandar
    } else if (!forceLoss) {
      if (Math.random() * 100 < rtp) {
        wantWin = true;
        targetMultiplier = 1.5;
      }
    }

    // --- BARU: engine menyusun papan yang hasilnya cocok dengan keputusan di atas ---
    const result = buildSpinResult({ win: wantWin, target: targetMultiplier });
    const winAmount = Math.round(result.payout * bet); // pembayaran nyata dari papan
    const isWin = winAmount > 0;

    // Mulai animasi: papan jatuh, tumble, bola pengali (semua di SlotMachine.jsx)
    setReels(result);
    setIsSpinning(true);

    // Hasil dicatat setelah animasi selesai (durasi mengikuti isi papan)
    setTimeout(() => {
      let updatedBalance = currentBalance - bet;
      let nextTotalLoss = currentTotalLoss;
      let nextChartLoss = currentChartLoss;

      if (isWin) {
        updatedBalance += winAmount;
        nextChartLoss = Math.max(0, nextChartLoss + bet - winAmount);
        playAudio("win.mp3");
        setLastWin(winAmount);
      } else {
        nextTotalLoss += bet;
        nextChartLoss += bet;
        setTotalLoss(nextTotalLoss);
        playAudio("loss.mp3");
        setLastWin(0);
      }

      // Update State Hasil
      setBalance(updatedBalance);
      setSpinCount(nextSpinCount);
      setChartLoss(nextChartLoss);
      setHistory((prev) => [
        ...prev,
        {
          spin: nextSpinCount,
          balance: updatedBalance,
          totalLoss: nextTotalLoss,
          chartLoss: nextChartLoss,
          eventType: isWin ? "spin-win" : "spin-loss",
        },
      ]);

      setIsSpinning(false);
    }, result.durationMs + 60);
  };

  // Terima parameter count (default 50x spin)
  const handleAutoSpin = (count = 50) => {
    if (isSpinning) return;

    const currentBalance = balanceRef.current;
    const currentTotalLoss = totalLossRef.current;
    const currentChartLoss = chartLossRef.current;
    const currentSpinCount = spinCountRef.current;

    if (currentBalance < bet) {
      playAudio("loss.mp3");
      alert("Saldo habis! Tidak bisa melakukan Auto Spin.");
      return;
    }

    playAudio("spin.mp3");

    // Simpan saldo awal sebelum simulasi untuk komparasi audio di akhir
    const initialBalance = currentBalance;

    // Simulasi semua putaran langsung (hasilnya baru ditampilkan setelah animasi)
    let tempBalance = initialBalance;
    let tempSpin = currentSpinCount;
    let lastWinAmount = 0;
    let tempTotalLoss = currentTotalLoss;
    let tempChartLoss = currentChartLoss;
    let lastResult = null;
    const addedHistory = [];

    for (let i = 0; i < count; i++) {
      // Hentikan simulasi jika saldo sudah tidak cukup untuk taruhan
      if (tempBalance < bet) break;

      tempBalance -= bet;
      tempSpin += 1;

      // Logika Penentuan Menang / Kalah (Konsisten dengan handleSpin)
      let wantWin = false;
      let targetMultiplier = 1.5;
      if (baitMode && tempSpin <= 4) {
        wantWin = true;
        targetMultiplier = 2;
      } else if (!forceLoss) {
        if (Math.random() * 100 < rtp) {
          wantWin = true;
        }
      }

      const r = buildSpinResult({ win: wantWin, target: targetMultiplier });
      const winAmount = Math.round(r.payout * bet);
      const isWin = winAmount > 0;
      lastResult = r;

      if (isWin) {
        tempBalance += winAmount;
        tempChartLoss = Math.max(0, tempChartLoss + bet - winAmount);
        lastWinAmount = winAmount;
      } else {
        lastWinAmount = 0;
        tempTotalLoss += bet;
        tempChartLoss += bet;
      }

      // Catat entri baru secara terpisah untuk digabung dengan functional update
      addedHistory.push({
        spin: tempSpin,
        balance: Math.round(tempBalance),
        totalLoss: tempTotalLoss,
        chartLoss: tempChartLoss,
        eventType: isWin ? "spin-win" : "spin-loss",
      });
    }

    // Animasi singkat: papan berputar buram lalu menampilkan papan putaran terakhir
    setReels(toQuickResult(lastResult));
    setIsSpinning(true);

    setTimeout(() => {
      const roundedFinalBalance = Math.round(tempBalance);

      // Update State Sekaligus dengan Aman
      setBalance(roundedFinalBalance);
      setSpinCount(tempSpin);
      setTotalLoss(tempTotalLoss);
      setChartLoss(tempChartLoss);
      setHistory((prevHistory) => [...prevHistory, ...addedHistory]);
      setLastWin(lastWinAmount);
      setIsSpinning(false);

      // Suara penutup hasil simulasi (Bandingkan saldo akhir vs saldo awal)
      if (roundedFinalBalance < initialBalance) {
        playAudio("loss.mp3");
      } else {
        playAudio("win.mp3");
      }
    }, TIMING.autoSpinMs);
  };

  const handleReset = () => {
    setBalance(1000000);
    setBet(20000);
    setReels(createIdleResult());
    setTotalLoss(0);
    setChartLoss(0);
    setHistory([
      {
        spin: 0,
        balance: 1000000,
        totalLoss: 0,
        chartLoss: 0,
        eventType: "initial",
      },
    ]);
    setLastWin(0);
    setSpinCount(0);
    setIsSpinning(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8 overflow-x-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* CONTAINER UTAMA (Relative Anchor) */}
      <div className="relative max-w-5xl mx-auto mt-6">
        {/* Banner Kiri (Mengikuti tinggi penuh main) */}
        <div className="hidden xl:block absolute -left-64 top-0 w-56 h-full pb-2">
          <BannerAds position="left" />
        </div>

        {/* Layar Utama (Ukurannya 100% Tetap & Tidak Terpengaruh Banner) */}
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
              handleReset={handleReset}
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

        {/* Banner Kanan (Mengikuti tinggi penuh main) */}
        <div className="hidden xl:block absolute -right-64 top-0 w-56 h-full pb-2">
          <BannerAds position="right" />
        </div>
      </div>
    </div>
  );
};