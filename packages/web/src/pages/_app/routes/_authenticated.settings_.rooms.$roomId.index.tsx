import { createFileRoute, notFound } from "@tanstack/react-router";

import { queryFactory, useQuery } from "~/app/lib/hooks/data";

export const Route = createFileRoute("/_authenticated/settings/rooms/$roomId/")(
  {
    beforeLoad: ({ context }) =>
      context.authStore.actions.authorizeRoute(context.user, [
        "administrator",
        "operator",
      ]),
    loader: async ({ context, params }) => {
      const initialRoom = await context.replicache.query(
        queryFactory.room(params.roomId),
      );
      if (!initialRoom) throw notFound();

      return { initialRoom };
    },
    component: Component,
  },
);

function Component() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  return null;
}
