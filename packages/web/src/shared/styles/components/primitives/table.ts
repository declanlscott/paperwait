import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const tableStyles = tv({
  base: "w-full caption-bottom text-sm",
});
export type TableStyles = VariantProps<typeof tableStyles>;

export const tableHeaderStyles = tv({
  base: "[&_tr]:border-b",
});
export type TableHeaderStyles = VariantProps<typeof tableHeaderStyles>;

export const tableBodyStyles = tv({
  base: "[&_tr:last-child]:border-0",
});
export type TableBodyStyles = VariantProps<typeof tableBodyStyles>;

export const tableFooterStyles = tv({
  base: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
});
export type TableFooterStyles = VariantProps<typeof tableFooterStyles>;

export const tableRowStyles = tv({
  base: "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
});
export type TableRowStyles = VariantProps<typeof tableRowStyles>;

export const tableHeadStyles = tv({
  base: "text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
});
export type TableHeadStyles = VariantProps<typeof tableHeadStyles>;

export const tableCellStyles = tv({
  base: "p-4 align-middle [&:has([role=checkbox])]:pr-0",
});
export type TableCellStyles = VariantProps<typeof tableCellStyles>;

export const tableCaptionStyles = tv({
  base: "text-muted-foreground mt-4 text-sm",
});
export type TableCaptionStyles = VariantProps<typeof tableCaptionStyles>;
