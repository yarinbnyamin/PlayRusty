export interface Point {
  x: number;
  y: number;
}

export const MAP_COLUMNS = 6;
const MARGIN = 110;
const COLUMN_GAP = 196;
const ROW_GAP = 190;

/** Position of the index-th island on a snaking path (even rows run left→right, odd rows right→left). */
export function mapSlot(index: number, cols = MAP_COLUMNS): Point {
  const row = Math.floor(index / cols);
  const position = index % cols;
  const column = row % 2 === 0 ? position : cols - 1 - position;
  return { x: MARGIN + column * COLUMN_GAP, y: MARGIN + row * ROW_GAP };
}

export function mapSize(count: number, cols = MAP_COLUMNS): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / cols));
  return { width: 2 * MARGIN + (cols - 1) * COLUMN_GAP, height: 2 * MARGIN + (rows - 1) * ROW_GAP };
}
