import { and, arrayOverlaps, eq, isNull, or, sql } from "drizzle-orm";

import { announcementsTable } from "../announcements/sql";
import { commentsTable } from "../comments/sql";
import { useTransaction } from "../drizzle/transaction";
import { invoicesTable } from "../invoices/sql";
import { ordersTableName } from "../orders/shared";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { productsTable } from "../products/sql";
import {
  deliveryOptionsTable,
  roomsTable,
  workflowStatusesTable,
} from "../rooms/sql";
import { useAuthenticated } from "../sessions/context";
import { tenantsTable } from "../tenants/sql";
import { userProfilesTable, usersTable } from "../users/sql";
import { Constants } from "../utils/constants";

import type { SQL } from "drizzle-orm";
import type { PgSelectBase } from "drizzle-orm/pg-core";
import type { Comment } from "../comments/sql";
import type { TxOrDb } from "../drizzle/transaction";
import type { Order } from "../orders/sql";
import type { PapercutAccount } from "../papercut/sql";
import type { Metadata } from "../replicache/data";
import type { UserRole } from "../users/shared";
import type { User } from "../users/sql";
import type { SyncedTableName, TableByName } from "../utils/tables";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";

export namespace AccessControl {
  type ResourceMetadataBaseQueryFactory = {
    [TName in SyncedTableName]: (tx: TxOrDb) => PgSelectBase<
      TName,
      {
        id: TableByName<TName>["_"]["columns"]["id"];
        rowVersion: SQL<number>;
      },
      "partial",
      Record<TName, "not-null">,
      true
    >;
  };

