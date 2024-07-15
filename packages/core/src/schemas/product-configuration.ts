import * as v from "valibot";

import { ProductStatus } from "../product";

export const Cost = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.decimal())]),
  v.transform(Number),
);

export const Option = v.object({
  name: v.string(),
  image: v.string(),
  description: v.optional(v.string()),
  cost: Cost,
});

export const Field = v.object({
  name: v.string(),
  required: v.boolean(),
  options: v.array(Option),
});

export const ProductAttributesV1 = v.object({
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
      options: v.array(Option),
    }),
  ),
  custom: v.optional(
    v.object({
      name: v.string(),
      fields: v.array(Field),
    }),
  ),
  customOperatorOnly: v.optional(
    v.object({
      name: v.string(),
      fields: v.array(Field),
    }),
  ),
  collating: v.optional(
    v.object({
      options: v.array(Option),
    }),
  ),
  frontCover: v.optional(
    v.object({
      options: v.array(
        v.object({
          ...Option.entries,
          printable: v.boolean(),
        }),
      ),
    }),
  ),
  backCover: v.optional(
    v.object({
      options: v.array(Option),
    }),
  ),
  cutting: v.optional(
    v.object({
      options: v.array(Option),
    }),
  ),
  binding: v.optional(
    v.object({
      options: v.array(
        v.object({
          ...Option.entries,
          subAttributes: v.array(
            v.object({
              name: v.string(),
              description: v.optional(v.string()),
              options: v.array(Option),
            }),
          ),
        }),
      ),
    }),
  ),
  holePunching: v.optional(v.array(Option)),
  folding: v.optional(v.array(Option)),
  laminating: v.optional(v.array(Option)),
  packaging: v.optional(
    v.object({
      name: v.string(),
      image: v.string(),
      cost: Cost,
      showItemsPerSet: v.boolean(),
    }),
  ),
  material: v.optional(
    v.object({
      name: v.string(),
      color: v.object({
        name: v.string(),
        value: v.optional(v.pipe(v.string(), v.hexColor())),
      }),
      cost: Cost,
    }),
  ),
  proofRequired: v.optional(
    v.object({
      options: v.array(
        v.object({
          name: v.string(),
          description: v.optional(v.string()),
        }),
      ),
    }),
  ),
});
export type ProductAttributesV1 = v.InferOutput<typeof ProductAttributesV1>;

export const ProductConfigurationV1 = v.object({
  version: v.literal(1),
  image: v.string(),
  productVisibility: v.picklist(ProductStatus.enumValues),
  orderAttachments: v.optional(
    v.object({
      fileUploadEnabled: v.boolean(),
      physicalCopyEnabled: v.boolean(),
    }),
  ),
  attributes: ProductAttributesV1,
});
export type ProductConfigurationV1 = v.InferOutput<
  typeof ProductConfigurationV1
>;

export const ProductConfiguration = v.variant("version", [
  ProductConfigurationV1,
]);
export type ProductConfiguration = v.InferOutput<typeof ProductConfiguration>;
