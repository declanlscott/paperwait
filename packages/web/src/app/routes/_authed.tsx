import { createFileRoute } from "@tanstack/react-router";

import { AuthedLayout } from "~/app/layouts/authed";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) =>
    context.authStore.actions.protectRoute(location.href),
  component: AuthedLayout,
});
