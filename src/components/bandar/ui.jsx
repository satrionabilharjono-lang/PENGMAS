// =====================================================================
//  ui.jsx  —  potongan tampilan kecil yang dipakai semua panel Bandar.
//  Letakkan di: src/components/bandar/ui.jsx
// =====================================================================

export const rupiah = (n) =>
  (n < 0 ? "-" : "") + "Rp " + Math.abs(Math.round(n || 0)).toLocaleString("id-ID");
export const pct = (n, d = 1) => `${(Number.isFinite(n) ? n : 0).toFixed(d)}%`;

const TONES = {
  red: "text-red-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  sky: "text-sky-300",
  slate: "text-slate-100",
};

/** Kartu bagian dengan judul. */
export function Card({ icon, title, subtitle, right, tone = "slate", children }) {
  const border = tone === "red" ? "border-red-900/50" : "border-slate-700";
  return (
    <section className={`rounded-2xl border ${border} bg-slate-800 p-5 shadow-xl md:p-6`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-700 pb-4">
        <div className="flex items-start gap-3">
          {icon && <span className="text-2xl leading-none">{icon}</span>}
          <div>
            <h3 className="text-base font-bold text-slate-100 md:text-lg">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Angka besar dengan label. */
export function Stat({ label, value, sub, tone = "slate" }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums md:text-2xl ${TONES[tone] || TONES.slate}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] leading-snug text-slate-400">{sub}</p>}
    </div>
  );
}

/** Perbandingan "yang bandar lihat" vs "yang pemain rasakan". */
export function Insight({ house, player }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3.5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-400">
          🏦 Yang bandar lihat
        </p>
        <p className="text-xs leading-relaxed text-slate-300">{house}</p>
      </div>
      <div className="rounded-xl border border-sky-800/50 bg-sky-950/30 p-3.5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-sky-300">
          🎰 Yang pemain rasakan
        </p>
        <p className="text-xs leading-relaxed text-slate-300">{player}</p>
      </div>
    </div>
  );
}

/** Grafik garis sederhana (SVG, tanpa library). series: [{name,color,values,bold}] */
export function LineChart({ series, height = 190, yFormat = (v) => String(Math.round(v)), xLabel }) {
  const W = 640;
  const H = height;
  const padL = 62;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  if (!all.length) return null;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const len = Math.max(...series.map((s) => s.values.length));
  const x = (i) => padL + (len <= 1 ? 0 : (i / (len - 1)) * (W - padL - padR));
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const ticks = [min, (min + max) / 2, max];
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#334155" strokeDasharray="3 4" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {min < 0 && max > 0 && (
          <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#64748b" />
        )}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={s.bold ? 3 : 1.5}
            strokeLinejoin="round"
            strokeOpacity={s.bold ? 1 : 0.8}
            points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          />
        ))}
        {xLabel && (
          <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {xLabel}
          </text>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Diagram batang. bins: [{label,count,color}] */
export function Histogram({ bins }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {bins.map((b) => (
        <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] tabular-nums text-slate-400">{b.count}</span>
          <div
            className="w-full rounded-t"
            style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0, background: b.color }}
          />
          <span className="text-[9px] leading-tight text-slate-400">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Kolom angka dengan label. */
export function NumberField({ label, value, onChange, min, max, step = 1, disabled, suffix }) {
  return (
    <label className="block text-xs text-slate-300">
      <span className="mb-1 block font-semibold text-slate-400">{label}</span>
      <div className="flex items-center rounded-lg border border-slate-600 bg-slate-900 px-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-transparent py-1.5 text-sm font-bold tabular-nums outline-none disabled:opacity-50"
        />
        {suffix && <span className="pl-1 text-[11px] text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}