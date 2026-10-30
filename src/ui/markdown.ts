import { h } from "./dom";

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Renders the content Markdown subset: paragraphs, `code`, **bold**, [links](https://…). */
export function renderMarkdown(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const paragraph of text.trim().split(/\n\s*\n/)) {
    const p = document.createElement("p");
    appendInline(p, paragraph.replace(/\s*\n\s*/g, " "));
    fragment.append(p);
  }
  return fragment;
}

function appendInline(parent: HTMLElement, text: string): void {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parent.append(text.slice(last, index));
    if (match[1]) parent.append(h("code", {}, match[1].slice(1, -1)));
    else if (match[2]) parent.append(h("strong", {}, match[2].slice(2, -2)));
    else parent.append(h("a", { href: match[4], target: "_blank", rel: "noopener" }, match[3]));
    last = index + match[0].length;
  }
  if (last < text.length) parent.append(text.slice(last));
}

export function prose(text: string): HTMLDivElement {
  const div = h("div", { class: "prose" });
  div.append(renderMarkdown(text));
  return div;
}
