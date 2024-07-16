import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/products/")({
  beforeLoad: ({ context }) =>
    context.authStore.actions.authorizeRoute(context.user, [
      "administrator",
      "operator",
    ]),
  component: Component,
});

function Component() {
  return <div>Hello /_authenticated/products/!</div>;
}
