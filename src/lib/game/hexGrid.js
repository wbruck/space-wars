/**
 * Hex vertex grid math module.
 *
 * The game board is a hex grid where playable spaces are at hex VERTICES
 * (corners), forming a triangular lattice. Players move along hex edges
 * in 6 directions (3 axes x 2 directions each).
 *
 * Coordinate system:
 * - Hex centers use axial coordinates (q, r).
 * - Vertices are at the 6 corners of each hex, shared between up to 3 hexes.
 * - Flat-top hex orientation is used.
 *
 * For a flat-top hex with center (cx, cy) and size S:
 *   corner i (0..5) = (cx + S*cos(60°*i), cy + S*sin(60°*i))
 *
 * Each vertex has exactly 3 adjacent vertices (connected by hex edges)
 * for interior vertices, and fewer at board edges. The 3 edges at each
 * vertex define 3 axes; movement along any axis in either direction
 * produces 6 directional rays.
 *
 * Vertex deduplication uses coordinate rounding to a string key.
 */

const SQRT3 = Math.sqrt(3);

/**
 * Convert axial (q, r) to pixel center for flat-top hexes.
 * Size = distance from center to corner.
 */
function axialToPixel(q, r, size) {
  const x = size * (3 / 2) * q;
  const y = size * ((SQRT3 / 2) * q + SQRT3 * r);
  return { x, y };
}

/**
 * Generate all hex centers within the given radius (axial distance <= radius).
 * radius=2 gives 19 hexes, radius=3 gives 37, radius=4 gives 61.
 */
function generateHexCenters(radius) {
  const centers = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        centers.push({ q, r });
      }
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
 * The 6 movement direction vectors on the triangular lattice.
 *
 * Hex vertices have 3 edges each. These edges point in 3 directions that
 * alternate depending on the vertex "type" (A or B in the bipartite graph).
 * However, the 6 ray directions are universal: they represent all possible
 * movement directions along the lattice axes.
 *
 * For flat-top hexes of size S, the 6 directions at 0°, 60°, 120°, 180°,
 * 240°, 300° with step size S cover all possible edge directions.
 * At any given vertex, only 3 of these 6 will lead to an adjacent vertex.
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
 * Generate the full hex vertex grid.
 *
 * @param {number} radius - Board radius in hexes (2=small, 3=medium, 4=large)
 * @param {number} [size=40] - Hex size (center to corner distance in px)
 * @returns {{ vertices: Map<string, object>, adjacency: Map<string, string[]>, rays: Map<string, Array<{direction: number, vertices: string[]}>>, hexCenters: Array, size: number, radius: number }}
 */
export function generateGrid(radius, size = 40) {
  const hexCenters = generateHexCenters(radius);
  const vertexMap = new Map(); // key -> { id, x, y }

  // Generate all vertices from hex corners
  for (const { q, r } of hexCenters) {
    const { x: cx, y: cy } = axialToPixel(q, r, size);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      const key = vertexKey(vx, vy);
      if (!vertexMap.has(key)) {
        vertexMap.set(key, {
          id: key,
          x: roundCoord(vx),
          y: roundCoord(vy),
        });
      }
    }
  }

  // Build adjacency map: two vertices are adjacent if they share a hex edge.
  // We check all 6 direction vectors; for each vertex, exactly 3 will land
  // on another vertex (the 3 hex-edge neighbors).
  const dirVectors = getDirectionVectors(size);
  const adjacency = new Map();

  for (const [key, vertex] of vertexMap) {
    const neighbors = [];
    for (const { dx, dy } of dirVectors) {
      const nKey = vertexKey(vertex.x + dx, vertex.y + dy);
      if (vertexMap.has(nKey)) {
        neighbors.push(nKey);
      }
    }
    adjacency.set(key, neighbors);
  }

  // Precompute directional rays for each vertex.
  // For each of the 6 directions, walk along that axis as far as possible.
  // At each step, we move by the direction vector. Because the lattice
  // is bipartite, the direction alternates between "occupied" and "unoccupied"
  // every step. So we walk in steps of size S, and some steps will miss
  // (no vertex there); we skip those and continue looking for the next vertex
  // along the ray. Actually, since vertices alternate in a zig-zag pattern
  // along each axis, we need to walk in the correct lattice direction.
  //
  // The key insight: moving along one axis (e.g., direction 0 at 0°) from
  // a vertex, the next vertex in that direction is at distance S. But it might
  // not be a direct neighbor — it's only a neighbor if there's a hex edge
  // connecting them. However, movement along a ray continues in a straight line:
  // vertex → skip → vertex → skip → etc. The pattern is: from a "type A" vertex
  // at direction 0°, the neighbor is at direction 0° distance S. From a "type B"
  // vertex, direction 0° has NO neighbor at distance S, but there IS one at 2S.
  //
  // Actually this is simpler: the ray in direction d from vertex V consists of
  // all vertices reachable by repeatedly stepping in direction d. Since only
  // every other step lands on a vertex, we just keep stepping and collecting
  // the ones that exist.
  const rays = new Map();

  for (const [key, vertex] of vertexMap) {
    const vertexRays = [];
    for (const { direction, dx, dy } of dirVectors) {
      const rayVertices = [];
      let cx = vertex.x;
      let cy = vertex.y;

      // Walk in this direction, up to a generous max
      for (let step = 0; step < 50; step++) {
        cx = roundCoord(cx + dx);
        cy = roundCoord(cy + dy);
        const nKey = vertexKey(cx, cy);
        if (vertexMap.has(nKey)) {
          rayVertices.push(nKey);
        }
        // Stop if we've gone far enough that we're clearly outside the grid.
        // We use a generous bound: 2 * grid diameter.
        // The grid diameter is roughly 2 * radius * size * 2 = 4 * radius * size
        const maxDist = 4 * radius * size;
        const distFromOrigin = Math.sqrt(cx * cx + cy * cy);
        if (distFromOrigin > maxDist) break;
      }

      vertexRays.push({ direction, vertices: rayVertices });
    }
    rays.set(key, vertexRays);
  }

  // Compute hex center pixel positions for rendering
  const hexCentersWithPixels = hexCenters.map(({ q, r }) => {
    const { x, y } = axialToPixel(q, r, size);
    return { q, r, x: roundCoord(x), y: roundCoord(y) };
  });

  return {
    vertices: vertexMap,
    adjacency,
    rays,
    hexCenters: hexCentersWithPixels,
    size,
    radius,
  };
}

/**
 * Get the expected hex count for a given radius.
 * Formula: 3*r^2 + 3*r + 1
 */
export function hexCount(radius) {
  return 3 * radius * radius + 3 * radius + 1;
}
