import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const commandStyles = tv({
  slots: {
    root: "bg-popover text-popover-foreground flex size-full flex-col overflow-hidden rounded-md",
    dialogContent:
      "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5",
    input:
      "placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
    list: "max-h-[300px] overflow-y-auto overflow-x-hidden",
    group:
      "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
    separator: "bg-border -mx-1 h-px",
    item: "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
    shortcut: "text-muted-foreground ml-auto text-xs tracking-widest",
  },
});
export type CommandStyles = VariantProps<typeof commandStyles>;

export const commandBackButtonStyles = tv({
  extend: focusRing,
  base: "ring-offset-background mr-2 shrink-0 text-primary/50 transition-colors rounded-sm",
  variants: {
    isHovered: {
      true: "text-primary/100",
    },
  },
});
