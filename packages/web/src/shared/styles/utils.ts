import { composeRenderProps } from "react-aria-components";
import clsx from "clsx/lite";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import type { ClassValue } from "clsx/lite";

export const focusRing = tv({
  base: "outline-none",
  variants: {
    isFocusVisible: {
      true: "ring-2 ring-ring ring-offset-2",
    },
    isHtml: {
      true: "focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background ring-ring",
    },
  },
  compoundVariants: [
    {
      variant: "destructive",
      isFocusVisible: true,
      className: "ring-destructive",
    },
    {
      variant: "destructive",
      isFocused: true,
      className: "ring-destructive",
    },
  ],
});

export function composeTwRenderProps<T>(
  className: string | ((v: T) => string) | undefined,
  tw: string,
): string | ((v: T) => string) {
  return composeRenderProps(className, (className) => twMerge(tw, className));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
