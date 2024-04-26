import { Link } from "react-aria-components";
import { Outlet, useRouter } from "@tanstack/react-router";

import { AuthenticatedProvider, useAuthActions } from "~/app/lib/auth";

export function AuthenticatedLayout() {
  const { logout } = useAuthActions();
  const { invalidate } = useRouter();

  async function handleLogout() {
    await logout();
    await invalidate();
  }

  return (
    <AuthenticatedProvider>
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
    </AuthenticatedProvider>
  );
}
