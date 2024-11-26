import * as R from "remeda";
import { deserialize, serialize } from "superjson";

import { ApplicationError } from "../utils/errors";

import type {
  DeepReadonlyObject,
  ReadonlyJSONObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type * as v from "valibot";
import type { Authenticated } from "../sessions/shared";
import type { SyncedTable, SyncedTableName } from "../utils/tables";
import type { MutationName, Serialized } from "./shared";

export namespace Replicache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OptimisticMutator<TSchema extends v.GenericSchema> = (
    tx: WriteTransaction,
    args: v.InferOutput<TSchema>,
  ) => Promise<void>;

  export type AuthenticatedOptimisticMutator<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TSchema extends v.GenericSchema = any,
  > = (user: Authenticated["user"]) => OptimisticMutator<TSchema>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OptimisticMutatorFactory<TSchema extends v.GenericSchema = any> =
    Record<MutationName, OptimisticMutator<TSchema>>;

  export async function get<TDeserialized extends SyncedTable["$inferSelect"]>(
    tx: ReadTransaction,
    name: SyncedTableName,
    id: string,
  ) {
    const value = (await tx.get(`${name}/${id}`)) as Serialized | undefined;
    if (!value) throw new ApplicationError.EntityNotFound({ name, id });

    return deserialize<DeepReadonlyObject<TDeserialized>>(value);
  }

  export const scan = async <TDeserialized extends SyncedTable["$inferSelect"]>(
    tx: ReadTransaction,
    name: SyncedTableName,
  ) =>
    (
      tx.scan({ prefix: `${name}/` }).toArray() as Promise<Array<Serialized>>
    ).then(R.map(deserialize<DeepReadonlyObject<TDeserialized>>));

  export const set = async (
    tx: WriteTransaction,
    name: SyncedTableName,
    id: string,
    value: ReadonlyJSONObject,
  ) => tx.set(`${name}/${id}`, serialize(value) as Serialized);

  export async function del(
    tx: WriteTransaction,
    name: SyncedTableName,
    id: string,
  ) {
    const success = await tx.del(`${name}/${id}`);
    if (!success) throw new ApplicationError.EntityNotFound({ name, id });
  }
}
