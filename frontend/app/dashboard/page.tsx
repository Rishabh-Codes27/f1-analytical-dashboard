import { DemoAuthGate } from "@/components/demo-auth-gate";
import { ReplayDashboard } from "@/components/replay-dashboard";

export default function DashboardPage() {
  return (
    <DemoAuthGate>
      <ReplayDashboard />
    </DemoAuthGate>
  );
}
