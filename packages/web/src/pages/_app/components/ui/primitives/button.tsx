import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { Loader2 } from "lucide-react";

import { buttonStyles } from "~/shared/styles/components/primitives/button";

import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import type { ButtonStyles } from "~/shared/styles/components/primitives/button";

export interface ButtonProps extends AriaButtonProps, ButtonStyles {
  isLoading?: boolean;
}

export function Button({
  children,
  isDisabled,
  isLoading,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      isDisabled={isLoading ?? isDisabled}
      className={composeRenderProps(props.className, (className, renderProps) =>
        buttonStyles({
          ...renderProps,
          variant: props.variant,
          size: props.size,
          className,
        }),
      )}
    >
      {(values) => (
        <>
          {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}

          {typeof children === "function" ? children(values) : children}
        </>
      )}
    </AriaButton>
  );
}
