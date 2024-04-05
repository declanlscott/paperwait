import { Link } from "react-aria-components";
import { Outlet } from "@tanstack/react-router";

export function BaseLayout() {
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
        </ul>
      </nav>

      <Outlet />
    </>
  );
}
