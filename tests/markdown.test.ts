import { describe, expect, it } from "vitest";
import { prose, renderMarkdown } from "../src/ui/markdown";

function render(text: string): HTMLDivElement {
  const div = document.createElement("div");
  div.append(renderMarkdown(text));
  return div;
}

describe("renderMarkdown", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    const div = render("First line\ncontinues.\n\nSecond.");
    expect([...div.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["First line continues.", "Second."]);
  });

  it("renders inline code, bold and links", () => {
    const div = render("Use `let mut` for **mutable** values. See [the Book](https://doc.rust-lang.org/book/).");
    expect(div.querySelector("code")?.textContent).toBe("let mut");
    expect(div.querySelector("strong")?.textContent).toBe("mutable");
    const link = div.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://doc.rust-lang.org/book/");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(div.textContent).toBe("Use let mut for mutable values. See the Book.");
  });

  it("never interprets HTML", () => {
    const div = render("<img src=x onerror=alert(1)> `<b>`");
    expect(div.querySelector("img")).toBeNull();
    expect(div.querySelector("b")).toBeNull();
  });

  it("leaves non-http links as plain text", () => {
    const div = render("[click](javascript:alert(1))");
    expect(div.querySelector("a")).toBeNull();
  });
});

describe("prose", () => {
  it("wraps rendered markdown in a .prose div", () => {
    const el = prose("Hello **there**");
    expect(el.className).toBe("prose");
    expect(el.querySelector("strong")?.textContent).toBe("there");
  });
});
