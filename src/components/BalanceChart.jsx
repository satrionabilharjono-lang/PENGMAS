import React from "react";
import { TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function BalanceChart({ history }) {
  return (
    <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6">
      <h3 className="text-md font-bold text-slate-200 mb-2 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-red-500" /> Grafik Real-Time Perjalanan Saldo Pemain
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        Perhatikan bagaimana kurva grafik matematika ini <strong>selalu mengarah ke Nol</strong> seiring bertambahnya jumlah spin.
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="spin" stroke="#64748b" />
            <YAxis stroke="#64748b" domain={[0, 1000000]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}