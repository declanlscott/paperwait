import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";

export namespace Invoices {
  export const create = Utils.optimisticMutator(
    createInvoiceMutationArgsSchema,
    async (user) =>
      enforceRbac(user, mutationRbac.createInvoice, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: invoicesTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${invoicesTableName}/${values.id}`, values),
  );
}
