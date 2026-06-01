"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, User } from "lucide-react";
import { useMemo, useState, type FormEvent, Suspense } from "react";

import {
  DEMO_PASSWORD,
  DEMO_USERNAME,
  setDemoAuthenticated,
} from "@/lib/demo-auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.trim().length > 0,
    [password, username],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername === DEMO_USERNAME && password === DEMO_PASSWORD) {
      setError("");
      setDemoAuthenticated(true);
      router.replace(nextPath);
      return;
    }

    setError("Invalid demo credentials. Use user / password123.");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[22px] border border-white/8 bg-[#0b0e14] p-6"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Sign In
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Demo login</h2>
      </div>

      <label className="mt-6 block space-y-2">
        <span className="flex items-center gap-2 text-sm text-white/70">
          <User className="h-4 w-4 text-[#e10600]" /> Username
        </span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#e10600]/50"
          placeholder="user"
          autoComplete="username"
        />
      </label>

      <label className="mt-4 block space-y-2">
        <span className="flex items-center gap-2 text-sm text-white/70">
          <Lock className="h-4 w-4 text-[#e10600]" /> Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#e10600]/50"
          placeholder="password123"
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-xl border border-[#e10600]/30 bg-[#e10600]/10 px-4 py-3 text-sm text-[#ffb4b0]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 py-3 font-semibold text-white transition hover:bg-[#ff1b14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Enter Dashboard
        <ArrowRight className="h-4 w-4" />
      </button>

      <div className="mt-5 text-center text-sm text-white/50">
        <Link href="/" className="transition hover:text-white">
          Back to landing page
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090b10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(225,6,0,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_32%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-4xl gap-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-8">
          <div className="flex flex-col justify-between rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(225,6,0,0.14),rgba(255,255,255,0.02))] p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#ffb4b0]">
                Demo Access
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                Enter the telemetry replay dashboard
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 md:text-base">
                Use the demo credentials to unlock the dashboard. This is a
                lightweight local gate so the landing page can hand off to the
                replay experience cleanly.
              </p>
            </div>

            <div className="mt-8 space-y-2 text-sm text-white/70">
              <p>Username: <span className="text-white">user</span></p>
              <p>Password: <span className="text-white">password123</span></p>
            </div>
          </div>

          <Suspense fallback={
            <div className="rounded-[22px] border border-white/8 bg-[#0b0e14] p-6 flex flex-col justify-center items-center min-h-[350px]">
              <div className="text-white/45 text-sm animate-pulse">Loading login credentials...</div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}