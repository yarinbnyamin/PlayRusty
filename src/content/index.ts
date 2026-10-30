import type { ComingSoonIsland, Island } from "../engine/types";
import { variablesIsland } from "./islands/01-variables";

export const islands: Island[] = [variablesIsland];

/** The whole journey, one island per rustlings topic. Playable islands are filtered out below. */
const ROADMAP: ComingSoonIsland[] = [
  { number: 1, name: "Mutable Marsh", topic: "Variables" },
  { number: 2, name: "Function Fjord", topic: "Functions" },
  { number: 3, name: "Branching Bay", topic: "If" },
  { number: 4, name: "Primitive Peaks", topic: "Primitive types" },
  { number: 5, name: "Vector Volcano", topic: "Vectors" },
  { number: 6, name: "Ownership Outpost", topic: "Move semantics" },
  { number: 7, name: "Struct Strand", topic: "Structs" },
  { number: 8, name: "Enum Atoll", topic: "Enums" },
  { number: 9, name: "String Shoals", topic: "Strings" },
  { number: 10, name: "Module Mesa", topic: "Modules" },
  { number: 11, name: "HashMap Highlands", topic: "Hash maps" },
  { number: 12, name: "Option Oasis", topic: "Options" },
  { number: 13, name: "Error Estuary", topic: "Error handling" },
  { number: 14, name: "Generic Glacier", topic: "Generics" },
  { number: 15, name: "Trait Tundra", topic: "Traits" },
  { number: 16, name: "Lifetime Lagoon", topic: "Lifetimes" },
  { number: 17, name: "Test Tower", topic: "Tests" },
  { number: 18, name: "Iterator Isles", topic: "Iterators" },
  { number: 19, name: "Pointer Peninsula", topic: "Smart pointers" },
  { number: 20, name: "Thread Thicket", topic: "Threads" },
  { number: 21, name: "Macro Mountains", topic: "Macros" },
  { number: 22, name: "Clippy Cliffs", topic: "Clippy" },
  { number: 23, name: "Conversion Cove", topic: "Conversions" },
];

export const comingSoon: ComingSoonIsland[] = ROADMAP.filter(
  (entry) => !islands.some((island) => island.number === entry.number),
);
