import React, { useMemo, useState } from 'react';

export interface SalesTrendPoint {
  date: string;
  label: string;
  newRevenue: number;
  existingRevenue: number;
  total: number;
}

type Period = 'week' | 'month' | 'year';

interface SalesTrendPixelChartProps {
  weekly: SalesTrendPoint[];
  monthly: SalesTrendPoint[];
  yearly: SalesTrendPoint[];
  height?: number;
}

const ORANGE = '#FF6B00';
const NEW_GRAY = 'rgba(148, 163, 184, 0.85)';
const GRID_LINE = 'rgba(148, 163, 184, 0.12)';
function formatYAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

export function SalesTrendPixelChart({ weekly, monthly, yearly, height = 350 }: SalesTrendPixelChartProps) {
  const [period, setPeriod] = useState<Period>('month');

  const data = period === 'week' ? weekly : period === 'month' ? monthly : yearly;

  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data]);

  const layout = useMemo(() => {
    const w = 960;
    const padL = 48;
    const padR = 24;
    const padT = 72;
    const padB = 40;
    const chartW = w - padL - padR;
    const chartH = height - padT - padB;
    const n = Math.max(data.length, 1);
    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const niceMax = (() => {
      const exp = Math.floor(Math.log10(maxVal));
      const pow = 10 ** exp;
      const nrm = maxVal / pow;
      let top = 1;
      if (nrm <= 1) top = 1;
      else if (nrm <= 2) top = 2;
      else if (nrm <= 5) top = 5;
      else top = 10;
      return top * pow;
    })();

    const rows = 24;
    const cellH = chartH / rows;
    const gapX = 8;
    const barSlot = chartW / n;
    const barW = Math.max(6, Math.min(28, barSlot - gapX));

    return {
      w,
      h: height,
      padL,
      padR,
      padT,
      padB,
      chartW,
      chartH,
      n,
      niceMax,
      rows,
      cellH,
      barSlot,
      barW,
    };
  }, [data, height]);

  const yTicks = useMemo(() => {
    const steps = 6;
    const arr: number[] = [];
    for (let i = 0; i <= steps; i++) arr.push((layout.niceMax * i) / steps);
    return arr;
  }, [layout.niceMax]);

  const [hover, setHover] = useState<number | null>(null);
  const highlightIndex = Math.max(0, data.length - 1);

  const cellsForBar = (newR: number, exR: number) => {
    const { rows, niceMax } = layout;
    const total = newR + exR;
    if (total <= 0) return { existingRows: 0, newRows: 0 };
    const used = Math.max(1, Math.round((total / niceMax) * rows));
    const exPart = exR / total;
    let exRows = Math.round(used * exPart);
    let nwRows = used - exRows;
    if (exRows + nwRows > rows) {
      exRows = Math.min(exRows, rows);
      nwRows = rows - exRows;
    }
    if (nwRows < 0) nwRows = 0;
    if (exRows < 0) exRows = 0;
    return { existingRows: exRows, newRows: nwRows };
  };

  return (
    <div className="w-full rounded-xl border border-gray-200/80 bg-[#141414] text-white shadow-lg dark:border-white/10 dark:bg-[#121212]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 pt-5 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sales trend</p>
          <p className="mt-1 text-lg font-bold text-white sm:text-xl">
            Total revenue:{' '}
            <span className="tabular-nums">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              New customer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />
              Existing customer
            </span>
          </div>
          <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  period === p ? 'bg-white/15 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative px-2 pb-2 sm:px-4">
        <svg
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="w-full h-full max-h-[360px]"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="nc-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke={GRID_LINE} strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect
            x={layout.padL}
            y={layout.padT}
            width={layout.chartW}
            height={layout.chartH}
            fill="url(#nc-grid)"
            opacity={0.35}
          />

          {yTicks.map((tick, i) => {
            const y = layout.padT + layout.chartH - (tick / layout.niceMax) * layout.chartH;
            return (
              <g key={i}>
                <line
                  x1={layout.padL}
                  x2={layout.padL + layout.chartW}
                  y1={y}
                  y2={y}
                  stroke={GRID_LINE}
                  strokeWidth="0.5"
                />
                <text x={4} y={y + 4} className="fill-slate-500" style={{ fontSize: 10 }}>
                  {formatYAxis(tick)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const cx = layout.padL + i * layout.barSlot + (layout.barSlot - layout.barW) / 2;
            const { existingRows, newRows } = cellsForBar(d.newRevenue, d.existingRevenue);
            const cellW = layout.barW;
            const cellH = layout.cellH;
            const gap = 1;
            const rects: React.ReactNode[] = [];
            let row = 0;
            for (let r = 0; r < existingRows; r++) {
              const y = layout.padT + layout.chartH - (row + 1) * cellH + gap / 2;
              rects.push(
                <rect
                  key={`ex-${r}`}
                  x={cx}
                  y={y}
                  width={cellW - gap}
                  height={cellH - gap}
                  rx={1}
                  fill={ORANGE}
                />,
              );
              row++;
            }
            for (let r = 0; r < newRows; r++) {
              const y = layout.padT + layout.chartH - (row + 1) * cellH + gap / 2;
              rects.push(
                <rect
                  key={`nw-${r}`}
                  x={cx}
                  y={y}
                  width={cellW - gap}
                  height={cellH - gap}
                  rx={1}
                  fill={NEW_GRAY}
                />,
              );
              row++;
            }

            const isHover = hover === i;
            const cxMid = cx + cellW / 2;
            const stackTop = layout.padT + layout.chartH - row * cellH;

            return (
              <g
                key={d.date + i}
                onMouseEnter={() => setHover(i)}
                style={{ cursor: 'pointer' }}
              >
                {rects}
                <text
                  x={cx + cellW / 2}
                  y={layout.h - 12}
                  textAnchor="middle"
                  className={isHover ? 'fill-white font-semibold' : i === highlightIndex ? 'fill-white font-semibold' : 'fill-slate-500'}
                  style={{ fontSize: 11 }}
                >
                  {d.label}
                </text>
                {i === highlightIndex && (
                  <line
                    x1={cx + cellW / 2 - 10}
                    x2={cx + cellW / 2 + 10}
                    y1={layout.h - 6}
                    y2={layout.h - 6}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={1.5}
                  />
                )}
                {isHover && row > 0 && (
                  <>
                    <line
                      x1={cxMid}
                      x2={cxMid}
                      y1={layout.padT}
                      y2={layout.padT + layout.chartH}
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <circle cx={cxMid} cy={stackTop + cellH / 2} r={4} fill="none" stroke="white" strokeWidth="1.5" />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {hover != null && data[hover] && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
            style={{
              left: `clamp(8px, ${((hover + 0.5) / data.length) * 100}%, calc(100% - 160px))`,
              top: 12,
              transform: 'translateX(-50%)',
              minWidth: 140,
            }}
          >
            <div className="font-semibold text-white">
              {new Date(data[hover].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            <div className="mt-1 space-y-0.5 text-slate-300">
              <div>New customer: ${data[hover].newRevenue.toLocaleString()}</div>
              <div className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} />
                Existing: ${data[hover].existingRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
