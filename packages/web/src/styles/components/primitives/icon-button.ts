import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const iconButtonStyles = tv({
  extend: focusRing,
  base: "ring-offset-background rounded-sm text-primary/50 transition-colors [&>svg]:size-5",
  variants: {
    isHovered: {
      true: "text-primary/100",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
  },
});
export type IconButtonStyles = VariantProps<typeof iconButtonStyles>;
