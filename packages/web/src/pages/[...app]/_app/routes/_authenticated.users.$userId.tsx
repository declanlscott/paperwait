import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/users/$userId")({
  component: Component,
});

function Component() {
  return "TODO";
}
