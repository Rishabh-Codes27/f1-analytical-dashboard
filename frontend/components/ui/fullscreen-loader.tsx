"use client";

import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type FullscreenLoaderProps = {
  label?: string;
  className?: string;
};

export function FullscreenLoader({
  label = "Loading telemetry...",
  className,
}: FullscreenLoaderProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-8 py-7 text-center text-white shadow-2xl">
        <LoaderCircle className="h-12 w-12 animate-spin text-[#53dfd0]" />
        <div>
          <p className="text-sm font-medium tracking-wide text-[#d8fffb]">
            {label}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Fetching qualifying telemetry and track data
          </p>
        </div>
      </div>
    </div>
  );
}