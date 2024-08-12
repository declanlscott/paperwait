import * as R from "remeda";
import * as v from "valibot";

import { isUniqueByName } from "../utils/index";

export const DeliveryOptionAttributes = v.object({
  name: v.pipe(v.string(), v.trim()),
  description: v.string(),
  detailsLabel: v.pipe(
    v.nullable(v.string()),
    v.transform((input) => {
      if (!input) return null;

      return input.trim();
    }),
  ),
  cost: v.optional(
    v.fallback(
      v.pipe(
        v.union([v.number(), v.pipe(v.string(), v.decimal())]),
        v.transform(Number),
      ),
      0,
    ),
  ),
});
export type DeliveryOptionAttributes = v.InferOutput<
  typeof DeliveryOptionAttributes
>;

export const workflowStatusTypes = [
  "Pending",
  "New",
  "InProgress",
  "Completed",
] as const;
export type WorkflowStatusType = (typeof workflowStatusTypes)[number];

export const WorkflowStatusAttributes = v.object({
  name: v.pipe(v.string(), v.trim()),
  type: v.picklist(workflowStatusTypes),
  charging: v.boolean(),
  color: v.optional(v.pipe(v.string(), v.hexColor())),
});
export type WorkflowStatusAttributes = v.InferOutput<
  typeof WorkflowStatusAttributes
>;

export const WorkflowConfiguration = v.pipe(
  v.array(WorkflowStatusAttributes),
  v.check(isUniqueByName, "Workflow status names must be unique"),
  v.check(
    (workflow) =>
      R.pipe(
        workflow,
        R.conditional(
          [R.isEmpty, () => true],
          R.conditional.defaultCase(() =>
            R.pipe(
              workflow,
              R.filter((status) => status.type === "New"),
              R.length(),
              (length) => length === 1,
            ),
          ),
        ),
      ),
    "Workflow must have exactly one status of type 'New'",
  ),
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
