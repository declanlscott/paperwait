import { formatChannel } from "@printworks/core/realtime/shared";
import { Outlet } from "@tanstack/react-router";
import { toast } from "sonner";

import { AuthenticatedProvider } from "~/app/components/providers/auth";
import { CommandBarProvider } from "~/app/components/providers/command-bar";
import { MainNav } from "~/app/components/ui/main-nav";
import { Button } from "~/app/components/ui/primitives/button";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { useRealtime } from "~/app/lib/hooks/realtime";

import type { PropsWithChildren } from "react";

export function AuthenticatedLayout() {
  return (
    <AuthenticatedProvider>
      <RealtimeWrapper>
        <CommandBarProvider>
          <MainNav />

          <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
            <Outlet />
          </main>
        </CommandBarProvider>
      </RealtimeWrapper>
    </AuthenticatedProvider>
  );
}

function RealtimeWrapper(props: PropsWithChildren) {
  const { user } = useAuthenticated();

  useRealtime({ channel: formatChannel("tenant", user.tenantId) });
  useRealtime({ channel: formatChannel("user", user.id) });

  useQuery(queryFactory.user(user.id), {
    onData: (u) => {
      if (u && u.profile.role !== user.profile.role)
        toast(
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-sm">
                Your role has been updated to "
                <span className="font-bold capitalize">{u.profile.role}</span>".
              </p>

              <p className="text-muted-foreground text-sm">
                Reload the app to apply the changes.
              </p>
            </div>

            <Button
              variant="secondary"
              onPress={() => window.location.reload()}
            >
              Reload
            </Button>
          </div>,
          { duration: Infinity },
        );
    },
  });

  return props.children;
}
