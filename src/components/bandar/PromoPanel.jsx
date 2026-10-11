// =====================================================================
//  PromoPanel.jsx  —  bonus & syarat turnover (wagering).
//  Letakkan di: src/components/bandar/PromoPanel.jsx
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { runCrowdSim } from "../../bandarSim";
import { Card, Stat, Insight, NumberField, rupiah, pct } from "./ui";

export default function PromoPanel({ rtp, baitMode, forceLoss, fsChance, bet }) {
  const [bonus, setBonus] = useState(100000);
  const [mult, setMult] = useState(25);
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState(null);
  const aliveRef = useRef(true);
  // diaktifkan lagi saat mount (StrictMode: mount → cleanup → mount)
  useEffect(() => {
    aliveRef.current = true;
    return () => void (aliveRef.current = false);
  }, []);

  const B = Math.max(0, Number(bonus) || 0);
  const M = Math.max(1, Number(mult) || 1);
  const turnover = B * M;
  const spinsNeeded = bet > 0 ? Math.ceil(turnover / bet) : 0;

  const run = async () => {
    if (running || !B || !bet) return;
    setRunning(true);
    setRes(null);
    const players = 400;
    const r = await runCrowdSim({
      players,
      spins: spinsNeeded + 2,
      bet,
      startBalance: B,
      rtp,
      bait: baitMode,
      forceLoss,
      fsChance,
      turnoverTarget: turnover,
      shouldCancel: () => !aliveRef.current,
    });
    if (!aliveRef.current) return;
    setRes(r && { ...r, players, bonus: B, turnover });
    setRunning(false);
  };

  const tooBig = spinsNeeded * 400 > 400000;

  return (
    <Card
      icon="🎁"
      title="Bonus & Syarat Turnover"
      subtitle="Bonus terlihat murah hati, tapi syaratnya yang membuat bandar tetap untung."
    >
      <div className="grid items-end gap-3 sm:grid-cols-4">
        <NumberField label="Nilai bonus" value={bonus} onChange={setBonus} min={0} step={10000} suffix="Rp" disabled={running} />
        <NumberField label="Syarat turnover" value={mult} onChange={setMult} min={1} max={100} suffix="×" disabled={running} />
        <Stat label="Harus ditaruhkan" value={rupiah(turnover)} sub={`≈ ${spinsNeeded.toLocaleString("id-ID")} putaran @ ${rupiah(bet)}`} tone="amber" />
        <button
          data-testid="promo-run"
          onClick={run}
          disabled={running || !B || tooBig}
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-amber-400 disabled:opacity-40"
        >
          {running ? "Menghitung…" : "Hitung peluang lolos"}
        </button>
      </div>
      {tooBig && (
        <p className="mt-2 text-[11px] text-amber-400">
          Syarat terlalu besar untuk dihitung di browser. Kecilkan syarat atau naikkan taruhan.
        </p>
      )}

      {res && (
        <div data-testid="promo-result" className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Lolos syarat"
              value={pct((res.cleared / res.players) * 100)}
              tone="red"
              sub={`${res.cleared} dari ${res.players} pemain`}
            />
            <Stat
              label="Bonus yang bisa ditarik"
              value={rupiah(res.clearedPayout / res.players)}
              sub={`rata-rata per pemain dari bonus ${rupiah(res.bonus)}`}
              tone="amber"
            />
            <Stat
              label="Bonus kembali ke bandar"
              value={rupiah(res.bonus - res.clearedPayout / res.players)}
              sub="rata-rata per bonus"
              tone="green"
            />
            <Stat label="Pemain habis modal" value={pct((res.busted / res.players) * 100)} tone="red" sub="sebelum syarat terpenuhi" />
          </div>
          <Insight
            house={`Bonus ${rupiah(res.bonus)} dengan syarat ${M}× berarti pemain harus memutar ${rupiah(
              res.turnover,
            )}. Selama itu, keunggulan bandar menggerus sebagian besar bonus. Bonus jadi alat menahan pemain, bukan hadiah.`}
            player={`"Dapat bonus gratis!" Yang tidak terlihat: hanya ${pct(
              (res.cleared / res.players) * 100,
            )} yang berhasil menarik, dan sepanjang jalan mereka terus menekan tombol spin.`}
          />
        </div>
      )}
    </Card>
  );
}