import {
  Tooltip as AriaTooltip,
  composeRenderProps,
} from "react-aria-components";

import { tooltipStyles } from "~/styles/components/primitives/tooltip";

import type { TooltipProps as AriaTooltipProps } from "react-aria-components";

export { TooltipTrigger } from "react-aria-components";

export type TooltipProps = AriaTooltipProps;
export function Tooltip({ className, offset = 4, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={offset}
      className={composeRenderProps(className, (className, renderProps) =>
        tooltipStyles({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}
