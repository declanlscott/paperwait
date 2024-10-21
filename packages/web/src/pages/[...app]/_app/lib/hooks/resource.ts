import { useContext } from "react";
import { ApplicationError } from "@paperwait/core/utils/errors";

import { ResourceContext } from "~/app/lib/contexts";

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) throw new ApplicationError.MissingContextProvider("Resource");

  return context;
}
