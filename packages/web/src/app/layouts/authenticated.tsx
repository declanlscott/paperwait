import { formatChannel } from "@paperwait/core/realtime";
import { Outlet } from "@tanstack/react-router";

import { AuthenticatedProvider } from "~/app/components/providers/auth";
import { CommandBarProvider } from "~/app/components/providers/command-bar";
import { ReplicacheProvider } from "~/app/components/providers/replicache";
import { MainNav } from "~/app/components/ui/main-nav";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useRealtime } from "~/app/lib/hooks/realtime";

import type { PropsWithChildren } from "react";

export function AuthenticatedLayout() {
  return (
    <AuthenticatedProvider>
      <ReplicacheProvider>
        <Realtime>
          <CommandBarProvider>
            <MainNav />

            <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
              <Outlet />
            </main>
          </CommandBarProvider>
        </Realtime>
      </ReplicacheProvider>
    </AuthenticatedProvider>
  );
}

function Realtime(props: PropsWithChildren) {
  const { user } = useAuthenticated();

  useRealtime({ channel: formatChannel("org", user.orgId) });
  useRealtime({ channel: formatChannel("user", user.id) });

  return props.children;
}
