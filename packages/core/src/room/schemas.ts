import * as R from "remeda";
import * as v from "valibot";

import { VARCHAR_LENGTH } from "../constants/db";
import { roomStatuses, workflowStatusTypes } from "../constants/tuples";
import { isUniqueByName } from "../utils/misc";
import { orgTableSchema } from "../utils/schemas";

export const deliveryOptionAttributesSchema = v.object({
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
  typeof deliveryOptionAttributesSchema
>;

export const workflowStatusAttributesSchema = v.object({
  name: v.pipe(v.string(), v.trim()),
  type: v.picklist(workflowStatusTypes),
  charging: v.boolean(),
  color: v.optional(v.pipe(v.string(), v.hexColor())),
});
export type WorkflowStatusAttributes = v.InferOutput<
  typeof workflowStatusAttributesSchema
>;

export const workflowConfigurationSchema = v.pipe(
  v.array(workflowStatusAttributesSchema),
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
              R.isDeepEqual(1),
            ),
          ),
        ),
      ),
    "Workflow must have exactly one status of type 'New'",
  ),
);
export type WorkflowConfiguration = v.InferOutput<
  typeof workflowConfigurationSchema
>;

export const deliveryOptionsConfigurationSchema = v.pipe(
  v.array(deliveryOptionAttributesSchema),
  v.check(isUniqueByName, "Delivery option names must be unique"),
);
export type DeliveryOptionsConfiguration = v.InferOutput<
  typeof deliveryOptionsConfigurationSchema
>;

export const roomConfigurationSchema = v.object({
  workflow: workflowConfigurationSchema,
  deliveryOptions: deliveryOptionsConfigurationSchema,
});
export type RoomConfiguration = v.InferOutput<typeof roomConfigurationSchema>;

export const roomSchema = v.object({
  ...orgTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(VARCHAR_LENGTH)),
  status: v.picklist(roomStatuses),
  details: v.nullable(v.string()),
  config: roomConfigurationSchema,
});
