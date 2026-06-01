"use client";

import { motion } from "framer-motion";
import { ChevronRight, FlagTriangleRight, Gauge, Swords, TimerReset, type LucideIcon } from "lucide-react";

export function RacePlaceholder() {
  const plannedFeatures: Array<{ icon: LucideIcon; label: string }> = [
    { icon: Swords, label: "Position changes" },
    { icon: Gauge, label: "Strategy analysis" },
    { icon: FlagTriangleRight, label: "Driver battles" },
    { icon: TimerReset, label: "Overtake visualization" },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,20,28,0.96),rgba(8,10,15,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#e10600]">
            Race Analytics
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Coming Soon
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a8b0bd]">
            The race workspace is reserved for strategy, battles, and position
            changes. Qualifying replay remains fully active while this module is
            being built.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/70">
          <FlagTriangleRight className="h-4 w-4 text-[#e10600]" />
          Race Mode Locked
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">
            Planned features
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plannedFeatures.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e10600]/35 bg-[#e10600]/10 text-[#ff6f66]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e10600]/20 bg-[radial-gradient(circle_at_top,rgba(225,6,0,0.14),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-[#ffb2ac]">
            Built for the next release
          </p>
          <h3 className="mt-3 text-xl font-semibold text-white">
            Race pace comparison
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#b2bac5]">
            This slot will host stint windows, tire degradation, and live battle
            visualization once the race data pipeline is wired in.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/85">
            <span className="h-2 w-2 rounded-full bg-[#e10600] shadow-[0_0_18px_rgba(225,6,0,0.8)]" />
            Designed to keep qualifying telemetry untouched
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5 text-xs text-white/45">
        <span>Race analytics framework</span>
        <span className="inline-flex items-center gap-2 text-[#ffccc7]">
          <ChevronRight className="h-4 w-4" />
          Coming in a future release
        </span>
      </div>
    </motion.article>
  );
}
