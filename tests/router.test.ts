import { describe, expect, it } from "vitest";
import { parseRoute, routeToHash, type Route } from "../src/router";

describe("router", () => {
  it("parses every route", () => {
    expect(parseRoute("")).toEqual({ name: "title" });
    expect(parseRoute("#/")).toEqual({ name: "title" });
    expect(parseRoute("#/map")).toEqual({ name: "map" });
    expect(parseRoute("#/settings")).toEqual({ name: "settings" });
    expect(parseRoute("#/island/variables")).toEqual({ name: "island", islandId: "variables" });
    expect(parseRoute("#/stage/variables/let-and-mut")).toEqual({ name: "stage", islandId: "variables", stageId: "let-and-mut" });
    expect(parseRoute("#/boss/variables")).toEqual({ name: "boss", islandId: "variables" });
    expect(parseRoute("#/celebrate/variables")).toEqual({ name: "celebrate", islandId: "variables" });
  });

  it("falls back to the title screen for unknown or incomplete routes", () => {
    expect(parseRoute("#/nowhere")).toEqual({ name: "title" });
    expect(parseRoute("#/stage/variables")).toEqual({ name: "title" });
  });

  it("falls back to the title screen on malformed percent-escapes", () => {
    expect(parseRoute("#/island/100%")).toEqual({ name: "title" });
    expect(parseRoute("#/stage/%E0%A4%A/x")).toEqual({ name: "title" });
  });

  it("round-trips routes through hashes", () => {
    const routes: Route[] = [
      { name: "title" }, { name: "map" }, { name: "settings" },
      { name: "island", islandId: "if" }, { name: "stage", islandId: "if", stageId: "else if" },
      { name: "boss", islandId: "if" }, { name: "celebrate", islandId: "if" },
    ];
    for (const route of routes) expect(parseRoute(routeToHash(route))).toEqual(route);
  });
});
