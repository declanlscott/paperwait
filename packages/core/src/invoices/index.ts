import { and, eq, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { Api } from "../api";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { formatChannel } from "../realtime/shared";
import { Replicache } from "../replicache";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import { createInvoiceMutationArgsSchema } from "./shared";
import { invoicesTable } from "./sql";

import type { Invoice } from "./sql";

export namespace Invoices {
  export const create = fn(createInvoiceMutationArgsSchema, async (values) => {
    await AccessControl.enforce([invoicesTable._.name, "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: invoicesTable._.name }],
    });

    return useTransaction(async (tx) => {
      const [users] = await Promise.all([
        Users.withOrderAccess(values.orderId),
        tx.insert(invoicesTable).values(values),
      ]);

      const res = await Api.send("/invoices", {
        method: "POST",
        body: JSON.stringify({ invoiceId: values.id }),
      });
      if (!res.ok)
        tx.update(invoicesTable)
          .set({ status: "error" })
          .where(
            and(
              eq(invoicesTable.id, values.id),
              eq(invoicesTable.tenantId, useTenant().id),
            ),
          );

      await afterTransaction(() =>
        Replicache.poke(users.map((u) => formatChannel("user", u.id))),
      );
    });
  });

  export const read = async (ids: Array<Invoice["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(invoicesTable)
        .where(
          and(
            inArray(invoicesTable.id, ids),
            eq(invoicesTable.tenantId, useTenant().id),
          ),
        ),
    );
}
