import { and, arrayOverlaps, eq, isNull, sql } from "drizzle-orm";
import { uniqueBy } from "remeda";

import { Comment } from "../comment/comment.sql";
import { Order } from "../order/order.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";
import { ReplicacheClient } from "./replicache.sql";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";

export type Metadata = {
  id: string | number;
  rowVersion: number;
};

export async function searchUsers(tx: Transaction, user: LuciaUser) {
  const selectAll = async () =>
    await tx
      .select({ id: User.id, rowVersion: sql<number>`"user.xmin"` })
      .from(User)
      .where(and(eq(User.orgId, user.orgId), isNull(User.deletedAt)));

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({
          id: User.id,
          rowVersion: sql<number>`"user"."xmin"`,
        })
        .from(User)
        .where(eq(User.orgId, user.orgId)),
    searchAsOperator: selectAll,
    searchAsManager: selectAll,
    searchAsCustomer: selectAll,
  });
}

export async function searchPapercutAccounts(tx: Transaction, user: LuciaUser) {
  const selectAll = async () =>
    await tx
      .select({
        id: PapercutAccount.id,
        rowVersion: sql<number>`"papercut_account"."xmin"`,
      })
      .from(PapercutAccount)
      .where(
        and(
          eq(PapercutAccount.orgId, user.orgId),
          isNull(PapercutAccount.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({
          id: PapercutAccount.id,
          rowVersion: sql<number>`"papercut_account"."xmin"`,
        })
        .from(PapercutAccount)
        .where(and(eq(PapercutAccount.orgId, user.orgId))),
    searchAsOperator: selectAll,
    searchAsManager: selectAll,
    searchAsCustomer: selectAll,
  });
}

export async function searchPapercutAccountCustomerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const selectAll = async () =>
    await tx
      .select({
        id: PapercutAccountCustomerAuthorization.id,
        rowVersion: sql<number>`"papercut_account_customer_authorization"."xmin"`,
      })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
          isNull(PapercutAccountCustomerAuthorization.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({
          id: PapercutAccountCustomerAuthorization.id,
          rowVersion: sql<number>`"papercut_account_customer_authorization"."xmin"`,
        })
        .from(PapercutAccountCustomerAuthorization)
        .where(eq(PapercutAccountCustomerAuthorization.orgId, user.orgId)),
    searchAsOperator: selectAll,
    searchAsManager: selectAll,
    searchAsCustomer: selectAll,
  });
}

export async function searchPapercutAccountManagerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const selectAll = async () =>
    await tx
      .select({
        id: PapercutAccountManagerAuthorization.id,
        rowVersion: sql<number>`"papercut_account_manager_authorization"."xmin"`,
      })
      .from(PapercutAccountManagerAuthorization)
      .where(
        and(
          eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
          isNull(PapercutAccountManagerAuthorization.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({
          id: PapercutAccountManagerAuthorization.id,
          rowVersion: sql<number>`"papercut_account_manager_authorization"."xmin"`,
        })
        .from(PapercutAccountManagerAuthorization)
        .where(eq(PapercutAccountManagerAuthorization.orgId, user.orgId)),
    searchAsOperator: selectAll,
    searchAsManager: selectAll,
    searchAsCustomer: selectAll,
  });
}

