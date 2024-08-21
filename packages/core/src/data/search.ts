import { and, arrayOverlaps, eq, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import { Announcement } from "../announcement/announcement.sql";
import { useAuthenticated } from "../auth";
import { Comment } from "../comment/comment.sql";
import { Order } from "../order/order.sql";
import { Organization } from "../organization";
import { useTransaction } from "../orm/transaction";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { ReplicacheClient } from "../replicache/replicache.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";

import type { LuciaUser } from "../auth/lucia";
import type { Domain } from "../schemas/replicache";

export type Metadata = {
  id: string | number;
  rowVersion: number;
};

export type DomainsMetadata = Record<Domain, Array<Metadata>>;

export const searchOrganizations = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const select = () =>
      tx
        .select({
          id: Organization.id,
          rowVersion: sql<number>`"organization"."xmin"`,
        })
        .from(Organization)
        .where(and(eq(Organization.id, org.id)));

    return searchAsRole({
      searchAsAdministrator: select,
      searchAsOperator: select,
      searchAsManager: select,
      searchAsCustomer: select,
    });
  });

export const searchUsers = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectAll = () =>
      tx
        .select({ id: User.id, rowVersion: sql<number>`"user"."xmin"` })
        .from(User)
        .where(and(eq(User.orgId, org.id), isNull(User.deletedAt)));

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({
            id: User.id,
            rowVersion: sql<number>`"user"."xmin"`,
          })
          .from(User)
          .where(eq(User.orgId, org.id)),
      searchAsOperator: selectAll,
      searchAsManager: selectAll,
      searchAsCustomer: selectAll,
    });
  });

export const searchPapercutAccounts = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectAll = () =>
      tx
        .select({
          id: PapercutAccount.id,
          rowVersion: sql<number>`"papercut_account"."xmin"`,
        })
        .from(PapercutAccount)
        .where(
          and(
            eq(PapercutAccount.orgId, org.id),
            isNull(PapercutAccount.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({
            id: PapercutAccount.id,
            rowVersion: sql<number>`"papercut_account"."xmin"`,
          })
          .from(PapercutAccount)
          .where(and(eq(PapercutAccount.orgId, org.id))),
      searchAsOperator: selectAll,
      searchAsManager: selectAll,
      searchAsCustomer: selectAll,
    });
  });

export const searchPapercutAccountCustomerAuthorizations = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectAll = () =>
      tx
        .select({
          id: PapercutAccountCustomerAuthorization.id,
          rowVersion: sql<number>`"papercut_account_customer_authorization"."xmin"`,
        })
        .from(PapercutAccountCustomerAuthorization)
        .where(
          and(
            eq(PapercutAccountCustomerAuthorization.orgId, org.id),
            isNull(PapercutAccountCustomerAuthorization.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({
            id: PapercutAccountCustomerAuthorization.id,
            rowVersion: sql<number>`"papercut_account_customer_authorization"."xmin"`,
          })
          .from(PapercutAccountCustomerAuthorization)
          .where(eq(PapercutAccountCustomerAuthorization.orgId, org.id)),
      searchAsOperator: selectAll,
      searchAsManager: selectAll,
      searchAsCustomer: selectAll,
    });
  });

export const searchPapercutAccountManagerAuthorizations = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectAll = () =>
      tx
        .select({
          id: PapercutAccountManagerAuthorization.id,
          rowVersion: sql<number>`"papercut_account_manager_authorization"."xmin"`,
        })
        .from(PapercutAccountManagerAuthorization)
        .where(
          and(
            eq(PapercutAccountManagerAuthorization.orgId, org.id),
            isNull(PapercutAccountManagerAuthorization.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({
            id: PapercutAccountManagerAuthorization.id,
            rowVersion: sql<number>`"papercut_account_manager_authorization"."xmin"`,
          })
          .from(PapercutAccountManagerAuthorization)
          .where(eq(PapercutAccountManagerAuthorization.orgId, org.id)),
      searchAsOperator: selectAll,
      searchAsManager: selectAll,
      searchAsCustomer: selectAll,
    });
  });

