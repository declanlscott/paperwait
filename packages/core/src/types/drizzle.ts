import type { timestamps } from "../orm/columns";

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;
