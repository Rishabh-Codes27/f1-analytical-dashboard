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
    <div className="rounded-xl border border-[#57e4d6]/50 bg-[#021517]/95 px-3 py-2 text-xs text-[#c8fffa] shadow-xl backdrop-blur-sm">
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
        <CartesianGrid strokeDasharray="3 3" stroke="#1d2a2d" />
        <XAxis
          dataKey="time"
          tickFormatter={(value) => formatSeconds(Number(value))}
          minTickGap={36}
          interval="preserveStartEnd"
          stroke="#86bdb7"
        />
        <YAxis tickFormatter={(value) => `${value}`} stroke="#86bdb7" />
        <Tooltip content={<SpeedTooltip />} />
        <ReferenceLine
          x={hoveredTime ?? undefined}
          stroke="#67f3df"
          strokeDasharray="4 3"
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#37e2d0"
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
}: SpeedTracePanelProps) {
  return (
    <article className="rounded-2xl border border-[#223335] bg-[#071011] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <Gauge className="h-4 w-4 text-[#52e1d3]" /> Speed Trace
        </h2>
        <span className="text-xs text-zinc-400">Hover for telemetry card</span>
      </div>

      <div className="mt-6 h-105 rounded-xl border border-[#1f2b2d] bg-[#040a0b] p-2">
        <SpeedChart
          speedPoints={speedPoints}
          hoveredTime={hoveredTime}
          onChartHover={onChartHover}
          setHoveredTime={setHoveredTime}
        />
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
                    ? "rounded-full border border-[#48dacb] bg-[#0d2f32] px-3 py-1.5 text-xs font-medium text-[#cbfffa] transition"
                    : "rounded-full border border-[#2c4e52] px-3 py-1.5 text-xs font-medium text-[#84cbc3] transition hover:bg-[#0b2022]"
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1e3032] bg-[#07181a] p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#7fd9ce]">
            <Timer className="h-4 w-4" /> Session Fastest Lap
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#d9fff9]">
            {fastestLapTime}
          </p>
          <p className="text-xs text-zinc-400">{fastestLapDetails}</p>
        </div>
        <div className="rounded-xl border border-[#1e3032] bg-[#07181a] p-3">
          <p className="text-xs uppercase tracking-wide text-[#7fd9ce]">
            Selected Driver
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#d9fff9]">
            {selectedDriver}
          </p>
          <p className="text-xs text-zinc-400">{selectedTeam}</p>
        </div>
      </div>
    </article>
  );
}