import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const userMenuTriggerButtonStyles = tv({
  extend: focusRingStyles,
  base: "h-10 rounded-full transition-opacity",
  variants: {
    isHovered: {
      true: "opacity-90",
    },
    isPressed: {
      true: "opacity-90",
    },
  },
});
export type UserMenuTriggerButtonStyles = VariantProps<
  typeof userMenuTriggerButtonStyles
>;
