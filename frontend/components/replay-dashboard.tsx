"use client";

import { useQuery } from "@tanstack/react-query";
import { scaleLinear } from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMeasure from "react-use-measure";

import {
  fetchFastestLap,
  fetchPositions,
  fetchSpeed,
  fetchDriverTelemetry,
  type SessionSelection,
} from "@/lib/api/telemetry";
import { useReplayStore } from "@/lib/stores/replay-store";

import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

import {
  buildLapSegments,
  downsamplePoints,
  interpolatePositionSmooth,
  interpolateSpeed,
  type LapChartPoint,
  type SpeedPoint,
} from "./replay-dashboard/utils";
import { SessionHeader } from "./replay-dashboard/session-header";
import { SpeedTracePanel } from "./replay-dashboard/speed-trace-panel";
import { TrackReplayPanel } from "./replay-dashboard/track-replay-panel";

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

  const driverTelemetryQuery = useQuery({
    queryKey: ["driver-telemetry", selection],
    queryFn: () => fetchDriverTelemetry(selection),
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
      positionPoints.length > 0 ? positionPoints[0].time : Number.POSITIVE_INFINITY;
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

  const sectorMarkers = useMemo(() => {
    const sector1Seconds =
      driverTelemetryQuery.data?.sector_1_seconds ?? fastestLapQuery.data?.sector_1_seconds ?? null;
    const sector2Seconds =
      driverTelemetryQuery.data?.sector_2_seconds ?? fastestLapQuery.data?.sector_2_seconds ?? null;

    if (!normalizedPositionPoints.length || sector1Seconds === null) {
      return [] as Array<{ label: string; x: number; y: number }>;
    }

    const markerTimes = [0, sector1Seconds, sector1Seconds + (sector2Seconds ?? 0)];

    return markerTimes
      .map((time, index) => {
        const point = interpolatePositionSmooth(normalizedPositionPoints, time);
        if (!point) {
          return null;
        }

        return {
          label: String(index + 1),
          x: xScale(point.x),
          y: yScale(point.y),
        };
      })
      .filter((marker): marker is { label: string; x: number; y: number } => marker !== null);
  }, [
    driverTelemetryQuery.data?.sector_1_seconds,
    driverTelemetryQuery.data?.sector_2_seconds,
    fastestLapQuery.data?.sector_1_seconds,
    fastestLapQuery.data?.sector_2_seconds,
    normalizedPositionPoints,
    xScale,
    yScale,
  ]);

  const isLoading =
    positionsQuery.isLoading || speedQuery.isLoading || fastestLapQuery.isLoading || driverTelemetryQuery.isLoading;
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

  const fastestLapTime = fastestLapQuery.data?.lap_time ?? "--:--.---";
  const fastestLapDetails = fastestLapQuery.data
    ? `${fastestLapQuery.data.driver} • ${fastestLapQuery.data.team}`
    : "Waiting for fastest-lap endpoint";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {isLoading ? <FullscreenLoader /> : null}

      <SessionHeader selection={selection} onChange={updateSelection} />

      <section className="flex flex-col gap-6">
        <TrackReplayPanel
          trackRef={trackRef}
          trackBounds={trackBounds}
          path={path}
          currentSvgPoint={currentSvgPoint}
          currentTime={currentTime}
          currentSpeed={currentSpeed}
          isPlaying={isPlaying}
          duration={duration}
          isLoading={isLoading}
          playbackRate={playbackRate}
          onTogglePlayback={handleTogglePlayback}
          onSeekBy={seekBy}
          onReset={reset}
          onSetPlaybackRate={setPlaybackRate}
          onSetCurrentTime={setCurrentTime}
          fastestLap={fastestLapQuery.data}
          driverTelemetry={driverTelemetryQuery.data}
          sectorMarkers={sectorMarkers}
        />

        <SpeedTracePanel
          speedPoints={selectedLapChartPoints}
          hoveredTime={hoveredTime}
          onChartHover={onChartHover}
          setHoveredTime={setHoveredTime}
          lapSegments={lapSegments}
          effectiveLapIndex={effectiveLapIndex}
          onSelectLap={setSelectedLapIndex}
          fastestLapTime={fastestLapTime}
          fastestLapDetails={fastestLapDetails}
          selectedDriver={selection.driver}
          selectedTeam={positionsQuery.data?.team ?? "--"}
        />
      </section>

      {isError ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}