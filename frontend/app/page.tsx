"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const demoTelemetry = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const time = i * 1.5;
        const base = 220 + Math.sin(i / 4) * 28 + Math.cos(i / 7) * 12;
        const surge = i > 20 && i < 28 ? 22 : 0;

        return {
          time: Number(time.toFixed(1)),
          speed: Math.round(base + surge),
        };
      }),
    [],
  );
  const [demoIndex, setDemoIndex] = useState(
    Math.floor(demoTelemetry.length * 0.35),
  );

  const chartWidth = 320;
  const chartHeight = 120;

  const speedMin = useMemo(
    () => Math.min(...demoTelemetry.map((point) => point.speed)),
    [demoTelemetry],
  );
  const speedMax = useMemo(
    () => Math.max(...demoTelemetry.map((point) => point.speed)),
    [demoTelemetry],
  );

  const polylinePoints = useMemo(() => {
    return demoTelemetry
      .map((point, index) => {
        const x = (index / (demoTelemetry.length - 1)) * chartWidth;
        const normalizedY =
          (point.speed - speedMin) / (speedMax - speedMin || 1);
        const y = chartHeight - normalizedY * chartHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [chartHeight, chartWidth, demoTelemetry, speedMax, speedMin]);

  const activePoint = demoTelemetry[demoIndex] ?? demoTelemetry[0];
  const activeX = (demoIndex / (demoTelemetry.length - 1)) * chartWidth;
  const activeY =
    chartHeight -
    ((activePoint.speed - speedMin) / (speedMax - speedMin || 1)) * chartHeight;

  const spaTrackPoints = useMemo(
    () => [
      { x: 24, y: 168 },
      { x: 34, y: 150 },
      { x: 48, y: 132 },
      { x: 66, y: 112 },
      { x: 88, y: 90 },
      { x: 114, y: 70 },
      { x: 144, y: 52 },
      { x: 174, y: 36 },
      { x: 204, y: 22 },
      { x: 224, y: 24 },
      { x: 238, y: 36 },
      { x: 250, y: 50 },
      { x: 262, y: 64 },
      { x: 252, y: 78 },
      { x: 232, y: 72 },
      { x: 208, y: 80 },
      { x: 186, y: 94 },
      { x: 172, y: 108 },
      { x: 178, y: 122 },
      { x: 198, y: 128 },
      { x: 222, y: 134 },
      { x: 242, y: 146 },
      { x: 252, y: 162 },
      { x: 244, y: 176 },
      { x: 220, y: 180 },
      { x: 194, y: 176 },
      { x: 166, y: 162 },
      { x: 138, y: 148 },
      { x: 112, y: 140 },
      { x: 88, y: 146 },
      { x: 64, y: 158 },
      { x: 42, y: 170 },
      { x: 24, y: 168 },
    ],
    [],
  );
  const spaPolylinePoints = useMemo(
    () => spaTrackPoints.map((point) => `${point.x},${point.y}`).join(" "),
    [spaTrackPoints],
  );

  const spaPointIndex = Math.round(
    (demoIndex / (demoTelemetry.length - 1)) * (spaTrackPoints.length - 1),
  );
  const activeSpaPoint = spaTrackPoints[spaPointIndex] ?? spaTrackPoints[0];

  const pointerX = useMotionValue(-200);
  const pointerY = useMotionValue(-200);

  const smoothX = useSpring(pointerX, {
    stiffness: 220,
    damping: 30,
    mass: 0.35,
  });
  const smoothY = useSpring(pointerY, {
    stiffness: 220,
    damping: 30,
    mass: 0.35,
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [pointerX, pointerY]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090b10] text-white">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-40 h-20 w-20 rounded-full border border-[#e10600]/25 bg-[#e10600]/10 blur-[1px]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden
          className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#e10600]/15 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl"
          animate={{ y: [0, -24, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16 text-center md:px-10">
        <motion.p
          className="mx-auto mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-[#ffb4b0]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Race Intelligence Platform
        </motion.p>

        <motion.h1
          className="mx-auto max-w-4xl text-4xl font-black leading-tight md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08 }}
        >
          Formula 1 Telemetry Tool
          <span className="block bg-gradient-to-r from-white via-[#ffb4b0] to-[#e10600] bg-clip-text text-transparent">
            Replay Every Lap. Decode Every Corner.
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#afb7c4] md:text-base"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Analyze speed traces, throttle behavior, track position, and
          stint-level performance from F1 telemetry in one cinematic,
          interactive dashboard.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#e10600]/45 hover:bg-white/8"
          >
            <PlayCircle className="h-4 w-4" />
            Try Demo
          </Link>
        </motion.div>

        <motion.div
          className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 lg:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35 }}
        >
          <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#ffb4b0]/80">
                  Demo Telemetry
                </p>
                <h2 className="text-sm font-bold text-[#e7fffc]">
                  Time vs Speed
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#9aa3b2]">
                  t={activePoint.time.toFixed(1)}s
                </p>
                <p className="text-sm font-semibold text-white">
                  {activePoint.speed} km/h
                </p>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-32 w-full rounded-md border border-white/8 bg-[#0c1017]"
              role="img"
              aria-label="Demo speed chart"
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const localX = event.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, localX / rect.width));
                const nextIndex = Math.round(
                  ratio * (demoTelemetry.length - 1),
                );
                setDemoIndex(nextIndex);
              }}
            >
              <line
                x1="0"
                y1="1"
                x2={chartWidth}
                y2="1"
                stroke="rgba(255, 255, 255, 0.12)"
              />
              <line
                x1="0"
                y1={chartHeight - 1}
                x2={chartWidth}
                y2={chartHeight - 1}
                stroke="rgba(255, 255, 255, 0.12)"
              />
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(225, 6, 0, 0.92)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1={activeX}
                y1="0"
                x2={activeX}
                y2={chartHeight}
                stroke="rgba(225, 6, 0, 0.34)"
                strokeDasharray="4 4"
              />
              <circle
                cx={activeX}
                cy={activeY}
                r="4.5"
                fill="#e10600"
                stroke="#041012"
                strokeWidth="2"
              />
            </svg>

            <input
              type="range"
              min={0}
              max={demoTelemetry.length - 1}
              value={demoIndex}
              onChange={(event) => setDemoIndex(Number(event.target.value))}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10"
              aria-label="Demo timeline"
            />
          </article>

          <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#ffb4b0]/80">
                  Track Preview
                </p>
                <h2 className="text-sm font-bold text-[#e7fffc]">
                  Spa-Francorchamps
                </h2>
              </div>
              <p className="text-xs text-[#9aa3b2]">Synced to demo timeline</p>
            </div>

            <svg
              viewBox="0 0 280 190"
              className="h-40 w-full rounded-md border border-white/8 bg-[#0c1017]"
              role="img"
              aria-label="Spa track preview"
            >
              <polyline
                points={spaPolylinePoints}
                fill="none"
                stroke="rgba(255, 255, 255, 0.18)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={spaPolylinePoints}
                fill="none"
                stroke="rgba(225, 6, 0, 0.78)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="30"
                y1="172"
                x2="42"
                y2="160"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <circle
                cx={activeSpaPoint.x}
                cy={activeSpaPoint.y}
                r="6"
                fill="#e10600"
                stroke="#051212"
                strokeWidth="3"
              />
            </svg>
            <p className="mt-3 text-xs text-[#9aa3b2]">
              Spa-like layout with a long Kemmel-style climb and right-side
              loop, synced to the demo speed timeline.
            </p>
          </article>
        </motion.div>

        <motion.div
          className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4 }}
        >
          {[
            [
              "Time-Accurate Replay",
              "Sync motion and telemetry using race-timestamp interpolation.",
            ],
            [
              "Lap-Scoped Insights",
              "Jump across laps and inspect sector-level behavior instantly.",
            ],
            [
              "Statistical Telemetry",
              "Read speed, throttle, and positional trends in one place.",
            ],
          ].map(([title, copy]) => (
            <article
              key={title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#ffb4b0]">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#b6bfcb]">
                {copy}
              </p>
            </article>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
