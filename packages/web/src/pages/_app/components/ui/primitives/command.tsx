import { forwardRef } from "react";
import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { Command as CommandPrimitive } from "cmdk";
import { ArrowLeft, Search } from "lucide-react";

import { Dialog, DialogContent } from "~/app/components/ui/primitives/dialog";
import {
  commandBackButtonStyles,
  commandStyles,
} from "~/styles/components/primitives/command";

import type {
  ComponentPropsWithoutRef,
  ElementRef,
  HTMLAttributes,
} from "react";
import type {
  ButtonProps as AriaButtonProps,
  DialogProps as AriaDialogProps,
} from "react-aria-components";

export const Command = forwardRef<
  ElementRef<typeof CommandPrimitive>,
  ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={commandStyles().root({ className })}
    {...props}
  />
));

export interface CommandDialogProps extends AriaDialogProps {
  commandProps?: ComponentPropsWithoutRef<typeof CommandPrimitive>;
}
export const CommandDialog = ({
  children,
  commandProps,
  ...props
}: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg" position="top">
        {(values) => (
          <Command
            {...commandProps}
            className={commandStyles().dialogContent()}
          >
            {typeof children === "function" ? children(values) : children}
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
};

export interface CommandInputProps
  extends ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
  back?: {
    buttonProps: AriaButtonProps;
  };
}
export const CommandInput = forwardRef<
  ElementRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, back, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    {back ? (
      <AriaButton
        {...back.buttonProps}
        className={composeRenderProps("", (className, renderProps) =>
          commandBackButtonStyles({ ...renderProps, className }),
        )}
      >
        <ArrowLeft className="size-4" />
      </AriaButton>
    ) : (
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
    )}

    <CommandPrimitive.Input
      ref={ref}
      className={commandStyles().input({ className })}
      {...props}
    />
  </div>
));

export const CommandList = forwardRef<
  ElementRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={commandStyles().list({ className })}
    {...props}
  />
));

export const CommandEmpty = forwardRef<
  ElementRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));

export const CommandGroup = forwardRef<
  ElementRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={commandStyles().group({ className })}
    {...props}
  />
));

export const CommandSeparator = forwardRef<
  ElementRef<typeof CommandPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={commandStyles().separator({ className })}
    {...props}
  />
));

export const CommandItem = forwardRef<
  ElementRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={commandStyles().item({ className })}
    {...props}
  />
));

export type CommandShortcutProps = HTMLAttributes<HTMLSpanElement>;
export const CommandShortcut = ({
  className,
  ...props
}: CommandShortcutProps) => {
  return (
    <span className={commandStyles().shortcut({ className })} {...props} />
  );
};
