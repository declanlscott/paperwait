import {
  Collection as AriaCollection,
  Header as AriaHeader,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Section as AriaSection,
  composeRenderProps,
} from "react-aria-components";
import { Check } from "lucide-react";

import {
  listBoxHeaderStyles,
  listBoxItemStyles,
  listBoxStyles,
} from "~/styles/components/primitives/list-box";

import type { ComponentProps } from "react";
import type {
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
} from "react-aria-components";

export const ListBoxSection = AriaSection;

export const ListBoxCollection = AriaCollection;

export type ListBoxProps<T extends object> = AriaListBoxProps<T>;
export const ListBox = <T extends object>({
  className,
  ...props
}: ListBoxProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      listBoxStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ListBoxItemProps<T extends object> = AriaListBoxItemProps<T>;
export const ListBoxItem = <T extends object>({
  className,
  children,
  ...props
}: ListBoxItemProps<T>) => (
  <AriaListBoxItem
    textValue={
      props.textValue ?? (typeof children === "string" ? children : undefined)
    }
    className={composeRenderProps(className, (className, renderProps) =>
      listBoxItemStyles({ className, ...renderProps }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, renderProps) => (
      <>
        {renderProps.isSelected && (
          <span className="absolute left-2 flex size-4 items-center justify-center">
            <Check className="size-4" />
          </span>
        )}
        {children}
      </>
    ))}
  </AriaListBoxItem>
);

export type ListBoxHeaderProps = ComponentProps<typeof AriaHeader>;
export const ListBoxHeader = ({ className, ...props }: ListBoxHeaderProps) => (
  <AriaHeader className={listBoxHeaderStyles({ className })} {...props} />
);
