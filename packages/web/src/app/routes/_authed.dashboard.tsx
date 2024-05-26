import { createFileRoute } from "@tanstack/react-router";
import { useSubscribe } from "replicache-react";

import { useReplicache } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Component,
});

function Component() {
  const resource = useResource();
  const replicache = useReplicache();

  const users = useSubscribe(replicache, async (tx) =>
    tx.scan({ prefix: "user/" }).entries().toArray(),
  );

  console.log({ users });

  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>
      <p>{resource.ReplicacheLicenseKey.value} from context!</p>
    </>
  );
}
