import { runCode } from "../../playground/client";
import { h } from "../dom";
import { createCodeEditor } from "./codeEditor";
import { createConsole } from "./console";

/** An editable copy of a tutorial example that runs on the Rust Playground. */
export function createRunner(parent: HTMLElement, code: string): { destroy(): void } {
  const editorHost = h("div", { class: "editor" });
  const consoleHost = h("div");
  const runButton = h("button", { class: "btn primary" }, "▶ Run");
  const wrap = h("div", { class: "runner" }, editorHost, runButton, consoleHost);
  parent.append(wrap);
  const editor = createCodeEditor(editorHost, code);
  const output = createConsole(consoleHost);

  async function run(): Promise<void> {
    runButton.disabled = true;
    output.showRunning();
    const result = await runCode(editor.getCode(), { tests: false });
    runButton.disabled = false;
    if (!result.ok) output.showError(result.message, () => void run());
    else output.showOutput(result.stdout, result.stderr);
  }
  runButton.addEventListener("click", () => void run());

  return {
    destroy() {
      editor.destroy();
      wrap.remove();
    },
  };
}