export const searchRooms = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectPublished = () =>
      tx
        .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
        .from(Room)
        .where(
          and(
            eq(Room.orgId, org.id),
            eq(Room.status, "published"),
            isNull(Room.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
          .from(Room)
          .where(eq(Room.orgId, org.id)),
      searchAsOperator: () =>
        tx
          .select({ id: Room.id, rowVersion: sql<number>`"room"."xmin"` })
          .from(Room)
          .where(and(eq(Room.orgId, org.id), isNull(Room.deletedAt))),
      searchAsManager: selectPublished,
      searchAsCustomer: selectPublished,
    });
  });

export const searchAnnouncements = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectAll = () =>
      tx
        .select({
          id: Announcement.id,
          rowVersion: sql<number>`"announcement"."xmin"`,
        })
        .from(Announcement)
        .where(eq(Announcement.orgId, org.id));

    return searchAsRole({
      searchAsAdministrator: selectAll,
      searchAsOperator: selectAll,
      searchAsManager: selectAll,
      searchAsCustomer: selectAll,
    });
  });

export const searchProducts = async () =>
  await useTransaction((tx) => {
    const { org } = useAuthenticated();

    const selectPublished = () =>
      tx
        .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
        .from(Product)
        .where(
          and(
            eq(Product.orgId, org.id),
            eq(Product.status, "published"),
            isNull(Product.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
          .from(Product)
          .where(eq(Product.orgId, org.id)),
      searchAsOperator: () =>
        tx
          .select({ id: Product.id, rowVersion: sql<number>`"product"."xmin"` })
          .from(Product)
          .where(and(eq(Product.orgId, org.id), isNull(Product.deletedAt))),
      searchAsManager: selectPublished,
      searchAsCustomer: selectPublished,
    });
  });

export const searchOrders = async () =>
  await useTransaction((tx) => {
    const { org, user } = useAuthenticated();

    const selectCustomerOrders = () =>
      tx
        .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
        .from(Order)
        .where(
          and(
            eq(Order.orgId, org.id),
            eq(Order.customerId, user.id),
            isNull(Order.deletedAt),
          ),
        );

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({ id: Order.id, rowVersion: sql<number>`"order"."xmin"` })
          .from(Order)
          .where(eq(Order.orgId, user.orgId)),
      searchAsOperator: () =>
        tx
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

        return R.uniqueBy(
          [...customerOrders, ...managerOrders],
          ({ id }) => id,
        );
      },
      searchAsCustomer: selectCustomerOrders,
    });
  });

export const searchComments = async () =>
  await useTransaction((tx) => {
    const { org, user } = useAuthenticated();

    return searchAsRole({
      searchAsAdministrator: () =>
        tx
          .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
          .from(Comment)
          .where(eq(Comment.orgId, org.id)),
      searchAsOperator: () =>
        tx
          .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
          .from(Comment)
          .where(
            and(
              eq(Comment.orgId, org.id),
              arrayOverlaps(Comment.visibleTo, [
                "operator",
                "manager",
                "customer",
              ]),
              isNull(Comment.deletedAt),
            ),
          ),
      searchAsManager: () =>
        tx
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
              eq(Comment.orgId, org.id),
              arrayOverlaps(Comment.visibleTo, ["manager", "customer"]),
              isNull(Comment.deletedAt),
            ),
          ),
      searchAsCustomer: () =>
        tx
          .select({ id: Comment.id, rowVersion: sql<number>`"comment"."xmin"` })
          .from(Comment)
          .innerJoin(
            Order,
            and(eq(Comment.orderId, Order.id), eq(Comment.orgId, Order.orgId)),
          )
          .where(
            and(
              eq(Order.customerId, user.id),
              eq(Order.orgId, org.id),
              arrayOverlaps(Comment.visibleTo, ["customer"]),
              isNull(Comment.deletedAt),
            ),
          ),
    });
  });

async function searchAsRole(
  callbacks: Record<
    `searchAs${Capitalize<LuciaUser["role"]>}`,
    () => Promise<Array<Metadata>>
  >,
) {
  const role = useAuthenticated().user.role;

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
      return await Promise.resolve([]);
  }
}

export const searchClients = async (
  clientGroupId: ReplicacheClient["clientGroupId"],
) =>
  await useTransaction((tx) =>
    tx
      .select({
        id: ReplicacheClient.id,
        rowVersion: ReplicacheClient.lastMutationId,
      })
      .from(ReplicacheClient)
      .where(eq(ReplicacheClient.clientGroupId, clientGroupId)),
  );
