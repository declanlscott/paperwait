import { tv } from "tailwind-variants";

import type { UserRole } from "@printworks/core/users/shared";
import type { VariantProps } from "tailwind-variants";

export const badgeStyles = tv({
  base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 capitalize",
  variants: {
    variant: {
      default:
        "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary:
        "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive:
        "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "text-foreground",
      administrator:
        "border-transparent bg-red-500 text-white hover:bg-red-500/80",
      operator:
        "border-transparent bg-blue-500 text-white hover:bg-blue-500/80",
      manager:
        "border-transparent bg-green-500 text-white hover:bg-green-500/80",
      customer:
        "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
    } satisfies Record<UserRole, string> & Record<string, string>,
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeStyles = VariantProps<typeof badgeStyles>;
