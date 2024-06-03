import { createLazyFileRoute } from "@tanstack/react-router";
import ky from "ky";

import { useAuthed } from "~/app/lib/hooks/auth";

import type { PapercutParameter } from "@paperwait/core/papercut";

export const Route = createLazyFileRoute("/_authed/settings")({
  component: Component,
});

function Component() {
  const { user } = useAuthed();

  async function handlePapercut() {
    const papercut = {
      serverUrl: "https://example.com",
      authToken: "secret-token",
    } satisfies PapercutParameter;

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
