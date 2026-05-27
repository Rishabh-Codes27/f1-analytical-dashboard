"use client";

import { Activity, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import { getTeamColor } from "@/lib/f1-data";
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
  driverCode: string;
  driverName: string;
  driverTeam: string;
  driverCompound?: string | null;
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
  driverCode,
  driverName,
  driverTeam,
  driverCompound,
}: TrackReplayPanelProps) {
  const teamColor = getTeamColor(driverTeam);

  return (
    <article className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,28,0.98),rgba(10,12,18,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-white">
            <Activity className="h-4 w-4 text-[#e10600]" /> Track Replay
          </h2>
          <p className="mt-1 text-xs text-white/45">
            Animated telemetry path with live playback and sector anchors.
          </p>
        </div>
        <div className="text-right text-xs text-white/55">
          <div>Time: {formatSeconds(currentTime)}</div>
          <div>
            Speed: {currentSpeed !== null ? `${Math.round(currentSpeed)} km/h` : "-- km/h"}
          </div>
        </div>
      </div>

      {isLoading || (driverTelemetry && driverTelemetry.driver) || fastestLap ? (
        <div className="mb-3">
          <TrackInfoCards
            lapTime={driverTelemetry?.lap_time ?? fastestLap?.lap_time ?? "--:--.---"}
            sector1={driverTelemetry?.sector_1 ?? fastestLap?.sector_1 ?? null}
            sector2={driverTelemetry?.sector_2 ?? fastestLap?.sector_2 ?? null}
            sector3={driverTelemetry?.sector_3 ?? fastestLap?.sector_3 ?? null}
            driverCode={driverCode}
            driverName={driverName}
            team={driverTeam}
            compound={driverCompound ?? driverTelemetry?.compound ?? fastestLap?.compound ?? null}
            isLoading={isLoading}
          />
        </div>
      ) : fastestLap ? (
        <div className="mb-3">
          <TrackInfoCards
            lapTime={fastestLap.lap_time}
            sector1={fastestLap.sector_1}
            sector2={fastestLap.sector_2}
            sector3={fastestLap.sector_3}
            driverCode={driverCode}
            driverName={driverName}
            team={driverTeam}
            compound={driverCompound ?? fastestLap.compound}
            isLoading={isLoading}
          />
        </div>
      ) : null}

      <div
        ref={trackRef}
        className="relative h-130 overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_18%_18%,rgba(225,6,0,0.14),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,#0a0c12,#06070b)]"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-[82%] max-w-4xl animate-pulse rounded-[22px] border border-white/8 bg-white/[0.04] p-6">
              <div className="h-4 w-40 rounded-full bg-white/10" />
              <div className="mt-5 h-[22rem] rounded-[20px] border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%]" />
            </div>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${Math.max(trackBounds.width, 1)} ${Math.max(trackBounds.height, 1)}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full [shape-rendering:geometricPrecision]"
          >
            <path
              d={path}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path}
              fill="none"
              stroke="rgba(225,6,0,0.92)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {currentSvgPoint ? (
              <>
                <circle
                  cx={currentSvgPoint.x}
                  cy={currentSvgPoint.y}
                  r={12}
                  fill="none"
                  stroke={teamColor}
                  strokeOpacity={0.22}
                  strokeWidth={10}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={currentSvgPoint.x}
                  cy={currentSvgPoint.y}
                  r={7}
                  fill={teamColor}
                  stroke="#0b0e14"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
            {sectorMarkers.map((marker) => (
              <g key={marker.label} transform={`translate(${marker.x}, ${marker.y})`}>
                <circle
                  r={9}
                  fill="rgba(11, 13, 20, 0.96)"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth={1.5}
                />
                <text x={0} y={4} textAnchor="middle" className="fill-white text-[10px] font-semibold">
                  {marker.label}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Time & Speed cards - bottom-left stacked overlay */}
        <div className="absolute left-6 bottom-6 z-30 pointer-events-none">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 w-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.04]" />
              <div className="h-10 w-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.04]" />
            </div>
          ) : (
            <div className="space-y-2 pointer-events-auto">
              <div className="w-40 rounded-xl border border-white/8 bg-white/[0.04] p-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">TIME</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatSeconds(currentTime)}</p>
              </div>
              <div className="w-40 rounded-xl border border-white/8 bg-white/[0.04] p-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">SPEED</p>
                <p className="mt-1 text-lg font-semibold text-white">{currentSpeed !== null ? `${Math.round(currentSpeed)} km/h` : "-- km/h"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/85 transition hover:border-[#e10600]/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onTogglePlayback}
          disabled={duration <= 0 || isLoading}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play Telemetry"}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05]"
          onClick={() => onSeekBy(-2)}
        >
          <SkipBack className="h-4 w-4" /> -2s
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05]"
          onClick={() => onSeekBy(2)}
        >
          <SkipForward className="h-4 w-4" /> +2s
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05]"
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
          className="w-full accent-[#e10600]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SPEED_PRESETS.map((speed) => (
          <button
            key={speed}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              playbackRate === speed
                ? "border-[#e10600]/60 bg-[#e10600]/12 text-white"
                : "border-white/10 text-white/65 hover:border-white/20 hover:bg-white/[0.05]",
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