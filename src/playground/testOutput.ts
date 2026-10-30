export interface TestReport {
  compiled: boolean;
  passed: string[];
  failed: string[];
}

const TEST_LINE = /^test boss_tests::(\S+) \.\.\. (ok|FAILED)$/gm;

export function parseTestOutput(stdout: string, stderr: string): TestReport {
  const passed: string[] = [];
  const failed: string[] = [];
  for (const match of stdout.matchAll(TEST_LINE)) {
    (match[2] === "ok" ? passed : failed).push(match[1]);
  }
  const ranTests = passed.length + failed.length > 0;
  const compileFailed = /could not compile|error\[E\d+\]/.test(stderr);
  return { compiled: ranTests || !compileFailed, passed, failed };
}
