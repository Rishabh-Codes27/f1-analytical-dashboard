import { type PositionPoint } from "@/lib/types/telemetry";

export type SpeedPoint = { time: number; speed: number };
export type LapChartPoint = { time: number; speed: number; sessionTime: number };
export type LapSegment = {
  lapNumber: number;
  startTime: number;
  endTime: number;
  points: SpeedPoint[];
};

export function formatSeconds(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const totalMilliseconds = Math.round(safe * 1000);
  const totalMinutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${totalMinutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function formatMaybeSeconds(totalSeconds: number | null | undefined) {
  if (typeof totalSeconds !== "number" || Number.isNaN(totalSeconds)) {
    return "--:--.---";
  }

  return formatSeconds(totalSeconds);
}

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

export function interpolatePositionSmooth(
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

export function interpolateSpeed(points: SpeedPoint[], time: number): number | null {
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

export function buildLapSegments(points: SpeedPoint[]): LapSegment[] {
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
    const segmentPoints = points.slice(segment.startIndex, segment.endIndex + 1);
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

export function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
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