import React from "react";
import { motion } from "framer-motion";
export default function SlotMachine({
  reels,
  lastWin,
  spinCount,
  bet,
  isSpinning,
  symbols,
}) {
  return (
    <div className="flex gap-4 my-6 bg-slate-950 p-6 rounded-2xl border-4 border-amber-500/30 shadow-inner">
      {reels.map((symbol, idx) => (
        <div
          key={idx}
          className="w-20 h-24 bg-slate-900 border-2 border-slate-700 rounded-xl flex items-center justify-center text-5xl shadow-md overflow-hidden relative"
        >
          <motion.div
            key={isSpinning ? `spinning-${idx}` : `stopped-${symbol}-${idx}`}
            initial={{ y: isSpinning ? -120 : -50, opacity: 0.5 }}
            animate={
              isSpinning
                ? {
                    y: [-120, 0], // Menggeser deretan simbol dari atas ke bawah
                  }
                : {
                    y: 0,
                    opacity: 1,
                  }
            }
            transition={
              isSpinning
                ? {
                    repeat: Infinity,
                    duration: 0.15, // Makin kecil makin cepat pergantiannya
                    ease: "linear",
                  }
                : {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: idx * 0.15, // Berhenti sekuensial
                  }
            }
            className={
              isSpinning
                ? "flex flex-col gap-6 items-center filter blur-[4px]"
                : ""
            }
          >
            {/* BUKAN HANYA {symbol}, TAPI RENDER DERETAN SIMBOL SAAT SPINNING */}
            {isSpinning ? (
              <>
                <div>{symbols[Math.floor(Math.random() * symbols.length)]}</div>
                <div>{symbols[Math.floor(Math.random() * symbols.length)]}</div>
                <div>{symbols[Math.floor(Math.random() * symbols.length)]}</div>
              </>
            ) : (
              <div>{symbol}</div>
            )}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
