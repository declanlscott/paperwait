import { Replicache } from "@printworks/core/replicache/client";
import { usersTableName } from "@printworks/core/users/shared";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useUserActor } from "~/app/lib/hooks/actor";
import { useQuery } from "~/app/lib/hooks/data";

export function useUser() {
  const { id } = useUserActor();

  const user = useQuery((tx) => Replicache.get(tx, usersTableName, id));
  if (!user)
    throw new ApplicationError.EntityNotFound({ name: usersTableName, id });

  return user;
}
