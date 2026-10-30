import { describe, expect, it } from "vitest";
import { cleanCargoNoise, createConsole, linkErrorCodes } from "../src/ui/components/console";
import { createHpBar } from "../src/ui/components/hpBar";
import { starsLabel } from "../src/ui/components/stars";
import { renderTutorialPage } from "../src/ui/components/tutorialPage";

describe("console helpers", () => {
  it("removes cargo progress lines but keeps real messages", () => {
    const stderr =
      "   Compiling playground v0.0.1 (/playground)\nwarning: unused variable: `x`\n" +
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.38s\n" +
      "     Running `target/debug/playground`\nerror: test failed, to rerun pass `--bin playground`\n";
    expect(cleanCargoNoise(stderr)).toBe("warning: unused variable: `x`");
  });

  it("links rustc error codes to their explanation", () => {
    const div = document.createElement("div");
    div.append(linkErrorCodes("error[E0384]: cannot assign twice"));
    const link = div.querySelector("a");
    expect(link?.textContent).toBe("E0384");
    expect(link?.getAttribute("href")).toBe("https://doc.rust-lang.org/error_codes/E0384.html");
    expect(div.textContent).toBe("error[E0384]: cannot assign twice");
  });

  it("shows a retry button for connection errors", () => {
    const host = document.createElement("div");
    let retried = false;
    createConsole(host).showError("The compiler bridge is down.", () => (retried = true));
    host.querySelector("button")?.click();
    expect(retried).toBe(true);
  });
});

describe("hp bar", () => {
  it("shows remaining health", () => {
    const host = document.createElement("div");
    const bar = createHpBar(host, "Golem", 4);
    bar.set(1);
    expect(host.querySelector<HTMLElement>(".hp-fill")?.style.width).toBe("25%");
    expect(host.textContent).toContain("Golem: 1/4 HP");
  });
});

describe("stars", () => {
  it("renders earned and missing stars", () => {
    expect(starsLabel(2)).toBe("★★☆");
    expect(starsLabel(undefined)).toBe("");
  });
});

describe("tutorial page", () => {
  it("renders title, text, audience tag and code", () => {
    const page = renderTutorialPage({ audience: "experienced", title: "Hi", text: "Use `let`.", code: "let x = 1;" });
    expect(page.el.querySelector("h2")?.textContent).toBe("Hi");
    expect(page.el.querySelector(".tag")?.textContent).toBe("Coming from another language");
    expect(page.el.querySelector("pre.code")?.textContent).toBe("let x = 1;");
    expect(page.el.querySelector("button")).toBeNull();
  });

  it("offers a run button for runnable pages", () => {
    const page = renderTutorialPage({ audience: "all", title: "Run", text: "t", code: "fn main() {}", runnable: true });
    expect(page.el.querySelector("button")?.textContent).toContain("Run it yourself");
  });
});
