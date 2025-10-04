import { Vec } from "../graph/Vec";
import { Vertex } from "../graph/Vertex";

export class GeometryUtility {
    /**
     * Returns angle of a line from the x-axis
     */
    static lineAngle(source: Vec, target: Vec): number {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        return Math.atan2(dy, dx);
    }

    /**
     * Returns distance between two points
     */
    static distance(vertexPosA: Vec, vertexPosB: Vec) {
        const dx = vertexPosA.x - vertexPosB.x;
        const dy = vertexPosA.y - vertexPosB.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     *  Returns midpoint between two points
     */
    static getMidpoint(pointA: Vec, pointB: Vec) {
        const xMid = (pointA.x + pointB.x) / 2;
        const yMid = (pointA.y + pointB.y) / 2;
        return new Vec(xMid, yMid);
    }

    /**
     *  Gets intersect from source point to vertex's boundary
     **/
    static getBoxIntersect(sourcePos: Vec, target: Vertex) {
        const halfWidth = target._cachedDimensions!.boxWidth / 2;
        const halfHeight = target._cachedDimensions!.boxHeight / 2;

        const dx = target.pos.x - sourcePos.x;
        const dy = target.pos.y - sourcePos.y;

        // avoid division by zero
        if (dx === 0 && dy === 0) return new Vec(target.pos.x, target.pos.y);

        // Scale factors along each axis
        const scaleX = halfWidth / Math.abs(dx);
        const scaleY = halfHeight / Math.abs(dy);

        const scale = Math.min(scaleX, scaleY);

        return new Vec(target.pos.x - dx * scale, target.pos.y - dy * scale);
    }

    /**
     * Creates evenly spaced points around a circle
     */
    static circlePoints(
        centerX: number,
        centerY: number,
        radius: number,
        numOfPoints = 100
    ): Array<Vec> {
        const points = [];
        // Offset to avoid straight line graphs
        const offset = Math.PI / 18;
        for (let i = 0; i < numOfPoints; i++) {
            const theta = (offset + 2 * Math.PI * i) / numOfPoints - Math.PI / 2;
            const x = centerX + radius * Math.cos(theta);
            const y = centerY + radius * Math.sin(theta);
            points.push(new Vec(x, y));
        }
        return points;
    }
}
