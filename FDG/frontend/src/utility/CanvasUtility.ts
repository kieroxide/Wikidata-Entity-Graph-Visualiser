import { Camera } from "../classes/Camera";
import { Vec } from "../graph/Vec";
import type { Vertex } from "../graph/Vertex";
import { VertexUtility } from "./VertexUtility";

export class CanvasUtility {
    private static readonly COLOURS = {
        HUE_MIN: 0,
        HUE_MAX: 359,
        SATURATION_MIN: 70,
        SATURATION_MAX: 90,
        LIGHTNESS_MIN: 25, 
        LIGHTNESS_MAX: 40, 
    };

    private static readonly PALETTE = [
        "#1d3557", 
        "#d62828", 
        "#2a6f97", 
        "#e85d04", 
        "#2a9d8f", 
        "#264653", 
        "#c44536", 
        "#118ab2", 
        "#f77f00", 
        "#5a4a6a", 
        "#22223b", 
        "#3d2f1f", 
        "#2d6a4f", 
        "#d84315", 
        "#1e5f74", 
        "#6a040f", 
        "#06402b", 
        "#5e3023", 
        "#1a535c", 
        "#7209b7", 
        "#023047", 
        "#6d1a36", 
        "#124559", 
        "#873e23", 
        "#0b3954", 
    ];

    private static _paletteIndex = 0;

    static getCanvasBounds(canvas: HTMLCanvasElement) {
        // Canvas bounds as Vecs
        const topLeft = new Vec(0, 0);
        const topRight = new Vec(canvas.clientWidth, 0);
        const bottomRight = new Vec(canvas.clientWidth, canvas.clientHeight);
        const bottomLeft = new Vec(0, canvas.clientHeight);

        const canvasEdges = [
            [topLeft, topRight], // top
            [topRight, bottomRight], // right
            [bottomRight, bottomLeft], // bottom
            [bottomLeft, topLeft], // left
        ];

        return canvasEdges;
    }

    /**
     * Checks if a point is within the visible canvas area
     */
    static isPointInView(camera: Camera, canvas: HTMLCanvasElement, point: Vec, margin = 0): boolean {
        point = camera.worldToCanvas(point);
        return (
            point.x >= 0 - margin &&
            point.x <= canvas.clientWidth + margin &&
            point.y >= 0 - margin &&
            point.y <= canvas.clientHeight + margin
        );
    }

    /**
     * Checks if an edge (line between two points) is within the visible canvas area
     * Returns true if either endpoint is in view, or if the edge crosses the canvas
     */
    static isEdgeInView(camera: Camera, canvas: HTMLCanvasElement, start: Vec, end: Vec, margin = 0): boolean {
        // If either endpoint is in view
        if (this.isPointInView(camera, canvas, start, margin) || this.isPointInView(camera, canvas, end, margin)) {
            return true;
        }

        const canvasEdges = CanvasUtility.getCanvasBounds(canvas);
        for (const [canvasA, canvasB] of canvasEdges) {
            if (CanvasUtility.linesIntersect(camera, start, end, canvasA, canvasB)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if two line segments (p1-p2 and q1-q2) intersect
     */
    private static linesIntersect(camera: Camera, lineStart: Vec, lineEnd: Vec, canvasStart: Vec, canvasEnd: Vec): boolean {
        lineStart = camera.worldToCanvas(lineStart);
        lineEnd = camera.worldToCanvas(lineEnd);

        // Helper to check if three points are in counter-clockwise order
        function ccw(p1: Vec, p2: Vec, p3: Vec) {
            return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
        }
        return (
            ccw(lineStart, canvasStart, canvasEnd) !== ccw(lineEnd, canvasStart, canvasEnd) &&
            ccw(lineStart, lineEnd, canvasStart) !== ccw(lineStart, lineEnd, canvasEnd)
        );
    }

    /**
     *  Checks if a vertex is visible on the canvas, using its position and a radius (bounding circle)
     *  Uses vertex._cachedDimensions.boxWidth/2 or boxHeight/2 as radius
     */
    static isVertexInView(
        ctx: CanvasRenderingContext2D,
        camera: Camera,
        canvas: HTMLCanvasElement,
        vertex: Vertex,
        margin = 0
    ): boolean {
        VertexUtility.ensureValidCache(ctx, vertex);
        const dimensions = vertex._cachedDimensions!;
        const boxWidth = dimensions.boxWidth;
        const boxHeight = dimensions.boxHeight;

        const radius = Math.max(boxWidth, boxHeight) / 2;
        return CanvasUtility.isPointInView(camera, canvas, vertex.pos, radius + margin);
    }
    static nextNiceColor() {
        const color = CanvasUtility.PALETTE[CanvasUtility._paletteIndex % CanvasUtility.PALETTE.length];
        CanvasUtility._paletteIndex++;
        return color;
    }

    /** Assigns unique colors to any object type */
    static assignUniqueColours<T>(
        items: Iterable<T>,
        setColours: Map<string, string>,
        getType: (item: T) => string,
        setColour: (item: T, colour: string) => void
    ) {
        for (const item of items) {
            const key = getType(item);
            if (setColours.has(key)) {
                setColour(item, setColours.get(key)!);
            } else {
                let colour: string;
                const usedColours = new Set(setColours.values());
                do {
                    colour = CanvasUtility.randomNiceColor();
                } while (usedColours.has(colour));

                setColours.set(key, colour);
                setColour(item, colour);
            }
        }
    }

    /**
     * Generates a random HSL color with pleasant saturation/lightness
     */
    static randomNiceColor() {
        if (this.PALETTE.length <= this._paletteIndex) {
            const hue = Math.floor(Math.random() * CanvasUtility.COLOURS.HUE_MAX) + CanvasUtility.COLOURS.HUE_MIN;
            const saturation =
                Math.floor(Math.random() * CanvasUtility.COLOURS.SATURATION_MAX) + CanvasUtility.COLOURS.SATURATION_MIN;
            const lightness =
                Math.floor(Math.random() * CanvasUtility.COLOURS.LIGHTNESS_MAX) + CanvasUtility.COLOURS.LIGHTNESS_MIN;
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else {
            return this.nextNiceColor();
        }
    }

    /**
     * Converts browser mouse coordinates to canvas coordinates
     */
    static browserToCanvas(canvas: HTMLCanvasElement, e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        return new Vec(mouseX, mouseY);
    }

    /**
     * Resizes canvas to fill the entire window and prevents blurriness on high-DPI screens
     */
    static resizeCanvas(canvas: HTMLCanvasElement) {
        const dpr = window.devicePixelRatio || 1;
        const sidebar = document.getElementById("sidebar");
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
        const width = window.innerWidth - sidebarWidth;
        const height = window.innerHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any existing transforms
            ctx.scale(dpr, dpr);
        }
    }
}
