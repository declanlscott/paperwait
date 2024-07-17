import { and, eq, lt, sql } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { Comment } from "../comment/comment.sql";
import { transact } from "../database/transaction";
import { BadRequestError, UnauthorizedError } from "../errors/http";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import { getClientGroup, getData } from "./data";
import {
  searchAnnouncements,
  searchClients,
  searchComments,
  searchOrders,
  searchOrganizations,
  searchPapercutAccountCustomerAuthorizations,
  searchPapercutAccountManagerAuthorizations,
  searchPapercutAccounts,
  searchProducts,
  searchRooms,
  searchUsers,
} from "./metadata";
import { ReplicacheClientGroup, ReplicacheClientView } from "./replicache.sql";

import type {
  ClientStateNotFoundResponse,
  PatchOperation,
  PullRequest,
  PullResponseOKV1,
  VersionNotSupportedResponse,
} from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { OmitTimestamps } from "../types/drizzle";
import type {
  ClientViewRecordDiff,
  ClientViewRecordEntries,
} from "./client-view-record";
import type { DomainsMetadata, Metadata } from "./metadata";

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
// Some steps are out of order due to what is included in the transaction
export async function pull(
  user: LuciaUser,
  pullRequest: PullRequest,
): Promise<PullResult> {
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
  const result = await transact(async (tx) => {
    // 1: Fetch previous client view record
    const [prevClientView] = pullRequest.cookie
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
      : [undefined];

    // 2: Initialize base client view record
    const baseCvr = buildCvr({ variant: "base", prev: prevClientView?.record });

    // 4: Get client group
    const baseClientGroup = await getClientGroup(
      tx,
      user,
      pullRequest.clientGroupID,
    );

    // 5: Verify requesting client group owns requested client
    if (baseClientGroup.userId !== user.id)
      throw new UnauthorizedError("User does not own client group");

    // 6: Read all domain data, just ids and versions
    // 7: Read all clients in the client group
    const metadata = await getMetadata(tx, user, baseClientGroup);

    // 8: Build next client view record
    const nextCvr = buildCvr({ variant: "next", metadata });

    // 9: Calculate diff
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op
    if (prevClientView && isCvrDiffEmpty(diff)) return null;

    // 11: Get entities
    const entities = await getEntities(tx, user, diff);

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients = diff.client.puts.reduce((clients, clientId) => {
      clients[clientId] = nextCvr.client[clientId];
      return clients;
    }, {} as ClientViewRecordEntries);

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
      entities,
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

async function getMetadata(
  tx: Transaction,
  user: LuciaUser,
  clientGroup: OmitTimestamps<ReplicacheClientGroup>,
) {
  const [
    organizationsMetadata,
    usersMetadata,
    papercutAccountsMetadata,
    papercutAccountCustomerAuthorizationsMetadata,
    papercutAccountManagerAuthorizationsMetadata,
    roomsMetadata,
    announcementsMetadata,
    productsMetadata,
    ordersMetadata,
    commentsMetadata,
    clientsMetadata,
  ] = await Promise.all([
    searchOrganizations(tx, user),
    searchUsers(tx, user),
    searchPapercutAccounts(tx, user),
    searchPapercutAccountCustomerAuthorizations(tx, user),
    searchPapercutAccountManagerAuthorizations(tx, user),
    searchRooms(tx, user),
    searchAnnouncements(tx, user),
    searchProducts(tx, user),
    searchOrders(tx, user),
    searchComments(tx, user),
    searchClients(tx, clientGroup.id),
  ]);

  return {
    organization: organizationsMetadata,
    user: usersMetadata,
    papercutAccount: papercutAccountsMetadata,
    papercutAccountCustomerAuthorization:
      papercutAccountCustomerAuthorizationsMetadata,
    papercutAccountManagerAuthorization:
      papercutAccountManagerAuthorizationsMetadata,
    room: roomsMetadata,
    announcement: announcementsMetadata,
    product: productsMetadata,
    order: ordersMetadata,
    comment: commentsMetadata,
    client: clientsMetadata,
  } satisfies DomainsMetadata;
}

type PutsDels<TEntity> = {
  puts: Array<TEntity>;
  dels: Array<Metadata["id"]>;
};

type Entities = {
  organization: PutsDels<Organization>;
  user: PutsDels<User>;
  papercutAccount: PutsDels<PapercutAccount>;
  papercutAccountCustomerAuthorization: PutsDels<PapercutAccountCustomerAuthorization>;
  papercutAccountManagerAuthorization: PutsDels<PapercutAccountManagerAuthorization>;
  room: PutsDels<Room>;
  announcement: PutsDels<Announcement>;
  product: PutsDels<Product>;
  order: PutsDels<Order>;
  comment: PutsDels<Comment>;
};

async function getEntities(
  tx: Transaction,
  user: LuciaUser,
  diff: ClientViewRecordDiff,
) {
  const [
    organizations,
    users,
    papercutAccounts,
    papercutAccountCustomerAuthorizations,
    papercutAccountManagerAuthorizations,
    rooms,
    announcements,
    products,
    orders,
    comments,
  ] = await Promise.all([
    getData(
      tx,
      Organization,
      { orgId: Organization.id, id: Organization.id },
      { orgId: user.orgId, ids: diff.organization.puts },
    ),
    getData(
      tx,
      User,
      { orgId: User.orgId, id: User.id },
      { orgId: user.orgId, ids: diff.user.puts },
    ),
    getData(
      tx,
      PapercutAccount,
      { orgId: PapercutAccount.orgId, id: PapercutAccount.id },
      { orgId: user.orgId, ids: diff.papercutAccount.puts },
    ),
    getData(
      tx,
      PapercutAccountCustomerAuthorization,
      {
        orgId: PapercutAccountCustomerAuthorization.orgId,
        id: PapercutAccountCustomerAuthorization.id,
      },
      {
        orgId: user.orgId,
        ids: diff.papercutAccountCustomerAuthorization.puts,
      },
    ),
    getData(
      tx,
      PapercutAccountManagerAuthorization,
      {
        orgId: PapercutAccountManagerAuthorization.orgId,
        id: PapercutAccountManagerAuthorization.id,
      },
      {
        orgId: user.orgId,
        ids: diff.papercutAccountManagerAuthorization.puts,
      },
    ),
    getData(
      tx,
      Room,
      { orgId: Room.orgId, id: Room.id },
      { orgId: user.orgId, ids: diff.room.puts },
    ),
    getData(
      tx,
      Announcement,
      {
        orgId: Announcement.orgId,
        id: Announcement.id,
      },
      { orgId: user.orgId, ids: diff.announcement.puts },
    ),
    getData(
      tx,
      Product,
      { orgId: Product.orgId, id: Product.id },
      { orgId: user.orgId, ids: diff.product.puts },
    ),
    getData(
      tx,
      Order,
      { orgId: Order.orgId, id: Order.id },
      { orgId: user.orgId, ids: diff.order.puts },
    ),
    getData(
      tx,
      Comment,
      { orgId: Comment.orgId, id: Comment.id },
      { orgId: user.orgId, ids: diff.comment.puts },
    ),
  ]);

  return {
    organization: { puts: organizations, dels: diff.organization.dels },
    user: { puts: users, dels: diff.user.dels },
    papercutAccount: {
      puts: papercutAccounts,
      dels: diff.papercutAccount.dels,
    },
    papercutAccountCustomerAuthorization: {
      puts: papercutAccountCustomerAuthorizations,
      dels: diff.papercutAccountCustomerAuthorization.dels,
    },
    papercutAccountManagerAuthorization: {
      puts: papercutAccountManagerAuthorizations,
      dels: diff.papercutAccountManagerAuthorization.dels,
    },
    room: { puts: rooms, dels: diff.room.dels },
    announcement: { puts: announcements, dels: diff.announcement.dels },
    product: { puts: products, dels: diff.product.dels },
    order: { puts: orders, dels: diff.order.dels },
    comment: { puts: comments, dels: diff.comment.dels },
  } satisfies Entities;
}

function buildPatch(entities: Entities, clear: boolean) {
  const patch: Array<PatchOperation> = [];

  if (clear) patch.push({ op: "clear" });

  patch.push(
    ...Object.entries(entities).reduce((patch, [name, { puts, dels }]) => {
      dels.forEach((id) => patch.push({ op: "del", key: `${name}/${id}` }));

      puts.forEach((entity) => {
        patch.push({
          op: "put",
          key: `${name}/${entity.id}`,
          value: entity,
        });
      });

      return patch;
    }, [] as Array<PatchOperation>),
  );

  return patch;
}
