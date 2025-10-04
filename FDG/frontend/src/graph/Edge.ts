import { Vertex } from "./Vertex.ts";
import { Vec } from "./Vec.ts";
import { RenderingUtility } from "../utility/RenderingUtility.ts";
import { GeometryUtility } from "../utility/GeometryUtility.ts";
import { FONT } from "../../constants/font.ts";
import { VertexUtility } from "../utility/VertexUtility.ts";
import { TextUtility } from "../utility/TextUtility.ts";

export class Edge {
    private static readonly MAX_LABEL_VISIBLE_SPEED = 2;
    private static readonly ARROW_HEAD_SIZE = 30;
    private static readonly ARROW_HEAD_ANGLE = Math.PI / 6;
    private static readonly BIDIRECTIONAL_OFFSET_SCALE = 20;

    private static readonly LABEL_DISTANCE_FROM_MIDPOINT = 20;
    private static readonly LABEL_PADDING = 80;
    private static readonly LABEL_MAX_FONT = 40;
    private static readonly LABEL_MIN_FONT = 12;
    private static readonly LABEL_COVERAGE_FACTOR = 0.65;
    private static readonly LABEL_DRAW_CUTOFF = 200;

    private static readonly LABEL_COLOUR = "#2e2e2eff";

    private readonly _sourceRef: Vertex;

    private readonly _targetRef: Vertex;

    private _isBidirectional: boolean;
    private _types: string[];

    static readonly LINE_SIZE = 4;
    edgeColour: string;

    constructor(sourceRef: Vertex, targetRef: Vertex, type: string, isBiDirectional: boolean = false) {
        this._isBidirectional = isBiDirectional;
        this._types = [type];
        this.edgeColour = "#000000"; // Default colour
        this._sourceRef = sourceRef;
        this._targetRef = targetRef;

        if (!this._sourceRef || !this._targetRef) {
            throw new Error(`Invalid vertex IDs: source=${sourceRef}, target=${targetRef}`);
        }
    }

    get targetRef() {
        return this._targetRef;
    }

    get sourceRef() {
        return this._sourceRef;
    }

    set isBidirectional(isBidirectional: boolean) {
        this._isBidirectional = isBidirectional;
    }

    get mainType() {
        const MAIN_TYPE_INDEX = 0;
        return this.types[MAIN_TYPE_INDEX];
    }

    get types() {
        return this._types;
    }

    set types(type: string[]) {
        this._types = type;
    }

    /**
     * Static method to draw edges in batches by colour
     */
    static drawBatched(
        ctx: CanvasRenderingContext2D,
        edges: Edge[],
        drawSimple: boolean,
        hoveredVertex: Vertex | null = null
    ) {
        // Group edges by colour
        const edgesByColour = new Map<string, Edge[]>();
        for (const edge of edges) {
            const colour = edge.edgeColour || "#00000012";
            if (!edgesByColour.has(colour)) {
                edgesByColour.set(colour, []);
            }
            edgesByColour.get(colour)!.push(edge);
        }

        // Draw each colour group
        for (const [colour, colorEdges] of edgesByColour) {
            // Batch all lines for this colour
            ctx.strokeStyle = colour;
            ctx.fillStyle = colour;
            ctx.lineWidth = Edge.LINE_SIZE;
            ctx.beginPath();

            for (const edge of colorEdges) {
                edge.addLineToPath(ctx, drawSimple);
            }

            ctx.stroke();

            // Draw arrowheads for this colour
            for (const edge of colorEdges) {
                edge.drawArrowhead(ctx, drawSimple);
            }

            // Only draw labels for edges connected to hovered vertex
            if (!drawSimple && hoveredVertex && !hoveredVertex.selected && hoveredVertex.velocity) {
                const velocity = hoveredVertex.velocity;
                const hoveredEdgeSpeed = Math.hypot(velocity.x, velocity.y);
                if (hoveredEdgeSpeed > Edge.MAX_LABEL_VISIBLE_SPEED) continue;
                for (const edge of colorEdges) {
                    // Check if edge is connected to hovered vertex
                    if (edge.sourceRef === hoveredVertex || edge.targetRef === hoveredVertex) {
                        edge.drawLabelText(ctx, drawSimple);
                    }
                }
            }
        }
    }

