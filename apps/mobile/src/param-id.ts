/** Expo may give string | string[]; features always want a single id. */
export const paramId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};
