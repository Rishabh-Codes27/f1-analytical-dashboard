"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isDemoAuthenticated } from "@/lib/demo-auth";

type DemoAuthGateProps = {
  children: ReactNode;
};

export function DemoAuthGate({ children }: DemoAuthGateProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = isDemoAuthenticated();
    setAuthenticated(auth);
    if (!auth) {
      router.replace("/login?next=/dashboard");
    }
  }, [router]);

  if (!mounted || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b10] text-white/65">
        Checking demo access...
      </div>
    );
  }

  return <>{children}</>;
}