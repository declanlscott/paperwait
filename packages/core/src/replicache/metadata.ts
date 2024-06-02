import { and, arrayOverlaps, eq, isNull, not } from "drizzle-orm";
import { uniqueBy } from "remeda";

import { Comment } from "../comment/comment.sql";
import { buildMetadataColumns } from "../drizzle/columns";
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
  const metadataColumns = buildMetadataColumns(User, User.id);

  const selectSelf = async () =>
    await tx
      .select(metadataColumns)
      .from(User)
      .where(and(eq(User.id, user.id), eq(User.orgId, user.orgId)));

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select(metadataColumns)
        .from(User)
        .where(eq(User.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(User)
        .where(and(eq(User.orgId, user.orgId), isNull(User.deletedAt))),
    searchAsManager: async () => {
      const PapercutAccountCte = tx.$with("papercut_account_cte").as(
        tx
          .select({
            id: PapercutAccountManagerAuthorization.papercutAccountId,
            orgId: PapercutAccountManagerAuthorization.orgId,
          })
          .from(PapercutAccountManagerAuthorization)
          .where(
            and(
              eq(PapercutAccountManagerAuthorization.managerId, user.id),
              eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
            ),
          ),
      );

      const PapercutAccountManagerAuthorizationCte = tx
        .$with("papercut_account_manager_authorization_cte")
        .as(
          tx
            .select({
              managerId: PapercutAccountManagerAuthorization.managerId,
              orgId: PapercutAccountManagerAuthorization.orgId,
            })
            .from(PapercutAccountCte)
            .innerJoin(
              PapercutAccountManagerAuthorization,
              and(
                eq(
                  PapercutAccountCte.id,
                  PapercutAccountManagerAuthorization.papercutAccountId,
                ),
                eq(
                  PapercutAccountCte.orgId,
                  PapercutAccountManagerAuthorization.orgId,
                ),
              ),
            )
            .where(
              not(eq(PapercutAccountManagerAuthorization.managerId, user.id)),
            ),
        );

      const PapercutAccountCustomerAuthorizationCte = tx
        .$with("papercut_account_customer_authorization_cte")
        .as(
          tx
            .select({
              customerId: PapercutAccountCustomerAuthorization.customerId,
              orgId: PapercutAccountCustomerAuthorization.orgId,
            })
            .from(PapercutAccountCte)
            .innerJoin(
              PapercutAccountCustomerAuthorization,
              and(
                eq(
                  PapercutAccountCte.id,
                  PapercutAccountCustomerAuthorization.papercutAccountId,
                ),
                eq(
                  PapercutAccountCte.orgId,
                  PapercutAccountCustomerAuthorization.orgId,
                ),
              ),
            ),
        );

      const [self, otherManagers, managedCustomers] = await Promise.all([
        selectSelf(),
        tx
          .select(metadataColumns)
          .from(User)
          .innerJoin(
            PapercutAccountManagerAuthorizationCte,
            and(
              eq(User.id, PapercutAccountManagerAuthorizationCte.managerId),
              eq(User.orgId, PapercutAccountManagerAuthorizationCte.orgId),
            ),
          ),
        tx
          .select(metadataColumns)
          .from(User)
          .innerJoin(
            PapercutAccountCustomerAuthorizationCte,
            and(
              eq(User.id, PapercutAccountCustomerAuthorizationCte.customerId),
              eq(User.orgId, PapercutAccountCustomerAuthorizationCte.orgId),
            ),
          )
          .where(and(eq(User.orgId, user.orgId), isNull(User.deletedAt))),
        tx
          .select(metadataColumns)
          .from(User)
          .innerJoin(
            PapercutAccountCustomerAuthorization,
            and(
              eq(User.id, PapercutAccountCustomerAuthorization.customerId),
              eq(User.orgId, PapercutAccountCustomerAuthorization.orgId),
            ),
          )
          .where(and(eq(User.orgId, user.orgId), isNull(User.deletedAt))),
      ]);

      return uniqueBy(
        [...self, ...otherManagers, ...managedCustomers],
        ({ id }) => id,
      );
    },
    searchAsCustomer: selectSelf,
  });
}

