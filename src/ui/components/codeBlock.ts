import { h } from "../dom";

export function codeBlock(code: string): HTMLPreElement {
  return h("pre", { class: "code" }, h("code", {}, code));
}
