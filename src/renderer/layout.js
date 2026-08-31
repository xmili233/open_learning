/**
 * Convert a semantic layout hint into a stable renderer-owned position.
 * The Agent never sends coordinates.
 */
export function positionFor(index, layout) {
  const horizontal = layout.direction !== "top_to_bottom";
  if (layout.intent === "compare") {
    return {
      x: 90 + (index % 2) * 390,
      y: 80 + Math.floor(index / 2) * 180,
    };
  }
  if (horizontal) {
    return {
      x: 80 + (index % 4) * 285,
      y: 80 + Math.floor(index / 4) * 180,
    };
  }
  return {
    x: 80 + (index % 3) * 300,
    y: 70 + Math.floor(index / 3) * 180,
  };
}
