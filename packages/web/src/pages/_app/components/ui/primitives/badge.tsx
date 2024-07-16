import { badgeStyles } from "~/shared/styles/components/primitives/badge";

import type { HTMLAttributes } from "react";
import type { BadgeStyles } from "~/shared/styles/components/primitives/badge";

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    BadgeStyles {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeStyles({ variant, className })} {...props} />;
}
