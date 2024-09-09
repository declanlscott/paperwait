export type PrefixedRecord<
  TPrefix extends string,
  TDelimiter extends string,
  TKey extends string,
> = {
  [K in TKey]: `${TPrefix}${TDelimiter}${K}`;
};

export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;
