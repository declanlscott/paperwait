import * as R from "remeda";

import { productsTableName } from "../products/shared";
import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
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

import type { DeepReadonlyObject } from "replicache";
import type { Product } from "../products/sql";
import type { DeliveryOption, Room, WorkflowStatus } from "./sql";

export namespace Rooms {
  export const create = Utils.optimisticMutator(
    createRoomMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.createRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName }],
      }),
    () => async (tx, values) => {
      await Promise.all([
        tx.set(`${roomsTableName}/${values.id}`, values),
        tx.set(
          `${workflowStatusesTableName}/${Constants.WORKFLOW_PENDING_APPROVAL}`,
          {
            id: Constants.WORKFLOW_PENDING_APPROVAL,
            type: "Pending",
            charging: false,
            color: null,
            index: -1,
            roomId: values.id,
            tenantId: values.tenantId,
          },
        ),
        ...defaultWorkflow.map(async (status, index) =>
          tx.set(`${workflowStatusesTableName}/${status.id}`, {
            ...status,
            index,
            roomId: values.id,
            tenantId: values.tenantId,
          }),
        ),
      ]);
    },
  );

  export const update = Utils.optimisticMutator(
    updateRoomMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.updateRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: roomsTableName,
            id,
          });

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Room>;

        return tx.set(`${roomsTableName}/${id}`, next);
      },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteRoomMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.deleteRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        // Set all products in the room to draft
        const products = await tx
          .scan<Product>({ prefix: `${productsTableName}/` })
          .toArray()
          .then((products) => products.filter((p) => p.roomId === id));
        await Promise.all(
          products.map(async (p) => {
            const prev = await tx.get<Product>(`${productsTableName}/${p.id}`);
            if (!prev)
              throw new ApplicationError.EntityNotFound({
                name: productsTableName,
                id: p.id,
              });

            const next = {
              ...prev,
              status: "draft",
            } satisfies DeepReadonlyObject<Product>;

            return tx.set(`${productsTableName}/${p.id}`, next);
          }),
        );

        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: roomsTableName,
              id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Room>;

          return tx.set(`${roomsTableName}/${id}`, next);
        }

        const success = await tx.del(`${roomsTableName}/${id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: roomsTableName,
            id,
          });
      },
  );

  export const restore = Utils.optimisticMutator(
    restoreRoomMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.restoreRoom, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await tx.get<Room>(`${roomsTableName}/${values.id}`);
      if (!prev)
        throw new ApplicationError.EntityNotFound({
          name: roomsTableName,
          id: values.id,
        });

      const next = {
        ...prev,
        deletedAt: null,
      } satisfies DeepReadonlyObject<Room>;

      return tx.set(`${roomsTableName}/${values.id}`, next);
    },
  );

  export const setWorkflow = Utils.optimisticMutator(
    setWorkflowMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.setWorkflow, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: workflowStatusesTableName }],
      }),
    () =>
      async (tx, { workflow }) => {
        for (const status of workflow)
          await tx.set(`${workflowStatusesTableName}/${status.id}`, status);

        await R.pipe(
          await tx
            .scan<WorkflowStatus>({ prefix: `${workflowStatusesTableName}/` })
            .toArray(),
          R.filter((status) => !workflow.some((s) => s.id === status.id)),
          async (dels) =>
            Promise.all(
              dels.map((status) =>
                tx.del(`${workflowStatusesTableName}/${status.id}`),
              ),
            ),
        );
      },
  );

  export const setDeliveryOptions = Utils.optimisticMutator(
    setDeliveryOptionsMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.setDeliveryOptions, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: deliveryOptionsTableName }],
      }),
    () =>
      async (tx, { options }) => {
        for (const option of options)
          await tx.set(`${deliveryOptionsTableName}/${option.id}`, option);

        await R.pipe(
          await tx
            .scan<DeliveryOption>({ prefix: `${deliveryOptionsTableName}/` })
            .toArray(),
          R.filter((option) => !options.some((o) => o.id === option.id)),
          async (dels) =>
            Promise.all(
              dels.map((option) =>
                tx.del(`${deliveryOptionsTableName}/${option.id}`),
              ),
            ),
        );
      },
  );
}
