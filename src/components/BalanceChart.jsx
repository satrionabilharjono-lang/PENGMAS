import { TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartEventMarker from "./ChartEventMarker";

const EVENT_LABELS = {
  initial: "Saldo awal",
  "manual-add": "Tambah saldo manual",
  "manual-subtract": "Kurangi saldo manual",
  "manual-no-change": "Saldo tidak berubah",
  "spin-win": "Spin menang",
  "spin-loss": "Spin kalah",
};

export default function BalanceChart({ history }) {
  const chartData = history.map((entry, index) => ({
    ...entry,
    eventIndex: index,
  }));

  return (
    <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6">
      <h3 className="text-md font-bold text-slate-200 mb-2 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-red-500" /> Grafik Kerugian Kumulatif dari Spin
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        Persegi biru: saldo ditambah manual; wajik ungu: saldo dikurangi manual;
        lingkaran hijau: spin menang; segitiga merah: spin kalah.
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="eventIndex" stroke="#64748b" />
            <YAxis
              stroke="#64748b"
              domain={[0, "auto"]}
              tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="rounded border border-slate-700 bg-slate-950 p-3 text-xs text-white">
                    <p>Spin ke-{point.spin}</p>
                    <p>{EVENT_LABELS[point.eventType] ?? "Perubahan saldo"}</p>
                    <p>
                      Kerugian: Rp{" "}
                      {Number(point.chartLoss).toLocaleString("id-ID")}
                    </p>
                  </div>
                );
              }}
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
              }}
            />
            <Line
              type="monotone"
              dataKey="chartLoss"
              stroke="#ef4444"
              strokeWidth={3}
              dot={<ChartEventMarker />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}