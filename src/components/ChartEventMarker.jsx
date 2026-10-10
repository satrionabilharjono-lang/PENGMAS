export default function ChartEventMarker({ cx, cy, payload }) {
  const markerStyle = { stroke: "#0f172a", strokeWidth: 2 };

  switch (payload.eventType) {
    case "manual-add":
      return (
        <rect
          x={cx - 5}
          y={cy - 5}
          width={10}
          height={10}
          fill="#38bdf8"
          {...markerStyle}
        />
      );
    case "manual-subtract":
      return (
        <path
          d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy} L ${cx} ${cy + 6} L ${cx - 6} ${cy} Z`}
          fill="#c084fc"
          {...markerStyle}
        />
      );
    case "spin-win":
      return <circle cx={cx} cy={cy} r={5} fill="#34d399" {...markerStyle} />;
    case "spin-loss":
      return (
        <path
          d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy + 5} L ${cx - 6} ${cy + 5} Z`}
          fill="#f87171"
          {...markerStyle}
        />
      );
    default:
      return <circle cx={cx} cy={cy} r={4} fill="#94a3b8" {...markerStyle} />;
  }
}
