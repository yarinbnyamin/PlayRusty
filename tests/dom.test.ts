import { describe, expect, it, vi } from "vitest";
import { h } from "../src/ui/dom";

describe("h", () => {
  it("builds elements with attributes, classes and children", () => {
    const el = h("a", { class: "btn", href: "#/map", hidden: false, disabled: true }, "Go", null, h("span", {}, "!"));
    expect(el.className).toBe("btn");
    expect(el.getAttribute("href")).toBe("#/map");
    expect(el.hasAttribute("hidden")).toBe(false);
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.textContent).toBe("Go!");
  });

  it("wires on* attributes as event listeners", () => {
    const onClick = vi.fn();
    h("button", { onclick: onClick }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("treats string children as text, not HTML", () => {
    expect(h("p", {}, "<b>bold</b>").querySelector("b")).toBeNull();
  });
});
