import { createFileRoute } from "@tanstack/react-router";

import { useResource } from "~/app/lib/resource";

export const Route = createFileRoute("/_authed/dashboard")({
  component: () => <Component />,
});

function Component() {
  const resource = useResource();

  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>
      <p>{resource.ReplicacheLicenseKey.value} from context!</p>
    </>
  );
}
