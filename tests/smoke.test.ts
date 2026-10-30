import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs in a DOM environment", () => {
    const div = document.createElement("div");
    div.textContent = "ahoy";
    expect(div.textContent).toBe("ahoy");
  });
});
