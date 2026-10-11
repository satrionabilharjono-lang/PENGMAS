// =====================================================================
//  bandarSim.js  —  simulasi BANYAK pemain sekaligus memakai engine & aturan
//  bandar yang sama dengan permainan. Berjalan bertahap supaya layar tidak macet.
//  Letakkan di: src/bandarSim.js
// =====================================================================
import { getWinTier } from "./slotEngine";
import { rollSpin } from "./bandarLogic";

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * players, spins   : jumlah pemain & maksimal putaran per pemain
 * bet, startBalance: taruhan tetap & modal awal tiap pemain
 * rtp, bait, forceLoss, fsChance : setelan bandar (fsChance = peluang free spin, persen)
 * turnoverTarget   : (opsional) pemain berhenti begitu total taruhannya mencapai angka ini
 * onProgress(0..1), shouldCancel() : kontrol dari UI
 * Mengembalikan null bila dibatalkan.
 */
export async function runCrowdSim({
  players,
  spins,
  bet,
  startBalance,
  rtp,
  bait,
  forceLoss,
  fsChance,
  turnoverTarget = Infinity,
  samplePlayers = 5,
  onProgress,
  shouldCancel,
}) {
  const bal = new Float64Array(players).fill(startBalance);
  const wag = new Float64Array(players);
  const played = new Int32Array(players);
  const alive = new Uint8Array(players).fill(1);
  const houseCum = new Float64Array(spins);
  const active = new Int32Array(spins);
  const paths = Array.from({ length: Math.min(samplePlayers, players) }, () => []);
  let totalWag = 0;
  let totalPaid = 0;
  let wins = 0;
  let spinsPlayed = 0;
  let biggest = 0;
  let jackpots = 0;
  let fsTriggers = 0;
  let fsPaid = 0;
  let t0 = performance.now();

  for (let r = 0; r < spins; r++) {
    let act = 0;
    for (let p = 0; p < players; p++) {
      if (!alive[p]) continue;
      if (bal[p] < bet || wag[p] >= turnoverTarget) {
        alive[p] = 0;
        continue;
      }
      played[p] += 1;
      // Satu putaran penuh: papan utama + (bila dipicu) seluruh ronde free spin.
      const { result, round, totalX } = rollSpin({
        spinNo: played[p],
        stake: bet,
        rtp,
        bait,
        forceLoss,
        fsChance,
      });
      const baseWin = Math.round(result.payout * bet);
      const fsWin = round ? Math.round(round.total * bet) : 0;
      const win = baseWin + fsWin;
      bal[p] += win - bet;
      wag[p] += bet;
      totalWag += bet;
      totalPaid += win;
      spinsPlayed += 1;
      act += 1;
      if (win > 0) wins += 1;
      if (win > biggest) biggest = win;
      if (round) {
        fsTriggers += 1;
        fsPaid += fsWin;
      }
      const tier = win > 0 ? getWinTier(totalX) : null;
      if (tier && tier.jackpot) jackpots += 1;

      if (performance.now() - t0 > 25) {
        if (onProgress) onProgress((r + p / players) / spins);
        await tick();
        if (shouldCancel && shouldCancel()) return null;
        t0 = performance.now();
      }
    }
    houseCum[r] = totalWag - totalPaid;
    active[r] = act;
    paths.forEach((path, i) => path.push(bal[i]));
    if (act === 0) {
      // semua pemain sudah berhenti: sisa putaran datar
      for (let k = r + 1; k < spins; k++) {
        houseCum[k] = houseCum[r];
        paths.forEach((path, i) => path.push(bal[i]));
      }
      break;
    }
  }
  if (onProgress) onProgress(1);

  const finals = Array.from(bal);
  const n = players;
  const ggr = totalWag - totalPaid;
  const lossSum = finals.reduce((a, b) => a + (startBalance - b), 0);
  return {
    players: n,
    spins,
    bet,
    startBalance,
    wagered: totalWag,
    paid: totalPaid,
    ggr,
    hold: totalWag ? (ggr / totalWag) * 100 : 0,
    rtpActual: totalWag ? (totalPaid / totalWag) * 100 : 0,
    spinsPlayed,
    winRate: spinsPlayed ? (wins / spinsPlayed) * 100 : 0,
    biggest,
    jackpots,
    fsTriggers,
    fsPaid,
    finals,
    profitable: finals.filter((b) => b > startBalance).length,
    busted: finals.filter((b) => b < bet).length,
    avgLoss: lossSum / n,
    houseCum: Array.from(houseCum),
    paths,
    cleared: finals.filter((_, i) => wag[i] >= turnoverTarget).length,
    clearedPayout: finals.reduce((a, b, i) => a + (wag[i] >= turnoverTarget ? b : 0), 0),
  };
}