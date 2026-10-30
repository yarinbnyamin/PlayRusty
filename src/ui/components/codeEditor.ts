import { indentWithTab } from "@codemirror/commands";
import { rust } from "@codemirror/lang-rust";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";

export interface CodeEditor {
  getCode(): string;
  setCode(code: string): void;
  destroy(): void;
}

const theme = EditorView.theme({
  "&": { backgroundColor: "#fdfaf3", color: "#1a1a1a", fontSize: "15px" },
  ".cm-content": { fontFamily: "var(--mono)", caretColor: "#f74c00" },
  ".cm-gutters": { backgroundColor: "#f1ebdd", color: "#8a7f6a", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#f6eedc" },
});

export function createCodeEditor(parent: HTMLElement, code: string): CodeEditor {
  const view = new EditorView({
    parent,
    doc: code,
    extensions: [basicSetup, keymap.of([indentWithTab]), rust(), theme],
  });
  return {
    getCode: () => view.state.doc.toString(),
    setCode: (next) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }),
    destroy: () => view.destroy(),
  };
}
