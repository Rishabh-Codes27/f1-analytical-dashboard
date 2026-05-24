"use client";

import { Activity, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FastestLapResponse, DriverTelemetryResponse } from "@/lib/types/telemetry";

import { formatSeconds } from "./utils";
import { TrackInfoCards } from "./track-info-cards";

const SPEED_PRESETS = [0.5, 1, 1.5, 2];

type TrackPoint = { x: number; y: number } | null;

type SectorMarker = {
  label: string;
  x: number;
  y: number;
};

type TrackReplayPanelProps = {
  trackRef: React.RefCallback<HTMLDivElement>;
  trackBounds: { width: number; height: number };
  path: string;
  currentSvgPoint: TrackPoint;
  currentTime: number;
  currentSpeed: number | null;
  isPlaying: boolean;
  duration: number;
  isLoading: boolean;
  playbackRate: number;
  onTogglePlayback: () => void;
  onSeekBy: (seconds: number) => void;
  onReset: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetCurrentTime: (time: number) => void;
  fastestLap?: FastestLapResponse;
  driverTelemetry?: DriverTelemetryResponse | null;
  sectorMarkers?: SectorMarker[];
};

export function TrackReplayPanel({
  trackRef,
  trackBounds,
  path,
  currentSvgPoint,
  currentTime,
  currentSpeed,
  isPlaying,
  duration,
  isLoading,
  playbackRate,
  onTogglePlayback,
  onSeekBy,
  onReset,
  onSetPlaybackRate,
  onSetCurrentTime,
  fastestLap,
  driverTelemetry,
  sectorMarkers = [],
}: TrackReplayPanelProps) {
  return (
    <article className="rounded-2xl border border-[#203538] bg-[#071011] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <Activity className="h-4 w-4 text-[#52e1d3]" /> Track Replay
        </h2>
        <div className="text-right text-xs text-zinc-400">
          <div>Time: {formatSeconds(currentTime)}</div>
          <div>
            Speed: {currentSpeed !== null ? `${Math.round(currentSpeed)} km/h` : "-- km/h"}
          </div>
        </div>
      </div>

      {(driverTelemetry && driverTelemetry.driver) ? (
        <div className="mb-3">
          <TrackInfoCards
            lapTime={driverTelemetry.lap_time ?? "--:--.---"}
            sector1={driverTelemetry.sector_1 ?? null}
            sector2={driverTelemetry.sector_2 ?? null}
            sector3={driverTelemetry.sector_3 ?? null}
            driver={driverTelemetry.driver}
            team={driverTelemetry.team}
            compound={driverTelemetry.compound ?? null}
          />
        </div>
      ) : fastestLap ? (
        <div className="mb-3">
          <TrackInfoCards
            lapTime={fastestLap.lap_time}
            sector1={fastestLap.sector_1}
            sector2={fastestLap.sector_2}
            sector3={fastestLap.sector_3}
            driver={fastestLap.driver}
            team={fastestLap.team}
            compound={fastestLap.compound}
          />
        </div>
      ) : null}

      <div
        ref={trackRef}
        className="relative h-130 overflow-hidden rounded-xl border border-[#1f2b2d] bg-[radial-gradient(circle_at_20%_20%,#14363a,transparent_40%),radial-gradient(circle_at_80%_80%,#1d2a2b,transparent_40%),#04090a]"
      >
        <svg
          viewBox={`0 0 ${Math.max(trackBounds.width, 1)} ${Math.max(trackBounds.height, 1)}`}
          className="h-full w-full"
        >
          <path
            d={path}
            fill="none"
            stroke="#214447"
            strokeWidth={11}
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke="#53dfd0"
            strokeWidth={5}
            strokeLinecap="round"
          />
          {currentSvgPoint ? (
            <circle
              cx={currentSvgPoint.x}
              cy={currentSvgPoint.y}
              r={7}
              fill="#00ffd9"
              stroke="#d5fff8"
              strokeWidth={2}
            />
          ) : null}
          {sectorMarkers.map((marker) => (
            <g key={marker.label} transform={`translate(${marker.x}, ${marker.y})`}>
              <circle
                r={11}
                fill="rgba(4, 17, 18, 0.9)"
                stroke="#7ef5ea"
                strokeWidth={2}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                className="fill-[#dffef9] text-[11px] font-semibold"
              >
                {marker.label}
              </text>
            </g>
          ))}
        </svg>
        {/* bottom car markers */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-center gap-2">
          {/* show a small row of car dots, highlight current driver */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-white/30" />
            <div className="h-3 w-3 rounded-full bg-white/30" />
            <div className="h-3 w-3 rounded-full bg-[#00ffd9] shadow-lg" />
            <div className="h-3 w-3 rounded-full bg-white/30" />
            <div className="h-3 w-3 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-[#092326] px-4 py-2 text-sm text-[#bcfff7] hover:bg-[#0f2d30]"
          onClick={onTogglePlayback}
          disabled={duration <= 0 || isLoading}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play Telemetry"}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
          onClick={() => onSeekBy(-2)}
        >
          <SkipBack className="h-4 w-4" /> -2s
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
          onClick={() => onSeekBy(2)}
        >
          <SkipForward className="h-4 w-4" /> +2s
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0)}
          step={0.001}
          value={currentTime}
          onChange={(event) => onSetCurrentTime(Number(event.target.value))}
          className="w-full accent-[#1fdac8]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SPEED_PRESETS.map((speed) => (
          <button
            key={speed}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              playbackRate === speed
                ? "border-[#48dacb] bg-[#0d2f32] text-[#cbfffa]"
                : "border-[#2c4e52] text-[#84cbc3] hover:bg-[#0b2022]",
            )}
            onClick={() => onSetPlaybackRate(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    </article>
  );
}