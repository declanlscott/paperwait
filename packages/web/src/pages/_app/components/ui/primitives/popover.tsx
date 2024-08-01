import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
  composeRenderProps,
} from "react-aria-components";

import {
  popoverDialogStyles,
  popoverStyles,
} from "~/styles/components/primitives/popover";

import type {
  DialogProps as AriaDialogProps,
  PopoverProps as AriaPopoverProps,
} from "react-aria-components";

export const PopoverTrigger = AriaDialogTrigger;

export type PopoverProps = AriaPopoverProps;
export const Popover = ({ className, offset = 4, ...props }: PopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(className, (className, renderProps) =>
      popoverStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type PopoverDialogProps = AriaDialogProps;
export const PopoverDialog = ({ className, ...props }: PopoverDialogProps) => (
  <AriaDialog className={popoverDialogStyles({ className })} {...props} />
);
