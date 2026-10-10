// =====================================================================
//  slotSkip.js  —  "kabel" kecil antara tombol SKIP (App) dan papan (SlotMachine),
//  supaya PlayerTab tidak perlu meneruskan prop tambahan.
//  Letakkan di: src/slotSkip.js
// =====================================================================
const listeners = new Set();

/** Dipanggil App saat tombol SKIP ditekan. */
export function requestSkip() {
  listeners.forEach((fn) => fn());
}

/** Dipakai SlotMachine untuk mendengarkan permintaan skip. Mengembalikan fungsi berhenti-dengar. */
export function onSkip(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
