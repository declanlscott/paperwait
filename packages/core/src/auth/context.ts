import { assertActor } from "../actors/context";
import { ApplicationError } from "../utils/errors";

export function useAuthn() {
  const actor = assertActor("user");

  if (!actor.properties.isAuthed) throw new ApplicationError.Unauthenticated();

  return actor.properties;
}
