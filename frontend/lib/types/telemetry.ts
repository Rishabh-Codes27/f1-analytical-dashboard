export type PositionPoint = {
  time: number;
  x: number;
  y: number;
};

export type PositionSeriesResponse = {
  driver: string;
  team: string;
  positions: PositionPoint[];
};

export type DriverTelemetryResponse = PositionSeriesResponse & {
  telemetry: Array<{
    time: number;
    speed: number;
    throttle?: number;
    brake?: number;
    gear?: number;
    rpm?: number;
  }>;
  lap_time?: string | null;
  lap_time_seconds?: number | null;
  lap_number?: number | null;
  compound?: string | null;
  sector_1_seconds?: number | null;
  sector_2_seconds?: number | null;
  sector_3_seconds?: number | null;
  sector_1?: string | null;
  sector_2?: string | null;
  sector_3?: string | null;
};

export type MetricPoint = {
  time: number;
  value: number;
};

export type MetricSeriesResponse = {
  driver: string;
  team: string;
  metric: "speed" | "throttle" | "brake" | "gear" | "rpm";
  data: MetricPoint[];
};

export type FastestLapResponse = {
  driver: string;
  team: string;
  lap_time_seconds: number;
  lap_time: string;
  sector_1_seconds: number | null;
  sector_2_seconds: number | null;
  sector_3_seconds: number | null;
  sector_1: string | null;
  sector_2: string | null;
  sector_3: string | null;
  lap_number: number | null;
  compound: string | null;
};

export type RaceLeaderboardPoint = {
  time: number;
  position: number;
};

export type RaceDriverReplay = {
  driver: string;
  driver_name: string;
  team: string;
  positions: PositionPoint[];
  leaderboard: RaceLeaderboardPoint[];
};

export type RaceReplayResponse = {
  year: number;
  grand_prix: string;
  session: string;
  duration_seconds: number;
  drivers: RaceDriverReplay[];
};
