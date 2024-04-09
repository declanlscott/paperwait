import { Link } from "react-aria-components";
import { flushSync } from "react-dom";
import { Outlet, useRouter } from "@tanstack/react-router";

import { useAuth } from "~/app/lib/auth";

export function BaseLayout() {
  const auth = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });

    // Ensures the auth context is reset before the router runs
    flushSync(auth.reset);
    await router.invalidate();
  }

  return (
    <>
      <nav>
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
    </>
  );
}