export async function searchPapercutAccounts(tx: Transaction, user: LuciaUser) {
  const metadataColumns = buildMetadataColumns(
    PapercutAccount,
    PapercutAccount.id,
  );

  const selectCustomerAccounts = async () =>
    await tx
      .select(metadataColumns)
      .from(PapercutAccount)
      .innerJoin(
        PapercutAccountCustomerAuthorization,
        and(
          eq(
            PapercutAccount.id,
            PapercutAccountCustomerAuthorization.papercutAccountId,
          ),
          eq(PapercutAccount.orgId, PapercutAccountCustomerAuthorization.orgId),
        ),
      )
      .innerJoin(
        User,
        and(
          eq(PapercutAccountCustomerAuthorization.customerId, User.id),
          eq(PapercutAccountCustomerAuthorization.orgId, User.orgId),
        ),
      )
      .where(and(eq(User.id, user.id), isNull(PapercutAccount.deletedAt)));

  const selectManagerAccounts = async () =>
    await tx
      .select(metadataColumns)
      .from(PapercutAccount)
      .innerJoin(
        PapercutAccountManagerAuthorization,
        and(
          eq(
            PapercutAccount.id,
            PapercutAccountManagerAuthorization.papercutAccountId,
          ),
          eq(PapercutAccount.orgId, PapercutAccountManagerAuthorization.orgId),
        ),
      )
      .innerJoin(
        User,
        and(
          eq(PapercutAccountManagerAuthorization.managerId, User.id),
          eq(PapercutAccountManagerAuthorization.orgId, User.orgId),
        ),
      )
      .where(and(eq(User.id, user.id), isNull(PapercutAccount.deletedAt)));

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccount)
        .where(eq(PapercutAccount.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccount)
        .where(
          and(
            eq(PapercutAccount.orgId, user.orgId),
            isNull(PapercutAccount.deletedAt),
          ),
        ),
    searchAsManager: async () => {
      const [customerAccounts, managerAccounts] = await Promise.all([
        selectCustomerAccounts(),
        selectManagerAccounts(),
      ]);

      return uniqueBy(
        [...customerAccounts, ...managerAccounts],
        ({ id }) => id,
      );
    },
    searchAsCustomer: selectCustomerAccounts,
  });
}

export async function searchPapercutAccountCustomerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const metadataColumns = buildMetadataColumns(
    PapercutAccountCustomerAuthorization,
    PapercutAccountCustomerAuthorization.id,
  );

  const selectCustomerAuthorizations = async () =>
    await tx
      .select(metadataColumns)
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
          eq(PapercutAccountCustomerAuthorization.customerId, user.id),
          isNull(PapercutAccountCustomerAuthorization.deletedAt),
        ),
      );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccountCustomerAuthorization)
        .where(eq(PapercutAccountCustomerAuthorization.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccountCustomerAuthorization)
        .where(
          and(
            eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
            isNull(PapercutAccountCustomerAuthorization.deletedAt),
          ),
        ),
    searchAsManager: selectCustomerAuthorizations,
    searchAsCustomer: selectCustomerAuthorizations,
  });
}

export async function searchPapercutAccountManagerAuthorizations(
  tx: Transaction,
  user: LuciaUser,
) {
  const metadataColumns = buildMetadataColumns(
    PapercutAccountManagerAuthorization,
    PapercutAccountManagerAuthorization.id,
  );

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccountManagerAuthorization)
        .where(eq(PapercutAccountManagerAuthorization.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccountManagerAuthorization)
        .where(
          and(
            eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
            isNull(PapercutAccountManagerAuthorization.deletedAt),
          ),
        ),
    searchAsManager: async () =>
      await tx
        .select(metadataColumns)
        .from(PapercutAccountManagerAuthorization)
        .where(
          and(
            eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
            eq(PapercutAccountManagerAuthorization.managerId, user.id),
            isNull(PapercutAccountManagerAuthorization.deletedAt),
          ),
        ),
    searchAsCustomer: async () => [],
  });
}

export async function searchRooms(tx: Transaction, user: LuciaUser) {
  const metadataColumns = buildMetadataColumns(Room, Room.id);

  const selectPublished = async () =>
    await tx
      .select(metadataColumns)
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
        .select(metadataColumns)
        .from(Room)
        .where(eq(Room.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(Room)
        .where(and(eq(Room.orgId, user.orgId), isNull(Room.deletedAt))),
    searchAsManager: selectPublished,
    searchAsCustomer: selectPublished,
  });
}

export async function searchProducts(tx: Transaction, user: LuciaUser) {
  const metadataColumns = buildMetadataColumns(Product, Product.id);

  const selectPublished = async () =>
    await tx
      .select(metadataColumns)
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
        .select(metadataColumns)
        .from(Product)
        .where(eq(Product.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(Product)
        .where(and(eq(Product.orgId, user.orgId), isNull(Product.deletedAt))),
    searchAsManager: selectPublished,
    searchAsCustomer: selectPublished,
  });
}

export async function searchOrders(tx: Transaction, user: LuciaUser) {
  const metadataColumns = buildMetadataColumns(Order, Order.id);

  const selectCustomerOrders = async () =>
    await tx
      .select(metadataColumns)
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
        .select(metadataColumns)
        .from(Order)
        .where(eq(Order.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
        .from(Order)
        .where(and(eq(Order.orgId, user.orgId), isNull(Order.deletedAt))),
    searchAsManager: async () => {
      const [customerOrders, managerOrders] = await Promise.all([
        selectCustomerOrders(),
        tx
          .select(metadataColumns)
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
  const metadataColumns = buildMetadataColumns(Comment, Comment.id);

  return searchAsRole(user.role, {
    searchAsAdministrator: async () =>
      await tx
        .select(metadataColumns)
        .from(Comment)
        .where(eq(Comment.orgId, user.orgId)),
    searchAsOperator: async () =>
      await tx
        .select(metadataColumns)
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
        .select(metadataColumns)
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
        .select(metadataColumns)
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
