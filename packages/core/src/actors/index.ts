import { Utils } from "../utils";
import { ApplicationError } from "../utils/errors";

import type { Tenant } from "../tenants/sql";
import type { Actor } from "./shared";

export type ActorContext = Actor;
export const ActorContext = Utils.createContext<ActorContext>("Actor");

export const useActor = ActorContext.use;
export const withActor = ActorContext.with;

export function assertActor<TActorType extends Actor["type"]>(
  type: TActorType,
) {
  const actor = useActor();

  if (actor.type !== type)
    throw new Error(`Expected actor type ${type}, got ${actor.type}`);

  return actor as Extract<Actor, { type: TActorType }>;
}

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

export function useAuthenticated() {
  const actor = assertActor("user");

  if (!actor.properties.isAuthed) throw new ApplicationError.Unauthenticated();

  return actor.properties;
}
