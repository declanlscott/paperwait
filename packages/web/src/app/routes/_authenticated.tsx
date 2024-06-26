import { createFileRoute } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/app/layouts/authenticated";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) =>
    context.authStore.actions.authenticateRoute(location.href),
  component: AuthenticatedLayout,
});
