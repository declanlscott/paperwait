import {
  Header as AriaHeader,
  Keyboard as AriaKeyboard,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Section as AriaSection,
  Separator as AriaSeparator,
  SubmenuTrigger as AriaSubmenuTrigger,
  composeRenderProps,
} from "react-aria-components";
import { Check, Circle } from "lucide-react";

import {
  menuCheckboxItemStyles,
  menuHeaderStyles,
  menuItemStyles,
  menuKeyboardStyles,
  menuPopoverStyles,
  menuRadioItemStyles,
  menuSeparatorStyles,
  menuStyles,
} from "~/styles/components/primitives/menu";

import type { ComponentProps, HTMLAttributes } from "react";
import type {
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";

export const MenuTrigger = AriaMenuTrigger;

export const SubmenuTrigger = AriaSubmenuTrigger;

export const MenuSection = AriaSection;

export type MenuPopoverProps = AriaPopoverProps;
export const MenuPopover = ({
  className,
  offset = 4,
  ...props
}: MenuPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(className, (className, renderProps) =>
      menuPopoverStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);

export type MenuProps<T> = AriaMenuProps<T>;
export const Menu = <T extends object>({
  className,
  ...props
}: MenuProps<T>) => (
  <AriaMenu className={menuStyles({ className })} {...props} />
);

export interface MenuItemProps extends AriaMenuItemProps {
  isInset?: boolean;
}
export const MenuItem = ({ className, isInset, ...props }: MenuItemProps) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuItemStyles({ ...renderProps, isInset, className }),
    )}
    {...props}
  />
);

export interface MenuHeaderProps extends ComponentProps<typeof AriaHeader> {
  isInset?: boolean;
  isSeparator?: boolean;
}
export const MenuHeader = ({
  className,
  isInset,
  isSeparator = false,
  ...props
}: MenuHeaderProps) => (
  <AriaHeader
    className={menuHeaderStyles({ isInset, isSeparator, className })}
    {...props}
  />
);

export type MenuSeparatorProps = AriaSeparatorProps;
export const MenuSeparator = ({ className, ...props }: MenuSeparatorProps) => (
  <AriaSeparator className={menuSeparatorStyles({ className })} {...props} />
);

export type MenuKeyboardProps = HTMLAttributes<HTMLSpanElement>;
export const MenuKeyboard = ({ className, ...props }: MenuKeyboardProps) => (
  <AriaKeyboard className={menuKeyboardStyles({ className })} {...props} />
);

export type MenuCheckboxItemProps = AriaMenuItemProps;
export const MenuCheckboxItem = ({
  className,
  children,
  ...props
}: MenuCheckboxItemProps) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuCheckboxItemStyles({ ...renderProps, className }),
    )}
    {...props}
  >
    {(values) => (
      <>
        <span className="absolute left-2 flex size-4 items-center justify-center">
          {values.isSelected && <Check className="size-4" />}
        </span>

        {typeof children === "function" ? children(values) : children}
      </>
    )}
  </AriaMenuItem>
);

export type MenuRadioItemProps = AriaMenuItemProps;
export const MenuRadioItem = ({
  className,
  children,
  ...props
}: MenuRadioItemProps) => (
  <AriaMenuItem
    className={composeRenderProps(className, (className, renderProps) =>
      menuRadioItemStyles({ ...renderProps, className }),
    )}
    {...props}
  >
    {(values) => (
      <>
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          {values.isSelected && <Circle className="size-2 fill-current" />}
        </span>
        {typeof children === "function" ? children(values) : children}
      </>
    )}
  </AriaMenuItem>
);
