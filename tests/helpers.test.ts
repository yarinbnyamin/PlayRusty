import { describe, expect, it } from "vitest";
import { INTEGER_TYPES, rs } from "../src/content/helpers";

describe("rs", () => {
  it("removes the common indentation and surrounding blank lines", () => {
    const code = rs`
      fn main() {
          println!("hi");
      }
    `;
    expect(code).toBe('fn main() {\n    println!("hi");\n}');
  });

  it("keeps backslash escapes as written (raw)", () => {
    expect(rs`println!("a\nb");`).toBe('println!("a\\nb");');
  });
});

describe("INTEGER_TYPES", () => {
  it("lists the signed and unsigned integer types", () => {
    expect(INTEGER_TYPES).toContain("i32");
    expect(INTEGER_TYPES).toContain("usize");
    expect(INTEGER_TYPES).toHaveLength(12);
  });
});
