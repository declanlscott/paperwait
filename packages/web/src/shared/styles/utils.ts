import { composeRenderProps } from "react-aria-components";
import clsx from "clsx/lite";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import type { ClassValue } from "clsx/lite";

export const focusRing = tv({
  base: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background",
  variants: {
    variant: {
      default: "focus-visible:ring-ring",
      error: "focus-visible:ring-red-500",
    },
    isFocusVisible: {
      false: "ring-0",
      true: "outline-none ring-2 ring-ring ring-offset-2",
    },
    isFocusWithin: {
      false: "ring-0",
      true: "outline-none ring-2 ring-ring ring-offset-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
  compoundVariants: [
    {
      variant: "error",
      isFocusVisible: true,
      className: "ring-red-500",
    },
    {
      variant: "error",
      isFocusWithin: true,
      className: "ring-red-500",
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
