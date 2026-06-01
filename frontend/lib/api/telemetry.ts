import {
  type DriverTelemetryResponse,
  type FastestLapResponse,
  type MetricSeriesResponse,
  type PositionSeriesResponse,
  type RaceReplayResponse,
} from "@/lib/types/telemetry";

type QueryParams = Record<string, string | number | undefined>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://127.0.0.1:8000/api/v1";

function buildUrl(path: string, query: QueryParams) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    searchParams.set(key, String(value));
  }

  return `${API_BASE_URL}${path}?${searchParams.toString()}`;
}

async function requestJson<T>(path: string, query: QueryParams): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Keep fallback status message when response body is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export type SessionSelection = {
  year: number;
  grandPrix: string;
  session: string;
  driver: string;
};

export async function fetchPositions(
  selection: SessionSelection,
  maxPoints = 2500,
) {
  return requestJson<PositionSeriesResponse>("/telemetry/positions", {
    year: selection.year,
    grand_prix: selection.grandPrix,
    session: selection.session,
    driver: selection.driver,
    max_points: maxPoints,
  });
}

export async function fetchDriverTelemetry(selection: SessionSelection) {
  return requestJson<DriverTelemetryResponse>("/telemetry", {
    year: selection.year,
    grand_prix: selection.grandPrix,
    session: selection.session,
    driver: selection.driver,
  });
}

export async function fetchSpeed(
  selection: SessionSelection,
  maxPoints = 2500,
) {
  return requestJson<MetricSeriesResponse>("/telemetry/speed", {
    year: selection.year,
    grand_prix: selection.grandPrix,
    session: selection.session,
    driver: selection.driver,
    max_points: maxPoints,
  });
}

export async function fetchFastestLap(
  selection: Omit<SessionSelection, "driver">,
) {
  return requestJson<FastestLapResponse>("/telemetry/fastest-lap", {
    year: selection.year,
    grand_prix: selection.grandPrix,
    session: selection.session,
  });
}

export async function fetchRaceReplay(
  selection: Omit<SessionSelection, "driver">,
  maxTrackPoints = 4000,
  maxLeaderboardPoints = 1200,
) {
  return requestJson<RaceReplayResponse>("/telemetry/race-replay", {
    year: selection.year,
    grand_prix: selection.grandPrix,
    session: selection.session,
    max_track_points: maxTrackPoints,
    max_leaderboard_points: maxLeaderboardPoints,
  });
}
