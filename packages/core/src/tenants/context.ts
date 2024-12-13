import { useActor } from "../actors/context";
import { ApplicationError } from "../utils/errors";

import type { Tenant } from "./sql";

export function useTenant(): { id: Tenant["id"] } {
  const actor = useActor();

  if ("isAuthed" in actor.properties) {
    if (!actor.properties.isAuthed)
      throw new ApplicationError.Unauthenticated(
        "Expected user actor to be authenticated",
      );

    return { id: actor.properties.tenant.id };
  }

  return { id: actor.properties.tenantId };
}
