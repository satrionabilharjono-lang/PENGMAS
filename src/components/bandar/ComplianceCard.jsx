// =====================================================================
//  ComplianceCard.jsx  —  perbandingan operator berlisensi vs situs ilegal.
//  Letakkan di: src/components/bandar/ComplianceCard.jsx
// =====================================================================
import { Card } from "./ui";

const ROWS = [
  ["Audit RNG / hasil acak", "Diaudit lembaga independen", "Tidak ada audit. Hasil bisa diatur sesukanya"],
  ["RTP", "Dipublikasikan dan tidak boleh diubah diam-diam", "Bisa diubah kapan saja tanpa pemain tahu"],
  ["Lisensi & pengawasan", "Ada regulator yang bisa dituntut", "Tidak ada. Server di luar jangkauan hukum"],
  ["Batas & perlindungan pemain", "Batas deposit, jeda, pemblokiran diri", "Justru mendorong bermain lebih lama"],
  ["Penarikan dana", "Wajib diproses sesuai aturan", "Bisa ditahan, dipersulit, atau akun dibekukan"],
  ["Jika dicurangi", "Ada jalur pengaduan resmi", "Tidak ada yang bisa dituju"],
];

export default function ComplianceCard() {
  return (
    <Card
      icon="🛡️"
      title="Risiko & Pengawasan"
      subtitle="Mengapa panel seperti ini berbahaya kalau tidak ada yang mengawasinya."
      tone="red"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3 font-semibold">Hal</th>
              <th className="py-2 pr-3 font-semibold text-emerald-400">Operator berlisensi</th>
              <th className="py-2 font-semibold text-red-400">Situs judol ilegal</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, a, b]) => (
              <tr key={k} className="border-b border-slate-700/60 align-top">
                <td className="py-2.5 pr-3 font-semibold text-slate-200">{k}</td>
                <td className="py-2.5 pr-3 text-slate-300">{a}</td>
                <td className="py-2.5 text-slate-300">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-xs leading-relaxed text-slate-300">
        Panel di atas hanyalah satu halaman web. Siapa pun yang memegang server bisa menggeser angka RTP kapan saja
        dan tidak ada yang bisa membuktikannya. Itulah sebabnya "main sampai balik modal" tidak pernah menjadi strategi,
        melainkan jebakan.
      </p>
    </Card>
  );
}
