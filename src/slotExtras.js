// =====================================================================
//  slotExtras.js  —  pengaturan BARU: perayaan menang besar / jackpot,
//  auto spin, suara. Letakkan di: src/slotExtras.js
//  (Dipisah dari slotConfig.js supaya isi slotConfig.js milikmu tidak tertimpa.)
// =====================================================================

// ---------------------------------------------------------------------
// 1. TINGKAT KEMENANGAN BESAR
//    min        : kelipatan taruhan minimal untuk masuk tingkat ini
//                 (kemenangan total putaran ÷ taruhan)
//    label      : tulisan besar di layar
//    coins      : jumlah koin yang berjatuhan
//    durationMs : lama perayaan di layar (ketuk layar untuk menutup lebih cepat)
//    jackpot    : true = efek paling megah + berhenti otomatis saat auto spin
//
//    Urutkan dari kecil ke besar. Hapus/ubah baris sesuka hati.
// ---------------------------------------------------------------------
export const WIN_TIERS = [
  { min: 5,  label: "BIG WIN",   coins: 24,  durationMs: 3200 },
  { min: 15, label: "MEGA WIN",  coins: 48,  durationMs: 4200 },
  { min: 30, label: "SUPER WIN", coins: 80,  durationMs: 5200 },
  { min: 50, label: "JACKPOT",   coins: 140, durationMs: 7000, jackpot: true },
];

// ---------------------------------------------------------------------
// 2. JACKPOT (diputuskan di sisi bandar, App.jsx)
//    chancePercent : peluang per spin dalam persen. 0 = mati.
//                    Isi 100 untuk mencoba animasinya setiap spin.
//    target        : kelipatan taruhan yang dituju (harus >= min tingkat
//                    JACKPOT di atas supaya perayaannya muncul)
//    Catatan: jackpot menambah pengembalian ke pemain sekitar
//    chancePercent × target poin RTP (0,2 × 50 ≈ +10 poin).
//    Force Loss menonaktifkan jackpot.
// ---------------------------------------------------------------------
export const JACKPOT = { chancePercent: 0.2, target: 50 };

// ---------------------------------------------------------------------
// 3. AUTO SPIN
//    defaultCount  : jumlah putaran bila tombol Auto tidak mengirim angka
//    gapMs         : jeda antar putaran
//    stopOnJackpot : berhenti otomatis setelah jackpot
// ---------------------------------------------------------------------
export const AUTOPLAY = { defaultCount: 50, gapMs: 450, stopOnJackpot: true };

// ---------------------------------------------------------------------
// 4. SUARA (file ada di public/sounds/)
//    spin / win / loss : nama file. spin diputar berulang selama putaran lalu
//                        dipaksa berhenti dengan fade-out halus di akhir putaran.
//    multiplier / bigWin / jackpot : isi nama file untuk memakai suaramu sendiri,
//                        biarkan null untuk memakai suara bawaan (dibuat otomatis).
//    spinFadeMs   : lama fade-out suara spin di akhir putaran
//    resultFadeMs : lama fade-out suara menang/kalah saat putaran berikutnya mulai
// ---------------------------------------------------------------------
export const SOUND = {
  dir: "/sounds/",
  volume: 0.5,
  spin: "spin.mp3",
  win: "win.mp3",
  loss: "loss.mp3",
  multiplier: "hehe.mp3",
  bigWin: "savage.mp3",
  jackpot: "jackpot.mp3",
  scatter: "scatter.mp3",   // suara scatter / free spin mulai
  spinFadeMs: 600,
  resultFadeMs: 300,
};

// ---------------------------------------------------------------------
// 5. WAKTU TAMBAHAN ANIMASI (ms)
//    slamMs : lama tulisan "×N" besar saat pengali diterapkan
// ---------------------------------------------------------------------
export const EXTRA_TIMING = {
  slamMs: 1500,
  scatterIntroMs: 2800, // layar "FREE SPIN!" setelah scatter muncul
  fsRetriggerMs: 1100,  // tulisan "+5 FREE SPIN" saat retrigger
  fsEndMs: 2400,        // ringkasan di akhir ronde free spin
};

