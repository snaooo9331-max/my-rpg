export type Tile = "grass" | "tree" | "water" | "path";

const TILE_CHARS: Record<string, Tile> = {
  G: "grass",
  T: "tree",
  W: "water",
  P: "path",
};

const MAP_DATA = [
  "TTTTTTTTTT",
  "TGGGGGGGGT",
  "TGPPPPPGGT",
  "TGPGGGPGGT",
  "TGPGWWPGGT",
  "TGPGWWPGTT",
  "TGPPPPPGGT",
  "TTTTTTTTTT",
];

export const MAP_WIDTH = MAP_DATA[0].length;
export const MAP_HEIGHT = MAP_DATA.length;

export function getTile(x: number, y: number): Tile {
  const char = MAP_DATA[y]?.[x];
  if (char === undefined) {
    return "tree";
  }
  return TILE_CHARS[char] ?? "path";
}

export function isWalkable(x: number, y: number): boolean {
  const tile = getTile(x, y);
  return tile === "grass" || tile === "path";
}