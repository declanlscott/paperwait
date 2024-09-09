import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "~/app/layouts/authenticated";
import { queryFactory } from "~/app/lib/hooks/data";
import { initialLoginSearchParams } from "~/app/lib/schemas";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    const authed = context.authStore.actions.authenticateRoute(location.href);

    if (context.replicache.status !== "ready")
      throw redirect({
        to: "/login",
        search: { redirect: true, ...initialLoginSearchParams },
      });

    return { ...authed, replicache: context.replicache.client };
  },
  loader: async ({ context }) => {
    const initialOrg = await context.replicache.query(
      queryFactory.organization(),
    );
    const initialRooms = await context.replicache.query(queryFactory.rooms());

    return { initialOrg, initialRooms };
  },
  component: AuthenticatedLayout,
});