// ---------------------------------------------------------------------
// 6. SCATTER (simbol emas bercahaya)
//    img            : gambar scatter kamu (taruh di public/symbols/scatter.jpg)
//    glow           : warna cahaya di belakang scatter
//    decorChanceLoss: peluang papan KALAH menampilkan 2-3 scatter ("hampir dapat free spin")
//    decorChanceWin : peluang papan MENANG menampilkan 1-2 scatter
// ---------------------------------------------------------------------
export const SCATTER = {
  img: "/symbols/scatter.jpg",
  glow: "#fbbf24",
  decorChanceLoss: 0.3,
  decorChanceWin: 0.1,
};

// ---------------------------------------------------------------------
// 7. FREE SPIN (gaya Zeus)
//    Pemicu: scatter >= triggerCount di papan akhir sebuah putaran.
//    Selama free spin: tidak memotong saldo, dan SEMUA bola pengali yang muncul
//    DITAMBAHKAN ke pengali total yang terus naik; setiap kemenangan dikali
//    pengali total itu.
//
//    Keputusan bandar (diatur di tab Bandar / bandarLogic.js):
//      chancePercent        : peluang tiap putaran memicu free spin (slider di tab Bandar)
//
//    triggerCount / triggerWeights : jumlah scatter saat dipicu dan bobot munculnya
//    spins                : jumlah free spin awal
//    retriggerCount       : scatter di dalam free spin untuk menambah putaran
//    retriggerSpins       : tambahan putaran saat retrigger
//    retriggerChancePercent : peluang tiap free spin memunculkan retrigger
//    maxSpins             : batas total free spin dalam satu ronde
//    winChancePercent     : peluang tiap free spin menang
//    baseTargets          : kelipatan dasar kemenangan per free spin (sebelum dikali pengali)
//    orbChancePercent     : peluang bola pengali muncul di sebuah free spin
//    orbWeights           : nilai bola di free spin { nilai: bobot } (bobot besar = sering)
//    doubleOrbChancePercent : peluang muncul 2 bola (bila sudah ada bola)
//    maxWinX              : ronde berhenti kalau total menang free spin sudah mencapai ini (× taruhan)
// ---------------------------------------------------------------------
export const FREE_SPINS = {
  triggerCount: 4,
  triggerWeights: { 4: 70, 5: 22, 6: 8 },
  spins: 15,
  retriggerCount: 3,
  retriggerSpins: 5,
  retriggerChancePercent: 3,
  maxSpins: 40,
  chancePercent: 0.5,
  winChancePercent: 30,
  baseTargets: [0.5, 0.8, 1, 1.5],
  orbChancePercent: 12,
  orbWeights: { 2: 50, 3: 30, 5: 15, 10: 4, 25: 1 },
  doubleOrbChancePercent: 25,
  maxWinX: 300,
};

// ---------------------------------------------------------------------
// 8. DOMPET & PENARIKAN
//    min          : penarikan minimal (Rp)
//    quick        : tombol jumlah cepat di form tarik saldo (Rp)
//    steps        : pilihan nilai tombol + / - untuk saldo top up dan dompet (Rp)
//    rejectReasons: alasan penolakan yang bisa dipilih bandar. Ini pola yang
//                   sering dilaporkan korban judol; ubah/tambah sesuka hati.
// ---------------------------------------------------------------------
export const WITHDRAW = {
  min: 50000,
  quick: [100000, 500000, 1000000],
  steps: [10000, 50000, 100000, 500000, 1000000],
  rejectReasons: [
    "Syarat turnover belum terpenuhi",
    "Verifikasi data gagal (foto KTP / selfie tidak sesuai)",
    "Terindikasi kecurangan / memanfaatkan bug",
    "Wajib membayar biaya admin / pajak lebih dulu",
    "Akun sedang dalam pemeriksaan",
  ],
};