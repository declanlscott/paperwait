import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/settings/rooms/$roomId/products/$productId",
)({
  beforeLoad: ({ context }) =>
    context.authStore.actions.authorizeRoute(context.user, [
      "administrator",
      "operator",
    ]),
  component: () => (
    <div>Hello /_authenticated/settings/rooms/$roomId/$productId/!</div>
  ),
});
