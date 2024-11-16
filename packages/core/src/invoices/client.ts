import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";

export namespace Invoices {
  export const create = Utils.optimisticMutator(
    createInvoiceMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, invoicesTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: invoicesTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${invoicesTableName}/${values.id}`, values),
  );
}
