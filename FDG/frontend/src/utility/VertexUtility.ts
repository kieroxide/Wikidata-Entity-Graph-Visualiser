import { Vec } from "../graph/Vec";
import { Vertex } from "../graph/Vertex";
import { FONT } from "../../constants/font";
import { Camera } from "../classes/Camera";
import { TextUtility } from "./TextUtility";
import { MathUtility } from "./MathUtility";

export class VertexUtility {
    private static readonly BOX_PADDING = 20;

    private static readonly IMAGE_TEXT_GAP = 20;
    private static readonly IMAGE_SIZE_MULTIPLIER = 2.25;
    private static readonly MIN_IMAGE_SIZE = 40;

    private static readonly TYPE_FONT_SIZE_REDUCTION = 4;
    private static readonly MIN_TYPE_FONT_SIZE = 12;
    private static readonly TEXT_LINE_SPACING = 15;
    private static readonly TEXT_ONLY_BOX_EXTRA_HEIGHT = 80;

    /**
     * Checks if a point is within the vertex's boundary box
     */
    static pointInBoundary(
        point: Vec,
        ctx: CanvasRenderingContext2D,
        camera: Camera,
        vertex: Vertex
    ): boolean {
        const boundaries = this.getBoundaries(ctx, vertex);
        const ws_point = camera.canvasToWorld(point);

        const check_x = boundaries.left <= ws_point.x && ws_point.x <= boundaries.right;
        const check_y = boundaries.top <= ws_point.y && ws_point.y <= boundaries.bottom;
        return check_x && check_y;
    }

    /**
     * Gets the boundary coordinates of the vertex's text box
     */
    static getBoundaries(ctx: CanvasRenderingContext2D, vertex: Vertex) {
        // Ensure vertex has calculated dimensions
        this.ensureValidCache(ctx, vertex);

        const _left = vertex.pos.x - vertex._cachedDimensions!.boxWidth / 2;
        const _right = vertex.pos.x + vertex._cachedDimensions!.boxWidth / 2;
        const _top = vertex.pos.y - vertex._cachedDimensions!.boxHeight / 2;
        const _bottom = vertex.pos.y + vertex._cachedDimensions!.boxHeight / 2;
        return { left: _left, right: _right, top: _top, bottom: _bottom };
    }

    /**
     * Calculates the vertex's mass based on number of connections
     */
    static getOriginalMass(vertex: Vertex) {
        if (vertex.neighbours.size === 0) {
            return 1;
        }
        return vertex.neighbours.size;
    }

    /**
     *  Draws Vertex Sprite that only has text
     */
    static preloadTextSprite(spriteCtx: CanvasRenderingContext2D, vertex: Vertex) {
        const cache = vertex._cachedDimensions!;
        const lineHeight = cache.fontSize + VertexUtility.TEXT_LINE_SPACING;
        const labelY = -(lineHeight / 2);
        const typeY = lineHeight / 2;

        // Draw label text
        spriteCtx.font = TextUtility.getFontString(FONT.FAMILY, cache.fontSize);
        spriteCtx.textAlign = "center";
        spriteCtx.textBaseline = "middle";
        spriteCtx.fillStyle = "black";
        spriteCtx.fillText(vertex.label, 0, labelY);

        // Draw type text smaller
        const typeFontSize = Math.max(12, cache.fontSize - VertexUtility.TYPE_FONT_SIZE_REDUCTION);
        spriteCtx.font = TextUtility.getFontString(FONT.FAMILY, typeFontSize);
        spriteCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
        spriteCtx.fillText(vertex.type, 0, typeY);
    }

    /**
     *  Preloads Vertex sprite that has an image
     */
    static preloadImageSprite(spriteCtx: CanvasRenderingContext2D, vertex: Vertex) {
        const cache = vertex._cachedDimensions!;

        const imageX = -cache.boxWidth / 2 + cache.padding + cache.imgSize / 2;
        const imageY = 0;
        const textX = imageX + cache.imgSize / 2 + cache.gap;

        const lineHeight = cache.fontSize + VertexUtility.TEXT_LINE_SPACING;
        const labelY = -lineHeight / 2;
        const typeY = lineHeight / 2;

        // Draw circular image
        const imageToDraw = vertex.thumbnail || vertex.img!;
        spriteCtx.save();
        spriteCtx.beginPath();
        spriteCtx.arc(imageX, imageY, cache.imgSize / 2, 0, Math.PI * 2);
        spriteCtx.clip();
        spriteCtx.drawImage(
            imageToDraw,
            imageX - cache.imgSize / 2,
            imageY - cache.imgSize / 2,
            cache.imgSize,
            cache.imgSize
        );
        spriteCtx.restore();

        // Draw image border
        spriteCtx.beginPath();
        spriteCtx.strokeStyle = "white";
        spriteCtx.lineWidth = 3;
        spriteCtx.arc(imageX, imageY, cache.imgSize / 2, 0, Math.PI * 2);
        spriteCtx.stroke();

        // Draw label text
        spriteCtx.font = TextUtility.getFontString(FONT.FAMILY, cache.fontSize);
        spriteCtx.textAlign = "left";
        spriteCtx.textBaseline = "middle";
        spriteCtx.fillStyle = "black";
        spriteCtx.fillText(vertex.label, textX, labelY);

        // Draw type text in smaller font
        const typeFontSize = Math.max(12, cache.fontSize - VertexUtility.TYPE_FONT_SIZE_REDUCTION);
        spriteCtx.font = TextUtility.getFontString(FONT.FAMILY, typeFontSize);
        spriteCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
        spriteCtx.fillText(vertex.type, textX, typeY);
    }

