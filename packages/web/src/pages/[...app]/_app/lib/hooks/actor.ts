import { useContext } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ActorContext } from "~/app/lib/contexts";

export function useActor() {
  const context = useContext(ActorContext);

  if (!context) throw new ApplicationError.MissingContextProvider("Actor");

  return context;
}
