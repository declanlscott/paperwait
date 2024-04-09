import { Popover as AriaPopover } from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTwRenderProps } from "~/utils/tailwind";

import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

export const popoverVariants = tv({
  base: "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0 zoom-in-95 placement-left:slide-in-from-right-2 placement-right:slide-in-from-left-2 placement-bottom:slide-in-from-top-2 placement-top:slide-in-from-bottom-2",
    },
    isExiting: {
      true: "animate-out fade-out-0 zoom-out-95 placement-left:slide-in-from-right-2 placement-right:slide-in-from-left-2 placement-bottom:slide-in-from-top-2 placement-top:slide-in-from-bottom-2",
    },
  },
});

export type PopoverVariants = VariantProps<typeof popoverVariants>;

export type PopoverProps = AriaPopoverProps & PopoverVariants;

export function Popover(props: PopoverProps) {
  return (
    <AriaPopover
      {...props}
      className={composeTwRenderProps(
        props.className,
        popoverVariants({
          isEntering: props.isEntering,
          isExiting: props.isExiting,
        }),
      )}
    />
  );
}
