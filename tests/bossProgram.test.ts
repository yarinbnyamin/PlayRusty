import { describe, expect, it } from "vitest";
import { buildBossProgram, countTests } from "../src/playground/bossProgram";

describe("buildBossProgram", () => {
  it("appends the tests inside an indented boss_tests module", () => {
    const program = buildBossProgram("fn one() -> i32 { 1 }\n", "#[test]\nfn works() {\n    assert_eq!(one(), 1);\n}");
    expect(program).toBe(
      "fn one() -> i32 { 1 }\n\n#[cfg(test)]\nmod boss_tests {\n    use super::*;\n\n" +
        "    #[test]\n    fn works() {\n        assert_eq!(one(), 1);\n    }\n}\n",
    );
  });

  it("keeps blank lines between tests unindented", () => {
    expect(buildBossProgram("", "#[test]\nfn a() {}\n\n#[test]\nfn b() {}")).toContain("fn a() {}\n\n    #[test]");
  });
});

describe("countTests", () => {
  it("counts #[test] attributes", () => {
    expect(countTests("#[test]\nfn a() {}\n#[test]\nfn b() {}")).toBe(2);
    expect(countTests("fn helper() {}")).toBe(0);
  });
});
