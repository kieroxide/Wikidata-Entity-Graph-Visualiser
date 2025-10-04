import { GraphManager } from "./GraphManager";
import { MathUtility } from "../utility/MathUtility";
import { NetworkUtility } from "../utility/NetworkUtility";
import { RenderingUtility } from "../utility/RenderingUtility";
import type { Camera } from "./Camera";

export class UIController {
    private static readonly DEPTH_LIMIT = {
        MIN: 1,
        MAX: 5,
    };
    private static readonly RELATION_LIMIT = {
        MIN: 1,
        MAX: 10,
    };

    private readonly _graphManager: GraphManager;
    private readonly _camera: Camera;

    private _suggestions: Array<{
        id: string;
        label: string;
    }>;

    private _selectedSuggestion = -1;

    private _elements: {
        fetchButton?: HTMLButtonElement;
        stopExpansionButton?: HTMLButtonElement;
        clearButton?: HTMLButtonElement;
        wikiInput?: HTMLInputElement;
        suggestionsDiv?: HTMLDivElement;
        appendMode?: HTMLInputElement;
        depthSlider?: HTMLInputElement;
        depthValue?: HTMLSpanElement;
        relationLimit?: HTMLInputElement;
        relationLimitValue?: HTMLSpanElement;
        graphStats?: HTMLElement;
    };

    constructor(graphManager: GraphManager, camera: Camera) {
        this._graphManager = graphManager;
        this._camera = camera;
        this._suggestions = [];
        this._elements = this.getElements();
        this.setupEventListeners();
        this.updateDepthDisplay();
        this.updateEntityLimitDisplay();
        this.startStatsUpdate();
    }

    /**
     * Gets DOM elements for UI controls
     */
    private getElements() {
        return {
            fetchButton: document.getElementById("fetch-graph") as HTMLButtonElement,
            stopExpansionButton: document.getElementById("stop-expansions") as HTMLButtonElement,
            clearButton: document.getElementById("clear-graph") as HTMLButtonElement,
            wikiInput: document.getElementById("wiki-input") as HTMLInputElement,
            suggestionsDiv: document.getElementById("suggestions") as HTMLDivElement,
            appendMode: document.getElementById("append-mode") as HTMLInputElement,
            depthSlider: document.getElementById("depth-slider") as HTMLInputElement,
            depthValue: document.getElementById("depth-value") as HTMLSpanElement,
            relationLimit: document.getElementById("relation-limit") as HTMLInputElement,
            relationLimitValue: document.getElementById("relation-limit-value") as HTMLSpanElement,
            graphStats: document.getElementById("graph-stats") as HTMLElement,
        };
    }

    /**
     * Sets up event listeners for UI controls
     */
    private setupEventListeners() {
        // Fetch graph button
        this._elements.fetchButton?.addEventListener("click", () => this.handleFetchGraph());

        // Search functionality
        this._elements.wikiInput?.addEventListener("input", () => this.handleInputSuggestions());
        this._elements.wikiInput?.addEventListener("keydown", e => this.handleSuggestionKeydown(e));
        this._elements.suggestionsDiv?.addEventListener("mousedown", e =>
            this.handleSuggestionClick(e)
        );

        // Kill Expansions
        this._elements.stopExpansionButton?.addEventListener("click", () =>
            this.handleStopExpansionsClick()
        );

        // Clear graph button
        this._elements.clearButton?.addEventListener("click", () => this.handleClearGraph());

        // Depth slider
        this._elements.depthSlider?.addEventListener("input", () => this.updateDepthDisplay());

        // Entity limit slider
        this._elements.relationLimit?.addEventListener("input", () =>
            this.updateEntityLimitDisplay()
        );
    }

    /** Allows aborting a current expansion */
    private handleStopExpansionsClick() {
        this._graphManager.stopExpansion = true;
    }

