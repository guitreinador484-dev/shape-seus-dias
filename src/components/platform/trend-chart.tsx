import { useEffect, useRef, useState } from "react";

export type TrendSeries = {
  key: string;
  label: string;
  unit: string;
  color: string;
  values: (number | null)[];
};

const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 24, left: 36 };

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Number(value.toFixed(6)));
  return ticks;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Gráfico de linhas leve em SVG: substitui uma biblioteca de gráficos de ~100 KB na aba Evolução. */
export function TrendChart({ labels, series }: { labels: string[]; series: TrendSeries[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  // Rótulos do eixo X sem sobreposição: cerca de um a cada 80 px.
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(innerW / 80))));
  const shownLabels = labels.map((_, i) => i).filter((i) => i % labelEvery === 0);
  const lastIndex = labels.length - 1;
  if (lastIndex > 0 && shownLabels[shownLabels.length - 1] !== lastIndex) {
    // A última data sempre aparece; se ficar colada na anterior, ela toma o lugar.
    if (lastIndex - shownLabels[shownLabels.length - 1] < labelEvery) shownLabels.pop();
    shownLabels.push(lastIndex);
  }

  function pick(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || labels.length === 0) return;
    const ratio = (clientX - rect.left - PAD.left) / innerW;
    setActive(Math.min(labels.length - 1, Math.max(0, Math.round(ratio * (labels.length - 1)))));
  }

  const summary = series
    .map((s) => {
      const values = s.values.filter((v): v is number => v !== null);
      return values.length ? `${s.label}: de ${formatNumber(values[0])} para ${formatNumber(values[values.length - 1])} ${s.unit}` : null;
    })
    .filter(Boolean)
    .join("; ");

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative h-60 touch-pan-y"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 ? (
          <svg width={width} height={HEIGHT} role="img" aria-label={summary} className="overflow-visible">
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="3 3" />
                <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {formatNumber(tick)}
                </text>
              </g>
            ))}
            {shownLabels.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor={labels.length > 1 && i === 0 ? "start" : labels.length > 1 && i === labels.length - 1 ? "end" : "middle"}
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {labels[i]}
              </text>
            ))}
            {active !== null ? (
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--input)" />
            ) : null}
            {series.map((s) => {
              const points = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const))).filter((p) => p !== null);
              return (
                <g key={s.key}>
                  <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
                  {s.values.map((v, i) =>
                    v === null ? null : (
                      <circle key={i} cx={x(i)} cy={y(v)} r={active === i ? 4.5 : 3} fill="var(--card)" stroke={s.color} strokeWidth={2} />
                    ),
                  )}
                </g>
              );
            })}
          </svg>
        ) : null}
        {active !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md border border-input bg-popover px-2.5 py-1.5 text-xs shadow-2xl shadow-black/60"
            style={{ left: Math.min(Math.max(x(active) - 70, 0), Math.max(width - 140, 0)) }}
          >
            <p className="font-medium text-foreground">{labels[active]}</p>
            {series.map((s) =>
              s.values[active] === null ? null : (
                <p key={s.key} className="tabular-nums text-muted-foreground">
                  {s.label}: <span className="text-foreground">{formatNumber(s.values[active]!)} {s.unit}</span>
                </p>
              ),
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label} ({s.unit})
          </span>
        ))}
      </div>
    </div>
  );
}
