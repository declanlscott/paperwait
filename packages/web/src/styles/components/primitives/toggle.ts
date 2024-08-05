import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const toggleStyles = tv({
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none",
  variants: {
    variant: {
      default: "bg-transparent",
      outline: "border border-input bg-transparent",
    },
    size: {
      default: "h-10 px-3",
      sm: "h-9 px-2.5",
      lg: "h-11 px-5",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isHovered: {
      true: "bg-muted text-muted-foreground",
    },
    isSelected: {
      true: "bg-accent text-accent-foreground",
    },
    isFocusVisible: {
      true: "outline-none ring-2 ring-ring ring-offset-2",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
  compoundVariants: [
    {
      variant: "outline",
      isHovered: true,
      className: "bg-accent text-accent-foreground",
    },
  ],
});
export type ToggleStyles = VariantProps<typeof toggleStyles>;
