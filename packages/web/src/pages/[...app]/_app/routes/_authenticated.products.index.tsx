import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/products/")({
  component: Component,
});

function Component() {
  return "TODO";
}
