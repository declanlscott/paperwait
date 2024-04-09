import { composeRenderProps } from "react-aria-components";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import type { ClassValue } from "clsx";

export const focusRing = tv({
  base: "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
