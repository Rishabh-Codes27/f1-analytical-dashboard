"use client";

import { Gauge, Timer } from "lucide-react";

import { getTeamColor } from "@/lib/f1-data";
import { cn } from "@/lib/utils";

type TrackInfoCardsProps = {
  lapTime: string;
  sector1: string | null;
  sector2: string | null;
  sector3: string | null;
  driverCode: string;
  driverName: string;
  team: string;
  compound: string | null;
  isLoading?: boolean;
};

function InfoCard({
  label,
  value,
  subtext,
  accent,
  isLoading,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: string;
  isLoading?: boolean;
}) {
  const borderColor = accent ?? "rgba(255,255,255,0.1)";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-3 py-3 text-white shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md",
        isLoading && "animate-pulse",
      )}
      style={{ borderColor }}
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">
        {isLoading ? "" : value}
      </p>
      {subtext ? <p className="mt-0.5 text-[11px] text-white/50">{isLoading ? "" : subtext}</p> : null}
    </div>
  );
}

export function TrackInfoCards({
  lapTime,
  sector1,
  sector2,
  sector3,
  driverCode,
  driverName,
  team,
  compound,
  isLoading,
}: TrackInfoCardsProps) {
  const teamColor = getTeamColor(team);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <div className="md:col-span-1">
        <InfoCard
          label="Selected Driver Fastest Lap"
          value={lapTime}
          subtext="Selected qualifying lap"
          accent="#e10600"
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-3">
        <InfoCard label="Sector 1" value={sector1 ?? "--:--.---"} accent="#2b2f3c" isLoading={isLoading} />
        <InfoCard label="Sector 2" value={sector2 ?? "--:--.---"} accent="#2b2f3c" isLoading={isLoading} />
        <InfoCard label="Sector 3" value={sector3 ?? "--:--.---"} accent="#2b2f3c" isLoading={isLoading} />
      </div>
      <div className="md:col-span-1">
        <div
          className={cn(
            "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-3 py-3 text-white shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md",
            isLoading && "animate-pulse",
          )}
          style={{ borderColor: teamColor }}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45">
            <Gauge className="h-3.5 w-3.5" /> Driver
          </div>
          <p className="mt-1 text-base font-semibold text-white">{isLoading ? "" : driverCode}</p>
          <p className="text-sm text-white/70">{isLoading ? "" : driverName}</p>
          <p className="mt-1 text-[11px] text-white/50">{isLoading ? "" : team}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/75">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamColor }} />
            <Timer className="h-3.5 w-3.5" />
            <span>{isLoading ? "" : compound ?? "Unknown compound"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}