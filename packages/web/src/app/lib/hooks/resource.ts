import { useContext } from "react";

import { ResourceContext } from "~/app/lib/contexts";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context)
    throw new Error("useResource must be used within a ResourceProvider");

  return context;
}
