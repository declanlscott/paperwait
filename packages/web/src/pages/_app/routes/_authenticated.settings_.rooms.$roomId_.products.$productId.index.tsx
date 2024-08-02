import { createFileRoute, notFound } from "@tanstack/react-router";

import { queryFactory } from "~/app/lib/hooks/data";

export const Route = createFileRoute(
  "/_authenticated/settings/rooms/$roomId/products/$productId/",
)({
  beforeLoad: ({ context }) =>
    context.authStore.actions.authorizeRoute(context.user, [
      "administrator",
      "operator",
    ]),
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
  return (
    <div>
      Hello /_authenticated/settings/rooms/$roomId/products/$productId/!
    </div>
  );
}
