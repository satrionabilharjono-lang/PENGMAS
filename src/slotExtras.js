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
  multiplier: null,
  bigWin: null,
  jackpot: null,
  spinFadeMs: 600,
  resultFadeMs: 300,
};

// ---------------------------------------------------------------------
// 5. WAKTU TAMBAHAN ANIMASI (ms)
//    slamMs : lama tulisan "×N" besar saat pengali diterapkan
// ---------------------------------------------------------------------
export const EXTRA_TIMING = { slamMs: 1500 };
