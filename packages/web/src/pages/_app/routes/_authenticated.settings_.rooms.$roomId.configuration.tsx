import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/settings/rooms/$roomId/configuration",
)({
  component: Component,
});

function Component() {
  return "TODO";
}
