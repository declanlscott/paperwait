import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { useAuthenticated } from "../auth";
import { Comment } from "../comment/comment.sql";
import { getClientGroup } from "../data/get";
import { BadRequestError, UnauthorizedError } from "../errors/http";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import { serializable, useTransaction } from "../orm/transaction";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import {
  syncedTableMetadataQueryBuilderFactory,
  syncedTables,
} from "./metadata";
import {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientView,
} from "./replicache.sql";

import type { PgSelect } from "drizzle-orm/pg-core";
import type {
  ClientStateNotFoundResponse,
  PatchOperation,
  PullRequest,
  PullResponseOKV1,
  VersionNotSupportedResponse,
} from "replicache";
import type {
  ClientViewRecordDiff,
  ClientViewRecordEntries,
} from "./client-view-record";
import type {
  Metadata,
  SyncedTable,
  SyncedTableMetadata,
  SyncedTableName,
} from "./metadata";

type PullResult =
  | {
      type: "success";
      response: PullResponseOKV1;
    }
  | {
      type: "error";
      response: ClientStateNotFoundResponse | VersionNotSupportedResponse;
    };

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps may be out of numerical order due to what is included in the transaction
export async function pull(pullRequest: PullRequest): Promise<PullResult> {
  const { user } = useAuthenticated();

  if (pullRequest.pullVersion !== 1)
    return {
      type: "error",
      response: {
        error: "VersionNotSupported",
        versionType: "pull",
      },
    };

  const order = Number(
    typeof pullRequest.cookie === "object"
      ? (pullRequest.cookie?.order ?? 0)
      : pullRequest.cookie,
  );

  if (isNaN(order)) throw new BadRequestError("Cookie order is not a number");

  // 3: Begin transaction
  const result = await serializable(async (tx) => {
    // 1: Fetch previous client view record
    const prevClientView = pullRequest.cookie
      ? await tx
          .select({ record: ReplicacheClientView.record })
          .from(ReplicacheClientView)
          .where(
            and(
              eq(ReplicacheClientView.clientGroupId, pullRequest.clientGroupID),
              eq(ReplicacheClientView.version, order),
              eq(ReplicacheClientView.orgId, user.orgId),
            ),
          )
          .then((rows) => rows.at(0))
      : undefined;

    // 2: Initialize base client view record
    const baseCvr = buildCvr({ variant: "base", prev: prevClientView?.record });

    // 4: Get client group
    const baseClientGroup = await getClientGroup(pullRequest.clientGroupID);

    // 5: Verify requesting client group owns requested client
    if (baseClientGroup.userId !== user.id)
      throw new UnauthorizedError("User does not own client group");

    const [syncedTablesMetadata, clientsMetadata] = await Promise.all([
      // 6: Read all id/version pairs from the database that should be in the client view
      Promise.all(
        syncedTables.map(async (table) => {
          const name = table._.name;

          const metadata = await syncedTableMetadataQueryBuilderFactory()[name](
            tx
              .select({
                id: table.id,
                rowVersion: sql<number>`"${name}"."xmin"`,
              })
              .from(table)
              .$dynamic(),
          );

          return [name, metadata] as const satisfies SyncedTableMetadata;
        }),
      ),
      // 7: Read all clients in the client group
      tx
        .select({
          id: ReplicacheClient.id,
          rowVersion: ReplicacheClient.lastMutationId,
        })
        .from(ReplicacheClient)
        .where(eq(ReplicacheClient.clientGroupId, baseClientGroup.id)),
    ]);

    // 8: Build next client view record
    const nextCvr = buildCvr({
      variant: "next",
      metadata: {
        syncedTables: syncedTablesMetadata,
        clients: clientsMetadata,
      },
    });

    // 9: Calculate diff
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op
    if (prevClientView && isCvrDiffEmpty(diff)) return null;

    // 11: Read only the data that changed
    const data = await readData(diff);

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients = diff[ReplicacheClient._.name].puts.reduce(
      (clients, clientId) => {
        clients[clientId] = nextCvr[ReplicacheClient._.name][clientId];
        return clients;
      },
      {} as ClientViewRecordEntries,
    );

    // 13: new client view record version
    const nextCvrVersion = Math.max(order, baseClientGroup.cvrVersion) + 1;

    const nextClientGroup = {
      ...baseClientGroup,
      cvrVersion: nextCvrVersion,
    };

    await Promise.all([
      // 14: Write client group record
      tx
        .insert(ReplicacheClientGroup)
        .values(nextClientGroup)
        .onConflictDoUpdate({
          target: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
          set: {
            orgId: nextClientGroup.orgId,
            userId: nextClientGroup.userId,
            cvrVersion: nextClientGroup.cvrVersion,
            updatedAt: sql`now()`,
          },
        }),
      // 16-17: Generate client view record id, store client view record
      tx.insert(ReplicacheClientView).values({
        clientGroupId: baseClientGroup.id,
        orgId: user.orgId,
        version: nextCvrVersion,
        record: nextCvr,
      }),
      // Delete old client view records
      tx
        .delete(ReplicacheClientView)
        .where(
          and(
            eq(ReplicacheClientView.clientGroupId, baseClientGroup.id),
            eq(ReplicacheClientView.orgId, user.orgId),
            lt(ReplicacheClientView.version, nextCvrVersion - 10),
          ),
        ),
    ]);

    // 15: Commit transaction
    return {
      data,
      clients,
      prevCvr: prevClientView?.record,
      nextCvr,
      nextCvrVersion,
    };
  });

  // 10: If transaction result returns empty diff, return no-op
  if (!result)
    return {
      type: "success",
      response: {
        patch: [],
        cookie: pullRequest.cookie,
        lastMutationIDChanges: {},
      },
    };

  return {
    type: "success",
    response: {
      // 18(i): Build patch
      patch: buildPatch(result.entities, result.prevCvr === undefined),

      // 18(ii): Construct cookie
      cookie: result.nextCvrVersion,

      // 18(iii): Last mutation ID changes
      lastMutationIDChanges: result.clients,
    },
  };
}

