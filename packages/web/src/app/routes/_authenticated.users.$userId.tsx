import { createFileRoute } from "@tanstack/react-router";

import { useAuthenticated } from "~/app/lib/hooks/auth";

export const Route = createFileRoute("/_authenticated/users/$userId")({
  component: Component,
});

function Component() {
  const { user } = useAuthenticated();

  return <div>Hello /_authenticated/users/$userId!</div>;
}
