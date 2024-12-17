import { createFileRoute } from "@tanstack/react-router";

const routeId = "/_authenticated/users/$userId";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(
        tx,
        context.actor.properties.id,
        routeId,
        context.actor.properties.id,
      ),
    ),
  component: Component,
});

function Component() {
  return "TODO";
}
