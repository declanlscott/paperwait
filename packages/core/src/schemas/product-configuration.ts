import * as v from "valibot";

import { productStatuses } from "../drizzle/enums";
import { isUniqueByName } from "../utils";

export const Cost = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.decimal())]),
  v.transform(Number),
);

export const Option = v.object({
  name: v.pipe(v.string(), v.trim()),
  image: v.string(),
  description: v.optional(v.string()),
  cost: Cost,
});

export const Field = v.object({
  name: v.pipe(v.string(), v.trim()),
  required: v.boolean(),
  options: v.pipe(
    v.array(Option),
    v.check(isUniqueByName, "Field option names must be unique"),
  ),
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
      options: v.pipe(
        v.array(Option),
        v.check(isUniqueByName, "Paper stock option names must be unique"),
      ),
    }),
  ),
  custom: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(Field),
        v.check(isUniqueByName, "Custom field names must be unique"),
      ),
    }),
  ),
  customOperatorOnly: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(Field),
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
        v.array(Option),
        v.check(isUniqueByName, "Collating option names must be unique"),
      ),
    }),
  ),
  frontCover: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...Option.entries,
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
        v.array(Option),
        v.check(isUniqueByName, "Back cover option names must be unique"),
      ),
    }),
  ),
  cutting: v.optional(
    v.object({
      options: v.pipe(
        v.array(Option),
        v.check(isUniqueByName, "Cutting option names must be unique"),
      ),
    }),
  ),
  binding: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...Option.entries,
            subAttributes: v.pipe(
              v.array(
                v.object({
                  name: v.pipe(v.string(), v.trim()),
                  description: v.optional(v.string()),
                  options: v.pipe(
                    v.array(Option),
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
      v.array(Option),
      v.check(isUniqueByName, "Hole punching option names must be unique"),
    ),
  ),
  folding: v.optional(
    v.pipe(
      v.array(Option),
      v.check(isUniqueByName, "Folding option names must be unique"),
    ),
  ),
  laminating: v.optional(
    v.pipe(
      v.array(Option),
      v.check(isUniqueByName, "Laminating option names must be unique"),
    ),
  ),
  packaging: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      image: v.string(),
      cost: Cost,
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
      cost: Cost,
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
export type ProductAttributesV1 = v.InferOutput<typeof ProductAttributesV1>;

export const ProductConfigurationV1 = v.object({
  version: v.literal(1),
  image: v.string(),
  productVisibility: v.picklist(productStatuses),
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
