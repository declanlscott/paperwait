import * as R from "remeda";

import { announcementsTableName } from "../announcements/shared";
import { commentsTableName } from "../comments/shared";
import { invoicesTableName } from "../invoices/shared";
import { ordersTableName } from "../orders/shared";
import {
  papercutAccountCustomerAuthorizationsTableName,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "../papercut/shared";
import {
  type PapercutAccount,
  type PapercutAccountCustomerAuthorization,
  type PapercutAccountManagerAuthorization,
} from "../papercut/sql";
import { productsTableName } from "../products/shared";
import { Replicache } from "../replicache/client";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "../rooms/shared";
import { tenantsTableName } from "../tenants/shared";
import { usersTableName } from "../users/shared";

import type { WriteTransaction } from "replicache";
import type { Comment } from "../comments/sql";
import type { Order } from "../orders/sql";
import type { WorkflowStatus } from "../rooms/sql";
import type { UserRole } from "../users/shared";
import type { User, UserWithProfile } from "../users/sql";
import type { SyncedTableName } from "../utils/tables";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";

export namespace AccessControl {
  type PermissionsFactory = Record<
    UserRole,
    Record<
      SyncedTableName,
      Record<
        "create" | "update" | "delete",
        | boolean
        | ((
            tx: WriteTransaction,
            user: UserWithProfile,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...input: Array<any>
          ) => boolean | Promise<boolean>)
      >
    >
  >;

  const permissionsFactory = {
    administrator: {
      [announcementsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [commentsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [deliveryOptionsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [invoicesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [papercutAccountsTableName]: {
        create: false,
        update: true,
        delete: true,
      },
      [papercutAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTableName]: {
        create: true,
        update: false,
        delete: true,
      },
      [productsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [tenantsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: true,
        delete: true,
      },
      [workflowStatusesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [announcementsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [commentsTableName]: {
        create: true,
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      [deliveryOptionsTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [papercutAccountsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [announcementsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            if (order.customerId === user.id) return true;

            const papercutAccount = await Replicache.get<PapercutAccount>(
              tx,
              papercutAccountsTableName,
              order.papercutAccountId,
            );

            return R.pipe(
              await Replicache.scan<PapercutAccountManagerAuthorization>(
                tx,
                papercutAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      [deliveryOptionsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: async (tx, user, papercutAccountId: PapercutAccount["id"]) => {
          try {
            return R.pipe(
              await Replicache.scan<PapercutAccountCustomerAuthorization>(
                tx,
                papercutAccountCustomerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccountId &&
                  authorization.customerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            const workflowStatus = await Replicache.get<WorkflowStatus>(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );

            if (workflowStatus.type !== "Review") return false;
            if (order.customerId === user.id) return true;

            const papercutAccount = await Replicache.get<PapercutAccount>(
              tx,
              papercutAccountsTableName,
              order.papercutAccountId,
            );

            return R.pipe(
              await Replicache.scan<PapercutAccountManagerAuthorization>(
                tx,
                papercutAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        delete: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            const workflowStatus = await Replicache.get<WorkflowStatus>(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );

            if (workflowStatus.type !== "Review") return false;
            if (order.customerId === user.id) return true;

            const papercutAccount = await Replicache.get<PapercutAccount>(
              tx,
              papercutAccountsTableName,
              order.papercutAccountId,
            );

            return R.pipe(
              await Replicache.scan<PapercutAccountManagerAuthorization>(
                tx,
                papercutAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
      },
      [papercutAccountsTableName]: {
        create: false,
        update: async (tx, user, papercutAccountId: PapercutAccount["id"]) => {
          try {
            const papercutAccount = await Replicache.get<PapercutAccount>(
              tx,
              papercutAccountsTableName,
              papercutAccountId,
            );

            return R.pipe(
              await Replicache.scan<PapercutAccountManagerAuthorization>(
                tx,
                papercutAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
    },
    customer: {
      [announcementsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get<Comment>(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      [deliveryOptionsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: async (tx, user, papercutAccountId: PapercutAccount["id"]) => {
          try {
            const papercutAccount = await Replicache.get<PapercutAccount>(
              tx,
              papercutAccountsTableName,
              papercutAccountId,
            );

            return R.pipe(
              await Replicache.scan<PapercutAccountCustomerAuthorization>(
                tx,
                papercutAccountCustomerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.papercutAccountId === papercutAccount.id &&
                  authorization.customerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            const workflowStatus = await Replicache.get<WorkflowStatus>(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );
            if (workflowStatus.type !== "Review") return false;

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get<Order>(
              tx,
              ordersTableName,
              orderId,
            );

            const workflowStatus = await Replicache.get<WorkflowStatus>(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );
            if (workflowStatus.type !== "Review") return false;

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
      },
      [papercutAccountsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [papercutAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
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
    tx: WriteTransaction,
    user: UserWithProfile,
    resource: TResource,
    action: TAction,
    ...input: TPermission extends (
      tx: WriteTransaction,
      user: UserWithProfile,
      ...input: infer TInput
    ) => unknown
      ? TInput
      : Array<never>
  ) {
    const permission = (permissionsFactory as PermissionsFactory)[
      user.profile.role
    ][resource][action];

    return new Promise<boolean>((resolve) => {
      if (typeof permission === "boolean") return resolve(permission);

      return resolve(permission(tx, user, ...input));
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
      const message = `Access denied for action "${args[3]}" on resource "${args[2]} with input "${args[4]}".`;

      console.log(message);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
