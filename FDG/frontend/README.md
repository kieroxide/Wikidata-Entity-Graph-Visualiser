# Wikidata Entity Graph Visualizer (Frontend)

This is the frontend for the Wikidata Entity Graph Visualizer—a web app for exploring and visualizing the connections between ideas and entities from Wikidata. Built with TypeScript and Vite, it connects to a Python backend and is designed for educational exploration of how concepts are related.

---

## Visit the deployed version to access instantly!

Deployed Github page: https://kieroxide.github.io/Wikidata-Entity-Graph-Visualiser/

## What I Learnt

-   **Raw Canvas Rendering:** Built a force-directed graph visualizer from scratch using only TypeScript and the HTML5 Canvas API—no d3, no gl-matrix, just custom logic and a custom Rust/WASM module for physics.
-   **UI/UX for Graphs:** Designed intuitive controls for panning, zooming, searching, and expanding graphs, making large and complex data feel interactive and approachable.
-   **Frontend-Backend Integration:** Learned to coordinate async data fetching, error handling, and real-time updates between the frontend and a Flask backend.
-   **Performance Optimization:** Managed animation frame queues, optimized rendering, and handled large graphs smoothly in the browser.
-   **Vite & Modern Tooling:** Used Vite for fast development and deployment, and set up proxying for seamless local development.

---

## Challenges

-   **No Visualization Libraries:** Everything from graph layout to rendering and interaction was implemented manually, which was both challenging and rewarding.
-   **WASM Integration:** Integrated a Rust/WASM module for efficient force calculations, learning about cross-language module loading and performance tuning.
-   **Responsive UI:** Ensured the app works well on different screen sizes and handles window resizing gracefully.
-   **Error Feedback:** Built user feedback for loading, errors, and invalid input to make the app robust and user-friendly.

---

## Features

-   Interactive force-directed graph visualization of Wikidata entities and  their relations
-   Search for entities by name (with suggestions)
-   Adjustable graph depth and relation limits
-   Pan, zoom, and camera follow on vertices
-   Expand graph dynamically
-   Modern, responsive UI
-   Automatic "simple mode" rendering at low zoom levels for better performance and clarity with large graphs.

---

## How It Works

1. **Search**: Enter a Wikidata entity name to search and select a starting point.
2. **Visualize**: The app fetches the entity's relations from the backend and displays them as a force-directed graph.
3. **Explore**: Pan, zoom, and expand nodes to discover new connections. Adjust depth and relation limits for broader or narrower views.
4. **Interact**: Double-click a vertex to follow it with the camera, right-click to expand, and use the sidebar for controls and stats.

---

## Example Local Usage

**Start the frontend:**

```sh
npm install
npm run dev
```

**Start the backend (from parent folder):**

```sh
npm run start:backend
```

**Start both together:**

```sh
npm run start:both
```

---

## Project Structure

-   `App.ts` — Main application entry point and initialization
-   `index.html` — Main HTML file and UI layout
-   `styles.css` — Application styles
-   `src/`
    -   `classes/` — Core classes: `Camera`, `GraphManager`, `InputManager`, `UIController`
    -   `graph/` — Graph data structures: `Graph`, `Vertex`, `Edge`, `Vec`
    -   `utility/` — Utilities for rendering, networking, math, and force calculations
        -   `Forces/` — Physics for force-directed layout (Attraction, Repulsion, Rust/WASM integration)
    -   `constants/` — App-wide constants (e.g., fonts)
-   `vite.config.ts` — Vite configuration (builds to `docs/` for GitHub Pages)
-   `package.json` — Project dependencies and scripts

---

## Configuration

-   API endpoints and proxy are configured in `vite.config.ts` and `NetworkUtility.ts`.
-   The frontend expects the backend server to be running (see `../backend`).

---

## Technologies Used

-   TypeScript
-   Vite
-   Rust/WASM (for force calculations)

---

## License

MIT License (see `LICENSE` file)

---

## Credits

Created by Kieran B, 2025.
