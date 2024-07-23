export type PrefixedRecord<
  TPrefix extends string,
  TDelimiter extends string,
  TKey extends string,
> = {
  [Key in TKey]: `${TPrefix}${TDelimiter}${Key}`;
};
