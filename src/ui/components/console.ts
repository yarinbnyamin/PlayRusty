import { h } from "../dom";

const NOISE = /^\s*(Compiling|Finished|Running) |^error: test failed, to rerun/;

/** Drops cargo's progress lines so players only see compiler messages. */
export function cleanCargoNoise(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => !NOISE.test(line))
    .join("\n")
    .trim();
}

/** Turns codes like E0384 into links to the official error index. */
export function linkErrorCodes(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(/\bE\d{4}\b/g)) {
    const index = match.index ?? 0;
    fragment.append(text.slice(last, index));
    fragment.append(
      h("a", { href: `https://doc.rust-lang.org/error_codes/${match[0]}.html`, target: "_blank", rel: "noopener" }, match[0]),
    );
    last = index + match[0].length;
  }
  fragment.append(text.slice(last));
  return fragment;
}

export type MessageKind = "info" | "success" | "error";

export interface GameConsole {
  showRunning(): void;
  showOutput(stdout: string, stderr: string, heading?: { text: string; kind: MessageKind }): void;
  showError(message: string, onRetry: () => void): void;
}

export function createConsole(parent: HTMLElement): GameConsole {
  const el = h("div", { class: "console", role: "log", "aria-live": "polite" });
  parent.append(el);
  const message = (text: string, kind: MessageKind) => h("p", { class: `console-msg ${kind}` }, text);
  return {
    showRunning() {
      el.replaceChildren(message("Compiling on the Rust Playground…", "info"));
    },
    showOutput(stdout, stderr, heading) {
      el.replaceChildren();
      if (heading) el.append(message(heading.text, heading.kind));
      const errors = cleanCargoNoise(stderr);
      if (stdout.trim()) el.append(h("pre", { class: "out" }, stdout.trimEnd()));
      if (errors) {
        const pre = h("pre", { class: "err" });
        pre.append(linkErrorCodes(errors));
        el.append(pre);
      }
      if (!stdout.trim() && !errors && !heading) el.append(message("(no output)", "info"));
    },
    showError(text, onRetry) {
      el.replaceChildren(message(text, "error"), h("button", { class: "btn", onclick: onRetry }, "Retry"));
    },
  };
}
