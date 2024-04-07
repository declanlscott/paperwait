import { createLazyFileRoute } from "@tanstack/react-router";

import { ProtectedRoute } from "~/app/lib/auth";

const path = "/settings";

export const Route = createLazyFileRoute(path)({
  component: () => <Component />,
});

function Component() {
  return (
    <ProtectedRoute path={path}>
      <div>Hello /settings!</div>
    </ProtectedRoute>
  );
}
