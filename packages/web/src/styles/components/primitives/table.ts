import { tv } from "tailwind-variants";

export const tableStyles = tv({
  slots: {
    root: "w-full caption-bottom text-sm",
    header: "[&_tr]:border-b",
    body: "[&_tr:last-child]:border-0",
    footer: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
    row: "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
    head: "text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
    cell: "p-4 align-middle [&:has([role=checkbox])]:pr-0",
    caption: "text-muted-foreground mt-4 text-sm",
  },
});
