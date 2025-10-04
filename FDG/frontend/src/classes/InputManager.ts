import { Camera } from "../classes/Camera";
import { GraphManager } from "../classes/GraphManager";
import { CanvasUtility } from "../utility/CanvasUtility";
import { VertexUtility } from "../utility/VertexUtility";
import type { UIController } from "./UIController";
import { Vertex } from "../graph/Vertex";
import { RenderingUtility } from "../utility/RenderingUtility";

export class InputManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly camera: Camera;
    private readonly graphManager: GraphManager;
    private readonly uiController: UIController;

    private isDraggingCamera = false;
    private isExpandingVertex = false;
    private clickTimer: number | null = null;

    constructor(canvas: HTMLCanvasElement, camera: Camera, graphManager: GraphManager, uiController: UIController) {
        this.canvas = canvas;
        this.camera = camera;
        this.graphManager = graphManager;
        this.uiController = uiController;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.canvas.addEventListener("contextmenu", (e) => this.handleRightClick(e)); // expand from vertex
        this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e)); // dragging Camera/Vertex
        this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e)); // also dragging
        this.canvas.addEventListener("mouseup", () => this.handleMouseUp()); // also dragging
        this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave()); // also dragging
        this.canvas.addEventListener("wheel", (e) => this.handleWheel(e)); // zooming in/out
    }

    // Handles right click expansion of vertex/vertices
    private async handleRightClick(e: MouseEvent) {
        e.preventDefault();

        // One expansion click at a time
        if (this.isExpandingVertex) {
            RenderingUtility.showError(
                "Already Expanding a Vertex. Use stop expansions button to cancel current expansion"
            );
            return;
        }
        
        const graph = this.graphManager.graph;
        const vertexToExpand = graph.lastClickedVertex;
        const neighboursBeforeExpansion = vertexToExpand?.neighbours.size;
        
        if (graph.getVertices().length >= GraphManager.MAXIMUM_VERTICES){
            RenderingUtility.showError("Maximum number of entities reached")
        }
        
        if (vertexToExpand) {
            const settings = this.uiController.getSettings();
            this.isExpandingVertex = true;
            await this.graphManager.expandVertex(
                vertexToExpand,
                settings.depth,
                settings.relationLimit
            );
            this.isExpandingVertex = false;
        }

        if (neighboursBeforeExpansion == vertexToExpand?.neighbours.size) {
            RenderingUtility.showError("No entities found. Increase relation goal or try another");
        }
    }

    private handleMouseDown(e: MouseEvent) {
        const mousePos = CanvasUtility.browserToCanvas(this.canvas, e);
        const graph = this.graphManager.graph;
        let hitVertex: Vertex | null = null;

        // Check vertices for being clicked on
        for (const vertex of graph.getVertices()) {
            if (VertexUtility.pointInBoundary(mousePos, this.graphManager.ctx, this.camera, vertex)) {
                hitVertex = vertex;
            }
        }

        // Start camera drag if no vertex selected
        if (hitVertex === null) {
            this.isDraggingCamera = true;
            return;
        }

        // Both single and double click set that as main vertex
        this.graphManager.graph.setSelectedVertex(hitVertex!);

        // Ctrl click opens vertex wiki page
        if (hitVertex) {
            if (e.ctrlKey || e.metaKey) {
                const wikiURL = `https://en.wikipedia.org/wiki/${encodeURIComponent(hitVertex.wikiTitle)}`;
                window.open(wikiURL, "_blank", "noopener,noreferrer");
                return;
            }
        }

        if (this.clickTimer) {
            // Double click
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
            this.camera.cameraLockedVertex = hitVertex!;
        } else {
            // Single Click
            this.clickTimer = setTimeout(() => {
                this.clickTimer = null;
            }, 250);
        }
    }

    private handleMouseMove(e: MouseEvent) {
        if (this.isDraggingCamera) {
            this.camera.cameraLockedVertex = null; // Allows to break out of camera lock
            this.camera.pan(e.movementX, e.movementY);
        } else {
            // Handle vertex dragging
            const mousePos = CanvasUtility.browserToCanvas(this.canvas, e);

            const graph = this.graphManager.graph;
            if (graph.selectedVertex) {
                if (this.camera.cameraLockedVertex === graph.selectedVertex) {
                    return;
                }

                const worldPos = this.camera.canvasToWorld(mousePos);

                // Update vertex position
                graph.selectedVertex.pos.x = worldPos.x;
                graph.selectedVertex.pos.y = worldPos.y;
            }

            // Check vertices for being hovered over
            for (const vertex of graph.getVertices()) {
                if (VertexUtility.pointInBoundary(mousePos, this.graphManager.ctx, this.camera, vertex)) {
                    graph.hoveredVertex = vertex;
                    return
                }
            }
            graph.hoveredVertex = undefined;
        }
    }

    private handleWheel(e: WheelEvent) {
        e.preventDefault();
        const mousePos = CanvasUtility.browserToCanvas(this.canvas, e);
        const worldMouse = this.camera.canvasToWorld(mousePos);

        this.camera.zoomAt(mousePos, worldMouse, e.deltaY);
    }

    private handleMouseUp() {
        this.isDraggingCamera = false;
        this.graphManager.graph.resetSelectedVertex();
    }

    private handleMouseLeave() {
        this.isDraggingCamera = false;
        this.graphManager.graph.resetSelectedVertex();
    }
}