export async function searchRooms(tx: Transaction, user: LuciaUser) {
  const selectPublished = async () =>
    await tx
      .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
      .from(Room)
      .where(
        and(
          eq(Room.orgId, user.orgId),
          eq(Room.status, "published"),
          isNull(Room.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
        .from(Room)
        .where(eq(Room.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
        .from(Room)
        .where(and(eq(Room.orgId, user.orgId), isNull(Room.deletedAt))),
    searchAsManager: selectPublished,
    searchAsCustomer: selectPublished,
  });
}

export async function searchProducts(tx: Transaction, user: LuciaUser) {
  const selectPublished = async () =>
    await tx
      .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
      .from(Product)
      .where(
        and(
          eq(Product.orgId, user.orgId),
          eq(Product.status, "published"),
          isNull(Product.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
        .from(Product)
        .where(eq(Product.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
        .from(Product)
        .where(and(eq(Product.orgId, user.orgId), isNull(Product.deletedAt))),
    searchAsManager: selectPublished,
    searchAsCustomer: selectPublished,
  });
}

export async function searchOrders(tx: Transaction, user: LuciaUser) {
  const selectCustomerOrders = async () =>
    await tx
      .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
      .from(Order)
      .where(
        and(
          eq(Order.orgId, user.orgId),
          eq(Order.customerId, user.id),
          isNull(Order.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
        .from(Order)
        .where(eq(Order.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
        .from(Order)
        .where(and(eq(Order.orgId, user.orgId), isNull(Order.deletedAt))),
    searchAsManager: async () => {
      const [customerOrders, managerOrders] = await Promise.all([
        selectCustomerOrders(),
        tx
          .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
          .from(Order)
          .innerJoin(
            PapercutAccount,
            and(
              eq(Order.papercutAccountId, PapercutAccount.id),
              eq(Order.orgId, PapercutAccount.orgId),
            ),
          )
          .innerJoin(
            PapercutAccountManagerAuthorization,
            and(
              eq(
                PapercutAccount.id,
                PapercutAccountManagerAuthorization.papercutAccountId,
              ),
              eq(
                PapercutAccount.orgId,
                PapercutAccountManagerAuthorization.orgId,
              ),
            ),
          )
          .where(and(eq(Order.orgId, user.orgId), isNull(Order.deletedAt))),
      ]);

      return uniqueBy([...customerOrders, ...managerOrders], ({ id }) => id);
    },
    searchAsCustomer: selectCustomerOrders,
  });
}

export async function searchComments(tx: Transaction, user: LuciaUser) {
  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
        .from(Comment)
        .where(eq(Comment.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
        .from(Comment)
        .where(
          and(
            eq(Comment.orgId, user.orgId),
            arrayOverlaps(Comment.visibleTo, [
              "operator",
              "manager",
              "customer",
            ]),
            isNull(Comment.deletedAt),
          ),
        ),
    searchAsManager: async () =>
      await tx
        .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
        .from(Comment)
        .innerJoin(
          Order,
          and(eq(Comment.orderId, Order.id), eq(Comment.orgId, Order.orgId)),
        )
        .innerJoin(
          PapercutAccount,
          and(
            eq(Order.papercutAccountId, PapercutAccount.id),
            eq(Order.orgId, PapercutAccount.orgId),
          ),
        )
        .innerJoin(
          PapercutAccountManagerAuthorization,
          and(
            eq(
              PapercutAccount.id,
              PapercutAccountManagerAuthorization.papercutAccountId,
            ),
            eq(
              PapercutAccount.orgId,
              PapercutAccountManagerAuthorization.orgId,
            ),
          ),
        )
        .where(
          and(
            eq(Comment.orgId, user.orgId),
            arrayOverlaps(Comment.visibleTo, ["manager", "customer"]),
            isNull(Comment.deletedAt),
          ),
        ),
    searchAsCustomer: async () =>
      await tx
        .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
        .from(Comment)
        .innerJoin(
          Order,
          and(eq(Comment.orderId, Order.id), eq(Comment.orgId, Order.orgId)),
        )
        .where(
          and(
            eq(Order.customerId, user.id),
            eq(Order.orgId, user.orgId),
            arrayOverlaps(Comment.visibleTo, ["customer"]),
            isNull(Comment.deletedAt),
          ),
        ),
  });
}

async function searchAsRole(
  role: LuciaUser["role"],
  callbacks: Record<
    `searchAs${Capitalize<LuciaUser["role"]>}`,
    () => Promise<Array<Metadata>>
  >,
) {
  switch (role) {
    case "administrator":
      return callbacks.searchAsAdministrator();
    case "operator":
      return callbacks.searchAsOperator();
    case "manager":
      return callbacks.searchAsManager();
    case "customer":
      return callbacks.searchAsCustomer();
    default:
      role satisfies never;
      return [];
  }
}

export async function searchClients(
  tx: Transaction,
  clientGroupId: ReplicacheClient["clientGroupId"],
) {
  return await tx
    .select({
      id: ReplicacheClient.id,
      rowVersion: ReplicacheClient.lastMutationId,
    })
    .from(ReplicacheClient)
    .where(eq(ReplicacheClient.clientGroupId, clientGroupId));
}
