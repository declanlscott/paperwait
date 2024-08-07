import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from "react-aria-components";

import { XButton } from "~/app/components/ui/primitives/x-button";
import { dialogStyles } from "~/styles/components/primitives/dialog";

import type { ComponentProps, HTMLAttributes } from "react";
import type {
  DialogProps as AriaDialogProps,
  HeadingProps as AriaHeadingProps,
  ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components";
import type { DialogStyles } from "~/styles/components/primitives/dialog";

export const DialogTrigger = AriaDialogTrigger;

export const Dialog = AriaDialog;

export type DialogOverlayProps = AriaModalOverlayProps;
export const DialogOverlay = ({
  className,
  isDismissable = true,
  ...props
}: DialogOverlayProps) => (
  <AriaModalOverlay
    isDismissable={isDismissable}
    className={composeRenderProps(className, (className, renderProps) =>
      dialogStyles().overlay({ ...renderProps, className }),
    )}
    {...props}
  />
);

export interface DialogContentProps
  extends Omit<ComponentProps<typeof AriaModal>, "children">,
    DialogStyles {
  children?: AriaDialogProps["children"];
  role?: AriaDialogProps["role"];
  closeButton?: boolean;
}
export const DialogContent = ({
  className,
  children,
  side,
  role,
  closeButton = true,
  position,
  ...props
}: DialogContentProps) => (
  <AriaModal
    className={composeRenderProps(className, (className, renderProps) =>
      side
        ? dialogStyles().sheet({ ...renderProps, side, className })
        : dialogStyles().content({ ...renderProps, position, className }),
    )}
    {...props}
  >
    <Dialog role={role} className={dialogStyles().root({ side })}>
      {(values) => (
        <>
          {typeof children === "function" ? children(values) : children}

          {closeButton && (
            <XButton
              onPress={values.close}
              screenReaderLabel="Close"
              className="absolute right-4 top-4"
            />
          )}
        </>
      )}
    </Dialog>
  </AriaModal>
);

export type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;
export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={dialogStyles().header({ className })} {...props} />
);

export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;
export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div className={dialogStyles().footer({ className })} {...props} />
);

export type DialogTitleProps = AriaHeadingProps;
export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <AriaHeading
    slot="title"
    className={dialogStyles().title({ className })}
    {...props}
  />
);
