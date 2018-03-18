declare const Opal: {
  nil: object;
};

export function isNil(value: any): boolean {
  return value === Opal.nil;
}
