"use client";

import { motion } from "framer-motion";
import { Flag, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useMemo } from "react";

import { getTeamColor } from "@/lib/f1-data";
import type { PositionPoint, RaceDriverReplay, RaceReplayResponse } from "@/lib/types/telemetry";
import { cn } from "@/lib/utils";

import { formatSeconds, interpolatePositionSmooth } from "./utils";

const RACE_SPEED_PRESETS = [0.5, 1, 2, 4, 6, 8, 10];
const TRACK_MAP_PADDING = 56;

type RaceReplayPanelProps = {
  trackRef: React.RefCallback<HTMLDivElement>;
  trackBounds: { width: number; height: number };
  raceData?: RaceReplayResponse;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  playbackRate: number;
  onTogglePlayback: () => void;
  onSeekBy: (seconds: number) => void;
  onReset: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetCurrentTime: (time: number) => void;
};

function interpolateLeaderboardPosition(driver: RaceDriverReplay, time: number): number | null {
  const points = driver.leaderboard;
  if (!points.length) {
    return null;
  }

  if (points.length === 1 || time <= points[0].time) {
    return points[0].position;
  }

  const last = points[points.length - 1];
  if (time >= last.time) {
    return last.position;
  }

  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].time < time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const upper = points[low];
  const lower = points[Math.max(0, low - 1)];
  const span = upper.time - lower.time;
  if (span <= 1e-6) {
    return upper.position;
  }

  const ratio = (time - lower.time) / span;
  return lower.position + (upper.position - lower.position) * ratio;
}

