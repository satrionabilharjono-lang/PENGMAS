// =====================================================================
//  bandarLogic.js  —  keputusan bandar + statistik, dipakai bersama oleh
//  App.jsx (permainan asli) dan bandarSim.js (simulasi banyak pemain),
//  supaya aturannya SAMA PERSIS di kedua tempat.
//  Letakkan di: src/bandarLogic.js
// =====================================================================
import { JACKPOT, FREE_SPINS } from "./slotExtras";
import { buildSpinResult, buildFreeSpinRound, pickTriggerScatters } from "./slotEngine";

/**
 * Putuskan menang/kalah + target kelipatan untuk satu spin.
 * Juga memutuskan apakah putaran ini MEMICU FREE SPIN (feature = true).
 * fsChance (persen) opsional: bila kosong dipakai FREE_SPINS.chancePercent.
 */
export function decideOutcome({ spinNo, rtp, bait, forceLoss, fsChance, rand = Math.random }) {
  // 0. Jackpot (dimatikan oleh Force Loss)
  if (!forceLoss && JACKPOT.chancePercent > 0 && rand() * 100 < JACKPOT.chancePercent) {
    return { wantWin: true, target: JACKPOT.target, jackpot: true, feature: false };
  }
  // Free spin dipicu lebih dulu (tidak berlaku saat Force Loss); menang/kalah papan pemicu
  // tetap mengikuti aturan di bawah.
  const chance = fsChance ?? FREE_SPINS.chancePercent;
  const feature = !forceLoss && chance > 0 && rand() * 100 < chance;

  // 1. Umpan awal (spin 1-4) / umpan tengah
  const middleBait =
    bait && spinNo > 4 && (spinNo % 6 === 0 || spinNo % 9 === 0) && rand() < 0.5;
  if ((bait && spinNo <= 4) || middleBait) {
    return { wantWin: true, target: spinNo <= 4 ? 2 : 1.3, feature };
  }
  // 2. Murni sesuai setelan bandar
  if (!forceLoss && rand() * 100 < rtp) return { wantWin: true, target: 1.5, feature };
  return { wantWin: false, target: 1.5, feature };
}

/**
 * Jalankan SATU putaran penuh: keputusan bandar -> papan -> (bila dipicu) ronde free spin.
 * Dipakai oleh App.jsx dan simulasi, supaya angkanya sama persis.
 * @returns { result, round, totalX, jackpot }
 *   result : papan putaran utama   round : ronde free spin (atau null)
 *   totalX : total menang (× taruhan) = putaran utama + seluruh free spin
 */
export function rollSpin({ spinNo, stake = 0, rtp, bait, forceLoss, fsChance, rand = Math.random }) {
  const d = decideOutcome({ spinNo, rtp, bait, forceLoss, fsChance, rand });
  const result = {
    ...buildSpinResult({
      win: d.wantWin,
      target: d.target,
      scatters: d.feature ? pickTriggerScatters(rand) : undefined,
    }),
    bet: stake,
  };
  const round = result.trigger
    ? buildFreeSpinRound({ basePayout: result.payout, rng: rand })
    : null;
  if (round) round.spins.forEach((p) => (p.bet = stake));
  return {
    result,
    round,
    totalX: result.payout + (round ? round.total : 0),
    jackpot: !!d.jackpot,
  };
}

/** Statistik awal pemain (dibaca tab Bandar). */
export const initialStats = (startBalance = 1000000) => ({
  spins: 0,
  wins: 0,
  wagered: 0, // total taruhan masuk (turnover)
  paid: 0, // total kemenangan yang dibayar bandar
  biggestWin: 0,
  biggestMult: 0,
  jackpots: 0,
  lossStreak: 0,
  maxLossStreak: 0,
  chaseCount: 0, // berapa kali pemain menaikkan taruhan setelah kalah
  minBalance: startBalance,
  prevLoss: false,
  prevStake: 0,
  topups: 0,
  topupAmount: 0,
  fsTriggers: 0, // berapa kali free spin dipicu
  fsPaid: 0, // total kemenangan dari free spin (Rp)
  fsSpins: 0, // total free spin yang dimainkan
  nearScatter: 0, // papan 'hampir free spin' (2-3 scatter, tanpa pemicu)
});

/** Catat satu putaran ke statistik (fungsi murni). */
export function recordSpin(s, { stake, win, balanceAfter, jackpot, scatters = 0, fsTriggered = false, fsPaid = 0, fsSpins = 0 }) {
  const isWin = win > 0;
  const streak = isWin ? 0 : s.lossStreak + 1;
  return {
    ...s,
    spins: s.spins + 1,
    wins: s.wins + (isWin ? 1 : 0),
    wagered: s.wagered + stake,
    paid: s.paid + win,
    biggestWin: Math.max(s.biggestWin, win),
    biggestMult: Math.max(s.biggestMult, stake ? win / stake : 0),
    jackpots: s.jackpots + (jackpot ? 1 : 0),
    lossStreak: streak,
    maxLossStreak: Math.max(s.maxLossStreak, streak),
    chaseCount: s.chaseCount + (s.prevLoss && stake > s.prevStake ? 1 : 0),
    minBalance: Math.min(s.minBalance, balanceAfter),
    prevLoss: !isWin,
    prevStake: stake,
    fsTriggers: s.fsTriggers + (fsTriggered ? 1 : 0),
    fsPaid: s.fsPaid + fsPaid,
    fsSpins: s.fsSpins + fsSpins,
    nearScatter:
      s.nearScatter + (!fsTriggered && scatters >= Math.max(2, FREE_SPINS.triggerCount - 2) ? 1 : 0),
  };
}

/** Catat top-up manual pemain. */
export const recordTopup = (s, amount) =>
  amount > 0 ? { ...s, topups: s.topups + 1, topupAmount: s.topupAmount + amount } : s;