  const resourceMetadataBaseQueryFactory = {
    [announcementsTable._.name]: (tx) =>
      tx
        .select({
          id: announcementsTable.id,
          rowVersion: sql<number>`"${announcementsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(announcementsTable)
        .where(eq(announcementsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [commentsTable._.name]: (tx) =>
      tx
        .select({
          id: commentsTable.id,
          rowVersion: sql<number>`"${commentsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}`,
        })
        .from(commentsTable)
        .where(eq(commentsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [deliveryOptionsTable._.name]: (tx) =>
      tx
        .select({
          id: deliveryOptionsTable.id,
          rowVersion: sql<number>`"${deliveryOptionsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(deliveryOptionsTable)
        .where(eq(deliveryOptionsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [invoicesTable._.name]: (tx) =>
      tx
        .select({
          id: invoicesTable.id,
          rowVersion: sql<number>`"${invoicesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [ordersTable._.name]: (tx) =>
      tx
        .select({
          id: ordersTable.id,
          rowVersion: sql<number>`"${ordersTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, useAuthenticated().tenant.id),
            isNull(ordersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [papercutAccountsTable._.name]: (tx) =>
      tx
        .select({
          id: papercutAccountsTable.id,
          rowVersion: sql<number>`"${papercutAccountsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountsTable)
        .where(eq(papercutAccountsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [papercutAccountCustomerAuthorizationsTable._.name]: (tx) =>
      tx
        .select({
          id: papercutAccountCustomerAuthorizationsTable.id,
          rowVersion: sql<number>`"${papercutAccountCustomerAuthorizationsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountCustomerAuthorizationsTable)
        .where(
          eq(
            papercutAccountCustomerAuthorizationsTable.tenantId,
            useAuthenticated().tenant.id,
          ),
        )
        .$dynamic(),
    [papercutAccountManagerAuthorizationsTable._.name]: (tx) =>
      tx
        .select({
          id: papercutAccountManagerAuthorizationsTable.id,
          rowVersion: sql<number>`"${papercutAccountManagerAuthorizationsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(papercutAccountManagerAuthorizationsTable)
        .where(
          eq(
            papercutAccountManagerAuthorizationsTable.tenantId,
            useAuthenticated().tenant.id,
          ),
        )
        .$dynamic(),
    [productsTable._.name]: (tx) =>
      tx
        .select({
          id: productsTable.id,
          rowVersion: sql<number>`"${productsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(productsTable)
        .where(eq(productsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [roomsTable._.name]: (tx) =>
      tx
        .select({
          id: roomsTable.id,
          rowVersion: sql<number>`"${roomsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, useAuthenticated().tenant.id))
        .$dynamic(),
    [tenantsTable._.name]: (tx) =>
      tx
        .select({
          id: tenantsTable.id,
          rowVersion: sql<number>`"${tenantsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, useAuthenticated().tenant.id))
        .$dynamic(),
    [usersTable._.name]: (tx) =>
      tx
        .select({
          id: usersTable.id,
          rowVersion: sql<number>`"${userProfilesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            eq(usersTable.tenantId, useAuthenticated().tenant.id),
            isNull(usersTable.deletedAt),
          ),
        )
        .$dynamic(),
    [workflowStatusesTable._.name]: (tx) =>
      tx
        .select({
          id: workflowStatusesTable.id,
          rowVersion: sql<number>`"${workflowStatusesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(workflowStatusesTable)
        .where(
          and(eq(workflowStatusesTable.tenantId, useAuthenticated().tenant.id)),
        )
        .$dynamic(),
  } as const satisfies ResourceMetadataBaseQueryFactory;

  export type ResourceMetadataFactory = Record<
    UserRole,
    {
      [TName in SyncedTableName]: () => Promise<
        Array<Metadata<TableByName<TName>>>
      >;
    }
  >;

  export const resourceMetadataFactory = {
    administrator: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[announcementsTable._.name],
        ),
      [commentsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[commentsTable._.name]),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[deliveryOptionsTable._.name],
        ),
      [invoicesTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[invoicesTable._.name]),
      [ordersTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[ordersTable._.name]),
      [papercutAccountsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[papercutAccountsTable._.name],
        ),
      [papercutAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[
            papercutAccountCustomerAuthorizationsTable._.name
          ],
        ),
      [papercutAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[
            papercutAccountManagerAuthorizationsTable._.name
          ],
        ),
      [productsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[productsTable._.name]),
      [roomsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[roomsTable._.name]),
      [tenantsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[tenantsTable._.name]),
      [usersTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[usersTable._.name]),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[workflowStatusesTable._.name],
        ),
    },
    operator: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[announcementsTable._.name],
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[commentsTable._.name](tx).where(
            and(
              arrayOverlaps(commentsTable.visibleTo, [
                "operator",
                "manager",
                "customer",
              ]),
              isNull(commentsTable.deletedAt),
            ),
          ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[deliveryOptionsTable._.name](
            tx,
          ).where(isNull(roomsTable.deletedAt)),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[invoicesTable._.name](tx).where(
            isNull(invoicesTable.deletedAt),
          ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[ordersTableName](tx).where(
            isNull(ordersTable.deletedAt),
          ),
        ),
      [papercutAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[papercutAccountsTable._.name](
            tx,
          ).where(isNull(papercutAccountsTable.deletedAt)),
        ),
      [papercutAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [papercutAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[productsTable._.name](tx).where(
            isNull(productsTable.deletedAt),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[roomsTable._.name](tx).where(
            isNull(roomsTable.deletedAt),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[tenantsTable._.name]),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[workflowStatusesTable._.name],
        ),
    },
    manager: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[announcementsTable._.name],
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[commentsTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(commentsTable.orderId, ordersTable.id),
                eq(commentsTable.tenantId, ordersTable.tenantId),
              ),
            )
            .innerJoin(
              papercutAccountsTable,
              and(
                eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              papercutAccountManagerAuthorizationsTable,
              and(
                eq(
                  papercutAccountsTable.id,
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ),
                eq(
                  papercutAccountsTable.tenantId,
                  papercutAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              and(
                arrayOverlaps(commentsTable.visibleTo, ["manager", "customer"]),
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[deliveryOptionsTable._.name](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[invoicesTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(invoicesTable.orderId, ordersTable.id),
                eq(invoicesTable.tenantId, ordersTable.tenantId),
              ),
            )
            .innerJoin(
              papercutAccountsTable,
              and(
                eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              papercutAccountManagerAuthorizationsTable,
              and(
                eq(
                  papercutAccountsTable.id,
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ),
                eq(
                  papercutAccountsTable.tenantId,
                  papercutAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              or(
                isNull(invoicesTable.deletedAt),
                and(
                  eq(ordersTable.customerId, useAuthenticated().user.id),
                  isNull(invoicesTable.deletedAt),
                ),
              ),
            ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[ordersTable._.name](tx)
            .innerJoin(
              papercutAccountsTable,
              and(
                eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
              ),
            )
            .innerJoin(
              papercutAccountManagerAuthorizationsTable,
              and(
                eq(
                  papercutAccountsTable.id,
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ),
                eq(
                  papercutAccountsTable.tenantId,
                  papercutAccountManagerAuthorizationsTable.tenantId,
                ),
              ),
            )
            .where(
              or(
                isNull(ordersTable.deletedAt),
                and(
                  eq(ordersTable.customerId, useAuthenticated().user.id),
                  isNull(ordersTable.deletedAt),
                ),
              ),
            ),
        ),
      [papercutAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[papercutAccountsTable._.name](
            tx,
          ).where(isNull(papercutAccountsTable.deletedAt)),
        ),
      [papercutAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [papercutAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[productsTable._.name](tx).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[roomsTable._.name](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[tenantsTable._.name]),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[workflowStatusesTable._.name],
        ),
    },
    customer: {
      [announcementsTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[announcementsTable._.name],
        ),
      [commentsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[commentsTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(commentsTable.orderId, ordersTable.id),
                eq(commentsTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(ordersTable.customerId, useAuthenticated().user.id),
                arrayOverlaps(commentsTable.visibleTo, ["customer"]),
                isNull(commentsTable.deletedAt),
              ),
            ),
        ),
      [deliveryOptionsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[deliveryOptionsTable._.name](
            tx,
          ).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [invoicesTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[invoicesTable._.name](tx)
            .innerJoin(
              ordersTable,
              and(
                eq(invoicesTable.orderId, ordersTable.id),
                eq(invoicesTable.tenantId, ordersTable.tenantId),
              ),
            )
            .where(
              and(
                eq(ordersTable.customerId, useAuthenticated().user.id),
                isNull(invoicesTable.deletedAt),
              ),
            ),
        ),
      [ordersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[ordersTable._.name](tx).where(
            and(
              eq(ordersTable.customerId, useAuthenticated().user.id),
              isNull(ordersTable.deletedAt),
            ),
          ),
        ),
      [papercutAccountsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[papercutAccountsTable._.name](
            tx,
          ).where(isNull(papercutAccountsTable.deletedAt)),
        ),
      [papercutAccountCustomerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountCustomerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountCustomerAuthorizationsTable.deletedAt),
          ),
        ),
      [papercutAccountManagerAuthorizationsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[
            papercutAccountManagerAuthorizationsTable._.name
          ](tx).where(
            isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
          ),
        ),
      [productsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[productsTable._.name](tx).where(
            and(
              eq(productsTable.status, "published"),
              isNull(productsTable.deletedAt),
            ),
          ),
        ),
      [roomsTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[roomsTable._.name](tx).where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          ),
        ),
      [tenantsTable._.name]: async () =>
        useTransaction(resourceMetadataBaseQueryFactory[tenantsTable._.name]),
      [usersTable._.name]: async () =>
        useTransaction((tx) =>
          resourceMetadataBaseQueryFactory[usersTable._.name](tx).where(
            isNull(userProfilesTable.deletedAt),
          ),
        ),
      [workflowStatusesTable._.name]: async () =>
        useTransaction(
          resourceMetadataBaseQueryFactory[workflowStatusesTable._.name],
        ),
    },
  } as const satisfies ResourceMetadataFactory;

  type PermissionsFactory = Record<
    UserRole,
    Record<
      SyncedTableName,
      Record<
        "create" | "update" | "delete",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        boolean | ((...input: Array<any>) => boolean | Promise<boolean>)
      >
    >
  >;

  const permissionsFactory = {
    administrator: {
      [announcementsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [commentsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [deliveryOptionsTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [papercutAccountsTable._.name]: {
        create: false,
        update: true,
        delete: true,
      },
      [papercutAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTable._.name]: {
        create: true,
        update: false,
        delete: true,
      },
      [productsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [tenantsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: true,
        delete: true,
      },
      [workflowStatusesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [announcementsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [commentsTable._.name]: {
        create: true,
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      [deliveryOptionsTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [papercutAccountsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTable._.name]: {
        create: false,
        update: true,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId !== useAuthenticated().user.id,
      },
      [workflowStatusesTable._.name]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [announcementsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTable._.name]: {
        create: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                papercutAccountsTable,
                and(
                  eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                  eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                papercutAccountManagerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  isNull(ordersTable.deletedAt),
                  or(
                    and(
                      eq(
                        papercutAccountManagerAuthorizationsTable.managerId,
                        useAuthenticated().user.id,
                      ),
                      isNull(
                        papercutAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useAuthenticated().user.id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      [deliveryOptionsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: async (papercutAccountId: PapercutAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(papercutAccountsTable)
              .innerJoin(
                papercutAccountCustomerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountCustomerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountCustomerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(papercutAccountsTable.id, papercutAccountId),
                  eq(
                    papercutAccountsTable.tenantId,
                    useAuthenticated().tenant.id,
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                papercutAccountsTable,
                and(
                  eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                  eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                papercutAccountManagerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  isNull(ordersTable.deletedAt),
                  eq(workflowStatusesTable.type, "Review"),
                  or(
                    and(
                      eq(
                        papercutAccountManagerAuthorizationsTable.managerId,
                        useAuthenticated().user.id,
                      ),
                      isNull(
                        papercutAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useAuthenticated().user.id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                papercutAccountsTable,
                and(
                  eq(ordersTable.papercutAccountId, papercutAccountsTable.id),
                  eq(ordersTable.tenantId, papercutAccountsTable.tenantId),
                ),
              )
              .leftJoin(
                papercutAccountManagerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  isNull(ordersTable.deletedAt),
                  eq(workflowStatusesTable.type, "Review"),
                  or(
                    and(
                      eq(
                        papercutAccountManagerAuthorizationsTable.managerId,
                        useAuthenticated().user.id,
                      ),
                      isNull(
                        papercutAccountManagerAuthorizationsTable.deletedAt,
                      ),
                    ),
                    eq(ordersTable.customerId, useAuthenticated().user.id),
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      [papercutAccountsTable._.name]: {
        create: false,
        update: async (papercutAccountId: PapercutAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(papercutAccountsTable)
              .innerJoin(
                papercutAccountManagerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountManagerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(papercutAccountsTable.id, papercutAccountId),
                  eq(
                    papercutAccountsTable.tenantId,
                    useAuthenticated().tenant.id,
                  ),
                  eq(
                    papercutAccountManagerAuthorizationsTable.managerId,
                    useAuthenticated().user.id,
                  ),
                  isNull(papercutAccountsTable.deletedAt),
                  isNull(papercutAccountManagerAuthorizationsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useAuthenticated().user.id,
      },
      [workflowStatusesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
    },
    customer: {
      [announcementsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTable._.name]: {
        create: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  eq(ordersTable.customerId, useAuthenticated().user.id),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                  isNull(commentsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (commentId: Comment["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(commentsTable)
              .where(
                and(
                  eq(commentsTable.id, commentId),
                  eq(commentsTable.tenantId, useAuthenticated().tenant.id),
                  eq(commentsTable.authorId, useAuthenticated().user.id),
                  isNull(commentsTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      [deliveryOptionsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTable._.name]: {
        create: async (papercutAccountId: PapercutAccount["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(papercutAccountsTable)
              .innerJoin(
                papercutAccountCustomerAuthorizationsTable,
                and(
                  eq(
                    papercutAccountsTable.id,
                    papercutAccountCustomerAuthorizationsTable.papercutAccountId,
                  ),
                  eq(
                    papercutAccountsTable.tenantId,
                    papercutAccountCustomerAuthorizationsTable.tenantId,
                  ),
                ),
              )
              .where(
                and(
                  eq(papercutAccountsTable.id, papercutAccountId),
                  eq(
                    papercutAccountsTable.tenantId,
                    useAuthenticated().tenant.id,
                  ),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        update: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  eq(ordersTable.customerId, useAuthenticated().user.id),
                  eq(workflowStatusesTable.type, "Review"),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
        delete: async (orderId: Order["id"]) =>
          useTransaction((tx) =>
            tx
              .select({})
              .from(ordersTable)
              .innerJoin(
                workflowStatusesTable,
                and(
                  eq(ordersTable.workflowStatus, workflowStatusesTable.id),
                  eq(ordersTable.tenantId, workflowStatusesTable.tenantId),
                ),
              )
              .where(
                and(
                  eq(ordersTable.id, orderId),
                  eq(ordersTable.tenantId, useAuthenticated().tenant.id),
                  eq(ordersTable.customerId, useAuthenticated().user.id),
                  eq(workflowStatusesTable.type, "Review"),
                  isNull(ordersTable.deletedAt),
                ),
              )
              .then((rows) => rows.length > 0),
          ),
      },
      [papercutAccountsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTable._.name]: {
        create: false,
        update: false,
        delete: (userId: User["id"]) => userId === useAuthenticated().user.id,
      },
      [workflowStatusesTable._.name]: {
        create: false,
        update: false,
        delete: false,
      },
    },
  } as const satisfies PermissionsFactory;

  export async function check<
    TResource extends SyncedTableName,
    TAction extends "create" | "update" | "delete",
    TPermission extends
      (typeof permissionsFactory)[UserRole][TResource][TAction],
  >(
    resource: TResource,
    action: TAction,
    ...input: TPermission extends (...input: infer TInput) => unknown
      ? TInput
      : Array<never>
  ) {
    const permission = (permissionsFactory as PermissionsFactory)[
      useAuthenticated().user.profile.role
    ][resource][action];

    return new Promise<boolean>((resolve) => {
      if (typeof permission === "boolean") return resolve(permission);

      return resolve(permission(...input));
    });
  }

  export async function enforce<
    TResource extends SyncedTableName,
    TAction extends "create" | "update" | "delete",
    TPermission extends
      (typeof permissionsFactory)[UserRole][TResource][TAction],
    TMaybeError extends AnyError | undefined,
  >(
    args: Parameters<typeof check<TResource, TAction, TPermission>>,
    customError?: TMaybeError extends AnyError
      ? InferCustomError<CustomError<TMaybeError>>
      : never,
  ) {
    const access = await check(...args);

    if (!access) {
      const message = `Access denied for action "${args[1]}" on resource "${args[0]} with input "${args[2]}".`;

      console.log(message);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
