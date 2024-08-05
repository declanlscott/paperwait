import {
  ToggleButton as AriaToggleButton,
  composeRenderProps,
} from "react-aria-components";

import { toggleStyles } from "~/styles/components/primitives/toggle";

import type { ToggleButtonProps as AriaToggleButtonProps } from "react-aria-components";
import type { ToggleStyles } from "~/styles/components/primitives/toggle";

export interface ToggleProps extends AriaToggleButtonProps, ToggleStyles {}

export const Toggle = ({ className, ...props }: ToggleProps) => (
  <AriaToggleButton
    className={composeRenderProps(className, (className, renderProps) =>
      toggleStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
