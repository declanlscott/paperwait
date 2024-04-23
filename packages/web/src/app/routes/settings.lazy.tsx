import { createLazyFileRoute } from "@tanstack/react-router";
import ky from "ky";

import { ProtectRoute, useAuth } from "~/app/lib/auth";

import type { Papercut } from "@paperwait/core/papercut";

const path = "/settings";

export const Route = createLazyFileRoute(path)({
  component: () => (
    <ProtectRoute path={path}>
      <Component />
    </ProtectRoute>
  ),
});

function Component() {
  const { user } = useAuth();

  async function handlePapercut() {
    const papercut = {
      serverUrl: "https://example.com",
      authToken: "secret-token",
    } satisfies Papercut;

    await ky.post(`/api/organization/${user?.orgId}/papercut`, {
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
