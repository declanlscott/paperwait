import * as v from "valibot";

import { isUniqueByName } from "../utils/index";

export const DeliveryOptionAttributes = v.object({
  name: v.pipe(v.string(), v.trim()),
  description: v.string(),
  detailsLabel: v.nullable(v.string()),
  cost: v.optional(
    v.pipe(
      v.union([v.number(), v.pipe(v.string(), v.decimal())]),
      v.transform(Number),
    ),
  ),
});
export type DeliveryOptionAttributes = v.InferOutput<
  typeof DeliveryOptionAttributes
>;

export const WorkflowStatusAttributes = v.object({
  name: v.pipe(v.string(), v.trim()),
  type: v.picklist(["New", "InProgress", "Completed"]),
  charging: v.boolean(),
});
export type WorkflowStatusAttributes = v.InferOutput<
  typeof WorkflowStatusAttributes
>;

export const WorkflowConfiguration = v.pipe(
  v.array(WorkflowStatusAttributes),
  v.check(isUniqueByName, "Workflow status names must be unique"),
);
export type WorkflowConfiguration = v.InferOutput<typeof WorkflowConfiguration>;

export const DeliveryOptionsConfiguration = v.pipe(
  v.array(DeliveryOptionAttributes),
  v.check(isUniqueByName, "Delivery option names must be unique"),
);
export type DeliveryOptionsConfiguration = v.InferOutput<
  typeof DeliveryOptionsConfiguration
>;

export const RoomConfiguration = v.object({
  workflow: WorkflowConfiguration,
  deliveryOptions: DeliveryOptionsConfiguration,
});
export type RoomConfiguration = v.InferOutput<typeof RoomConfiguration>;
