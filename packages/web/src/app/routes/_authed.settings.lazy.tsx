import { createLazyFileRoute } from "@tanstack/react-router";
import ky from "ky";

import { useAuthedContext } from "~/app/lib/auth";

import type { Papercut } from "@paperwait/core/papercut";

export const Route = createLazyFileRoute("/_authed/settings")({
  component: () => <Component />,
});

function Component() {
  const { user } = useAuthedContext();

  async function handlePapercut() {
    const papercut = {
      serverUrl: "https://example.com",
      authToken: "secret-token",
    } satisfies Papercut;

    await ky.post(`/api/organization/${user.orgId}/papercut`, {
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
