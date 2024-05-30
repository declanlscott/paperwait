export type PrefixedRecord<TPrefix extends string, TKey extends string> = {
  [Key in TKey]: `${TPrefix}${Key}`;
};
