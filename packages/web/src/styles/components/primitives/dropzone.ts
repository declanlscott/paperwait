import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const dropzoneStyles = tv({
  extend: focusRingStyles,
  base: "flex h-[150px] w-[300px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm",
  variants: {
    isDropTarget: {
      true: "border-primary bg-accent border-solid",
    },
  },
});

export type DropzoneStyles = VariantProps<typeof dropzoneStyles>;
