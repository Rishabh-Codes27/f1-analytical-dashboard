"use client";

import { motion } from "framer-motion";
import { ChevronDown, Search, Trophy, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { SessionSelection } from "@/lib/api/telemetry";
import {
  DEFAULT_DASHBOARD_MODE,
  DEFAULT_DRIVER,
  DEFAULT_GRAND_PRIX,
  DEFAULT_YEAR,
  DRIVER_OPTIONS,
  GRAND_PRIX_OPTIONS,
  getGrandPrixOption,
  type DashboardMode,
  type DriverOption,
  type GrandPrixOption,
} from "@/lib/f1-data";
import { cn } from "@/lib/utils";

type SessionHeaderProps = {
  mode: DashboardMode;
  selection: SessionSelection;
  onModeChange: (mode: DashboardMode) => void;
  onChange: (updater: (previous: SessionSelection) => SessionSelection) => void;
  isLoading: boolean;
};

function formatDriverLabel(driver: DriverOption | null) {
  if (!driver) {
    return DEFAULT_DRIVER;
  }

  return `${driver.code} · ${driver.name}`;
}

function formatGrandPrixLabel(grandPrix: GrandPrixOption | null) {
  if (!grandPrix) {
    return DEFAULT_GRAND_PRIX;
  }

  return grandPrix.label;
}

function SearchableDriverDropdown({
  value,
  options,
  onSelect,
  disabled,
}: {
  value: string;
  options: DriverOption[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.code === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.code} ${option.name} ${option.team}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition",
          "hover:border-[#e10600]/45 hover:bg-white/[0.06]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      >
        <span>
          <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">
            Driver
          </span>
          <span className="mt-1 block text-sm font-medium text-white">
            {formatDriverLabel(selected)}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#10131b] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <Search className="h-4 w-4 text-white/45" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search driver, code, team"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-80 overflow-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onSelect(option.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition",
                    option.code === value
                      ? "bg-[#e10600]/12 text-white"
                      : "text-[#d9dde7] hover:bg-white/5",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {option.code} · {option.name}
                    </span>
                    <span className="block text-xs text-white/45">
                      {option.team}
                    </span>
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55">
                    Select
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-white/45">
                No matching drivers.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SearchableGrandPrixDropdown({
  value,
  options,
  onSelect,
  disabled,
}: {
  value: string;
  options: GrandPrixOption[];
  onSelect: (label: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.label === value || option.slug === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.label} ${option.slug} ${option.circuit}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition",
          "hover:border-[#e10600]/45 hover:bg-white/[0.06]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      >
        <span>
          <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">
            Grand Prix
          </span>
          <span className="mt-1 block text-sm font-medium text-white">
            {formatGrandPrixLabel(selected)}
          </span>
          <span className="mt-1 block text-xs text-white/45">
            {selected?.circuit ?? "Select a race weekend"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#10131b] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <Search className="h-4 w-4 text-white/45" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search GP, circuit, or slug"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-80 overflow-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.slug}
                  type="button"
                  onClick={() => {
                    onSelect(option.label);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition",
                    option.label === selected?.label
                      ? "bg-[#e10600]/12 text-white"
                      : "text-[#d9dde7] hover:bg-white/5",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="block text-xs text-white/45">
                      {option.circuit}
                    </span>
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55">
                    Select
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-white/45">
                No matching grands prix.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-[#e10600]/60 bg-[#e10600]/12 text-white shadow-[0_0_0_1px_rgba(225,6,0,0.18)]"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      {children}
    </button>
  );
}

export function SessionHeader({
  mode,
  selection,
  onModeChange,
  onChange,
  isLoading,
}: SessionHeaderProps) {
  const selectedGrandPrix =
    getGrandPrixOption(selection.grandPrix) ??
    getGrandPrixOption(DEFAULT_GRAND_PRIX) ??
    GRAND_PRIX_OPTIONS[0];

  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(21,21,30,0.96),rgba(11,13,18,0.98))] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-5">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.36em] text-[#e10600]">
            Formula 1 Analytics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Telemetry Command Center
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#a9b1bf]">
            Neutral race-control styling with qualifying telemetry kept intact.
          </p>
        </div>

        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/8">
              <TriangleAlert className="h-4 w-4 text-[#e10600]" />
              Telemetry Tips
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 border-white/10 bg-[#10131b] text-sm text-white/80">
            Hover the charts to inspect timing detail. Replay controls stay tied
            to the selected qualifying lap and update as driver or event changes.
          </HoverCardContent>
        </HoverCard>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={mode === DEFAULT_DASHBOARD_MODE} onClick={() => onModeChange("qualifying")}>
            <Trophy className="h-4 w-4 text-[#e10600]" />
            Qualifying
          </TabButton>
          <TabButton active={mode === "race"} onClick={() => onModeChange("race")}>
            <span className="h-2 w-2 rounded-full bg-[#e10600]" />
            Race
          </TabButton>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/45">
          {selectedGrandPrix.label} · {selection.driver}
        </div>
      </div>

      {mode === "race" ? null : (
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[160px_minmax(0,1.35fr)_minmax(0,1.5fr)]">
          <div className="space-y-2 text-sm">
            <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">
              Season
            </span>
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">
              {DEFAULT_YEAR}
            </div>
          </div>

          <SearchableGrandPrixDropdown
            value={selection.grandPrix}
            options={GRAND_PRIX_OPTIONS}
            onSelect={(grandPrix) =>
              onChange((previous) => ({
                ...previous,
                grandPrix,
              }))
            }
            disabled={isLoading}
          />

          <SearchableDriverDropdown
            value={selection.driver}
            options={DRIVER_OPTIONS}
            onSelect={(driver) =>
              onChange((previous) => ({
                ...previous,
                driver,
              }))
            }
            disabled={isLoading}
          />
        </div>
      )}
    </motion.header>
  );
}