function toPath(points: PositionPoint[], width: number, height: number) {
  if (points.length < 2 || width <= 0 || height <= 0) {
    return "";
  }

  const w = width - TRACK_MAP_PADDING * 2;
  const h = height - TRACK_MAP_PADDING * 2;
  const scale = Math.min(Math.max(1, w), Math.max(1, h));
  const xOffset = TRACK_MAP_PADDING + (w - scale) / 2;
  const yOffset = TRACK_MAP_PADDING + (h - scale) / 2;

  const mapX = (value: number) => xOffset + value * scale;
  const mapY = (value: number) => yOffset + scale - value * scale;

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${mapX(point.x)} ${mapY(point.y)}`)
    .join(" ");
}

export function RaceReplayPanel({
  trackRef,
  trackBounds,
  raceData,
  currentTime,
  duration,
  isPlaying,
  isLoading,
  playbackRate,
  onTogglePlayback,
  onSeekBy,
  onReset,
  onSetPlaybackRate,
  onSetCurrentTime,
}: RaceReplayPanelProps) {
  const referenceDriver = useMemo(
    () => raceData?.drivers.find((driver) => driver.positions.length > 1) ?? null,
    [raceData?.drivers],
  );

  const racePath = useMemo(
    () => toPath(referenceDriver?.positions ?? [], trackBounds.width, trackBounds.height),
    [referenceDriver?.positions, trackBounds.width, trackBounds.height],
  );

  const markers = useMemo(() => {
    if (!raceData?.drivers.length || trackBounds.width <= 0 || trackBounds.height <= 0) {
      return [] as Array<{
        driver: string;
        driverName: string;
        team: string;
        color: string;
        x: number;
        y: number;
      }>;
    }

    const w = trackBounds.width - TRACK_MAP_PADDING * 2;
    const h = trackBounds.height - TRACK_MAP_PADDING * 2;
    const scale = Math.min(Math.max(1, w), Math.max(1, h));
    const xOffset = TRACK_MAP_PADDING + (w - scale) / 2;
    const yOffset = TRACK_MAP_PADDING + (h - scale) / 2;

    const mapX = (value: number) => xOffset + value * scale;
    const mapY = (value: number) => yOffset + scale - value * scale;

    return raceData.drivers
      .map((driver) => {
        const point = interpolatePositionSmooth(driver.positions, currentTime);
        if (!point) {
          return null;
        }

        return {
          driver: driver.driver,
          driverName: driver.driver_name,
          team: driver.team,
          color: getTeamColor(driver.team),
          x: mapX(point.x),
          y: mapY(point.y),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [currentTime, raceData, trackBounds.height, trackBounds.width]);

  const leaderboardRows = useMemo(() => {
    if (!raceData?.drivers.length) {
      return [] as Array<{
        driver: string;
        driverName: string;
        team: string;
        color: string;
        positionValue: number;
      }>;
    }

    return raceData.drivers
      .map((driver) => ({
        driver: driver.driver,
        driverName: driver.driver_name,
        team: driver.team,
        color: getTeamColor(driver.team),
        positionValue: interpolateLeaderboardPosition(driver, currentTime) ?? 999,
      }))
      .sort((a, b) => {
        if (a.positionValue !== b.positionValue) {
          return a.positionValue - b.positionValue;
        }
        return a.driver.localeCompare(b.driver);
      });
  }, [currentTime, raceData]);

  return (
    <article className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,28,0.98),rgba(10,12,18,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-white">
            <Flag className="h-4 w-4 text-[#e10600]" /> Race Replay
          </h2>
          <p className="mt-1 text-xs text-white/45">
            Full-grid track replay with continuously updated leaderboard.
          </p>
        </div>
        <div className="text-right text-xs text-white/55">
          <div>Race Time: {formatSeconds(currentTime)}</div>
          <div>Drivers: {raceData?.drivers.length ?? 0}</div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div
          ref={trackRef}
          className="relative h-[28rem] overflow-hidden rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.04),transparent_25%),linear-gradient(180deg,#050608,#020304)]"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-52 w-[80%] animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${Math.max(trackBounds.width, 1)} ${Math.max(trackBounds.height, 1)}`}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
            >
              {racePath ? (
                <>
                  <path
                    d={racePath}
                    fill="none"
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={racePath}
                    fill="none"
                    stroke="#020304"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}

              {markers.map((marker) => (
                <g key={marker.driver} transform={`translate(${marker.x}, ${marker.y})`}>
                  <circle
                    r={9}
                    fill={marker.color}
                    stroke="#0b0e14"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    className={cn(
                      "text-[8px] font-bold",
                      marker.color.toLowerCase() === "#f5f7fa" ? "fill-black" : "fill-white",
                    )}
                  >
                    {marker.driver}
                  </text>
                </g>
              ))}
            </svg>
          )}

          <div className="absolute left-5 bottom-5 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/75 backdrop-blur">
            Track style: black surface with white outline
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
          <p className="px-2 text-[9px] uppercase tracking-[0.22em] text-white/45">
            Live Leaderboard
          </p>
          <div className="mt-2 max-h-[24rem] overflow-auto pr-1">
            {leaderboardRows.length > 0 ? (
              leaderboardRows.map((row, index) => (
                <motion.div
                  key={row.driver}
                  layout
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  className="mb-1 flex items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-2 py-1.25"
                >
                  <div className="w-5 text-center text-[11px] font-semibold text-white/85">{index + 1}</div>
                  <span
                    className="h-2 w-2 rounded-full border border-black/30"
                    style={{ backgroundColor: row.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {row.driver} · {row.driverName}
                    </p>
                    <p className="truncate text-[10px] text-white/50">{row.team}</p>
                  </div>
                  <div className="text-right text-[10px] text-white/60">
                    P{Math.max(1, Math.round(row.positionValue))}
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-white/45">No race leaderboard samples available.</p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/85 transition hover:border-[#e10600]/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onTogglePlayback}
          disabled={duration <= 0 || isLoading}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play Race"}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05]"
          onClick={() => onSeekBy(-5)}
        >
          <SkipBack className="h-4 w-4" /> -5s
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05]"
          onClick={() => onSeekBy(5)}
        >
          <SkipForward className="h-4 w-4" /> +5s
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
          step={0.01}
          value={currentTime}
          onChange={(event) => onSetCurrentTime(Number(event.target.value))}
          className="w-full accent-[#e10600]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {RACE_SPEED_PRESETS.map((speed) => (
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
