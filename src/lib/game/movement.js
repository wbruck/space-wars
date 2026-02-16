/**
 * Movement logic module for hex vertex board game.
 *
 * Handles directional ray traversal, path computation, and move validation.
 * Movement is along straight lines on the triangular lattice using
 * precomputed directional rays from hexGrid.js.
 */

/**
 * Get available directions from a vertex.
 * A direction is available if its ray has at least one traversable vertex
 * (i.e., the first vertex in the ray is not an obstacle).
 *
 * @param {Map<string, Array<{direction: number, vertices: string[]}>>} rays
 * @param {string} vertexId - Current vertex
 * @param {Set<string>} obstacles - Obstacle vertex IDs
 * @returns {Array<{direction: number, vertices: string[]}>} Available direction rays
 */
export function getAvailableDirections(rays, vertexId, obstacles) {
  const vertexRays = rays.get(vertexId);
  if (!vertexRays) return [];

  return vertexRays.filter((ray) => {
    // Direction is available if there's at least one non-obstacle vertex in the ray
    if (ray.vertices.length === 0) return false;
    // First vertex must not be an obstacle (immediate block)
    return !obstacles.has(ray.vertices[0]);
  });
}

/**
 * Compute the path for moving in a given direction.
 * Walks along the ray for up to `steps` vertices, stopping early at
 * obstacles, hazards, or board edges. Remaining steps after hitting an obstacle are lost.
 *
 * Hazard check order per vertex: obstacle (stop before) > blackhole (include, then stop)
 * > enemy zone (include, then stop) > target (include, then stop)
 *
 * @param {Array<{direction: number, vertices: string[]}>} rays - All rays for the vertex
 * @param {number} direction - Direction index (0-5)
 * @param {number} steps - Number of steps to take (min(diceValue, remainingPool))
 * @param {Set<string>} obstacles - Obstacle vertex IDs
 * @param {string|null} targetVertex - Target vertex ID (for win detection)
 * @param {Set<string>} [blackholes] - Blackhole vertex IDs (optional)
 * @param {Set<string>} [enemyZones] - Enemy kill zone vertex IDs (optional)
 * @param {Map<string, string>} [enemyZoneMap] - Map of zone vertex ID → enemy ID (optional)
 * @param {string} [excludeEnemyId] - Enemy ID whose zones should be treated as passable (optional, for stealth dive)
 * @returns {{ path: string[], stoppedByObstacle: boolean, reachedTarget: boolean, hitBlackhole: boolean, hitByEnemy: boolean, engageEnemy: { vertexIndex: number, enemyId: string } | null }}
 */
export function computePath(rays, direction, steps, obstacles, targetVertex, blackholes, enemyZones, enemyZoneMap, excludeEnemyId) {
  const ray = rays.find((r) => r.direction === direction);
  if (!ray) return { path: [], stoppedByObstacle: false, reachedTarget: false, hitBlackhole: false, hitByEnemy: false, engageEnemy: null };

  const path = [];
  let stoppedByObstacle = false;
  let reachedTarget = false;
  let hitBlackhole = false;
  let hitByEnemy = false;
  let engageEnemy = null;

  for (let i = 0; i < Math.min(steps, ray.vertices.length); i++) {
    const vid = ray.vertices[i];

    // Check for obstacle (stop BEFORE — vertex NOT in path)
    if (obstacles.has(vid)) {
      stoppedByObstacle = true;
      break;
    }

    // Check for blackhole (include vertex, then stop)
    if (blackholes?.has(vid)) {
      path.push(vid);
      hitBlackhole = true;
      break;
    }

    // Check for enemy kill zone (include vertex, then stop)
    if (enemyZones?.has(vid)) {
      const zoneInfoRaw = enemyZoneMap?.get(vid);

      // No enemyZoneMap provided — legacy instant-death behavior
      if (!zoneInfoRaw) {
        path.push(vid);
        hitByEnemy = true;
        break;
      }

      // Filter out excluded enemy (stealth dive bypass)
      const relevant = zoneInfoRaw.filter(e => e.enemyId !== excludeEnemyId);

      if (relevant.length === 0) {
        // All entries belong to excluded enemy — treat as passable
        path.push(vid);
        if (vid === targetVertex) {
          reachedTarget = true;
          break;
        }
        continue;
      }

      path.push(vid);
      // Vision entry takes priority over proximity
      const entry = relevant.find(e => e.zoneType === 'vision') || relevant[0];
      engageEnemy = { vertexIndex: path.length - 1, enemyId: entry.enemyId, zoneType: entry.zoneType };
      break;
    }

    path.push(vid);

    // Check for target (win by passing through or landing on)
    if (vid === targetVertex) {
      reachedTarget = true;
      break;
    }
  }

  return { path, stoppedByObstacle, reachedTarget, hitBlackhole, hitByEnemy, engageEnemy };
}

/**
 * Check if a player is trapped (no valid moves in any direction).
 * A player is trapped if all 6 directional rays have their first vertex
 * blocked by an obstacle or the ray is empty (board edge).
 *
 * @param {Map<string, Array<{direction: number, vertices: string[]}>>} rays
 * @param {string} vertexId - Current vertex
 * @param {Set<string>} obstacles - Obstacle vertex IDs
 * @returns {boolean} True if the player is trapped
 */
export function isTrapped(rays, vertexId, obstacles) {
  const available = getAvailableDirections(rays, vertexId, obstacles);
  return available.length === 0;
}
