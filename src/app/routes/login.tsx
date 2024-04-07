import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: () => <Component />,
});

function Component() {
  return (
    <>
      <div>Hello /login</div>
      <a href="/api/auth/entra-id/login?org=test-org">Login</a>
    </>
  );
}
