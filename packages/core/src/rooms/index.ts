import { and, eq, gte, inArray, isNull, notInArray, sql } from "drizzle-orm";
import * as R from "remeda";

import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { productsTable } from "../products/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn } from "../utils/shared";
import {
  createRoomMutationArgsSchema,
  defaultWorkflow,
  deleteRoomMutationArgsSchema,
  deliveryOptionsTableName,
  restoreRoomMutationArgsSchema,
  roomsTableName,
  setDeliveryOptionsMutationArgsSchema,
  setWorkflowMutationArgsSchema,
  updateRoomMutationArgsSchema,
  workflowStatusesTableName,
} from "./shared";
import { deliveryOptionsTable, roomsTable, workflowStatusesTable } from "./sql";

import type { DeliveryOption, Room, WorkflowStatus } from "./sql";

export namespace Rooms {
  export const create = fn(createRoomMutationArgsSchema, async (values) => {
    const { user } = useAuthenticated();

    enforceRbac(user, mutationRbac.createRoom, {
      Error: ApplicationError.AccessDenied,
      args: [{ name: roomsTableName }],
    });

    return useTransaction(async (tx) => {
      await Promise.all([
        tx.insert(roomsTable).values(values),
        tx.insert(workflowStatusesTable).values([
          {
            id: Constants.WORKFLOW_PENDING_APPROVAL,
            type: "Pending",
            charging: false,
            color: null,
            index: -1,
            roomId: values.id,
            tenantId: values.tenantId,
          },
          ...defaultWorkflow.map((status, index) => ({
            ...status,
            index,
            roomId: values.id,
            tenantId: values.tenantId,
          })),
        ]),
      ]);

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", values.tenantId)]),
      );
    });
  });

  export async function metadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: roomsTable.id,
          rowVersion: sql<number>`"${roomsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, tenant.id))
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "operator":
          return baseQuery.where(isNull(roomsTable.deletedAt));
        case "manager":
          return baseQuery.where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          );
        case "customer":
          return baseQuery.where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          );
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function fromIds(ids: Array<Room["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) =>
      tx
        .select()
        .from(roomsTable)
        .where(
          and(inArray(roomsTable.id, ids), eq(roomsTable.tenantId, tenant.id)),
        ),
    );
  }

  export const update = fn(
    updateRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.updateRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(roomsTable)
          .set(values)
          .where(
            and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.deleteRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      });

      return useTransaction(async (tx) => {
        await Promise.all([
          tx
            .update(roomsTable)
            .set({ ...values, status: "draft" })
            .where(
              and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)),
            ),
          // Set all products in the room to draft
          tx
            .update(productsTable)
            .set({ status: "draft" })
            .where(
              and(
                eq(productsTable.roomId, id),
                eq(productsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const restore = fn(restoreRoomMutationArgsSchema, async ({ id }) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.restoreRoom, {
      Error: ApplicationError.AccessDenied,
      args: [{ name: roomsTableName, id }],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(roomsTable)
        .set({ deletedAt: null })
        .where(and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  });

  export async function workflowStatusesMetadata() {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) =>
      tx
        .select({
          id: workflowStatusesTable.id,
          rowVersion: sql<number>`"${workflowStatusesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(workflowStatusesTable)
        .where(and(eq(workflowStatusesTable.tenantId, tenant.id))),
    );
  }

  export async function workflowStatusesFromIds(
    ids: Array<WorkflowStatus["id"]>,
  ) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) =>
      tx
        .select()
        .from(workflowStatusesTable)
        .where(
          and(
            inArray(workflowStatusesTable.id, ids),
            eq(workflowStatusesTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export const setWorkflow = fn(setWorkflowMutationArgsSchema, async (args) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.setWorkflow, {
      Error: ApplicationError.AccessDenied,
      args: [{ name: workflowStatusesTableName }],
    });

    await useTransaction(async (tx) => {
      const workflow = await tx
        .insert(workflowStatusesTable)
        .values(
          args.workflow.reduce((values, status, index) => {
            values.push({
              ...status,
              index,
              roomId: args.roomId,
              tenantId: tenant.id,
            });

            return values;
          }, [] as Array<WorkflowStatus>),
        )
        .onConflictDoUpdate({
          target: [
            workflowStatusesTable.id,
            workflowStatusesTable.roomId,
            workflowStatusesTable.tenantId,
          ],
          set: buildConflictUpdateColumns(workflowStatusesTable, [
            "id",
            "type",
            "charging",
            "color",
            "index",
            "roomId",
            "tenantId",
          ]),
        })
        .returning();

      await tx
        .delete(workflowStatusesTable)
        .where(
          and(
            notInArray(workflowStatusesTable.id, R.map(workflow, R.prop("id"))),
            gte(workflowStatusesTable.index, 0),
            eq(workflowStatusesTable.roomId, args.roomId),
            eq(workflowStatusesTable.tenantId, tenant.id),
          ),
        );

      await afterTransaction(async () =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  });

  export async function deliveryOptionsMetadata() {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) =>
      tx
        .select({
          id: deliveryOptionsTable.id,
          rowVersion: sql<number>`"${deliveryOptionsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(deliveryOptionsTable)
        .where(eq(deliveryOptionsTable.tenantId, tenant.id)),
    );
  }

  export async function deliveryOptionsFromIds(ids: Array<string>) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) =>
      tx
        .select()
        .from(deliveryOptionsTable)
        .where(
          and(
            inArray(deliveryOptionsTable.id, ids),
            eq(deliveryOptionsTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export const setDeliveryOptions = fn(
    setDeliveryOptionsMutationArgsSchema,
    async (args) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.setDeliveryOptions, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: deliveryOptionsTableName }],
      });

      await useTransaction(async (tx) => {
        const deliveryOptions = await tx
          .insert(deliveryOptionsTable)
          .values(
            args.options.reduce((values, option, index) => {
              values.push({
                ...option,
                index,
                roomId: args.roomId,
                tenantId: tenant.id,
              });

              return values;
            }, [] as Array<DeliveryOption>),
          )
          .onConflictDoUpdate({
            target: [
              deliveryOptionsTable.id,
              deliveryOptionsTable.roomId,
              deliveryOptionsTable.tenantId,
            ],
            set: buildConflictUpdateColumns(deliveryOptionsTable, [
              "id",
              "description",
              "detailsLabel",
              "cost",
              "index",
              "roomId",
              "tenantId",
            ]),
          });

        await tx
          .delete(deliveryOptionsTable)
          .where(
            and(
              notInArray(
                deliveryOptionsTable.id,
                R.map(deliveryOptions, R.prop("id")),
              ),
              gte(deliveryOptionsTable.index, 0),
              eq(deliveryOptionsTable.roomId, args.roomId),
              eq(deliveryOptionsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(async () =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
