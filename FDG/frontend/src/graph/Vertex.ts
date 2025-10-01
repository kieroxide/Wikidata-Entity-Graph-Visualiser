import { Vec } from "./Vec";
import { Edge } from "./Edge";
import { VertexUtility } from "../utility/VertexUtility";
import { MathUtility } from "../utility/MathUtility";
import { FrameQueue } from "../utility/FrameQueue";
import config from "../../../config.json";
import { TextUtility } from "../utility/TextUtility";

const THUMBNAIL_SIZE: number = config.THUMBNAIL_SIZE;

export class Vertex {
    private static readonly MAX_SPEED = 15;
    private static readonly DAMPING = 0.9;

    private static readonly RECT_RADIX = 40;
    private static readonly VERTEX_COLOUR = "#fffbe6";

    static readonly SIMPLE_RADIUS = 40;
    static readonly LABEL_MAX_FONT = 32;
    static readonly LABEL_MIN_FONT = 24;

    // Euclidean Data
    private readonly _pos: Vec;
    private _velocity: Vec;
    private readonly _connectedEdges: Array<Edge>;
    private _selected: boolean;

    // Generic Data
    private readonly _id: string;
    private readonly _type: string;
    private readonly _wikiTitle: string;

    // Visual Label
    img: HTMLImageElement | undefined;
    thumbnail: HTMLCanvasElement | undefined;
    private readonly _label: string;
    public textWidth?: number;
    public textHeight?: number;
    labelColour?: string;
    expanding = false;

    _cachedDimensions?: {
        // Text measurements
        labelWidth: number;
        labelHeight: number;
        typeWidth: number;
        typeHeight: number;
        maxTextWidth: number;
        maxTextHeight: number;

        // Layout measurements
        imgSize: number;
        boxWidth: number;
        boxHeight: number;

        // Spacing constants
        padding: number;
        gap: number;

        // Cache keys
        fontSize: number;
        label: string;
        type: string;
        hasImage: boolean;
    };

    constructor(
        id: string,
        label: string,
        type: string = "",
        imgURL: string = "",
        wikiTitle: string = "",
        ctx: CanvasRenderingContext2D
    ) {
        this._pos = new Vec(200, 200);
        this._velocity = new Vec(0, 0);

        this._id = id;
        this._label = label;
        this._type = type;
        this._wikiTitle = wikiTitle;

        this._selected = false;
        this._connectedEdges = [];

        if (imgURL != "") {
            const img = new Image();
            img.src = imgURL;

            // Create a thumbnail of the image to reduce memory/performance hits
            img.onload = () => {
                // FrameQueue will create a thumbnail one at a time
                FrameQueue.push(() => {
                    const size = THUMBNAIL_SIZE;
                    const canvas = document.createElement("canvas");
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0, size, size);
                    this.thumbnail = canvas;
                    this.img = undefined; // Removes large image from memory
                });
            };
        }
        this.labelColour = undefined;

        this._cachedDimensions = VertexUtility.ensureValidCache(ctx, this);
    }

    get velocity() {
        return this._velocity;
    }
    killVelocity() {
        this._velocity = new Vec(0, 0);
    }

    get connectedEdges() {
        return this._connectedEdges;
    }

    get neighbours() {
        const neighbours: Set<Vertex> = new Set();
        for (const edge of this.connectedEdges) {
            if (edge.sourceRef !== this) {
                neighbours.add(edge.sourceRef);
            }
            if (edge.targetRef !== this) {
                neighbours.add(edge.targetRef);
            }
        }
        return neighbours;
    }

    set selected(isSelected: boolean) {
        this._selected = isSelected;
    }

    get selected() {
        return this._selected;
    }

    get id() {
        return this._id;
    }

    get type() {
        return this._type;
    }

    get label() {
        return this._label;
    }

    get wikiTitle() {
        return this._wikiTitle;
    }

    get pos() {
        return this._pos;
    }

    /**
     * Updates position of the Vertex using the vector's values. Also applies damping
     */
    update() {
        if (this.selected) return;

        const MAX_SPEED = Vertex.MAX_SPEED;
        this._pos.x += MathUtility.clamp(this._velocity.x, -MAX_SPEED, MAX_SPEED);
        this._pos.y += MathUtility.clamp(this._velocity.y, -MAX_SPEED, MAX_SPEED);

        this._velocity.x *= Vertex.DAMPING;
        this._velocity.y *= Vertex.DAMPING;
    }

    draw(ctx: CanvasRenderingContext2D, drawSimple: boolean) {
        const cache = VertexUtility.ensureValidCache(ctx, this)!;
        if (drawSimple) {
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, Vertex.SIMPLE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = this.labelColour || Vertex.VERTEX_COLOUR;
            ctx.fill();
            
            const borderColour = this._selected ? "yellow" : this.labelColour!;
            const borderWidth = this._selected ? 8 : 5;
            ctx.strokeStyle = borderColour;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
            const labelX = this.pos.x + Vertex.SIMPLE_RADIUS + 10; // 10px gap from circle edge
            const labelY = this.pos.y;

            ctx.font = TextUtility.getFontString("Arial", 100);
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";

            ctx.fillStyle = this.labelColour || "#000";
            ctx.fillText(this._label, labelX, labelY);
            return;
        }

        // Calculate positions dynamically (never cached)
        const boxLeft = this.pos.x - cache.boxWidth / 2;
        const boxTop = this.pos.y - cache.boxHeight / 2;

        // Draw background box
        ctx.fillStyle = Vertex.VERTEX_COLOUR;
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTop, cache.boxWidth, cache.boxHeight, Vertex.RECT_RADIX);
        ctx.fill();

        const hasImage = cache.hasImage;
        if (hasImage) {
            VertexUtility.drawImageVertex(ctx, this);
        } else {
            VertexUtility.drawTextVertex(ctx, this);
        }

        // Draw box border
        let borderColour = this._selected ? "yellow" : this.labelColour!;
        let borderWidth = this._selected ? 8 : 5;
        if (this.expanding) {
            // Animate border color and width
            const now = performance.now();
            // Pulse between two colors
            const pulse = (Math.sin(now / 250) + 1) / 2;
            borderColour = `rgba(102, 126, 234, ${0.5 + 0.5 * pulse})`; // blue with pulsing alpha
            borderWidth = 7 + 5 * pulse;
        }

        ctx.strokeStyle = borderColour;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTop, cache.boxWidth, cache.boxHeight, Vertex.RECT_RADIX);
        ctx.stroke();
    }
}
