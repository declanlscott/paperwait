import { createFileRoute, notFound } from "@tanstack/react-router";

import { queryFactory } from "~/app/lib/hooks/data";

const routeId = "/_authenticated/settings/rooms/$roomId/products/$productId/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.userId, routeId),
    ),
  loader: async ({ context, params }) => {
    const [roomResult, productResult] = await Promise.allSettled([
      context.replicache.query(queryFactory.room(params.roomId)),
      context.replicache.query(queryFactory.product(params.productId)),
    ]);

    if (roomResult.status === "rejected" || !roomResult.value) throw notFound();
    if (productResult.status === "rejected" || !productResult.value)
      throw notFound();

    return {
      initialRoom: roomResult.value,
      initialProduct: productResult.value,
    };
  },
  component: Component,
});

function Component() {
  return "TODO";
}
