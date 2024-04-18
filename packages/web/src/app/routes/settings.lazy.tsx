import { createLazyFileRoute } from "@tanstack/react-router";
import ky from "ky";

import { ProtectedRoute, useAuth } from "~/app/lib/auth";

import type { Papercut } from "@paperwait/core/papercut";

const path = "/settings";

export const Route = createLazyFileRoute(path)({
  component: () => (
    <ProtectedRoute path={path}>
      <Component />
    </ProtectedRoute>
  ),
});

function Component() {
  const auth = useAuth();

  async function handlePapercut() {
    const papercut = {
      serverUrl: "https://example.com",
      authToken: "secret-token",
    } satisfies Papercut;

    await ky.post(`/api/organization/${auth.data.user?.orgId}/papercut`, {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(papercut),
    });
  }

  return (
    <>
      <div>Hello /settings!</div>
      <button onClick={handlePapercut}>Papercut</button>
    </>
  );
}
