"use client";

import { useQuery } from "@tanstack/react-query";
import { scaleLinear } from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useMeasure from "react-use-measure";

import {
  fetchFastestLap,
  fetchPositions,
  fetchRaceReplay,
  fetchSpeed,
  fetchDriverTelemetry,
  type SessionSelection,
} from "@/lib/api/telemetry";
import {
  DEFAULT_DASHBOARD_MODE,
  DEFAULT_DRIVER,
  DEFAULT_GRAND_PRIX,
  DEFAULT_SESSION,
  DEFAULT_YEAR,
  DRIVER_OPTIONS,
  getDriverOption,
  getGrandPrixOption,
  type DashboardMode,
} from "@/lib/f1-data";
import { useReplayStore } from "@/lib/stores/replay-store";

import {
  buildLapSegments,
  downsamplePoints,
  interpolatePositionSmooth,
  interpolateSpeed,
  type LapChartPoint,
  type SpeedPoint,
} from "./replay-dashboard/utils";
import { RaceReplayPanel } from "./replay-dashboard/race-replay-panel";
import { SessionHeader } from "./replay-dashboard/session-header";
import { SpeedTracePanel } from "./replay-dashboard/speed-trace-panel";
import { TrackReplayPanel } from "./replay-dashboard/track-replay-panel";

const TRACK_MAP_PADDING = 56;

type DashboardState = {
  mode: DashboardMode;
  selection: SessionSelection;
};

type ReplayDashboardContentProps = DashboardState & {
  pathname: string;
  searchParamsString: string;
  router: ReturnType<typeof useRouter>;
};

function buildSelectionFromSearchParams(searchParams: URLSearchParams): DashboardState {
  const modeParam = searchParams.get("mode")?.toLowerCase();
  const mode: DashboardMode = modeParam === "race" ? "race" : DEFAULT_DASHBOARD_MODE;
  const gpParam = searchParams.get("gp") ?? DEFAULT_GRAND_PRIX;
  const driverParam = searchParams.get("driver") ?? DEFAULT_DRIVER;

  return {
    mode,
    selection: {
      year: DEFAULT_YEAR,
      grandPrix: getGrandPrixOption(gpParam).label,
      session: mode === "race" ? "R" : DEFAULT_SESSION,
      driver: getDriverOption(driverParam)?.code ?? DEFAULT_DRIVER,
    },
  };
}

