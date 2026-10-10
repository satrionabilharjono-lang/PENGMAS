import React, { useState } from "react";
import Header from "./components/Header";
import PlayerTab from "./components/PlayerTab";
import BandarTab from "./components/BandarTab";

export const SYMBOLS = ["🍋", "🔔", "💎", "7️⃣", "🍒", "BAR"];

export default function App() {
  const [activeTab, setActiveTab] = useState("player");

  // Player State
  const [balance, setBalance] = useState(1000000);
  const [bet, setBet] = useState(20000);
  const [reels, setReels] = useState(["7️⃣", "7️⃣", "7️⃣"]);
  const [history, setHistory] = useState([{ spin: 0, balance: 1000000 }]);
  const [lastWin, setLastWin] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false); // State Animasi Putaran

  // Bandar Control State
  const [rtp, setRtp] = useState(30);
  const [baitMode, setBaitMode] = useState(true);
  const [forceLoss, setForceLoss] = useState(false);

  // Helper untuk memutar file audio dari folder public/sounds/
  const playAudio = (fileName) => {
    const audio = new Audio(`/sounds/${fileName}`);
    audio.volume = 0.5; // Atur volume (0.0 sampai 1.0)
    audio.play().catch((err) => {
      // Menangani pembatasan autoplay browser jika user belum berinteraksi
      console.log("Audio play error:", err);
    });
  };

  // Spin Logic
  const handleSpin = () => {
    // Cegah klik beruntun saat mesin sedang berputar atau saldo kurang
    if (balance < bet || isSpinning) {
      if (balance < bet) {
        playAudio("loss.mp3");
        alert("Saldo habis! Inilah yang terjadi kalau terus bermain judol.");
      }
      return;
    }

    // 1. Mulai Animasi Putaran
    playAudio("spin.mp3");
    setIsSpinning(true);

    // 2. Gunakan setTimeout untuk memberi jeda animasi (600ms)
    setTimeout(() => {
      let currentBalance = balance - bet;
      const nextSpinCount = spinCount + 1;
      setSpinCount(nextSpinCount);

      let isWin = false;
      let winAmount = 0;

      // Logika Penentuan Menang / Kalah
      if (baitMode && nextSpinCount <= 4) {
        isWin = true;
        winAmount = bet * 2;
      } else if (!forceLoss) {
        if (Math.random() * 100 < rtp) {
          isWin = true;
          winAmount = bet * 1.5;
        }
      }

      let newReels;
      if (isWin) {
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        newReels = [sym, sym, sym];
        currentBalance += winAmount;
        playAudio("win.mp3");
        setLastWin(winAmount);
      } else {
        const sym1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const sym2 = SYMBOLS[(SYMBOLS.indexOf(sym1) + 1) % SYMBOLS.length];
        newReels = [sym1, sym1, sym2];
        playAudio("loss.mp3");
        setLastWin(0);
      }

      // Update State Hasil
      setReels(newReels);
      setBalance(currentBalance);
      setHistory((prev) => [
        ...prev,
        { spin: nextSpinCount, balance: currentBalance },
      ]);

      // 3. Matikan Animasi Putaran setelah hasil dikunci

      setIsSpinning(false);
    }, 2800);
  };

  // Terima parameter count (default 100x spin)
  // Terima parameter count (default 50x spin)
const handleAutoSpin = (count = 50) => {
  if (isSpinning) return;

  if (balance < bet) {
    playAudio("loss.mp3");
    alert("Saldo habis! Tidak bisa melakukan Auto Spin.");
    return;
  }

  setIsSpinning(true);
  playAudio("spin.mp3");

  // Simpan saldo awal sebelum simulasi untuk komparasi audio di akhir
  const initialBalance = balance;

  setTimeout(() => {
    let tempBalance = initialBalance;
    let tempSpin = spinCount;
    let lastWinAmount = 0;
    let finalReels = reels;
    const addedHistory = [];

    for (let i = 0; i < count; i++) {
      // Hentikan simulasi jika saldo sudah tidak cukup untuk taruhan
      if (tempBalance < bet) break;

      tempBalance -= bet;
      tempSpin += 1;

      let isWin = false;
      let winAmount = 0;

      // Logika Penentuan Menang / Kalah (Konsisten dengan handleSpin)
      if (baitMode && tempSpin <= 4) {
        isWin = true;
        winAmount = bet * 2;
      } else if (!forceLoss) {
        if (Math.random() * 100 < rtp) {
          isWin = true;
          winAmount = bet * 1.5;
        }
      }

      if (isWin) {
        tempBalance += winAmount;
        lastWinAmount = winAmount;
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        finalReels = [sym, sym, sym];
      } else {
        lastWinAmount = 0;
        const sym1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const sym2 = SYMBOLS[(SYMBOLS.indexOf(sym1) + 1) % SYMBOLS.length];
        finalReels = [sym1, sym1, sym2];
      }

      // Catat entri baru secara terpisah untuk digabung dengan functional update
      addedHistory.push({
        spin: tempSpin,
        balance: Math.round(tempBalance),
      });
    }

    const roundedFinalBalance = Math.round(tempBalance);

    // Update State Sekaligus dengan Aman
    setBalance(roundedFinalBalance);
    setSpinCount(tempSpin);
    setHistory((prevHistory) => [...prevHistory, ...addedHistory]);
    setReels(finalReels);
    setLastWin(lastWinAmount);
    setIsSpinning(false);

    // Suara penutup hasil simulasi (Bandingkan saldo akhir vs saldo awal)
    if (roundedFinalBalance < initialBalance) {
      playAudio("loss.mp3");
    } else {
      playAudio("win.mp3");
    }
  }, 2800);
};

  const handleReset = () => {
    setBalance(1000000);
    setBet(20000);
    setReels(["7️⃣", "7️⃣", "7️⃣"]);
    setHistory([{ spin: 0, balance: 1000000 }]);
    setLastWin(0);
    setSpinCount(0);
    setIsSpinning(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-5xl mx-auto mt-6">
        {activeTab === "player" ? (
          <PlayerTab
            balance={balance}
            bet={bet}
            setBet={setBet}
            reels={reels}
            spinCount={spinCount}
            lastWin={lastWin}
            history={history}
            isSpinning={isSpinning} // Kirim props isSpinning
            setBalance={setBalance}
            symbols={SYMBOLS}
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
    </div>
  );
}
