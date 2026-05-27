"use client";

import { Gauge, Timer } from "lucide-react";
import { memo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatSeconds, type LapChartPoint, type LapSegment } from "./utils";

function SpeedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: LapChartPoint }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1119]/95 px-3 py-2 text-xs text-white/80 shadow-xl backdrop-blur-sm">
      <div className="font-medium text-white">Telemetry Snapshot</div>
      <div className="mt-1">Lap Time: {formatSeconds(point.time)}</div>
      <div>Session Time: {formatSeconds(point.sessionTime)}</div>
      <div>Speed: {Math.round(point.speed)} km/h</div>
    </div>
  );
}

const SpeedChart = memo(function SpeedChart({
  speedPoints,
  hoveredTime,
  onChartHover,
  setHoveredTime,
}: {
  speedPoints: LapChartPoint[];
  hoveredTime: number | null;
  onChartHover: (state: { activeLabel?: number } | null) => void;
  setHoveredTime: (time: number | null) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={speedPoints}
        onMouseMove={(state) => onChartHover(state as { activeLabel?: number })}
        onMouseLeave={() => setHoveredTime(null)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis
          dataKey="time"
          tickFormatter={(value) => formatSeconds(Number(value))}
          minTickGap={36}
          interval="preserveStartEnd"
          stroke="rgba(255,255,255,0.36)"
        />
        <YAxis tickFormatter={(value) => `${value}`} stroke="rgba(255,255,255,0.36)" />
        <Tooltip content={<SpeedTooltip />} />
        <ReferenceLine
          x={hoveredTime ?? undefined}
          stroke="#e10600"
          strokeDasharray="4 3"
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#e10600"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

type SpeedTracePanelProps = {
  speedPoints: LapChartPoint[];
  hoveredTime: number | null;
  onChartHover: (state: { activeLabel?: number } | null) => void;
  setHoveredTime: (time: number | null) => void;
  lapSegments: LapSegment[];
  effectiveLapIndex: number;
  onSelectLap: (index: number) => void;
  fastestLapTime: string;
  fastestLapDetails: string;
  selectedDriver: string;
  selectedTeam: string;
  selectedDriverName: string;
  trackLabel: string;
  sessionLabel: string;
  grandPrixLabel: string;
  isLoading: boolean;
  summaryCards: Array<{ label: string; value: string; subtext?: string }>;
};

export function SpeedTracePanel({
  speedPoints,
  hoveredTime,
  onChartHover,
  setHoveredTime,
  lapSegments,
  effectiveLapIndex,
  onSelectLap,
  fastestLapTime,
  fastestLapDetails,
  selectedDriver,
  selectedTeam,
  selectedDriverName,
  trackLabel,
  sessionLabel,
  grandPrixLabel,
  isLoading,
  summaryCards,
}: SpeedTracePanelProps) {
  return (
    <article className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,28,0.98),rgba(10,12,18,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white">
          <Gauge className="h-4 w-4 text-[#e10600]" /> Speed Trace
        </h2>
        <span className="text-xs text-white/45">Hover for telemetry card</span>
      </div>

      <div className="mt-6 h-105 rounded-[24px] border border-white/8 bg-[#06080d] p-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06),rgba(255,255,255,0.02))] bg-[length:200%_100%] animate-pulse">
            <div className="h-[88%] w-[94%] rounded-[18px] border border-white/8 bg-white/[0.03]" />
          </div>
        ) : (
          <SpeedChart
            speedPoints={speedPoints}
            hoveredTime={hoveredTime}
            onChartHover={onChartHover}
            setHoveredTime={setHoveredTime}
          />
        )}
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2">
          {lapSegments.map((lap, index) => {
            const isActive = index === effectiveLapIndex;
            return (
              <button
                key={lap.lapNumber}
                className={
                  isActive
                    ? "rounded-full border border-[#e10600]/55 bg-[#e10600]/12 px-3 py-1.5 text-xs font-medium text-white transition"
                    : "rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.05]"
                }
                onClick={() => {
                  onSelectLap(index);
                  setHoveredTime(null);
                }}
              >
                Lap {lap.lapNumber}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
            <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
            <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/45">
                <Timer className="h-4 w-4" /> Session Fastest Lap
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {fastestLapTime}
              </p>
              <p className="text-xs text-white/45">{fastestLapDetails}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-xs uppercase tracking-wide text-white/45">
                Selected Driver
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {selectedDriver}
              </p>
              <p className="text-xs text-white/45">{selectedDriverName}</p>
              <p className="text-xs text-white/45">{selectedTeam}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-xs uppercase tracking-wide text-white/45">
                Session Context
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{sessionLabel}</p>
              <p className="text-xs text-white/45">{grandPrixLabel}</p>
              <p className="text-xs text-white/45">{trackLabel}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{card.label}</p>
                <p className="mt-1 text-base font-semibold text-white">{card.value}</p>
                {card.subtext ? <p className="text-xs text-white/45">{card.subtext}</p> : null}
              </div>
            ))}
      </div>
    </article>
  );
}