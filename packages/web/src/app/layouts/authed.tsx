import { Link } from "react-aria-components";
import { Outlet, useRouter } from "@tanstack/react-router";

import { AuthedProvider, useAuthActions } from "~/app/lib/auth";
import { ReplicacheProvider } from "~/app/lib/replicache";

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
      </ReplicacheProvider>
    </AuthedProvider>
  );
}
