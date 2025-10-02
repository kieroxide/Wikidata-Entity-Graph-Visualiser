import type { Camera } from "../classes/Camera";
import type { GraphManager } from "../classes/GraphManager";
import { Vec } from "../graph/Vec";

export class RenderingUtility {
    private static readonly BACKGROUND_COLOR = "#f3f3f3ff ";

    /** Renders the graph and background to the canvas. */
    static render(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        camera: Camera,
        graphManager: GraphManager
    ) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        ctx.fillStyle = RenderingUtility.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        ctx.save(); // save and restore to avoid transforms stacking
        camera.applyTransform(ctx, canvas);
        graphManager.graph.draw(camera);
        ctx.restore();
    }

    /**
     * Shows success message to user
     */
    static showSuccess(message: string) {
        this.showMessage(message, "success");
    }

    /**
     * Shows error message to user
     */
    static showError(message: string) {
        this.showMessage(message, "error");
    }

    /** Shows a message to the user with a given type. */
    static showMessage(message: string, type: "success" | "error") {
        const bar = document.getElementById("popup-message");
        if (!bar) return;

        bar.textContent = message;
        bar.style.display = "block";
        bar.style.background = type === "success" ? "#4caf50" : "#f44336";
        bar.style.color = "#fff";

        // Auto-hide after 3 seconds
        setTimeout(() => {
            bar.style.display = "none";
        }, 3000);
    }

    /**
     * Calculate offset for bidirectional arrows
     */
    static calculateBidirectionalOffset(dx: number, dy: number, offsetScale: number): Vec {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return new Vec(0, 0);

        // Calculate perpendicular unit vector
        const perpX = -dy / length;
        const perpY = dx / length;

        // Apply offset
        return new Vec(perpX * offsetScale, perpY * offsetScale);
    }

    /**
     * Calculate all arrow positions with offset applied
     */
    static calculateArrowPositions(source: Vec, target: Vec, angle: number, offset: Vec, ArrowHeadSize: number) {
        // Move line endpoint back by headLength to leave room for arrowhead
        const lineEndX = target.x - ArrowHeadSize * Math.cos(angle);
        const lineEndY = target.y - ArrowHeadSize * Math.sin(angle);

        // Apply offset to all points
        return {
            sourceX: source.x + offset.x,
            sourceY: source.y + offset.y,
            targetX: target.x + offset.x,
            targetY: target.y + offset.y,
            endX: lineEndX + offset.x,
            endY: lineEndY + offset.y,
        };
    }

    /**
     * Draw the arrowhead at the specified position
     */
    static drawArrowhead(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        angle: number,
        arrowHeadSize: number,
        arrowHeadAngle: number
    ) {
        const headLength = arrowHeadSize;
        const arrowAngle = arrowHeadAngle;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - headLength * Math.cos(angle + arrowAngle), y - headLength * Math.sin(angle + arrowAngle));
        ctx.lineTo(x - headLength * Math.cos(angle - arrowAngle), y - headLength * Math.sin(angle - arrowAngle));
        ctx.closePath();
        ctx.fill();
    }
}