function ReplayDashboardContent({
  mode: initialMode,
  selection: initialSelection,
  pathname,
  searchParamsString,
  router,
}: ReplayDashboardContentProps) {
  const [mode, setMode] = useState<DashboardMode>(initialMode);
  const [selection, setSelection] = useState<SessionSelection>(initialSelection);

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

  const effectiveSelection = useMemo<SessionSelection>(
    () => ({
      ...selection,
      year: DEFAULT_YEAR,
      session: mode === "race" ? "R" : "Q",
    }),
    [mode, selection],
  );

  const updateUrl = useCallback(
    (nextMode: DashboardMode, nextSelection: SessionSelection) => {
      const params = new URLSearchParams();
      params.set("mode", nextMode);
      params.set("gp", getGrandPrixOption(nextSelection.grandPrix).slug);
      params.set("driver", nextSelection.driver);

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      const currentQuery = searchParamsString;
      const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    updateUrl(mode, effectiveSelection);
  }, [mode, effectiveSelection, updateUrl]);

  const qualifyingEnabled = mode === "qualifying";
  const raceEnabled = mode === "race";

  const positionsQuery = useQuery({
    queryKey: ["positions", effectiveSelection, mode],
    queryFn: () => fetchPositions(effectiveSelection, 8000),
    enabled: qualifyingEnabled,
  });

  const driverTelemetryQuery = useQuery({
    queryKey: ["driver-telemetry", effectiveSelection, mode],
    queryFn: () => fetchDriverTelemetry(effectiveSelection),
    enabled: qualifyingEnabled,
  });

  const speedQuery = useQuery({
    queryKey: ["speed", effectiveSelection, mode],
    queryFn: () => fetchSpeed(effectiveSelection, 8000),
    enabled: qualifyingEnabled,
  });

  const fastestLapQuery = useQuery({
    queryKey: ["fastest-lap", effectiveSelection.year, effectiveSelection.grandPrix, effectiveSelection.session, mode],
    queryFn: () =>
      fetchFastestLap({
        year: effectiveSelection.year,
        grandPrix: effectiveSelection.grandPrix,
        session: effectiveSelection.session,
      }),
    enabled: qualifyingEnabled,
  });

  const raceReplayQuery = useQuery({
    queryKey: ["race-replay", effectiveSelection.year, effectiveSelection.grandPrix, mode],
    queryFn: () =>
      fetchRaceReplay(
        {
          year: effectiveSelection.year,
          grandPrix: effectiveSelection.grandPrix,
          session: "R",
        },
        3500,
        1500,
      ),
    enabled: raceEnabled,
  });

  const speedPoints = useMemo<SpeedPoint[]>(
    () =>
      (speedQuery.data?.data ?? []).map((point) => ({
        time: point.time,
        speed: Number(point.value),
      })),
    [speedQuery.data?.data],
  );

  const positionPoints = useMemo(() => positionsQuery.data?.positions ?? [], [positionsQuery.data?.positions]);

  const timeOffset = useMemo(() => {
    const firstPositionTime =
      positionPoints.length > 0 ? positionPoints[0].time : Number.POSITIVE_INFINITY;
    const firstSpeedTime = speedPoints.length > 0 ? speedPoints[0].time : Number.POSITIVE_INFINITY;
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

  const lapSegments = useMemo(() => buildLapSegments(normalizedSpeedPoints), [normalizedSpeedPoints]);

  const effectiveLapIndex =
    lapSegments.length > 0 ? Math.min(selectedLapIndex, lapSegments.length - 1) : 0;
  const selectedLapSegment = lapSegments[effectiveLapIndex] ?? null;

  const updateSelection = useCallback(
    (updater: (previous: SessionSelection) => SessionSelection) => {
      setSelection((previous) => {
        const next = updater(previous);
        return {
          ...next,
          year: DEFAULT_YEAR,
          session: mode === "race" ? "R" : "Q",
        };
      });
      setSelectedLapIndex(0);
      setHoveredTime(null);
    },
    [mode, setHoveredTime],
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
    if (raceEnabled) {
      return raceReplayQuery.data?.duration_seconds ?? 0;
    }

    const speedMax = normalizedSpeedPoints.length
      ? normalizedSpeedPoints[normalizedSpeedPoints.length - 1].time
      : 0;
    const positionMax = normalizedPositionPoints.length
      ? normalizedPositionPoints[normalizedPositionPoints.length - 1].time
      : 0;
    return Math.max(speedMax, positionMax);
  }, [normalizedPositionPoints, normalizedSpeedPoints, raceEnabled, raceReplayQuery.data?.duration_seconds]);

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
    setHoveredTime(null);
  }, [effectiveSelection, mode, setCurrentTime, setHoveredTime, setPlaying]);

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
      storeState.setCurrentTime(storeState.currentTime + deltaSeconds * playbackRate);
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

  const xScale = useMemo(() => {
    const w = trackBounds.width - TRACK_MAP_PADDING * 2;
    const h = trackBounds.height - TRACK_MAP_PADDING * 2;
    const scale = Math.min(Math.max(1, w), Math.max(1, h));
    const xOffset = TRACK_MAP_PADDING + (w - scale) / 2;
    return scaleLinear()
      .domain([0, 1])
      .range([xOffset, xOffset + scale]);
  }, [trackBounds.width, trackBounds.height]);

  const yScale = useMemo(() => {
    const w = trackBounds.width - TRACK_MAP_PADDING * 2;
    const h = trackBounds.height - TRACK_MAP_PADDING * 2;
    const scale = Math.min(Math.max(1, w), Math.max(1, h));
    const yOffset = TRACK_MAP_PADDING + (h - scale) / 2;
    return scaleLinear()
      .domain([0, 1])
      .range([yOffset + scale, yOffset]);
  }, [trackBounds.width, trackBounds.height]);

  const path = useMemo(() => {
    if (!normalizedPositionPoints.length || trackBounds.width <= 0 || trackBounds.height <= 0) {
      return "";
    }

    return normalizedPositionPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.x)} ${yScale(point.y)}`)
      .join(" ");
  }, [normalizedPositionPoints, trackBounds.height, trackBounds.width, xScale, yScale]);

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
          label: `S${index + 1}`,
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

  const isLoading = raceEnabled
    ? raceReplayQuery.isLoading
    : qualifyingEnabled &&
      (positionsQuery.isLoading || speedQuery.isLoading || fastestLapQuery.isLoading || driverTelemetryQuery.isLoading);
  const isError = raceEnabled ? raceReplayQuery.isError : positionsQuery.isError || speedQuery.isError;
  const errorMessage = raceEnabled
    ? (raceReplayQuery.error as Error | undefined)?.message || "Failed to load race replay."
    : (positionsQuery.error as Error | undefined)?.message ||
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

  const selectedDriverProfile = getDriverOption(selection.driver) ?? DRIVER_OPTIONS[0];
  const selectedGrandPrix = getGrandPrixOption(selection.grandPrix);
  const telemetryTeam = driverTelemetryQuery.data?.team ?? selectedDriverProfile.team;
  const telemetryDriverName =
    selectedDriverProfile.name || driverTelemetryQuery.data?.driver || selection.driver;
  const selectedDriverFastestLap =
    driverTelemetryQuery.data?.lap_time ?? fastestLapQuery.data?.lap_time ?? "--:--.---";
  const selectedCompound =
    driverTelemetryQuery.data?.compound ?? fastestLapQuery.data?.compound ?? null;
  const fastestLapTime = fastestLapQuery.data?.lap_time ?? "--:--.---";
  const fastestLapDetails = fastestLapQuery.data
    ? `${fastestLapQuery.data.driver} • ${fastestLapQuery.data.team}`
    : "Waiting for fastest-lap endpoint";

  const summaryCards = [
    {
      label: "Selected Driver",
      value: `${selectedDriverProfile.code} · ${telemetryDriverName}`,
      subtext: telemetryTeam,
    },
    {
      label: "Selected Team",
      value: telemetryTeam,
      subtext: selectedDriverProfile.team,
    },
    {
      label: "Fastest Lap",
      value: selectedDriverFastestLap,
      subtext: "Selected qualifying lap",
    },
    {
      label: "Track",
      value: selectedGrandPrix.circuit,
      subtext: selectedGrandPrix.label,
    },
    {
      label: "Session",
      value: effectiveSelection.session,
      subtext: mode === "race" ? "Race" : "Qualifying",
    },
    {
      label: "Grand Prix",
      value: selectedGrandPrix.label,
      subtext: `${effectiveSelection.year}`,
    },
  ];

  const handleModeChange = useCallback((nextMode: DashboardMode) => {
    setMode(nextMode);
    setSelection((previous) => ({
      ...previous,
      year: DEFAULT_YEAR,
      session: nextMode === "race" ? "R" : "Q",
    }));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <SessionHeader
        mode={mode}
        selection={selection}
        onModeChange={handleModeChange}
        onChange={updateSelection}
        isLoading={isLoading}
      />

      {mode === "race" ? (
        <RaceReplayPanel
          trackRef={trackRef}
          trackBounds={trackBounds}
          raceData={raceReplayQuery.data}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isLoading={isLoading}
          playbackRate={playbackRate}
          onTogglePlayback={handleTogglePlayback}
          onSeekBy={seekBy}
          onReset={reset}
          onSetPlaybackRate={setPlaybackRate}
          onSetCurrentTime={setCurrentTime}
        />
      ) : (
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
            driverCode={selection.driver}
            driverName={telemetryDriverName}
            driverTeam={telemetryTeam}
            driverCompound={selectedCompound}
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
            selectedTeam={telemetryTeam}
            selectedDriverName={telemetryDriverName}
            trackLabel={selectedGrandPrix.circuit}
            sessionLabel={effectiveSelection.session}
            grandPrixLabel={selectedGrandPrix.label}
            isLoading={isLoading}
            summaryCards={summaryCards}
          />
        </section>
      )}

      {isError ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}

export function ReplayDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialState = useMemo(
    () => buildSelectionFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const searchParamsString = searchParams.toString();

  return (
    <ReplayDashboardContent
      key={searchParamsString}
      mode={initialState.mode}
      selection={initialState.selection}
      pathname={pathname}
      searchParamsString={searchParamsString}
      router={router}
    />
  );
}