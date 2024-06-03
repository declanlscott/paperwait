import { useCallback, useContext } from "react";
import { optimistic, permissions } from "@paperwait/core/mutations";
import { generateId } from "@paperwait/core/nano-id";
import { assertRole } from "@paperwait/core/user";
import { MissingContextProviderError } from "@paperwait/core/errors";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthedContext } from "~/app/lib/hooks/auth";

import type { UpdateUserRoleMutationArgs } from "@paperwait/core/mutations";
import type { Order } from "@paperwait/core/order";
import type { OmitTimestamps } from "@paperwait/core/types/drizzle";
import type { User } from "@paperwait/core/user";
import type { WriteTransaction } from "replicache";

export function useReplicache() {
  const context = useContext(ReplicacheContext);

  if (!context) throw new MissingContextProviderError("Replicache");

  return context.replicache;
}

export function useMutators() {
  const authed = useAuthedContext();

  const updateUserRole = useCallback(
    async (tx: WriteTransaction, args: UpdateUserRoleMutationArgs) => {
      if (assertRole(authed.user, permissions.updateUserRole, false)) {
        const prev = await optimistic.readUser(tx, args.id);
        if (!prev) return;

        return await optimistic.updateUser(tx, { ...prev, ...args });
      }
    },
    [authed.user],
  );

  const deleteUser = useCallback(
    async (tx: WriteTransaction, id: User["id"]) => {
      if (assertRole(authed.user, permissions.deleteUser, false))
        return await deleteUser(tx, id);
    },
    [authed.user],
  );

  const createOrder = useCallback(
    async (
      tx: WriteTransaction,
      newOrder: Omit<OmitTimestamps<Order>, "id" | "orgId">,
    ) => {
      if (assertRole(authed.user, permissions.createOrder, false)) {
        const now = new Date().toISOString();

        return await optimistic.createOrder(tx, {
          id: generateId(),
          orgId: authed.user.orgId,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          ...newOrder,
        });
      }
    },
    [authed.user],
  );

  const deleteOrder = useCallback(
    async (tx: WriteTransaction, id: Order["id"]) => {
      const order = await optimistic.readOrder(tx, id);
      if (!order) return;

      if (!assertRole(authed.user, permissions.deleteOrder, false))
        if (order.customerId !== authed.user.id) return;

      return await optimistic.deleteOrder(tx, id);
    },
    [authed.user],
  );

  return { updateUserRole, deleteUser, createOrder, deleteOrder };
}

export type Mutators = ReturnType<typeof useMutators>;
