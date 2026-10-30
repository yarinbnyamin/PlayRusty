import type { Stars } from "../../engine/types";

export function starsLabel(stars: Stars | undefined): string {
  return stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";
}
