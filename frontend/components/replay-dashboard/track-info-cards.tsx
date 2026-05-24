"use client";

import { Gauge, Timer } from "lucide-react";

type TrackInfoCardsProps = {
  lapTime: string;
  sector1: string | null;
  sector2: string | null;
  sector3: string | null;
  driver: string;
  team: string;
  compound: string | null;
};

function InfoCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-white shadow-lg backdrop-blur-md">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#82dbd0]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#eafffc]">{value}</p>
      {subtext ? <p className="mt-0.5 text-[11px] text-white/60">{subtext}</p> : null}
    </div>
  );
}

export function TrackInfoCards({
  lapTime,
  sector1,
  sector2,
  sector3,
  driver,
  team,
  compound,
}: TrackInfoCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <div className="md:col-span-1">
        <InfoCard label="Fastest Lap" value={lapTime} subtext="Session best" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-3">
        <InfoCard label="Sector 1" value={sector1 ?? "--:--.---"} />
        <InfoCard label="Sector 2" value={sector2 ?? "--:--.---"} />
        <InfoCard label="Sector 3" value={sector3 ?? "--:--.---"} />
      </div>
      <div className="md:col-span-1">
        <div className="rounded-xl border border-[#58e4d6]/30 bg-[linear-gradient(180deg,rgba(4,17,18,0.78),rgba(1,9,10,0.92))] px-3 py-2 text-white shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#82dbd0]">
            <Gauge className="h-3.5 w-3.5" /> Driver
          </div>
          <p className="mt-1 text-base font-semibold text-[#eafffc]">{driver}</p>
          <p className="text-[11px] text-white/60">{team}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#cafff9]">
            <Timer className="h-3.5 w-3.5" />
            <span>{compound ?? "Unknown compound"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}