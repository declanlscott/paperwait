import { useState } from "react";

import { ResourceContext } from "~/app/lib/contexts";

import type { PropsWithChildren } from "react";
import type { ClientResource } from "@paperwait/core/types";

interface ResourceProviderProps extends PropsWithChildren {
  resource: ClientResource;
}

export function ResourceProvider(props: ResourceProviderProps) {
  const [resource] = useState(() => props.resource);

  return (
    <ResourceContext.Provider value={resource}>
      {props.children}
    </ResourceContext.Provider>
  );
}
