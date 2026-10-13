// =====================================================================
//  WalletPanel.jsx  —  tarik saldo dari saldo top up ke DOMPET.
//  Penarikan tidak langsung cair: harus disetujui bandar (tab Bandar).
//  Letakkan di: src/components/WalletPanel.jsx
// =====================================================================
import { useState } from "react";
import { WITHDRAW } from "../slotExtras";

const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

const STATUS = {
  pending: { label: "Menunggu persetujuan bandar", tone: "border-amber-500/50 bg-amber-500/10 text-amber-300", icon: "⏳" },
  approved: { label: "Disetujui, masuk dompet", tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300", icon: "✅" },
  rejected: { label: "Ditolak", tone: "border-red-500/50 bg-red-500/10 text-red-300", icon: "⛔" },
};

export default function WalletPanel({ balance, withdrawals, onRequest, busy }) {
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null); // { type: "ok" | "err", text }

  const submit = () => {
    const r = onRequest(amount);
    if (r.ok) {
      setMsg({ type: "ok", text: "Permintaan terkirim. Dana ditahan sampai bandar memutuskan." });
      setAmount("");
    } else {
      setMsg({ type: "err", text: r.error });
    }
  };

  const pending = withdrawals.filter((w) => w.status === "pending");

  return (
    <div data-testid="wallet-panel" className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-100">💼 Tarik Saldo ke Dompet</h3>
          <p className="text-xs text-slate-400">
            Saldo top up baru jadi uangmu setelah <strong>disetujui bandar</strong>. Bandar bebas menyetujui atau
            menolak, kapan saja.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            {pending.length} menunggu · {rp(pending.reduce((a, w) => a + w.amount, 0))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-400">
            Jumlah penarikan (maks {rp(balance)})
          </label>
          <input
            data-testid="wd-amount"
            type="number"
            min={WITHDRAW.min}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`min ${WITHDRAW.min.toLocaleString("id-ID")}`}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-amber-400"
          />
        </div>
        {WITHDRAW.quick.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(Math.min(q, Math.floor(balance))))}
            className="rounded-lg border border-slate-600 px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            {q >= 1000000 ? `${q / 1000000} jt` : `${q / 1000} rb`}
          </button>
        ))}
        <button
          onClick={() => setAmount(String(Math.floor(balance)))}
          className="rounded-lg border border-slate-600 px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
        >
          Semua
        </button>
        <button
          data-testid="wd-submit"
          onClick={submit}
          disabled={busy}
          title={busy ? "Tunggu putaran selesai" : ""}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-extrabold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ajukan penarikan
        </button>
      </div>

      {msg && (
        <p
          data-testid="wd-msg"
          className={`mt-2 text-xs ${msg.type === "ok" ? "text-emerald-300" : "text-red-300"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-5">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Riwayat penarikan</h4>
        {withdrawals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            Belum ada penarikan.
          </p>
        ) : (
          <ul data-testid="wd-list" className="space-y-2">
            {withdrawals.slice(0, 8).map((w) => {
              const st = STATUS[w.status];
              return (
                <li key={w.id} data-testid="wd-item" data-status={w.status} className={`rounded-xl border px-4 py-3 ${st.tone}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold tabular-nums">{rp(w.amount)}</span>
                    <span className="text-xs font-bold">
                      {st.icon} {st.label}
                    </span>
                  </div>
                  {w.status === "rejected" && (
                    <p className="mt-1 text-xs">
                      Alasan: {w.reason}.{" "}
                      <strong>{w.seized ? "Dana disita bandar dan tidak kembali." : "Dana dikembalikan ke saldo top up."}</strong>
                    </p>
                  )}
                  {w.status === "pending" && (
                    <p className="mt-1 text-[11px] opacity-80">Tidak ada batas waktu. Dana tertahan sampai bandar memutuskan.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}