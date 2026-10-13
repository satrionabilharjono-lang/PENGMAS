// =====================================================================
//  BandarTab.jsx  —  panel kendali bandar + dashboard sudut pandang bandar.
//  Letakkan di: src/components/BandarTab.jsx
//  Pendukung (folder baru) : src/components/bandar/{ui,CrowdSimulation,PromoPanel,ComplianceCard}.jsx
// =====================================================================
import { Sliders, Award } from "lucide-react";
import { JACKPOT, WIN_TIERS, FREE_SPINS } from "../slotExtras";
import { Card, Stat, Insight, rupiah, pct } from "./bandar/ui";
import CrowdSimulation from "./bandar/CrowdSimulation";
import PromoPanel from "./bandar/PromoPanel";
import ComplianceCard from "./bandar/ComplianceCard";
import WithdrawQueue from "./bandar/WithdrawQueue";

const BIG = WIN_TIERS[1] ? WIN_TIERS[1].min : 15; // ambang "menang besar" untuk peringatan

export default function BandarTab({
  rtp,
  setRtp,
  baitMode,
  setBaitMode,
  forceLoss,
  setForceLoss,
  fsChance = FREE_SPINS.chancePercent,
  setFsChance = () => {},
  withdrawals = [],
  onWithdrawDecision = () => {},
  // data untuk dashboard (dikirim App.jsx)
  stats,
  spinCount = 0,
  bet = 0,
  balance = 0,
  startBalance = 1000000,
}) {
  const s = stats;
  const ggr = s ? s.wagered - s.paid : 0;
  const hold = s && s.wagered ? (ggr / s.wagered) * 100 : 0;
  const rtpActual = s && s.wagered ? (s.paid / s.wagered) * 100 : 0;
  // Perkiraan teori: peluang menang × rata-rata kelipatan menang (~1,5) + sumbangan jackpot.
  const rtpEstimate = forceLoss ? 0 : rtp * 1.5 + JACKPOT.chancePercent * JACKPOT.target;
  const playerNet = s ? s.paid - s.wagered : 0;
  const winRate = s && s.spins ? (s.wins / s.spins) * 100 : 0;
  const lostPct = s ? Math.max(0, ((startBalance - s.minBalance) / startBalance) * 100) : 0;

  const phase = forceLoss
    ? { label: "Dikunci kalah", tone: "text-red-400" }
    : baitMode && spinCount <= 4
      ? { label: "Fase umpan (spin 1–4)", tone: "text-emerald-400" }
      : { label: "Fase normal", tone: "text-amber-400" };

  // Notifikasi sistem ala dashboard operator
  const alerts = [];
  if (s && s.spins >= 10 && hold < 20)
    alerts.push(["info", `Hold bandar baru ${pct(hold)}. Masih di bawah target; data belum cukup.`]);
  if (s && s.biggestMult >= BIG)
    alerts.push(["red", `Pemain menang besar ${s.biggestMult.toFixed(0)}× taruhan. Ditandai untuk dipantau.`]);
  if (s && s.jackpots > 0) alerts.push(["red", `Jackpot keluar ${s.jackpots}×. Pantau pemain ini.`]);
  if (s && s.chaseCount >= 3)
    alerts.push(["amber", `Terdeteksi loss chasing ${s.chaseCount}×: pemain menaikkan taruhan setelah kalah.`]);
  if (s && s.spins > 0 && balance < 200000)
    alerts.push(["amber", "Saldo pemain menipis. Waktu yang tepat untuk menawarkan bonus top-up."]);
  const pendingWd = withdrawals.filter((w) => w.status === "pending");
  if (pendingWd.length > 0)
    alerts.unshift([
      "amber",
      `Ada ${pendingWd.length} permintaan penarikan menunggu keputusanmu (${rupiah(
        pendingWd.reduce((a, w) => a + w.amount, 0),
      )}). Lihat bagian Antrean Penarikan.`,
    ]);
  if (s && s.fsTriggers > 0)
    alerts.push(["green", `Free spin dipicu ${s.fsTriggers}× (${rupiah(s.fsPaid)} dibayar). Fitur ini menahan pemain bermain lebih lama.`]);
  if (s && s.nearScatter >= 2)
    alerts.push(["amber", `${s.nearScatter}× papan 'hampir free spin' (2–3 scatter). Pemain merasa dekat padahal ini pajangan.`]);
  if (s && s.topups > 0)
    alerts.push(["green", `Pemain top-up ${s.topups}× (${rupiah(s.topupAmount)}). Nilai pemain naik.`]);
  const ALERT_STYLE = {
    red: "border-red-800/60 bg-red-950/40 text-red-300",
    amber: "border-amber-700/60 bg-amber-950/30 text-amber-300",
    green: "border-emerald-700/60 bg-emerald-950/30 text-emerald-300",
    info: "border-slate-600 bg-slate-900 text-slate-300",
  };

  return (
    <div className="space-y-6">
      {/* ===== Judul ===== */}
      <div className="rounded-2xl border border-red-900/50 bg-slate-800 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sliders className="h-6 w-6 text-red-500" />
            <div>
              <h2 className="text-lg font-bold text-red-400">Panel Kendali Bandar (Dapur Algoritma)</h2>
              <p className="text-xs text-slate-400">
                Beginilah situs judol melihat pemainnya: sebagai angka, bukan manusia.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            Simulasi edukasi
          </span>
        </div>
      </div>

      {/* ===== Notifikasi sistem ===== */}
      {alerts.length > 0 && (
        <div data-testid="bandar-alerts" className="space-y-2">
          {alerts.map(([tone, text], i) => (
            <div key={i} className={`rounded-xl border px-4 py-2.5 text-xs ${ALERT_STYLE[tone]}`}>
              🔔 {text}
            </div>
          ))}
        </div>
      )}

      {/* ===== 0. Antrean penarikan (keputusan manual) ===== */}
      <WithdrawQueue withdrawals={withdrawals} onDecide={onWithdrawDecision} stats={stats} />

      {/* ===== 1. Ringkasan keuangan ===== */}
      <Card icon="💰" title="Ringkasan Keuangan" subtitle="Dihitung dari semua putaran yang sudah kamu mainkan.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Untung bandar (GGR)"
            value={rupiah(ggr)}
            tone={ggr >= 0 ? "green" : "red"}
            sub="taruhan masuk − kemenangan dibayar"
          />
          <Stat label="Total taruhan (turnover)" value={rupiah(s ? s.wagered : 0)} sub={`${s ? s.spins : 0} putaran`} />
          <Stat label="Hold bandar" value={pct(hold)} tone="amber" sub="GGR ÷ turnover" />
          <Stat
            label="RTP aktual"
            value={pct(rtpActual)}
            tone="sky"
            sub={`perkiraan dari setelan ≈ ${pct(rtpEstimate, 0)}`}
          />
        </div>
        <Insight
          house="Bandar memantau hold dan RTP aktual, bukan menang-kalah satu pemain. Di jangka pendek angkanya meleset, tapi makin banyak putaran makin mendekati rancangan."
          player="Pemain hanya melihat hasil putaran terakhirnya. Satu kemenangan besar terasa seperti 'sudah dekat', padahal total di belakang layar tetap berpihak ke bandar."
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== 2. Kontrol permainan ===== */}
        <Card icon="🎛️" title="Kontrol Permainan" subtitle="Ubah dan lihat dampaknya langsung di tab Pemain." tone="red">
          <div className="space-y-5">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-200">
                Settingan RTP (Return to Player):{" "}
                <span className="font-extrabold text-amber-400">{rtp}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={rtp}
                onChange={(e) => setRtp(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-red-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0% (Pasti Rungkad)</span>
                <span>30% (Sangat Kecil)</span>
                <span>50% (Standard Bandar)</span>
              </div>
              <p className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400">
                💡 <strong>Fakta Bandar:</strong> Bandar tidak pernah mengeset RTP 100%. Slider ini mengatur peluang
                menang tiap putaran. RTP sebenarnya (kartu di atas) ikut dipengaruhi besar kemenangan dan jackpot,
                jadi biasanya sedikit berbeda.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-200">
                Peluang Free Spin per putaran:{" "}
                <span data-testid="fs-chance-label" className="font-extrabold text-amber-400">{fsChance}%</span>
              </label>
              <input
                data-testid="fs-chance"
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={fsChance}
                onChange={(e) => setFsChance(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-amber-400"
              />
              <p className="text-[11px] text-slate-400">
                Bandar yang memutuskan kapan 4+ scatter muncul. Di slot asli ini jarang sekali terjadi.
                0% = tidak pernah.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div>
                <p className="text-sm font-bold text-slate-200">Mode "Bait Win" (Umpan Awal)</p>
                <p className="text-xs text-slate-400">Kasih menang 2-4x di awal biar pemain ketagihan</p>
              </div>
              <input
                type="checkbox"
                checked={baitMode}
                onChange={(e) => setBaitMode(e.target.checked)}
                className="h-5 w-5 cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div>
                <p className="text-sm font-bold text-red-400">Force Loss (Kunci Kekalahan Total)</p>
                <p className="text-xs text-slate-400">Matikan semua peluang menang pemain</p>
              </div>
              <input
                type="checkbox"
                checked={forceLoss}
                onChange={(e) => setForceLoss(e.target.checked)}
                className="h-5 w-5 cursor-pointer accent-red-600"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Jackpot: peluang {JACKPOT.chancePercent}% per putaran, hadiah {JACKPOT.target}× taruhan (diatur di
              slotExtras.js). Hadiah besar yang jarang keluar membuat pemain terus berharap.
            </p>
          </div>
        </Card>

        {/* ===== 3. Pemain ===== */}
        <Card icon="👤" title="Profil Pemain" subtitle="Satu pemain di mata sistem bandar.">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Nilai pemain bagi bandar"
              value={rupiah(ggr)}
              tone={ggr >= 0 ? "green" : "red"}
              sub="lifetime value pemain ini"
            />
            <Stat
              label="Posisi bersih pemain"
              value={rupiah(playerNet)}
              tone={playerNet >= 0 ? "green" : "red"}
              sub="kemenangan − taruhan"
            />
            <Stat label="Fase pemain" value={<span className={phase.tone}>{phase.label}</span>} />
            <Stat label="Win rate" value={pct(winRate)} sub={`${s ? s.wins : 0} menang dari ${s ? s.spins : 0}`} />
            <Stat
              label="Kemenangan terbesar"
              value={rupiah(s ? s.biggestWin : 0)}
              tone="amber"
              sub={s && s.biggestMult ? `${s.biggestMult.toFixed(1)}× taruhan` : "—"}
            />
            <Stat label="Jackpot kena" value={s ? s.jackpots : 0} />
          </div>
          <Insight
            house="Pemain baru diberi umpan menang kecil supaya merasa 'ini gampang'. Sesudah itu sistem kembali ke pola normal. Kemenangan besar ditandai karena mengurangi untung."
            player="Menang di awal terasa seperti bakat atau hoki. Padahal itu bagian dari skrip yang sama untuk semua pemain baru."
          />
        </Card>
      </div>

      {/* ===== 4. Perilaku pemain ===== */}
      <Card icon="📈" title="Perilaku Pemain" subtitle="Sinyal yang paling dicari bandar dari pemainnya.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Loss chasing"
            value={`${s ? s.chaseCount : 0}×`}
            tone={s && s.chaseCount >= 3 ? "red" : "slate"}
            sub="taruhan dinaikkan setelah kalah"
          />
          <Stat label="Kalah beruntun" value={s ? s.lossStreak : 0} sub={`terpanjang: ${s ? s.maxLossStreak : 0}`} />
          <Stat
            label="Modal terkikis"
            value={pct(lostPct, 0)}
            tone={lostPct >= 50 ? "red" : "slate"}
            sub={`saldo terendah ${rupiah(s ? s.minBalance : startBalance)}`}
          />
          <Stat
            label="Top-up ulang"
            value={`${s ? s.topups : 0}×`}
            tone="amber"
            sub={s && s.topups ? rupiah(s.topupAmount) : "belum pernah"}
          />
        </div>
        <Insight
          house="Pemain yang menaikkan taruhan setelah kalah dan top-up berulang adalah yang paling bernilai. Sistem sengaja menandai mereka untuk ditawari bonus."
          player="'Sekali lagi pasti balik.' Itu kekeliruan penjudi (gambler's fallacy): putaran berikutnya tidak 'berutang' kemenangan karena putaran sebelumnya kalah."
        />
      </Card>

      {/* ===== 4b. Free spin & scatter ===== */}
      <Card icon="⚡" title="Free Spin & Scatter" subtitle="Fitur 'bonus' yang dirancang agar pemain terus berharap.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Free spin dipicu" value={`${s ? s.fsTriggers : 0}×`} tone="amber" sub="4+ scatter di papan" />
          <Stat label="Free spin dimainkan" value={s ? s.fsSpins : 0} sub="putaran gratis" />
          <Stat label="Dibayar dari free spin" value={rupiah(s ? s.fsPaid : 0)} tone="green" sub="termasuk pengali menumpuk" />
          <Stat
            label="Hampir free spin"
            value={`${s ? s.nearScatter : 0}×`}
            tone={s && s.nearScatter >= 2 ? "red" : "slate"}
            sub="2–3 scatter, tanpa pemicu"
          />
        </div>
        <Insight
          house="Free spin dipicu oleh keputusan bandar, bukan oleh 'nasib'. Papan kalah sering diberi 2–3 scatter supaya pemain merasa tinggal selangkah. Di dalam free spin bola pengali menumpuk sehingga satu ronde bisa terasa seperti jackpot, padahal jarang terjadi."
          player="Melihat 3 scatter terasa seperti 'hampir dapat'. Padahal peluang dipicu sama untuk setiap putaran, tidak bertambah karena tadi hampir."
        />
      </Card>

      {/* ===== 5. Promo ===== */}
      <PromoPanel rtp={rtp} baitMode={baitMode} forceLoss={forceLoss} fsChance={fsChance} bet={bet} />

      {/* ===== 6. Simulasi banyak pemain ===== */}
      <CrowdSimulation
        rtp={rtp}
        baitMode={baitMode}
        forceLoss={forceLoss}
        fsChance={fsChance}
        bet={bet}
        startBalance={startBalance}
      />

      {/* ===== 7. Risiko & pengawasan ===== */}
      <ComplianceCard />

      {/* ===== Pesan edukasi (tetap dari versi lama) ===== */}
      <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4">
        <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-red-400">
          <Award className="h-4 w-4" /> Apa yang Harus Diajarkan ke Orang Lain dari Panel Ini?
        </h4>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
          <li>
            Judi online <strong>bukan permainan keberuntungan</strong>, melainkan sistem komputer yang hasilnya sudah
            diatur oleh pemilik server.
          </li>
          <li>
            Pemain tidak pernah bertarung melawan "nasib", melainkan melawan algoritma matematis yang tugasnya menguras
            uang.
          </li>
          <li>
            Bandar untung dari <strong>jumlah putaran</strong>, bukan dari mengalahkan satu orang. Makin lama bermain,
            makin pasti hasilnya.
          </li>
        </ul>
      </div>

      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-red-800/60 bg-red-950/40 p-10 text-center shadow-2xl shadow-red-950/50 md:p-16">
        <label className="text-3xl font-black uppercase tracking-wider text-red-500 drop-shadow-md md:text-5xl">
          Jangan judol gaesss 🚫
        </label>
      </div>
    </div>
  );
}