import type { timestamps } from "../drizzle/columns";

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;
