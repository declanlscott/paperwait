import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const xButtonStyles = tv({
  extend: focusRing,
  base: "ring-offset-background rounded-sm text-primary/50 transition-colors",
  variants: {
    isHovered: {
      true: "text-primary/100",
    },
    isDisabled: {
      true: "pointer-events-none",
    },
  },
});
export type XButtonStyles = VariantProps<typeof xButtonStyles>;