    /** Allows clicking and fetching graph data on a suggestion */
    private handleSuggestionClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const div = target.closest("div[data-index]");
        if (div) {
            const index = parseInt(div.getAttribute("data-index")!);
            this.selectSuggestion(index);
        }
    }

    /**
     * Handles fetching graph data for suggestion that is selected
     */
    private selectSuggestion(index: number) {
        const selected = this._suggestions[index];
        if (selected) {
            this._elements.wikiInput!.value = selected.label;

            // Clear suggestions
            this._elements.suggestionsDiv!.innerHTML = "";
            this._suggestions = [];
            this._selectedSuggestion = -1;

            // Load the graph for selected QID
            this.handleFetchGraph();
        }
    }

    /**
     * Handles searching the wikidata API for top 4 suggestions from input
     */
    private async handleInputSuggestions() {
        const query = this._elements.wikiInput?.value.trim();
        // Render an empty suggestions if empty
        if (!query) {
            this._suggestions = [];
            this.renderSuggestions();
            return;
        }
        try {
            const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
                query
            )}&language=en&format=json&origin=*`;
            const response = await fetch(url);
            const data = await response.json();

            // Takes the top 4 results and converts to a list of item objects
            const suggestions = (data.search || []).slice(0, 4).map((item: any) => ({
                id: item.id,
                label: item.label,
            }));
            this._suggestions = suggestions;
            this.renderSuggestions();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Renders suggestions to the user as HTML
     */
    private renderSuggestions() {
        const suggestions = this._suggestions;
        const suggestionsDiv = this._elements.suggestionsDiv!;

        if (suggestions.length === 0) {
            suggestionsDiv.innerHTML = "";
            suggestionsDiv.style.display = "none";
            return;
        }
        suggestionsDiv.style.display = "block";
        suggestionsDiv.innerHTML = suggestions
            .map(
                (data, index) =>
                    `<div class="${index === this._selectedSuggestion ? "selected" : ""}" data-index="${index}">
                <strong>${data.label}</strong> <span style="color:#888;">${data.id}</span>
            </div>`
            )
            .join("");
    }

    /**
     * Handles keyboard input for the suggestions
     */
    private handleSuggestionKeydown(e: KeyboardEvent) {
        if (!this._suggestions.length) return;
        if (e.key === "ArrowDown") {
            this._selectedSuggestion = Math.min(
                this._selectedSuggestion + 1,
                this._suggestions.length - 1
            );
            this.renderSuggestions();
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            this._selectedSuggestion = Math.max(this._selectedSuggestion - 1, 0);
            this.renderSuggestions();
            e.preventDefault();
        } else if (e.key === "Enter") {
            if (this._selectedSuggestion >= 0) {
                this.selectSuggestion(this._selectedSuggestion);
                e.preventDefault();
            }
        }
    }

    /**
     * Handles fetch graph button click
     */
    private async handleFetchGraph() {
        try {
            this.setLoadingState(true);

            const settings = this.getSettings();
            const entityInput = this._elements.wikiInput?.value.trim().toUpperCase() || "Universe"; // default to universe
            let entityId = entityInput;

            // Looks up QID which is needed for for fetching if not already a QID
            if (!/^Q\d+$/.test(entityId)) {
                const qid = await NetworkUtility.fetchQIDByName(entityId);
                if (qid) {
                    entityId = qid;
                } else {
                    RenderingUtility.showError("No Wikidata entity found for that name.");
                    return;
                }
            }

            const appendMode = settings.appendMode && !this._graphManager.isEmpty(); // loads if empty
            const response = await this._graphManager.fetchRelations(
                entityId,
                settings.depth,
                settings.relationLimit,
                appendMode,
                this._camera
            );

            if (appendMode) {
                // When appending graph may be disconnected and BFS origins need to be redefined
                this._graphManager.graph.updateComponents();
            }

            if (response) {
                RenderingUtility.showSuccess(`Graph loaded for: ${entityInput}`);
            }
        } catch (error) {
            console.error("Error fetching graph:", error);
            RenderingUtility.showError("Failed to fetch graph data");
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Handles clear graph button click
     */
    private handleClearGraph() {
        this._graphManager.clearGraph();
        this._graphManager.stopExpansion = true;
        RenderingUtility.showSuccess("Graph cleared");
    }

    /**
     * Updates loading state of UI elements
     */
    private setLoadingState(loading: boolean) {
        if (this._elements.fetchButton) {
            this._elements.fetchButton.disabled = loading;
            this._elements.fetchButton.textContent = loading ? "Loading..." : "Fetch Graph";
        }

        if (this._elements.clearButton) {
            this._elements.clearButton.disabled = loading;
        }

        const spinner = document.getElementById("loading-spinner");
        if (spinner) {
            spinner.style.display = loading ? "flex" : "none";
        }
    }

    private updateDepthDisplay() {
        if (this._elements.depthSlider && this._elements.depthValue) {
            this._elements.depthValue.textContent = this._elements.depthSlider.value;
        }
    }

    private updateEntityLimitDisplay() {
        if (this._elements.relationLimit && this._elements.relationLimitValue) {
            this._elements.relationLimitValue.textContent = this._elements.relationLimit.value;
        }
    }

    /**
     *  Updates graph stats since backend delay
     */
    private startStatsUpdate() {
        setInterval(() => this.updateStats(), 1000);
    }

    private updateStats() {
        if (this._elements.graphStats) {
            const numOfVertices = Object.keys(this._graphManager.getVertices()).length;
            const numOfEdges = this._graphManager.getEdges().length;
            this._elements.graphStats.textContent = `Vertices: ${numOfVertices} | Edges: ${numOfEdges}`;
        }
    }

    /**
     * Gets current UI settings ensuring defense against malicious attacks
     */
    getSettings() {
        return {
            depth: MathUtility.clamp(
                parseInt(this._elements.depthSlider?.value || "1"),
                UIController.DEPTH_LIMIT.MIN,
                UIController.DEPTH_LIMIT.MAX
            ),

            relationLimit: MathUtility.clamp(
                parseInt(this._elements.relationLimit?.value || "5"),
                UIController.RELATION_LIMIT.MIN,
                UIController.RELATION_LIMIT.MAX
            ),

            appendMode: this._elements.appendMode?.checked || false,
            entityId: this._elements.wikiInput?.value.trim() || "Q1", // TODO: Add more security
        };
    }

    /**
     * Updates UI state based on graph state
     */
    updateUIState() {
        const isEmpty = this._graphManager.isEmpty();

        // Update append mode availability
        if (this._elements.appendMode) {
            this._elements.appendMode.disabled = isEmpty;
        }

        // Update clear button availability
        if (this._elements.clearButton) {
            this._elements.clearButton.disabled = isEmpty;
        }
    }
}
