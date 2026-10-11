// =====================================================================
//  CrowdSimulation.jsx  —  simulasi ribuan pemain sekaligus.
//  Menunjukkan: pemain individu bisa menang, tapi bandar selalu untung di total.
//  Letakkan di: src/components/bandar/CrowdSimulation.jsx
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { runCrowdSim } from "../../bandarSim";
import { Card, Stat, Insight, LineChart, Histogram, NumberField, rupiah, pct } from "./ui";

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(v) || lo)));
const PATH_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#94a3b8"];

export default function CrowdSimulation({ rtp, baitMode, forceLoss, fsChance, bet, startBalance }) {
  const [players, setPlayers] = useState(1000);
  const [spins, setSpins] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [cac, setCac] = useState(150000);
  const runId = useRef(0); // nomor putaran simulasi; naik = simulasi lama dibatalkan
  const aliveRef = useRef(true);

  // aliveRef harus diaktifkan lagi di sini: StrictMode menjalankan mount → cleanup → mount.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      runId.current += 1;
    };
  }, []);

  const run = async () => {
    if (running) return;
    const id = ++runId.current;
    setRunning(true);
    setProgress(0);
    setResult(null);
    const res = await runCrowdSim({
      players: clampInt(players, 10, 5000),
      spins: clampInt(spins, 5, 500),
      bet,
      startBalance,
      rtp,
      bait: baitMode,
      forceLoss,
      fsChance,
      onProgress: (p) => aliveRef.current && id === runId.current && setProgress(p),
      shouldCancel: () => id !== runId.current,
    });
    if (!aliveRef.current || id !== runId.current) return;
    if (res) setResult(res);
    setRunning(false);
  };

  const cancel = () => {
    runId.current += 1;
    setRunning(false);
  };

  const bins = useMemo(() => {
    if (!result) return [];
    const start = result.startBalance;
    const edges = [
      ["0–10%", 0, 0.1],
      ["10–30%", 0.1, 0.3],
      ["30–60%", 0.3, 0.6],
      ["60–100%", 0.6, 1],
      ["100–150%", 1, 1.5],
      ["150–250%", 1.5, 2.5],
      [">250%", 2.5, Infinity],
    ];
    return edges.map(([label, lo, hi]) => ({
      label,
      count: result.finals.filter((b) => b / start >= lo && b / start < hi).length,
      color: lo >= 1 ? "#34d399" : "#f87171",
    }));
  }, [result]);

  const r = result;
  const cacNum = Number(cac) || 0;
  const roi = r && cacNum > 0 ? ((r.avgLoss - cacNum) / cacNum) * 100 : null;

  return (
    <Card
      icon="🧪"
      title="Simulasi Ribuan Pemain"
      subtitle="Satu pemain bisa beruntung. Ribuan pemain? Matematikanya selalu menang."
    >
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4">
        <NumberField
          label="Jumlah pemain"
          value={players}
          onChange={setPlayers}
          min={10}
          max={5000}
          disabled={running}
        />
        <NumberField
          label="Putaran per pemain"
          value={spins}
          onChange={setSpins}
          min={5}
          max={500}
          disabled={running}
        />
        <div className="col-span-2 text-[11px] leading-snug text-slate-400">
          Modal tiap pemain {rupiah(startBalance)}, taruhan {rupiah(bet)} per putaran, memakai setelan
          bandar di atas (peluang menang {rtp}%, free spin {fsChance}%, umpan {baitMode ? "aktif" : "mati"}
          {forceLoss ? ", force loss aktif" : ""}). Pemain berhenti kalau modalnya habis.
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!running ? (
          <button
            data-testid="crowd-run"
            onClick={run}
            className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-violet-400"
          >
            ▶ Jalankan simulasi
          </button>
        ) : (
          <button
            onClick={cancel}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-red-500"
          >
            ■ Batalkan
          </button>
        )}
        {running && (
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-violet-400 transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{Math.round(progress * 100)}%</p>
          </div>
        )}
      </div>

      {r && (
        <div data-testid="crowd-result" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat
              label="Untung bandar (GGR)"
              value={rupiah(r.ggr)}
              tone={r.ggr >= 0 ? "green" : "red"}
              sub={`dari ${r.spinsPlayed.toLocaleString("id-ID")} putaran`}
            />
            <Stat label="Hold bandar" value={pct(r.hold)} tone="amber" sub="porsi taruhan yang jadi milik bandar" />
            <Stat label="RTP aktual" value={pct(r.rtpActual)} tone="sky" sub={`setelan: ${rtp}%`} />
            <Stat
              label="Pemain yang untung"
              value={pct((r.profitable / r.players) * 100)}
              tone="red"
              sub={`${r.profitable} dari ${r.players} pemain`}
            />
            <Stat label="Pemain bangkrut" value={pct((r.busted / r.players) * 100)} tone="red" sub="saldo tak cukup untuk 1 taruhan" />
            <Stat label="Rata-rata kehilangan" value={rupiah(r.avgLoss)} sub="per pemain" tone="red" />
            <Stat label="Menang terbesar" value={rupiah(r.biggest)} sub="satu putaran" tone="amber" />
            <Stat label="Jackpot keluar" value={r.jackpots} sub="dari seluruh simulasi" />
            <Stat
              label="Free spin dipicu"
              value={r.fsTriggers}
              sub={`${pct(r.paid ? (r.fsPaid / r.paid) * 100 : 0)} dari total bayaran`}
              tone="amber"
            />
            <Stat label="Putaran dimainkan" value={r.spinsPlayed.toLocaleString("id-ID")} sub="semua pemain" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-bold text-emerald-400">Kurva keuntungan bandar</h4>
              <LineChart
                series={[{ name: "Keuntungan kumulatif bandar", color: "#34d399", bold: true, values: r.houseCum }]}
                yFormat={(v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`)}
                xLabel="putaran ke-"
              />
              <p className="mt-1 text-[11px] text-slate-400">Naik halus dan stabil, nyaris tanpa turun.</p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-sky-300">5 pemain acak</h4>
              <LineChart
                series={r.paths.map((values, i) => ({
                  name: `Pemain ${i + 1}`,
                  color: PATH_COLORS[i % PATH_COLORS.length],
                  values,
                }))}
                yFormat={(v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`)}
                xLabel="putaran ke-"
              />
              <p className="mt-1 text-[11px] text-slate-400">Naik-turun liar, tapi kebanyakan menukik ke bawah.</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-200">
              Sisa saldo semua pemain (dibanding modal awal)
            </h4>
            <Histogram bins={bins} />
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h4 className="mb-3 text-sm font-bold text-slate-200">💸 Biaya iklan vs nilai pemain</h4>
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <NumberField
                label="Biaya iklan per pemain baru"
                value={cac}
                onChange={setCac}
                min={0}
                step={10000}
                suffix="Rp"
              />
              <Stat label="Nilai rata-rata pemain" value={rupiah(r.avgLoss)} sub="kehilangan rata-rata" tone="green" />
              <Stat
                label="Balik modal iklan"
                value={roi === null ? "—" : `${roi >= 0 ? "+" : ""}${roi.toFixed(0)}%`}
                tone={roi !== null && roi >= 0 ? "green" : "red"}
                sub="bandar untung bila positif"
              />
            </div>
          </div>

          <Insight
            house={`Dari ${r.players} pemain, bandar tidak peduli siapa yang menang. Total taruhan ${rupiah(
              r.wagered,
            )}, dibayarkan ${rupiah(r.paid)}, sisanya ${rupiah(r.ggr)} jadi untung. Hasil ini bisa diprediksi dari rumus, bukan dari keberuntungan.`}
            player={`Tiap pemain merasa "tinggal sedikit lagi". Ada ${r.profitable} pemain yang untung dan cerita merekalah yang menyebar, padahal ${r.busted} pemain lain bangkrut dan tidak bercerita.`}
          />
        </div>
      )}
    </Card>
  );
}