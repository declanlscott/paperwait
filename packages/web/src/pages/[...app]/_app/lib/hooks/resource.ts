import { useContext } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors/application";

import { ResourceContext } from "~/app/lib/contexts";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) throw new MissingContextProviderError("Resource");

  return context;
}
