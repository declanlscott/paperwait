import { useContext } from "react";
import { MissingContextProvider } from "@paperwait/core/errors/application";

import { ResourceContext } from "~/app/lib/contexts";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) throw new MissingContextProvider("Resource");

  return context;
}
