import { createFileRoute } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/app/layouts/authenticated";
import { queryFactory } from "~/app/lib/hooks/data";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) =>
    context.authStore.actions.authenticateRoute(location.href),
  loader: async ({ context }) => {
    const initialRooms = await context.replicache.query(queryFactory.rooms());

    return { initialRooms };
  },
  component: AuthenticatedLayout,
});
