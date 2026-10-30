import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { islands } from "../src/content/index";
import { collectChecks, crateName, type RustCheck } from "./rust-checks";

const root = mkdtempSync(join(tmpdir(), "playrusty-verify-"));
const env = { ...process.env, CARGO_TARGET_DIR: join(root, "target") };

function runCheck(check: RustCheck): { passed: boolean; output: string } {
  const name = crateName(check.name);
  const dir = join(root, name);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "Cargo.toml"), `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2024"\n`);
  writeFileSync(join(dir, "src", "main.rs"), check.code);
  const result = spawnSync("cargo", [check.kind, "--quiet"], { cwd: dir, env, encoding: "utf8" });
  if (result.error) throw new Error(`Could not run cargo: ${result.error.message}`);
  return { passed: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

const checks = collectChecks(islands);
let failures = 0;
try {
  for (const check of checks) {
    const { passed, output } = runCheck(check);
    const asExpected = passed === (check.expect === "pass");
    console.log(`${asExpected ? "ok  " : "FAIL"} ${check.name} (should ${check.expect})`);
    if (!asExpected) {
      failures += 1;
      console.log(output);
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log(`\n${checks.length - failures}/${checks.length} Rust checks behaved as expected.`);
process.exit(failures === 0 ? 0 : 1);
