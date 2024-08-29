export type PrefixedRecord<
  TPrefix extends string,
  TDelimiter extends string,
  TKey extends string,
> = {
  [Key in TKey]: `${TPrefix}${TDelimiter}${Key}`;
};

export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;
