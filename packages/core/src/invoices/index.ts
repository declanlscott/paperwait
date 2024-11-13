import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn } from "../utils/shared";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";
import { invoicesTable } from "./sql";

import type { Invoice } from "./sql";

export namespace Invoices {
  export const create = fn(createInvoiceMutationArgsSchema, async (values) => {
    const { user } = useAuthenticated();

    enforceRbac(user, mutationRbac.createInvoice, {
      Error: ApplicationError.AccessDenied,
      args: [{ name: invoicesTableName }],
    });

    return useTransaction(async (tx) => {
      const invoice = await tx
        .insert(invoicesTable)
        .values(values)
        .returning({ id: invoicesTable.id })
        .then((rows) => rows.at(0));
      if (!invoice) throw new Error("Failed to insert invoice");

      const usersToPoke = await Users.withOrderAccess(values.orderId);
      await afterTransaction(() =>
        Replicache.poke(
          usersToPoke.map((u) => Realtime.formatChannel("user", u.id)),
        ),
      );
    });
  });

  export async function metadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: invoicesTable.id,
          rowVersion: sql<number>`"${invoicesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, tenant.id))
        .$dynamic();

      const customerInvoicesQuery = baseQuery
        .innerJoin(
          ordersTable,
          and(
            eq(invoicesTable.orderId, ordersTable.id),
            eq(invoicesTable.tenantId, ordersTable.tenantId),
          ),
        )
        .where(
          and(
            eq(ordersTable.customerId, user.id),
            isNull(invoicesTable.deletedAt),
          ),
        );

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "operator":
          return baseQuery.where(isNull(invoicesTable.deletedAt));
        case "manager": {
          const [customerInvoices, managerInvoices] = await Promise.all([
            customerInvoicesQuery,
            baseQuery
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
              .where(isNull(invoicesTable.deletedAt)),
          ]);

          return [...customerInvoices, ...managerInvoices];
        }
        case "customer":
          return customerInvoicesQuery;
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function fromIds(ids: Array<Invoice["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select()
        .from(invoicesTable)
        .where(
          and(
            inArray(invoicesTable.id, ids),
            eq(invoicesTable.tenantId, tenant.id),
          ),
        ),
    );
  }
}
