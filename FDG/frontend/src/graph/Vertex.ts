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
    private static readonly DAMPING = 0.93;
    private static readonly MIN_VELOCITY_THRESHOLD = 2;

    private static readonly RECT_RADIX = 20;
    private static readonly VERTEX_COLOUR = "#fffbe6";
    private static readonly BORDER_WIDTH = {
        default: 5,
        selected: 8,
    };

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
    private _sprite: HTMLCanvasElement | undefined;
    private readonly _label: string;
    public textWidth?: number;
    public textHeight?: number;
    img: HTMLImageElement | undefined;
    thumbnail: HTMLCanvasElement | undefined;
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
                    this._sprite = undefined;
                });
            };
        }
        
        this._cachedDimensions = VertexUtility.ensureValidCache(ctx, this);
        this.labelColour = undefined;
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
        this._sprite = undefined;
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
     * Creates and stored off-screen canvas for vertex. Avoids rendering a new Vertex each frame
     */
    private getOrCreateSprite(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
        if (this._sprite) {
            return this._sprite;
        }

        const cache = VertexUtility.ensureValidCache(ctx, this)!;
        const maxBorderWidth = 8; // Use max possible border width
        const antiAliasingBuffer = 4;
        const margin = maxBorderWidth * 2 + antiAliasingBuffer;

        const sprite = document.createElement("canvas");
        sprite.width = cache.boxWidth + margin;
        sprite.height = cache.boxHeight + margin;

        const spriteCtx = sprite.getContext("2d")!;
        spriteCtx.translate(sprite.width / 2, sprite.height / 2);

        // Draw background box
        spriteCtx.fillStyle = Vertex.VERTEX_COLOUR;
        spriteCtx.beginPath();
        spriteCtx.roundRect(
            -cache.boxWidth / 2,
            -cache.boxHeight / 2,
            cache.boxWidth,
            cache.boxHeight,
            Vertex.RECT_RADIX
        );
        spriteCtx.fill();

        // Draw content (image or text)
        if (cache.hasImage) {
            VertexUtility.preloadImageSprite(spriteCtx, this);
        } else {
            VertexUtility.preloadTextSprite(spriteCtx, this);
        }

        this._sprite = sprite;
        return sprite;
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

        // Kill tiny velocities to prevent jitter
        if (Math.abs(this._velocity.x) < Vertex.MIN_VELOCITY_THRESHOLD) {
            this._velocity.x = 0;
        }
        if (Math.abs(this._velocity.y) < Vertex.MIN_VELOCITY_THRESHOLD) {
            this._velocity.y = 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D, drawSimple: boolean) {
        const cache = VertexUtility.ensureValidCache(ctx, this)!;

        if (drawSimple) {
            // Simple Circle
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, Vertex.SIMPLE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = this.labelColour || Vertex.VERTEX_COLOUR;
            ctx.fill();

            // Border selection and rendering
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
            ctx.stroke();

            // Render text next to it
            const circleGap = 10;
            const labelX = this.pos.x + Vertex.SIMPLE_RADIUS + circleGap;
            const labelY = this.pos.y;

            ctx.font = TextUtility.getFontString("Arial", 100);
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";

            ctx.fillStyle = "#000";
            ctx.fillText(this._label, labelX, labelY);
            return;
        }

        const sprite = this.getOrCreateSprite(ctx);
        ctx.drawImage(sprite, this.pos.x - sprite.width / 2, this.pos.y - sprite.height / 2);

        // Draw border dynamically depending on state
        const boxLeft = this.pos.x - cache.boxWidth / 2;
        const boxTop = this.pos.y - cache.boxHeight / 2;

        let borderColour: string;
        let borderWidth: number;

        if (this.expanding) {
            // Expanding animation
            const now = performance.now();
            const pulse = (Math.sin(now / 250) + 1) / 2;
            borderColour = `rgba(102, 126, 234, ${0.5 + 0.5 * pulse})`;
            borderWidth = 7 + 5 * pulse;
        } else if (this._selected) {
            // Selected state
            borderColour = "yellow";
            borderWidth = Vertex.BORDER_WIDTH.selected;
        } else {
            // Default state
            borderColour = this.labelColour!;
            borderWidth = Vertex.BORDER_WIDTH.default;
        }

        ctx.strokeStyle = borderColour;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTop, cache.boxWidth, cache.boxHeight, Vertex.RECT_RADIX);
        ctx.stroke();
    }
}
