import { ShieldAlert, DollarSign, Cpu } from "lucide-react";

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400 flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-amber-500" /> Simulasi & Edukasi Judol
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Membongkar Rahasia Dapur Bandar & Kepastian Kekalahan Pemain
        </p>
      </div>

      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
        <button
          onClick={() => setActiveTab("player")}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "player"
              ? "bg-amber-500 text-slate-950 shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" /> Tampilan Korban (Pemain)
        </button>
        <button
          onClick={() => setActiveTab("bandar")}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "bandar"
              ? "bg-red-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Cpu className="w-4 h-4" /> Ruang Kontrol Bandar
        </button>
      </div>
    </header>
  );
}