import { createLazyFileRoute } from "@tanstack/react-router";
import ky from "ky";

import { ProtectedRoute, useAuth } from "~/app/lib/auth";

import type { z } from "astro:content";
import type { schema } from "~/lib/shared/papercut";

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
    } satisfies z.infer<typeof schema>;

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
