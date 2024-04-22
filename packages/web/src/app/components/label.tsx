import { Label as AriaLabel } from "react-aria-components";

import { labelStyles } from "~/styles/components/label";

import type { LabelProps as AriaLabelProps } from "react-aria-components";

export type LabelProps = AriaLabelProps;

export function Label({ className, ...props }: LabelProps) {
  return <AriaLabel {...props} className={labelStyles({ className })} />;
}
