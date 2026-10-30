import { describe, expect, it } from "vitest";
import { parseTestOutput } from "../src/playground/testOutput";

const ALL_PASS_STDOUT =
  "\nrunning 2 tests\ntest boss_tests::adds ... ok\ntest boss_tests::adds_neg ... ok\n\n" +
  "test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n";

const ONE_FAIL_STDOUT =
  "\nrunning 2 tests\ntest boss_tests::adds ... ok\ntest boss_tests::adds_neg ... FAILED\n\nfailures:\n\n" +
  "---- boss_tests::adds_neg stdout ----\n\nthread 'boss_tests::adds_neg' (43) panicked at src/main.rs:10:21:\n" +
  "assertion `left == right` failed\n  left: -5\n right: 1\n\n\nfailures:\n    boss_tests::adds_neg\n\n" +
  "test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n";

const COMPILE_ERROR_STDERR =
  "   Compiling playground v0.0.1 (/playground)\nerror[E0425]: cannot find value `c` in this scope\n" +
  " --> src/main.rs:1:37\n\nFor more information about this error, try `rustc --explain E0425`.\n" +
  'error: could not compile `playground` (bin "playground" test) due to 1 previous error\n';

describe("parseTestOutput", () => {
  it("reports all tests passing", () => {
    expect(parseTestOutput(ALL_PASS_STDOUT, "")).toEqual({ compiled: true, passed: ["adds", "adds_neg"], failed: [] });
  });

  it("reports failing tests", () => {
    expect(parseTestOutput(ONE_FAIL_STDOUT, "error: test failed, to rerun pass `--bin playground`\n")).toEqual({
      compiled: true,
      passed: ["adds"],
      failed: ["adds_neg"],
    });
  });

  it("reports a compile error", () => {
    expect(parseTestOutput("", COMPILE_ERROR_STDERR)).toEqual({ compiled: false, passed: [], failed: [] });
  });

  it("ignores tests outside boss_tests", () => {
    const stdout = "test my_own_test ... ok\ntest boss_tests::real ... ok\n";
    expect(parseTestOutput(stdout, "").passed).toEqual(["real"]);
  });
});
