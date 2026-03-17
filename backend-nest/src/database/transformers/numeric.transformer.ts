export const numericTransformer = {
  to(value: number | null | undefined) {
    return value;
  },
  from(value: string | null): number | null {
    return value === null ? null : Number(value);
  },
};