    /**
     * **Calculates and caches vertex drawn dimensions
     */
    static calculateAndCacheDimensions(
        ctx: CanvasRenderingContext2D,
        vertex: Vertex,
        forceFontSize?: number
    ) {
        const mass = this.getOriginalMass(vertex);
        const fontSize =
            forceFontSize ||
            MathUtility.clamp(
                FONT.SIZE + mass * FONT.MASS_WEIGHT,
                Vertex.LABEL_MIN_FONT,
                Vertex.LABEL_MAX_FONT
            );
        const hasImage = !!(
            vertex.thumbnail ||
            (vertex.img && vertex.img.complete && vertex.img.naturalWidth > 0)
        );

        // Measure text dimensions
        ctx.font = TextUtility.getFontString(FONT.FAMILY, fontSize);
        const labelMetrics = ctx.measureText(vertex.label);
        const labelWidth = labelMetrics.width;
        const labelHeight = TextUtility.getTextHeight(labelMetrics);

        const typeFontSize = Math.max(
            this.MIN_TYPE_FONT_SIZE,
            fontSize - this.TYPE_FONT_SIZE_REDUCTION
        );
        ctx.font = TextUtility.getFontString(FONT.FAMILY, typeFontSize);
        const typeMetrics = ctx.measureText(vertex.type);
        const typeWidth = typeMetrics.width;
        const typeHeight = TextUtility.getTextHeight(typeMetrics);

        const maxTextWidth = Math.max(labelWidth, typeWidth);
        const maxTextHeight = Math.max(labelHeight, typeHeight);

        // Calculate static layout dimensions
        let boxWidth: number, boxHeight: number, imgSize: number;

        if (hasImage) {
            // Profile card layout
            const totalTextHeight = labelHeight + typeHeight + this.TEXT_LINE_SPACING;
            imgSize = Math.max(this.MIN_IMAGE_SIZE, totalTextHeight * this.IMAGE_SIZE_MULTIPLIER);
            const contentWidth = imgSize + this.IMAGE_TEXT_GAP + maxTextWidth;
            const contentHeight = Math.max(imgSize, totalTextHeight);

            boxWidth = contentWidth + this.BOX_PADDING * 2;
            boxHeight = contentHeight + this.BOX_PADDING;
        } else {
            // Text-only layout
            imgSize = 0;
            boxWidth = maxTextWidth + this.BOX_PADDING * 2;
            boxHeight =
                labelHeight + typeHeight + this.BOX_PADDING + this.TEXT_ONLY_BOX_EXTRA_HEIGHT;
        }

        vertex._cachedDimensions = {
            // Text measurements
            labelWidth,
            labelHeight,
            typeWidth,
            typeHeight,
            maxTextWidth,
            maxTextHeight,

            // Layout measurements
            imgSize,
            boxWidth,
            boxHeight,

            // Spacing constants
            padding: this.BOX_PADDING,
            gap: this.IMAGE_TEXT_GAP,

            // Cache keys
            fontSize,
            label: vertex.label,
            type: vertex.type,
            hasImage,
        };
    }

    /**
     *  Checks if Cache is valid, recalculates if needed
     */
    static ensureValidCache(ctx: CanvasRenderingContext2D, vertex: Vertex) {
        const mass = this.getOriginalMass(vertex);
        const fontSize = FONT.SIZE + mass * FONT.MASS_WEIGHT;
        const hasImage = vertex.img && vertex.img.complete && vertex.img.naturalWidth > 0;

        const cache = vertex._cachedDimensions;

        if (
            !cache ||
            cache.fontSize !== fontSize ||
            cache.label !== vertex.label ||
            cache.type !== vertex.type ||
            cache.hasImage !== hasImage
        ) {
            this.calculateAndCacheDimensions(ctx, vertex, fontSize);
        }

        return vertex._cachedDimensions;
    }
}
