import { useContext } from "react";

import { ReplicacheContext } from "~/app/lib/contexts";

export function useReplicache() {
  const context = useContext(ReplicacheContext);

  if (!context)
    throw new Error("useReplicache must be used within a ReplicacheProvider");

  return context.replicache;
}
