import { tv } from "tailwind-variants";

export const cardStyles = tv({
  slots: {
    base: "bg-card text-card-foreground rounded-lg border shadow-sm",
    header: "flex flex-col space-y-1.5 p-6",
    title: "text-2xl font-semibold leading-none tracking-tight",
    description: "text-muted-foreground text-sm",
    content: "p-6 pt-0",
    footer: "flex items-center p-6 pt-0",
  },
});
