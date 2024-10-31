import * as v from "valibot";

import {
  nanoIdSchema,
  papercutAccountIdSchema,
  tenantTableSchema,
} from "../utils/shared";

export const ordersTableName = "orders";

export const orderSchema = v.object({
  ...tenantTableSchema.entries,
  customerId: nanoIdSchema,
  managerId: v.nullable(nanoIdSchema),
  operatorId: v.nullable(nanoIdSchema),
  productId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const orderMutationNames = [
  "createOrder",
  "updateOrder",
  "deleteOrder",
] as const;

export const createOrderMutationArgsSchema = orderSchema;
export type CreateOrderMutationArgs = v.InferOutput<
  typeof createOrderMutationArgsSchema
>;

export const updateOrderMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(orderSchema, [
      "id",
      "tenantId",
      "updatedAt",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateOrderMutationArgs = v.InferOutput<
  typeof updateOrderMutationArgsSchema
>;

export const deleteOrderMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteOrderMutationArgs = v.InferOutput<
  typeof deleteOrderMutationArgsSchema
>;

// Based on: https://www.papercut.com/help/manuals/job-ticketing/set-up/configure-costs/create-or-change-a-cost-script/configure-cost-script-reference/
export const orderAttributesV1Schema = v.object({
  version: v.literal(1),

  // Product name
  productName: v.string(),

  // Delivery options
  deliveryOption: v.object({
    cost: v.string(),
    name: v.string(),
    detailsLabel: v.string(),
  }),

  // Order dates
  created: v.pipe(v.string(), v.isoTimestamp()),
  due: v.optional(v.pipe(v.string(), v.isoDate())),

  // Copies
  copies: v.optional(
    v.object({
      quantity: v.number(),
    }),
  ),

  // Color mode
  color: v.optional(
    v.object({
      enabled: v.fallback(v.boolean(), false),
    }),
  ),

  // Pages
  pages: v.object({
    grayscalePages: v.pipe(v.number(), v.integer()),
    colorPages: v.pipe(v.number(), v.integer()),
  }),

  // Single or double sided
  printOnBothSides: v.optional(
    v.object({
      enabled: v.boolean(),
    }),
  ),

  // Paper stock
  paperStock: v.optional(
    v.object({
      cost: v.number(),
      size: v.string(),
      color: v.string(),
      type: v.string(),
    }),
  ),

  // Collating
  collating: v.optional(
    v.object({
      name: v.string(),
    }),
  ),

  // Front Cover
  frontCover: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
      printOnCover: v.string(),
    }),
  ),

  // Back Cover
  backCover: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Binding
  binding: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),

      // Binding option sub-attributes
      attributes: v.array(
        v.object({
          name: v.string(),

          // Binding option sub-attribute options
          option: v.object({
            cost: v.number(),
            name: v.string(),
          }),
        }),
      ),
    }),
  ),

  // Cutting
  cutting: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Hole punching
  holePunching: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Folding
  folding: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Packaging
  packaging: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
      itemsPerSet: v.number(),
    }),
  ),

  // Laminating
  laminating: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Proof Required
  proofRequired: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),
    }),
  ),

  // Material
  material: v.optional(
    v.object({
      cost: v.number(),
      name: v.string(),

      // Material color options
      color: v.object({
        cost: v.number(),
        name: v.string(),
        value: v.string(),
      }),
    }),
  ),

  // Custom text fields
  custom: v.optional(
    v.object({
      fields: v.array(
        v.object({
          name: v.string(),
          value: v.string(),

          // Custom drop-down list options
          option: v.object({
            cost: v.number(),
            name: v.string(),
          }),
        }),
      ),
    }),
  ),
});
export type OrderAttributesV1 = v.InferOutput<typeof orderAttributesV1Schema>;

export const orderAttributesSchema = v.variant("version", [
  orderAttributesV1Schema,
]);
export type OrderAttributes = v.InferOutput<typeof orderAttributesSchema>;

export const lineItemSchema = v.object({
  name: v.string(),
  description: v.string(),
  cost: v.number(),
  style: v.picklist(["OPTION_1", "OPTION_2"]),
});
export type LineItem = v.InferOutput<typeof lineItemSchema>;

export const estimateSchema = v.object({
  total: v.number(),
  description: v.optional(v.string()),
  items: v.array(lineItemSchema),
});
export type Estimate = v.InferOutput<typeof estimateSchema>;

export const estimateCostFunctionSchema = v.pipe(
  v.function(),
  v.args(v.tuple([orderAttributesSchema])),
  v.returns(estimateSchema),
);
export type EstimateCostFunction = v.InferOutput<
  typeof estimateCostFunctionSchema
>;
