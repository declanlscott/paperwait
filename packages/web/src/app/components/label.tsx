import { Label as AriaLabel } from "react-aria-components";

import { cn } from "~/utils/tailwind";

import type { LabelProps as AriaLabelProps } from "react-aria-components";

export type LabelProps = AriaLabelProps;

export function Label(props: LabelProps) {
  return <AriaLabel {...props} className={cn("label", props.className)} />;
}
