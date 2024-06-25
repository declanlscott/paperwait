import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from "react-aria-components";
import { X } from "lucide-react";

import {
  closeButtonStyles,
  dialogContentStyles,
  dialogFooterStyles,
  dialogHeaderStyles,
  dialogOverlayStyles,
  dialogStyles,
  dialogTitleStyles,
  sheetStyles,
} from "~/shared/styles/components/primitives/dialog";

import type { ComponentProps, HTMLAttributes } from "react";
import type {
  DialogProps as AriaDialogProps,
  HeadingProps as AriaHeadingProps,
  ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components";
import type { SheetStyles } from "~/shared/styles/components/primitives/dialog";

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
      dialogOverlayStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);

export interface DialogContentProps
  extends Omit<ComponentProps<typeof AriaModal>, "children">,
    SheetStyles {
  children?: AriaDialogProps["children"];
  role?: AriaDialogProps["role"];
  closeButton?: boolean;
  position?: "top" | "center";
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
        ? sheetStyles({ ...renderProps, side, className })
        : dialogContentStyles({ ...renderProps, position, className }),
    )}
    {...props}
  >
    <Dialog role={role} className={dialogStyles({ side: !!side })}>
      {(values) => (
        <>
          {typeof children === "function" ? children(values) : children}

          {closeButton && (
            <AriaButton
              onPress={values.close}
              className={composeRenderProps("", (className, renderProps) =>
                closeButtonStyles({ ...renderProps, className }),
              )}
            >
              <X className="size-4" />

              <span className="sr-only">Close</span>
            </AriaButton>
          )}
        </>
      )}
    </Dialog>
  </AriaModal>
);

export type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;
export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={dialogHeaderStyles({ className })} {...props} />
);

export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;
export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div className={dialogFooterStyles({ className })} {...props} />
);

export type DialogTitleProps = AriaHeadingProps;
export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <AriaHeading
    slot="title"
    className={dialogTitleStyles({ className })}
    {...props}
  />
);
