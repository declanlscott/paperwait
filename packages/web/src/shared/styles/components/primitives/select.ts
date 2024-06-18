import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const selectStyles = tv({
  base: "border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm ",
  variants: {
    isHtml: {
      true: "focus:ring-ring focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    },
  },
});

export type SelectStyles = VariantProps<typeof selectStyles>;
