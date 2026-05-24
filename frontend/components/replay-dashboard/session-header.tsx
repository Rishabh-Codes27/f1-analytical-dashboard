"use client";

import { motion } from "framer-motion";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import type { SessionSelection } from "@/lib/api/telemetry";

type SessionHeaderProps = {
  selection: SessionSelection;
  onChange: (updater: (previous: SessionSelection) => SessionSelection) => void;
};

export function SessionHeader({ selection, onChange }: SessionHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-[#214447] bg-[linear-gradient(140deg,#01292c,#021518)] p-5 text-[#dbfdf8] shadow-xl"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-47.5 flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[#74d9cc]">
            Qualifying Replay
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Telemetry Command Center
          </h1>
        </div>
        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="rounded-full border border-[#47d8c9]/40 px-4 py-2 text-sm font-medium text-[#bcfff7] hover:bg-[#0a3033]">
              Snapshot Help
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            Hover the speed chart to inspect telemetry values. Replay movement
            stays tied to Play/Pause and timeline controls.
          </HoverCardContent>
        </HoverCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
            Year
          </span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
            value={selection.year}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                year: Number(event.target.value) || previous.year,
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
            Grand Prix
          </span>
          <input
            type="text"
            className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
            value={selection.grandPrix}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                grandPrix: event.target.value,
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-[#7adfd2]">
            Session
          </span>
          <input
            type="text"
            className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
            value={selection.session}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                session: event.target.value.toUpperCase(),
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-[#5f6b69]">
            Driver
          </span>
          <input
            type="text"
            className="w-full rounded-lg border border-[#2f5b5f] bg-[#022225] px-3 py-2 text-white"
            value={selection.driver}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                driver: event.target.value.toUpperCase().slice(0, 3),
              }))
            }
          />
        </label>
      </div>
    </motion.header>
  );
}