// =====================================================================
//  slotConfig.js  —  SEMUA yang sering kamu edit ada di file ini.
//  Letakkan di: src/slotConfig.js
// =====================================================================

// ---------------------------------------------------------------------
// 1. UKURAN PAPAN (kolom x baris). Gaya Zeus = 6 x 5.
// ---------------------------------------------------------------------
export const GRID = { cols: 6, rows: 5 };

// Minimal jumlah simbol SAMA (di mana saja di papan) supaya dihitung menang.
export const MIN_CLUSTER = 8;

// ---------------------------------------------------------------------
// 2. SIMBOL BIASA
//    - id   : nama unik (bebas, tanpa spasi)
//    - img  : lokasi gambar di folder /public
//    - pay  : { jumlah_simbol: kelipatan_taruhan }
//             contoh { 8: 2, 10: 5, 12: 15 } artinya
//             8-9 simbol bayar 2x taruhan, 10-11 bayar 5x, 12+ bayar 15x
//
//    Mau TAMBAH simbol? Salin satu baris, ganti id/img/pay.
//    Mau HAPUS simbol? Hapus barisnya. Pakai minimal 6 simbol
//    supaya papan bisa disusun tanpa menang tidak sengaja.
// ---------------------------------------------------------------------
export const SYMBOLS = [
  { id: "satu",  img: "/symbols/satu.jpg",  pay: { 8: 2,   10: 5,   12: 15 } },
  { id: "dua",   img: "/symbols/dua.jpg",   pay: { 8: 1.5, 10: 3,   12: 10 } },
  { id: "tiga",  img: "/symbols/tiga.jpg",  pay: { 8: 1,   10: 2,   12: 6 } },
  { id: "empat", img: "/symbols/empat.jpg", pay: { 8: 0.8, 10: 1.5, 12: 4 } },
  { id: "lima",  img: "/symbols/lima.jpg",  pay: { 8: 0.5, 10: 1,   12: 3 } },
  { id: "enam",  img: "/symbols/enam.jpg",  pay: { 8: 0.3, 10: 0.6, 12: 2 } },
];

// ---------------------------------------------------------------------
// 3. BOLA PENGALI (2x, 3x, 5x, ...)
//    - value  : angka pengali
//    - img    : gambar sendiri (mis. "/symbols/x2.png"). Isi null untuk
//               memakai bola biru bawaan yang otomatis menulis "×2".
//    - weight : seberapa sering muncul sebagai pajangan di papan KALAH
//               (makin besar makin sering)
//
//    Aturan: bola pengali hanya mengalikan kemenangan. Kalau putaran
//    tidak menang, bola tetap tampil tetapi tidak membayar apa pun.
// ---------------------------------------------------------------------
export const MULTIPLIERS = [
  { value: 2,   img: null, weight: 40 },
  { value: 3,   img: null, weight: 25 },
  { value: 5,   img: null, weight: 15 },
  { value: 10,  img: null, weight: 10 },
  { value: 25,  img: null, weight: 5 },
  { value: 50,  img: null, weight: 3 },
  { value: 100, img: null, weight: 2 },
];

// ---------------------------------------------------------------------
// 4. TAMPILAN PAPAN KALAH
// ---------------------------------------------------------------------
export const LOSS_BOARD = {
  nearMissChance: 0.6, // peluang papan kalah menampilkan 7 simbol sama (hampir menang)
  orbChance: 0.4,      // peluang bola pengali muncul di papan kalah (tidak membayar)
  maxOrbs: 3,          // maksimal bola pengali di papan kalah
};

// ---------------------------------------------------------------------
// 5. GAYA PAPAN MENANG (bobot, bebas diubah)
//    single = satu kelompok menang
//    orb    = satu kelompok menang lalu dikalikan bola pengali
//    chain  = dua kelompok menang beruntun (tumble berantai)
// ---------------------------------------------------------------------
export const WIN_STYLE = { single: 55, orb: 20, chain: 25 };

// ---------------------------------------------------------------------
// 6. KECEPATAN ANIMASI (milidetik). Makin kecil makin cepat.
// ---------------------------------------------------------------------
export const TIMING = {
  fallMs: 450,        // lama satu simbol jatuh
  colStaggerMs: 50,   // jeda antar kolom saat jatuh
  rowStaggerMs: 30,   // jeda antar baris saat jatuh
  dropOutMs: 380,     // simbol lama jatuh keluar di awal putaran
  highlightMs: 650,   // simbol pemenang menyala
  popMs: 350,         // simbol pemenang meledak
  orbEachMs: 600,     // tiap bola pengali menyala
  orbSettleMs: 500,   // jeda setelah semua bola
  endPauseMs: 350,    // jeda akhir sebelum putaran selesai
  autoSpinMs: 2800,   // lama animasi saat Auto Spin
};
