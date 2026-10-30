export type Route =
  | { name: "title" }
  | { name: "map" }
  | { name: "settings" }
  | { name: "island"; islandId: string }
  | { name: "stage"; islandId: string; stageId: string }
  | { name: "boss"; islandId: string }
  | { name: "celebrate"; islandId: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [name = "", a = "", b = ""] = parts;
  switch (name) {
    case "map":
      return { name: "map" };
    case "settings":
      return { name: "settings" };
    case "island":
      if (a) return { name: "island", islandId: a };
      break;
    case "stage":
      if (a && b) return { name: "stage", islandId: a, stageId: b };
      break;
    case "boss":
      if (a) return { name: "boss", islandId: a };
      break;
    case "celebrate":
      if (a) return { name: "celebrate", islandId: a };
      break;
  }
  return { name: "title" };
}

export function routeToHash(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.name) {
    case "title":
      return "#/";
    case "map":
      return "#/map";
    case "settings":
      return "#/settings";
    case "island":
      return `#/island/${enc(route.islandId)}`;
    case "stage":
      return `#/stage/${enc(route.islandId)}/${enc(route.stageId)}`;
    case "boss":
      return `#/boss/${enc(route.islandId)}`;
    case "celebrate":
      return `#/celebrate/${enc(route.islandId)}`;
  }
}

/** Calls `handler` now and on every hash change. */
export function onRouteChange(handler: (route: Route) => void): void {
  const fire = () => handler(parseRoute(window.location.hash));
  window.addEventListener("hashchange", fire);
  fire();
}
