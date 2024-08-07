import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { X } from "lucide-react";

import { xButtonStyles } from "~/styles/components/primitives/x-button";

import type { ButtonProps as AriaButtonProps } from "react-aria-components";

export interface XButtonProps extends AriaButtonProps {
  screenReaderLabel?: string;
}

export const XButton = ({
  screenReaderLabel,
  className,
  ...props
}: XButtonProps) => (
  <AriaButton
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      xButtonStyles({ ...renderProps, className }),
    )}
  >
    <X className="size-4" />

    <span className="sr-only">{screenReaderLabel}</span>
  </AriaButton>
);
