import { Button as AriaButton } from "react-aria-components";

import { buttonStyles } from "~/shared/styles/components/button";
import { composeTwRenderProps } from "~/shared/styles/utils";

import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import type { ButtonStyles } from "~/shared/styles/components/button";

export interface ButtonProps extends AriaButtonProps, ButtonStyles {}

export function Button(props: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeTwRenderProps(
        props.className,
        buttonStyles({ variant: props.variant, size: props.size }),
      )}
    />
  );
}
