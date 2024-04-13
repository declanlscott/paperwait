import { createContext, useContext } from "react";

import type { ReactNode } from "react";
import type { ClientResourceType } from "~/lib/shared/client-resource";

export type ResourceContext = ClientResourceType;

export const ResourceContext = createContext<ClientResourceType | null>(null);

type ResourceProviderProps = {
  children: ReactNode;
  resource: ClientResourceType;
};

export function ResourceProvider(props: ResourceProviderProps) {
  const { children, resource } = props;

  return (
    <ResourceContext.Provider value={resource}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResource() {
  const context = useContext(ResourceContext);

  if (!context) {
    throw new Error("useResource must be used within a ResourceProvider");
  }

  return context;
}
