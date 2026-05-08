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
  lap_number: number | null;
  compound: string | null;
};
