"use client";

import { useQuery } from "@tanstack/react-query";
import { scaleLinear } from "d3";
import { motion } from "framer-motion";
import {
  Activity,
  Gauge,
  Play,
  RotateCcw,
  Timer,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMeasure from "react-use-measure";
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

import {
  fetchFastestLap,
  fetchPositions,
  fetchSpeed,
  type SessionSelection,
} from "@/lib/api/telemetry";
import { useReplayStore } from "@/lib/stores/replay-store";
import { type PositionPoint } from "@/lib/types/telemetry";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const SPEED_PRESETS = [0.5, 1, 1.5, 2];

function formatSeconds(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const totalMilliseconds = Math.round(safe * 1000);
  const totalMinutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${totalMinutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

type SpeedPoint = { time: number; speed: number };
type LapChartPoint = { time: number; speed: number; sessionTime: number };
type LapSegment = {
  lapNumber: number;
  startTime: number;
  endTime: number;
  points: SpeedPoint[];
};

function findUpperIndex<T extends { time: number }>(
  points: T[],
  time: number,
): number {
  let left = 0;
  let right = points.length - 1;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (points[middle].time < time) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

function interpolatePositionSmooth(
  points: PositionPoint[],
  time: number,
): PositionPoint | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return points[0];
  }

  if (time <= points[0].time) {
    return points[0];
  }

  const last = points[points.length - 1];
  if (time >= last.time) {
    return last;
  }

  const upperIndex = findUpperIndex(points, time);
  const p0 = points[Math.max(0, upperIndex - 2)];
  const p1 = points[Math.max(0, upperIndex - 1)];
  const p2 = points[upperIndex];
  const p3 = points[Math.min(points.length - 1, upperIndex + 1)];

  const span = p2.time - p1.time;
  if (span <= 1e-9) {
    return p2;
  }

  const t = (time - p1.time) / span;
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return {
    time,
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function interpolateSpeed(points: SpeedPoint[], time: number): number | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return points[0].speed;
  }

  if (time <= points[0].time) {
    return points[0].speed;
  }
  const last = points[points.length - 1];
  if (time >= last.time) {
    return last.speed;
  }

  const upperIndex = findUpperIndex(points, time);
  const upper = points[upperIndex];
  const lower = points[Math.max(0, upperIndex - 1)];
  const span = upper.time - lower.time;

  if (span <= 0) {
    return upper.speed;
  }

  const ratio = (time - lower.time) / span;
  return lower.speed + (upper.speed - lower.speed) * ratio;
}

function buildLapSegments(points: SpeedPoint[]): LapSegment[] {
  if (points.length === 0) {
    return [];
  }

  const segments: Array<{ startIndex: number; endIndex: number }> = [];
  const gapThresholdSeconds = 8;
  let startIndex = 0;

  for (let index = 1; index < points.length; index += 1) {
    const gap = points[index].time - points[index - 1].time;
    if (gap > gapThresholdSeconds) {
      segments.push({ startIndex, endIndex: index - 1 });
      startIndex = index;
    }
  }
  segments.push({ startIndex, endIndex: points.length - 1 });

  const lapSegments: LapSegment[] = [];
  for (const segment of segments) {
    const segmentPoints = points.slice(
      segment.startIndex,
      segment.endIndex + 1,
    );
    if (segmentPoints.length < 25) {
      continue;
    }

    lapSegments.push({
      lapNumber: lapSegments.length + 1,
      startTime: segmentPoints[0].time,
      endTime: segmentPoints[segmentPoints.length - 1].time,
      points: segmentPoints,
    });
  }

  if (lapSegments.length > 0) {
    return lapSegments;
  }

  return [
    {
      lapNumber: 1,
      startTime: points[0].time,
      endTime: points[points.length - 1].time,
      points,
    },
  ];
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, index) => index % step === 0);

  const lastPoint = points[points.length - 1];
  if (sampled[sampled.length - 1] !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled;
}

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

export function ReplayDashboard() {
  const [selection, setSelection] = useState<SessionSelection>({
    year: 2025,
    grandPrix: "Australian Grand Prix",
    session: "Q",
    driver: "RUS",
  });

  const [trackRef, trackBounds] = useMeasure();
  const [selectedLapIndex, setSelectedLapIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevFrameRef = useRef<number | null>(null);

  const {
    isPlaying,
    playbackRate,
    currentTime,
    duration,
    hoveredTime,
    setPlaying,
    togglePlayback,
    setPlaybackRate,
    setCurrentTime,
    setDuration,
    seekBy,
    setHoveredTime,
    reset,
  } = useReplayStore();

  const positionsQuery = useQuery({
    queryKey: ["positions", selection],
    queryFn: () => fetchPositions(selection, 8000),
  });

  const speedQuery = useQuery({
    queryKey: ["speed", selection],
    queryFn: () => fetchSpeed(selection, 8000),
  });

  const fastestLapQuery = useQuery({
    queryKey: [
      "fastest-lap",
      selection.year,
      selection.grandPrix,
      selection.session,
    ],
    queryFn: () =>
      fetchFastestLap({
        year: selection.year,
        grandPrix: selection.grandPrix,
        session: selection.session,
      }),
  });

  const speedPoints = useMemo<SpeedPoint[]>(
    () =>
      (speedQuery.data?.data ?? []).map((point) => ({
        time: point.time,
        speed: Number(point.value),
      })),
    [speedQuery.data?.data],
  );

  const positionPoints = useMemo(
    () => positionsQuery.data?.positions ?? [],
    [positionsQuery.data?.positions],
  );

  const timeOffset = useMemo(() => {
    const firstPositionTime =
      positionPoints.length > 0
        ? positionPoints[0].time
        : Number.POSITIVE_INFINITY;
    const firstSpeedTime =
      speedPoints.length > 0 ? speedPoints[0].time : Number.POSITIVE_INFINITY;
    const minTime = Math.min(firstPositionTime, firstSpeedTime);
    return Number.isFinite(minTime) ? minTime : 0;
  }, [positionPoints, speedPoints]);

  const normalizedPositionPoints = useMemo(
    () =>
      positionPoints
        .map((point) => ({
          ...point,
          time: Math.max(0, point.time - timeOffset),
        }))
        .sort((a, b) => a.time - b.time),
    [positionPoints, timeOffset],
  );

  const normalizedSpeedPoints = useMemo(
    () =>
      speedPoints
        .map((point) => ({
          ...point,
          time: Math.max(0, point.time - timeOffset),
        }))
        .sort((a, b) => a.time - b.time),
    [speedPoints, timeOffset],
  );

  const lapSegments = useMemo(
    () => buildLapSegments(normalizedSpeedPoints),
    [normalizedSpeedPoints],
  );

  const effectiveLapIndex =
    lapSegments.length > 0
      ? Math.min(selectedLapIndex, lapSegments.length - 1)
      : 0;
  const selectedLapSegment = lapSegments[effectiveLapIndex] ?? null;

  const updateSelection = useCallback(
    (updater: (previous: SessionSelection) => SessionSelection) => {
      setSelection((previous) => updater(previous));
      setSelectedLapIndex(0);
      setHoveredTime(null);
    },
    [setHoveredTime],
  );

  const selectedLapChartPoints = useMemo(() => {
    if (!selectedLapSegment) {
      return [] as LapChartPoint[];
    }

    const points = selectedLapSegment.points.map((point) => ({
      time: Math.max(0, point.time - selectedLapSegment.startTime),
      speed: point.speed,
      sessionTime: point.time,
    }));

    return downsamplePoints(points, 1200);
  }, [selectedLapSegment]);

  const resolvedDuration = useMemo(() => {
    const speedMax = normalizedSpeedPoints.length
      ? normalizedSpeedPoints[normalizedSpeedPoints.length - 1].time
      : 0;
    const positionMax = normalizedPositionPoints.length
      ? normalizedPositionPoints[normalizedPositionPoints.length - 1].time
      : 0;
    return Math.max(speedMax, positionMax);
  }, [normalizedPositionPoints, normalizedSpeedPoints]);

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
    setHoveredTime(null);
  }, [selection, setCurrentTime, setHoveredTime, setPlaying]);

  useEffect(() => {
    setDuration(resolvedDuration);
    if (currentTime > resolvedDuration) {
      setCurrentTime(0);
      setPlaying(false);
    }
  }, [currentTime, resolvedDuration, setCurrentTime, setDuration, setPlaying]);

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      prevFrameRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (prevFrameRef.current === null) {
        prevFrameRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - prevFrameRef.current) / 1000;
      prevFrameRef.current = timestamp;

      const storeState = useReplayStore.getState();
      storeState.setCurrentTime(
        storeState.currentTime + deltaSeconds * playbackRate,
      );
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      prevFrameRef.current = null;
    };
  }, [duration, isPlaying, playbackRate]);

  const currentPoint = useMemo(
    () => interpolatePositionSmooth(normalizedPositionPoints, currentTime),
    [normalizedPositionPoints, currentTime],
  );

  const currentSpeed = useMemo(
    () => interpolateSpeed(normalizedSpeedPoints, currentTime),
    [normalizedSpeedPoints, currentTime],
  );

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1])
        .range([24, Math.max(24, trackBounds.width - 24)]),
    [trackBounds.width],
  );

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1])
        .range([Math.max(24, trackBounds.height - 24), 24]),
    [trackBounds.height],
  );

  const path = useMemo(() => {
    if (
      !normalizedPositionPoints.length ||
      trackBounds.width <= 0 ||
      trackBounds.height <= 0
    ) {
      return "";
    }

    return normalizedPositionPoints
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${xScale(point.x)} ${yScale(point.y)}`,
      )
      .join(" ");
  }, [
    normalizedPositionPoints,
    trackBounds.height,
    trackBounds.width,
    xScale,
    yScale,
  ]);

  const currentSvgPoint = useMemo(() => {
    if (!currentPoint) {
      return null;
    }
    return {
      x: xScale(currentPoint.x),
      y: yScale(currentPoint.y),
    };
  }, [currentPoint, xScale, yScale]);

  const isLoading = positionsQuery.isLoading || speedQuery.isLoading;
  const isError = positionsQuery.isError || speedQuery.isError;
  const errorMessage =
    (positionsQuery.error as Error | undefined)?.message ||
    (speedQuery.error as Error | undefined)?.message ||
    "Failed to load telemetry.";

  const onChartHover = useCallback(
    (state: { activeLabel?: number } | null) => {
      if (typeof state?.activeLabel === "number") {
        setHoveredTime(state.activeLabel);
      } else {
        setHoveredTime(null);
      }
    },
    [setHoveredTime],
  );

  const handleTogglePlayback = useCallback(() => {
    if (currentTime >= duration && duration > 0) {
      setCurrentTime(0);
    }
    togglePlayback();
  }, [currentTime, duration, setCurrentTime, togglePlayback]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-[#214447] bg-[linear-gradient(140deg,#01292c,#021518)] p-5 text-[#dbfdf8] shadow-xl"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-47.5 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[#74d9cc]">
              Qualifying Replay
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Telemetry Command Center
            </h1>
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="rounded-full border border-[#47d8c9]/40 px-4 py-2 text-sm font-medium text-[#bcfff7] hover:bg-[#0a3033]">
                Snapshot Help
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              Hover the speed chart to inspect telemetry values. Replay movement
              stays tied to Play/Pause and timeline controls.
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
              Year
            </span>
            <input
              type="number"
              className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
              value={selection.year}
              onChange={(event) =>
                updateSelection((prev) => ({
                  ...prev,
                  year: Number(event.target.value) || prev.year,
                }))
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
              Grand Prix
            </span>
            <input
              type="text"
              className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
              value={selection.grandPrix}
              onChange={(event) =>
                updateSelection((prev) => ({
                  ...prev,
                  grandPrix: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
              Session
            </span>
            <input
              type="text"
              className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
              value={selection.session}
              onChange={(event) =>
                updateSelection((prev) => ({
                  ...prev,
                  session: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
              Driver
            </span>
            <input
              type="text"
              className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
              value={selection.driver}
              onChange={(event) =>
                updateSelection((prev) => ({
                  ...prev,
                  driver: event.target.value.toUpperCase().slice(0, 3),
                }))
              }
            />
          </label>
        </div>
      </motion.header>

      <section className="flex flex-col gap-6">
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rounded-2xl border border-[#203538] bg-[#071011] p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Activity className="h-4 w-4 text-[#52e1d3]" /> Track Replay
            </h2>
            <div className="text-right text-xs text-zinc-400">
              <div>Time: {formatSeconds(currentTime)}</div>
              <div>
                Speed:{" "}
                {currentSpeed !== null
                  ? `${Math.round(currentSpeed)} km/h`
                  : "-- km/h"}
              </div>
            </div>
          </div>

          <div
            ref={trackRef}
            className="relative h-155 overflow-hidden rounded-xl border border-[#1f2b2d] bg-[radial-gradient(circle_at_20%_20%,#14363a,transparent_40%),radial-gradient(circle_at_80%_80%,#1d2a2b,transparent_40%),#04090a]"
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
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-[#092326] px-4 py-2 text-sm text-[#bcfff7] hover:bg-[#0f2d30]"
              onClick={handleTogglePlayback}
              disabled={duration <= 0 || isLoading}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? "Pause" : "Play Telemetry"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
              onClick={() => seekBy(-2)}
            >
              <SkipBack className="h-4 w-4" /> -2s
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
              onClick={() => seekBy(2)}
            >
              <SkipForward className="h-4 w-4" /> +2s
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#2f5b5f] bg-transparent px-3 py-2 text-sm text-[#9cece2] hover:bg-[#0b1b1d]"
              onClick={reset}
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
              onChange={(event) => setCurrentTime(Number(event.target.value))}
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
                onClick={() => setPlaybackRate(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="rounded-2xl border border-[#223335] bg-[#071011] p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Gauge className="h-4 w-4 text-[#52e1d3]" /> Speed Trace
            </h2>
            <span className="text-xs text-zinc-400">
              Hover for telemetry card
            </span>
          </div>

          <div className="mt-6 h-105 rounded-xl border border-[#1f2b2d] bg-[#040a0b] p-2">
            <SpeedChart
              speedPoints={selectedLapChartPoints}
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
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "border-[#48dacb] bg-[#0d2f32] text-[#cbfffa]"
                        : "border-[#2c4e52] text-[#84cbc3] hover:bg-[#0b2022]",
                    )}
                    onClick={() => {
                      setSelectedLapIndex(index);
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
                {fastestLapQuery.data?.lap_time ?? "--:--.---"}
              </p>
              <p className="text-xs text-zinc-400">
                {fastestLapQuery.data
                  ? `${fastestLapQuery.data.driver} • ${fastestLapQuery.data.team}`
                  : "Waiting for fastest-lap endpoint"}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e3032] bg-[#07181a] p-3">
              <p className="text-xs uppercase tracking-wide text-[#7fd9ce]">
                Selected Driver
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#d9fff9]">
                {selection.driver}
              </p>
              <p className="text-xs text-zinc-400">
                {positionsQuery.data?.team ?? "--"}
              </p>
            </div>
          </div>
        </motion.article>
      </section>

      {isLoading ? (
        <p className="text-sm text-zinc-300">Loading telemetry...</p>
      ) : null}
      {isError ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}
