import { Link, Outlet } from "@tanstack/react-router";

export function BaseLayout() {
  return (
    <>
      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>

          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>

          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
      </nav>

      <Outlet />
    </>
  );
}
