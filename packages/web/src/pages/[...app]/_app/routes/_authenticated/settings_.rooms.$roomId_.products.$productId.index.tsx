import { createFileRoute } from "@tanstack/react-router";

import { queryFactory } from "~/app/lib/hooks/data";

const routeId = "/_authenticated/settings/rooms/$roomId/products/$productId/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.actor.properties.id, routeId),
    ),
  loader: async ({ context, params }) => {
    const [initialRoom, initialProduct] = await Promise.all([
      context.replicache.query(queryFactory.room(params.roomId)),
      context.replicache.query(queryFactory.product(params.productId)),
    ]);

    return {
      initialRoom,
      initialProduct,
    };
  },
  component: Component,
});

function Component() {
  return "TODO";
}
