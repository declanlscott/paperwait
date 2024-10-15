import * as v from "valibot";

import { Constants } from "../constants";
import {
  isUniqueByName,
  nanoIdSchema,
  tenantTableSchema,
} from "../utils/shared";

export const costSchema = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.decimal())]),
  v.transform(Number),
);

export const optionSchema = v.object({
  name: v.pipe(v.string(), v.trim()),
  image: v.string(),
  description: v.optional(v.string()),
  cost: costSchema,
});

export const fieldSchema = v.object({
  name: v.pipe(v.string(), v.trim()),
  required: v.boolean(),
  options: v.pipe(
    v.array(optionSchema),
    v.check(isUniqueByName, "Field option names must be unique"),
  ),
});

export const productAttributesV1Schema = v.object({
  copies: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  printColor: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  singleOrDoubleSided: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  due: v.object({
    visible: v.fallback(v.boolean(), true),
    leadTimeDays: v.fallback(v.pipe(v.number(), v.integer()), 0),
    workingDays: v.picklist(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  }),
  paperStock: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(isUniqueByName, "Paper stock option names must be unique"),
      ),
    }),
  ),
  custom: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(fieldSchema),
        v.check(isUniqueByName, "Custom field names must be unique"),
      ),
    }),
  ),
  customOperatorOnly: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(fieldSchema),
        v.check(
          isUniqueByName,
          "Custom operator only field names must be unique",
        ),
      ),
    }),
  ),
  collating: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(isUniqueByName, "Collating option names must be unique"),
      ),
    }),
  ),
  frontCover: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...optionSchema.entries,
            printable: v.boolean(),
          }),
        ),
        v.check(isUniqueByName, "Front cover option names must be unique"),
      ),
    }),
  ),
  backCover: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(isUniqueByName, "Back cover option names must be unique"),
      ),
    }),
  ),
  cutting: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(isUniqueByName, "Cutting option names must be unique"),
      ),
    }),
  ),
  binding: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...optionSchema.entries,
            subAttributes: v.pipe(
              v.array(
                v.object({
                  name: v.pipe(v.string(), v.trim()),
                  description: v.optional(v.string()),
                  options: v.pipe(
                    v.array(optionSchema),
                    v.check(
                      isUniqueByName,
                      "Binding sub-attribute option names must be unique",
                    ),
                  ),
                }),
              ),
              v.check(
                isUniqueByName,
                "Binding sub-attribute names must be unique",
              ),
            ),
          }),
        ),
        v.check(isUniqueByName, "Binding option names must be unique"),
      ),
    }),
  ),
  holePunching: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(isUniqueByName, "Hole punching option names must be unique"),
    ),
  ),
  folding: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(isUniqueByName, "Folding option names must be unique"),
    ),
  ),
  laminating: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(isUniqueByName, "Laminating option names must be unique"),
    ),
  ),
  packaging: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      image: v.string(),
      cost: costSchema,
      showItemsPerSet: v.boolean(),
    }),
  ),
  material: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      color: v.object({
        name: v.pipe(v.string(), v.trim()),
        value: v.optional(v.pipe(v.string(), v.hexColor())),
      }),
      cost: costSchema,
    }),
  ),
  proofRequired: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            name: v.pipe(v.string(), v.trim()),
            description: v.optional(v.string()),
          }),
        ),
        v.check(isUniqueByName, "Proof required option names must be unique"),
      ),
    }),
  ),
});
export type ProductAttributesV1 = v.InferOutput<
  typeof productAttributesV1Schema
>;

export const productsTableName = "products";

export const productStatuses = ["draft", "published"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productConfigurationV1Schema = v.object({
  version: v.literal(1),
  image: v.string(),
  productVisibility: v.picklist(productStatuses),
  orderAttachments: v.optional(
    v.object({
      fileUploadEnabled: v.boolean(),
      physicalCopyEnabled: v.boolean(),
    }),
  ),
  attributes: productAttributesV1Schema,
});
export type ProductConfigurationV1 = v.InferOutput<
  typeof productConfigurationV1Schema
>;

export const productConfigurationSchema = v.variant("version", [
  productConfigurationV1Schema,
]);
export type ProductConfiguration = v.InferOutput<
  typeof productConfigurationSchema
>;

export const productSchema = v.object({
  ...tenantTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(Constants.VARCHAR_LENGTH)),
  status: v.picklist(productStatuses),
  roomId: nanoIdSchema,
  config: productConfigurationSchema,
});

export const productMutationNames = [
  "createProduct",
  "updateProduct",
  "deleteProduct",
] as const;

export const createProductMutationArgsSchema = productSchema;
export type CreateProductMutationArgs = v.InferOutput<
  typeof createProductMutationArgsSchema
>;

export const updateProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(productSchema, [
      "id",
      "tenantId",
      "updatedAt",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateProductMutationArgs = v.InferOutput<
  typeof updateProductMutationArgsSchema
>;

export const deleteProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteProductMutationArgs = v.InferOutput<
  typeof deleteProductMutationArgsSchema
>;