    /**
     * Adds this edge's line to an existing path (for batched rendering)
     */
    addLineToPath(ctx: CanvasRenderingContext2D, drawSimple: boolean) {
        if (drawSimple) {
            const sourcePos = this.sourceRef.pos;
            const targetPos = this.targetRef.pos;
            ctx.moveTo(sourcePos.x, sourcePos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
        } else {
            const source = this.sourceRef.pos;
            const intersectTarget = GeometryUtility.getBoxIntersect(source, this.targetRef);

            const dx = intersectTarget.x - source.x;
            const dy = intersectTarget.y - source.y;
            const angle = Math.atan2(dy, dx);

            let offset = new Vec(0, 0);
            if (this._isBidirectional) {
                offset = RenderingUtility.calculateBidirectionalOffset(dx, dy, Edge.BIDIRECTIONAL_OFFSET_SCALE);
            }

            const positions = RenderingUtility.calculateArrowPositions(
                source,
                intersectTarget,
                angle,
                offset,
                Edge.ARROW_HEAD_SIZE
            );

            ctx.moveTo(positions.sourceX, positions.sourceY);
            ctx.lineTo(positions.endX, positions.endY);
        }
    }

    /**
     * Draws the arrowhead for this edge
     */
    drawArrowhead(ctx: CanvasRenderingContext2D, drawSimple: boolean) {
        const source = this.sourceRef.pos;
        const target = drawSimple ? this.targetRef.pos : GeometryUtility.getBoxIntersect(source, this.targetRef);

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const angle = Math.atan2(dy, dx);

        let arrowX, arrowY;

        if (drawSimple) {
            const midpoint = Vec.scalarDivide(Vec.add(source, target), 2);
            arrowX = midpoint.x;
            arrowY = midpoint.y;
        } else {
            let offset = new Vec(0, 0);
            if (this._isBidirectional) {
                offset = RenderingUtility.calculateBidirectionalOffset(dx, dy, Edge.BIDIRECTIONAL_OFFSET_SCALE);
            }

            const positions = RenderingUtility.calculateArrowPositions(
                source,
                target,
                angle,
                offset,
                Edge.ARROW_HEAD_SIZE
            );

            arrowX = positions.targetX;
            arrowY = positions.targetY;
        }

        RenderingUtility.drawArrowhead(ctx, arrowX, arrowY, angle, Edge.ARROW_HEAD_SIZE, Edge.ARROW_HEAD_ANGLE);
    }
    /**
     * Calculates and draws the edge's type property above/below the edge
     */
    drawLabelText(ctx: CanvasRenderingContext2D, drawSimple: boolean) {
        // Skip label text when simple
        if (drawSimple) {
            return;
        }

        const source = this.sourceRef.pos;
        const target = this.targetRef.pos;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < Edge.LABEL_DRAW_CUTOFF) return; // Skip very short edges

        // Ensures vertex box dimensions are correct in cache
        VertexUtility.ensureValidCache(ctx, this.sourceRef);
        VertexUtility.ensureValidCache(ctx, this.targetRef);

        // Gets the positions minus the box to avoid label being hidden by drawn box
        const sourceIntersect = GeometryUtility.getBoxIntersect(target, this.sourceRef);
        const targetIntersect = GeometryUtility.getBoxIntersect(source, this.targetRef);

        // Builds the label to be the longest property string
        let typeLabel = "";
        for (let i = 0; i < this._types.length; i++) {
            const type = this._types[i];
            if (type.length > typeLabel.length) {
                typeLabel = type;
            }
        }

        // Calculates the best font size for the edge based of vertex distance
        const padding = Edge.LABEL_PADDING;
        const distanceInbetween = GeometryUtility.distance(sourceIntersect, targetIntersect) - padding;
        const maxLabelWidth = distanceInbetween * Edge.LABEL_COVERAGE_FACTOR;
        if (maxLabelWidth <= 0) return;

        const maxFont = Edge.LABEL_MAX_FONT;
        const minFont = Edge.LABEL_MIN_FONT;

        // Performs binary search to find the best fontsize
        let low = minFont;
        let high = maxFont;
        let bestSize = minFont;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            ctx.font = `bold ${mid}px ${FONT.FAMILY}`;
            const width = ctx.measureText(typeLabel).width;

            if (width <= maxLabelWidth) {
                bestSize = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        ctx.font = `bold ${bestSize}px ${FONT.FAMILY}`;
        const labelMetrics = ctx.measureText(typeLabel);

        // If label is still too large, dont display it
        if (labelMetrics.width >= maxLabelWidth) {
            return;
        }

        // we want the midpoint of the source -> target
        const midpoint = GeometryUtility.getMidpoint(sourceIntersect, targetIntersect);

        // then we want the perpendicular angle + a static distance from midpoint
        let angle = GeometryUtility.lineAngle(source, target);
        const perpAngle = angle + Math.PI / 2;

        let distanceFromMidpoint = Edge.LABEL_DISTANCE_FROM_MIDPOINT + TextUtility.getTextHeight(labelMetrics) / 2;

        // Add extra offset if biDirectional
        if (this._isBidirectional) {
            distanceFromMidpoint += Edge.BIDIRECTIONAL_OFFSET_SCALE;
        }

        const textPos = new Vec(
            midpoint.x + distanceFromMidpoint * Math.cos(perpAngle),
            midpoint.y + distanceFromMidpoint * Math.sin(perpAngle)
        );

        // Detects if text is upside down and flips it
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            angle += Math.PI;
        }

        // Draw text in same orientation of the edge
        const rotationThreshold = 0.1;
        if (Math.abs(angle) < rotationThreshold) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = Edge.LABEL_COLOUR;
            ctx.fillText(typeLabel, textPos.x, textPos.y);
        } else {
            // Minus the size of the arrowhead to avoid overlapping with arrowhead
            const dx = targetIntersect.x - source.x;
            const dy = targetIntersect.y - source.y;

            const arrowAngle = Math.atan2(dy, dx);
            const arrowLength = Edge.ARROW_HEAD_SIZE;
            const xArrowOffset = arrowLength * Math.cos(arrowAngle);
            const yArrowOffset = arrowLength * Math.sin(arrowAngle);

            textPos.x -= xArrowOffset;
            textPos.y -= yArrowOffset;

            // Draw text in same orientation of the edge
            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(angle);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = Edge.LABEL_COLOUR;
            ctx.fillText(typeLabel, 0, 0);
            ctx.restore();
        }
    }

    /**
     * Draw an arrow from source to target vertex
     */
    drawArrow(ctx: CanvasRenderingContext2D, sourceVertex: Vertex, targetVertex: Vertex, drawSimple: boolean) {
        if (drawSimple) {
            const sourcePos = sourceVertex.pos;
            const targetPos = targetVertex.pos;

            ctx.strokeStyle = this.edgeColour;
            ctx.beginPath();
            ctx.moveTo(sourcePos.x, sourcePos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.stroke();

            const midpoint = Vec.scalarDivide(Vec.add(sourcePos, targetPos), 2);
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const angle = Math.atan2(dy, dx);

            RenderingUtility.drawArrowhead(
                ctx,
                midpoint.x,
                midpoint.y,
                angle,
                Edge.ARROW_HEAD_SIZE,
                Edge.ARROW_HEAD_ANGLE
            );
            return;
        }

        // We draw to the box edge so arrow is not hidden
        const source = sourceVertex.pos;
        const intersectTarget = GeometryUtility.getBoxIntersect(source, targetVertex);

        // Calculate direction vector to keep the arrow in correct orientation
        const dx = intersectTarget.x - source.x;
        const dy = intersectTarget.y - source.y;
        const angle = Math.atan2(dy, dx);

        // Calculate offset for bidirectional arrows so they dont overlap
        let offset = new Vec(0, 0);
        if (this._isBidirectional) {
            offset = RenderingUtility.calculateBidirectionalOffset(dx, dy, Edge.BIDIRECTIONAL_OFFSET_SCALE);
        }

        const positions = RenderingUtility.calculateArrowPositions(
            source,
            intersectTarget,
            angle,
            offset,
            Edge.ARROW_HEAD_SIZE
        );

        // Line
        ctx.beginPath();
        ctx.moveTo(positions.sourceX, positions.sourceY);
        ctx.lineTo(positions.endX, positions.endY);
        ctx.stroke();

        // Arrowhead
        RenderingUtility.drawArrowhead(
            ctx,
            positions.targetX,
            positions.targetY,
            angle,
            Edge.ARROW_HEAD_SIZE,
            Edge.ARROW_HEAD_ANGLE
        );
    }
}
