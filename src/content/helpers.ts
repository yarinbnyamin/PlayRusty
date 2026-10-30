/**
 * Template tag for Rust code in content files. Uses the raw string (so `\n` inside a
 * Rust string literal stays `\n`), strips the leading/trailing blank line and removes
 * the indentation shared by all non-empty lines.
 */
export function rs(strings: TemplateStringsArray, ...values: unknown[]): string {
  const lines = String.raw(strings, ...values)
    .replace(/^[ \t]*\n/, "")
    .replace(/\n[ \t]*$/, "")
    .split("\n");
  const indent = Math.min(
    ...lines.filter((line) => line.trim() !== "").map((line) => line.match(/^ */)?.[0].length ?? 0),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
}

export const INTEGER_TYPES = [
  "i8", "i16", "i32", "i64", "i128", "isize",
  "u8", "u16", "u32", "u64", "u128", "usize",
];
