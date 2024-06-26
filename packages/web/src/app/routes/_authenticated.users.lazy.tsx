import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/_authenticated/users")({
  component: () => <div>Hello /_authenticated/users!</div>,
});
