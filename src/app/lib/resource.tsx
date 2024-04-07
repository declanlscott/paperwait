import { createContext, useContext } from "react";

import type { ReactNode } from "react";
import type { ClientResource } from "~/lib/client-resource";

export type ResourceContext = ClientResource;

export const ResourceContext = createContext<ResourceContext | null>(null);

type ResourceProviderProps = {
  children: ReactNode;
  resource: ClientResource;
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
