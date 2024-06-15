import { Separator as AriaSeparator } from "react-aria-components";

import { separatorStyles } from "~/shared/styles/components/separator";

import type { SeparatorProps as AriaSeparatorProps } from "react-aria-components";

export type SeparatorProps = AriaSeparatorProps;
export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) => (
  <AriaSeparator
    orientation={orientation}
    className={separatorStyles({ orientation, className })}
    {...props}
  />
);
