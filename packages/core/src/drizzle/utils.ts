import type { Timestamp, timestamps } from "./columns";

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;

export type SerializedEntity<TEntity> = Omit<TEntity, Timestamp> & {
  [TimestampKey in Timestamp]: (typeof timestamps)[TimestampKey]["_"]["notNull"] extends true
    ? string
    : string | null;
};

export function serializeEntity<TEntity extends Record<string, unknown>>(
  entity: TEntity,
) {
  return Object.entries(entity).reduce((serializedEntity, [key, value]) => {
    if (value instanceof Date)
      return { ...serializedEntity, [key]: value.toISOString() };

    if (value instanceof Object)
      return { ...serializedEntity, [key]: JSON.stringify(value) };

    return { ...serializedEntity, [key]: value };
  }, {} as SerializedEntity<TEntity>);
}
