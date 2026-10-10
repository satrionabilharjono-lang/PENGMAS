import { Sliders, Award } from "lucide-react";

export default function BandarTab({
  rtp,
  setRtp,
  baitMode,
  setBaitMode,
  forceLoss,
  setForceLoss,
}) {
  return (
    <div className="bg-slate-800 border border-red-900/50 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4 mb-6">
        <Sliders className="w-6 h-6 text-red-500" />
        <div>
          <h2 className="text-lg font-bold text-red-400">
            Panel Kendali Bandar (Dapur Algoritma)
          </h2>
          <p className="text-xs text-slate-400">
            Ubah persentase kemenangan dan manipulasi logika pemain secara
            langsung
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Settings RTP */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-200">
            Settingan RTP (Return to Player):{" "}
            <span className="text-amber-400 font-extrabold">{rtp}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={rtp}
            onChange={(e) => setRtp(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Pasti Rungkad)</span>
            <span>30% (Sangat Kecil)</span>
            <span>50% (Standard Bandar)</span>
          </div>
          <p className="text-xs text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-700">
            💡 <strong>Fakta Bandar:</strong> Bandar tidak pernah mengeset RTP
            100%. RTP 30% artinya dari Rp 100rb uang pemain, Bandar menyedot Rp
            70rb sebagai keuntungan bersih.
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-200">
                Mode "Bait Win" (Umpan Awal)
              </p>
              <p className="text-xs text-slate-400">
                Kasih menang 2-4x di awal biar pemain ketagihan
              </p>
            </div>
            <input
              type="checkbox"
              checked={baitMode}
              onChange={(e) => setBaitMode(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
            <div>
              <p className="text-sm font-bold text-red-400">
                Force Loss (Kunci Kekalahan Total)
              </p>
              <p className="text-xs text-slate-400">
                Matikan semua peluang menang pemain
              </p>
            </div>
            <input
              type="checkbox"
              checked={forceLoss}
              onChange={(e) => setForceLoss(e.target.checked)}
              className="w-5 h-5 accent-red-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-red-950/30 border border-red-800/50 rounded-xl">
        <h4 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-2">
          <Award className="w-4 h-4" /> Apa yang Harus Diajarkan ke Orang Lain
          dari Panel Ini?
        </h4>
        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
          <li>
            Judi online <strong>bukan permainan keberuntungan</strong>,
            melainkan sistem komputer yang hasilnya sudah diatur oleh pemilik
            server.
          </li>
          <li>
            Pemain tidak pernah bertarung melawan "nasib", melainkan melawan
            algoritma matematis yang tugasnya menguras uang.
          </li>
        </ul>
      </div>
      <div className="mt-8 p-10 md:p-16 bg-red-950/40 border-2 border-red-800/60 rounded-2xl text-center min-h-[200px] flex items-center justify-center shadow-2xl shadow-red-950/50">
        <label className="text-3xl md:text-5xl font-black text-red-500 tracking-wider uppercase drop-shadow-md">
          Jangan judol gaesss 🚫
        </label>
      </div>
    </div>
  );
}
