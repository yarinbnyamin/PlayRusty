import "./styles/main.css";
import { comingSoon, islands } from "./content/index";
import { createSaveStore, getBrowserStorage } from "./engine/save";
import { onRouteChange, type Route } from "./router";
import { createAppContext, type Cleanup } from "./ui/app";
import { renderBoss } from "./ui/screens/boss";
import { renderCelebrate } from "./ui/screens/celebrate";
import { renderIsland } from "./ui/screens/island";
import { renderMap } from "./ui/screens/map";
import { renderSettings } from "./ui/screens/settings";
import { renderStage } from "./ui/screens/stage";
import { renderTitle } from "./ui/screens/title";

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Missing #app element");
const root: HTMLElement = rootElement;

const ctx = createAppContext(createSaveStore(getBrowserStorage()), islands, comingSoon);
let cleanup: Cleanup | null = null;

function show(route: Route): void {
  cleanup?.();
  cleanup = null;
  root.replaceChildren();
  window.scrollTo(0, 0);

  if (ctx.getSave().mode === null && route.name !== "title" && route.name !== "settings") {
    ctx.go({ name: "title" });
    return;
  }

  switch (route.name) {
    case "title":
      cleanup = renderTitle(root, ctx);
      break;
    case "settings":
      cleanup = renderSettings(root, ctx);
      break;
    case "map":
      cleanup = renderMap(root, ctx);
      break;
    case "island":
      cleanup = renderIsland(root, ctx, route.islandId);
      break;
    case "stage":
      cleanup = renderStage(root, ctx, route.islandId, route.stageId);
      break;
    case "boss":
      cleanup = renderBoss(root, ctx, route.islandId);
      break;
    case "celebrate":
      cleanup = renderCelebrate(root, ctx, route.islandId);
      break;
  }
}

onRouteChange(show);
