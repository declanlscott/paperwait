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

export const RoomConfiguration = v.object({
  deliveryOptions: v.pipe(
    v.array(DeliveryOptionAttributes),
    v.minLength(1),
    v.check(isUniqueByName, "Delivery option names must be unique"),
  ),
  workflow: v.pipe(
    v.array(WorkflowStatusAttributes),
    v.minLength(1),
    v.check(isUniqueByName, "Workflow status names must be unique"),
  ),
});
export type RoomConfiguration = v.InferOutput<typeof RoomConfiguration>;
