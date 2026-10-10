import { AlertTriangle } from "lucide-react";

// Terima props totalLoss dari App -> PlayerTab -> RealityCheck
export default function RealityCheck({ totalLoss }) {
  const lostAmount = Math.max(0, totalLoss);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <h3 className="text-md font-bold text-slate-200 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Reality Check Kerugian
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Berapa banyak barang berguna yang hilang akibat kekalahan murni dari judi:
        </p>

        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
            <span className="text-xs text-slate-300">Porsi Nasi Goreng (Rp 15rb)</span>
            <span className="text-sm font-bold text-amber-400">
              {Math.floor(lostAmount / 15000)} Porsi
            </span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
            <span className="text-xs text-slate-300">Bensin Pertalite (Liter)</span>
            <span className="text-sm font-bold text-amber-400">
              {Math.floor(lostAmount / 10000)} Liter
            </span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
            <span className="text-xs text-slate-300">Bayar Kontrakan/Kost (Rp 500rb)</span>
            <span className="text-sm font-bold text-amber-400">
              {(lostAmount / 500000).toFixed(1)} Bulan
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-[11px] text-red-300">
        <strong>Catatan Edukasi:</strong> Algoritma judol didesain agar pemain merasakan
        "hampir menang" (Near-Miss) untuk memicu dopamin dan membuat mereka terus melakukan <i>deposit</i>.
      </div>
    </div>
  );
}