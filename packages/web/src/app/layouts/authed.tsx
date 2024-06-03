import { Link } from "react-aria-components";
import { formatChannel } from "@paperwait/core/realtime";
import { Outlet } from "@tanstack/react-router";

import { AuthedProvider } from "~/app/components/providers/auth";
import { ReplicacheProvider } from "~/app/components/providers/replicache";
import { useAuthed, useLogout } from "~/app/lib/hooks/auth";
import { useRealtime } from "~/app/lib/hooks/realtime";

import type { PropsWithChildren } from "react";

export function AuthedLayout() {
  return (
    <AuthedProvider>
      <ReplicacheProvider>
        <Realtime>
          <Nav />

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

function Nav() {
  const logout = useLogout();

  return (
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
          <Link onPress={logout}>Logout</Link>
        </li>
      </ul>
    </nav>
  );
}
