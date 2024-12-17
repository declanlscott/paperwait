import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/settings/rooms/$roomId/cost-scripts";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.userId, routeId),
    ),
  component: Component,
});

function Component() {
  return "TODO";
}
