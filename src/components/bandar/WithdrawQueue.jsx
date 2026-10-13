// =====================================================================
//  WithdrawQueue.jsx  —  antrean penarikan: bandar menyetujui / menolak MANUAL.
//  Letakkan di: src/components/bandar/WithdrawQueue.jsx
// =====================================================================
import { useState } from "react";
import { WITHDRAW } from "../../slotExtras";
import { Card, Stat, Insight, rupiah } from "./ui";

const timeOf = (t) =>
  new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function WithdrawQueue({ withdrawals, onDecide, stats }) {
  const [rejecting, setRejecting] = useState(null); // id yang sedang ditolak
  const [reason, setReason] = useState(WITHDRAW.rejectReasons[0]);
  const [seize, setSeize] = useState(false);

  const sum = (fn) => withdrawals.filter(fn).reduce((a, w) => a + w.amount, 0);
  const pending = withdrawals.filter((w) => w.status === "pending");
  const done = withdrawals.filter((w) => w.status !== "pending");
  const approvedSum = sum((w) => w.status === "approved");
  const returnedSum = sum((w) => w.status === "rejected" && !w.seized);
  const seizedSum = sum((w) => w.status === "rejected" && w.seized);

  const openReject = (id) => {
    setRejecting(id);
    setReason(WITHDRAW.rejectReasons[0]);
    setSeize(false);
  };

  const confirmReject = (id) => {
    onDecide(id, { action: "reject", reason, seize });
    setRejecting(null);
  };

  return (
    <Card
      icon="🏧"
      title="Antrean Penarikan"
      subtitle="Uang pemain hanya keluar kalau kamu menyetujuinya. Keputusan sepenuhnya di tanganmu."
      tone="red"
      right={
        pending.length > 0 ? (
          <span
            data-testid="wd-pending-badge"
            className="rounded-full border border-amber-500/60 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300"
          >
            {pending.length} menunggu
          </span>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Menunggu" value={rupiah(sum((w) => w.status === "pending"))} tone="amber" sub={`${pending.length} permintaan`} />
        <Stat label="Dibayar ke pemain" value={rupiah(approvedSum)} tone="red" sub="keluar dari kas bandar" />
        <Stat label="Ditolak, dikembalikan" value={rupiah(returnedSum)} sub="kembali ke saldo top up" />
        <Stat label="Disita bandar" value={rupiah(seizedSum)} tone="green" sub="tambahan untung, tak pernah dibayar" />
      </div>

      {stats && stats.spins > 0 && (
        <p className="mt-3 text-[11px] text-slate-400">
          Catatan pemain: total taruhan {rupiah(stats.wagered)}, total kemenangan {rupiah(stats.paid)}, posisi bersih{" "}
          <span className={stats.paid - stats.wagered >= 0 ? "text-emerald-400" : "text-red-400"}>
            {rupiah(stats.paid - stats.wagered)}
          </span>
          .
        </p>
      )}

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-bold text-slate-200">Menunggu keputusan</h4>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            Tidak ada permintaan. Ajukan penarikan dari tab Pemain.
          </p>
        ) : (
          <ul data-testid="wdq-pending" className="space-y-2">
            {pending.map((w) => (
              <li key={w.id} data-testid="wdq-item" className="rounded-xl border border-amber-500/40 bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black tabular-nums text-amber-300">{rupiah(w.amount)}</p>
                    <p className="text-[11px] text-slate-400">
                      diajukan {timeOf(w.at)} · setelah putaran ke-{w.spinNo}
                    </p>
                  </div>
                  {rejecting !== w.id && (
                    <div className="flex gap-2">
                      <button
                        data-testid="wdq-approve"
                        onClick={() => onDecide(w.id, { action: "approve" })}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
                      >
                        ✓ Setujui
                      </button>
                      <button
                        data-testid="wdq-reject"
                        onClick={() => openReject(w.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-500"
                      >
                        ✕ Tolak
                      </button>
                    </div>
                  )}
                </div>

                {rejecting === w.id && (
                  <div className="mt-3 space-y-3 rounded-lg border border-red-800/60 bg-red-950/30 p-3">
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-400">
                        Alasan penolakan (tampil di layar pemain)
                      </label>
                      <select
                        data-testid="wdq-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                      >
                        {WITHDRAW.rejectReasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                      <input
                        data-testid="wdq-seize"
                        type="checkbox"
                        checked={seize}
                        onChange={(e) => setSeize(e.target.checked)}
                        className="h-4 w-4 accent-red-600"
                      />
                      Sita dana (hangus, tidak dikembalikan ke saldo top up)
                    </label>
                    <div className="flex gap-2">
                      <button
                        data-testid="wdq-confirm-reject"
                        onClick={() => confirmReject(w.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-500"
                      >
                        Konfirmasi tolak
                      </button>
                      <button
                        onClick={() => setRejecting(null)}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-bold text-slate-200">Sudah diputuskan</h4>
          <ul data-testid="wdq-done" className="space-y-1.5">
            {done.slice(0, 8).map((w) => (
              <li
                key={w.id}
                data-testid="wdq-done-item"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
              >
                <span className="font-bold tabular-nums text-slate-200">{rupiah(w.amount)}</span>
                <span
                  className={
                    w.status === "approved" ? "text-emerald-400" : w.seized ? "text-red-400" : "text-amber-300"
                  }
                >
                  {w.status === "approved"
                    ? "Disetujui"
                    : `Ditolak: ${w.reason}${w.seized ? " · disita" : " · dikembalikan"}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Insight
        house="Pemain tidak bisa memaksa. Menyetujui berarti uang nyata keluar dari kas, menolak berarti uang tetap milik bandar. Alasan penolakan tinggal dipilih dan tidak perlu bukti apa pun."
        player="Saldo yang menang terasa seperti uang sendiri, padahal baru angka di layar. Baru jadi uang kalau bandar menekan 'Setujui', dan kapan atau apakah itu terjadi bukan keputusan pemain."
      />
    </Card>
  );
}