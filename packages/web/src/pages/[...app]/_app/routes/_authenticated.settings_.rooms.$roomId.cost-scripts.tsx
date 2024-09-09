import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/settings/rooms/$roomId/cost-scripts",
)({
  component: Component,
});

function Component() {
  return "TODO";
}
