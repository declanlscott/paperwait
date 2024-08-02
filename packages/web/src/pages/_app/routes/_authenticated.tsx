import { createFileRoute } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/app/layouts/authenticated";
import { queryFactory } from "~/app/lib/hooks/data";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) =>
    context.authStore.actions.authenticateRoute(location.href),
  loader: async ({ context }) => {
    const initialOrg = await context.replicache.query(
      queryFactory.organization(),
    );
    const initialRooms = await context.replicache.query(queryFactory.rooms());

    return { initialOrg, initialRooms };
  },
  component: AuthenticatedLayout,
});
