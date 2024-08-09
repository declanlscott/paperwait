import { tv } from "tailwind-variants";

export const numberFieldStyles = tv({
  slots: {
    root: "bg-background placeholder:text-muted-foreground w-fit min-w-0 flex-1 border-r border-transparent pr-2 outline outline-0 [&::-webkit-search-cancel-button]:hidden",
    steppers: "absolute right-0 flex h-full flex-col border-l",
    stepper: "text-muted-foreground w-auto grow rounded-none px-0.5",
  },
});
