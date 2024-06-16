import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Component,
});

function Component() {
  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>
    </>
  );
}
