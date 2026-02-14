/**
 * Hex vertex grid math module.
 *
 * The game board is a hex grid where playable spaces are at hex VERTICES
 * (corners) AND hex centers. Corner vertices form the original triangular
 * lattice; center vertices fill the gaps, creating a denser graph where
 * movement rays alternate corner → center → corner → center.
 *
 * Board layout: rectangular grid of flat-top hexes using offset rows.
 * Even rows at base position, odd rows shifted right by size * 3/2.
 * Size mappings: Small = 5x4 (20 hexes), Medium = 7x6 (42), Large = 9x8 (72).
 *
 * For a flat-top hex with center (cx, cy) and size S:
 *   corner i (0..5) = (cx + S*cos(60°*i), cy + S*sin(60°*i))
 *
 * Center vertices have 6 neighbors (the hex's 6 corners, hub-spoke).
 * Corner vertices have their original 3 edge neighbors PLUS up to 3
 * additional center neighbors (from the hexes they belong to).
 *
 * Directional rays now include center vertices as intermediate steps,
 * so crossing one hex costs 2 ray steps instead of ~1. Rays are built
 * by direction-aware graph traversal (not geometric stepping).
 *
 * Vertex IDs:
 * - Corner vertices: coordinate string, e.g., "40,69.282"
 * - Center vertices: prefixed with "c:", e.g., "c:0,0"
 */

const SQRT3 = Math.sqrt(3);

/**
 * Generate hex centers for a rectangular grid using offset columns (odd-q).
 * Flat-top orientation: columns advance by size * 3/2 in x,
 * rows advance by size * sqrt(3) in y. Odd columns offset down by
 * size * sqrt(3) / 2.
 *
 * @param {number} cols - Number of hex columns
 * @param {number} rows - Number of hex rows
 * @param {number} size - Hex size (center to corner distance)
 * @returns {Array<{col: number, row: number, x: number, y: number}>}
 */
function generateRectHexCenters(cols, rows, size) {
  const centers = [];
  const colSpacing = size * 3 / 2;
  const rowSpacing = size * SQRT3;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * colSpacing;
      const y = row * rowSpacing + (col % 2 === 1 ? rowSpacing / 2 : 0);
      centers.push({ col, row, x, y });
    }
  }
  return centers;
}

/**
 * Round a coordinate to a fixed precision for deduplication.
 */
function roundCoord(val) {
  return Math.round(val * 1000) / 1000;
}

/**
 * Create a string key from pixel coordinates for deduplication.
 */
function vertexKey(x, y) {
  return `${roundCoord(x)},${roundCoord(y)}`;
}

/**
 * Create a center vertex key from pixel coordinates.
 */
function centerKey(x, y) {
  return `c:${roundCoord(x)},${roundCoord(y)}`;
}

/**
 * Check if a vertex ID is a center vertex.
 */
export function isCenterVertex(id) {
  return id.startsWith('c:');
}

/**
 * The 6 movement direction vectors on the triangular lattice.
 *
 * For flat-top hexes of size S, the 6 directions at 0°, 60°, 120°, 180°,
 * 240°, 300° with step size S cover all possible edge directions.
 */
function getDirectionVectors(size) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (Math.PI / 3) * i;
    return {
      direction: i,
      dx: roundCoord(size * Math.cos(angle)),
      dy: roundCoord(size * Math.sin(angle)),
    };
  });
}

/**
 * Generate the full hex vertex grid with both corner and center vertices.
 * Board is rectangular: cols x rows hexes in offset-row layout.
 *
 * @param {number} cols - Number of hex columns
 * @param {number} rows - Number of hex rows
 * @param {number} [size=40] - Hex size (center to corner distance in px)
 * @returns {{ vertices: Map<string, object>, adjacency: Map<string, string[]>, rays: Map<string, Array<{direction: number, vertices: string[]}>>, hexCenters: Array, size: number, cols: number, rows: number }}
 */
export function generateGrid(cols, rows, size = 40) {
  const hexCenters = generateRectHexCenters(cols, rows, size);
  const vertexMap = new Map(); // key -> { id, x, y, type }
  // Maps coordinate string -> vertex ID for position-based lookups
  const coordToId = new Map();

  // Generate corner vertices from hex corners
  for (const { x: cx, y: cy } of hexCenters) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      const coordStr = vertexKey(vx, vy);
      if (!vertexMap.has(coordStr)) {
        vertexMap.set(coordStr, {
          id: coordStr,
          x: roundCoord(vx),
          y: roundCoord(vy),
          type: 'corner',
        });
        coordToId.set(coordStr, coordStr);
      }
    }
  }

  // Generate center vertices at each hex center
  for (const { x: cx, y: cy } of hexCenters) {
    const cKey = centerKey(cx, cy);
    const coordStr = vertexKey(cx, cy);
    if (!vertexMap.has(cKey)) {
      vertexMap.set(cKey, {
        id: cKey,
        x: roundCoord(cx),
        y: roundCoord(cy),
        type: 'center',
      });
      coordToId.set(coordStr, cKey);
    }
  }

  // Build adjacency map using direction vectors.
  // For each vertex, step by each direction vector and check for a vertex
  // at that position. This finds both corner-corner and corner-center neighbors.
  const dirVectors = getDirectionVectors(size);
  const adjacency = new Map();
  // Also build directional adjacency: vertex -> direction -> neighborId
  // This is used for ray construction via graph traversal.
  const dirAdj = new Map();

  for (const [key, vertex] of vertexMap) {
    const neighbors = [];
    const dirMap = new Map();
    for (const { direction, dx, dy } of dirVectors) {
      const nCoord = vertexKey(vertex.x + dx, vertex.y + dy);
      const nId = coordToId.get(nCoord);
      if (nId !== undefined) {
        neighbors.push(nId);
        dirMap.set(direction, nId);
      }
    }
    adjacency.set(key, neighbors);
    dirAdj.set(key, dirMap);
  }

  // Precompute directional rays using direction-aware graph traversal.
  // From each vertex, follow the directional adjacency chain in each direction.
  // This produces properly alternating corner → center → corner → center rays.
  const rays = new Map();

  for (const [key] of vertexMap) {
    const vertexRays = [];
    for (const { direction } of dirVectors) {
      const rayVertices = [];
      let current = key;

      for (let step = 0; step < 50; step++) {
        const nextDirMap = dirAdj.get(current);
        if (!nextDirMap) break;
        const next = nextDirMap.get(direction);
        if (next === undefined) break;
        rayVertices.push(next);
        current = next;
      }

      vertexRays.push({ direction, vertices: rayVertices });
    }
    rays.set(key, vertexRays);
  }

  // Hex center pixel positions for rendering (already computed)
  const hexCentersWithPixels = hexCenters.map(({ col, row, x, y }) => {
    return { col, row, x: roundCoord(x), y: roundCoord(y) };
  });

  return {
    vertices: vertexMap,
    adjacency,
    rays,
    hexCenters: hexCentersWithPixels,
    size,
    cols,
    rows,
  };
}

/**
 * Get the expected hex count for a rectangular grid.
 * @param {number} cols - Number of hex columns
 * @param {number} rows - Number of hex rows
 * @returns {number}
 */
export function hexCount(cols, rows) {
  return cols * rows;
}
