import { forwardRef } from "react";

import { tableStyles } from "~/styles/components/primitives/table";

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={tableStyles().root({ className })} {...props} />
  </div>
));

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={tableStyles().header({ className })} {...props} />
));

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={tableStyles().body({ className })} {...props} />
));

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={tableStyles().footer({ className })} {...props} />
));

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={tableStyles().row({ className })} {...props} />
));

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th ref={ref} className={tableStyles().head({ className })} {...props} />
));

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={tableStyles().cell({ className })} {...props} />
));

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={tableStyles().caption({ className })}
    {...props}
  />
));
