import { Vec } from "../graph/Vec";
import { Vertex } from "../graph/Vertex";

export class Camera {
    private static readonly MOUSE_SPEED_FACTOR = 1;
    private static readonly ZOOM_SCALE_FACTOR = 1.1;
    private static readonly SIMPLE_ZOOM_CUTOFF = 0.25;

    private _pos: Vec;
    private _zoom: number;

    private _cameraLockedVertex: Vertex | null;
    private _drawSimple = false;

    constructor() {
        this._pos = new Vec(0, 0);
        this._zoom = Camera.SIMPLE_ZOOM_CUTOFF;
        this._cameraLockedVertex = null;
    }

    get cameraLockedVertex() {
        return this._cameraLockedVertex;
    }

    set cameraLockedVertex(vertex: Vertex | null) {
        this._cameraLockedVertex = vertex;
    }

    get drawSimple() {
        return this._drawSimple;
    }

    /**
     * Convert canvas coordinates to world coordinates.
     */
    canvasToWorld(vector: Vec) {
        const worldX = (vector.x - this._pos.x) / this._zoom;
        const worldY = (vector.y - this._pos.y) / this._zoom;
        return new Vec(worldX, worldY);
    }

    /**
     * Convert world coordinates to canvas coordinates.
     */
    worldToCanvas(vector: Vec) {
        const canvasX = vector.x * this._zoom + this._pos.x;
        const canvasY = vector.y * this._zoom + this._pos.y;
        return new Vec(canvasX, canvasY);
    }

    /**
     * Apply camera transform to the canvas context.
     */
    applyTransform(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        if (this._cameraLockedVertex) {
            const vertexPosition = this._cameraLockedVertex.pos;
            const vertexCamPosition = new Vec(
                canvas.clientWidth / 2 - vertexPosition.x * this._zoom,
                canvas.clientHeight / 2 - vertexPosition.y * this._zoom
            );
            this._pos = vertexCamPosition;
        }
        ctx.translate(this._pos.x, this._pos.y);
        ctx.scale(this._zoom, this._zoom);
    }

    /**
     * Move the camera by dx, dy.
     */
    pan(dx: number, dy: number) {
        this._pos.x += dx * Camera.MOUSE_SPEED_FACTOR;
        this._pos.y += dy * Camera.MOUSE_SPEED_FACTOR;
    }

    /**
     * Zoom in or out at a given mouse position.
     */
    zoomAt(canvas_mouse: Vec, world_mouse: Vec, deltaY: number) {
        const factor = deltaY < 0 ? Camera.ZOOM_SCALE_FACTOR : 1 / Camera.ZOOM_SCALE_FACTOR;
        this._zoom *= factor;
        this._pos.x = canvas_mouse.x - world_mouse.x * this._zoom;
        this._pos.y = canvas_mouse.y - world_mouse.y * this._zoom;

        this._drawSimple = this._zoom <= Camera.SIMPLE_ZOOM_CUTOFF;
    }

    /**
     * Function to manually set the zoom from a point
     */
    setZoomAt(canvasPoint: Vec, worldPoint: Vec, newZoom: number) {
        this._zoom = newZoom;
        this._pos.x = canvasPoint.x - worldPoint.x * this._zoom;
        this._pos.y = canvasPoint.y - worldPoint.y * this._zoom;
        this._drawSimple = this._zoom <= Camera.SIMPLE_ZOOM_CUTOFF;
    }

    /**
     *  Function to set camera to display the whole graph
     */
    fitGraph(vertices: Vertex[], canvas: HTMLCanvasElement) {
        if (vertices.length === 0) return;
        this._cameraLockedVertex = null;

        // Find bounding box of graph
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const vertex of vertices) {
            minX = Math.min(minX, vertex.pos.x);
            maxX = Math.max(maxX, vertex.pos.x);
            minY = Math.min(minY, vertex.pos.y);
            maxY = Math.max(maxY, vertex.pos.y);
        }

        // Compute zoom to fit
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const graphCenter = new Vec(centerX, centerY);

        // Avoid div by 0
        const graphWidth = Math.max(maxX - minX, 1);
        const graphHeight = Math.max(maxY - minY, 1);

        const padding = 0.6;
        const scaleX = (canvas.clientWidth * padding) / graphWidth;
        const scaleY = (canvas.clientHeight * padding) / graphHeight;
        const fitZoom = Math.min(scaleX, scaleY); // More zoomed value

        // Center the bounding box
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        this.setZoomAt(new Vec(cssWidth / 2, cssHeight / 2), graphCenter, fitZoom);

        this._drawSimple = this._zoom <= Camera.SIMPLE_ZOOM_CUTOFF;
    }
}
