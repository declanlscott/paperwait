import { Link } from "react-aria-components";
import { formatChannel } from "@paperwait/core/realtime";
import { Outlet, useRouter } from "@tanstack/react-router";

import {
  AuthedProvider,
  useAuthActions,
  useAuthedContext,
} from "~/app/lib/auth";
import { useRealtime } from "~/app/lib/realtime";
import { ReplicacheProvider } from "~/app/lib/replicache";

import type { PropsWithChildren } from "react";

export function AuthedLayout() {
  const { logout } = useAuthActions();
  const { invalidate } = useRouter();

  async function handleLogout() {
    await logout();
    await invalidate();
  }

  return (
    <AuthedProvider>
      <ReplicacheProvider>
        <Realtime>
          <nav>
            <img src="./logo.svg" className="size-10" />

            <ul>
              <li>
                <a href="/">Home</a>
              </li>

              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>

              <li>
                <Link href="/settings">Settings</Link>
              </li>

              <li>
                <Link onPress={handleLogout}>Logout</Link>
              </li>
            </ul>
          </nav>

          <Outlet />
        </Realtime>
      </ReplicacheProvider>
    </AuthedProvider>
  );
}

function Realtime(props: PropsWithChildren) {
  const { user } = useAuthedContext();

  useRealtime({ channel: formatChannel("org", user.orgId) });
  useRealtime({ channel: formatChannel("user", user.id) });

  return props.children;
}
