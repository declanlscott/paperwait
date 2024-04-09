import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
} from "react-aria-components";
import { tv } from "tailwind-variants";

export const listBoxVariants = tv({
  base: "",
});

export function ListBox() {
  return <AriaListBox />;
}

// const CommandGroup = React.forwardRef<
//   React.ElementRef<typeof CommandPrimitive.Group>,
//   React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
// >(({ className, ...props }, ref) => (
//   <CommandPrimitive.Group
//     ref={ref}
//     className={cn(
//       "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
//       className
//     )}
//     {...props}
//   />
// ))

// CommandGroup.displayName = CommandPrimitive.Group.displayName

// const CommandItem = React.forwardRef<
//   React.ElementRef<typeof CommandPrimitive.Item>,
//   React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
// >(({ className, ...props }, ref) => (
//   <CommandPrimitive.Item
//     ref={ref}
//     className={cn(
//       "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
//       className
//     )}
//     {...props}
//   />
// ))

// CommandItem.displayName = CommandPrimitive.Item.displayName
