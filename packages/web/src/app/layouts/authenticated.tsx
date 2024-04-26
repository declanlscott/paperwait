import { Link } from "react-aria-components";
import { Outlet, useRouter } from "@tanstack/react-router";

import { AuthenticatedProvider, useAuthActions } from "~/app/lib/auth";
import { ReplicacheProvider } from "~/app/lib/replicache";

export function AuthenticatedLayout() {
  const { logout } = useAuthActions();
  const { invalidate } = useRouter();

  async function handleLogout() {
    await logout();
    await invalidate();
  }

  return (
    <AuthenticatedProvider>
      <ReplicacheProvider>
        <nav>
          <img src="./logo.svg" className="h-10 w-10" />

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
    </AuthenticatedProvider>
  );
}
