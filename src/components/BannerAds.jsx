// 1. KOMPONEN PINTAR: Otomatis deteksi Format Video vs Gambar
function AdCard({ src, label, badgeColor = "amber" }) {
  // Cek apakah ekstensi file berformat video (.mp4, .webm, .ogg)
  const isVideo = src && /\.(mp4|webm|ogg)$/i.test(src);

  // Styling warna badge secara dinamis
  const colorMap = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  };

  return (
    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-3 shadow-lg text-center flex flex-col justify-between items-center min-h-[140px] overflow-hidden">
      {/* Badge Label */}
      <span
        className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border mb-2 ${
          colorMap[badgeColor] || colorMap.amber
        }`}
      >
        {label}
      </span>

      {/* Kontainer Media */}
      <div className="w-full flex-1 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 flex items-center justify-center relative">
        {src ? (
          isVideo ? (
            /* FUNGSI 1: Render Video jika ekstensi .mp4/.webm */
            <video
              src={src}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            /* FUNGSI 2: Render Gambar jika ekstensi .jpg/.png/.webp */
            <img
              src={src}
              alt={label}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          /* Tampilan Default Kosongan jika file belum diisi di folder ads */
          <div className="p-2 text-[11px] text-slate-500 border-2 border-dashed border-slate-700/80 rounded-lg w-full h-full flex items-center justify-center">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. MAIN COMPONENT BANNER ADS
export default function BannerAds({ position = "left" }) {
  // DAFTAR FILE DI FOLDER public/ads/
  // Kamu cukup ganti nama file di sini tanpa pusing mikirin kode di bawah!
  const leftAds = [
    { src: "/ads/kiri1.mp4", label: "PROMO GACOR 1", color: "amber" },
    { src: "/ads/kiri2.jpg", label: "BONUS DEPOSIT 2", color: "red" },
    { src: "/ads/kiri3.mp4", label: "RTP LIVE 3", color: "blue" },
    { src: "/ads/kiri4.jpg", label: "EVENT PARLAY 4", color: "orange" },
  ];

  const rightAds = [
    { src: "/ads/kanan1.jpg", label: "JACKPOT MAXWIN 1", color: "emerald" },
    { src: "/ads/kanan2.mp4", label: "DEPO QRIS 2", color: "purple" },
    { src: "/ads/kanan3.jpg", label: "ADMIN VVIP 3", color: "cyan" },
    { src: "/ads/kanan4.jpg", label: "CASHBACK 100% 4", color: "pink" },
  ];

  const currentAds = position === "left" ? leftAds : rightAds;

  return (
    <aside className="flex flex-col gap-3 w-full h-full select-none">
      {currentAds.map((ad, idx) => (
        <AdCard
          key={idx}
          src={ad.src}
          label={ad.label}
          badgeColor={ad.color}
        />
      ))}
    </aside>
  );
}