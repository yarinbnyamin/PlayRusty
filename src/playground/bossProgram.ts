/** Appends the hidden boss tests to the player's code, inside `mod boss_tests`. */
export function buildBossProgram(playerCode: string, tests: string): string {
  const body = tests
    .trim()
    .split("\n")
    .map((line) => (line.length > 0 ? `    ${line}` : line))
    .join("\n");
  return `${playerCode.trimEnd()}\n\n#[cfg(test)]\nmod boss_tests {\n    use super::*;\n\n${body}\n}\n`;
}

export function countTests(tests: string): number {
  return (tests.match(/#\[test\]/g) ?? []).length;
}
