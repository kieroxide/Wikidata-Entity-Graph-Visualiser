import { Vertex } from "../graph/Vertex";

export class MathUtility {
    /**
     * Retuns a clamped a value between a minimum and maximum
     */
    static clamp(value: number, min: number, max: number) {
        return Math.max(min, Math.min(value, max));
    }

    /** Returns the symmetric difference between two sets. */
    static symmetricDifference<T>(setA: Set<T>, setB: Set<T>) {
        return new Set([...[...setA].filter((x) => !setB.has(x)), ...[...setB].filter((x) => !setA.has(x))]);
    }

    /** Returns the difference between two sets. */
    static difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
        return new Set([...setA].filter((x) => !setB.has(x)));
    }

    /** Performs a depth-limited search from a vertex, returning all visited vertices. */
    static depthSearch(vertex: Vertex, limit: number, depth: number = 0, visited: Set<Vertex> = new Set()) {
        if (limit <= depth) return visited;
        visited.add(vertex);

        const neighbours = vertex.neighbours;
        for (const neighbour of neighbours) {
            if (!visited.has(neighbour)) {
                this.depthSearch(neighbour, limit, depth + 1, visited);
            }
        }
        return visited;
    }

    /**
     * Groups vertices into connected components using BFS, organized by distance from origin
     */
    static bfsComponents(vertices: Vertex[]): Map<number, Map<number, Vertex[]>> {
        const visited = new Set<Vertex>();
        const components = new Map<number, Map<number, Vertex[]>>(); // Map<componentID, <bfsLevel, Vertices>>
        let componentId = 0;

        for (const origin of vertices) {
            if (visited.has(origin)) continue;

            const layers = new Map<number, Vertex[]>();
            const queue: Array<{ vertex: Vertex; level: number }> = [];
            queue.push({ vertex: origin, level: 0 });
            visited.add(origin);

            while (queue.length > 0) {
                const { vertex: vertex, level } = queue.shift()!;

                // We need to create the level map if not exists
                if (!layers.has(level)) {
                    layers.set(level, []);
                }
                // Adds vertex to the level
                layers.get(level)!.push(vertex);

                // Adds all unvisited neighbours to the queue
                for (const neighbour of vertex.neighbours) {
                    // Visited guard to prevent cycles in the graph causing an infinite loop
                    if (!visited.has(neighbour)) {
                        visited.add(neighbour);
                        queue.push({ vertex: neighbour, level: level + 1 });
                    }
                }
            }

            components.set(componentId++, layers);
        }
        return components;
    }
}
