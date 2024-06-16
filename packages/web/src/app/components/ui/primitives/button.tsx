import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";

import { buttonStyles } from "~/shared/styles/components/button";

import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import type { ButtonStyles } from "~/shared/styles/components/button";

export interface ButtonProps extends AriaButtonProps, ButtonStyles {}

export function Button(props: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        buttonStyles({
          ...renderProps,
          variant: props.variant,
          size: props.size,
          className,
        }),
      )}
    />
  );
}