type PutsDels<TData> = {
  puts: Array<TData>;
  dels: Array<Metadata["id"]>;
};

// type Entities = {
//   organization: PutsDels<Organization>;
//   user: PutsDels<User>;
//   papercutAccount: PutsDels<PapercutAccount>;
//   papercutAccountCustomerAuthorization: PutsDels<PapercutAccountCustomerAuthorization>;
//   papercutAccountManagerAuthorization: PutsDels<PapercutAccountManagerAuthorization>;
//   room: PutsDels<Room>;
//   announcement: PutsDels<Announcement>;
//   product: PutsDels<Product>;
//   order: PutsDels<Order>;
//   comment: PutsDels<Comment>;
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyncedTableData<TTable extends SyncedTable = any> = [
  TTable["_"]["name"],
  PutsDels<TTable["$inferSelect"]>,
];

type SyncedTableDataQueryBuilderFactory = Record<
  SyncedTableName,
  <TSelect extends PgSelect>(
    select: TSelect,
    ids: Array<Metadata["id"]>,
  ) => TSelect
>;

function syncedTableDataQueryBuilderFactor() {
  const { org } = useAuthenticated();

  return {
    announcement: (select, ids) =>
      select.where(
        and(
          inArray(Announcement.id, ids as Array<Announcement["id"]>),
          eq(Announcement.orgId, org.id),
        ),
      ),
    comment: (select, ids) =>
      select.where(
        and(
          inArray(Comment.id, ids as Array<Comment["id"]>),
          eq(Comment.orgId, org.id),
        ),
      ),
    order: (select, ids) =>
      select.where(
        and(
          inArray(Order.id, ids as Array<Order["id"]>),
          eq(Order.orgId, org.id),
        ),
      ),
    organization: (select, ids) =>
      select.where(
        and(
          inArray(Organization.id, ids as Array<Organization["id"]>),
          eq(Organization.id, org.id),
        ),
      ),
    papercut_account: (select, ids) =>
      select.where(
        and(
          inArray(PapercutAccount.id, ids as Array<PapercutAccount["id"]>),
          eq(PapercutAccount.orgId, org.id),
        ),
      ),
    papercut_account_customer_authorization: (select, ids) =>
      select.where(
        and(
          inArray(
            PapercutAccountCustomerAuthorization.id,
            ids as Array<PapercutAccountCustomerAuthorization["id"]>,
          ),
          eq(PapercutAccountCustomerAuthorization.orgId, org.id),
        ),
      ),
    papercut_account_manager_authorization: (select, ids) =>
      select.where(
        and(
          inArray(
            PapercutAccountManagerAuthorization.id,
            ids as Array<PapercutAccountManagerAuthorization["id"]>,
          ),
          eq(PapercutAccountManagerAuthorization.orgId, org.id),
        ),
      ),
    product: (select, ids) =>
      select.where(
        and(
          inArray(Product.id, ids as Array<Product["id"]>),
          eq(Product.orgId, org.id),
        ),
      ),
    room: (select, ids) =>
      select.where(
        and(inArray(Room.id, ids as Array<Room["id"]>), eq(Room.orgId, org.id)),
      ),
    user: (select, ids) =>
      select.where(
        and(inArray(User.id, ids as Array<User["id"]>), eq(User.orgId, org.id)),
      ),
  } satisfies SyncedTableDataQueryBuilderFactory;
}

const readData = (diff: ClientViewRecordDiff) =>
  useTransaction((tx) =>
    Promise.all(
      syncedTables.map(async (table) => {
        const name = table._.name;

        const data = await syncedTableDataQueryBuilderFactor()[name](
          tx.select().from(table).$dynamic(),
          diff[name].puts,
        );

        return [name, data] as const;
      }),
    ),
  );

// function buildPatch(entities: Entities, clear: boolean) {
//   const patch: Array<PatchOperation> = [];

//   if (clear) patch.push({ op: "clear" });

//   patch.push(
//     ...Object.entries(entities).reduce((patch, [name, { puts, dels }]) => {
//       dels.forEach((id) => patch.push({ op: "del", key: `${name}/${id}` }));

//       puts.forEach((entity) => {
//         patch.push({
//           op: "put",
//           key: `${name}/${entity.id}`,
//           value: entity,
//         });
//       });

//       return patch;
//     }, [] as Array<PatchOperation>),
//   );

//   return patch;
// }
