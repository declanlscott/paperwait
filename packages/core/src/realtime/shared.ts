export const formatChannel = <TPrefix extends string, TId extends string>(
  prefix: TPrefix,
  id: TId,
) => `${prefix}_${id}` as const;

export type Channel = ReturnType<typeof formatChannel>;
