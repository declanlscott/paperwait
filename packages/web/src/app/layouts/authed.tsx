import { formatChannel } from "@paperwait/core/realtime";
import { Outlet } from "@tanstack/react-router";

import { AuthedProvider } from "~/app/components/providers/auth";
import { ReplicacheProvider } from "~/app/components/providers/replicache";
import { MainNav } from "~/app/components/ui/main-nav";
import { useAuthed } from "~/app/lib/hooks/auth";
import { useRealtime } from "~/app/lib/hooks/realtime";

import type { PropsWithChildren } from "react";

export function AuthedLayout() {
  return (
    <AuthedProvider>
      <ReplicacheProvider>
        <Realtime>
          <MainNav />

          <Outlet />
        </Realtime>
      </ReplicacheProvider>
    </AuthedProvider>
  );
}

function Realtime(props: PropsWithChildren) {
  const { user } = useAuthed();

  useRealtime({ channel: formatChannel("org", user.orgId) });
  useRealtime({ channel: formatChannel("user", user.id) });

  return props.children;
}
