export const NANOID_CUSTOM_ALPHABET = "2346789abcdefghijkmnpqrtwxyz";
export const NANOID_LENGTH = 20;
export const NANOID_PATTERN = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const ORG_SLUG_PATTERN = new RegExp(/^[a-zA-Z0-9-]+$/);
